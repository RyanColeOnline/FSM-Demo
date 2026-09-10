import Foundation
import Observation
@Observable
@MainActor
public final class EquipmentStore {
    public static let shared = EquipmentStore()
    
    public private(set) var equipment: [EquipmentItem] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.equipment = []
        
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
        self.equipment = []
    }
    
    public func fetchEquipment(
        customerId: UUID? = nil,
        customerNumber: String? = nil,
        customerName: String? = nil
    ) async {
        let mode = currentDatabaseMode
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let docs = await FirestoreClient.shared.fetchEquipment(
            customerId: customerId,
            customerNumber: customerNumber,
            customerName: customerName,
            mode: mode
        )
        
        for doc in docs {
            if let idx = self.equipment.firstIndex(where: { $0.id == doc.id }) {
                self.equipment[idx] = doc
            } else {
                self.equipment.append(doc)
            }
        }
    }
    
    public func fetchEquipment(for customer: Customer) async {
        await fetchEquipment(
            customerId: customer.id,
            customerNumber: customer.customerNumber,
            customerName: customer.name
        )
    }
    
    public func equipment(for customer: Customer, location: String? = nil) -> [EquipmentItem] {
        let list = equipment.filter { eq in
            if eq.customerId == customer.id { return true }
            return false
        }
        guard let loc = location, loc != "All Locations", !loc.isEmpty else { return list }
        return list.filter { eq in
            let locLower = loc.lowercased().replacingOccurrences(of: " ", with: "")
            let eqLocLower = eq.locationAddress.lowercased().replacingOccurrences(of: " ", with: "")
            if eqLocLower.isEmpty { return true }
            return locLower.contains(eqLocLower) || eqLocLower.contains(locLower)
        }
    }
    
    public func saveEquipment(_ item: EquipmentItem) async {
        if let idx = equipment.firstIndex(where: { $0.id == item.id }) {
            equipment[idx] = item
        } else {
            equipment.insert(item, at: 0)
        }
        
        _ = await FirestoreClient.shared.saveEquipment(item: item, mode: currentDatabaseMode)
    }
    
    public func deleteEquipment(_ item: EquipmentItem) async {
        equipment.removeAll { $0.id == item.id }
        _ = await FirestoreClient.shared.deleteEquipment(item: item, mode: currentDatabaseMode)
    }
}
