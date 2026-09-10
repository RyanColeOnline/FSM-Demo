import Foundation
import Observation
@Observable
@MainActor
public final class MaintenancePlanStore {
    public static let shared = MaintenancePlanStore()
    
    public private(set) var plans: [MaintenancePlanItem] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.plans = []
        
        NotificationCenter.default.addObserver(
            forName: .databaseModeDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleDatabaseModeChanged()
            }
        }
    }
    
    private func handleDatabaseModeChanged() {
        self.plans = []
    }
    
    public func fetchPlans(
        customerId: UUID? = nil,
        customerNumber: String? = nil,
        customerName: String? = nil
    ) async {
        let mode = currentDatabaseMode
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let docs = await FirestoreClient.shared.fetchMaintenancePlans(
            customerId: customerId,
            customerNumber: customerNumber,
            customerName: customerName,
            mode: mode
        )
        
        for doc in docs {
            if let idx = self.plans.firstIndex(where: { $0.id == doc.id }) {
                self.plans[idx] = doc
            } else {
                self.plans.append(doc)
            }
        }
    }
    
    public func fetchPlans(for customer: Customer) async {
        await fetchPlans(
            customerId: customer.id,
            customerNumber: customer.customerNumber,
            customerName: customer.name
        )
    }
    
    public func plans(for customer: Customer, location: String? = nil) -> [MaintenancePlanItem] {
        let list = plans.filter { plan in
            if plan.customerId == customer.id { return true }
            return false
        }
        guard let loc = location, loc != "All Locations", !loc.isEmpty else { return list }
        return list.filter { plan in
            let locLower = loc.lowercased().replacingOccurrences(of: " ", with: "")
            let planLocLower = plan.locationStreet.lowercased().replacingOccurrences(of: " ", with: "")
            if planLocLower.isEmpty { return true }
            return locLower.contains(planLocLower) || planLocLower.contains(locLower)
        }
    }
    
    public func savePlan(_ plan: MaintenancePlanItem) async {
        if let idx = plans.firstIndex(where: { $0.id == plan.id }) {
            plans[idx] = plan
        } else {
            plans.insert(plan, at: 0)
        }
        
        _ = await FirestoreClient.shared.saveMaintenancePlan(plan: plan, mode: currentDatabaseMode)
    }
}
