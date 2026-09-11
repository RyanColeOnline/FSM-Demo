import SwiftUI

#if canImport(UIKit)
import UIKit
#endif

extension Color {
    public static var murphysGroupedBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .systemGroupedBackground)
        #else
        return Color(white: 0.95)
        #endif
    }
    
    public static var murphysCardBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .secondarySystemGroupedBackground)
        #else
        return Color.white
        #endif
    }
    
    public static var murphysSecondaryAccent: Color {
        #if canImport(UIKit)
        return Color(uiColor: .systemGray)
        #else
        return Color.gray
        #endif
    }
    
    public static var murphysSecondaryGroupedBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .secondarySystemGroupedBackground)
        #else
        return Color.white
        #endif
    }
    
    public static var murphysSecondaryBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .secondarySystemBackground)
        #else
        return Color(white: 0.90)
        #endif
    }
    
    public static var murphysSystemBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .systemBackground)
        #else
        return Color.white
        #endif
    }
    
    public static var murphysModalBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .systemGroupedBackground)
        #else
        return Color(white: 0.95)
        #endif
    }
}

