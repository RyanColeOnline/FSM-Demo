import SwiftUI

/// A reusable glassmorphic capsule button styled after iOS controls
public struct GlassCapsuleButton: View {
    public var title: String
    public var action: () -> Void
    
    public init(title: String, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }
    
    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundColor(Color.primary.opacity(0.7))
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(Color(white: 0.95).opacity(0.5))
                        .overlay(
                            Capsule()
                                .stroke(Color.black.opacity(0.08), lineWidth: 0.5)
                        )
                )
                .shadow(color: Color.black.opacity(0.02), radius: 1, y: 1)
        }
    }
}

/// A standard card container with subtle shadow and border
public struct CardView<Content: View>: View {
    public var content: Content
    
    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    public var body: some View {
        content
            .padding()
            .background(Color.murphysSystemBackground)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.black.opacity(0.05), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.02), radius: 4, x: 0, y: 2)
    }
}

/// Large action button used for submit/save actions
public struct PrimaryActionButton: View {
    public var title: String
    public var isEnabled: Bool
    public var action: () -> Void
    
    public init(title: String, isEnabled: Bool = true, action: @escaping () -> Void) {
        self.title = title
        self.isEnabled = isEnabled
        self.action = action
    }
    
    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(.callout.weight(.bold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(isEnabled ? Color.blue : Color.gray.opacity(0.4))
                .cornerRadius(16)
        }
        .disabled(!isEnabled)
    }
}

public struct GlassStyleConfiguration: Sendable {
    public static let regular = GlassStyleConfiguration()
    public func interactive() -> GlassStyleConfiguration { self }
}

public struct GlassShape: Sendable {
    public static let circle = GlassShape(kind: .circle)
    public static let rectangle = GlassShape(kind: .rectangle)
    
    fileprivate enum Kind {
        case circle
        case rectangle
    }
    fileprivate let kind: Kind
}

/// A liquid glass effect modifier styled after modern iOS glassmorphism controls
public struct GlassEffectShapeModifier: ViewModifier {
    var isCircle: Bool
    
    public init(isCircle: Bool = false) {
        self.isCircle = isCircle
    }
    
    public func body(content: Content) -> some View {
        content
            .background(glassBackground)
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
    
    @ViewBuilder
    private var glassBackground: some View {
        if isCircle {
            #if os(iOS)
            Circle()
                .fill(.ultraThinMaterial)
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.35), lineWidth: 0.5)
                )
            #else
            Circle()
                .fill(Color.primary.opacity(0.06))
                .overlay(
                    Circle()
                        .stroke(Color.primary.opacity(0.1), lineWidth: 0.5)
                )
            #endif
        } else {
            #if os(iOS)
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.white.opacity(0.35), lineWidth: 0.5)
                )
            #else
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.primary.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.primary.opacity(0.1), lineWidth: 0.5)
                )
            #endif
        }
    }
}

extension View {
    public func glassEffect() -> some View {
        self.modifier(GlassEffectShapeModifier(isCircle: false))
    }
    
    public func glassEffect(_ style: GlassStyleConfiguration = .regular, in shape: GlassShape = .rectangle) -> some View {
        self.modifier(GlassEffectShapeModifier(isCircle: shape.kind == .circle))
    }
}

/// A container that batches rendering for liquid glass effect controls
public struct GlassEffectContainer<Content: View>: View {
    public var spacing: CGFloat
    public var content: Content
    
    public init(spacing: CGFloat = 16.0, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }
    
    public var body: some View {
        content
    }
}

/// A native circular liquid glass button style
public struct GlassButtonStyle: ButtonStyle {
    public init() {}
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(circleBackground)
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
            .scaleEffect(configuration.isPressed ? 0.94 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
    
    @ViewBuilder
    private var circleBackground: some View {
        #if os(iOS)
        Circle()
            .fill(Color.murphysCardBackground)
            .shadow(color: Color.black.opacity(0.08), radius: 6, x: 0, y: 3)
            .overlay(
                Circle()
                    .stroke(Color.primary.opacity(0.06), lineWidth: 0.5)
            )
        #else
        Circle()
            .fill(Color.murphysCardBackground)
            .overlay(
                Circle()
                    .stroke(Color.primary.opacity(0.06), lineWidth: 0.5)
            )
        #endif
    }
}

extension ButtonStyle where Self == GlassButtonStyle {
    public static var glass: GlassButtonStyle {
        GlassButtonStyle()
    }
}

/// A compact, non-shifting date picker pill that presents a graphical calendar popup on tap
public struct CustomCompactDatePicker: View {
    public var label: String
    @Binding public var selection: Date
    public var maxDate: Date?
    public var minDate: Date?
    @State var isShowingCalendar = false
    
