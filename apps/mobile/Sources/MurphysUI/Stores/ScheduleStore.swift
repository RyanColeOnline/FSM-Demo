import Foundation
import Observation
public struct ClockInSession: Codable, Equatable, Sendable {
    public let id: UUID
    public var clockInTime: Date
    public var clockOutTime: Date?
    
    public init(id: UUID = UUID(), clockInTime: Date = Date(), clockOutTime: Date? = nil) {
        self.id = id
        self.clockInTime = clockInTime
        self.clockOutTime = clockOutTime
    }
}

public struct ShiftActivity: Identifiable, Codable, Equatable, Sendable {
    public let id: UUID
    public let type: String // "Clocked In" or "Clocked Out"
    public let timestamp: Date
    
    public init(id: UUID = UUID(), type: String, timestamp: Date = Date()) {
        self.id = id
        self.type = type
        self.timestamp = timestamp
    }
}

@Observable
@MainActor
public final class ScheduleStore {
    public static let shared = ScheduleStore()
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public var appointments: [Appointment] {
        get {
            let isOfficeOrAdmin = SessionManager.shared.currentUser?.accountType == .admin || SessionManager.shared.currentUser?.accountType == .office
            if isOfficeOrAdmin {
                return appointments(for: .officeStaff)
            }
            let group = SessionManager.shared.currentUser?.dispatchGroup ?? .applianceTechs
            return appointmentsByGroup[group] ?? []
        }
        set {
            let group = SessionManager.shared.currentUser?.dispatchGroup ?? .applianceTechs
            appointmentsByGroup[group] = newValue
        }
    }
    
    public private(set) var activeClockInSession: ClockInSession?
    public private(set) var isLoading = false
    public private(set) var error: Error?
    public private(set) var fetchedUsers: [UserSession] = []
    public private(set) var fetchedDispatchGroups: [String: [String]] = [:]
    
    public var allUsers: [UserSession] {
        if !fetchedUsers.isEmpty {
            return fetchedUsers
        }
        if let current = SessionManager.shared.currentUser {
            return [current]
        }
        return [UserSession()]
    }
    public private(set) var shiftActivities: [ShiftActivity] = []
    
    public var isClockedIn: Bool {
        activeClockInSession != nil
    }
    
