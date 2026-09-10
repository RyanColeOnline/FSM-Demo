import Foundation
import Observation
public struct ProposalOptionItem: Identifiable, Hashable, Sendable, Codable {
    public var id = UUID()
    public var tier: String // "Option A", "Option B", "Option C", "Option D", "Custom"
    public var title: String // "Good", "Better", "Best", "Premium"
    public var description: String
    public var lineItems: [InvoiceLineItem]
    public var subtotal: Double
    public var taxAmount: Double
    public var total: Double
    public var monthlyFinancingEstimate: Double?
    public var isSelected: Bool
    
    public init(
        id: UUID = UUID(),
        tier: String = "Option A",
        title: String = "Good",
        description: String = "",
        lineItems: [InvoiceLineItem] = [],
        subtotal: Double = 0.0,
        taxAmount: Double = 0.0,
        total: Double = 0.0,
        monthlyFinancingEstimate: Double? = nil,
        isSelected: Bool = false
    ) {
        self.id = id
        self.tier = tier
        self.title = title
        self.description = description
        self.lineItems = lineItems
        self.subtotal = subtotal
        self.taxAmount = taxAmount
        self.total = total
        self.monthlyFinancingEstimate = monthlyFinancingEstimate
        self.isSelected = isSelected
    }
}

public struct ProposalRecord: Identifiable, Hashable, Sendable, Codable {
    public var id: UUID
    public var proposalNumber: String
    public var customerId: UUID
    public var jobId: UUID?
    public var jobNumber: Int?
    public var appointmentId: UUID?
    public var status: String // "Draft", "Presented", "Approved", "Declined", "Expired"
    public var issueDate: Date
    public var expirationDate: Date
    public var options: [ProposalOptionItem]
    public var selectedOptionId: UUID?
    public var billToCustomer: String
    public var jobLocation: String
    public var technician: String
    public var notes: String?
    public var isArchived: Bool
    
    public init(
        id: UUID = UUID(),
        proposalNumber: String = "#P-10492",
        customerId: UUID = UUID(),
        jobId: UUID? = nil,
        jobNumber: Int? = nil,
        appointmentId: UUID? = nil,
        status: String = "Presented",
        issueDate: Date = Date(),
        expirationDate: Date = Date().addingTimeInterval(86400 * 30),
        options: [ProposalOptionItem] = [],
        selectedOptionId: UUID? = nil,
        billToCustomer: String = "",
        jobLocation: String = "",
        technician: String = "Justin Lung",
        notes: String? = nil,
        isArchived: Bool = false
    ) {
        self.id = id
        self.proposalNumber = proposalNumber
        self.customerId = customerId
        self.jobId = jobId
        self.jobNumber = jobNumber
        self.appointmentId = appointmentId
        self.status = status
        self.issueDate = issueDate
        self.expirationDate = expirationDate
        self.options = options
        self.selectedOptionId = selectedOptionId
        self.billToCustomer = billToCustomer
        self.jobLocation = jobLocation
        self.technician = technician
        self.notes = notes
        self.isArchived = isArchived
    }
}
