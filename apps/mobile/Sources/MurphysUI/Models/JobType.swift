import Foundation
import SwiftUI

public enum TripType: String, CaseIterable, Codable, Sendable {
    case diagnostic = "Diagnostic"
    case install = "Install"
    case parts = "Parts"
    case pm = "PM"
    case recall = "Recall"
    case ahs = "AHS"
    case fi = "FI"
    case orSpecial = "O.R."
    
    public var semanticColor: Color {
        switch self {
        case .diagnostic:
            return Color.blue
        case .install:
            return Color.indigo
        case .parts:
            return Color.purple
        case .pm:
            return Color.green
        case .recall:
            return Color.red
        case .ahs, .fi, .orSpecial:
            return Color.orange
        }
    }
    
    public var webHex: String {
        switch self {
        case .diagnostic:
            return "#0088ff"
        case .install:
            return "#6255f5"
        case .parts:
            return "#cb30e0"
        case .pm:
            return "#34c759"
        case .recall:
            return "#FF3B30"
        case .ahs, .fi, .orSpecial:
            return "#ff9500"
        }
    }
    
    public static func from(raw: String?) -> TripType {
        guard let raw = raw, !raw.trimmingCharacters(in: .whitespaces).isEmpty else {
            return .diagnostic
        }
        let lower = raw.lowercased()
        if lower.contains("diag") { return .diagnostic }
        if lower.contains("install") { return .install }
        if lower.contains("part") { return .parts }
        if lower.contains("recall") { return .recall }
        if lower.contains("pm") || lower.contains("preventative") || lower.contains("preventive") || lower.contains("maint") || lower.contains("tune") {
            return .pm
        }
        if lower.contains("ahs") { return .ahs }
        if lower.contains("fi") { return .fi }
        if lower.contains("o.r.") || lower.contains("or") { return .orSpecial }
        return .diagnostic
    }
}

public struct JobTypeItem: Identifiable, Codable, Sendable, Equatable, Hashable {
    public var id: String
    public var name: String
    public var designation: String
    public var category: String
    public var tripType: TripType
    public var isSpecialWarranty: Bool
    
    public var semanticColor: Color {
        tripType.semanticColor
    }
    
    public var webHex: String {
        tripType.webHex
    }
    
    public init(
        id: String = UUID().uuidString,
        name: String,
        designation: String = "",
        category: String = "",
        tripType: TripType? = nil,
        isSpecialWarranty: Bool = false
    ) {
        self.id = id
        self.name = name
        self.designation = designation
        self.category = category
        self.tripType = tripType ?? TripType.from(raw: name)
        self.isSpecialWarranty = isSpecialWarranty
    }
}

public struct JobTypeCategory: Identifiable, Codable, Sendable, Equatable, Hashable {
    public var id: String
    public var name: String
    public var designationCode: String
    public var standardItems: [JobTypeItem]
    public var providerItems: [JobTypeItem]
    
    public var items: [JobTypeItem] {
        standardItems + providerItems
    }
    
    public init(
        id: String = UUID().uuidString,
        name: String,
        designationCode: String = "",
        standardItems: [JobTypeItem],
        providerItems: [JobTypeItem] = []
    ) {
        self.id = id
        self.name = name
        self.designationCode = designationCode
        self.standardItems = standardItems
        self.providerItems = providerItems
    }
}
