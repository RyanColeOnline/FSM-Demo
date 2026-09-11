import SwiftUI
import Observation
public struct DeviceProfile: Codable, Sendable, Equatable {
    public var mapsPreference: String // "Apple Maps", "Google Maps", "Waze"
    public var appTheme: String // "System", "Light", "Dark"
    
    public init(
        mapsPreference: String = "Apple Maps",
        appTheme: String = "System"
    ) {
        self.mapsPreference = mapsPreference
        self.appTheme = appTheme
    }
}

public struct UserSession: Identifiable, Codable, Sendable, Equatable {
    public var id: String
    public var name: String
    public var initials: String?
    public var avatarUrl: String?
    public var email: String
    public var accountType: AccountType
    public var dispatchGroup: DispatchGroupCategory
    public var permissions: UserPermissions
    public var token: String
    public var deviceProfile: DeviceProfile
    
    public init(
        id: String = "usr-2",
        name: String = "Justin Lung",
        initials: String? = "JL",
        avatarUrl: String? = nil,
        email: String = "justinlung@murphyshomeservices.com",
        accountType: AccountType = .admin,
        dispatchGroup: DispatchGroupCategory = .applianceTechs,
        permissions: UserPermissions? = nil,
        token: String = "session_token_default",
        deviceProfile: DeviceProfile = DeviceProfile()
    ) {
        self.id = id
        self.name = name
        self.initials = initials
        self.avatarUrl = avatarUrl
        self.email = email
        self.accountType = accountType
        self.dispatchGroup = dispatchGroup
        self.permissions = permissions ?? UserPermissions.default(for: accountType)
        self.token = token
        self.deviceProfile = deviceProfile
    }
}

public enum AuthState: Equatable, Sendable {
    case loading
    case authenticated(UserSession)
    case unauthenticated
}

@Observable
public final class SessionManager: @unchecked Sendable {
    public static let shared = SessionManager()
    
    public var authState: AuthState = .loading
    public var currentUser: UserSession? = nil
    
    public var permissions: UserPermissions {
        currentUser?.permissions ?? .default(for: .admin)
    }
    
    private let keychain = KeychainManager.shared
    private let firebaseApiKey = "AIzaSyACnlivHZXwO_2yGO7yjlAK4XQ_XJDl26M"
    private let projectId = "murphys-fsm-staging"
    
    public init() {
        checkCurrentSession()
    }
    
    // MARK: - Initial Session Check (Non-blocking)
    public func checkCurrentSession() {
        if let token = keychain.getToken(for: "currentUser"), !token.isEmpty {
            let savedUserId = keychain.getToken(for: "currentUserId") ?? "usr-2"
            let savedEmail = keychain.getToken(for: "currentUserEmail") ?? "justinlung@murphyshomeservices.com"
            let savedName = keychain.getToken(for: "currentUserName") ?? "Justin Lung"
            let isAdmin = savedName.contains("Justin") || savedName.contains("Nancy") || savedName.contains("Andrew")
            let defaultType: AccountType = isAdmin ? .admin : (savedName.contains("Danny") || savedName.contains("Amanda") || savedName.contains("Dunlap") ? .office : .field)
            let isNancy = savedName.contains("Nancy") || savedEmail.contains("nancy")
            let isAndrew = savedName.contains("Andrew") || savedEmail.contains("andrew")
            let isOffice = isNancy || savedEmail.contains("amanda") || savedEmail.contains("danny")
            let defaultGroup: DispatchGroupCategory = isOffice ? .officeStaff : (isAndrew ? .hvacTechs : .applianceTechs)
            
            let session = UserSession(
                id: savedUserId,
                name: savedName,
                email: savedEmail,
                accountType: defaultType,
                dispatchGroup: defaultGroup,
                permissions: UserPermissions.default(for: defaultType),
                token: token
            )
            self.currentUser = session
            self.authState = .authenticated(session)
        } else {
            self.currentUser = nil
            self.authState = .unauthenticated
        }
    }
    
    // MARK: - Firebase REST Sign In (Email / Password)
    @discardableResult
    public func signIn(email: String, password: String) async -> (success: Bool, error: String?) {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !password.isEmpty else {
            return (false, "Please enter your email and password.")
        }
        
        let urlString = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=\(firebaseApiKey)"
        guard let url = URL(string: urlString) else {
            return (false, "Invalid authentication endpoint.")
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "email": trimmedEmail,
            "password": password,
            "returnSecureToken": true
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return (false, "Invalid network response from server.")
            }
            
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                return (false, "Unable to parse authentication response.")
            }
            
