import Foundation
import Observation
public struct ContractorWarrantyItem: Identifiable, Equatable, Hashable, Sendable, Codable {
    public var id: UUID
    public var name: String
    public var descriptionText: String
    public var status: String
    public var expiresOn: Date?
    public var durationMonths: Int
    
    public init(id: UUID = UUID(), name: String, descriptionText: String = "") {
        self.id = id
        self.name = name
        self.descriptionText = descriptionText
        self.status = "Active"
        self.expiresOn = Date().addingTimeInterval(86400 * 365)
        self.durationMonths = 12
    }
}

public struct RebateItem: Identifiable, Equatable, Hashable, Sendable, Codable {
    public var id: UUID
    public var name: String
    public var amount: String
    public var descriptionText: String
    public var provider: String
    public var status: String
    public var submittedDate: Date
    
    public init(id: UUID = UUID(), name: String, amount: String, descriptionText: String = "") {
        self.id = id
        self.name = name
        self.amount = amount
        self.descriptionText = descriptionText
        self.provider = "Utility Rebate Program"
        self.status = "Submitted"
        self.submittedDate = Date()
    }
}

public struct OtherWarrantyItem: Identifiable, Hashable, Sendable, Codable {
    public var id: UUID
    public var name: String
    public var description: String
    public var effectiveStart: Date
    public var effectiveEnd: Date
    public var isUploaded: Bool
    
    public init(
        id: UUID = UUID(),
        name: String = "",
        description: String = "",
        effectiveStart: Date = Date(),
        effectiveEnd: Date = Calendar.current.date(byAdding: .year, value: 1, to: Date()) ?? Date(),
        isUploaded: Bool = false
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.effectiveStart = effectiveStart
        self.effectiveEnd = effectiveEnd
        self.isUploaded = isUploaded
    }
}

public struct EquipmentItem: Identifiable, Hashable, Sendable, Codable {
    public var id: UUID
    public var name: String
    public var type: String // "HVAC" or "Appliance"
    public var manufacturer: String
    public var modelNumber: String
    public var serialNumber: String
    public var locationAddress: String
    public var installDate: Date
    public var status: String
    public var warranty: String
    public var photos: [String]
    public var appointmentID: String?
    public var jobNumber: Int?
    public var customerId: UUID?
    
    public init(
        id: UUID = UUID(),
        name: String = "Equipment",
        type: String = "HVAC",
        manufacturer: String = "Trane",
        modelNumber: String = "TEM6A0C36H31SB",
        serialNumber: String = "21453M8901",
        locationAddress: String = "Attic",
        installDate: Date = Date().addingTimeInterval(-86400 * 365 * 2),
        status: String = "Active",
        warranty: String = "10 Yrs Parts, 1 Yr Labor",
        photos: [String] = [],
        appointmentID: String? = nil,
        jobNumber: Int? = nil,
        customerId: UUID? = nil
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.manufacturer = manufacturer
        self.modelNumber = modelNumber
        self.serialNumber = serialNumber
        self.locationAddress = locationAddress
        self.installDate = installDate
        self.status = status
        self.warranty = warranty
        self.photos = photos
        self.appointmentID = appointmentID
        self.jobNumber = jobNumber
        self.customerId = customerId
    }
}
