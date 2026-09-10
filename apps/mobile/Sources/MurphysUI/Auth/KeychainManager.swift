import Foundation
#if canImport(Security)
import Security
#endif

public final class KeychainManager: @unchecked Sendable {
    public static let shared = KeychainManager()
    
    private let serviceName = "com.murphys.app.auth"
    private let queue = DispatchQueue(label: "com.murphys.app.keychain", qos: .userInitiated)
    
    private init() {}
    
    // MARK: - Save Token
    @discardableResult
    public func saveToken(_ token: String, for account: String = "currentUser") -> Bool {
        #if os(iOS)
        guard let data = token.data(using: .utf8) else { return false }
        
        // Delete any existing item first
        deleteToken(for: account)
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
        #else
        UserDefaults.standard.set(token, forKey: "\(serviceName).\(account)")
        return true
        #endif
    }
    
    // MARK: - Get Token
    public func getToken(for account: String = "currentUser") -> String? {
        #if os(iOS)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess, let data = dataTypeRef as? Data {
            return String(data: data, encoding: .utf8)
        }
        return nil
        #else
        return UserDefaults.standard.string(forKey: "\(serviceName).\(account)")
        #endif
    }
    
    // MARK: - Delete Token
    @discardableResult
    public func deleteToken(for account: String = "currentUser") -> Bool {
        #if os(iOS)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: account
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
        #else
        UserDefaults.standard.removeObject(forKey: "\(serviceName).\(account)")
        return true
        #endif
    }
    
    // MARK: - Clear All
    public func clearAll() {
        #if os(iOS)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName
        ]
        SecItemDelete(query as CFDictionary)
        #else
        UserDefaults.standard.removeObject(forKey: "\(serviceName).currentUser")
        #endif
    }
}
