import Foundation
import Observation
@Observable
@MainActor
public final class FollowUpStore {
    public static let shared = FollowUpStore()
    
    public private(set) var followUps: [FollowUpFlag] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    public init() {
        self.followUps = []
        Task { @MainActor in
            await self.fetchFollowUps()
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
        self.followUps = []
        Task { @MainActor in
            await self.fetchFollowUps()
        }
    }
    
    public func fetchFollowUps(assignedTo: String? = nil) async {
        let mode = currentDatabaseMode
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let docs = await FirestoreClient.shared.fetchFollowUps(assignedTo: assignedTo, mode: mode)
        self.followUps = docs
    }
    
    public func saveFollowUp(_ followUp: FollowUpFlag) async {
        if let idx = followUps.firstIndex(where: { $0.id == followUp.id }) {
            followUps[idx] = followUp
        } else {
            followUps.insert(followUp, at: 0)
        }
        
        _ = await FirestoreClient.shared.saveFollowUp(flag: followUp, mode: currentDatabaseMode)
    }
    
    public func toggleFollowUp(jobNumber: Int, isComplete: Bool) async {
        if let idx = followUps.firstIndex(where: { $0.jobNumber == jobNumber }) {
            followUps[idx].isComplete = isComplete
            let flag = followUps[idx]
            _ = await FirestoreClient.shared.saveFollowUp(flag: flag, mode: currentDatabaseMode)
        }
    }
    
    public func deleteFollowUp(jobNumber: Int) {
        followUps.removeAll(where: { $0.jobNumber == jobNumber })
    }
}
