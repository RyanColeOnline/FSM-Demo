// Generated Price Book Store with O(1) Pre-Indexed Catalogs
import Foundation
import Observation
final class MutablePriceBookNode {
    var name: String
    var fullPath: String
    var children: [String: MutablePriceBookNode] = [:]
    var items: [PriceBookItem] = []
    
    init(name: String, fullPath: String) {
        self.name = name
        self.fullPath = fullPath
    }
    
    func toImmutable() -> PriceBookCategoryNode {
        let sortedChildren = children.values.sorted(by: { $0.name < $1.name }).map { $0.toImmutable() }
        let sortedItems = items.sorted(by: { $0.name < $1.name })
        return PriceBookCategoryNode(
            name: self.name,
            fullPath: self.fullPath,
            subcategories: sortedChildren,
            items: sortedItems
        )
    }
}

@Observable
public final class PriceBookStore: @unchecked Sendable {
    public static let shared = PriceBookStore()
    
    public private(set) var allItems: [PriceBookItem] = []
    
    // Pre-indexed category hierarchies for O(1) UI retrieval
    private var indexedCategoryTrees: [DispatchGroupCategory: [PriceBookCategoryNode]] = [:]
    private var indexedItemsByGroup: [DispatchGroupCategory: [PriceBookItem]] = [:]
    private var cachedTopLevelCategories: [PriceBookCategoryNode] = []
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.allItems = []
        Task {
            await self.fetchPriceBook()
        }
        buildGroupIndexes()
        
