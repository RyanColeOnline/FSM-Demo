// Pure Price Book Data Models
import Foundation

public struct PriceBookItem: Identifiable, Codable, Sendable, Equatable, Hashable {
    public var id: String
    public var name: String
    public var productNumber: String?
    public var incomeAccount: String
    public var isTaxable: Bool
    public var laborHours: Double
    public var standardPrice: Double
    public var maintenancePlanPrice: Double?
    public var description: String?
    public var categoryPaths: [String]
    
    public var formattedDualPrice: String {
        let std = String(format: "$%.2f", standardPrice)
        let maint = String(format: "$%.2f", maintenancePlanPrice ?? standardPrice)
        return "\(std) | \(maint)"
    }
    
    public var formattedStandardPrice: String {
        return String(format: "$%.2f", standardPrice)
    }
    
    public var formattedMaintenancePrice: String {
        return String(format: "$%.2f", maintenancePlanPrice ?? standardPrice)
    }
    
    public var formattedLaborHours: String {
        if laborHours <= 0.0 {
            return "0 hrs"
        }
        return String(format: "%.1f hrs", laborHours)
    }
    
    public init(
        id: String,
        name: String,
        productNumber: String? = nil,
        description: String? = nil,
        incomeAccount: String,
        isTaxable: Bool,
        laborHours: Double,
        standardPrice: Double,
        maintenancePlanPrice: Double? = nil,
        categoryPaths: [String]
    ) {
        self.id = id
        self.name = name
        self.productNumber = productNumber
        self.description = description
        self.incomeAccount = incomeAccount
        self.isTaxable = isTaxable
        self.laborHours = laborHours
        self.standardPrice = standardPrice
        self.maintenancePlanPrice = maintenancePlanPrice
        self.categoryPaths = categoryPaths
    }
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, incomeAccount, isTaxable, laborHours, categoryPaths
        case productNumber, sku
        case standardPrice, sellingPrice
        case maintenancePlanPrice, maintPlanPrice
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = (try? container.decode(String.self, forKey: .id)) ?? UUID().uuidString
        self.name = (try? container.decode(String.self, forKey: .name)) ?? ""
        self.productNumber = (try? container.decodeIfPresent(String.self, forKey: .productNumber)) ?? (try? container.decodeIfPresent(String.self, forKey: .sku))
        self.description = try? container.decodeIfPresent(String.self, forKey: .description)
        self.incomeAccount = (try? container.decode(String.self, forKey: .incomeAccount)) ?? "Services"
        self.isTaxable = (try? container.decodeIfPresent(Bool.self, forKey: .isTaxable)) ?? true
        self.laborHours = (try? container.decodeIfPresent(Double.self, forKey: .laborHours)) ?? 0.0
        self.standardPrice = (try? container.decodeIfPresent(Double.self, forKey: .standardPrice)) ?? (try? container.decodeIfPresent(Double.self, forKey: .sellingPrice)) ?? 0.0
        self.maintenancePlanPrice = (try? container.decodeIfPresent(Double.self, forKey: .maintenancePlanPrice)) ?? (try? container.decodeIfPresent(Double.self, forKey: .maintPlanPrice))
        self.categoryPaths = (try? container.decodeIfPresent([String].self, forKey: .categoryPaths)) ?? []
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(productNumber, forKey: .productNumber)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encode(incomeAccount, forKey: .incomeAccount)
        try container.encode(isTaxable, forKey: .isTaxable)
        try container.encode(laborHours, forKey: .laborHours)
        try container.encode(standardPrice, forKey: .standardPrice)
        try container.encodeIfPresent(maintenancePlanPrice, forKey: .maintenancePlanPrice)
        try container.encode(categoryPaths, forKey: .categoryPaths)
    }
}

public struct PriceBookCategoryNode: Identifiable, Sendable {
    public var id: String { fullPath }
    public var name: String
    public var fullPath: String
    public var subcategories: [PriceBookCategoryNode]
    public var items: [PriceBookItem]
    
    public var totalItemCount: Int {
        var count = items.count
        for sub in subcategories {
            count += sub.totalItemCount
        }
        return count
    }
    
    public init(
        name: String,
        fullPath: String,
        subcategories: [PriceBookCategoryNode] = [],
        items: [PriceBookItem] = []
    ) {
        self.name = name
        self.fullPath = fullPath
        self.subcategories = subcategories
        self.items = items
    }
}
