import Foundation
import Observation
@Observable
public final class JobTypeRegistry: @unchecked Sendable {
    public static let shared = JobTypeRegistry()
    
    // O(1) Pre-indexed cache per DispatchGroupCategory
    private var indexedCategories: [DispatchGroupCategory: [JobTypeCategory]] = [:]
    private var indexedFlatNames: [DispatchGroupCategory: [String]] = [:]
    
    public init() {
        seedMatrixCatalog()
    }
    
    public func categories(for group: DispatchGroupCategory) -> [JobTypeCategory] {
        indexedCategories[group] ?? []
    }
    
    public func flatNames(for group: DispatchGroupCategory) -> [String] {
        indexedFlatNames[group] ?? ["Diagnostic", "Parts", "Recall", "Install", "PM"]
    }
    
    public func jobTypeNames(for group: DispatchGroupCategory) -> [String] {
        flatNames(for: group)
    }
    
    private func seedMatrixCatalog() {
        // Standard Descriptions helper
        let standardApplianceDescriptions = ["Diagnostic", "Parts", "Recall", "Install", "PM"]
        let standardHVACDescriptions = ["Diagnostic", "Parts", "Recall", "Install", "PM"]
        
        // 1. APPLIANCE TECHS (Spelled-out Designations: Residential (R), Commercial (C), Home Warranty (HW))
        let applianceCategories: [JobTypeCategory] = [
            JobTypeCategory(
                name: "Residential (R)",
                designationCode: "R",
                standardItems: standardApplianceDescriptions.map {
                    JobTypeItem(name: $0, designation: "R", category: "Appliance")
                }
            ),
            JobTypeCategory(
                name: "Commercial (C)",
                designationCode: "C",
                standardItems: standardApplianceDescriptions.map {
                    JobTypeItem(name: $0, designation: "C", category: "Appliance")
                }
            ),
            JobTypeCategory(
                name: "Home Warranty (HW)",
                designationCode: "HW",
                standardItems: standardApplianceDescriptions.map {
                    JobTypeItem(name: $0, designation: "HW", category: "Appliance")
                }
            )
        ]
        
        // 2. HVAC TECHS (Spelled-out Designations: Home Warranty (HW), Commercial (C), Resort (RES), COD)
        let hvacHWStandard = standardHVACDescriptions.map {
            JobTypeItem(name: $0, designation: "HW", category: "HVAC")
        }
        let hvacHWProviders = ["AHS", "O.R.", "FI"].map {
            JobTypeItem(name: $0, designation: $0, category: "HVAC", isSpecialWarranty: true)
        }
        
        let hvacCategories: [JobTypeCategory] = [
            JobTypeCategory(
                name: "Home Warranty (HW)",
                designationCode: "HW",
                standardItems: hvacHWStandard,
                providerItems: hvacHWProviders
            ),
            JobTypeCategory(
                name: "Commercial (C)",
                designationCode: "C",
                standardItems: standardHVACDescriptions.map {
                    JobTypeItem(name: $0, designation: "C", category: "HVAC")
                }
            ),
            JobTypeCategory(
                name: "Resort (RES)",
                designationCode: "RES",
                standardItems: standardHVACDescriptions.map {
                    JobTypeItem(name: $0, designation: "RES", category: "HVAC")
                }
            ),
            JobTypeCategory(
                name: "COD",
                designationCode: "COD",
                standardItems: standardHVACDescriptions.map {
                    JobTypeItem(name: $0, designation: "COD", category: "HVAC")
                }
            )
        ]
        
        // 3. INSTALLERS
        let installerCategories: [JobTypeCategory] = [
            JobTypeCategory(
                name: "Home Warranty (HW)",
                designationCode: "HW",
                standardItems: [JobTypeItem(name: "Install", designation: "HW", category: "HVAC")]
            ),
            JobTypeCategory(
                name: "Commercial (C)",
                designationCode: "C",
                standardItems: [JobTypeItem(name: "Install", designation: "C", category: "HVAC")]
            ),
            JobTypeCategory(
                name: "Resort (RES)",
                designationCode: "RES",
                standardItems: [JobTypeItem(name: "Install", designation: "RES", category: "HVAC")]
            ),
            JobTypeCategory(
                name: "COD",
                designationCode: "COD",
                standardItems: [JobTypeItem(name: "Install", designation: "COD", category: "HVAC")]
            ),
            JobTypeCategory(
                name: "Residential (R)",
                designationCode: "R",
                standardItems: [JobTypeItem(name: "Install", designation: "R", category: "Appliance")]
            )
        ]
        
        indexedCategories[.applianceTechs] = applianceCategories
        indexedCategories[.hvacTechs] = hvacCategories
        indexedCategories[.installer] = installerCategories
        indexedCategories[.officeStaff] = applianceCategories + hvacCategories + installerCategories
        
        for (group, cats) in indexedCategories {
            var uniqueNames: [String] = []
            for c in cats {
                for item in c.items {
                    if !uniqueNames.contains(item.name) {
                        uniqueNames.append(item.name)
                    }
                }
            }
            indexedFlatNames[group] = uniqueNames
        }
    }
}