        // Listen for real-time database mode changes
        NotificationCenter.default.addObserver(
            forName: .databaseModeDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.handleDatabaseModeChanged()
        }
    }
    
    private func handleDatabaseModeChanged() {
        self.allItems = []
        self.buildGroupIndexes()
        Task {
            await self.fetchPriceBook()
        }
    }
    
    public func fetchPriceBook() async {
        let mode = currentDatabaseMode
        let docs = await FirestoreClient.shared.fetchPriceBookItems(mode: mode)
        self.allItems = docs
        self.buildGroupIndexes()
    }
    
    public func createPriceBookItem(_ item: PriceBookItem) async {
        if let idx = allItems.firstIndex(where: { $0.id == item.id }) {
            allItems[idx] = item
        } else {
            allItems.insert(item, at: 0)
        }
        buildGroupIndexes()
        
        
        
        let success = await FirestoreClient.shared.savePriceBookItem(item: item, mode: currentDatabaseMode)
        if !success {
            print("[PriceBookStore] Failed to write item \(item.id) to Firestore.")
        }
    }
    
    public func updatePriceBookItem(_ item: PriceBookItem) async {
        if let idx = allItems.firstIndex(where: { $0.id == item.id }) {
            allItems[idx] = item
            buildGroupIndexes()
        }
        
        
        
        let success = await FirestoreClient.shared.savePriceBookItem(item: item, mode: currentDatabaseMode)
        if !success {
            print("[PriceBookStore] Failed to update item \(item.id) in Firestore.")
        }
    }
    
    public func deletePriceBookItem(_ item: PriceBookItem) async {
        allItems.removeAll { $0.id == item.id }
        buildGroupIndexes()
        
        
        
        let success = await FirestoreClient.shared.deletePriceBookItem(item: item, mode: currentDatabaseMode)
        if !success {
            print("[PriceBookStore] Failed to delete item \(item.id) from Firestore.")
        }
    }
    
    public var topLevelCategories: [PriceBookCategoryNode] {
        if cachedTopLevelCategories.isEmpty {
            cachedTopLevelCategories = Self.buildCategoryTree(items: allItems)
        }
        return cachedTopLevelCategories
    }
    
    public func categoryTree(for group: DispatchGroupCategory) -> [PriceBookCategoryNode] {
        indexedCategoryTrees[group] ?? topLevelCategories
    }
    
    public func items(for group: DispatchGroupCategory) -> [PriceBookItem] {
        indexedItemsByGroup[group] ?? allItems
    }
    
    private func buildGroupIndexes() {
        let fullTree = Self.buildCategoryTree(items: allItems)
        cachedTopLevelCategories = fullTree
        
        // Filter items by category / dispatch group
        let hvacItems = allItems.filter { item in
            item.categoryPaths.contains { path in
                let lower = path.lowercased()
                return lower.contains("hvac") || lower.contains("air handler") || lower.contains("condens") || lower.contains("heat pump")
            }
        }
        
        let installerItems = allItems.filter { item in
            item.categoryPaths.contains { path in
                let lower = path.lowercased()
                return lower.contains("install") || lower.contains("equipment")
            }
        }
        
        let applianceItems = allItems.filter { item in
            item.categoryPaths.contains { path in
                let lower = path.lowercased()
                return lower.contains("appliance") || lower.contains("parts") || lower.contains("repair")
            }
        }
        
        // Pre-build category trees for each group
        indexedItemsByGroup[.hvacTechs] = hvacItems.isEmpty ? allItems : hvacItems
        indexedCategoryTrees[.hvacTechs] = Self.buildCategoryTree(items: indexedItemsByGroup[.hvacTechs]!)
        
        indexedItemsByGroup[.installer] = installerItems.isEmpty ? allItems : installerItems
        indexedCategoryTrees[.installer] = Self.buildCategoryTree(items: indexedItemsByGroup[.installer]!)
        
        indexedItemsByGroup[.applianceTechs] = applianceItems.isEmpty ? allItems : applianceItems
        indexedCategoryTrees[.applianceTechs] = Self.buildCategoryTree(items: indexedItemsByGroup[.applianceTechs]!)
        
        indexedItemsByGroup[.officeStaff] = allItems
        indexedCategoryTrees[.officeStaff] = fullTree
    }
    
    public var quickBooksAccounts: [(account: String, items: [PriceBookItem])] {
        let grouped = Dictionary(grouping: allItems, by: { $0.incomeAccount })
        return grouped.keys.sorted().map { ($0, grouped[$0]!.sorted(by: { $0.name < $1.name })) }
    }
    
    public func search(query: String) -> [PriceBookItem] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return allItems }
        return allItems.filter { item in
            item.name.lowercased().contains(q) ||
            (item.productNumber?.lowercased().contains(q) ?? false) ||
            item.incomeAccount.lowercased().contains(q) ||
            item.categoryPaths.contains { $0.lowercased().contains(q) }
        }
    }
    
    public static func buildCategoryTree(items: [PriceBookItem]) -> [PriceBookCategoryNode] {
        let root = MutablePriceBookNode(name: "", fullPath: "")
        
        for item in items {
            for path in item.categoryPaths {
                let components = path.split(separator: ">").map { $0.trimmingCharacters(in: .whitespaces) }
                var current = root
                var currentPath = ""
                for (idx, comp) in components.enumerated() {
                    currentPath = currentPath.isEmpty ? comp : "\(currentPath) > \(comp)"
                    if current.children[comp] == nil {
                        current.children[comp] = MutablePriceBookNode(name: comp, fullPath: currentPath)
                    }
                    current = current.children[comp]!
                    if idx == components.count - 1 {
                        if !current.items.contains(where: { $0.id == item.id }) {
                            current.items.append(item)
                        }
                    }
                }
            }
        }
        
        return root.children.values.sorted(by: { $0.name < $1.name }).map { $0.toImmutable() }
    }
    
    public static let sampleItems: [PriceBookItem] = [
        PriceBookItem(
            id: "pb_1",
            name: "1.5 Ton American Standard Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_2",
            name: "1.5 Ton American Standard Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_3",
            name: "1.5 Ton Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_4",
            name: "1.5 Ton Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_5",
            name: "1.5 Ton Front Draw Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_6",
            name: "1.5 Ton Front Draw Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_7",
            name: "1.5 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_8",
            name: "1.5 Ton HP American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_9",
            name: "1.5 Ton HP Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_10",
            name: "1.5 Ton HP Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_11",
            name: "1.5 Ton HP WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_12",
            name: "1.5 Ton HP WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_13",
            name: "1.5 Ton SC American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_14",
            name: "1.5 Ton SC American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_15",
            name: "1.5 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_16",
            name: "1.5 Ton SC Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_17",
            name: "1.5 Ton SC WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_18",
            name: "1.5 Ton SC WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_19",
            name: "1.5 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "HW Air Handler/Furnace",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_20",
            name: "1.5 Ton WeatherMaker Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_21",
            name: "2 Ton American Standard Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_22",
            name: "2 Ton American Standard Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_23",
            name: "2 Ton Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_24",
            name: "2 Ton Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_25",
            name: "2 Ton Front Draw Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_26",
            name: "2 Ton Front Draw Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_27",
            name: "2 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_28",
            name: "2 Ton HP American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_29",
            name: "2 Ton HP Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_30",
            name: "2 Ton HP Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_31",
            name: "2 Ton HP WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_32",
            name: "2 Ton HP WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_33",
            name: "2 Ton SC American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_34",
            name: "2 Ton SC American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_35",
            name: "2 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_36",
            name: "2 Ton SC Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_37",
            name: "2 Ton SC WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_38",
            name: "2 Ton SC WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_39",
            name: "2 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_40",
            name: "2 Ton WeatherMaker Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_41",
            name: "2.5 Ton American Standard Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_42",
            name: "2.5 Ton American Standard Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_43",
            name: "2.5 Ton Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_44",
            name: "2.5 Ton Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_45",
            name: "2.5 Ton Front Draw Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_46",
            name: "2.5 Ton Front Draw Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_47",
            name: "2.5 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_48",
            name: "2.5 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_49",
            name: "2.5 Ton HP Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_50",
            name: "2.5 Ton HP Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_51",
            name: "2.5 Ton HP WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_52",
            name: "2.5 Ton HP WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_53",
            name: "2.5 Ton SC American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_54",
            name: "2.5 Ton SC American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_55",
            name: "2.5 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_56",
            name: "2.5 Ton SC Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_57",
            name: "2.5 Ton SC WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_58",
            name: "2.5 Ton SC WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_59",
            name: "2.5 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_60",
            name: "2.5 Ton WeatherMaker Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_61",
            name: "2nd Visit Preventative Maintenance 2 System/Residential",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_62",
            name: "2nd Visit Preventative Maintenance 3 System/Residential",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_63",
            name: "2nd Visit Preventative Maintenance 4 System/Residential",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_64",
            name: "2nd Visit Preventive Maintenance/Residential",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_65",
            name: "3 Ton American Standard Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_66",
            name: "3 Ton American Standard Air Handler",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_67",
            name: "3 Ton Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_68",
            name: "3 Ton Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_69",
            name: "3 Ton Front Draw Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_70",
            name: "3 Ton Front Draw Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_71",
            name: "3 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_72",
            name: "3 Ton HP American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_73",
            name: "3 Ton HP Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_74",
            name: "3 Ton HP Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_75",
            name: "3 Ton HP WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_76",
            name: "3 Ton HP WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_77",
            name: "3 Ton SC American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_78",
            name: "3 Ton SC American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_79",
            name: "3 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_80",
            name: "3 Ton SC Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_81",
            name: "3 Ton SC WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_82",
            name: "3 Ton SC WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_83",
            name: "3 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_84",
            name: "3 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_85",
            name: "3.5 Ton American Standard Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_86",
            name: "3.5 Ton American Standard Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_87",
            name: "3.5 Ton Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_88",
            name: "3.5 Ton Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_89",
            name: "3.5 Ton Front Draw Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_90",
            name: "3.5 Ton Front Draw Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_91",
            name: "3.5 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_92",
            name: "3.5 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_93",
            name: "3.5 Ton HP Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_94",
            name: "3.5 Ton HP Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_95",
            name: "3.5 Ton HP WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_96",
            name: "3.5 Ton HP WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_97",
            name: "3.5 Ton SC American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_98",
            name: "3.5 Ton SC American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_99",
            name: "3.5 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_100",
            name: "3.5 Ton SC Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_101",
            name: "3.5 Ton SC WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_102",
            name: "3.5 Ton SC WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_103",
            name: "3.5 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_104",
            name: "3.5 Ton WeatherMaker Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_105",
            name: "4 Ton American Standard Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_106",
            name: "4 Ton American Standard Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_107",
            name: "4 Ton Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_108",
            name: "4 Ton Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_109",
            name: "4 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_110",
            name: "4 Ton HP American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_111",
            name: "4 Ton HP Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_112",
            name: "4 Ton HP Carrier Coastal Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_113",
            name: "4 Ton HP WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_114",
            name: "4 Ton HP WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_115",
            name: "4 Ton SC American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_116",
            name: "4 Ton SC American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_117",
            name: "4 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_118",
            name: "4 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_119",
            name: "4 Ton SC WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_120",
            name: "4 Ton SC WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_121",
            name: "4 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_122",
            name: "4 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_123",
            name: "5 KW HEATER",
            productNumber: "FF-8501N05",
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton > Heat Kits"]
        ),
        PriceBookItem(
            id: "pb_124",
            name: "5 Ton American Standard Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_125",
            name: "5 Ton American Standard Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_126",
            name: "5 Ton Carrier Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_127",
            name: "5 Ton Carrier Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_128",
            name: "5 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_129",
            name: "5 Ton HP American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_130",
            name: "5 Ton HP Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_131",
            name: "5 Ton HP Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_132",
            name: "5 Ton HP WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_133",
            name: "5 Ton HP WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_134",
            name: "5 Ton SC American Standard Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_135",
            name: "5 Ton SC American Standard Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_136",
            name: "5 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_137",
            name: "5 Ton SC Carrier Coastal Condensing Unit",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_138",
            name: "5 Ton SC WeatherMaker Condensing Unit",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_139",
            name: "5 Ton SC WeatherMaker Condensing Unit Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_140",
            name: "5 Ton WeatherMaker Air Handler",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC Residential Installs > Equipment Residential 1.5-5 Ton"]
        ),
        PriceBookItem(
            id: "pb_141",
            name: "5 Ton WeatherMaker Air Handler Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Equipment"]
        ),
        PriceBookItem(
            id: "pb_142",
            name: "Acid Away",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 110.0,
            maintenancePlanPrice: 110.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_143",
            name: "AHS Brazing 50$ - 100$",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 50.0,
            maintenancePlanPrice: 50.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_144",
            name: "AHS Condenser motor flat rate (truck stock motor)",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 325.0,
            maintenancePlanPrice: 325.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_145",
            name: "AHS Crane Service",
            productNumber: nil,
            incomeAccount: "Installs",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 900.0,
            maintenancePlanPrice: 900.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_146",
            name: "AHS Dye Injection (added to leak search)",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 110.0,
            maintenancePlanPrice: 110.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_147",
            name: "AHS Hourly Rate",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 85.0,
            maintenancePlanPrice: 85.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_148",
            name: "AHS ISO Test",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 560.0,
            maintenancePlanPrice: 560.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_149",
            name: "AHS Leak Search (Electronic)",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 150.0,
            maintenancePlanPrice: 85.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_150",
            name: "AHS Recall Service",
            productNumber: nil,
            incomeAccount: "Home Warranty Discount",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_151",
            name: "AHS Return Labor",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_152",
            name: "AHS Service Call",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 85.0,
            maintenancePlanPrice: 85.0,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield"]
        ),
        PriceBookItem(
            id: "pb_153",
            name: "Air Handler Blower Motor Replacement Service",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_154",
            name: "Air Handler Blower Motor Replacement Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_155",
            name: "Air Handler Install Service",
            productNumber: nil,
            incomeAccount: "Air Handler COD/Resort",
            isTaxable: false,
            laborHours: 4.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_156",
            name: "Air Handler Install Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_157",
            name: "Algae Strip Pad OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 50.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_158",
            name: "Algae Strip Pad Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 50.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_159",
            name: "Algae Strip Pad Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 50.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_160",
            name: "App  Res Service Call",
            productNumber: nil,
            incomeAccount: "AP service calls",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 90.0,
            maintenancePlanPrice: 90.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_161",
            name: "App Comm  Recall",
            productNumber: nil,
            incomeAccount: "Commercial APP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_162",
            name: "App Comm After Hours Labor",
            productNumber: nil,
            incomeAccount: "Commercial APP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 110.0,
            maintenancePlanPrice: 110.0,
            categoryPaths: ["Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_163",
            name: "App Comm After hours Service Call",
            productNumber: nil,
            incomeAccount: "Comercial APP Service Call",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 140.0,
            maintenancePlanPrice: 140.0,
            categoryPaths: ["Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_164",
            name: "App Comm Appliance installation",
            productNumber: nil,
            incomeAccount: "Comm APP Installation",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_165",
            name: "App Comm Labor",
            productNumber: nil,
            incomeAccount: "Commercial APP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 95.0,
            maintenancePlanPrice: 95.0,
            categoryPaths: ["Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_166",
            name: "APP Comm Misc Parts",
            productNumber: nil,
            incomeAccount: "Comm Materials",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_167",
            name: "App Comm Service Call",
            productNumber: nil,
            incomeAccount: "Comercial APP Service Call",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 115.0,
            maintenancePlanPrice: 115.0,
            categoryPaths: ["Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_168",
            name: "App HW Install",
            productNumber: nil,
            incomeAccount: "AP Installs",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_169",
            name: "App HW Recall",
            productNumber: nil,
            incomeAccount: "AP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_170",
            name: "App Labor HW",
            productNumber: nil,
            incomeAccount: "AP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 85.0,
            maintenancePlanPrice: 85.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_171",
            name: "App Misc Parts",
            productNumber: nil,
            incomeAccount: "AP Materials",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_172",
            name: "App Res After hours Labor",
            productNumber: nil,
            incomeAccount: "AP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 110.0,
            maintenancePlanPrice: 110.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_173",
            name: "App Res After hours SC/Diagnosis",
            productNumber: nil,
            incomeAccount: "AP service calls",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 140.0,
            maintenancePlanPrice: 140.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_174",
            name: "App Res Flat Rate",
            productNumber: nil,
            incomeAccount: "AP Materials",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_175",
            name: "App Res Installation",
            productNumber: nil,
            incomeAccount: "AP Installs",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 175.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_176",
            name: "App Res Labor",
            productNumber: nil,
            incomeAccount: "AP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 95.0,
            maintenancePlanPrice: 95.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_177",
            name: "App Res Recall",
            productNumber: nil,
            incomeAccount: "AP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_178",
            name: "App SC - HW",
            productNumber: nil,
            incomeAccount: "AP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 85.0,
            maintenancePlanPrice: 85.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_179",
            name: "Attic Access Fee",
            productNumber: nil,
            incomeAccount: "Installs",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC > Additional Install Fees"]
        ),
        PriceBookItem(
            id: "pb_180",
            name: "Blower Motor Replacement",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_181",
            name: "Blower Wheel Cleaning OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 200.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_182",
            name: "Blower Wheel Cleaning Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 90.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_183",
            name: "Blower Wheel Cleaning Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 160.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_184",
            name: "Blue Tube UV Light Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 525.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_185",
            name: "COD After Hours Labor",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 125.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > COD"]
        ),
        PriceBookItem(
            id: "pb_186",
            name: "COD After Hours Service Call",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 105.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > COD"]
        ),
        PriceBookItem(
            id: "pb_187",
            name: "COD Recall Service",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > COD"]
        ),
        PriceBookItem(
            id: "pb_188",
            name: "COD Regular Hours Labor",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 105.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > COD"]
        ),
        PriceBookItem(
            id: "pb_189",
            name: "COD Regular Hours Service Call",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 85.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > COD"]
        ),
        PriceBookItem(
            id: "pb_190",
            name: "COD Return Labor",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 105.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > COD"]
        ),
        PriceBookItem(
            id: "pb_191",
            name: "Commercial App Flat Rate",
            productNumber: nil,
            incomeAccount: "Commercial APP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_192",
            name: "Commercial HVAC Install",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_193",
            name: "Commercial Install Labor",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_194",
            name: "Commercial Leak Search",
            productNumber: nil,
            incomeAccount: "Example Account",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_195",
            name: "Commercial Maintenance Cleaning",
            productNumber: nil,
            incomeAccount: "HVAC Labor - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_196",
            name: "Commercial Part Replacement",
            productNumber: nil,
            incomeAccount: "HVAC Misc parts - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_197",
            name: "Commercial Preventative Maintenance 250",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 250.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_198",
            name: "Commercial Recall Service",
            productNumber: nil,
            incomeAccount: "HVAC Service Call - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Commercial"]
        ),
        PriceBookItem(
            id: "pb_199",
            name: "Commercial Return Labor",
            productNumber: nil,
            incomeAccount: "HVAC Labor - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Commercial"]
        ),
        PriceBookItem(
            id: "pb_200",
            name: "Commercial Service Call",
            productNumber: nil,
            incomeAccount: "HVAC Service Call - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 120.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Commercial"]
        ),
        PriceBookItem(
            id: "pb_201",
            name: "Commercial Service Call Labor",
            productNumber: nil,
            incomeAccount: "HVAC Labor - Commercial",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 120.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Commercial"]
        ),
        PriceBookItem(
            id: "pb_202",
            name: "Commercial Service Fee",
            productNumber: nil,
            incomeAccount: "HVAC Service Call - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_203",
            name: "Commercial System Replacement",
            productNumber: nil,
            incomeAccount: "Example Account",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_204",
            name: "Complex Install",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC > Additional Install Fees"]
        ),
        PriceBookItem(
            id: "pb_205",
            name: "Compressor Replacement Service",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_206",
            name: "Compressor Replacement Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Misc parts - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_207",
            name: "CONDENSATE PUMP Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 550.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_208",
            name: "CONDENSER COIL CLEANING OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 180.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_209",
            name: "CONDENSER COIL CLEANING Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 100.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_210",
            name: "CONDENSER COIL CLEANING Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 140.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_211",
            name: "Condenser Coil Replacement Service",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_212",
            name: "Condenser Coil Replacement Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Misc parts - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_213",
            name: "Condenser Fan Motor Replacement Service",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_214",
            name: "Condenser Fan Motor Replacement Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Misc parts - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_215",
            name: "Condenser Install Service",
            productNumber: nil,
            incomeAccount: "COD/Resort Condensor",
            isTaxable: false,
            laborHours: 4.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_216",
            name: "Condenser Install Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_217",
            name: "Condenser Performance Package OT",
            productNumber: nil,
            incomeAccount: "General",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 477.0,
            maintenancePlanPrice: 477.0,
            categoryPaths: ["HVAC"]
        ),
        PriceBookItem(
            id: "pb_218",
            name: "Condenser Performance Package Regular",
            productNumber: nil,
            incomeAccount: "General",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 436.0,
            maintenancePlanPrice: 436.0,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_219",
            name: "Contactor",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 55.0,
            maintenancePlanPrice: 55.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_220",
            name: "Contactor OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 239.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_221",
            name: "Contactor Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 119.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_222",
            name: "Contactor Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 198.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_223",
            name: "Crane Service",
            productNumber: nil,
            incomeAccount: "Installs",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 900.0,
            maintenancePlanPrice: 900.0,
            categoryPaths: ["HVAC > Additional Install Fees"]
        ),
        PriceBookItem(
            id: "pb_224",
            name: "Disconnect Box",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 110.0,
            maintenancePlanPrice: 110.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_225",
            name: "Disconnect Box OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 258.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_226",
            name: "Disconnect Box Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 130.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_227",
            name: "Disconnect Box Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 218.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_228",
            name: "DRAIN CLEANING OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 170.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_229",
            name: "DRAIN CLEANING Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 115.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_230",
            name: "DRAIN CLEANING Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 135.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_231",
            name: "Drain Pan Float Switch OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 239.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_232",
            name: "Drain Pan Float Switch Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 119.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_233",
            name: "Drain Pan Float Switch Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 199.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_234",
            name: "Drain Safety Switch OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 255.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_235",
            name: "Drain Safety Switch Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 135.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_236",
            name: "Drain Safety Switch Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 215.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_237",
            name: "Dual Capacitor",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 80.0,
            maintenancePlanPrice: 80.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_238",
            name: "Dual Capacitor OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 239.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_239",
            name: "Dual Capacitor Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 119.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_240",
            name: "Dual Capacitor Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 198.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_241",
            name: "Dye Kit",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 185.0,
            maintenancePlanPrice: 185.0,
            categoryPaths: ["HVAC > Service"]
        ),
        PriceBookItem(
            id: "pb_242",
            name: "Electrical upgrades.",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC > Additional Install Fees"]
        ),
        PriceBookItem(
            id: "pb_243",
            name: "Electrical Whip",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 120.0,
            maintenancePlanPrice: 120.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_244",
            name: "Electrical Whip OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 258.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_245",
            name: "Electrical Whip Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 130.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_246",
            name: "Electrical Whip Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 218.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_247",
            name: "Evap Clean in Place (norm) OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 180.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_248",
            name: "Evap Clean in Place (norm) Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 90.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_249",
            name: "Evap Clean in Place (norm) Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 160.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_250",
            name: "EVAP Coil Replacement Service",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_251",
            name: "EVAP Coil Replacement Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Misc parts - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_252",
            name: "Evap Pull and Clean (norm) Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 660.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_253",
            name: "Evap Pull and Clean (norm) Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 660.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_254",
            name: "Filter Drier",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 95.0,
            maintenancePlanPrice: 95.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_255",
            name: "FILTER DRIER  OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 395.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_256",
            name: "FILTER DRIER  Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 295.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_257",
            name: "Filter Replacement",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_258",
            name: "Financing Discount",
            productNumber: "6121",
            incomeAccount: "Credit card surcharge",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs"]
        ),
        PriceBookItem(
            id: "pb_259",
            name: "Flat Rate Commercial System Replacement",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_260",
            name: "FREON LEAK SEARCH OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 160.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_261",
            name: "FREON LEAK SEARCH Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 130.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_262",
            name: "FSIM Cleaning",
            productNumber: nil,
            incomeAccount: "AP Labor",
            isTaxable: true,
            laborHours: 2.5,
            standardPrice: 300.0,
            maintenancePlanPrice: 300.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_263",
            name: "Fuel Surcharge",
            productNumber: nil,
            incomeAccount: "Other Income",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 10.0,
            maintenancePlanPrice: 10.0,
            categoryPaths: ["HVAC", "Appliance - Residential", "Appliance -  Commercial"]
        ),
        PriceBookItem(
            id: "pb_264",
            name: "Full System Install Service",
            productNumber: nil,
            incomeAccount: "Complete systems COD/Resort",
            isTaxable: false,
            laborHours: 8.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_265",
            name: "Full System Install Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Installs - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_266",
            name: "GE Smart HG Software Update",
            productNumber: nil,
            incomeAccount: "AP Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_267",
            name: "Goliath Drain Pan",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_268",
            name: "Hard Start",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 110.0,
            maintenancePlanPrice: 110.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_269",
            name: "Hocky Puck Drain Safety OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 278.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_270",
            name: "Hocky Puck Drain Safety Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 158.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_271",
            name: "Hocky Puck Drain Safety Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 238.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_272",
            name: "Honeywell T6 Thermostat",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 195.0,
            maintenancePlanPrice: 195.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_273",
            name: "Hurricane Pad",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_274",
            name: "Hurricane straps",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 150.0,
            maintenancePlanPrice: 150.0,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_275",
            name: "ISOLATION TEST  Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 560.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_276",
            name: "Jones Valve",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 144.0,
            maintenancePlanPrice: 144.0,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_277",
            name: "LOW VOLTAGE SHORT REPAIR OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 169.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_278",
            name: "LOW VOLTAGE SHORT REPAIR Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 133.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_279",
            name: "LOW VOLTAGE SHORT REPAIR Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 156.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_280",
            name: "M099 COD",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 100.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_281",
            name: "M099 Resorts",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 100.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_282",
            name: "Military Discount",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts", "Appliance - Residential"]
        ),
        PriceBookItem(
            id: "pb_283",
            name: "MIN SPLIT CLEANING Reg Primary",
            productNumber: nil,
            incomeAccount: "General",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 450.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_284",
            name: "Mini Split Head Cleaning",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 415.0,
            maintenancePlanPrice: 415.0,
            categoryPaths: ["HVAC"]
        ),
        PriceBookItem(
            id: "pb_285",
            name: "Misc HVAC Part",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_286",
            name: "MISC WIRE REPAIR OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 135.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_287",
            name: "MISC WIRE REPAIR Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 100.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_288",
            name: "MISC WIRE REPAIR Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 115.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_289",
            name: "Old Republic  Labor",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 85.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic"]
        ),
        PriceBookItem(
            id: "pb_290",
            name: "Old Republic Condenser motor flat rate (truck stock motor)",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 325.0,
            maintenancePlanPrice: 325.0,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic"]
        ),
        PriceBookItem(
            id: "pb_291",
            name: "Old Republic Crane Service",
            productNumber: nil,
            incomeAccount: "Installs",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 900.0,
            maintenancePlanPrice: 900.0,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic"]
        ),
        PriceBookItem(
            id: "pb_292",
            name: "Old Republic Hourly Rate",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 85.0,
            maintenancePlanPrice: 85.0,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic"]
        ),
        PriceBookItem(
            id: "pb_293",
            name: "Old Republic ISO Test",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 560.0,
            maintenancePlanPrice: 560.0,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic"]
        ),
        PriceBookItem(
            id: "pb_294",
            name: "Old Republic Leak Search",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: true,
            laborHours: 1.0,
            standardPrice: 185.0,
            maintenancePlanPrice: 185.0,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic"]
        ),
        PriceBookItem(
            id: "pb_295",
            name: "Old Republic Recall Service",
            productNumber: nil,
            incomeAccount: "Home Warranty Discount",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic"]
        ),
        PriceBookItem(
            id: "pb_296",
            name: "Old Republic Service Call",
            productNumber: nil,
            incomeAccount: "HVAC Warrenty Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 85.0,
            maintenancePlanPrice: 85.0,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic"]
        ),
        PriceBookItem(
            id: "pb_297",
            name: "Preventative Maintenance 1 system/Residential",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 140.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_298",
            name: "Preventative Maintenance 2 System/Residential",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 210.0,
            maintenancePlanPrice: 210.0,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_299",
            name: "Preventative Maintenance 3 System/Residential",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 280.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_300",
            name: "Preventative Maintenance 4 System/Residential",
            productNumber: nil,
            incomeAccount: "HVAC Preventative Maintenance",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 350.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Preventative Maintenance"]
        ),
        PriceBookItem(
            id: "pb_301",
            name: "R-22",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Commercial"]
        ),
        PriceBookItem(
            id: "pb_302",
            name: "R22 American Home Sheild",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 10.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield", "HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_303",
            name: "R22 Old Republic",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 50.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic", "HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_304",
            name: "R32 COD",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 100.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_305",
            name: "R32 Resorts",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 100.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_306",
            name: "R410A American Home Sheild",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 50.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Home Warranty Pricing - Basic > American Home Shield", "HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_307",
            name: "R410A COD",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 90.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_308",
            name: "R410A Old Republic",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 40.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["Home Warranty Pricing - Basic > Old Republic", "HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_309",
            name: "R410A Resorts",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 90.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_310",
            name: "R422D COD",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 125.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_311",
            name: "R422D Resorts",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 125.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_312",
            name: "R454B COD",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 125.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_313",
            name: "R454B Resorts",
            productNumber: nil,
            incomeAccount: "Freon",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 125.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Refrigerants"]
        ),
        PriceBookItem(
            id: "pb_314",
            name: "Re Decking Air Handler Platform",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 500.0,
            maintenancePlanPrice: 500.0,
            categoryPaths: ["HVAC"]
        ),
        PriceBookItem(
            id: "pb_315",
            name: "Reclaim Freon",
            productNumber: nil,
            incomeAccount: "Reclaimed freon",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 100.0,
            maintenancePlanPrice: 100.0,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_316",
            name: "REME HALO",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 925.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_317",
            name: "Removal and Disposal of old unit.",
            productNumber: nil,
            incomeAccount: "Installs",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC > Additional Install Fees"]
        ),
        PriceBookItem(
            id: "pb_318",
            name: "Resort After Hours Labor",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 100.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Resort"]
        ),
        PriceBookItem(
            id: "pb_319",
            name: "Resort After Hours Service Call",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 90.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Resort"]
        ),
        PriceBookItem(
            id: "pb_320",
            name: "Resort Recall Service",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Resort"]
        ),
        PriceBookItem(
            id: "pb_321",
            name: "Resort Regular Hours Labor",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 90.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Resort"]
        ),
        PriceBookItem(
            id: "pb_322",
            name: "Resort Regular Hours Service Call",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 75.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Resort"]
        ),
        PriceBookItem(
            id: "pb_323",
            name: "Resort Return Labor",
            productNumber: nil,
            incomeAccount: "HVAC Labor",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 90.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["COD and Resorts > Resort"]
        ),
        PriceBookItem(
            id: "pb_324",
            name: "Roof Access Fee",
            productNumber: nil,
            incomeAccount: "Installs",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 0.0,
            maintenancePlanPrice: 0.0,
            categoryPaths: ["HVAC > Additional Install Fees"]
        ),
        PriceBookItem(
            id: "pb_325",
            name: "Single Capacitor OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 239.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_326",
            name: "Single Capacitor Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 119.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_327",
            name: "Single Capacitor Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 198.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_328",
            name: "Single Capacitor.",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 40.0,
            maintenancePlanPrice: 40.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_329",
            name: "Start Assist OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 239.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_330",
            name: "Start Assist Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 119.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_331",
            name: "Start Assist Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 198.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_332",
            name: "Surge Protector",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: true,
            laborHours: 0.0,
            standardPrice: 252.0,
            maintenancePlanPrice: 252.0,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_333",
            name: "Tamper Resistant Locking Cap",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 15.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_334",
            name: "Transformer",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 80.0,
            maintenancePlanPrice: 80.0,
            categoryPaths: ["Home Warranty Pricing - Basic > HW Parts only"]
        ),
        PriceBookItem(
            id: "pb_335",
            name: "Transformer OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 249.75,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_336",
            name: "Transformer Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 129.75,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_337",
            name: "Transformer Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 209.75,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_338",
            name: "tstat NON WIFI OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 315.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_339",
            name: "tstat NON WIFI Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 195.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_340",
            name: "tstat NON WIFI Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 275.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_341",
            name: "TXV (Thermal Expansion Valve) Replacement Service",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Residential Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_342",
            name: "TXV (Thermal Expansion Valve) Replacement Service Commercial",
            productNumber: nil,
            incomeAccount: "HVAC Misc parts - Commercial",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 0.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC Commercial Installs > Install Services"]
        ),
        PriceBookItem(
            id: "pb_343",
            name: "Warranty Fee",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 100.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Additional Install Fees"]
        ),
        PriceBookItem(
            id: "pb_344",
            name: "welding fee",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 1.0,
            standardPrice: 200.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_345",
            name: "WIFI TSTAT OT Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 410.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_346",
            name: "WIFI TSTAT Reg Additional",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 280.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
        PriceBookItem(
            id: "pb_347",
            name: "WIFI TSTAT Reg Primary",
            productNumber: nil,
            incomeAccount: "HVAC Misc Parts",
            isTaxable: false,
            laborHours: 0.0,
            standardPrice: 350.0,
            maintenancePlanPrice: nil,
            categoryPaths: ["HVAC > Parts"]
        ),
    ]
}
