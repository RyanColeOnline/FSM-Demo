import Foundation

/// Unified Firestore REST client for Darwin & Skip (Android) supporting multi-database routing.
public final class FirestoreClient: Sendable {
    public static let shared = FirestoreClient()
    
    private let projectId: String
    private let session: URLSession
    
    public init(projectId: String = "fsm-demo-266c8", session: URLSession = .shared) {
        self.projectId = projectId
        self.session = session
    }
    
    private var baseDocumentsURL: URL {
        URL(string: "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents")!
    }
    
    private func iso8601String(from date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }
    
    private let firebaseApiKey = "AIzaSyDOt0kKm1wfgqeqBfsCKaUBo5Ps8q_aTvQ"
    
    // MARK: - Authorized Network Operations
    public func executeAuthorizedRequest(_ urlRequest: URLRequest) async throws -> (Data, URLResponse) {
        var req = urlRequest
        if let originalUrl = req.url, var components = URLComponents(url: originalUrl, resolvingAgainstBaseURL: false) {
            var items = components.queryItems ?? []
            if !items.contains(where: { $0.name == "key" }) {
                items.append(URLQueryItem(name: "key", value: firebaseApiKey))
                components.queryItems = items
                req.url = components.url
            }
        }
        if let token = await SessionManager.shared.getValidIdToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await session.data(for: req)
    }
    
