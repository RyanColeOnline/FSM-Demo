import Foundation
import SwiftUI
import Observation
public enum AppointmentStatus: String, Codable, Sendable, CaseIterable {
    case unassigned = "Unassigned"
    case assigned = "Assigned"
    case dispatched = "Dispatched"
    case enRoute = "En route"
    case inProgress = "In progress"
    case completed = "Completed"
    case cancelled = "Cancelled"
    case onHold = "On hold"
}

@Observable
public final class Appointment: Identifiable, Codable, @unchecked Sendable {
    public let id: UUID
    public var customerId: UUID
    public var dateTime: Date
    public var durationHours: Double
    public var status: AppointmentStatus
    public var serviceNotes: String?
    
    // New fields requested for custom designation and job info
    public var jobNumber: Int
    public var appointmentSequenceNumber: Int
    public var jobType: String
    public var designationOverride: String?
    public var assignedTech: String?
    public var isFlaggedForFollowUp: Bool
    public var accessCodes: [AccessCode]
    public var arrivedAt: Date?
    public var completedAt: Date?
    public var locationAddress: String?
    public var customerName: String?
    public var contactName: String?
    public var customerPhone: String?
    public var customerEmail: String?
    public var startTimeString: String?
    public var endTimeString: String?
    public var wexJobId: String?
    public var wexLegacyId: String?
    public var appointmentId: String?
    
    public var displayCustomerName: String {
        guard let name = customerName else { return "Customer" }
        return Customer.formatDisplayName(name: name)
    }
    
    public var actualDurationHours: Double? {
        guard let arrived = arrivedAt, let completed = completedAt else { return nil }
        return max(0.25, completed.timeIntervalSince(arrived) / 3600.0)
    }
    
    public init(
        id: UUID = UUID(),
        customerId: UUID,
        dateTime: Date,
        durationHours: Double = 2.0,
        status: AppointmentStatus = .assigned,
        serviceNotes: String? = nil,
        jobNumber: Int = 140001,
        appointmentSequenceNumber: Int = 1,
        jobType: String = "Diagnostic",
        designationOverride: String? = nil,
        assignedTech: String? = nil,
        isFlaggedForFollowUp: Bool = false,
        accessCodes: [AccessCode] = [],
        arrivedAt: Date? = nil,
        completedAt: Date? = nil,
        locationAddress: String? = nil,
        customerName: String? = nil,
        contactName: String? = nil,
        customerPhone: String? = nil,
        customerEmail: String? = nil,
        startTimeString: String? = nil,
        endTimeString: String? = nil,
        wexJobId: String? = nil,
        wexLegacyId: String? = nil,
        appointmentId: String? = nil
    ) {
        self.id = id
        self.customerId = customerId
        self.dateTime = dateTime
        self.durationHours = durationHours
        self.status = status
        self.serviceNotes = serviceNotes
        self.jobNumber = jobNumber
        self.appointmentSequenceNumber = appointmentSequenceNumber
        self.jobType = jobType
        self.designationOverride = designationOverride
        self.assignedTech = assignedTech
        self.isFlaggedForFollowUp = isFlaggedForFollowUp
        self.accessCodes = accessCodes
        self.arrivedAt = arrivedAt
        self.completedAt = completedAt
        self.locationAddress = locationAddress
        self.customerName = customerName
        self.contactName = contactName
        self.customerPhone = customerPhone
        self.customerEmail = customerEmail
        self.startTimeString = startTimeString
        self.endTimeString = endTimeString
        self.wexJobId = wexJobId
        self.wexLegacyId = wexLegacyId
        self.appointmentId = appointmentId
    }
    
    // Computed Properties for Backward Compatibility with Screens
    public var rawJobNumberString: String {
        "\(jobNumber)"
    }
    
    public var formattedJobNumber: String {
        "#\(rawJobNumberString)"
    }
    
    public var formattedAppointmentNumber: String {
        formattedJobNumber
    }
    
