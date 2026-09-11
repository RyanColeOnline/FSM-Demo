import Foundation
import Observation
public enum StripeTransactionType: String, Codable, Sendable, CaseIterable {
    case card = "Cards"
    case financing = "Financing"
}

public enum StripePaymentStatus: String, Codable, Sendable, CaseIterable {
    case succeeded = "succeeded"
    case pending = "pending"
    case requiresPaymentMethod = "requires_payment_method"
    case failed = "failed"
    case refunded = "refunded"
    
    public var isSettled: Bool {
        self == .succeeded
    }
    
    public var displayTitle: String {
        switch self {
        case .succeeded:
            return "Settled"
        case .pending:
            return "Pending Batch"
        case .requiresPaymentMethod:
            return "Action Required"
        case .failed:
            return "Failed"
        case .refunded:
            return "Refunded"
        }
    }
}

public struct StripeTransaction: Identifiable, Codable, Sendable, Equatable, Hashable {
    public var id: String // Stripe ID: "pi_3Nx9Ab2eZvKYlo2C19vY0L1Z" or "ch_3Nx9Ab2eZvKYlo2C19vY0L1Z"
    public var customerName: String
    public var customerEmail: String?
    public var stripeCustomerId: String? // Stripe Customer ID: "cus_Np8G2pL7Ww"
    public var amountCents: Int // Stripe stores monetary values in smallest currency unit (e.g. cents)
    public var currency: String // "usd"
    public var type: StripeTransactionType
    public var status: StripePaymentStatus
    public var createdAt: Date
    public var cardBrand: String? // "Visa", "Mastercard", "Amex", "Discover"
    public var cardLast4: String? // "4242"
    public var financingProvider: String? // "Synchrony Bank", "Wisestack", "GreenSky"
    public var loanId: String? // "SYN-99401"
    public var receiptUrl: String?
    public var description: String?
    
    public var isSettled: Bool {
        status.isSettled
    }
    
    public var formattedAmount: String {
        let dollars = Double(amountCents) / 100.0
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency.uppercased()
        return formatter.string(from: NSNumber(value: dollars)) ?? String(format: "$%.2f", dollars)
    }
    
    public var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d, yyyy h:mm:ss a"
        return formatter.string(from: createdAt)
    }
    
    public init(
        id: String,
        customerName: String,
        customerEmail: String? = nil,
        stripeCustomerId: String? = nil,
        amountCents: Int,
        currency: String = "usd",
        type: StripeTransactionType = .card,
        status: StripePaymentStatus = .succeeded,
        createdAt: Date = Date(),
        cardBrand: String? = nil,
        cardLast4: String? = nil,
        financingProvider: String? = nil,
        loanId: String? = nil,
        receiptUrl: String? = nil,
        description: String? = nil
    ) {
        self.id = id
        self.customerName = customerName
        self.customerEmail = customerEmail
        self.stripeCustomerId = stripeCustomerId
        self.amountCents = amountCents
        self.currency = currency
        self.type = type
        self.status = status
        self.createdAt = createdAt
        self.cardBrand = cardBrand
        self.cardLast4 = cardLast4
        self.financingProvider = financingProvider
        self.loanId = loanId
        self.receiptUrl = receiptUrl
        self.description = description
    }
}

@Observable
public final class StripeTransactionStore: @unchecked Sendable {
    public var transactions: [StripeTransaction] = []
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    
    public init() {
        self.transactions = Self.sampleData
    }
    
    public func cardTransactions(startDate: Date? = nil, endDate: Date? = nil) -> [StripeTransaction] {
        transactions.filter { tx in
            tx.type == .card && (startDate == nil || tx.createdAt >= startDate!) && (endDate == nil || tx.createdAt <= endDate!)
        }
    }
    
    public func financingTransactions(startDate: Date? = nil, endDate: Date? = nil) -> [StripeTransaction] {
        transactions.filter { tx in
            tx.type == .financing && (startDate == nil || tx.createdAt >= startDate!) && (endDate == nil || tx.createdAt <= endDate!)
        }
    }
    
