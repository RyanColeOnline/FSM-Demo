import Foundation

public enum DatabaseMode: String, CaseIterable, Identifiable, Codable, Sendable {
    case sandbox = "Sandbox"
    case live = "Live"
    
    public var id: String { rawValue }
    
    public var displayName: String { rawValue }
    
    public var description: String {
        switch self {
        case .sandbox:
            return "Firestore Staging Sandbox"
        case .live:
            return "Production Firestore Database"
        }
    }
    
    public static var current: DatabaseMode {
        let raw = UserDefaults.standard.string(forKey: "fsm_database_mode") ?? "Sandbox"
        return DatabaseMode(rawValue: raw) ?? .sandbox
    }
}

extension Notification.Name {
    public static let databaseModeDidChange = Notification.Name("fsm_database_mode_did_change")
}
