import SwiftUI

public struct RootView: View {
    var sessionManager = SessionManager.shared
    @AppStorage("appTheme") var appTheme = "System"
    
    public init() {}
    
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
    
    public var body: some View {
        Group {
            switch sessionManager.authState {
            case .loading:
                LaunchSplashView()
                    .transition(.opacity)
            case .unauthenticated:
                LoginScreen()
                    .transition(.opacity)
            case .authenticated:
                MainAppTabShell()
                    .transition(.opacity)
            }
        }
        .preferredColorScheme(preferredColorScheme)
        .scrollDismissesKeyboard(.interactively)
        .animation(.easeInOut(duration: 0.3), value: sessionManager.authState)
    }
}

// MARK: - Native Splash Matcher View (Zero Flicker)
public struct LaunchSplashView: View {
    public init() {}
    
    public var body: some View {
        Color.black
            .ignoresSafeArea()
    }
}
