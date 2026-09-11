import Foundation
import Observation
@Observable
@MainActor
public final class ProposalStore {
    public static let shared = ProposalStore()
    
    public private(set) var proposals: [ProposalRecord] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.proposals = []
        
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
        self.proposals = []
    }
    
    public func fetchProposals(
        customerId: UUID? = nil,
        customerNumber: String? = nil,
        customerName: String? = nil,
        jobId: UUID? = nil,
        jobNumber: Int? = nil
    ) async {
        let mode = currentDatabaseMode
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let docs = await FirestoreClient.shared.fetchProposals(
            customerId: customerId,
            customerNumber: customerNumber,
            customerName: customerName,
            jobId: jobId,
            jobNumber: jobNumber,
            mode: mode
        )
        
        for doc in docs {
            if let idx = self.proposals.firstIndex(where: { $0.id == doc.id }) {
                self.proposals[idx] = doc
            } else {
                self.proposals.append(doc)
            }
        }
    }
    
    public func fetchProposals(for customer: Customer) async {
        await fetchProposals(
            customerId: customer.id,
            customerNumber: customer.customerNumber,
            customerName: customer.name
        )
    }
    
    public func fetchProposals(for appointment: Appointment) async {
        await fetchProposals(
            customerId: appointment.customerId,
            customerName: appointment.customerName,
            jobId: appointment.id,
            jobNumber: appointment.jobNumber
        )
    }
    
    public func proposals(for customer: Customer, location: String? = nil) -> [ProposalRecord] {
        let normName = customer.name.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let normBiz = customer.businessName?.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let list = proposals.filter { prop in
            if prop.customerId == customer.id { return true }
            let propBill = prop.billToCustomer.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
            if !normName.isEmpty && (propBill == normName || propBill.contains(normName) || normName.contains(propBill)) {
                return true
            }
            if let b = normBiz, !b.isEmpty && (propBill == b || propBill.contains(b) || b.contains(propBill)) {
                return true
            }
            return false
        }
        guard let loc = location, loc != "All Locations", !loc.isEmpty else { return list }
        return list.filter { prop in
            let locLower = loc.lowercased().replacingOccurrences(of: " ", with: "")
            let propLocLower = prop.jobLocation.lowercased().replacingOccurrences(of: " ", with: "")
            if propLocLower.isEmpty { return true }
            return locLower.contains(propLocLower) || propLocLower.contains(locLower)
        }
    }
    
    public func proposals(for appointment: Appointment) -> [ProposalRecord] {
        let jobNum = "\(appointment.jobNumber)"
        return proposals.filter { prop in
            if let jn = prop.jobNumber, "\(jn)" == jobNum { return true }
            if prop.proposalNumber.contains(jobNum) { return true }
            if let jId = prop.jobId, jId == appointment.id { return true }
            return false
        }
    }
    
    public func saveProposal(_ proposal: ProposalRecord) async {
        if let idx = proposals.firstIndex(where: { $0.id == proposal.id }) {
            proposals[idx] = proposal
        } else {
            proposals.insert(proposal, at: 0)
        }
        
        _ = await FirestoreClient.shared.saveProposal(proposal: proposal, mode: currentDatabaseMode)
    }
}
