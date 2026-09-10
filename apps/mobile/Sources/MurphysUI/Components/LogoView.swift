import SwiftUI

public struct LogoView: View {
    public init() {}
    
    public var body: some View {
        Image("MurphysLogo")
            .resizable()
            .scaledToFit()
    }
}