    public func executeAuthorizedGet(from url: URL) async throws -> (Data, URLResponse) {
        var req = URLRequest(url: url)
        if var components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            var items = components.queryItems ?? []
            if !items.contains(where: { $0.name == "key" }) {
                items.append(URLQueryItem(name: "key", value: firebaseApiKey))
                components.queryItems = items
                req.url = components.url
            }
        }
        if let token = await SessionManager.shared.getValidIdToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await session.data(for: req)
    }

    // MARK: - Generic REST Operations
    private func writeDocument(collection: String, documentId: String, fields: [String: Any]) async -> Bool {
        let url = baseDocumentsURL.appendingPathComponent("\(collection)/\(documentId)")
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let bodyDict: [String: Any] = ["fields": fields]
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: bodyDict, options: [])
            let (data, response) = try await executeAuthorizedRequest(request)
            guard let httpResponse = response as? HTTPURLResponse else {
                print("[Firestore Write FAILURE - \(collection)]: Error saving \(documentId) -> Invalid HTTP response")
                return false
            }
            guard (200...299).contains(httpResponse.statusCode) else {
                let responseBody = String(data: data, encoding: .utf8) ?? "unknown"
                print("[Firestore Write FAILURE - \(collection)]: Error saving \(documentId) -> HTTP \(httpResponse.statusCode): \(responseBody)")
                return false
            }
            print("[Firestore Write SUCCESS - \(collection)]: Saved document \(documentId)")
            return true
        } catch {
            print("[Firestore Write FAILURE - \(collection)]: Error saving \(documentId) -> \(error.localizedDescription)")
            return false
        }
    }
    
    private func deleteDocument(collection: String, documentId: String) async -> Bool {
        let url = baseDocumentsURL.appendingPathComponent("\(collection)/\(documentId)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        
        do {
            let (data, response) = try await executeAuthorizedRequest(request)
            guard let httpResponse = response as? HTTPURLResponse else {
                print("[Firestore Delete FAILURE - \(collection)]: Error deleting \(documentId) -> Invalid HTTP response")
                return false
            }
            guard (200...299).contains(httpResponse.statusCode) else {
                let responseBody = String(data: data, encoding: .utf8) ?? "unknown"
                print("[Firestore Delete FAILURE - \(collection)]: Error deleting \(documentId) -> HTTP \(httpResponse.statusCode): \(responseBody)")
                return false
            }
            print("[Firestore Delete SUCCESS - \(collection)]: Deleted document \(documentId)")
            return true
        } catch {
            print("[Firestore Delete FAILURE - \(collection)]: Error deleting \(documentId) -> \(error.localizedDescription)")
            return false
        }
    }
    
    // MARK: - Generic Paginated Document Fetcher
    public func fetchAllDocumentData(collection: String, pageSize: Int = 300, maxPages: Int = 50) async -> [Data] {
        var allData: [Data] = []
        var pageToken: String? = nil
        var pageCount = 0
        
        repeat {
            var urlComponents = URLComponents(url: baseDocumentsURL.appendingPathComponent(collection), resolvingAgainstBaseURL: false)
            var queryItems = [URLQueryItem(name: "pageSize", value: "\(pageSize)")]
            if let token = pageToken, !token.isEmpty {
                queryItems.append(URLQueryItem(name: "pageToken", value: token))
            }
            urlComponents?.queryItems = queryItems
            
            guard let url = urlComponents?.url else { break }
            
            do {
                let (data, response) = try await executeAuthorizedGet(from: url)
                guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                    break
                }
                allData.append(data)
                
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let next = json["nextPageToken"] as? String, !next.isEmpty {
                    pageToken = next
                } else {
                    pageToken = nil
                }
                pageCount += 1
            } catch {
                print("[Firestore Read Error - \(collection)]: \(error.localizedDescription)")
                break
            }
        } while pageToken != nil && pageCount < maxPages
        
        return allData
    }
    
    // MARK: - Dispatch Groups
    public func fetchDispatchGroups(mode: DatabaseMode) async -> [String: [String]] {
        
        
        let collection = mode == .sandbox ? "sandbox_dispatchGroups" : "dispatchGroups"
        let dataList = await fetchAllDocumentData(collection: collection)
        var result: [String: [String]] = [:]
        
        for data in dataList {
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let documents = json["documents"] as? [[String: Any]] else { continue }
            
            for doc in documents {
                guard let fields = doc["fields"] as? [String: Any] else { continue }
                let name = stringValue(fields["name"]) ?? ""
                guard !name.isEmpty else { continue }
                
                var members: [String] = []
                if let memberMap = fields["members"] as? [String: Any],
                   let arr = memberMap["arrayValue"] as? [String: Any],
                   let vals = arr["values"] as? [[String: Any]] {
                    for v in vals {
                        if let s = stringValue(v), !s.isEmpty {
                            members.append(s)
                        }
                    }
                }
                result[name] = members
            }
        }
        
        // Fallback default groups if database has not yet been seeded
        if result.isEmpty {
            result = [
                "Appliance Techs": ["Minor Cover", "Justin Lung", "Wes Rykoskey"],
                "HVAC Techs": ["Joe Colacino", "Robert Hudson", "Ethan Mitchell", "Andrew (Jr) Murphy"],
                "Installer": ["Matt Curtsinger", "Jon Martin", "Ethan Murphy", "Christian Nguyen"],
                "Office Staff": ["Justin Dunlap", "Amanda Hoover", "Nancy Murphy", "Danny Pardo"]
            ]
        }
        return result
    }
    
    // MARK: - Users
    public func fetchUsers(mode: DatabaseMode) async -> [UserSession] {
        
        let collection = mode == .sandbox ? "sandbox_users" : "users"
        let dataList = await fetchAllDocumentData(collection: collection)
        var result: [UserSession] = []
        
        for data in dataList {
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let documents = json["documents"] as? [[String: Any]] else { continue }
            
            for doc in documents {
                guard let fields = doc["fields"] as? [String: Any] else { continue }
                let uid = stringValue(fields["id"]) ?? stringValue(fields["uid"]) ?? (doc["name"] as? String)?.components(separatedBy: "/").last ?? UUID().uuidString
                let name = stringValue(fields["displayName"]) ?? stringValue(fields["name"]) ?? {
                    let f = stringValue(fields["firstName"]) ?? ""
                    let l = stringValue(fields["lastName"]) ?? ""
                    let full = "\(f) \(l)".trimmingCharacters(in: .whitespaces)
                    return full.isEmpty ? "Murphy Staff" : full
                }()
                let email = stringValue(fields["email"]) ?? ""
                let initials = stringValue(fields["initials"])
                
                var accountType: AccountType = .field
                if let permsMap = fields["permissions"] as? [String: Any],
                   let pFields = permsMap["mapValue"] as? [String: Any],
                   let pMap = pFields["fields"] as? [String: Any],
                   let accTypeStr = stringValue(pMap["accountType"]) {
                    let lower = accTypeStr.lowercased()
                    accountType = lower.contains("admin") ? .admin : (lower.contains("office") ? .office : .field)
                } else if let raw = stringValue(fields["accountType"]) ?? stringValue(fields["role"]) {
                    let lower = raw.lowercased()
                    accountType = lower.contains("admin") ? .admin : (lower.contains("office") ? .office : .field)
                }
                
                if name.contains("Justin Lung") || name.contains("Nancy Murphy") || name.contains("Andrew (Jr) Murphy") {
                    accountType = .admin
                } else if name.contains("Danny Pardo") || name.contains("Amanda Hoover") || name.contains("Justin Dunlap") {
                    accountType = .office
                }
                
                var dGroup: DispatchGroupCategory = .applianceTechs
                if let dgMap = fields["dispatchGroups"] as? [String: Any],
                   let arr = dgMap["arrayValue"] as? [String: Any],
                   let vals = arr["values"] as? [[String: Any]],
                   let firstVal = vals.first, let s = stringValue(firstVal) {
                    let lower = s.lowercased()
                    dGroup = lower.contains("office") ? .officeStaff : (lower.contains("hvac") ? .hvacTechs : (lower.contains("install") ? .installer : .applianceTechs))
                } else if let s = stringValue(fields["dispatchGroup"]) {
                    let lower = s.lowercased()
                    dGroup = lower.contains("office") ? .officeStaff : (lower.contains("hvac") ? .hvacTechs : (lower.contains("install") ? .installer : .applianceTechs))
                } else if name.contains("Nancy Murphy") || name.contains("Danny Pardo") || name.contains("Amanda Hoover") || name.contains("Justin Dunlap") {
                    dGroup = .officeStaff
                }
                
                let avatar = stringValue(fields["avatarUrl"]) ?? stringValue(fields["photoURL"]) ?? stringValue(fields["avatar"])
                
                result.append(UserSession(
                    id: uid,
                    name: name,
                    initials: initials,
                    avatarUrl: avatar,
                    email: email,
                    accountType: accountType,
                    dispatchGroup: dGroup,
                    permissions: UserPermissions.default(for: accountType),
                    token: "live_token_\(uid)"
                ))
            }
        }
        return result
    }
    
    // MARK: - Alphabetical Customers via Structured Query
    public func fetchCustomersPage(
        mode: DatabaseMode,
        pageSize: Int = 300,
        offset: Int = 0
    ) async -> (customers: [Customer], nextOffset: Int?) {
        let collection = mode == .sandbox ? "sandbox_customers" : "customers"
        let url = URL(string: "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents:runQuery")!
        let session = self.session
        
        return await Task.detached(priority: .userInitiated) {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            var structuredQuery: [String: Any] = [
                "from": [["collectionId": collection]],
                "orderBy": [["field": ["fieldPath": "name"], "direction": "ASCENDING"]],
                "limit": pageSize
            ]
            if offset > 0 {
                structuredQuery["offset"] = offset
            }
            
            let body: [String: Any] = ["structuredQuery": structuredQuery]
            
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                let (data, response) = try await FirestoreClient.shared.executeAuthorizedRequest(request)
                guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                    return ([], nil)
                }
                
                let (customers, _) = FirestoreClient.shared.parseFirestoreCustomers(from: data)
                let nextOffset = customers.count >= pageSize ? (offset + pageSize) : nil
                return (customers, nextOffset)
            } catch {
                print("[Firestore runQuery Error - \(collection)]: \(error.localizedDescription)")
                return ([], nil)
            }
        }.value
    }
    
    // MARK: - Live Customer Search Across Entire Database
    public func searchCustomers(
        query: String,
        mode: DatabaseMode,
        limit: Int = 60
    ) async -> [Customer] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else { return [] }
        
        let collection = mode == .sandbox ? "sandbox_customers" : "customers"
        let url = URL(string: "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents:runQuery")!
        let session = self.session
        
        var searchTerms = Set<String>()
        searchTerms.insert(trimmed)
        searchTerms.insert(trimmed.capitalized)
        searchTerms.insert(trimmed.uppercased())
        searchTerms.insert(trimmed.lowercased())
        
        return await withTaskGroup(of: [Customer].self) { group in
            for term in searchTerms {
                group.addTask {
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    
                    let structuredQuery: [String: Any] = [
                        "from": [["collectionId": collection]],
                        "where": [
                            "compositeFilter": [
                                "op": "AND",
                                "filters": [
                                    [
                                        "fieldFilter": [
                                            "field": ["fieldPath": "name"],
                                            "op": "GREATER_THAN_OR_EQUAL",
                                            "value": ["stringValue": term]
                                        ]
                                    ],
                                    [
                                        "fieldFilter": [
                                            "field": ["fieldPath": "name"],
                                            "op": "LESS_THAN",
                                            "value": ["stringValue": term + "\u{f8ff}"]
                                        ]
                                    ]
                                ]
                            ]
                        ],
                        "orderBy": [["field": ["fieldPath": "name"], "direction": "ASCENDING"]],
                        "limit": limit
                    ]
                
                let body: [String: Any] = ["structuredQuery": structuredQuery]
                
                do {
                    request.httpBody = try JSONSerialization.data(withJSONObject: body)
                    let (data, response) = try await FirestoreClient.shared.executeAuthorizedRequest(request)
                    guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                        return []
                    }
                    
                    guard let jsonArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                        return []
                    }
                    
                    var results: [Customer] = []
                    for item in jsonArray {
                        guard let doc = item["document"] as? [String: Any],
                              let fields = doc["fields"] as? [String: Any] else { continue }
                        
                        let idStr = FirestoreClient.shared.stringValue(fields["id"]) ?? FirestoreClient.shared.stringValue(fields["customerNumber"]) ?? doc["name"].flatMap { ($0 as? String)?.components(separatedBy: "/").last } ?? UUID().uuidString
                        let customerId = FirestoreClient.parseDeterministicUUID(idStr) ?? UUID()
                        
                        let name = FirestoreClient.shared.stringValue(fields["name"]) ?? FirestoreClient.shared.stringValue(fields["displayName"]) ?? FirestoreClient.shared.stringValue(fields["businessName"]) ?? {
                            let f = FirestoreClient.shared.stringValue(fields["firstName"]) ?? ""
                            let l = FirestoreClient.shared.stringValue(fields["lastName"]) ?? ""
                            let full = "\(f) \(l)".trimmingCharacters(in: .whitespaces)
                            return full.isEmpty ? nil : full
                        }() ?? "Customer"
                        
                        let email = FirestoreClient.shared.stringValue(fields["email"]) ?? ""
                        let phone = FirestoreClient.shared.stringValue(fields["phone"]) ?? FirestoreClient.shared.stringValue(fields["primaryPhone"]) ?? FirestoreClient.shared.stringValue(fields["mobilePhone"]) ?? FirestoreClient.shared.stringValue(fields["homePhone"]) ?? ""
                        let ctypeStr = FirestoreClient.shared.stringValue(fields["customerType"]) ?? "residential"
                        let ctype: AddressType = ctypeStr.lowercased().contains("comm") ? .commercial : .residential
                        let pterms = FirestoreClient.shared.stringValue(fields["paymentTerms"]) ?? "Due upon Receipt"
                        let createdAt = FirestoreClient.shared.dateValue(fields["createdAt"]) ?? Date()
                        
                        var addr = Address(street: "", city: "", state: "", zipCode: "", type: ctype)
                        if let addrMap = fields["address"] as? [String: Any],
                           let aFields = addrMap["mapValue"] as? [String: Any],
                           let af = aFields["fields"] as? [String: Any] {
                            addr = Address(
                                street: FirestoreClient.shared.stringValue(af["street"]) ?? FirestoreClient.shared.stringValue(af["locationAddress1"]) ?? "",
                                city: FirestoreClient.shared.stringValue(af["city"]) ?? FirestoreClient.shared.stringValue(af["locationCity"]) ?? "",
                                state: FirestoreClient.shared.stringValue(af["state"]) ?? FirestoreClient.shared.stringValue(af["locationState"]) ?? "",
                                zipCode: FirestoreClient.shared.stringValue(af["zipCode"]) ?? FirestoreClient.shared.stringValue(af["locationZip"]) ?? "",
                                type: ctype
                            )
                        }
                        
                        var locs: [Address] = []
                        if let locMap = fields["locations"] as? [String: Any],
                           let arr = locMap["arrayValue"] as? [String: Any],
                           let vals = arr["values"] as? [[String: Any]] {
                            for v in vals {
                                if let mf = (v["mapValue"] as? [String: Any])?["fields"] as? [String: Any] {
                                    let l = Address(
                                        street: FirestoreClient.shared.stringValue(mf["street"]) ?? "",
                                        city: FirestoreClient.shared.stringValue(mf["city"]) ?? "",
                                        state: FirestoreClient.shared.stringValue(mf["state"]) ?? "",
                                        zipCode: FirestoreClient.shared.stringValue(mf["zipCode"]) ?? "",
                                        type: ctype
                                    )
                                    locs.append(l)
                                }
                            }
                        }
                        if locs.isEmpty && !addr.street.isEmpty {
                            locs = [addr]
                        }
                        
                        let bName = FirestoreClient.shared.stringValue(fields["businessName"]) ?? FirestoreClient.shared.stringValue(fields["companyName"]) ?? FirestoreClient.shared.stringValue(fields["company"])
                        
                        results.append(Customer(
                            id: customerId,
                            name: name,
                            businessName: bName,
                            email: email,
                            phone: phone,
                            address: addr,
                            customerType: ctype,
                            createdAt: createdAt,
                            locations: locs,
                            paymentTerms: pterms
                        ))
                    }
                    return results
                } catch {
                    return []
                }
            }
        }
            
        var allFound: [Customer] = []
            var seenIds = Set<UUID>()
            for await batch in group {
                for c in batch {
                    if !seenIds.contains(c.id) {
                        seenIds.insert(c.id)
                        allFound.append(c)
                    }
                }
            }
            return allFound
        }
    }

    public func fetchCustomers(mode: DatabaseMode) async -> [Customer] {
        
        
        let collection = mode == .sandbox ? "sandbox_customers" : "customers"
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 60)
        var allCustomers: [Customer] = []
        
        for data in dataList {
            let (customers, _) = parseFirestoreCustomers(from: data)
            allCustomers.append(contentsOf: customers)
        }
        
        return allCustomers
    }
    
    public func saveCustomer(customer: Customer, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_customers" : "customers"
        
        var fields: [String: Any] = [
            "id": ["stringValue": customer.id.uuidString],
            "name": ["stringValue": customer.name],
            "email": ["stringValue": customer.email],
            "phone": ["stringValue": customer.phone],
            "customerType": ["stringValue": customer.customerType.rawValue],
            "paymentTerms": ["stringValue": customer.paymentTerms ?? "Due upon Receipt"],
            "createdAt": ["timestampValue": iso8601String(from: customer.createdAt)],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        
        let addrFields: [String: Any] = [
            "street": ["stringValue": customer.address.street],
            "city": ["stringValue": customer.address.city],
            "state": ["stringValue": customer.address.state],
            "zipCode": ["stringValue": customer.address.zipCode],
            "type": ["stringValue": customer.address.type.rawValue]
        ]
        fields["address"] = ["mapValue": ["fields": addrFields]]
        
        if let bill = customer.billingAddress {
            let billFields: [String: Any] = [
                "street": ["stringValue": bill.street],
                "city": ["stringValue": bill.city],
                "state": ["stringValue": bill.state],
                "zipCode": ["stringValue": bill.zipCode],
                "type": ["stringValue": bill.type.rawValue]
            ]
            fields["billingAddress"] = ["mapValue": ["fields": billFields]]
        }
        
        let locationMaps: [[String: Any]] = customer.locations.map { loc in
            let locFields: [String: Any] = [
                "street": ["stringValue": loc.street],
                "city": ["stringValue": loc.city],
                "state": ["stringValue": loc.state],
                "zipCode": ["stringValue": loc.zipCode],
                "type": ["stringValue": loc.type.rawValue]
            ]
            return ["mapValue": ["fields": locFields]]
        }
        fields["locations"] = ["arrayValue": ["values": locationMaps]]
        
        let contactValues: [[String: Any]] = customer.contacts.map { ["stringValue": $0] }
        fields["contacts"] = ["arrayValue": ["values": contactValues]]
        
        let personMaps: [[String: Any]] = customer.authorizedPersons.map { p in
            var pFields: [String: Any] = [
                "id": ["stringValue": p.id.uuidString],
                "positionLabel": ["stringValue": p.positionLabel],
                "firstName": ["stringValue": p.firstName],
                "lastName": ["stringValue": p.lastName],
                "phone": ["stringValue": p.phone],
                "isPrimary": ["booleanValue": p.isPrimary]
            ]
            if let email = p.email {
                pFields["email"] = ["stringValue": email]
            }
            if let assignedLoc = p.assignedLocation {
                pFields["assignedLocation"] = ["stringValue": assignedLoc]
            }
            return ["mapValue": ["fields": pFields]]
        }
        fields["authorizedPersons"] = ["arrayValue": ["values": personMaps]]
        
        return await writeDocument(collection: collection, documentId: customer.id.uuidString, fields: fields)
    }
    
    public func deleteCustomer(customer: Customer, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_customers" : "customers"
        return await deleteDocument(collection: collection, documentId: customer.id.uuidString)
    }
    
    public func fetchCustomer(id: UUID? = nil, rawId: String? = nil, customerName: String? = nil, mode: DatabaseMode) async -> Customer? {
        let collection = mode == .sandbox ? "sandbox_customers" : "customers"
        let session = self.session
        
        // 1. Try direct GET with rawId or normalized ID if available
        var candidates: [String] = []
        if let raw = rawId?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty {
            candidates.append(raw)
            if raw.hasPrefix("cust-") {
                candidates.append(String(raw.dropFirst(5)))
            } else {
                candidates.append("cust-\(raw)")
            }
        }
        if let uid = id?.uuidString {
            candidates.append(uid)
        }
        
        for cand in candidates {
            let docUrl = baseDocumentsURL.appendingPathComponent("\(collection)/\(cand)")
            var req = URLRequest(url: docUrl)
            req.httpMethod = "GET"
            if let (data, response) = try? await executeAuthorizedRequest(req),
               let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                let (customers, _) = parseFirestoreCustomers(from: data)
                if let first = customers.first {
                    return first
                }
            }
        }
        
        // 2. Query by customerName or customerNumber via runQuery
        if let name = customerName?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty {
            let url = URL(string: "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents:runQuery")!
            let structuredQuery: [String: Any] = [
                "from": [["collectionId": collection]],
                "where": [
                    "fieldFilter": [
                        "field": ["fieldPath": "name"],
                        "op": "EQUAL",
                        "value": ["stringValue": name]
                    ]
                ],
                "limit": 1
            ]
            let body: [String: Any] = ["structuredQuery": structuredQuery]
            if let bodyData = try? JSONSerialization.data(withJSONObject: body) {
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = bodyData
                if let (data, response) = try? await executeAuthorizedRequest(request),
                   let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) {
                    let (customers, _) = parseFirestoreCustomers(from: data)
                    if let first = customers.first {
                        return first
                    }
                }
            }
        }
        
        return nil
    }
    
    // MARK: - Appointments (Jobs)
    public func fetchAppointments(mode: DatabaseMode) async -> [Appointment] {
        
        
        let collection = mode == .sandbox ? "sandbox_appointments" : "appointments"
        let url = URL(string: "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents:runQuery")!
        
        // Query ordered by appointmentDate DESC to fetch current, recent, and future appointments first (matches web portal)
        let structuredQuery: [String: Any] = [
            "from": [["collectionId": collection]],
            "orderBy": [["field": ["fieldPath": "appointmentDate"], "direction": "DESCENDING"]],
            "limit": 1000
        ]
        
        let body: [String: Any] = ["structuredQuery": structuredQuery]
        var allAppts: [Appointment] = []
        
        do {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await executeAuthorizedRequest(request)
            if let httpResponse = response as? HTTPURLResponse {
                if (200...299).contains(httpResponse.statusCode) {
                    allAppts = parseFirestoreAppointments(from: data)
                    print("[Firestore fetchAppointments]: Successfully fetched \(allAppts.count) appointments from \(collection)")
                } else {
                    let errBody = String(data: data, encoding: .utf8) ?? ""
                    print("[Firestore fetchAppointments Error]: HTTP \(httpResponse.statusCode): \(errBody)")
                }
            }
        } catch {
            print("[Firestore fetchAppointments runQuery Error]: \(error.localizedDescription)")
        }
        
        // If runQuery returned no documents or failed, fallback to sequential fetch
        if allAppts.isEmpty {
            print("[Firestore fetchAppointments]: runQuery returned 0, falling back to sequential fetch...")
            let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 2)
            for data in dataList {
                allAppts.append(contentsOf: parseFirestoreAppointments(from: data))
            }
            print("[Firestore fetchAppointments]: Sequential fetch retrieved \(allAppts.count) appointments")
        }
        
        return allAppts
    }
    
    public func saveAppointment(appointment: Appointment, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_appointments" : "appointments"
        
        var fields: [String: Any] = [
            "id": ["stringValue": appointment.id.uuidString],
            "customerId": ["stringValue": appointment.customerId.uuidString],
            "dateTime": ["timestampValue": iso8601String(from: appointment.dateTime)],
            "durationHours": ["doubleValue": appointment.durationHours],
            "status": ["stringValue": appointment.status.rawValue],
            "jobNumber": ["integerValue": "\(appointment.jobNumber)"],
            "appointmentSequenceNumber": ["integerValue": "\(appointment.appointmentSequenceNumber)"],
            "jobType": ["stringValue": appointment.jobType],
            "isFlaggedForFollowUp": ["booleanValue": appointment.isFlaggedForFollowUp],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        
        if let cname = appointment.customerName {
            fields["customerName"] = ["stringValue": cname]
        }
        if let contact = appointment.contactName {
            fields["contactName"] = ["stringValue": contact]
            fields["contact"] = ["stringValue": contact]
        }
        if let loc = appointment.locationAddress {
            fields["locationAddress"] = ["stringValue": loc]
        }
        if let phone = appointment.customerPhone {
            fields["phone"] = ["stringValue": phone]
        }
        if let notes = appointment.serviceNotes {
            fields["serviceNotes"] = ["stringValue": notes]
        }
        if let desig = appointment.designationOverride {
            fields["designationOverride"] = ["stringValue": desig]
        }
        if let tech = appointment.assignedTech {
            fields["assignedTech"] = ["stringValue": tech]
        }
        
        let validCodes = appointment.accessCodes.filter { !$0.code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        if !validCodes.isEmpty {
            let accessMaps: [[String: Any]] = validCodes.map { code in
                let codeFields: [String: Any] = [
                    "label": ["stringValue": code.label],
                    "code": ["stringValue": code.code]
                ]
                return ["mapValue": ["fields": codeFields]]
            }
            fields["accessCodes"] = ["arrayValue": ["values": accessMaps]]
        } else {
            fields["accessCodes"] = ["arrayValue": [:]]
        }
        
        return await writeDocument(collection: collection, documentId: appointment.id.uuidString, fields: fields)
    }
    
    public func deleteAppointment(appointment: Appointment, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_appointments" : "appointments"
        return await deleteDocument(collection: collection, documentId: appointment.id.uuidString)
    }
    
    // MARK: - Price Book Items
    public func fetchPriceBookItems(mode: DatabaseMode) async -> [PriceBookItem] {
        
        
        let collection = mode == .sandbox ? "sandbox_priceBook" : "priceBook"
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
        var allItems: [PriceBookItem] = []
        
        for data in dataList {
            allItems.append(contentsOf: parseFirestorePriceBook(from: data))
        }
        
        // Fallback: If primary priceBook returned empty, fallback to sandbox_priceBook
        if allItems.isEmpty {
            let sandboxData = await fetchAllDocumentData(collection: "sandbox_priceBook", pageSize: 300, maxPages: 20)
            for data in sandboxData {
                allItems.append(contentsOf: parseFirestorePriceBook(from: data))
            }
        }
        
        return allItems
    }
    
    public func savePriceBookItem(item: PriceBookItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_priceBook" : "priceBook"
        
        var fields: [String: Any] = [
            "id": ["stringValue": item.id],
            "name": ["stringValue": item.name],
            "incomeAccount": ["stringValue": item.incomeAccount],
            "isTaxable": ["booleanValue": item.isTaxable],
            "laborHours": ["doubleValue": item.laborHours],
            "standardPrice": ["doubleValue": item.standardPrice],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        
        if let pnum = item.productNumber {
            fields["productNumber"] = ["stringValue": pnum]
            fields["sku"] = ["stringValue": pnum]
        }
        if let maint = item.maintenancePlanPrice {
            fields["maintenancePlanPrice"] = ["doubleValue": maint]
        }
        
        let catValues: [[String: Any]] = item.categoryPaths.map { ["stringValue": $0] }
        fields["categoryPaths"] = ["arrayValue": ["values": catValues]]
        
        return await writeDocument(collection: collection, documentId: item.id, fields: fields)
    }
    
    public func deletePriceBookItem(item: PriceBookItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_priceBook" : "priceBook"
        return await deleteDocument(collection: collection, documentId: item.id)
    }
    
    // MARK: - Generic Structured Query Helper
    public func runStructuredQuery(
        collection: String,
        field: String,
        value: Any,
        limit: Int = 1000
    ) async -> [[String: Any]] {
        let strVal = "\(value)"
        if strVal.isEmpty { return [] }
        let url = URL(string: "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents:runQuery")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var encodedVal: [String: Any] = ["stringValue": strVal]
        if let b = value as? Bool {
            encodedVal = ["booleanValue": b]
        } else if let i = value as? Int {
            encodedVal = ["integerValue": "\(i)"]
        } else if let d = value as? Double {
            encodedVal = ["doubleValue": d]
        }
        
        let structuredQuery: [String: Any] = [
            "from": [["collectionId": collection]],
            "where": [
                "fieldFilter": [
                    "field": ["fieldPath": field],
                    "op": "EQUAL",
                    "value": encodedVal
                ]
            ],
            "limit": limit
        ]
        
        let body: [String: Any] = ["structuredQuery": structuredQuery]
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (data, response) = try await executeAuthorizedRequest(request)
            guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                return []
            }
            guard let jsonArray = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                return []
            }
            return jsonArray.compactMap { $0["document"] as? [String: Any] }
        } catch {
            return []
        }
    }
    
    // MARK: - Equipment (Root Collection)
    public func fetchEquipment(
        customerId: UUID? = nil,
        customerNumber: String? = nil,
        customerName: String? = nil,
        mode: DatabaseMode
    ) async -> [EquipmentItem] {
        
        let collection = mode == .sandbox ? "sandbox_equipment" : "equipment"
        
        var queryValues: Set<String> = []
        if let cid = customerId {
            queryValues.insert(cid.uuidString)
            queryValues.insert(cid.uuidString.lowercased())
        }
        if let cnum = customerNumber?.trimmingCharacters(in: .whitespacesAndNewlines), !cnum.isEmpty {
            queryValues.insert(cnum)
            queryValues.insert(cnum.replacingOccurrences(of: "cust-", with: ""))
        }
        
        var resultsMap: [UUID: EquipmentItem] = [:]
        
        for qVal in queryValues {
            let docsCust = await runStructuredQuery(collection: collection, field: "customerId", value: qVal)
            for d in docsCust {
                if let item = parseFirestoreEquipmentDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsNum = await runStructuredQuery(collection: collection, field: "customerNumber", value: qVal)
            for d in docsNum {
                if let item = parseFirestoreEquipmentDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsWex = await runStructuredQuery(collection: collection, field: "wexCustomerId", value: qVal)
            for d in docsWex {
                if let item = parseFirestoreEquipmentDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsBiz = await runStructuredQuery(collection: collection, field: "businessCustomerId", value: qVal)
            for d in docsBiz {
                if let item = parseFirestoreEquipmentDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if let cName = customerName?.trimmingCharacters(in: .whitespacesAndNewlines), !cName.isEmpty {
            let docsName = await runStructuredQuery(collection: collection, field: "customerName", value: cName)
            for d in docsName {
                if let item = parseFirestoreEquipmentDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if queryValues.isEmpty && (customerName == nil || customerName!.isEmpty) {
            let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
            for data in dataList {
                for item in parseFirestoreEquipment(from: data) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        return Array(resultsMap.values)
    }
    
    public func saveEquipment(item: EquipmentItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_equipment" : "equipment"
        
        var fields: [String: Any] = [
            "id": ["stringValue": item.id.uuidString],
            "name": ["stringValue": item.name],
            "type": ["stringValue": item.type],
            "manufacturer": ["stringValue": item.manufacturer],
            "modelNumber": ["stringValue": item.modelNumber],
            "serialNumber": ["stringValue": item.serialNumber],
            "locationAddress": ["stringValue": item.locationAddress],
            "status": ["stringValue": item.status],
            "warranty": ["stringValue": item.warranty],
            "installDate": ["timestampValue": iso8601String(from: item.installDate)],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        if let cid = item.customerId {
            fields["customerId"] = ["stringValue": cid.uuidString]
        }
        if let jn = item.jobNumber {
            fields["jobNumber"] = ["integerValue": "\(jn)"]
        }
        if !item.photos.isEmpty {
            let photoValues: [[String: Any]] = item.photos.map { ["stringValue": $0] }
            fields["photos"] = ["arrayValue": ["values": photoValues]]
        }
        
        return await writeDocument(collection: collection, documentId: item.id.uuidString, fields: fields)
    }
    
    public func deleteEquipment(item: EquipmentItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_equipment" : "equipment"
        return await deleteDocument(collection: collection, documentId: item.id.uuidString)
    }
    
    // MARK: - Invoices (Root Collection)
    public func fetchInvoices(
        customerId: UUID? = nil,
        customerNumber: String? = nil,
        customerName: String? = nil,
        jobId: UUID? = nil,
        jobNumber: Int? = nil,
        mode: DatabaseMode
    ) async -> [InvoiceRecord] {
        
        let collection = mode == .sandbox ? "sandbox_invoices" : "invoices"
        
        var queryValues: Set<String> = []
        if let cid = customerId {
            queryValues.insert(cid.uuidString)
            queryValues.insert(cid.uuidString.lowercased())
        }
        if let cnum = customerNumber?.trimmingCharacters(in: .whitespacesAndNewlines), !cnum.isEmpty {
            queryValues.insert(cnum)
            queryValues.insert(cnum.replacingOccurrences(of: "cust-", with: ""))
        }
        
        var resultsMap: [UUID: InvoiceRecord] = [:]
        
        for qVal in queryValues {
            let docsCust = await runStructuredQuery(collection: collection, field: "customerId", value: qVal)
            for d in docsCust {
                if let item = parseFirestoreInvoiceDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsNum = await runStructuredQuery(collection: collection, field: "customerNumber", value: qVal)
            for d in docsNum {
                if let item = parseFirestoreInvoiceDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if let cName = customerName?.trimmingCharacters(in: .whitespacesAndNewlines), !cName.isEmpty {
            let docsName = await runStructuredQuery(collection: collection, field: "customerName", value: cName)
            for d in docsName {
                if let item = parseFirestoreInvoiceDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsBill = await runStructuredQuery(collection: collection, field: "billToCustomer", value: cName)
            for d in docsBill {
                if let item = parseFirestoreInvoiceDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if let jn = jobNumber {
            let docsJnInt = await runStructuredQuery(collection: collection, field: "jobNumber", value: jn)
            for d in docsJnInt {
                if let item = parseFirestoreInvoiceDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsJnStr = await runStructuredQuery(collection: collection, field: "jobNumber", value: "\(jn)")
            for d in docsJnStr {
                if let item = parseFirestoreInvoiceDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if let jid = jobId {
            let docsJid = await runStructuredQuery(collection: collection, field: "jobId", value: jid.uuidString)
            for d in docsJid {
                if let item = parseFirestoreInvoiceDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if queryValues.isEmpty && (customerName == nil || customerName!.isEmpty) && jobNumber == nil && jobId == nil {
            let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
            for data in dataList {
                for item in parseFirestoreInvoices(from: data) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        return Array(resultsMap.values)
    }
    
    public func saveInvoice(invoice: InvoiceRecord, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_invoices" : "invoices"
        
        var fields: [String: Any] = [
            "id": ["stringValue": invoice.id.uuidString],
            "invNumber": ["stringValue": invoice.invNumber],
            "status": ["stringValue": invoice.status],
            "paymentStatus": ["stringValue": invoice.paymentStatus],
            "dueDate": ["stringValue": invoice.dueDate],
            "amount": ["stringValue": invoice.amount],
            "subtotal": ["doubleValue": invoice.subtotal],
            "taxAmount": ["doubleValue": invoice.taxAmount],
            "total": ["doubleValue": invoice.total],
            "balanceDue": ["doubleValue": invoice.balanceDue],
            "billToCustomer": ["stringValue": invoice.billToCustomer],
            "billingAddress": ["stringValue": invoice.billingAddress],
            "jobLocation": ["stringValue": invoice.jobLocation],
            "technician": ["stringValue": invoice.technician],
            "isArchived": ["booleanValue": invoice.isArchived],
            "issueDate": ["timestampValue": iso8601String(from: invoice.issueDate)],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        if let cid = invoice.customerId {
            fields["customerId"] = ["stringValue": cid.uuidString]
        }
        if let jid = invoice.jobId {
            fields["jobId"] = ["stringValue": jid.uuidString]
        }
        if let jn = invoice.jobNumber {
            fields["jobNumber"] = ["integerValue": "\(jn)"]
        }
        if let aid = invoice.appointmentId {
            fields["appointmentId"] = ["stringValue": aid.uuidString]
        }
        if let notes = invoice.notes {
            fields["notes"] = ["stringValue": notes]
        }
        
        if !invoice.lineItems.isEmpty {
            let lineItemMaps: [[String: Any]] = invoice.lineItems.map { li in
                var liFields: [String: Any] = [
                    "name": ["stringValue": li.name],
                    "quantity": ["integerValue": "\(li.quantity)"],
                    "unitPrice": ["doubleValue": li.unitPrice],
                    "totalPrice": ["doubleValue": li.totalPrice],
                    "isTaxable": ["booleanValue": li.isTaxable]
                ]
                if let sku = li.sku {
                    liFields["sku"] = ["stringValue": sku]
                }
                return ["mapValue": ["fields": liFields]]
            }
            fields["lineItems"] = ["arrayValue": ["values": lineItemMaps]]
        }
        
        return await writeDocument(collection: collection, documentId: invoice.id.uuidString, fields: fields)
    }
    
    // MARK: - Proposals (Root Collection)
    public func fetchProposals(
        customerId: UUID? = nil,
        customerNumber: String? = nil,
        customerName: String? = nil,
        jobId: UUID? = nil,
        jobNumber: Int? = nil,
        mode: DatabaseMode
    ) async -> [ProposalRecord] {
        
        let collection = mode == .sandbox ? "sandbox_proposals" : "proposals"
        
        var queryValues: Set<String> = []
        if let cid = customerId {
            queryValues.insert(cid.uuidString)
            queryValues.insert(cid.uuidString.lowercased())
        }
        if let cnum = customerNumber?.trimmingCharacters(in: .whitespacesAndNewlines), !cnum.isEmpty {
            queryValues.insert(cnum)
            queryValues.insert(cnum.replacingOccurrences(of: "cust-", with: ""))
        }
        
        var resultsMap: [UUID: ProposalRecord] = [:]
        
        for qVal in queryValues {
            let docsCust = await runStructuredQuery(collection: collection, field: "customerId", value: qVal)
            for d in docsCust {
                if let item = parseFirestoreProposalDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsNum = await runStructuredQuery(collection: collection, field: "customerNumber", value: qVal)
            for d in docsNum {
                if let item = parseFirestoreProposalDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if let cName = customerName?.trimmingCharacters(in: .whitespacesAndNewlines), !cName.isEmpty {
            let docsName = await runStructuredQuery(collection: collection, field: "customerName", value: cName)
            for d in docsName {
                if let item = parseFirestoreProposalDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsBill = await runStructuredQuery(collection: collection, field: "billToCustomer", value: cName)
            for d in docsBill {
                if let item = parseFirestoreProposalDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if let jn = jobNumber {
            let docsJnInt = await runStructuredQuery(collection: collection, field: "jobNumber", value: jn)
            for d in docsJnInt {
                if let item = parseFirestoreProposalDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsJnStr = await runStructuredQuery(collection: collection, field: "jobNumber", value: "\(jn)")
            for d in docsJnStr {
                if let item = parseFirestoreProposalDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if let jid = jobId {
            let docsJid = await runStructuredQuery(collection: collection, field: "jobId", value: jid.uuidString)
            for d in docsJid {
                if let item = parseFirestoreProposalDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if queryValues.isEmpty && (customerName == nil || customerName!.isEmpty) && jobNumber == nil && jobId == nil {
            let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
            for data in dataList {
                for item in parseFirestoreProposals(from: data) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        return Array(resultsMap.values)
    }
    
    public func saveProposal(proposal: ProposalRecord, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_proposals" : "proposals"
        
        var fields: [String: Any] = [
            "id": ["stringValue": proposal.id.uuidString],
            "proposalNumber": ["stringValue": proposal.proposalNumber],
            "status": ["stringValue": proposal.status],
            "billToCustomer": ["stringValue": proposal.billToCustomer],
            "jobLocation": ["stringValue": proposal.jobLocation],
            "technician": ["stringValue": proposal.technician],
            "isArchived": ["booleanValue": proposal.isArchived],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        fields["customerId"] = ["stringValue": proposal.customerId.uuidString]
        if let jid = proposal.jobId {
            fields["jobId"] = ["stringValue": jid.uuidString]
        }
        if let jn = proposal.jobNumber {
            fields["jobNumber"] = ["integerValue": "\(jn)"]
        }
        if let notes = proposal.notes {
            fields["notes"] = ["stringValue": notes]
        }
        
        if !proposal.options.isEmpty {
            let optionMaps: [[String: Any]] = proposal.options.map { opt in
                return [
                    "mapValue": [
                        "fields": [
                            "tier": ["stringValue": opt.tier],
                            "title": ["stringValue": opt.title],
                            "description": ["stringValue": opt.description],
                            "subtotal": ["doubleValue": opt.subtotal],
                            "taxAmount": ["doubleValue": opt.taxAmount],
                            "total": ["doubleValue": opt.total]
                        ]
                    ]
                ]
            }
            fields["options"] = ["arrayValue": ["values": optionMaps]]
        }
        
        return await writeDocument(collection: collection, documentId: proposal.id.uuidString, fields: fields)
    }
    
    // MARK: - Maintenance Plans
    public func fetchMaintenancePlans(
        customerId: UUID? = nil,
        customerNumber: String? = nil,
        customerName: String? = nil,
        mode: DatabaseMode
    ) async -> [MaintenancePlanItem] {
        
        let collection = mode == .sandbox ? "sandbox_maintenancePlans" : "maintenancePlans"
        
        var queryValues: Set<String> = []
        if let cid = customerId {
            queryValues.insert(cid.uuidString)
            queryValues.insert(cid.uuidString.lowercased())
        }
        if let cnum = customerNumber?.trimmingCharacters(in: .whitespacesAndNewlines), !cnum.isEmpty {
            queryValues.insert(cnum)
            queryValues.insert(cnum.replacingOccurrences(of: "cust-", with: ""))
        }
        
        var resultsMap: [UUID: MaintenancePlanItem] = [:]
        
        for qVal in queryValues {
            let docsCust = await runStructuredQuery(collection: collection, field: "customerId", value: qVal)
            for d in docsCust {
                if let item = parseFirestoreMaintenancePlanDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsNum = await runStructuredQuery(collection: collection, field: "customerNumber", value: qVal)
            for d in docsNum {
                if let item = parseFirestoreMaintenancePlanDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsWex = await runStructuredQuery(collection: collection, field: "wexCustomerId", value: qVal)
            for d in docsWex {
                if let item = parseFirestoreMaintenancePlanDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsBiz = await runStructuredQuery(collection: collection, field: "businessCustomerId", value: qVal)
            for d in docsBiz {
                if let item = parseFirestoreMaintenancePlanDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if let cName = customerName?.trimmingCharacters(in: .whitespacesAndNewlines), !cName.isEmpty {
            let docsName = await runStructuredQuery(collection: collection, field: "customerName", value: cName)
            for d in docsName {
                if let item = parseFirestoreMaintenancePlanDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
            let docsAcct = await runStructuredQuery(collection: collection, field: "accountName", value: cName)
            for d in docsAcct {
                if let item = parseFirestoreMaintenancePlanDoc(doc: d) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        if queryValues.isEmpty && (customerName == nil || customerName!.isEmpty) {
            let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
            for data in dataList {
                for item in parseFirestoreMaintenancePlans(from: data) {
                    resultsMap[item.id] = item
                }
            }
        }
        
        return Array(resultsMap.values)
    }
    
    public func saveMaintenancePlan(plan: MaintenancePlanItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_maintenancePlans" : "maintenancePlans"
        
        var fields: [String: Any] = [
            "id": ["stringValue": plan.id.uuidString],
            "name": ["stringValue": plan.name],
            "status": ["stringValue": plan.status],
            "description": ["stringValue": plan.description],
            "expiresDate": ["stringValue": plan.expiresDate],
            "contractTotal": ["stringValue": plan.contractTotal],
            "annualPrice": ["stringValue": plan.annualPrice],
            "balance": ["stringValue": plan.balance],
            "locationStreet": ["stringValue": plan.locationStreet],
            "includedVisitsTotal": ["integerValue": "\(plan.includedVisitsTotal)"],
            "includedVisitsRemaining": ["integerValue": "\(plan.includedVisitsRemaining)"],
            "discountPercentage": ["integerValue": "\(plan.discountPercentage)"],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        if let cid = plan.customerId {
            fields["customerId"] = ["stringValue": cid.uuidString]
        }
        
        return await writeDocument(collection: collection, documentId: plan.id.uuidString, fields: fields)
    }
    
    // MARK: - Checklist Templates & Instances
    public func fetchChecklistTemplates(mode: DatabaseMode) async -> [ChecklistTemplateItem] {
        
        let collection = mode == .sandbox ? "sandbox_checklistTemplates" : "checklistTemplates"
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
        var list: [ChecklistTemplateItem] = []
        for data in dataList {
            list.append(contentsOf: parseFirestoreChecklistTemplates(from: data))
        }
        return list
    }
    
    public func saveChecklistInstance(instance: ChecklistInstanceItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_checklists" : "checklists"
        
        var fields: [String: Any] = [
            "id": ["stringValue": instance.id.uuidString],
            "templateId": ["stringValue": instance.templateId.uuidString],
            "customerId": ["stringValue": instance.customerId.uuidString],
            "title": ["stringValue": instance.title],
            "category": ["stringValue": instance.category],
            "isCompleted": ["booleanValue": instance.isCompleted],
            "completedBy": ["stringValue": instance.completedBy],
            "completedAt": ["timestampValue": iso8601String(from: instance.completedAt)],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        if let jid = instance.jobId {
            fields["jobId"] = ["stringValue": jid.uuidString]
        }
        if let jn = instance.jobNumber {
            fields["jobNumber"] = ["integerValue": "\(jn)"]
        }
        if let aid = instance.appointmentId {
            fields["appointmentId"] = ["stringValue": aid.uuidString]
        }
        
        if !instance.steps.isEmpty {
            let stepMaps: [[String: Any]] = instance.steps.map { s in
                var sFields: [String: Any] = [
                    "id": ["stringValue": s.id.uuidString],
                    "title": ["stringValue": s.question],
                    "required": ["booleanValue": !s.isSkipped],
                    "isCompleted": ["booleanValue": s.selectedOption != nil || !s.textInput.isEmpty]
                ]
                if let opt = s.selectedOption {
                    sFields["value"] = ["stringValue": opt]
                } else if !s.textInput.isEmpty {
                    sFields["value"] = ["stringValue": s.textInput]
                }
                return ["mapValue": ["fields": sFields]]
            }
            fields["steps"] = ["arrayValue": ["values": stepMaps]]
        }
        
        return await writeDocument(collection: collection, documentId: instance.id.uuidString, fields: fields)
    }
    
    // MARK: - Notes
    public func fetchNotes(customerId: UUID? = nil, jobId: UUID? = nil, mode: DatabaseMode) async -> [NoteItem] {
        
        let collection = mode == .sandbox ? "sandbox_notes" : "notes"
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
        var list: [NoteItem] = []
        for data in dataList {
            list.append(contentsOf: parseFirestoreNotes(from: data))
        }
        if let cid = customerId {
            return list.filter { $0.customerId == cid }
        }
        if let jid = jobId {
            return list.filter { $0.jobId == jid }
        }
        return list
    }
    
    public func saveNote(note: NoteItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_notes" : "notes"
        
        var fields: [String: Any] = [
            "id": ["stringValue": note.id.uuidString],
            "author": ["stringValue": note.author],
            "text": ["stringValue": note.text],
            "savedText": ["stringValue": note.savedText],
            "isPinned": ["booleanValue": note.isPinned],
            "dateStarted": ["timestampValue": iso8601String(from: note.dateStarted)],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        if let cid = note.customerId {
            fields["customerId"] = ["stringValue": cid.uuidString]
        }
        if let jid = note.jobId {
            fields["jobId"] = ["stringValue": jid.uuidString]
        }
        if let jn = note.jobNumber {
            fields["jobNumber"] = ["integerValue": "\(jn)"]
        }
        if let aid = note.appointmentId {
            fields["appointmentId"] = ["stringValue": aid.uuidString]
        }
        
        return await writeDocument(collection: collection, documentId: note.id.uuidString, fields: fields)
    }
    
    public func deleteNote(note: NoteItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_notes" : "notes"
        return await deleteDocument(collection: collection, documentId: note.id.uuidString)
    }
    
    // MARK: - Attachments
    public func fetchAttachments(customerId: UUID? = nil, jobId: UUID? = nil, mode: DatabaseMode) async -> [AttachmentItem] {
        
        let collection = mode == .sandbox ? "sandbox_attachments" : "attachments"
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
        var list: [AttachmentItem] = []
        for data in dataList {
            list.append(contentsOf: parseFirestoreAttachments(from: data))
        }
        if let cid = customerId {
            return list.filter { $0.customerId == cid }
        }
        if let jid = jobId {
            return list.filter { $0.jobId == jid }
        }
        return list
    }
    
    public func saveAttachment(attachment: AttachmentItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_attachments" : "attachments"
        
        var fields: [String: Any] = [
            "id": ["stringValue": attachment.id.uuidString],
            "filename": ["stringValue": attachment.filename],
            "imageURL": ["stringValue": attachment.imageURL],
            "category": ["stringValue": attachment.category],
            "uploadedBy": ["stringValue": attachment.uploadedBy],
            "uploadedAt": ["timestampValue": iso8601String(from: attachment.uploadedAt)],
            "fileSize": ["integerValue": "\(attachment.fileSize)"],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        if let cid = attachment.customerId {
            fields["customerId"] = ["stringValue": cid.uuidString]
        }
        if let jid = attachment.jobId {
            fields["jobId"] = ["stringValue": jid.uuidString]
        }
        if let jn = attachment.jobNumber {
            fields["jobNumber"] = ["integerValue": "\(jn)"]
        }
        if let aid = attachment.appointmentId {
            fields["appointmentId"] = ["stringValue": aid.uuidString]
        }
        
        return await writeDocument(collection: collection, documentId: attachment.id.uuidString, fields: fields)
    }
    
    public func deleteAttachment(attachment: AttachmentItem, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_attachments" : "attachments"
        return await deleteDocument(collection: collection, documentId: attachment.id.uuidString)
    }
    
    // MARK: - Follow-Up Flags
    public func fetchFollowUps(assignedTo: String? = nil, mode: DatabaseMode) async -> [FollowUpFlag] {
        
        let collection = mode == .sandbox ? "sandbox_followUps" : "followUps"
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 20)
        var list: [FollowUpFlag] = []
        for data in dataList {
            list.append(contentsOf: parseFirestoreFollowUps(from: data))
        }
        if let a = assignedTo {
            return list.filter { $0.assignedTo == a }
        }
        return list
    }
    
    public func saveFollowUp(flag: FollowUpFlag, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_followUps" : "followUps"
        
        var fields: [String: Any] = [
            "id": ["stringValue": flag.id.uuidString],
            "jobNumber": ["integerValue": "\(flag.jobNumber)"],
            "customerName": ["stringValue": flag.customerName],
            "followUpType": ["stringValue": flag.followUpType],
            "reason": ["stringValue": flag.reason],
            "assignedTo": ["stringValue": flag.assignedTo],
            "dueDate": ["timestampValue": iso8601String(from: flag.dueDate)],
            "isComplete": ["booleanValue": flag.isComplete],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        if let cid = flag.customerId {
            fields["customerId"] = ["stringValue": cid.uuidString]
        }
        if let jid = flag.jobId {
            fields["jobId"] = ["stringValue": jid.uuidString]
        }
        
        return await writeDocument(collection: collection, documentId: flag.id.uuidString, fields: fields)
    }
    
    // MARK: - Parsing Helpers
    public static func parseDeterministicUUID(_ raw: String?) -> UUID? {
        guard let raw = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !raw.isEmpty else { return nil }
        if let direct = UUID(uuidString: raw) {
            return direct
        }
        var normalized = raw.lowercased()
        if normalized.hasPrefix("cust-") {
            normalized = String(normalized.dropFirst(5))
        }
        let hash = abs(normalized.hashValue)
        let uuidStr = "00000000-0000-0000-0000-\(String(format: "%012x", hash))"
        return UUID(uuidString: uuidStr)
    }

    public func parseFirestoreEquipmentDoc(doc: [String: Any]) -> EquipmentItem? {
        guard let fields = doc["fields"] as? [String: Any] else { return nil }
        let idStr = doc["name"].flatMap { ($0 as? String)?.components(separatedBy: "/").last } ?? stringValue(fields["id"]) ?? UUID().uuidString
        let custIdStr = stringValue(fields["customerId"]) ?? stringValue(fields["customerNumber"]) ?? stringValue(fields["wexCustomerId"]) ?? stringValue(fields["businessCustomerId"])
        return EquipmentItem(
            id: FirestoreClient.parseDeterministicUUID(idStr) ?? UUID(),
            name: stringValue(fields["name"]) ?? "Equipment",
            type: stringValue(fields["type"]) ?? "HVAC",
            manufacturer: stringValue(fields["manufacturer"]) ?? "Trane",
            modelNumber: stringValue(fields["modelNumber"]) ?? "",
            serialNumber: stringValue(fields["serialNumber"]) ?? "",
            locationAddress: stringValue(fields["locationAddress"]) ?? stringValue(fields["locationStreet"]) ?? "Attic",
            installDate: dateValue(fields["installDate"]) ?? Date(),
            status: stringValue(fields["status"]) ?? "Active",
            warranty: stringValue(fields["warranty"]) ?? "",
            customerId: FirestoreClient.parseDeterministicUUID(custIdStr)
        )
    }
    
    private func parseFirestoreEquipment(from data: Data) -> [EquipmentItem] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else { return [] }
        return documents.compactMap { parseFirestoreEquipmentDoc(doc: $0) }
    }
    
    public func parseFirestoreInvoiceDoc(doc: [String: Any]) -> InvoiceRecord? {
        guard let fields = doc["fields"] as? [String: Any] else { return nil }
        let idStr = doc["name"].flatMap { ($0 as? String)?.components(separatedBy: "/").last } ?? stringValue(fields["id"]) ?? UUID().uuidString
        let custIdStr = stringValue(fields["customerId"]) ?? stringValue(fields["customerNumber"])
        
        var items: [InvoiceLineItem] = []
        if let itemsMap = fields["lineItems"] as? [String: Any],
           let arr = itemsMap["arrayValue"] as? [String: Any],
           let vals = arr["values"] as? [[String: Any]] {
            for v in vals {
                if let mf = (v["mapValue"] as? [String: Any])?["fields"] as? [String: Any] {
                    let li = InvoiceLineItem(
                        id: stringValue(mf["id"]).flatMap { FirestoreClient.parseDeterministicUUID($0) } ?? UUID(),
                        priceBookItemId: stringValue(mf["priceBookItemId"]),
                        sku: stringValue(mf["sku"]),
                        name: stringValue(mf["name"]) ?? stringValue(mf["description"]) ?? "Service Item",
                        description: stringValue(mf["description"]) ?? "",
                        quantity: intValue(mf["quantity"]) ?? 1,
                        unitPrice: doubleValue(mf["unitPrice"]) ?? 0.0,
                        totalPrice: doubleValue(mf["totalPrice"]) ?? 0.0,
                        isTaxable: boolValue(mf["isTaxable"]) ?? true
                    )
                    items.append(li)
                }
            }
        }
        
        let tot = doubleValue(fields["total"]) ?? 0.0
        return InvoiceRecord(
            id: FirestoreClient.parseDeterministicUUID(idStr) ?? UUID(),
            invNumber: stringValue(fields["invNumber"]) ?? stringValue(fields["invoiceNumber"]) ?? "#I-130086",
            status: stringValue(fields["status"]) ?? "Paid",
            paymentStatus: stringValue(fields["paymentStatus"]) ?? "Paid in Full",
            dueDate: stringValue(fields["dueDate"]) ?? "05/28/2026",
            amount: stringValue(fields["amount"]) ?? String(format: "$%.2f", tot),
            customerId: FirestoreClient.parseDeterministicUUID(custIdStr) ?? UUID(),
            jobId: stringValue(fields["jobId"]).flatMap { FirestoreClient.parseDeterministicUUID($0) },
            jobNumber: intValue(fields["jobNumber"]) ?? stringValue(fields["jobNumber"]).flatMap { Int($0) },
            appointmentId: stringValue(fields["appointmentId"]).flatMap { FirestoreClient.parseDeterministicUUID($0) },
            issueDate: dateValue(fields["issueDate"]) ?? Date(),
            paymentTerms: stringValue(fields["paymentTerms"]) ?? "Due Upon Receipt",
            subtotal: doubleValue(fields["subtotal"]) ?? 0.0,
            taxAmount: doubleValue(fields["taxAmount"]) ?? 0.0,
            total: tot,
            balanceDue: doubleValue(fields["balanceDue"]) ?? 0.0,
            billToCustomer: stringValue(fields["billToCustomer"]) ?? "",
            billingAddress: stringValue(fields["billingAddress"]) ?? "",
            jobLocation: stringValue(fields["jobLocation"]) ?? stringValue(fields["locationAddress"]) ?? "",
            technician: stringValue(fields["technician"]) ?? "Justin Lung",
            lineItems: items,
            notes: stringValue(fields["notes"]),
            isArchived: boolValue(fields["isArchived"]) ?? false
        )
    }
    
    private func parseFirestoreInvoices(from data: Data) -> [InvoiceRecord] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else { return [] }
        return documents.compactMap { parseFirestoreInvoiceDoc(doc: $0) }
    }
    
    public func parseFirestoreProposalDoc(doc: [String: Any]) -> ProposalRecord? {
        guard let fields = doc["fields"] as? [String: Any] else { return nil }
        let idStr = doc["name"].flatMap { ($0 as? String)?.components(separatedBy: "/").last } ?? stringValue(fields["id"]) ?? UUID().uuidString
        let custIdStr = stringValue(fields["customerId"]) ?? stringValue(fields["customerNumber"])
        
        var optionsList: [ProposalOptionItem] = []
        if let optMap = fields["options"] as? [String: Any],
           let arr = optMap["arrayValue"] as? [String: Any],
           let vals = arr["values"] as? [[String: Any]] {
            for v in vals {
                if let mf = (v["mapValue"] as? [String: Any])?["fields"] as? [String: Any] {
                    let opt = ProposalOptionItem(
                        id: stringValue(mf["id"]).flatMap { FirestoreClient.parseDeterministicUUID($0) } ?? UUID(),
                        tier: stringValue(mf["tier"]) ?? "Option A",
                        title: stringValue(mf["title"]) ?? stringValue(mf["name"]) ?? "Proposed Option",
                        description: stringValue(mf["description"]) ?? stringValue(mf["summary"]) ?? "",
                        subtotal: doubleValue(mf["subtotal"]) ?? 0.0,
                        taxAmount: doubleValue(mf["taxAmount"]) ?? 0.0,
                        total: doubleValue(mf["total"]) ?? doubleValue(mf["totalAmount"]) ?? 0.0,
                        monthlyFinancingEstimate: doubleValue(mf["monthlyFinancingEstimate"]),
                        isSelected: boolValue(mf["isSelected"]) ?? false
                    )
                    optionsList.append(opt)
                }
            }
        }
        
        return ProposalRecord(
            id: FirestoreClient.parseDeterministicUUID(idStr) ?? UUID(),
            proposalNumber: stringValue(fields["proposalNumber"]) ?? stringValue(fields["propNumber"]) ?? "#P-10492",
            customerId: FirestoreClient.parseDeterministicUUID(custIdStr) ?? UUID(),
            jobId: stringValue(fields["jobId"]).flatMap { FirestoreClient.parseDeterministicUUID($0) },
            jobNumber: intValue(fields["jobNumber"]) ?? stringValue(fields["jobNumber"]).flatMap { Int($0) },
            appointmentId: stringValue(fields["appointmentId"]).flatMap { FirestoreClient.parseDeterministicUUID($0) },
            status: stringValue(fields["status"]) ?? "Presented",
            issueDate: dateValue(fields["issueDate"]) ?? Date(),
            expirationDate: dateValue(fields["expirationDate"]) ?? Date().addingTimeInterval(86400 * 30),
            options: optionsList,
            selectedOptionId: stringValue(fields["selectedOptionId"]).flatMap { FirestoreClient.parseDeterministicUUID($0) },
            billToCustomer: stringValue(fields["billToCustomer"]) ?? stringValue(fields["customerName"]) ?? "",
            jobLocation: stringValue(fields["jobLocation"]) ?? stringValue(fields["locationAddress"]) ?? "",
            technician: stringValue(fields["technician"]) ?? "Justin Lung",
            notes: stringValue(fields["notes"]),
            isArchived: boolValue(fields["isArchived"]) ?? false
        )
    }
    
    private func parseFirestoreProposals(from data: Data) -> [ProposalRecord] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else { return [] }
        return documents.compactMap { parseFirestoreProposalDoc(doc: $0) }
    }
    
    public func parseFirestoreMaintenancePlanDoc(doc: [String: Any]) -> MaintenancePlanItem? {
        guard let fields = doc["fields"] as? [String: Any] else { return nil }
        let idStr = doc["name"].flatMap { ($0 as? String)?.components(separatedBy: "/").last } ?? stringValue(fields["id"]) ?? UUID().uuidString
        let custIdStr = stringValue(fields["customerId"]) ?? stringValue(fields["customerNumber"]) ?? stringValue(fields["wexCustomerId"]) ?? stringValue(fields["businessCustomerId"])
        return MaintenancePlanItem(
            id: FirestoreClient.parseDeterministicUUID(idStr) ?? UUID(),
            customerId: FirestoreClient.parseDeterministicUUID(custIdStr),
            name: stringValue(fields["name"]) ?? "Gold Protection Plan",
            status: stringValue(fields["status"]) ?? "ACTIVE",
            description: stringValue(fields["description"]) ?? "",
            expiresDate: stringValue(fields["expiresDate"]) ?? "",
            contractTotal: stringValue(fields["contractTotal"]) ?? "$0.00",
            annualPrice: stringValue(fields["annualPrice"]) ?? "$0.00",
            balance: stringValue(fields["balance"]) ?? "$0.00",
            locationStreet: stringValue(fields["locationStreet"]) ?? stringValue(fields["locationAddress"]) ?? "",
            includedVisitsTotal: intValue(fields["includedVisitsTotal"]) ?? 2,
            includedVisitsRemaining: intValue(fields["includedVisitsRemaining"]) ?? 1,
            discountPercentage: intValue(fields["discountPercentage"]) ?? 15
        )
    }
    
    private func parseFirestoreMaintenancePlans(from data: Data) -> [MaintenancePlanItem] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else { return [] }
        return documents.compactMap { parseFirestoreMaintenancePlanDoc(doc: $0) }
    }
    
    private func parseFirestoreChecklistTemplates(from data: Data) -> [ChecklistTemplateItem] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else { return [] }
        var list: [ChecklistTemplateItem] = []
        for doc in documents {
            guard let fields = doc["fields"] as? [String: Any] else { continue }
            let idStr = stringValue(fields["id"]) ?? UUID().uuidString
            let title = stringValue(fields["title"]) ?? stringValue(fields["name"]) ?? "Inspection Checklist"
            let itemCount = intValue(fields["itemCount"]) ?? 10
            let completedCount = intValue(fields["completedCount"]) ?? 0
            let category = stringValue(fields["category"]) ?? "HVAC"
            
            var parsedSteps: [ChecklistStepItem] = []
            if let itemsArr = fields["items"] as? [String: Any],
               let values = itemsArr["arrayValue"] as? [String: Any],
               let valList = values["values"] as? [[String: Any]] {
                for itemVal in valList {
                    guard let itemFields = itemVal["mapValue"] as? [String: Any],
                          let f = itemFields["fields"] as? [String: Any] else { continue }
                    let q = stringValue(f["label"]) ?? stringValue(f["title"]) ?? stringValue(f["question"]) ?? ""
                    let iType = stringValue(f["inputType"]) ?? "Short Answer"
                    var stepType: ChecklistStepItem.StepType = .textInput
                    var options: [String] = []
                    if iType == "Multiple Choice" || iType == "Pass/Fail" {
                        stepType = .selection
                        if let optArr = f["options"] as? [String: Any],
                           let optVal = optArr["arrayValue"] as? [String: Any],
                           let optList = optVal["values"] as? [[String: Any]] {
                            for o in optList {
                                if let oFields = (o["mapValue"] as? [String: Any])?["fields"] as? [String: Any],
                                   let t = stringValue(oFields["text"]) {
                                    options.append(t)
                                } else if let s = stringValue(o) {
                                    options.append(s)
                                }
                            }
                        }
                        if options.isEmpty && iType == "Pass/Fail" {
                            options = ["Pass", "Fail"]
                        }
                    }
                    parsedSteps.append(ChecklistStepItem(
                        question: q,
                        type: stepType,
                        options: options
                    ))
                }
            }
            
            let item = ChecklistTemplateItem(
                id: UUID(uuidString: idStr) ?? UUID(),
                title: title,
                category: category,
                itemCount: parsedSteps.isEmpty ? itemCount : parsedSteps.count,
                completedCount: completedCount,
                steps: parsedSteps
            )
            list.append(item)
        }
        return list
    }
    
    private func parseFirestoreNotes(from data: Data) -> [NoteItem] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else { return [] }
        var list: [NoteItem] = []
        for doc in documents {
            guard let fields = doc["fields"] as? [String: Any] else { continue }
            let idStr = stringValue(fields["id"]) ?? UUID().uuidString
            let note = NoteItem(
                id: UUID(uuidString: idStr) ?? UUID(),
                author: stringValue(fields["author"]) ?? "Technician",
                dateStarted: dateValue(fields["dateStarted"]) ?? Date(),
                text: stringValue(fields["text"]) ?? "",
                savedText: stringValue(fields["savedText"]) ?? "",
                isEditing: false,
                isNewDraft: false,
                customerId: stringValue(fields["customerId"]).flatMap { UUID(uuidString: $0) },
                jobId: stringValue(fields["jobId"]).flatMap { UUID(uuidString: $0) },
                jobNumber: intValue(fields["jobNumber"]),
                appointmentId: stringValue(fields["appointmentId"]).flatMap { UUID(uuidString: $0) },
                isPinned: boolValue(fields["isPinned"]) ?? false
            )
            list.append(note)
        }
        return list
    }
    
    private func parseFirestoreAttachments(from data: Data) -> [AttachmentItem] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else { return [] }
        var list: [AttachmentItem] = []
        for doc in documents {
            guard let fields = doc["fields"] as? [String: Any] else { continue }
            let idStr = stringValue(fields["id"]) ?? UUID().uuidString
            let item = AttachmentItem(
                id: UUID(uuidString: idStr) ?? UUID(),
                filename: stringValue(fields["filename"]) ?? "Photo.jpg",
                imageURL: stringValue(fields["imageURL"]) ?? "",
                customerId: stringValue(fields["customerId"]).flatMap { UUID(uuidString: $0) },
                jobId: stringValue(fields["jobId"]).flatMap { UUID(uuidString: $0) },
                jobNumber: intValue(fields["jobNumber"]),
                appointmentId: stringValue(fields["appointmentId"]).flatMap { UUID(uuidString: $0) },
                category: stringValue(fields["category"]) ?? "Diagnostic",
                uploadedBy: stringValue(fields["uploadedBy"]) ?? "Technician",
                uploadedAt: dateValue(fields["uploadedAt"]) ?? Date(),
                fileSize: intValue(fields["fileSize"]) ?? (1024 * 512)
            )
            list.append(item)
        }
        return list
    }
    
    private func parseFirestoreFollowUps(from data: Data) -> [FollowUpFlag] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else { return [] }
        var list: [FollowUpFlag] = []
        for doc in documents {
            guard let fields = doc["fields"] as? [String: Any] else { continue }
            let idStr = stringValue(fields["id"]) ?? UUID().uuidString
            let flag = FollowUpFlag(
                id: UUID(uuidString: idStr) ?? UUID(),
                jobId: stringValue(fields["jobId"]).flatMap { UUID(uuidString: $0) },
                jobNumber: intValue(fields["jobNumber"]) ?? 140019,
                customerId: stringValue(fields["customerId"]).flatMap { UUID(uuidString: $0) },
                customerName: stringValue(fields["customerName"]) ?? "",
                followUpType: stringValue(fields["followUpType"]) ?? "Part Quote",
                reason: stringValue(fields["reason"]) ?? "",
                assignedTo: stringValue(fields["assignedTo"]) ?? "Justin Lung",
                dueDate: dateValue(fields["dueDate"]) ?? Date(),
                isComplete: boolValue(fields["isComplete"]) ?? false
            )
            list.append(flag)
        }
        return list
    }
    
    func parseFirestoreCustomers(from data: Data) -> ([Customer], String?) {
        var documents: [[String: Any]] = []
        var nextToken: String? = nil
        
        if let jsonArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            for item in jsonArray {
                if let doc = item["document"] as? [String: Any] {
                    documents.append(doc)
                } else if item["fields"] != nil {
                    documents.append(item)
                }
            }
        } else if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            nextToken = json["nextPageToken"] as? String
            if let docs = json["documents"] as? [[String: Any]] {
                documents = docs
            } else if json["fields"] != nil {
                documents = [json]
            }
        }
        
        if documents.isEmpty {
            return ([], nil)
        }
        
        var list: [Customer] = []
        for doc in documents {
            guard let fields = doc["fields"] as? [String: Any] else { continue }
            
            let idStr = stringValue(fields["id"]) ?? stringValue(fields["customerNumber"]) ?? doc["name"].flatMap { ($0 as? String)?.components(separatedBy: "/").last } ?? UUID().uuidString
            let customerId = FirestoreClient.parseDeterministicUUID(idStr) ?? UUID()
            
            let name = stringValue(fields["name"]) ?? stringValue(fields["displayName"]) ?? stringValue(fields["businessName"]) ?? {
                let f = stringValue(fields["firstName"]) ?? ""
                let l = stringValue(fields["lastName"]) ?? ""
                let full = "\(f) \(l)".trimmingCharacters(in: .whitespaces)
                return full.isEmpty ? nil : full
            }() ?? "Customer"
            
            let email = stringValue(fields["email"]) ?? ""
            let phone = stringValue(fields["phone"]) ?? stringValue(fields["primaryPhone"]) ?? stringValue(fields["mobilePhone"]) ?? stringValue(fields["homePhone"]) ?? ""
            let ctypeStr = stringValue(fields["customerType"]) ?? "residential"
            let ctype: AddressType = ctypeStr.lowercased().contains("comm") ? .commercial : .residential
            let pterms = stringValue(fields["paymentTerms"]) ?? "Due upon Receipt"
            let createdAt = dateValue(fields["createdAt"]) ?? Date()
            
            var addr = Address(street: "", city: "", state: "", zipCode: "", type: ctype)
            if let addrMap = fields["address"] as? [String: Any],
               let addrFields = addrMap["mapValue"] as? [String: Any],
               let af = addrFields["fields"] as? [String: Any] {
                addr = Address(
                    street: stringValue(af["street"]) ?? stringValue(af["locationAddress1"]) ?? "",
                    city: stringValue(af["city"]) ?? stringValue(af["locationCity"]) ?? "",
                    state: stringValue(af["state"]) ?? stringValue(af["locationState"]) ?? "",
                    zipCode: stringValue(af["zipCode"]) ?? stringValue(af["locationZip"]) ?? "",
                    type: ctype
                )
            }
            
            var billingAddr: Address? = nil
            if let billMap = fields["billingAddress"] as? [String: Any],
               let billFields = billMap["mapValue"] as? [String: Any],
               let bf = billFields["fields"] as? [String: Any] {
                billingAddr = Address(
                    street: stringValue(bf["street"]) ?? "",
                    city: stringValue(bf["city"]) ?? "",
                    state: stringValue(bf["state"]) ?? "",
                    zipCode: stringValue(bf["zipCode"]) ?? "",
                    type: ctype
                )
            }
            
            var locs: [Address] = []
            if let locMap = fields["locations"] as? [String: Any],
               let arr = locMap["arrayValue"] as? [String: Any],
               let vals = arr["values"] as? [[String: Any]] {
                for v in vals {
                    if let mf = (v["mapValue"] as? [String: Any])?["fields"] as? [String: Any] {
                        let l = Address(
                            street: stringValue(mf["street"]) ?? "",
                            city: stringValue(mf["city"]) ?? "",
                            state: stringValue(mf["state"]) ?? "",
                            zipCode: stringValue(mf["zipCode"]) ?? "",
                            type: ctype
                        )
                        locs.append(l)
                    }
                }
            }
            
            var contactsList: [String] = []
            if let cMap = fields["contacts"] as? [String: Any],
               let arr = cMap["arrayValue"] as? [String: Any],
               let vals = arr["values"] as? [[String: Any]] {
                for v in vals {
                    if let s = stringValue(v) {
                        contactsList.append(s)
                    }
                }
            }
            
            var authPersons: [AuthorizedPerson] = []
            if let apMap = fields["authorizedPersons"] as? [String: Any],
               let arr = apMap["arrayValue"] as? [String: Any],
               let vals = arr["values"] as? [[String: Any]] {
                for v in vals {
                    if let mf = (v["mapValue"] as? [String: Any])?["fields"] as? [String: Any] {
                        let pidStr = stringValue(mf["id"]) ?? UUID().uuidString
                        let p = AuthorizedPerson(
                            id: UUID(uuidString: pidStr) ?? UUID(),
                            positionLabel: stringValue(mf["positionLabel"]) ?? "Authorized Person",
                            firstName: stringValue(mf["firstName"]) ?? "",
                            lastName: stringValue(mf["lastName"]) ?? "",
                            phone: stringValue(mf["phone"]) ?? "",
                            email: stringValue(mf["email"]),
                            assignedLocation: stringValue(mf["assignedLocation"]),
                            isPrimary: boolValue(mf["isPrimary"]) ?? false
                        )
                        authPersons.append(p)
                    }
                }
            }
            
            let bName = stringValue(fields["businessName"]) ?? stringValue(fields["companyName"]) ?? stringValue(fields["company"])
            
            let customer = Customer(
                id: customerId,
                name: name,
                businessName: bName,
                email: email,
                phone: phone,
                address: addr,
                customerType: ctype,
                createdAt: createdAt,
                locations: locs,
                contacts: contactsList,
                billingAddress: billingAddr,
                paymentTerms: pterms,
                authorizedPersons: authPersons
            )
            list.append(customer)
        }
        return (list, nextToken)
    }
    
    public func parseAppointmentDate(fields: [String: Any]) -> Date? {
        let df = DateFormatter()
        df.locale = Locale(identifier: "en_US_POSIX")
        
        // 1. Try appointmentDate string + startTime
        if let ad = stringValue(fields["appointmentDate"]) {
            let st = stringValue(fields["startTime"])
            if let st = st, !st.isEmpty {
                df.dateFormat = "yyyy-MM-dd h:mm a"
                if let d = df.date(from: "\(ad) \(st)") { return d }
                df.dateFormat = "yyyy-MM-dd hh:mm a"
                if let d = df.date(from: "\(ad) \(st)") { return d }
            }
            df.dateFormat = "yyyy-MM-dd"
            if let d = df.date(from: ad) { return d }
        }
        
        // 2. Try raw dateTime / appointmentDateTime formatted string (e.g. "1/16/2025 \n11:00 AM - 1:00 PM")
        if let raw = stringValue(fields["dateTime"]) ?? stringValue(fields["appointmentDateTime"]) {
            let clean = raw.replacingOccurrences(of: "\n", with: " ").trimmingCharacters(in: .whitespacesAndNewlines)
            let parts = clean.components(separatedBy: " ")
            if let datePart = parts.first, datePart.contains("/") {
                let subParts = clean.components(separatedBy: "-")
                let startPart = subParts.first?.trimmingCharacters(in: .whitespaces) ?? clean
                
                df.dateFormat = "M/d/yyyy h:mm a"
                if let d = df.date(from: startPart) { return d }
                df.dateFormat = "MM/dd/yyyy h:mm a"
                if let d = df.date(from: startPart) { return d }
                df.dateFormat = "M/d/yyyy hh:mm a"
                if let d = df.date(from: startPart) { return d }
                df.dateFormat = "M/d/yyyy"
                if let d = df.date(from: datePart) { return d }
                df.dateFormat = "MM/dd/yyyy"
                if let d = df.date(from: datePart) { return d }
            }
        }
        
        // 3. Try timestampValue in known date fields
        for k in ["dateTime", "scheduledDate", "createdAt", "createdDate"] {
            if let d = dateValue(fields[k]) {
                return d
            }
        }
        
        // 4. Try ISO8601 string in createdAt
        if let isoStr = stringValue(fields["createdAt"]) {
            let isoFormatter = ISO8601DateFormatter()
            if let d = isoFormatter.date(from: isoStr) { return d }
            df.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
            if let d = df.date(from: isoStr) { return d }
        }
        
        return nil
    }

    private func parseFirestoreAppointments(from data: Data) -> [Appointment] {
        var documents: [[String: Any]] = []
        
        if let jsonArray = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            for item in jsonArray {
                if let doc = item["document"] as? [String: Any] {
                    documents.append(doc)
                } else if item["fields"] != nil {
                    documents.append(item)
                }
            }
        } else if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let docs = json["documents"] as? [[String: Any]] {
                documents = docs
            } else if json["fields"] != nil {
                documents = [json]
            }
        }
        
        if documents.isEmpty {
            return []
        }
        
        var list: [Appointment] = []
        for doc in documents {
            guard let fields = doc["fields"] as? [String: Any] else { continue }
            
            let idStr = stringValue(fields["id"]) ?? stringValue(fields["appointmentId"]) ?? doc["name"].flatMap { ($0 as? String)?.components(separatedBy: "/").last } ?? UUID().uuidString
            let apptId = FirestoreClient.parseDeterministicUUID(idStr) ?? UUID()
            let custIdStr = stringValue(fields["customerId"]) ?? stringValue(fields["customerNumber"]) ?? ""
            let customerId = FirestoreClient.parseDeterministicUUID(custIdStr) ?? UUID()
            let locAddress = stringValue(fields["locationAddress"]) ?? stringValue(fields["location"]) ?? stringValue(fields["locationStreet"]) ?? stringValue(fields["address"])
            let custName = stringValue(fields["customerName"]) ?? stringValue(fields["displayName"])
            let custContact = stringValue(fields["contactName"]) ?? stringValue(fields["contact"]) ?? stringValue(fields["authorizedPersonName"]) ?? stringValue(fields["primaryContact"]) ?? stringValue(fields["callerName"])
            let custPhone = stringValue(fields["phone"]) ?? stringValue(fields["customerPhone"]) ?? stringValue(fields["primaryPhone"]) ?? stringValue(fields["mobilePhone"])
            let custEmail = stringValue(fields["email"]) ?? stringValue(fields["customerEmail"])
            
            let dt = parseAppointmentDate(fields: fields) ?? {
                let cal = Calendar.current
                var comps = DateComponents()
                comps.year = 2025
                comps.month = 1
                comps.day = 1
                return cal.date(from: comps) ?? Date(timeIntervalSince1970: 0)
            }()
            
            let jobNum = intValue(fields["jobNumber"]) ?? (stringValue(fields["jobNumber"]).flatMap { Int($0) }) ?? 100000
            let seq = intValue(fields["appointmentSequenceNumber"]) ?? (stringValue(fields["appointmentSequenceNumber"]).flatMap { Int($0) }) ?? 1
            let jobType = stringValue(fields["jobType"]) ?? stringValue(fields["tripType"]) ?? "Diagnostic"
            var techNames: [String] = []
            if let techArr = fields["technicians"] as? [String: Any],
               let arr = techArr["arrayValue"] as? [String: Any],
               let vals = arr["values"] as? [[String: Any]] {
                for v in vals {
                    if let s = stringValue(v)?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
                        techNames.append(s)
                    }
                }
            }
            if techNames.isEmpty, let raw = stringValue(fields["assignedTech"]) ?? stringValue(fields["technician"]) ?? stringValue(fields["tech"]) {
                techNames = raw.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
            }
            var uniqueTechs: [String] = []
            for t in techNames {
                if !uniqueTechs.contains(t) && t != "Unassigned" {
                    uniqueTechs.append(t)
                }
            }
            let tech = uniqueTechs.isEmpty ? (stringValue(fields["assignedTech"]) ?? "Unassigned") : uniqueTechs.joined(separator: ", ")
            let notes = stringValue(fields["serviceNotes"]) ?? stringValue(fields["callNotes"]) ?? stringValue(fields["appointmentNote"]) ?? stringValue(fields["note"])
            let sTime = stringValue(fields["startTime"])
            let eTime = stringValue(fields["endTime"])
            
            var dur: Double = 2.0
            if let d = doubleValue(fields["durationHours"]) ?? doubleValue(fields["expectedDurationHours"]) {
                dur = d
            } else if let iv = intValue(fields["durationHours"]) ?? intValue(fields["expectedDurationHours"]) {
                dur = Double(iv)
            } else if let hs = stringValue(fields["hoursScheduled"]) {
                let parts = hs.components(separatedBy: ":")
                if parts.count >= 2, let h = Double(parts[0]), let m = Double(parts[1]) {
                    dur = max(0.25, h + (m / 60.0))
                } else if let d = Double(hs) {
                    dur = max(0.25, d)
                }
            } else if let sTime = sTime, let eTime = eTime {
                let tf = DateFormatter()
                tf.locale = Locale(identifier: "en_US_POSIX")
                tf.dateFormat = "h:mm a"
                if let sDate = tf.date(from: sTime), let eDate = tf.date(from: eTime) {
                    let diff = eDate.timeIntervalSince(sDate) / 3600.0
                    if diff > 0 {
                        dur = diff
                    }
                }
            }
            
            var codes: [AccessCode] = []
            if let codeMap = fields["accessCodes"] as? [String: Any],
               let arr = codeMap["arrayValue"] as? [String: Any],
               let vals = arr["values"] as? [[String: Any]] {
                for v in vals {
                    if let mf = (v["mapValue"] as? [String: Any])?["fields"] as? [String: Any] {
                        let c = AccessCode(
                            label: stringValue(mf["label"]) ?? "Code",
                            code: stringValue(mf["code"]) ?? ""
                        )
                        codes.append(c)
                    }
                }
            }
            
            let desig = stringValue(fields["designationOverride"])
            let flagged = boolValue(fields["isFlaggedForFollowUp"]) ?? false
            let statusStr = stringValue(fields["status"]) ?? "Assigned"
            let status = AppointmentStatus(rawValue: statusStr) ?? .assigned
            
            let appt = Appointment(
                id: apptId,
                customerId: customerId,
                dateTime: dt,
                durationHours: dur,
                status: status,
                serviceNotes: notes,
                jobNumber: jobNum,
                appointmentSequenceNumber: seq,
                jobType: jobType,
                designationOverride: desig,
                assignedTech: tech,
                isFlaggedForFollowUp: flagged,
                accessCodes: codes,
                locationAddress: locAddress,
                customerName: custName,
                contactName: custContact,
                customerPhone: custPhone,
                customerEmail: custEmail,
                startTimeString: sTime,
                endTimeString: eTime
            )
            list.append(appt)
        }
        return list
    }
    
    private func parseFirestorePriceBook(from data: Data) -> [PriceBookItem] {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let documents = json["documents"] as? [[String: Any]] else {
            return []
        }
        
        var list: [PriceBookItem] = []
        for doc in documents {
            guard let fields = doc["fields"] as? [String: Any] else { continue }
            
            let pbid = stringValue(fields["id"]) ?? doc["name"].flatMap { ($0 as? String)?.components(separatedBy: "/").last } ?? UUID().uuidString
            let name = stringValue(fields["name"]) ?? ""
            let pnum = stringValue(fields["productNumber"]) ?? stringValue(fields["sku"])
            let account = stringValue(fields["incomeAccount"]) ?? ""
            let taxable = boolValue(fields["isTaxable"]) ?? false
            let labor = doubleValue(fields["laborHours"]) ?? 0.0
            let stdPrice = doubleValue(fields["standardPrice"]) ?? doubleValue(fields["sellingPrice"]) ?? 0.0
            let maintPrice = doubleValue(fields["maintenancePlanPrice"])
            
            var cats: [String] = []
            if let catMap = fields["categoryPaths"] as? [String: Any],
               let arrayVal = catMap["arrayValue"] as? [String: Any],
               let values = arrayVal["values"] as? [[String: Any]] {
                for v in values {
                    if let s = stringValue(v) {
                        cats.append(s)
                    }
                }
            }
            
            let item = PriceBookItem(
                id: pbid,
                name: name,
                productNumber: pnum,
                incomeAccount: account,
                isTaxable: taxable,
                laborHours: labor,
                standardPrice: stdPrice,
                maintenancePlanPrice: maintPrice,
                categoryPaths: cats
            )
            list.append(item)
        }
        return list
    }
    
    private func stringValue(_ field: Any?) -> String? {
        guard let map = field as? [String: Any] else { return nil }
        return map["stringValue"] as? String
    }
    
    private func intValue(_ field: Any?) -> Int? {
        guard let map = field as? [String: Any] else { return nil }
        if let s = map["integerValue"] as? String {
            return Int(s)
        }
        if let n = map["integerValue"] as? Int {
            return n
        }
        return nil
    }
    
    private func doubleValue(_ field: Any?) -> Double? {
        guard let map = field as? [String: Any] else { return nil }
        if let d = map["doubleValue"] as? Double {
            return d
        }
        if let s = map["stringValue"] as? String {
            return Double(s)
        }
        if let s = map["integerValue"] as? String {
            return Double(s)
        }
        return nil
    }
    
    private func boolValue(_ field: Any?) -> Bool? {
        guard let map = field as? [String: Any] else { return nil }
        return map["booleanValue"] as? Bool
    }
    
    private func dateValue(_ field: Any?) -> Date? {
        guard let map = field as? [String: Any] else { return nil }
        if let s = map["timestampValue"] as? String {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: s) { return date }
            return ISO8601DateFormatter().date(from: s)
        }
        if let s = map["stringValue"] as? String {
            return ISO8601DateFormatter().date(from: s)
        }
        return nil
    }
    
    // MARK: - Shift Activities & Time Clock
    public func fetchShiftActivities(userId: String? = nil, mode: DatabaseMode) async -> [ShiftActivity] {
        
        let collection = mode == .sandbox ? "sandbox_timeClock" : "timeClock"
        let url = baseDocumentsURL.appendingPathComponent(collection)
        
        do {
            let (data, response) = try await executeAuthorizedGet(from: url)
            guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                return []
            }
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let documents = json["documents"] as? [[String: Any]] else {
                return []
            }
            var result: [ShiftActivity] = []
            for doc in documents {
                guard let fields = doc["fields"] as? [String: Any] else { continue }
                let idStr = stringValue(fields["id"]) ?? (doc["name"] as? String)?.components(separatedBy: "/").last ?? UUID().uuidString
                let id = UUID(uuidString: idStr) ?? UUID()
                let type = stringValue(fields["type"]) ?? "Activity"
                let timestamp = dateValue(fields["timestamp"]) ?? Date()
                result.append(ShiftActivity(id: id, type: type, timestamp: timestamp))
            }
            return result.sorted(by: { $0.timestamp > $1.timestamp })
        } catch {
            print("[Firestore Read Error - \(collection)]: \(error.localizedDescription)")
            return []
        }
    }
    
    public func saveShiftActivity(activity: ShiftActivity, session: ClockInSession? = nil, userId: String? = nil, userName: String? = nil, mode: DatabaseMode) async -> Bool {
        
        let collection = mode == .sandbox ? "sandbox_timeClock" : "timeClock"
        
        var fields: [String: Any] = [
            "id": ["stringValue": activity.id.uuidString],
            "type": ["stringValue": activity.type],
            "timestamp": ["timestampValue": iso8601String(from: activity.timestamp)],
            "updatedAt": ["timestampValue": iso8601String(from: Date())]
        ]
        if let uid = userId {
            fields["userId"] = ["stringValue": uid]
        }
        if let un = userName {
            fields["userName"] = ["stringValue": un]
        }
        if let s = session {
            fields["sessionId"] = ["stringValue": s.id.uuidString]
            fields["clockInTime"] = ["timestampValue": iso8601String(from: s.clockInTime)]
            if let out = s.clockOutTime {
                fields["clockOutTime"] = ["timestampValue": iso8601String(from: out)]
            }
        }
        
        return await writeDocument(collection: collection, documentId: activity.id.uuidString, fields: fields)
    }

    // MARK: - Helper to parse raw Firestore document dictionaries
    private func parseDocumentFields(from dataList: [Data]) -> [[String: Any]] {
        var results: [[String: Any]] = []
        for data in dataList {
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let documents = json["documents"] as? [[String: Any]] else { continue }
            for doc in documents {
                guard let fields = doc["fields"] as? [String: Any] else { continue }
                var dict: [String: Any] = [:]
                for (k, v) in fields {
                    if let valMap = v as? [String: Any] {
                        if let s = stringValue(valMap) { dict[k] = s }
                        else if let d = doubleValue(valMap) { dict[k] = d }
                        else if let b = boolValue(valMap) { dict[k] = b }
                        else if let dt = dateValue(valMap) { dict[k] = dt }
                    }
                }
                if let docName = doc["name"] as? String {
                    dict["_id"] = docName.components(separatedBy: "/").last
                }
                results.append(dict)
            }
        }
        return results
    }

    // MARK: - Payments & Transactions
    public func fetchPayments(customerId: String? = nil, mode: DatabaseMode) async -> [[String: Any]] {
        let collection = mode == .sandbox ? "sandbox_payments" : "payments"
        if let cid = customerId {
            return await runStructuredQuery(collection: collection, field: "customerId", value: cid)
        }
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 10)
        return parseDocumentFields(from: dataList)
    }

    public func savePayment(paymentId: String, fields: [String: Any], mode: DatabaseMode) async -> Bool {
        let collection = mode == .sandbox ? "sandbox_payments" : "payments"
        return await writeDocument(collection: collection, documentId: paymentId, fields: fields)
    }

    // MARK: - Root Authorized Persons
    public func fetchRootAuthorizedPersons(customerId: String? = nil, mode: DatabaseMode) async -> [[String: Any]] {
        let collection = mode == .sandbox ? "sandbox_authorizedPersons" : "authorizedPersons"
        if let cid = customerId {
            return await runStructuredQuery(collection: collection, field: "customerId", value: cid)
        }
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 10)
        return parseDocumentFields(from: dataList)
    }

    public func saveRootAuthorizedPerson(personId: String, fields: [String: Any], mode: DatabaseMode) async -> Bool {
        let collection = mode == .sandbox ? "sandbox_authorizedPersons" : "authorizedPersons"
        return await writeDocument(collection: collection, documentId: personId, fields: fields)
    }

    // MARK: - Calls
    public func fetchCalls(customerId: String? = nil, mode: DatabaseMode) async -> [[String: Any]] {
        let collection = mode == .sandbox ? "sandbox_calls" : "calls"
        if let cid = customerId {
            return await runStructuredQuery(collection: collection, field: "customerId", value: cid)
        }
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 5)
        return parseDocumentFields(from: dataList)
    }

    public func saveCall(callId: String, fields: [String: Any], mode: DatabaseMode) async -> Bool {
        let collection = mode == .sandbox ? "sandbox_calls" : "calls"
        return await writeDocument(collection: collection, documentId: callId, fields: fields)
    }

    // MARK: - Warranties
    public func fetchWarranties(mode: DatabaseMode) async -> [[String: Any]] {
        let collection = mode == .sandbox ? "sandbox_warranties" : "warranties"
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 100, maxPages: 2)
        return parseDocumentFields(from: dataList)
    }

    // MARK: - Root Jobs
    public func fetchRootJobs(customerId: String? = nil, mode: DatabaseMode) async -> [[String: Any]] {
        let collection = mode == .sandbox ? "sandbox_jobs" : "jobs"
        if let cid = customerId {
            return await runStructuredQuery(collection: collection, field: "customerId", value: cid)
        }
        let dataList = await fetchAllDocumentData(collection: collection, pageSize: 300, maxPages: 10)
        return parseDocumentFields(from: dataList)
    }
}
