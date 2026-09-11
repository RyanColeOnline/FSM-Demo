import Foundation
import Observation
public struct InvoiceLineItem: Identifiable, Hashable, Sendable, Codable {
    public var id = UUID()
    public var priceBookItemId: String?
    public var sku: String?
    public var name: String
    public var description: String
    public var quantity: Int
    public var unitPrice: Double
    public var totalPrice: Double
    public var isTaxable: Bool
    public var laborHours: Double?
    
    public init(
        id: UUID = UUID(),
        priceBookItemId: String? = nil,
        sku: String? = nil,
        name: String,
        description: String = "",
        quantity: Int = 1,
        unitPrice: Double,
        totalPrice: Double? = nil,
        isTaxable: Bool = true,
        laborHours: Double? = 0.0
    ) {
        self.id = id
        self.priceBookItemId = priceBookItemId
        self.sku = sku
        self.name = name
        self.description = description
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.totalPrice = totalPrice ?? (Double(quantity) * unitPrice)
        self.isTaxable = isTaxable
        self.laborHours = laborHours
    }
}

public struct InvoiceRecord: Identifiable, Hashable, Sendable, Codable {
    public var id: UUID
    public var invNumber: String
    public var status: String // "Draft", "Presented", "Sent", "Paid", "Overdue", "Void"
    public var paymentStatus: String
    public var dueDate: String
    public var amount: String
    public var customerId: UUID?
    public var jobId: UUID?
    public var jobNumber: Int?
    public var appointmentId: UUID?
    public var issueDate: Date
    public var paymentTerms: String
    public var subtotal: Double
    public var taxAmount: Double
    public var total: Double
    public var balanceDue: Double
    public var billToCustomer: String
    public var billingAddress: String
    public var jobLocation: String
    public var technician: String
    public var lineItems: [InvoiceLineItem]
    public var notes: String?
    public var isArchived: Bool
    public var stripePaymentIntentId: String?
    public var stripeCustomerId: String?
    public var qbInvoiceId: String?
    public var wexLegacyId: String?
    
    public init(
        id: UUID = UUID(),
        invNumber: String = "#I-130086",
        status: String = "Paid",
        paymentStatus: String = "Paid in Full",
        dueDate: String = "05/28/2026",
        amount: String = "$160.00",
        customerId: UUID? = nil,
        jobId: UUID? = nil,
        jobNumber: Int? = nil,
        appointmentId: UUID? = nil,
        issueDate: Date = Date(),
        paymentTerms: String = "Due Upon Receipt",
        subtotal: Double = 0.0,
        taxAmount: Double = 0.0,
        total: Double = 0.0,
        balanceDue: Double = 0.0,
        billToCustomer: String = "",
        billingAddress: String = "",
        jobLocation: String = "",
        technician: String = "Justin Lung",
        lineItems: [InvoiceLineItem] = [],
        notes: String? = nil,
        isArchived: Bool = false,
        stripePaymentIntentId: String? = nil,
        stripeCustomerId: String? = nil,
        qbInvoiceId: String? = nil,
        wexLegacyId: String? = nil
    ) {
        self.id = id
        self.invNumber = invNumber
        self.status = status
        self.paymentStatus = paymentStatus
        self.dueDate = dueDate
        self.amount = amount
        self.customerId = customerId
        self.jobId = jobId
        self.jobNumber = jobNumber
        self.appointmentId = appointmentId
        self.issueDate = issueDate
        self.paymentTerms = paymentTerms
        self.subtotal = subtotal
        self.taxAmount = taxAmount
        self.total = total
        self.balanceDue = balanceDue
        self.billToCustomer = billToCustomer
        self.billingAddress = billingAddress
        self.jobLocation = jobLocation
        self.technician = technician
        self.lineItems = lineItems
        self.notes = notes
        self.isArchived = isArchived
        self.stripePaymentIntentId = stripePaymentIntentId
        self.stripeCustomerId = stripeCustomerId
        self.qbInvoiceId = qbInvoiceId
        self.wexLegacyId = wexLegacyId
    }
}
