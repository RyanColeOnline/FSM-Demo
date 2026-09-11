import Foundation
import Observation
public enum NetworkError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)
    case encodingError(Error)
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The request URL was invalid."
        case .invalidResponse:
            return "Received an invalid response from the server."
        case .httpError(let status):
            return "Server returned an HTTP error: \(status)."
        case .decodingError(let error):
            return "Failed to decode the response: \(error.localizedDescription)"
        case .encodingError(let error):
            return "Failed to encode the request: \(error.localizedDescription)"
        }
    }
}

@Observable
@MainActor
public final class CustomerStore {
    public static let shared = CustomerStore()
    public private(set) var customers: [Customer] = []
    public private(set) var isLoading = false
    public private(set) var error: Error?
    
    public var currentDatabaseMode: DatabaseMode {
        DatabaseMode.current
    }
    
    private let baseURL: URL
    private let session: URLSession
    
    public init(baseURL: URL = URL(string: "https://api.example.com")!, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        
        
            self.customers = []
            Task { @MainActor in
                await self.fetchCustomers()
            }
        
        // Listen for real-time database mode changes
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
        self.customers = []
        self.existingIds.removeAll()
        self.currentOffset = 0
        self.hasMorePages = true
        self.hasFetchedInitial = false
        self.remoteSearchResults = []
        self.isSearching = false
        Task { @MainActor in
            await self.fetchCustomers(forceRefresh: true)
        }
    }
    
    public private(set) var isLoadingMore = false
    public private(set) var hasMorePages = true
    
    private var currentOffset: Int = 0
    private var hasFetchedInitial = false
    private var existingIds = Set<UUID>()
    
    public func fetchCustomers(forceRefresh: Bool = false) async {
        let mode = currentDatabaseMode
        
        if !self.customers.isEmpty && !forceRefresh && hasFetchedInitial {
            return
        }
        
        isLoading = true
        error = nil
        if forceRefresh {
            currentOffset = 0
            hasMorePages = true
            existingIds.removeAll()
            self.customers = []
            self.hasFetchedInitial = false
        }
        
        let (batch, nextOffset) = await FirestoreClient.shared.fetchCustomersPage(mode: mode, pageSize: 300, offset: 0)
        
        var initialList: [Customer] = []
        for c in batch {
            if !existingIds.contains(c.id) {
                existingIds.insert(c.id)
                initialList.append(c)
            }
        }
        
        self.customers = initialList
        self.currentOffset = nextOffset ?? 0
        self.hasMorePages = nextOffset != nil
        self.isLoading = false
        self.hasFetchedInitial = true
    }
    
    public func loadMoreCustomers() async {
        guard !isLoading && !isLoadingMore && hasMorePages else { return }
        
        isLoadingMore = true
        let mode = currentDatabaseMode
        let offsetToFetch = currentOffset
        
        let (batch, nextOffset) = await FirestoreClient.shared.fetchCustomersPage(mode: mode, pageSize: 300, offset: offsetToFetch)
        
        var newItems: [Customer] = []
        for c in batch {
            if !existingIds.contains(c.id) {
                existingIds.insert(c.id)
                newItems.append(c)
            }
        }
        
        if !newItems.isEmpty {
            self.customers.append(contentsOf: newItems)
        }
        
        self.currentOffset = nextOffset ?? offsetToFetch
        self.hasMorePages = nextOffset != nil
        self.isLoadingMore = false
    }
    
    public private(set) var remoteSearchResults: [Customer] = []
    public private(set) var isSearching = false
    private var searchTask: Task<Void, Never>? = nil
    
    public func searchCustomers(query: String) {
        searchTask?.cancel()
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else {
            self.remoteSearchResults = []
            self.isSearching = false
            return
        }
        
        self.isSearching = true
        searchTask = Task { @MainActor in
            // Debounce by 200ms
            try? await Task.sleep(nanoseconds: 200_000_000)
            if Task.isCancelled { return }
            
            let results = await FirestoreClient.shared.searchCustomers(query: trimmed, mode: self.currentDatabaseMode)
            if Task.isCancelled { return }
            
            self.remoteSearchResults = results
            
            // Also merge newly found records into cache
            for c in results {
                if !self.existingIds.contains(c.id) {
                    self.existingIds.insert(c.id)
                    self.customers.append(c)
                }
            }
            self.isSearching = false
        }
    }
    
    public func createCustomer(_ customer: Customer) async {
        if let idx = self.customers.firstIndex(where: { $0.id == customer.id }) {
            self.customers[idx] = customer
        } else {
            self.customers.insert(customer, at: 0)
        }
        
        
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let success = await FirestoreClient.shared.saveCustomer(customer: customer, mode: currentDatabaseMode)
        if !success {
            print("[CustomerStore] Failed to write customer \(customer.id) to Firestore.")
        }
    }
    
    public func updateCustomerLocally(_ customer: Customer) {
        if let index = self.customers.firstIndex(where: { $0.id == customer.id }) {
            self.customers[index] = customer
        } else {
            self.customers.insert(customer, at: 0)
        }
        
        let mode = currentDatabaseMode
        Task {
            await FirestoreClient.shared.saveCustomer(customer: customer, mode: mode)
        }
    }
    
    public func updateCustomer(_ customer: Customer) async {
        updateCustomerLocally(customer)
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let success = await FirestoreClient.shared.saveCustomer(customer: customer, mode: currentDatabaseMode)
        if !success {
            print("[CustomerStore] Failed to update customer \(customer.id) in Firestore.")
        }
    }
    
    public func deleteCustomer(_ customer: Customer) async {
        self.customers.removeAll { $0.id == customer.id }
        
        isLoading = true
        error = nil
        defer { isLoading = false }
        
        let success = await FirestoreClient.shared.deleteCustomer(customer: customer, mode: currentDatabaseMode)
        if !success {
            print("[CustomerStore] Failed to delete customer \(customer.id) in Firestore.")
        }
    }
    
    public func deleteCustomerLocally(_ customer: Customer) {
        self.customers.removeAll { $0.id == customer.id }
        
        let mode = currentDatabaseMode
        Task {
            await FirestoreClient.shared.deleteCustomer(customer: customer, mode: mode)
        }
    }
}