    public func formattedInvoiceNumber(sequence: Int = 1) -> String {
        "\(formattedJobNumber)-\(String(format: "%02d", sequence))"
    }
    
    public func formattedProposalNumber(sequence: Int = 1) -> String {
        "\(formattedJobNumber)-\(String(format: "%02d", sequence))"
    }
    
    public var formattedProposalNumber: String {
        formattedProposalNumber(sequence: appointmentSequenceNumber)
    }
    
    public var formattedInvoiceNumber: String {
        formattedInvoiceNumber(sequence: appointmentSequenceNumber)
    }
    
    public var title: String {
        jobType
    }
    
    public var startDate: Date {
        dateTime
    }
    
    public var endDate: Date {
        dateTime.addingTimeInterval(3600 * durationHours)
    }
    
    public var timeRangeFormatted: String {
        if let st = startTimeString, let et = endTimeString, !st.isEmpty, !et.isEmpty {
            return "\(st) - \(et)"
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
    }
    
    public var notes: String? {
        get { serviceNotes }
        set { serviceNotes = newValue }
    }
    
    public func resolveAuthorizedContact(customer: Customer?) -> String? {
        let custName = customer?.name ?? customerName
        
        func isCustomerNameSelf(_ candidate: String) -> Bool {
            guard let cName = custName?.trimmingCharacters(in: .whitespacesAndNewlines), !cName.isEmpty else { return false }
            let cLower = cName.lowercased()
            let candLower = candidate.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            if candLower == cLower { return true }
            if cLower.hasPrefix(candLower) || candLower.hasPrefix(cLower) { return true }
            if cLower.contains(candLower) && candLower.count > 4 { return true }
            return false
        }
        
        if let explicit = contactName?.trimmingCharacters(in: .whitespacesAndNewlines),
           !explicit.isEmpty,
           explicit != "Select",
           !isCustomerNameSelf(explicit) {
            return explicit
        }
        
        if let notes = serviceNotes, !notes.isEmpty, let auths = customer?.authorizedPersons {
            for person in auths {
                let pName = person.fullName.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !pName.isEmpty, !isCustomerNameSelf(pName) else { continue }
                if notes.localizedCaseInsensitiveContains(pName) {
                    return pName
                }
                if !person.phone.isEmpty {
                    let cleanPhone = person.phone.filter { $0.isNumber }
                    if cleanPhone.count >= 7 && notes.filter({ $0.isNumber }).contains(cleanPhone) {
                        return pName
                    }
                }
            }
        }
        
        return nil
    }
    
    public var jobTypeBadge: String {
        if let override = designationOverride, !override.trimmingCharacters(in: .whitespaces).isEmpty {
            return override
        }
        let jt = jobType.trimmingCharacters(in: .whitespaces)
        let parts = jt.components(separatedBy: "-")
        let category = (parts.first ?? jt).trimmingCharacters(in: .whitespaces)
        
        switch category.lowercased() {
        case "residential", "res", "r":
            return "R"
        case "commercial", "c":
            return "C"
        case "home warranty", "hw":
            return "HW"
        case "cod":
            return "COD"
        case "ahs":
            return "AHS"
        case "o.r.", "or":
            return "O.R."
        case "fi":
            return "FI"
        default:
            if category.count <= 3 && !category.isEmpty {
                return category.uppercased()
            }
            return "R"
        }
    }
    
    public var tripType: TripType {
        TripType.from(raw: jobType)
    }
    
    public var tripSemanticColor: Color {
        tripType.semanticColor
    }
    
    public var tripWebHex: String {
        tripType.webHex
    }
    
    private enum CodingKeys: String, CodingKey {
        case id, customerId, dateTime, durationHours, status, serviceNotes, jobNumber, appointmentSequenceNumber, jobType, designationOverride, assignedTech, isFlaggedForFollowUp, accessCodes, arrivedAt, completedAt
    }
    
    public required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Flexible ID decoding (UUID or String)
        if let uuid = try? container.decode(UUID.self, forKey: .id) {
            self.id = uuid
        } else if let idStr = try? container.decode(String.self, forKey: .id), let uuid = UUID(uuidString: idStr) {
            self.id = uuid
        } else {
            self.id = UUID()
        }
        
        // Flexible Customer ID decoding (UUID or String)
        if let uuid = try? container.decode(UUID.self, forKey: .customerId) {
            self.customerId = uuid
        } else if let idStr = try? container.decode(String.self, forKey: .customerId), let uuid = UUID(uuidString: idStr) {
            self.customerId = uuid
        } else {
            self.customerId = UUID()
        }
        
        // Flexible DateTime decoding (Date or ISO8601 String)
        if let date = try? container.decode(Date.self, forKey: .dateTime) {
            self.dateTime = date
        } else if let dateStr = try? container.decode(String.self, forKey: .dateTime) {
            let formatter = ISO8601DateFormatter()
            self.dateTime = formatter.date(from: dateStr) ?? Date()
        } else {
            self.dateTime = Date()
        }
        
        self.durationHours = try container.decodeIfPresent(Double.self, forKey: .durationHours) ?? 2.0
        self.status = (try? container.decode(AppointmentStatus.self, forKey: .status)) ?? .assigned
        self.serviceNotes = try container.decodeIfPresent(String.self, forKey: .serviceNotes)
        
        // Flexible JobNumber decoding (Int or String like "140019" / "Job 140019")
        if let num = try? container.decode(Int.self, forKey: .jobNumber) {
            self.jobNumber = num
        } else if let str = try? container.decode(String.self, forKey: .jobNumber) {
            let digitsOnly = str.filter { "0123456789".contains($0) }
            self.jobNumber = Int(digitsOnly) ?? 140001
        } else {
            self.jobNumber = 140001
        }
        
        self.appointmentSequenceNumber = try container.decodeIfPresent(Int.self, forKey: .appointmentSequenceNumber) ?? 1
        self.jobType = (try? container.decode(String.self, forKey: .jobType)) ?? "Diagnostic"
        self.designationOverride = try container.decodeIfPresent(String.self, forKey: .designationOverride)
        self.assignedTech = try container.decodeIfPresent(String.self, forKey: .assignedTech)
        self.isFlaggedForFollowUp = try container.decodeIfPresent(Bool.self, forKey: .isFlaggedForFollowUp) ?? false
        self.accessCodes = (try? container.decodeIfPresent([AccessCode].self, forKey: .accessCodes)) ?? []
        
        // Flexible arrivedAt decoding
        if let date = try? container.decode(Date.self, forKey: .arrivedAt) {
            self.arrivedAt = date
        } else if let dateStr = try? container.decode(String.self, forKey: .arrivedAt) {
            let formatter = ISO8601DateFormatter()
            self.arrivedAt = formatter.date(from: dateStr)
        } else {
            self.arrivedAt = nil
        }
        
        // Flexible completedAt decoding
        if let date = try? container.decode(Date.self, forKey: .completedAt) {
            self.completedAt = date
        } else if let dateStr = try? container.decode(String.self, forKey: .completedAt) {
            let formatter = ISO8601DateFormatter()
            self.completedAt = formatter.date(from: dateStr)
        } else {
            self.completedAt = nil
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(customerId, forKey: .customerId)
        try container.encode(dateTime, forKey: .dateTime)
        try container.encode(durationHours, forKey: .durationHours)
        try container.encode(status, forKey: .status)
        try container.encode(serviceNotes, forKey: .serviceNotes)
        try container.encode(jobNumber, forKey: .jobNumber)
        try container.encode(appointmentSequenceNumber, forKey: .appointmentSequenceNumber)
        try container.encode(jobType, forKey: .jobType)
        try container.encode(designationOverride, forKey: .designationOverride)
        try container.encode(assignedTech, forKey: .assignedTech)
        try container.encode(isFlaggedForFollowUp, forKey: .isFlaggedForFollowUp)
        try container.encode(accessCodes, forKey: .accessCodes)
        try container.encodeIfPresent(arrivedAt, forKey: .arrivedAt)
        try container.encodeIfPresent(completedAt, forKey: .completedAt)
    }
}

extension Appointment {
    public static func == (lhs: Appointment, rhs: Appointment) -> Bool {
        lhs.id == rhs.id
    }
}

extension Appointment {
    public static var sampleList: [Appointment] {
        let group = SessionManager.shared.currentUser?.dispatchGroup ?? .applianceTechs
        return sampleList(for: group)
    }
    
