import SwiftUI

public struct AppointmentAccessScreen: View {
    @Binding var accessCodes: [AccessCode]
    @Environment(\.dismiss) var dismiss
    @FocusState var focusedFieldID: UUID?
    
    let labelOptions = ["Gate Code", "Door Code", "Building Code", "Keypad Code", "Lockbox Code", "Other"]
    
    public init(accessCodes: Binding<[AccessCode]>) {
        self._accessCodes = accessCodes
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(spacing: 0) {
                    ForEach(accessCodes) { item in
                        let itemId = item.id
                        HStack(alignment: .center, spacing: 12) {
                            Button(action: {
                                focusedFieldID = nil
                                withAnimation(.easeInOut) {
                                    if let idx = accessCodes.firstIndex(where: { $0.id == itemId }) {
                                        accessCodes[idx].isDeleteRevealed.toggle()
                                    }
                                }
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                                    .font(.title3)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Menu {
                                ForEach(labelOptions, id: \.self) { opt in
                                    Button(opt) {
                                        if let idx = accessCodes.firstIndex(where: { $0.id == itemId }) {
                                            accessCodes[idx].label = opt
                                        }
                                    }
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    Text(accessCodes.first(where: { $0.id == itemId })?.label ?? item.label)
                                        .font(.subheadline.weight(.medium))
                                        .lineLimit(2)
                                        .multilineTextAlignment(.leading)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                    Image(systemName: "chevron.right")
                                        .font(.caption2.weight(.bold))
                                }
                                .foregroundColor(.blue)
                            }
                            .buttonStyle(PlainButtonStyle())
                            .frame(width: 65, alignment: .leading)
                            
                            Divider()
                                .frame(height: 44)
                            
                            TextField("#1234*", text: Binding(
                                get: {
                                    accessCodes.first(where: { $0.id == itemId })?.code ?? ""
                                },
                                set: { newValue in
                                    if let idx = accessCodes.firstIndex(where: { $0.id == itemId }) {
                                        accessCodes[idx].code = newValue
                                    }
                                }
                            ))
                            .focused($focusedFieldID, equals: itemId)
                            .font(.body)
                            .foregroundColor(.primary)
                            
                            if accessCodes.first(where: { $0.id == itemId })?.isDeleteRevealed == true {
                                Button(action: {
                                    focusedFieldID = nil
                                    withAnimation(.easeInOut) {
                                        accessCodes.removeAll { $0.id == itemId }
                                    }
                                }) {
                                    Text("Delete")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundColor(.white)
                                        .padding(.vertical, 8)
                                        .padding(.horizontal, 14)
                                        .background(Color.red)
                                        .cornerRadius(8)
                                }
                                .buttonStyle(PlainButtonStyle())
                                .transition(.move(edge: .trailing).combined(with: .opacity))
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.vertical, 8)
                        
                        Divider().padding(.horizontal, 20)
                    }
                    
                    Button(action: {
                        focusedFieldID = nil
                        let newCode = AccessCode(label: "Gate Code", code: "")
                        withAnimation(.easeInOut) {
                            accessCodes.append(newCode)
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            focusedFieldID = newCode.id
                        }
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.green)
                                .font(.title3)
                            Text("add access code")
                                .font(.body)
                                .foregroundColor(.primary)
                            Spacer()
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                        #if os(iOS)
                        .contentShape(Rectangle())
                        #endif
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            .padding(16)
        }
        .refreshable {
            try? await Task.sleep(nanoseconds: 500_000_000)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Access Codes")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Done") {
                    focusedFieldID = nil
                    dismiss()
                }
                .font(.body.weight(.semibold))
            }
        }
        .onAppear {
            if focusedFieldID == nil {
                focusedFieldID = accessCodes.first?.id
            }
        }
    }
}
