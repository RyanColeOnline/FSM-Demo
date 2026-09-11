import SwiftUI

public struct LogoView: View {
    public init() {}
    
    public var body: some View {
        Image("FSMDemoLogo")
            .resizable()
            .scaledToFit()
    }
}
