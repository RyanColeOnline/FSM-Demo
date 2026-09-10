import Foundation

public struct AccessCode: Codable, Equatable, Hashable, Identifiable, Sendable {
    public let id: UUID
    public var label: String
    public var code: String
    public var isDeleteRevealed: Bool
    
    public init(id: UUID = UUID(), label: String = "Gate Code", code: String = "", isDeleteRevealed: Bool = false) {
        self.id = id
        self.label = label
        self.code = code
        self.isDeleteRevealed = isDeleteRevealed
    }
}