            if (200...299).contains(httpResponse.statusCode) {
                let localId = json["localId"] as? String ?? UUID().uuidString
                let idToken = json["idToken"] as? String ?? "token_\(localId)"
                let refreshToken = json["refreshToken"] as? String
                let resEmail = json["email"] as? String ?? trimmedEmail
                let resDisplayName = json["displayName"] as? String
                
                // Fetch / Hydrate matching user profile from Firestore /users/{uid}
                let profile = await fetchFirestoreUserProfile(uid: localId, email: resEmail, token: idToken)
                
                let userName = profile?["name"] as? String ?? profile?["displayName"] as? String ?? resDisplayName ?? resEmail.components(separatedBy: "@").first?.capitalized ?? "Murphy Staff"
                
                var rawAccountType = (profile?["accountType"] as? String ?? profile?["role"] as? String ?? "field").lowercased()
                if let rawPerms = profile?["permissions"] as? [String: Any],
                   let accType = rawPerms["accountType"] as? String {
                    rawAccountType = accType.lowercased()
                }
                var accountType: AccountType = rawAccountType.contains("admin") ? .admin : (rawAccountType.contains("office") ? .office : .field)
                if userName.contains("Justin Lung") || userName.contains("Nancy Murphy") || userName.contains("Andrew (Jr) Murphy") {
                    accountType = .admin
                } else if userName.contains("Danny Pardo") || userName.contains("Amanda Hoover") || userName.contains("Justin Dunlap") {
                    accountType = .office
                }
                
                let rawGroup: String = {
                    if let dgArr = profile?["dispatchGroups"] as? [String], let first = dgArr.first {
                        return first.lowercased()
                    }
                    if let dgArrAny = profile?["dispatchGroups"] as? [Any], let first = dgArrAny.first as? String {
                        return first.lowercased()
                    }
                    return (profile?["dispatchGroup"] as? String ?? "").lowercased()
                }()
                let dispatchGroup: DispatchGroupCategory = {
                    if rawGroup.contains("office") || userName.contains("Nancy Murphy") || userName.contains("Danny Pardo") || userName.contains("Amanda Hoover") || userName.contains("Justin Dunlap") {
                        return .officeStaff
                    } else if rawGroup.contains("hvac") || userName.contains("Andrew (Jr) Murphy") {
                        return .hvacTechs
                    } else if rawGroup.contains("install") {
                        return .installer
                    }
                    return .applianceTechs
                }()
                
                var userPerms = UserPermissions.default(for: accountType)
                if let rawPerms = profile?["permissions"] as? [String: Any] {
                    if let apptVis = rawPerms["appointmentVisibility"] as? String {
                        userPerms.appointmentVisibility = apptVis
                    }
                    if let allCust = rawPerms["allCustomerVisibility"] as? Bool {
                        userPerms.allCustomerVisibility = allCust
                    }
                    if let repVis = rawPerms["reportingTabVisibility"] as? Bool {
                        userPerms.reportingTabVisibility = repVis
                    }
                    if let moreVis = rawPerms["moreAppsAndSettingsVisibility"] as? Bool {
                        userPerms.moreAppsAndSettingsVisibility = moreVis
                    }
                    if let manualCard = rawPerms["manuallyEnterCards"] as? Bool {
                        userPerms.manuallyEnterCards = manualCard
                    }
                    if let recurPay = rawPerms["manageRecurringPayments"] as? Bool {
                        userPerms.manageRecurringPayments = recurPay
                    }
                    if let credVoid = rawPerms["performCreditsAndVoids"] as? Bool {
                        userPerms.performCreditsAndVoids = credVoid
                    }
                    if let finActions = rawPerms["performFinancingActions"] as? Bool {
                        userPerms.performFinancingActions = finActions
                    }
                    if let schedEvents = rawPerms["scheduleEventsPermission"] as? String {
                        userPerms.scheduleEventsPermission = schedEvents
                    }
                    if let editPrices = rawPerms["editPricesAndTaxOnMobile"] as? Bool {
                        userPerms.editPricesAndTaxOnMobile = editPrices
                    }
                    if let customItems = rawPerms["createCustomLineItems"] as? Bool {
                        userPerms.createCustomLineItems = customItems
                    }
                    if let pnl = rawPerms["viewJobPnL"] as? Bool {
                        userPerms.viewJobPnL = pnl
                    }
                }
                
                let session = UserSession(
                    id: localId,
                    name: userName,
                    email: resEmail,
                    accountType: accountType,
                    dispatchGroup: dispatchGroup,
                    permissions: userPerms,
                    token: idToken
                )
                
                // Persist session tokens
                keychain.saveToken(idToken, for: "currentUser")
                if let rt = refreshToken, !rt.isEmpty {
                    keychain.saveToken(rt, for: "currentUserRefreshToken")
                }
                keychain.saveToken(localId, for: "currentUserId")
                keychain.saveToken(resEmail, for: "currentUserEmail")
                keychain.saveToken(userName, for: "currentUserName")
                
                await MainActor.run {
                    self.currentUser = session
                    withAnimation(.easeInOut(duration: 0.35)) {
                        self.authState = .authenticated(session)
                    }
                }
                return (true, nil)
            } else {
                if let errorObj = json["error"] as? [String: Any],
                   let message = errorObj["message"] as? String {
                    if message.contains("INVALID_LOGIN_CREDENTIALS") || message.contains("EMAIL_NOT_FOUND") || message.contains("INVALID_PASSWORD") {
                        return (false, "Invalid email address or password.")
                    } else if message.contains("USER_DISABLED") {
                        return (false, "This user account has been disabled.")
                    } else if message.contains("TOO_MANY_ATTEMPTS_TRY_LATER") {
                        return (false, "Too many failed attempts. Please try again later.")
                    }
                    return (false, message)
                }
                return (false, "Unable to sign in. Please verify your credentials.")
            }
        } catch {
            return (false, "Network connection error: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Send Password Reset Email
    public func sendPasswordReset(email: String) async -> (success: Bool, error: String?) {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty else {
            return (false, "Please enter your email address.")
        }
        
        let urlString = "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=\(firebaseApiKey)"
        guard let url = URL(string: urlString) else {
            return (false, "Invalid endpoint.")
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let payload: [String: Any] = [
            "requestType": "PASSWORD_RESET",
            "email": trimmedEmail
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return (false, "Invalid network response.")
            }
            
            if (200...299).contains(httpResponse.statusCode) {
                return (true, nil)
            } else {
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let errorObj = json["error"] as? [String: Any],
                   let message = errorObj["message"] as? String {
                    if message.contains("EMAIL_NOT_FOUND") {
                        return (false, "No user account found with this email.")
                    }
                    return (false, message)
                }
                return (false, "Failed to send password reset email.")
            }
        } catch {
            return (false, error.localizedDescription)
        }
    }
    
    // MARK: - Helper: Parse Nested Firestore Values
    private func parseFirestoreValue(_ valDict: [String: Any]) -> Any? {
        if let strVal = valDict["stringValue"] as? String {
            return strVal
        } else if let boolVal = valDict["booleanValue"] as? Bool {
            return boolVal
        } else if let intVal = valDict["integerValue"] as? String {
            return Int(intVal) ?? 0
        } else if let mapVal = valDict["mapValue"] as? [String: Any],
                  let subFields = mapVal["fields"] as? [String: [String: Any]] {
            var subDict: [String: Any] = [:]
            for (subK, subV) in subFields {
                if let parsed = parseFirestoreValue(subV) {
                    subDict[subK] = parsed
                }
            }
            return subDict
        } else if let arrayVal = valDict["arrayValue"] as? [String: Any],
                  let values = arrayVal["values"] as? [[String: Any]] {
            return values.compactMap { parseFirestoreValue($0) }
        }
        return nil
    }
    
    // MARK: - Helper: Fetch Firestore User Profile (/users/{uid} or matching email)
    private func fetchFirestoreUserProfile(uid: String, email: String, token: String? = nil) async -> [String: Any]? {
        // 1. Direct fetch by UID
        let urlString = "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents/users/\(uid)"
        if let url = URL(string: urlString) {
            var req = URLRequest(url: url)
            if let token = token, !token.isEmpty {
                req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            if let (data, response) = try? await URLSession.shared.data(for: req),
               let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let fields = json["fields"] as? [String: [String: Any]] {
                var extracted: [String: Any] = [:]
                for (key, valDict) in fields {
                    if let parsed = parseFirestoreValue(valDict) {
                        extracted[key] = parsed
                    }
                }
                return extracted
            }
        }
        
        // 2. Fallback: match from all users in Firestore by email or UID
        let allUsersData = await FirestoreClient.shared.fetchAllDocumentData(collection: "users")
        for data in allUsersData {
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let documents = json["documents"] as? [[String: Any]] else { continue }
            for doc in documents {
                guard let fields = doc["fields"] as? [String: [String: Any]] else { continue }
                var extracted: [String: Any] = [:]
                for (key, valDict) in fields {
                    if let parsed = parseFirestoreValue(valDict) {
                        extracted[key] = parsed
                    }
                }
                let docEmail = (extracted["email"] as? String ?? "").lowercased()
                let docUid = extracted["id"] as? String ?? extracted["uid"] as? String ?? ""
                if (!email.isEmpty && docEmail == email.lowercased()) || (!uid.isEmpty && docUid == uid) {
                    return extracted
                }
            }
        }
        
        return nil
    }

    // MARK: - Token Validation & Automatic Refresh
    public func getValidIdToken() async -> String? {
        let currentToken = currentUser?.token ?? keychain.getToken(for: "currentUser")
        if let token = currentToken, !token.isEmpty,
           !token.starts(with: "session_token_"),
           !token.starts(with: "token_"),
           !token.starts(with: "live_token_") {
            if isTokenValid(jwt: token) {
                return token
            }
        }
        
        // Stored token is missing, expired, or synthetic -> try refresh token
        if let refreshToken = keychain.getToken(for: "currentUserRefreshToken"), !refreshToken.isEmpty {
            if let freshToken = await refreshIdToken(refreshToken: refreshToken) {
                return freshToken
            }
        }
        
        return nil
    }
    
    public func refreshIdToken(refreshToken: String) async -> String? {
        let urlString = "https://securetoken.googleapis.com/v1/token?key=\(firebaseApiKey)"
        guard let url = URL(string: urlString) else { return nil }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        let bodyString = "grant_type=refresh_token&refresh_token=\(refreshToken)"
        request.httpBody = bodyString.data(using: .utf8)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
                return nil
            }
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let newIdToken = json["id_token"] as? String else {
                return nil
            }
            
            if let newRefreshToken = json["refresh_token"] as? String, !newRefreshToken.isEmpty {
                keychain.saveToken(newRefreshToken, for: "currentUserRefreshToken")
            }
            keychain.saveToken(newIdToken, for: "currentUser")
            
            await MainActor.run {
                self.currentUser?.token = newIdToken
            }
            return newIdToken
        } catch {
            return nil
        }
    }
    
    private func isTokenValid(jwt: String) -> Bool {
        let parts = jwt.components(separatedBy: ".")
        guard parts.count == 3 else { return false }
        var base64 = parts[1]
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 {
            base64.append("=")
        }
        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else {
            return false
        }
        // Valid if expiration is more than 60 seconds away
        return Date().timeIntervalSince1970 < (exp - 60)
    }
    
    // MARK: - Sign Out
    public func signOut() {
        keychain.deleteToken(for: "currentUser")
        keychain.deleteToken(for: "currentUserRefreshToken")
        keychain.deleteToken(for: "currentUserId")
        keychain.deleteToken(for: "currentUserEmail")
        keychain.deleteToken(for: "currentUserName")
        keychain.clearAll()
        
        DispatchQueue.main.async {
            self.currentUser = nil
            withAnimation(.easeInOut(duration: 0.35)) {
                self.authState = .unauthenticated
            }
        }
    }
    
    public func switchRole(accountType: AccountType, dispatchGroup: DispatchGroupCategory) {
        let updatedUser = UserSession(
            id: currentUser?.id ?? "v3kdSQRts0Oh0ocYaLaHFCX8IA12",
            name: currentUser?.name ?? "Justin Lung",
            email: currentUser?.email ?? "justinlung@murphyshomeservices.com",
            accountType: accountType,
            dispatchGroup: dispatchGroup,
            permissions: UserPermissions.default(for: accountType),
            token: currentUser?.token ?? "session_token_default"
        )
        self.currentUser = updatedUser
        self.authState = .authenticated(updatedUser)
    }
}
