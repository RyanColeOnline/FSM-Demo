import Foundation
import Observation
@Observable
@MainActor
public final class InvoiceStore {
    public static let shared = InvoiceStore()
    
    public private(set) var invoices: [InvoiceRecord] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.invoices = []
        
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
        self.invoices = []
    }
    
    public func fetchInvoices(
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
        
        let docs = await FirestoreClient.shared.fetchInvoices(
            customerId: customerId,
            customerNumber: customerNumber,
            customerName: customerName,
            jobId: jobId,
            jobNumber: jobNumber,
            mode: mode
        )
        
        for doc in docs {
            if let idx = self.invoices.firstIndex(where: { $0.id == doc.id }) {
                self.invoices[idx] = doc
            } else {
                self.invoices.append(doc)
            }
        }
    }
    
    public func fetchInvoices(for customer: Customer) async {
        await fetchInvoices(
            customerId: customer.id,
            customerNumber: customer.customerNumber,
            customerName: customer.name
        )
    }
    
    public func fetchInvoices(for appointment: Appointment) async {
        await fetchInvoices(
            customerId: appointment.customerId,
            customerName: appointment.customerName,
            jobId: appointment.id,
            jobNumber: appointment.jobNumber
        )
    }
    
    public func invoices(for customer: Customer, location: String? = nil) -> [InvoiceRecord] {
        let normName = customer.name.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let normBiz = customer.businessName?.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let list = invoices.filter { inv in
            if inv.customerId == customer.id { return true }
            let invBill = inv.billToCustomer.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
            if !normName.isEmpty && (invBill == normName || invBill.contains(normName) || normName.contains(invBill)) {
                return true
            }
            if let b = normBiz, !b.isEmpty && (invBill == b || invBill.contains(b) || b.contains(invBill)) {
                return true
            }
            return false
        }
        guard let loc = location, loc != "All Locations", !loc.isEmpty else { return list }
        return list.filter { inv in
            let locLower = loc.lowercased().replacingOccurrences(of: " ", with: "")
            let invLocLower = inv.jobLocation.lowercased().replacingOccurrences(of: " ", with: "")
            if invLocLower.isEmpty { return true }
            return locLower.contains(invLocLower) || invLocLower.contains(locLower)
        }
    }
    
    public func invoices(for appointment: Appointment) -> [InvoiceRecord] {
        let jobNum = "\(appointment.jobNumber)"
        return invoices.filter { inv in
            if let jn = inv.jobNumber, "\(jn)" == jobNum { return true }
            if inv.invNumber.contains(jobNum) { return true }
            if let jId = inv.jobId, jId == appointment.id { return true }
            return false
        }
    }
    
    public func saveInvoice(_ invoice: InvoiceRecord) async {
        if let idx = invoices.firstIndex(where: { $0.id == invoice.id }) {
            invoices[idx] = invoice
        } else {
            invoices.insert(invoice, at: 0)
        }
        
        _ = await FirestoreClient.shared.saveInvoice(invoice: invoice, mode: currentDatabaseMode)
    }
}