    public init(label: String, selection: Binding<Date>, maxDate: Date? = nil, minDate: Date? = nil) {
        self.label = label
        self._selection = selection
        self.maxDate = maxDate
        self.minDate = minDate
    }
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: selection)
    }
    
    public var body: some View {
        VStack(alignment: .center, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Button(action: {
                isShowingCalendar = true
            }) {
                Text(formattedDate)
                    .font(.subheadline)
                    .foregroundColor(.primary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.secondary.opacity(0.12))
                    .cornerRadius(8)
            }
            .buttonStyle(PlainButtonStyle())
            .popover(isPresented: $isShowingCalendar, arrowEdge: .top) {
                VStack(spacing: 8) {
                    if let min = minDate, let max = maxDate {
                        DatePicker(
                            label,
                            selection: $selection,
                            in: min...max,
                            displayedComponents: [.date]
                        )
                        #if os(iOS)
                        .datePickerStyle(.graphical)
                        #endif
                        .labelsHidden()
                        .padding(12)
                    } else if let max = maxDate {
                        DatePicker(
                            label,
                            selection: $selection,
                            in: ...max,
                            displayedComponents: [.date]
                        )
                        #if os(iOS)
                        .datePickerStyle(.graphical)
                        #endif
                        .labelsHidden()
                        .padding(12)
                    } else if let min = minDate {
                        DatePicker(
                            label,
                            selection: $selection,
                            in: min...,
                            displayedComponents: [.date]
                        )
                        #if os(iOS)
                        .datePickerStyle(.graphical)
                        #endif
                        .labelsHidden()
                        .padding(12)
                    } else {
                        DatePicker(
                            label,
                            selection: $selection,
                            displayedComponents: [.date]
                        )
                        #if os(iOS)
                        .datePickerStyle(.graphical)
                        #endif
                        .labelsHidden()
                        .padding(12)
                    }
                }
                .frame(width: 320, height: 340)
                #if os(iOS)
                .presentationCompactAdaptation(.popover)
                #endif
            }
            .fixedSize()
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Account Type Badges
public struct AccountTypeBadgeView: View {
    @Environment(\.colorScheme) var colorScheme
    public var accountType: AccountType
    
    public init(accountType: AccountType) {
        self.accountType = accountType
    }
    
    public var body: some View {
        Group {
            switch accountType {
            case .admin:
                Text(accountType.displayName)
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(Color(red: 0.32, green: 0.20, blue: 0.02))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(
                        LinearGradient(
                            colors: [
                                Color(red: 1.0, green: 0.88, blue: 0.45),
                                Color(red: 0.95, green: 0.75, blue: 0.20),
                                Color(red: 0.85, green: 0.62, blue: 0.12)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(red: 1.0, green: 0.92, blue: 0.60), lineWidth: 1)
                    )
                    .shadow(color: Color(red: 0.85, green: 0.65, blue: 0.15).opacity(0.4), radius: 3, x: 0, y: 1.5)
            case .office:
                let fg = colorScheme == .dark ? Color(red: 192/255.0, green: 132/255.0, blue: 252/255.0) : Color(red: 109/255.0, green: 40/255.0, blue: 217/255.0)
                let bg = colorScheme == .dark ? Color(red: 59/255.0, green: 7/255.0, blue: 100/255.0) : Color(red: 243/255.0, green: 232/255.0, blue: 255/255.0)
                let border = colorScheme == .dark ? Color(red: 107/255.0, green: 33/255.0, blue: 168/255.0) : Color(red: 233/255.0, green: 213/255.0, blue: 255/255.0)
                Text(accountType.displayName)
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(fg)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(bg)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(border, lineWidth: 0.5)
                    )
            case .field:
                let fg = colorScheme == .dark ? Color(red: 96/255.0, green: 165/255.0, blue: 250/255.0) : Color(red: 29/255.0, green: 78/255.0, blue: 216/255.0)
                let bg = colorScheme == .dark ? Color(red: 23/255.0, green: 37/255.0, blue: 84/255.0) : Color(red: 239/255.0, green: 246/255.0, blue: 255/255.0)
                let border = colorScheme == .dark ? Color(red: 30/255.0, green: 64/255.0, blue: 175/255.0) : Color(red: 191/255.0, green: 219/255.0, blue: 254/255.0)
                Text(accountType.displayName)
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(fg)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(bg)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(border, lineWidth: 0.5)
                    )
            }
        }
    }
}

// MARK: - Profile Role Pill View
public struct ProfileRolePillView: View {
    @Environment(\.colorScheme) var colorScheme
    public var label: String
    
    public init(label: String) {
        self.label = label
    }
    
    public var body: some View {
        if label == "Admin" {
            Text("Admin")
                .font(.footnote.weight(.semibold))
                .foregroundColor(Color(red: 0.32, green: 0.20, blue: 0.02))
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(
                    LinearGradient(
                        colors: [
                            Color(red: 1.0, green: 0.88, blue: 0.45),
                            Color(red: 0.95, green: 0.75, blue: 0.20),
                            Color(red: 0.85, green: 0.62, blue: 0.12)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(red: 1.0, green: 0.92, blue: 0.60), lineWidth: 1)
                )
                .shadow(color: Color(red: 0.85, green: 0.65, blue: 0.15).opacity(0.4), radius: 3, x: 0, y: 1.5)
        } else if label == "Installer" {
            let fg = colorScheme == .dark ? Color(red: 192/255.0, green: 132/255.0, blue: 252/255.0) : Color(red: 109/255.0, green: 40/255.0, blue: 217/255.0)
            let bg = colorScheme == .dark ? Color(red: 59/255.0, green: 7/255.0, blue: 100/255.0) : Color(red: 243/255.0, green: 232/255.0, blue: 255/255.0)
            let border = colorScheme == .dark ? Color(red: 107/255.0, green: 33/255.0, blue: 168/255.0) : Color(red: 233/255.0, green: 213/255.0, blue: 255/255.0)
            Text(label)
                .font(.footnote.weight(.semibold))
                .foregroundColor(fg)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(bg)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(border, lineWidth: 0.5)
                )
        } else {
            // Appliance, HVAC (Blue details)
            let fg = colorScheme == .dark ? Color(red: 96/255.0, green: 165/255.0, blue: 250/255.0) : Color(red: 29/255.0, green: 78/255.0, blue: 216/255.0)
            let bg = colorScheme == .dark ? Color(red: 23/255.0, green: 37/255.0, blue: 84/255.0) : Color(red: 239/255.0, green: 246/255.0, blue: 255/255.0)
            let border = colorScheme == .dark ? Color(red: 30/255.0, green: 64/255.0, blue: 175/255.0) : Color(red: 191/255.0, green: 219/255.0, blue: 254/255.0)
            Text(label)
                .font(.footnote.weight(.semibold))
                .foregroundColor(fg)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(bg)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(border, lineWidth: 0.5)
                )
        }
    }
}

