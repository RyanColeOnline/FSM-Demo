import Foundation
import Observation
@Observable
@MainActor
public final class AttachmentStore {
    public static let shared = AttachmentStore()
    
    public private(set) var attachments: [AttachmentItem] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.attachments = []
        Task { @MainActor in
            await self.fetchAttachments()
        }
        
        NotificationCenter.default.addObserver(
            forName: .databaseModeDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.handleDatabaseModeChanged()
            }
        }
    }
    
    private func handleDatabaseModeChanged() {
        self.attachments = []
        Task { @MainActor in
            await self.fetchAttachments()
        }
    }
    
    public func fetchAttachments(customerId: UUID? = nil, jobId: UUID? = nil) async {
        let mode = currentDatabaseMode
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let docs = await FirestoreClient.shared.fetchAttachments(customerId: customerId, jobId: jobId, mode: mode)
        if customerId == nil && jobId == nil {
            self.attachments = docs
        } else {
            for doc in docs {
                if let idx = self.attachments.firstIndex(where: { $0.id == doc.id }) {
                    self.attachments[idx] = doc
                } else {
                    self.attachments.append(doc)
                }
            }
        }
    }
    
    public func attachments(for customer: Customer) -> [AttachmentItem] {
        return attachments.filter { $0.customerId == customer.id }
    }
    
    public func saveAttachment(_ attachment: AttachmentItem) async {
        if let idx = attachments.firstIndex(where: { $0.id == attachment.id }) {
            attachments[idx] = attachment
        } else {
            attachments.insert(attachment, at: 0)
        }
        
        _ = await FirestoreClient.shared.saveAttachment(attachment: attachment, mode: currentDatabaseMode)
    }
    
    public func deleteAttachment(_ attachment: AttachmentItem) async {
        attachments.removeAll { $0.id == attachment.id }
        _ = await FirestoreClient.shared.deleteAttachment(attachment: attachment, mode: currentDatabaseMode)
    }
}
