import SwiftUI

public struct MainAppTabShell: View {
    @State var selectedTab = 0
    @AppStorage("appTheme") var appTheme = "System"
    
    var preferredColorScheme: ColorScheme? {
        switch appTheme {
        case "Light":
            return .light
        case "Dark":
            return .dark
        default:
            return nil
        }
    }
    
    public init() {
        #if os(iOS)
        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterial)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        #endif
    }
    
    public var body: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Field
            NavigationStack {
                DashboardScreen()
            }
            .tabItem {
                Label {
                    Text("Jobs")
                } icon: {
                    Image(systemName: selectedTab == 0 ? "wrench.and.screwdriver.fill" : "wrench.and.screwdriver")
                        .unselectedSymbolVariants()
                }
            }
            .tag(0)
            
            // Tab 2: Customers
            NavigationStack {
                CustomerListScreen(navigationTitle: "Customers", forceEmpty: false)
            }
            .tabItem {
                Label {
                    Text("Customers")
                } icon: {
                    Image(systemName: selectedTab == 1 ? "person.2.fill" : "person.2")
                        .unselectedSymbolVariants()
                }
            }
            .tag(1)
            
            // Tab 3: Payments
            NavigationStack {
                PaymentsScreen()
            }
            .tabItem {
                Label {
                    Text("Payments")
                } icon: {
                    Image(systemName: selectedTab == 2 ? "dollarsign.bank.building.fill" : "dollarsign.bank.building")
                        .unselectedSymbolVariants()
                }
            }
            .tag(2)
            
            // Tab 4: Office (Moved to old Alerts position)
            NavigationStack {
                CustomerListScreen(navigationTitle: "Office", forceEmpty: false)
            }
            .tabItem {
                Label {
                    Text("Office")
                } icon: {
                    Image(systemName: selectedTab == 3 ? "list.bullet.clipboard.fill" : "list.bullet.clipboard")
                        .unselectedSymbolVariants()
                }
            }
            .tag(3)
            
            // Tab 5: Settings
            NavigationStack {
                SettingsScreen()
            }
            .tabItem {
                Label {
                    Text("Settings")
                } icon: {
                    Image(systemName: selectedTab == 4 ? "gearshape.fill" : "gearshape")
                        .unselectedSymbolVariants()
                }
            }
            .tag(4)
        }
        .environment(CustomerStore.shared)
        .environment(ScheduleStore.shared)
        .environment(PriceBookStore.shared)
        .environment(EquipmentStore.shared)
        .environment(InvoiceStore.shared)
        .environment(ProposalStore.shared)
        .environment(MaintenancePlanStore.shared)
        .environment(ChecklistStore.shared)
        .environment(NoteStore.shared)
        .environment(AttachmentStore.shared)
        .environment(FollowUpStore.shared)
        .preferredColorScheme(preferredColorScheme)
        #if os(iOS)
        .textSelection(.enabled)
        #endif
    }
}

extension View {
    @ViewBuilder func unselectedSymbolVariants() -> some View {
        #if os(iOS) || os(macOS)
        self.environment(\.symbolVariants, .none)
        #else
        self
        #endif
    }
}