public struct UserRoleBadgeView: View {
    public var accountType: AccountType
    
    public init(accountType: AccountType) {
        self.accountType = accountType
    }
    
    public init(role: AccountType) {
        self.accountType = role
    }
    
    public var body: some View {
        AccountTypeBadgeView(accountType: accountType)
    }
}

public struct TwoLineAddressDisplay: View {
    public var street: String
    public var cityStateZip: String
    public var font: Font = .callout
    public var foregroundColor: Color = .secondary
    public var alignment: HorizontalAlignment = .trailing
    public var lineLimit: Int? = nil
    @State var copiedTrigger: Bool = false
    
    public init(
        street: String,
        cityStateZip: String,
        font: Font = .callout,
        foregroundColor: Color = .secondary,
        alignment: HorizontalAlignment = .trailing,
        lineLimit: Int? = nil
    ) {
        self.street = street
        self.cityStateZip = cityStateZip
        self.font = font
        self.foregroundColor = foregroundColor
        self.alignment = alignment
        self.lineLimit = lineLimit
    }
    
    public var fullAddress: String {
        if street.isEmpty { return cityStateZip }
        if cityStateZip.isEmpty { return street }
        return "\(street)\n\(cityStateZip)"
    }
    
    public var body: some View {
        VStack(alignment: alignment, spacing: 2) {
            Text(street)
                .font(font)
                .foregroundColor(foregroundColor)
                .lineLimit(lineLimit)
                .fixedSize(horizontal: false, vertical: true)
            Text(cityStateZip)
                .font(font)
                .foregroundColor(foregroundColor)
                .lineLimit(lineLimit)
                .fixedSize(horizontal: false, vertical: true)
        }
        .multilineTextAlignment(alignment == .trailing ? .trailing : (alignment == .leading ? .leading : .center))
        #if os(iOS)
        .contentShape(Rectangle())
        .contextMenu {
            Button {
                #if canImport(UIKit)
                UIPasteboard.general.string = fullAddress
                #endif
                copiedTrigger.toggle()
            } label: {
                Label("Copy Address", systemImage: "doc.on.doc")
            }
        }
        .sensoryFeedback(.success, trigger: copiedTrigger)
        #endif
    }
}

#if os(iOS)
import UIKit

public final class OrientationManager: Sendable {
    nonisolated(unsafe) public static var orientationLock: UIInterfaceOrientationMask = .portrait
    
    @MainActor
    public static func lockOrientation(_ mask: UIInterfaceOrientationMask) {
        OrientationManager.orientationLock = mask
        if let windowScene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first {
            windowScene.requestGeometryUpdate(.iOS(interfaceOrientations: mask)) { _ in }
            windowScene.keyWindow?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
        }
    }
}

public struct CameraCaptureView: UIViewControllerRepresentable {
    @Environment(\.dismiss) var dismiss
    public var onImageCaptured: (UIImage?) -> Void
    
    public init(onImageCaptured: @escaping (UIImage?) -> Void) {
        self.onImageCaptured = onImageCaptured
    }
    
    public func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            picker.sourceType = .camera
        } else {
            picker.sourceType = .photoLibrary
        }
        return picker
    }
    
    public func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    public class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraCaptureView
        
        init(_ parent: CameraCaptureView) {
            self.parent = parent
        }
        
        public func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            let image = info[.originalImage] as? UIImage
            parent.onImageCaptured(image)
            parent.dismiss()
        }
        
        public func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.onImageCaptured(nil)
            parent.dismiss()
        }
    }
}
#endif

