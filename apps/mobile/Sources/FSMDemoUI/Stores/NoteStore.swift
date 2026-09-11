import Foundation
import Observation
@Observable
@MainActor
public final class NoteStore {
    public static let shared = NoteStore()
    
    public private(set) var notes: [NoteItem] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.notes = []
        Task { @MainActor in
            await self.fetchNotes()
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
        self.notes = []
        Task { @MainActor in
            await self.fetchNotes()
        }
    }
    
    public func fetchNotes(customerId: UUID? = nil, jobId: UUID? = nil) async {
        let mode = currentDatabaseMode
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let docs = await FirestoreClient.shared.fetchNotes(customerId: customerId, jobId: jobId, mode: mode)
        if customerId == nil && jobId == nil {
            self.notes = docs
        } else {
            for doc in docs {
                if let idx = self.notes.firstIndex(where: { $0.id == doc.id }) {
                    self.notes[idx] = doc
                } else {
                    self.notes.append(doc)
                }
            }
        }
    }
    
    public func notes(for customer: Customer) -> [NoteItem] {
        return notes.filter { $0.customerId == customer.id }
    }
    
    public func saveNote(_ note: NoteItem) async {
        if let idx = notes.firstIndex(where: { $0.id == note.id }) {
            notes[idx] = note
        } else {
            notes.insert(note, at: 0)
        }
        
        _ = await FirestoreClient.shared.saveNote(note: note, mode: currentDatabaseMode)
    }
    
    public func deleteNote(_ note: NoteItem) async {
        notes.removeAll { $0.id == note.id }
        _ = await FirestoreClient.shared.deleteNote(note: note, mode: currentDatabaseMode)
    }
}
