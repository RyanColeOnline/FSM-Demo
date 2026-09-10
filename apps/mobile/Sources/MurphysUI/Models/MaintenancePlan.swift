import Foundation
import Observation
public struct ServiceWindowItem: Identifiable, Hashable, Sendable, Codable {
    public var id = UUID()
    public var season: String
    public var windowStartDate: Date
    public var windowEndDate: Date
    public var isScheduled: Bool
    public var appointmentId: UUID?
    public var dateRange: String
    public var jobSubtitle: String
    public var isComplete: Bool
    public var jobNumber: String?
    public var jobName: String?
    public var appointmentStatus: String?
    public var windowNumber: String?
    public var lastNotification: String?
    
    public init(
        id: UUID = UUID(),
        season: String = "Spring",
        windowStartDate: Date = Date(),
        windowEndDate: Date = Date().addingTimeInterval(86400 * 60),
        isScheduled: Bool = false,
        appointmentId: UUID? = nil,
        dateRange: String = "",
        jobSubtitle: String = "",
        isComplete: Bool = false,
        jobNumber: String? = nil,
        jobName: String? = nil,
        appointmentStatus: String? = nil,
        windowNumber: String? = nil,
        lastNotification: String? = nil
    ) {
        self.id = id
        self.season = season
        self.windowStartDate = windowStartDate
        self.windowEndDate = windowEndDate
        self.isScheduled = isScheduled
        self.appointmentId = appointmentId
        self.dateRange = dateRange.isEmpty ? "\(season) Window" : dateRange
        self.jobSubtitle = jobSubtitle
        self.isComplete = isComplete
        self.jobNumber = jobNumber
        self.jobName = jobName
        self.appointmentStatus = appointmentStatus
        self.windowNumber = windowNumber
        self.lastNotification = lastNotification
    }
    
    public init(dateRange: String, jobSubtitle: String, isComplete: Bool) {
        self.id = UUID()
        self.season = "General"
        self.windowStartDate = Date()
        self.windowEndDate = Date().addingTimeInterval(86400 * 60)
        self.isScheduled = false
        self.appointmentId = nil
        self.dateRange = dateRange
        self.jobSubtitle = jobSubtitle
        self.isComplete = isComplete
        self.jobNumber = nil
        self.jobName = nil
        self.appointmentStatus = nil
        self.windowNumber = nil
        self.lastNotification = nil
    }
}

public struct MaintenancePlanItem: Identifiable, Hashable, Sendable, Codable {
    public var id: UUID
    public var customerId: UUID?
    public var name: String
    public var status: String
    public var description: String
    public var expiresDate: String
    public var contractTotal: String
    public var annualPrice: String
    public var balance: String
    public var locationStreet: String
    public var coveredEquipmentIds: [String]
    public var includedVisitsTotal: Int
    public var includedVisitsRemaining: Int
    public var discountPercentage: Int
    public var serviceWindows: [ServiceWindowItem]
    
    public init(
        id: UUID = UUID(),
        customerId: UUID? = nil,
        name: String = "Gold Protection Plan",
        status: String = "ACTIVE",
        description: String = "Includes 2 bi-annual tune-ups (Spring/Fall) and 15% discount on repair parts.",
        expiresDate: String = "8/12/26",
        contractTotal: String = "$348.00",
        annualPrice: String = "$348.00",
        balance: String = "$174.00",
        locationStreet: String = "",
        coveredEquipmentIds: [String] = [],
        includedVisitsTotal: Int = 2,
        includedVisitsRemaining: Int = 1,
        discountPercentage: Int = 15,
        serviceWindows: [ServiceWindowItem] = []
    ) {
        self.id = id
        self.customerId = customerId
        self.name = name
        self.status = status
        self.description = description
        self.expiresDate = expiresDate
        self.contractTotal = contractTotal
        self.annualPrice = annualPrice
        self.balance = balance
        self.locationStreet = locationStreet
        self.coveredEquipmentIds = coveredEquipmentIds
        self.includedVisitsTotal = includedVisitsTotal
        self.includedVisitsRemaining = includedVisitsRemaining
        self.discountPercentage = discountPercentage
        self.serviceWindows = serviceWindows
    }
    
    public init(
        name: String,
        status: String = "ACTIVE",
        description: String = "Includes 2 bi-annual tune-ups (Spring/Fall) and 15% discount on repair parts.",
        expiresDate: String = "8/12/26",
        contractTotal: String = "$348.00",
        annualPrice: String = "$348.00",
        balance: String = "$174.00",
        locationStreet: String = ""
    ) {
        self.id = UUID()
        self.customerId = nil
        self.name = name
        self.status = status
        self.description = description
        self.expiresDate = expiresDate
        self.contractTotal = contractTotal
        self.annualPrice = annualPrice
        self.balance = balance
        self.locationStreet = locationStreet
        self.coveredEquipmentIds = []
        self.includedVisitsTotal = 2
        self.includedVisitsRemaining = 1
        self.discountPercentage = 15
        self.serviceWindows = []
    }
}
