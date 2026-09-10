import Foundation
import Observation
public struct FlagNoteEntry: Identifiable, Hashable, Sendable, Codable {
    public var id = UUID()
    public var author: String
    public var text: String
    public var timestamp: Date
    
    public init(id: UUID = UUID(), author: String, text: String, timestamp: Date = Date()) {
        self.id = id
        self.author = author
        self.text = text
        self.timestamp = timestamp
    }
}

public struct FollowUpFlag: Identifiable, Hashable, Sendable, Codable {
    public var id: UUID
    public var jobId: UUID?
    public var jobNumber: Int
    public var customerId: UUID?
    public var customerName: String
    public var followUpType: String // "Part Quote", "Proposal Approval", "Customer Callback", "Warranty Claim", "Return Visit"
    public var reason: String
    public var assignedTo: String
    public var dueDate: Date
    public var isComplete: Bool
    public var completedAt: Date?
    public var notes: [FlagNoteEntry]
    
    public init(
        id: UUID = UUID(),
        jobId: UUID? = nil,
        jobNumber: Int = 140019,
        customerId: UUID? = nil,
        customerName: String = "Evan Williams",
        followUpType: String = "Part Quote",
        reason: String = "Need part quote for blower motor.",
        assignedTo: String = "Justin Lung",
        dueDate: Date = Date().addingTimeInterval(86400 * 2),
        isComplete: Bool = false,
        completedAt: Date? = nil,
        notes: [FlagNoteEntry] = []
    ) {
        self.id = id
        self.jobId = jobId
        self.jobNumber = jobNumber
        self.customerId = customerId
        self.customerName = customerName
        self.followUpType = followUpType
        self.reason = reason
        self.assignedTo = assignedTo
        self.dueDate = dueDate
        self.isComplete = isComplete
        self.completedAt = completedAt
        self.notes = notes
    }
}
