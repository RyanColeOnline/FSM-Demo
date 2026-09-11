import SwiftUI

public struct LoginScreen: View {
    @Environment(\.colorScheme) var colorScheme
    var sessionManager = SessionManager.shared
    
    @State var email: String = ""
    @State var password: String = ""
    @State var isSubmitting: Bool = false
    @State var isGoogleSubmitting: Bool = false
    @State var errorMessage: String? = nil
    
    // Forgot Password Sheet/Alert State
    @State var showForgotPassword: Bool = false
    @State var resetEmail: String = ""
    @State var resetMessage: String? = nil
    @State var isResetting: Bool = false
    
    public init() {}
    
    public var body: some View {
        ZStack {
            Color.murphysGroupedBackground
                .ignoresSafeArea()
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer(minLength: 64)
                    
                    // Upper Section: Logo (pushed down)
                    LogoView()
                        .frame(maxWidth: 240, maxHeight: 180)
                        .padding(.top, 24)
                        .padding(.bottom, 28)
                    
                    // Center Compact Card Container
                    VStack(spacing: 14) {
                        // Email Field (No icon, gray "Email" placeholder, height 42)
                        HStack(spacing: 0) {
                            #if os(iOS)
                            TextField("Email", text: $email)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled(true)
                                .font(.callout)
                            #else
                            TextField("Email", text: $email)
                                .font(.callout)
                            #endif
                        }
                        .padding(.horizontal, 14)
                        .frame(height: 42)
                        .background(Color.murphysCardBackground)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.secondary.opacity(colorScheme == .dark ? 0.35 : 0.2), lineWidth: 1)
                        )
                        
                        // Password Field (No icon, height 42)
                        HStack(spacing: 0) {
                            SecureField("Password", text: $password)
                                .font(.callout)
                        }
                        .padding(.horizontal, 14)
                        .frame(height: 42)
                        .background(Color.murphysCardBackground)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.secondary.opacity(colorScheme == .dark ? 0.35 : 0.2), lineWidth: 1)
                        )
                        
                        // Forgot Password Link
                        HStack {
                            Spacer()
                            Button("Forgot password?") {
                                resetEmail = email
                                resetMessage = nil
                                showForgotPassword = true
                            }
                            .font(.caption.weight(.medium))
                            .foregroundColor(Color.blue)
                        }
                        .padding(.top, 2)
                        
                        // Error Message
                        Text(errorMessage ?? " ")
                            .font(.caption.weight(.medium))
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .frame(minHeight: 18)
                        
                        // Primary Sign In Button
                        Button(action: handleEmailLogin) {
                            ZStack {
                                Text("Sign In")
                                    .font(.callout.weight(.semibold))
                                    .opacity(isSubmitting ? 0 : 1)
                                
                                if isSubmitting {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(Color(red: 29/255.0, green: 78/255.0, blue: 216/255.0))
                            .cornerRadius(12)
                        }
                        .disabled(email.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty || isSubmitting)
                        .opacity(email.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty ? 0.65 : 1.0)
                        
                        // Divider
                        HStack(spacing: 10) {
                            Rectangle()
                                .fill(Color.secondary.opacity(0.2))
                                .frame(height: 1)
                            Text("OR")
                                .font(.caption2.weight(.bold))
                                .foregroundColor(.secondary)
                            Rectangle()
                                .fill(Color.secondary.opacity(0.2))
                                .frame(height: 1)
                        }
                        .padding(.vertical, 4)
                        
                        // Continue with Google Button
                        Button(action: handleGoogleLogin) {
                            HStack(spacing: 10) {
                                if isGoogleSubmitting {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .primary))
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "g.circle.fill")
                                        .font(.title3)
                                        .foregroundColor(.red)
                                }
                                Text("Continue with Google")
                                    .font(.callout.weight(.medium))
                                    .foregroundColor(.primary)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(Color.murphysCardBackground)
                            .cornerRadius(12)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.secondary.opacity(colorScheme == .dark ? 0.35 : 0.2), lineWidth: 1)
                            )
                        }
                        .disabled(isSubmitting || isGoogleSubmitting)
                    }
                    .frame(maxWidth: 320)
                    .padding(.horizontal, 24)
                    
                    Spacer(minLength: 24)
                }
            }
        }
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordModal(isPresented: $showForgotPassword, initialEmail: email)
        }
        #if os(iOS)
        .sensoryFeedback(.error, trigger: errorMessage) { _, new in new != nil }
        #endif
    }
    
    private func handleEmailLogin() {
        let enteredEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !enteredEmail.isEmpty, !password.isEmpty else { return }
        
        isSubmitting = true
        errorMessage = nil
        
        Task {
            let result = await sessionManager.signIn(email: enteredEmail, password: password)
            await MainActor.run {
                isSubmitting = false
                if !result.success {
                    errorMessage = result.error ?? "Invalid credentials"
                }
            }
        }
    }
    
    private func handleGoogleLogin() {
        isGoogleSubmitting = true
        errorMessage = nil
        
        // For standard Google Sign In, on device it triggers Google provider or fallback
        Task {
            // Note: Google Sign In on mobile can be connected to ASWebAuthenticationSession or Google SDK
            await MainActor.run {
                isGoogleSubmitting = false
                errorMessage = "Please use your Murphy's email and password above to sign in."
            }
        }
    }
}

// MARK: - Compact Forgot Password Sheet
struct ForgotPasswordModal: View {
    @Binding var isPresented: Bool
    var initialEmail: String
    
    @State var email: String = ""
    @State var isSending: Bool = false
    @State var statusMessage: String? = nil
    @State var isSuccess: Bool = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Enter your email address and we'll send you a link to reset your password.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 12)
                
                HStack(spacing: 10) {
                    Image(systemName: "envelope")
                        .foregroundColor(.secondary)
                    
                    #if os(iOS)
                    TextField("name@murphyshomeservices.com", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                    #else
                    TextField("name@murphyshomeservices.com", text: $email)
                    #endif
                }
                .padding(.horizontal, 14)
                .frame(height: 48)
                .background(Color.murphysCardBackground)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                )
                
                if let msg = statusMessage {
                    Text(msg)
                        .font(.caption.weight(.medium))
                        .foregroundColor(isSuccess ? .green : .red)
                        .multilineTextAlignment(.center)
                }
                
                Button(action: sendReset) {
                    ZStack {
                        Text("Send Reset Link")
                            .font(.callout.weight(.semibold))
                            .opacity(isSending ? 0 : 1)
                        
                        if isSending {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.blue)
                    .cornerRadius(12)
                }
                .disabled(email.trimmingCharacters(in: .whitespaces).isEmpty || isSending)
                .opacity(email.trimmingCharacters(in: .whitespaces).isEmpty ? 0.65 : 1.0)
                
                Spacer()
            }
            .padding(24)
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        isPresented = false
                    } label: {
                        Image(systemName: "xmark")
                    }
                }
            }
            .onAppear {
                email = initialEmail
            }
        }
        .presentationDetents([.medium])
    }
    
    private func sendReset() {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        isSending = true
        statusMessage = nil
        
        Task {
            let result = await SessionManager.shared.sendPasswordReset(email: trimmed)
            await MainActor.run {
                isSending = false
                if result.success {
                    isSuccess = true
                    statusMessage = "Password reset link sent to \(trimmed)."
                } else {
                    isSuccess = false
                    statusMessage = result.error ?? "Failed to send reset link."
                }
            }
        }
    }
}
