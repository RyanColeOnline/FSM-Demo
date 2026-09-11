import Foundation
import Observation
public struct ChecklistStepItem: Identifiable, Equatable, Hashable, Sendable {
    public let id: UUID
    public var question: String
    public var type: StepType
    public var options: [String]
    public var selectedOption: String?
    public var textInput: String
    public var isSkipped: Bool
    
    public enum StepType: Equatable, Hashable, Sendable {
        case selection
        case textInput
    }
    
    public init(id: UUID = UUID(), question: String, type: StepType, options: [String] = [], selectedOption: String? = nil, textInput: String = "", isSkipped: Bool = false) {
        self.id = id
        self.question = question
        self.type = type
        self.options = options
        self.selectedOption = selectedOption
        self.textInput = textInput
        self.isSkipped = isSkipped
    }
}

public struct ChecklistTemplateItem: Identifiable, Equatable, Hashable, Sendable {
    public let id: UUID
    public var title: String
    public var category: String
    public var itemCount: Int
    public var completedCount: Int
    public var steps: [ChecklistStepItem]
    
    public init(id: UUID = UUID(), title: String, category: String = "HVAC", itemCount: Int, completedCount: Int = 0, steps: [ChecklistStepItem] = []) {
        self.id = id
        self.title = title
        self.category = category
        self.itemCount = itemCount
        self.completedCount = completedCount
        self.steps = steps
    }
}

public struct ChecklistInstanceItem: Identifiable, Equatable, Hashable, Sendable {
    public let id: UUID
    public var templateId: UUID
    public var jobId: UUID?
    public var jobNumber: Int?
    public var customerId: UUID
    public var appointmentId: UUID?
    public var title: String
    public var category: String
    public var isCompleted: Bool
    public var completedBy: String
    public var completedAt: Date
    public var steps: [ChecklistStepItem]
    
    public init(
        id: UUID = UUID(),
        templateId: UUID,
        jobId: UUID? = nil,
        jobNumber: Int? = nil,
        customerId: UUID,
        appointmentId: UUID? = nil,
        title: String,
        category: String = "HVAC",
        isCompleted: Bool = false,
        completedBy: String = "",
        completedAt: Date = Date(),
        steps: [ChecklistStepItem] = []
    ) {
        self.id = id
        self.templateId = templateId
        self.jobId = jobId
        self.jobNumber = jobNumber
        self.customerId = customerId
        self.appointmentId = appointmentId
        self.title = title
        self.category = category
        self.isCompleted = isCompleted
        self.completedBy = completedBy
        self.completedAt = completedAt
        self.steps = steps
    }
}
