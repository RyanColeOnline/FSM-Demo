import Foundation

public enum DispatchGroupCategory: String, CaseIterable, Identifiable, Codable, Sendable {
    case hvacTechs = "hvac_techs"
    case applianceTechs = "appliance_techs"
    case installer = "installer"
    case officeStaff = "office_staff"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .hvacTechs: return "HVAC Techs"
        case .applianceTechs: return "Appliance Techs"
        case .installer: return "Installer"
        case .officeStaff: return "Office Staff"
        }
    }
    
    public var technicians: [String] {
        switch self {
        case .applianceTechs:
            return ["Justin Lung", "Minor Cover", "Wes Rykoskey"]
        case .hvacTechs:
            return ["Andrew (Jr) Murphy", "Joe Colacino", "Robert Hudson", "Ethan Mitchell"]
        case .installer:
            return ["Matt Curtsinger", "Jon Martin", "Ethan Murphy", "Christian Nguyen"]
        case .officeStaff:
            return ["Nancy Murphy", "Danny Pardo", "Amanda Hoover", "Justin Dunlap"]
        }
    }
}
