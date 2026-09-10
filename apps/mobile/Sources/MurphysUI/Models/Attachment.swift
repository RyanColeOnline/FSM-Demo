import Foundation
import Observation
public struct AttachmentItem: Identifiable, Hashable, Sendable, Codable {
    public var id: UUID
    public var filename: String
    public var imageURL: String
    public var customerId: UUID?
    public var jobId: UUID?
    public var jobNumber: Int?
    public var appointmentId: UUID?
    public var category: String
    public var uploadedBy: String
    public var uploadedAt: Date
    public var fileSize: Int
    
    public init(
        id: UUID = UUID(),
        filename: String = "Photo.jpg",
        imageURL: String = "",
        customerId: UUID? = nil,
        jobId: UUID? = nil,
        jobNumber: Int? = nil,
        appointmentId: UUID? = nil,
        category: String = "Diagnostic",
        uploadedBy: String = "Justin Lung",
        uploadedAt: Date = Date(),
        fileSize: Int = 1024 * 512
    ) {
        self.id = id
        self.filename = filename
        self.imageURL = imageURL
        self.customerId = customerId
        self.jobId = jobId
        self.jobNumber = jobNumber
        self.appointmentId = appointmentId
        self.category = category
        self.uploadedBy = uploadedBy
        self.uploadedAt = uploadedAt
        self.fileSize = fileSize
    }
}
