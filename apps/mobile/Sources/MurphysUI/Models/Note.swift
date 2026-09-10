import Foundation
import Observation
public struct NoteItem: Identifiable, Equatable, Sendable, Codable {
    public var id: UUID
    public var author: String
    public var dateStarted: Date
    public var text: String
    public var savedText: String
    public var isEditing: Bool
    public var isNewDraft: Bool
    public var customerId: UUID?
    public var jobId: UUID?
    public var jobNumber: Int?
    public var appointmentId: UUID?
    public var isPinned: Bool
    
    public init(
        id: UUID = UUID(),
        author: String = "Justin Lung",
        dateStarted: Date = Date(),
        text: String = "",
        savedText: String = "",
        isEditing: Bool = false,
        isNewDraft: Bool = true,
        customerId: UUID? = nil,
        jobId: UUID? = nil,
        jobNumber: Int? = nil,
        appointmentId: UUID? = nil,
        isPinned: Bool = false
    ) {
        self.id = id
        self.author = author
        self.dateStarted = dateStarted
        self.text = text
        self.savedText = savedText
        self.isEditing = isEditing
        self.isNewDraft = isNewDraft
        self.customerId = customerId
        self.jobId = jobId
        self.jobNumber = jobNumber
        self.appointmentId = appointmentId
        self.isPinned = isPinned
    }
}