    public static var sampleData: [StripeTransaction] = [
        StripeTransaction(
            id: "pi_3Nwa8F2eZvKYlo2C19vY0L1Z",
            customerName: "Fiona Gallagher",
            customerEmail: "fiona.gallagher@example.com",
            stripeCustomerId: "cus_Np8G2pL7Ww1001",
            amountCents: 38500,
            currency: "usd",
            type: .card,
            status: .succeeded,
            createdAt: Calendar.current.date(bySettingHour: 10, minute: 42, second: 41, of: Date()) ?? Date(),
            cardBrand: "Visa",
            cardLast4: "4242",
            receiptUrl: "https://pay.stripe.com/receipts/pi_3Nwa8F2eZvKYlo2C19vY0L1Z"
        ),
        StripeTransaction(
            id: "pi_3Nwa9K2eZvKYlo2C20aX1M2B",
            customerName: "Evan Williams",
            customerEmail: "evan.w@example.com",
            stripeCustomerId: "cus_Np8G2pL7Ww1002",
            amountCents: 21000,
            currency: "usd",
            type: .card,
            status: .pending,
            createdAt: Calendar.current.date(byAdding: .day, value: -1, to: Date()) ?? Date(),
            cardBrand: "Mastercard",
            cardLast4: "8819"
        ),
        StripeTransaction(
            id: "pi_3Nwa7A2eZvKYlo2C18zW9K3C",
            customerName: "Lip Gallagher",
            customerEmail: "lip.gallagher@example.com",
            stripeCustomerId: "cus_Np8G2pL7Ww1003",
            amountCents: 125000,
            currency: "usd",
            type: .card,
            status: .succeeded,
            createdAt: Calendar.current.date(byAdding: .day, value: -3, to: Date()) ?? Date(),
            cardBrand: "Amex",
            cardLast4: "1004"
        ),
        StripeTransaction(
            id: "pi_3Nwa6Z2eZvKYlo2C17yV8J4D",
            customerName: "Sarah Williams",
            customerEmail: "sarah.williams@example.com",
            stripeCustomerId: "cus_Np8G2pL7Ww1004",
            amountCents: 4500,
            currency: "usd",
            type: .card,
            status: .succeeded,
            createdAt: Calendar.current.date(byAdding: .day, value: -6, to: Date()) ?? Date(),
            cardBrand: "Visa",
            cardLast4: "9931"
        ),
        StripeTransaction(
            id: "pi_3Nwa5Y2eZvKYlo2C16xU7I5E",
            customerName: "Fiona Gallagher",
            customerEmail: "fiona.gallagher@example.com",
            stripeCustomerId: "cus_Np8G2pL7Ww1001",
            amountCents: 340000,
            currency: "usd",
            type: .financing,
            status: .succeeded,
            createdAt: Calendar.current.date(bySettingHour: 11, minute: 20, second: 05, of: Date()) ?? Date(),
            financingProvider: "Synchrony Bank",
            loanId: "SYN-99401"
        ),
        StripeTransaction(
            id: "pi_3Nwa4X2eZvKYlo2C15wT6H6F",
            customerName: "Evan Williams",
            customerEmail: "evan.w@example.com",
            stripeCustomerId: "cus_Np8G2pL7Ww1002",
            amountCents: 185000,
            currency: "usd",
            type: .financing,
            status: .pending,
            createdAt: Calendar.current.date(byAdding: .day, value: -2, to: Date()) ?? Date(),
            financingProvider: "Wisestack",
            loanId: "WS-1092"
        ),
        StripeTransaction(
            id: "pi_3Nwa3W2eZvKYlo2C14vS5G7G",
            customerName: "Lip Gallagher",
            customerEmail: "lip.gallagher@example.com",
            stripeCustomerId: "cus_Np8G2pL7Ww1003",
            amountCents: 420000,
            currency: "usd",
            type: .financing,
            status: .succeeded,
            createdAt: Calendar.current.date(byAdding: .day, value: -5, to: Date()) ?? Date(),
            financingProvider: "GreenSky",
            loanId: "GS-44810"
        )
    ]
}
