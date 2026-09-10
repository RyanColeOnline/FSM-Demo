import Foundation
import SwiftUI

/// Single-Source Branding Configuration for Apex Field Solutions Mobile App.
public struct BrandingConfig: Sendable {
    public static let companyName = "Apex Field Solutions"
    public static let appDisplayName = "Apex FSM"
    public static let legalName = "Apex Field Solutions LLC"
    public static let tagline = "Intelligent Field Service Management"
    public static let supportEmail = "support@apexfieldsolutions.com"
    public static let supportPhone = "(800) 555-2739"
    public static let website = "https://apexfieldsolutions.com"
    public static let defaultAddress = "100 Innovation Parkway, Suite 400, Orlando, FL 32801"
    public static let bundleId = "com.fsm.demo"
    
    // Theme colors
    public static let primaryColor = Color(red: 15/255, green: 23/255, blue: 42/255) // Slate 900
    public static let accentColor = Color(red: 37/255, green: 99/255, blue: 235/255) // Blue 600
}