    public var elapsedTimeString: String {
        guard let session = activeClockInSession else { return "00:00:00" }
        let interval = Date().timeIntervalSince(session.clockInTime)
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60
        let seconds = Int(interval) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
    
    private var appointmentsByGroup: [DispatchGroupCategory: [Appointment]] = [
        .applianceTechs: [],
        .hvacTechs: [],
        .installer: [],
        .officeStaff: []
    ]
    
    public func appointments(for group: DispatchGroupCategory) -> [Appointment] {
        if group == .officeStaff {
            var combined: [Appointment] = []
            for (cat, list) in appointmentsByGroup {
                if cat != .officeStaff {
                    combined.append(contentsOf: list)
                }
            }
            return combined
        }
        return appointmentsByGroup[group] ?? []
    }
    
    public func technicians(for group: DispatchGroupCategory) -> [String] {
        var groupTechs = Set<String>()
        
        // 1. Members from fetched dispatch groups in Firestore
        for (dgName, members) in fetchedDispatchGroups {
            let lower = dgName.lowercased()
            let matches: Bool = {
                switch group {
                case .applianceTechs: return lower.contains("appliance")
                case .hvacTechs: return lower.contains("hvac")
                case .installer: return lower.contains("install")
                case .officeStaff: return lower.contains("office")
                }
            }()
            if matches {
                for m in members {
                    groupTechs.insert(m)
                }
            }
        }
        
        // 2. Members from fetched users matching group
        for u in fetchedUsers {
            if u.dispatchGroup == group && u.accountType != .office {
                groupTechs.insert(u.name)
            }
        }
        
        // 3. Fallback to predefined group technicians if Firestore hasn't loaded
        if groupTechs.isEmpty {
            for t in group.technicians {
                groupTechs.insert(t)
            }
        }
        
        return Array(groupTechs).sorted()
    }
    
    public init() {
        self.appointmentsByGroup = [
            .applianceTechs: [],
            .hvacTechs: [],
            .installer: [],
            .officeStaff: []
        ]
        Task { @MainActor in
            await self.fetchAppointments()
        }
        
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
        self.appointmentsByGroup = [
            .applianceTechs: [],
            .hvacTechs: [],
            .installer: [],
            .officeStaff: []
        ]
        Task { @MainActor in
            await self.fetchAppointments()
        }
    }
    
    public func fetchAppointments() async {
        let mode = currentDatabaseMode
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        async let apptsTask = FirestoreClient.shared.fetchAppointments(mode: mode)
        async let groupsTask = FirestoreClient.shared.fetchDispatchGroups(mode: mode)
        async let usersTask = FirestoreClient.shared.fetchUsers(mode: mode)
        
        let (docs, groups, users) = await (apptsTask, groupsTask, usersTask)
        self.fetchedDispatchGroups = groups
        self.fetchedUsers = users
        
        var grouped: [DispatchGroupCategory: [Appointment]] = [
            .applianceTechs: [],
            .hvacTechs: [],
            .installer: [],
            .officeStaff: []
        ]
        
        for appt in docs {
            let cat: DispatchGroupCategory = {
                let jt = appt.jobType.lowercased()
                if jt.contains("hvac") || jt.contains("heat") || jt.contains("cool") || jt.contains("ac ") || jt.contains("air") {
                    return .hvacTechs
                } else if jt.contains("install") {
                    return .installer
                }
                return .applianceTechs
            }()
            grouped[cat, default: []].append(appt)
        }
        
        for cat in DispatchGroupCategory.allCases {
            if grouped[cat] == nil {
                grouped[cat] = []
            }
        }
        
        self.appointmentsByGroup = grouped
    }
    
    public func addAppointmentLocally(_ appointment: Appointment) {
        for group in DispatchGroupCategory.allCases {
            var list = appointmentsByGroup[group] ?? []
            if let idx = list.firstIndex(where: { $0.id == appointment.id }) {
                list[idx] = appointment
            } else {
                list.insert(appointment, at: 0)
            }
            appointmentsByGroup[group] = list
        }
    }
    
    public func deleteAppointmentLocally(_ appointment: Appointment) {
        for group in DispatchGroupCategory.allCases {
            if var list = appointmentsByGroup[group], !list.isEmpty {
                list.removeAll { $0.id == appointment.id }
                appointmentsByGroup[group] = list
            }
        }
        
        let mode = currentDatabaseMode
        Task {
            await FirestoreClient.shared.deleteAppointment(appointment: appointment, mode: mode)
        }
    }
    
    public func deleteAppointment(_ appointment: Appointment) async {
        deleteAppointmentLocally(appointment)
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let success = await FirestoreClient.shared.deleteAppointment(appointment: appointment, mode: currentDatabaseMode)
        if !success {
            print("[ScheduleStore] Failed to delete appointment \(appointment.id) from Firestore.")
        }
    }
    
    public func updateAppointment(_ appointment: Appointment) async {
        addAppointmentLocally(appointment)
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let success = await FirestoreClient.shared.saveAppointment(appointment: appointment, mode: currentDatabaseMode)
        if !success {
            print("[ScheduleStore] Failed to update appointment \(appointment.id) in Firestore.")
        }
    }
    
    public func scheduleAppointment(_ appointment: Appointment) async {
        await updateAppointment(appointment)
    }
    
    public private(set) var isOnBreak = false
    
    public func toggleClockInStatus() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let newActivity: ShiftActivity
        if isClockedIn {
            activeClockInSession = nil
            isOnBreak = false
            newActivity = ShiftActivity(type: "Clocked Out", timestamp: Date())
            shiftActivities.insert(newActivity, at: 0)
        } else {
            activeClockInSession = ClockInSession()
            isOnBreak = false
            newActivity = ShiftActivity(type: "Clocked In", timestamp: Date())
            shiftActivities.insert(newActivity, at: 0)
        }
        
        let mode = currentDatabaseMode
        let user = SessionManager.shared.currentUser
        let session = activeClockInSession
        Task {
            await FirestoreClient.shared.saveShiftActivity(
                activity: newActivity,
                session: session,
                userId: user?.id,
                userName: user?.name,
                mode: mode
            )
        }
    }
    
    public func toggleBreakStatus() async {
        isOnBreak.toggle()
        let typeStr = isOnBreak ? "On Break" : "Ended Break"
        let newActivity = ShiftActivity(type: typeStr, timestamp: Date())
        shiftActivities.insert(newActivity, at: 0)
        
        let mode = currentDatabaseMode
        let user = SessionManager.shared.currentUser
        let session = activeClockInSession
        Task {
            await FirestoreClient.shared.saveShiftActivity(
                activity: newActivity,
                session: session,
                userId: user?.id,
                userName: user?.name,
                mode: mode
            )
        }
    }
    
    public func unflagAppointment(jobNumber: String) {
        let clean = jobNumber.replacingOccurrences(of: "#", with: "").replacingOccurrences(of: "Job", with: "").trimmingCharacters(in: CharacterSet.whitespaces)
        for cat in DispatchGroupCategory.allCases {
            if var list = appointmentsByGroup[cat], !list.isEmpty {
                var modified = false
                for i in 0..<list.count {
                    let apptJobStr = String(list[i].jobNumber)
                    if apptJobStr == clean || list[i].formattedJobNumber == jobNumber {
                        list[i].isFlaggedForFollowUp = false
                        modified = true
                    }
                }
                if modified {
                    appointmentsByGroup[cat] = list
                }
            }
        }
    }
}
