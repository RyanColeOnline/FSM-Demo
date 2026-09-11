import Foundation

public enum AccountType: String, CaseIterable, Identifiable, Codable, Sendable {
    case field = "field"
    case office = "office"
    case admin = "admin"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .field: return "Field"
        case .office: return "Office"
        case .admin: return "Admin"
        }
    }
    
    public var hasWebPortalAccess: Bool {
        self == .office || self == .admin
    }
    
    public var canSwitchTechnicianSchedules: Bool {
        self == .office || self == .admin
    }
    
    public var canViewAllTechnicians: Bool {
        self == .office || self == .admin
    }
}
