import SwiftUI

public struct SettingsScreen: View {
    @Environment(ScheduleStore.self) var scheduleStore
    var sessionManager = SessionManager.shared
    
    @AppStorage("mapPreference") var mapPreference = "Apple Maps"
    @AppStorage("appTheme") var appTheme = "System"
    @AppStorage("fsm_database_mode") var databaseMode = "Sandbox"
    
    @State var showSignOutConfirmation = false
    
    var userInitials: String {
        let name = sessionManager.currentUser?.name ?? "Justin Lung"
        let components = name.split(separator: " ").filter { !$0.isEmpty }
        if components.count >= 2 {
            let first = components[0].prefix(1)
            let last = components[components.count - 1].prefix(1)
            return "\(first)\(last)".uppercased()
        } else if let single = components.first {
            return String(single.prefix(2)).uppercased()
        }
        return "JL"
    }
    
    private var isSandboxAvailable: Bool {
        #if DEBUG
        return true
        #else
        #if os(iOS)
        return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        #else
        return false
        #endif
        #endif
    }
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                
                // Centered Profile Avatar with Initials and System Gray Ring
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color(red: 10/255.0, green: 25/255.0, blue: 55/255.0))
                            .frame(width: 70, height: 70)
                        
                        Text(userInitials)
                            .font(.title.weight(.bold))
                            .foregroundColor(.white)
                    }
                    .overlay(
                        Circle()
                            .stroke(Color.secondary.opacity(0.35), lineWidth: 2.5)
                    )
                    
                    Text(sessionManager.currentUser?.name ?? "Justin Lung")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    profileBadgesView
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                
                // Form Sections inside Grouped Layout
                VStack(spacing: 20) {
                    // General Section Table
                    VStack(alignment: .leading, spacing: 8) {
                        Text("GENERAL")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 16)
                        
                        VStack(spacing: 0) {
                            // Map Preference
                            HStack {
                                Text("Map Preference")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                    .lineLimit(1)
                                    #if os(iOS)
                                    .layoutPriority(1)
                                    #endif
                                Spacer(minLength: 8)
                                Picker("Map Preference", selection: Binding(
                                    get: { sessionManager.currentUser?.deviceProfile.mapsPreference ?? mapPreference },
                                    set: { newMap in
                                        mapPreference = newMap
                                        sessionManager.currentUser?.deviceProfile.mapsPreference = newMap
                                        UserDefaults.standard.set(newMap, forKey: "user_map_preference")
                                    }
                                )) {
                                    Text("Apple Maps").tag("Apple Maps")
                                    Text("Google Maps").tag("Google Maps")
                                    Text("Waze").tag("Waze")
                                }
                                .pickerStyle(.menu)
                                .font(.callout)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                                .fixedSize(horizontal: true, vertical: false)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            
                            Divider()
                                .padding(.horizontal, 16)
                            
                            // App Theme
                            HStack {
                                Text("App Theme")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                    .lineLimit(1)
                                    #if os(iOS)
                                    .layoutPriority(1)
                                    #endif
                                Spacer(minLength: 8)
                                Picker("App Theme", selection: Binding(
                                    get: { sessionManager.currentUser?.deviceProfile.appTheme ?? appTheme },
                                    set: { newTheme in
                                        appTheme = newTheme
                                        sessionManager.currentUser?.deviceProfile.appTheme = newTheme
                                        UserDefaults.standard.set(newTheme, forKey: "user_app_theme")
                                        #if os(iOS)
                                        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
                                            for window in windowScene.windows {
                                                if newTheme == "Dark" {
                                                    window.overrideUserInterfaceStyle = .dark
                                                } else if newTheme == "Light" {
                                                    window.overrideUserInterfaceStyle = .light
                                                } else {
                                                    window.overrideUserInterfaceStyle = .unspecified
                                                }
                                            }
                                        }
                                        #endif
                                    }
                                )) {
                                    Text("System").tag("System")
                                    Text("Light").tag("Light")
                                    Text("Dark").tag("Dark")
                                }
                                .pickerStyle(.menu)
                                .font(.callout)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                                .fixedSize(horizontal: true, vertical: false)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        .background(Color.murphysCardBackground)
                        .cornerRadius(12)
                        .padding(.horizontal, 16)
                    }
                    
                    // Sandbox Section
                    if isSandboxAvailable {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("SANDBOX RBAC REVIEW")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 16)
                            
                            VStack(spacing: 0) {
                                // Account Type Picker
                                HStack {
                                    Text("Account Type")
                                        .font(.callout)
                                        .foregroundColor(.primary)
                                        .lineLimit(1)
                                        #if os(iOS)
                                        .layoutPriority(1)
                                        #endif
                                    Spacer(minLength: 8)
                                    Picker("Account Type", selection: Binding(
                                        get: { sessionManager.currentUser?.accountType ?? .field },
                                        set: { newType in
                                            let currentGroup = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
                                            sessionManager.switchRole(accountType: newType, dispatchGroup: currentGroup)
                                        }
                                    )) {
                                        ForEach(AccountType.allCases.filter { $0 != .office }) { type in
                                            Text(type.displayName).tag(type)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                                    .fixedSize(horizontal: true, vertical: false)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                
                                Divider()
                                    .padding(.horizontal, 16)
                                
                                // Dispatch Group Picker
                                HStack {
                                    Text("Dispatch Group")
                                        .font(.callout)
                                        .foregroundColor(.primary)
                                        .lineLimit(1)
                                        #if os(iOS)
                                        .layoutPriority(1)
                                        #endif
                                    Spacer(minLength: 8)
                                    Picker("Dispatch Group", selection: Binding(
                                        get: { sessionManager.currentUser?.dispatchGroup ?? .applianceTechs },
                                        set: { newGroup in
                                            let currentType = sessionManager.currentUser?.accountType ?? .field
                                            sessionManager.switchRole(accountType: currentType, dispatchGroup: newGroup)
                                        }
                                    )) {
                                        ForEach(DispatchGroupCategory.allCases) { group in
                                            Text(group.displayName).tag(group)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                                    .fixedSize(horizontal: true, vertical: false)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                
                                let isJustinLung = (sessionManager.currentUser?.email.lowercased().contains("justinlung") == true) ||
                                                   (sessionManager.currentUser?.name.lowercased().trimmingCharacters(in: .whitespaces) == "justin lung") ||
                                                   (sessionManager.currentUser?.id == "v3kdSQRts0Oh0ocYaLaHFCX8IA12") ||
                                                   (sessionManager.currentUser?.id == "usr-2")
                                
                                if isJustinLung {
                                    Divider()
                                        .padding(.horizontal, 16)
                                    
                                    // Database Mode Picker (Admin Gated)
                                    HStack {
                                        Text("Database")
                                            .font(.callout)
                                            .foregroundColor(.primary)
                                            .lineLimit(1)
                                            #if os(iOS)
                                            .layoutPriority(1)
                                            #endif
                                        Spacer(minLength: 8)
                                        Picker("Database", selection: Binding(
                                            get: { databaseMode },
                                            set: { newMode in
                                                databaseMode = newMode
                                                UserDefaults.standard.set(newMode, forKey: "fsm_database_mode")
                                                NotificationCenter.default.post(name: .databaseModeDidChange, object: newMode)
                                            }
                                        )) {
                                            ForEach(DatabaseMode.allCases) { mode in
                                                Text(mode.displayName).tag(mode.rawValue)
                                            }
                                        }
                                        .pickerStyle(.menu)
                                        .font(.callout)
                                        .foregroundColor(.secondary)
                                        .lineLimit(1)
                                        .fixedSize(horizontal: true, vertical: false)
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 12)
                                }
                            }
                            .background(Color.murphysCardBackground)
                            .cornerRadius(12)
                            .padding(.horizontal, 16)
                        }
                    }
                    
                    // Sign Out Button
                    Button(action: {
                        showSignOutConfirmation = true
                    }) {
                        Text("Sign Out")
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 12)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .padding(.horizontal, 16)
                }
                .padding(.bottom, 28)
            }
        }
        .tint(.secondary)
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Settings")
        #if os(iOS)
        .toolbarTitleDisplayMode(.inlineLarge)
        #endif
        #if os(iOS)
        .toolbarBackground(.visible, for: .navigationBar)
        #endif
        .alert("Sign Out", isPresented: $showSignOutConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Sign Out", role: .destructive) {
                sessionManager.signOut()
            }
        } message: {
            Text("Are you sure you want to sign out of your account?")
        }
    }
    
    @ViewBuilder
    private var profileBadgesView: some View {
        let user = sessionManager.currentUser
        let group = user?.dispatchGroup ?? .applianceTechs
        let accountType = user?.accountType ?? .field
        
        let groupLabel: String = {
            switch group {
            case .hvacTechs: return "HVAC"
            case .applianceTechs: return "Appliance"
            case .installer: return "Installer"
            case .officeStaff: return "Office Staff"
            }
        }()
        
        HStack(spacing: 8) {
            if accountType == .admin {
                ProfileRolePillView(label: groupLabel)
                ProfileRolePillView(label: "Admin")
            } else if accountType == .office {
                ProfileRolePillView(label: groupLabel)
                ProfileRolePillView(label: "Admin")
            } else {
                ProfileRolePillView(label: groupLabel)
            }
        }
    }
}
