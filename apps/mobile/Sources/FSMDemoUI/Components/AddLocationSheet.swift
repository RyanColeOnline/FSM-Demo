import SwiftUI

public struct AddLocationSheet: View {
    @Environment(\.dismiss) var dismiss
    @State var locationLabel = "home"
    @State var street = ""
    @State var street2 = ""
    @State var city = ""
    @State var state = ""
    @State var zipCode = ""
    public var onSave: (Address) -> Void
    
    let labelOptions = ["home", "work", "school", "other"]
    
    public init(onSave: @escaping (Address) -> Void) {
        self.onSave = onSave
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    HStack(alignment: .center, spacing: 12) {
                        Menu {
                            ForEach(labelOptions, id: \.self) { opt in
                                Button(opt) { locationLabel = opt }
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text(locationLabel)
                                    .font(.subheadline)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.8)
                                Image(systemName: "chevron.right")
                                    .font(.caption2.weight(.bold))
                            }
                            .foregroundColor(.blue)
                        }
                        .frame(width: 75, alignment: .leading)
                        
                        Divider()
                            .frame(height: 140)
                        
                        VStack(alignment: .leading, spacing: 0) {
                            HStack {
                                TextField("Street", text: $street)
                                    .font(.subheadline)
                            }
                            .padding(.vertical, 12)
                            
                            Divider()
                            
                            HStack {
                                TextField("Street 2", text: $street2)
                                    .font(.subheadline)
                            }
                            .padding(.vertical, 12)
                            
                            Divider()
                            
                            HStack {
                                TextField("City", text: $city)
                                    .font(.subheadline)
                            }
                            .padding(.vertical, 12)
                            
                            Divider()
                            
                            HStack(spacing: 0) {
                                HStack {
                                    TextField("State", text: $state)
                                        .font(.subheadline)
                                }
                                
                                Divider()
                                    .frame(height: 24)
                                    .padding(.horizontal, 12)
                                
                                HStack {
                                    TextField("ZIP", text: $zipCode)
                                        .font(.subheadline)
                                        #if os(iOS)
                                        .keyboardType(.numberPad)
                                        #endif
                                }
                            }
                            .padding(.vertical, 12)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 8)
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                .padding(16)
            }
            .background(Color.murphysGroupedBackground)
            .navigationTitle("Add Location")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save", action: save)
                        .disabled(street.isEmpty || city.isEmpty || state.isEmpty || zipCode.isEmpty)
                }
                #else
                ToolbarItem(placement: .cancellationAction) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(street.isEmpty || city.isEmpty || state.isEmpty || zipCode.isEmpty)
                }
                #endif
            }
        }
    }
    
    private func save() {
        let fullStreet = street2.trimmingCharacters(in: .whitespaces).isEmpty ? street : "\(street), \(street2)"
        let newAddress = Address(street: fullStreet, city: city, state: state, zipCode: zipCode)
        onSave(newAddress)
        dismiss()
    }
}