    public static func sampleList(for group: DispatchGroupCategory) -> [Appointment] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        
        func date(daysOffset: Int, hour: Int, minute: Int) -> Date {
            let offsetDate = calendar.date(byAdding: .day, value: daysOffset, to: today) ?? today
            return calendar.date(bySettingHour: hour, minute: minute, second: 0, of: offsetDate) ?? offsetDate
        }
        
        switch group {
        case .applianceTechs:
            return [
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000001")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000005")!, // Evan Williams
                    dateTime: date(daysOffset: 0, hour: 10, minute: 0),
                    status: .inProgress,
                    serviceNotes: "Annual AC inspection and maintenance. Inspect condenser coil and measure superheat.",
                    jobNumber: 140019,
                    jobType: "Diagnostic",
                    designationOverride: "R",
                    assignedTech: "Justin Lung",
                    isFlaggedForFollowUp: true
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000002")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000006")!, // Fiona Gallagher
                    dateTime: date(daysOffset: 0, hour: 8, minute: 30),
                    status: .assigned,
                    serviceNotes: "No cooling call. Diagnostic revealed failed dual run capacitor (45/5 MFD).",
                    jobNumber: 140020,
                    jobType: "Parts",
                    designationOverride: "HW",
                    assignedTech: "Alex Rivera"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000003")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000018")!, // Robert Johnson
                    dateTime: date(daysOffset: 0, hour: 13, minute: 0),
                    status: .completed,
                    serviceNotes: "Furnace filter replacement and system tune-up. Cleaned flame sensor.",
                    jobNumber: 140021,
                    jobType: "Maintenance",
                    designationOverride: "C",
                    assignedTech: "Wes Rykoskey"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000004")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000013")!, // Michael Williams
                    dateTime: date(daysOffset: 0, hour: 15, minute: 30),
                    status: .assigned,
                    serviceNotes: "Thermostat replacement. Installing customer-provided ecobee smart thermostat.",
                    jobNumber: 140022,
                    jobType: "Installation",
                    designationOverride: "R",
                    assignedTech: "Chris Miller"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000008")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000007")!, // G&H Appliance
                    dateTime: date(daysOffset: 1, hour: 8, minute: 30),
                    status: .assigned,
                    jobNumber: 140026,
                    jobType: "Diagnostic",
                    designationOverride: "C",
                    assignedTech: "Justin Lung"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000009")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000009")!, // Irene Adler
                    dateTime: date(daysOffset: 1, hour: 11, minute: 0),
                    status: .assigned,
                    jobNumber: 140027,
                    jobType: "Maintenance",
                    designationOverride: "R",
                    assignedTech: "Alex Rivera"
                )
            ]
            
        case .hvacTechs:
            return [
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000031")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000003")!, // Wayne Enterprises
                    dateTime: date(daysOffset: 0, hour: 8, minute: 30),
                    status: .inProgress,
                    serviceNotes: "Chiller diagnostic and compressor inspection.",
                    jobNumber: 140028,
                    jobType: "Diagnostic",
                    designationOverride: "COD",
                    assignedTech: "Marcus Vance",
                    isFlaggedForFollowUp: true
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000032")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!, // John Smith
                    dateTime: date(daysOffset: 0, hour: 10, minute: 30),
                    status: .assigned,
                    serviceNotes: "Seasonal heat pump maintenance.",
                    jobNumber: 140029,
                    jobType: "Maintenance",
                    designationOverride: "RES",
                    assignedTech: "Johan Smith"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000005")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000027")!, // Alice Adams
                    dateTime: date(daysOffset: 0, hour: 13, minute: 0),
                    status: .assigned,
                    serviceNotes: "Leak in copper line set. Evacuate system, repair leak, and recharge refrigerant.",
                    jobNumber: 140023,
                    jobType: "Sealed System",
                    designationOverride: "AHS",
                    assignedTech: "Bob Vance"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000006")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000028")!, // Benjamin Baker
                    dateTime: date(daysOffset: 0, hour: 15, minute: 30),
                    status: .assigned,
                    serviceNotes: "Clean condensate drain line. System tripped float switch.",
                    jobNumber: 140024,
                    jobType: "Maintenance",
                    designationOverride: "O.R.",
                    assignedTech: "Charlie Green"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000007")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000029")!, // Catherine Carter
                    dateTime: date(daysOffset: 1, hour: 9, minute: 0),
                    status: .assigned,
                    serviceNotes: "Install new smart Nest thermostat.",
                    jobNumber: 140025,
                    jobType: "Installation",
                    designationOverride: "FI",
                    assignedTech: "Dave Johnson"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000010")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000017")!, // Quincy Tech
                    dateTime: date(daysOffset: 1, hour: 11, minute: 30),
                    status: .assigned,
                    jobNumber: 140030,
                    jobType: "Diagnostic",
                    designationOverride: "C",
                    assignedTech: "Marcus Vance"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000012")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000024")!, // Xavier HVAC
                    dateTime: date(daysOffset: 1, hour: 14, minute: 0),
                    status: .assigned,
                    jobNumber: 140031,
                    jobType: "Parts",
                    designationOverride: "HW",
                    assignedTech: "Johan Smith"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000013")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000026")!, // Zachary Taylor
                    dateTime: date(daysOffset: 2, hour: 10, minute: 0),
                    status: .assigned,
                    jobNumber: 140032,
                    jobType: "Maintenance",
                    designationOverride: "RES",
                    assignedTech: "Bob Vance"
                )
            ]
            
        case .installer:
            return [
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000041")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000013")!, // Michael Williams
                    dateTime: date(daysOffset: 0, hour: 9, minute: 0),
                    status: .inProgress,
                    serviceNotes: "Full split system installation.",
                    jobNumber: 140033,
                    jobType: "Installation",
                    designationOverride: "RES",
                    assignedTech: "Mark Taylor",
                    isFlaggedForFollowUp: true
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000042")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000029")!, // Catherine Carter
                    dateTime: date(daysOffset: 0, hour: 13, minute: 30),
                    status: .assigned,
                    serviceNotes: "Ductwork replacement & heat pump mount.",
                    jobNumber: 140034,
                    jobType: "Installation",
                    designationOverride: "HW",
                    assignedTech: "Paul Rudd"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000043")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!, // John Smith
                    dateTime: date(daysOffset: 1, hour: 10, minute: 0),
                    status: .assigned,
                    jobNumber: 140035,
                    jobType: "Installation",
                    designationOverride: "COD",
                    assignedTech: "Steve Rogers"
                ),
                Appointment(
                    id: UUID(uuidString: "10000000-0000-0000-0000-000000000044")!,
                    customerId: UUID(uuidString: "00000000-0000-0000-0000-000000000003")!, // Wayne Enterprises
                    dateTime: date(daysOffset: 1, hour: 14, minute: 0),
                    status: .assigned,
                    jobNumber: 140036,
                    jobType: "Installation",
                    designationOverride: "C",
                    assignedTech: "Matt Curtsinger"
                )
            ]
            
        case .officeStaff:
            return sampleList(for: .applianceTechs) + sampleList(for: .hvacTechs)
        }
    }
}

