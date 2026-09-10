import SwiftUI
import MurphysUI
#if os(iOS)
import UIKit
#endif
#if canImport(FirebaseCore)
import FirebaseCore
#elseif canImport(Firebase)
import Firebase
#endif

#if os(iOS)
class AnyTapDismissGestureRecognizer: UITapGestureRecognizer, UIGestureRecognizerDelegate {
    override init(target: Any?, action: Selector?) {
        super.init(target: target, action: action)
        cancelsTouchesInView = false
        delegate = self
    }
    
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        return true
    }
}

@MainActor
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        return OrientationManager.orientationLock
    }
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        #if canImport(FirebaseCore)
        FirebaseApp.configure()
        #elseif canImport(Firebase)
        FirebaseApp.configure()
        #endif
        
        let theme = UserDefaults.standard.string(forKey: "appTheme") ?? "System"
        if theme == "Dark" {
            UIWindow.appearance().overrideUserInterfaceStyle = .dark
        } else if theme == "Light" {
            UIWindow.appearance().overrideUserInterfaceStyle = .light
        } else {
            UIWindow.appearance().overrideUserInterfaceStyle = .unspecified
        }
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(windowDidBecomeVisible(_:)),
            name: UIWindow.didBecomeVisibleNotification,
            object: nil
        )
        
        return true
    }
    
    @objc private func windowDidBecomeVisible(_ notification: Notification) {
        if let window = notification.object as? UIWindow, type(of: window) == UIWindow.self {
            let tap = AnyTapDismissGestureRecognizer(target: window, action: #selector(UIView.endEditing(_:)))
            window.addGestureRecognizer(tap)
        }
    }
}
#endif

@main
struct MurphysApp: App {
    #if os(iOS)
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    #endif
    
    public init() {
        #if !os(iOS)
        #if canImport(FirebaseCore)
        FirebaseApp.configure()
        #elseif canImport(Firebase)
        FirebaseApp.configure()
        #endif
        #endif
    }
    
    public var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

