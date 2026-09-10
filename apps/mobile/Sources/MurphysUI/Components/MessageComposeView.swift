import SwiftUI
#if os(iOS) && canImport(MessageUI)
import MessageUI

public struct MessageComposeView: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    public var recipient: String
    public var bodyText: String = ""
    
    public init(recipient: String, bodyText: String = "") {
        self.recipient = recipient
        self.bodyText = bodyText
    }
    
    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    public func makeUIViewController(context: Context) -> MFMessageComposeViewController {
        let controller = MFMessageComposeViewController()
        controller.messageComposeDelegate = context.coordinator
        
        let sanitized = recipient.filter { "+0123456789".contains($0) }
        controller.recipients = [sanitized]
        if !bodyText.isEmpty {
            controller.body = bodyText
        }
        return controller
    }
    
    public func updateUIViewController(_ uiViewController: MFMessageComposeViewController, context: Context) {}
    
    public static func canSendText() -> Bool {
        MFMessageComposeViewController.canSendText()
    }
    
    public class Coordinator: NSObject, MFMessageComposeViewControllerDelegate {
        var parent: MessageComposeView
        
        init(_ parent: MessageComposeView) {
            self.parent = parent
        }
        
        public func messageComposeViewController(_ controller: MFMessageComposeViewController, didFinishWith result: MessageComposeResult) {
            parent.dismiss()
        }
    }
}
#else
public struct MessageComposeView: View {
    public var recipient: String
    public var bodyText: String = ""
    
    public init(recipient: String, bodyText: String = "") {
        self.recipient = recipient
        self.bodyText = bodyText
    }
    
    public static func canSendText() -> Bool {
        false
    }
    
    public var body: some View {
        Text("Messaging not supported on this platform")
    }
}
#endif
