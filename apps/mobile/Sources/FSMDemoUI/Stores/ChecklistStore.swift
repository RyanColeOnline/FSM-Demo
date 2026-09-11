import Foundation
import Observation
@Observable
@MainActor
public final class ChecklistStore {
    public static let shared = ChecklistStore()
    
    public private(set) var checklistTemplates: [ChecklistTemplateItem] = []
    public private(set) var checklistInstances: [ChecklistInstanceItem] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.checklistTemplates = []
        Task { @MainActor in
            await self.fetchChecklists()
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
        self.checklistTemplates = []
        Task { @MainActor in
            await self.fetchChecklists()
        }
    }
    
    public func fetchChecklists(jobId: UUID? = nil) async {
        let mode = currentDatabaseMode
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let docs = await FirestoreClient.shared.fetchChecklistTemplates(mode: mode)
        self.checklistTemplates = docs
    }
    
    public func instances(for customer: Customer) -> [ChecklistInstanceItem] {
        checklistInstances.filter { $0.customerId == customer.id }
    }
    
    public func saveChecklistInstance(_ instance: ChecklistInstanceItem) async {
        if let idx = checklistInstances.firstIndex(where: { $0.id == instance.id }) {
            checklistInstances[idx] = instance
        } else {
            checklistInstances.insert(instance, at: 0)
        }
        
        _ = await FirestoreClient.shared.saveChecklistInstance(instance: instance, mode: currentDatabaseMode)
    }
}
