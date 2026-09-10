import SwiftUI

public struct CustomerManageAddressesSheet: View {
    public var customerName: String = ""
    @Binding var allCustomerLocations: [Address]
    var onSave: ([Address]) -> Void
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    
    @State var searchText: String = ""
    @State var activeViewMode: ViewMode = .list
    @State var selectedAddressIndex: Int? = nil
    
    // Address Form State
    @State var formLabel: String = "home"
    @State var formStreet: String = ""
    @State var formStreet2: String = ""
    @State var formCity: String = ""
    @State var formState: String = ""
    @State var formZip: String = ""
    @State var originalAddress: Address? = nil
    
    @State var showDiscardChangesAlert: Bool = false
    @State var activeLabelTarget: LabelTarget? = nil
    @State var userCustomLabels: [String] = []
    
    enum ViewMode {
        case list
        case form
    }
    
    public init(
        customerName: String = "",
        allCustomerLocations: Binding<[Address]>,
        onSave: @escaping ([Address]) -> Void
    ) {
        self.customerName = customerName
        self._allCustomerLocations = allCustomerLocations
        self.onSave = onSave
    }
    
    var filteredLocations: [(index: Int, address: Address)] {
        let indexed = Array(allCustomerLocations.enumerated().map { (index: $0.offset, address: $0.element) })
        if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return indexed
        }
        let query = searchText.lowercased()
        return indexed.filter { item in
            let loc = item.address
            let full = "\(loc.street) \(loc.city) \(loc.state) \(loc.zipCode)".lowercased()
            return full.contains(query)
        }
    }
    
    var hasUnsavedChanges: Bool {
        guard activeViewMode == .form else { return false }
        if let orig = originalAddress {
            return formStreet != orig.street ||
                formCity != orig.city ||
                formState != orig.state ||
                formZip != orig.zipCode ||
                (formLabel == "work" ? AddressType.commercial : AddressType.residential) != orig.type
        } else {
            return !formStreet.isEmpty || !formCity.isEmpty || !formState.isEmpty || !formZip.isEmpty
        }
    }
    
    var isFormValid: Bool {
        !formStreet.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !formCity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !formState.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !formZip.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    public var body: some View {
        NavigationStack {
            Group {
                if activeViewMode == .list {
                    locationsListView
                } else {
                    singleAddressFormView
                }
            }
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text(activeViewMode == .list ? "Locations" : (selectedAddressIndex == nil ? "New Address" : "Edit Address"))
                            .font(.headline)
                            .foregroundColor(.primary)
                        if !customerName.isEmpty {
                            Text(customerName)
                                .font(.caption.weight(.medium))
                                .foregroundColor(.secondary)
                        }
                    }
                }
                if activeViewMode == .list {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Done") {
                            dismiss()
                        }
                        .font(.callout.weight(.semibold))
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(action: {
                            openFormForNewAddress()
                        }) {
                            Image(systemName: "plus")
                                .font(.headline)
                        }
                    }
                } else {
                    ToolbarItem(placement: .topBarLeading) {
                        Button(action: {
                            handleCancelForm()
                        }) {
                            Image(systemName: "xmark")
                                .font(.subheadline.weight(.semibold))
                        }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Save") {
                            saveSingleAddressForm()
                        }
                        .font(.callout.weight(.bold))
                        .disabled(!isFormValid)
                    }
                }
            }
            .alert("Discard Changes?", isPresented: $showDiscardChangesAlert) {
                Button("Discard", role: .destructive) {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        activeViewMode = .list
                    }
                }
                Button("Keep Editing", role: .cancel) {}
            } message: {
                Text("You have unsaved changes. Are you sure you want to discard them?")
            }
            .sheet(item: $activeLabelTarget) { target in
                LabelSelectionSheet(
                    title: target.title,
                    options: target.options,
                    currentSelection: target.currentSelection,
                    customLabels: $userCustomLabels,
                    onSelect: target.onSelect
                )
            }
        }
    }
    
    // MARK: - Locations List View
    private var locationsListView: some View {
        List {
            if filteredLocations.isEmpty {
                Text("No addresses found")
                    .foregroundColor(.secondary)
                    .font(.callout)
                    .listRowBackground(Color.murphysCardBackground)
            } else {
                ForEach(filteredLocations, id: \.index) { item in
                    let loc = item.address
                    let isDefault = (item.index == 0)
                    
                    Button(action: {
                        openFormForEditing(index: item.index, address: loc)
                    }) {
                        HStack(alignment: .center, spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 6) {
                                    if isDefault {
                                        Text("Default")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(.blue)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.blue.opacity(0.12))
                                            .cornerRadius(4)
                                    }
                                    
                                    Text(loc.street.isEmpty ? "Address" : loc.street)
                                        .font(.callout.weight(.medium))
                                        .foregroundColor(.primary)
                                }
                                
                                if !loc.city.isEmpty || !loc.state.isEmpty || !loc.zipCode.isEmpty {
                                    Text("\(loc.city), \(loc.state) \(loc.zipCode)".trimmingCharacters(in: .whitespaces))
                                        .font(.callout)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(.secondary.opacity(0.5))
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                    .listRowBackground(Color.murphysCardBackground)
                }
                .onDelete(perform: deleteLocation)
            }
        }
        #if true
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(Color.murphysGroupedBackground)
        #endif
        .searchable(text: $searchText, prompt: "Search locations...")
    }
    
    // MARK: - Single Address Form View
    private var singleAddressFormView: some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(spacing: 0) {
                    HStack(alignment: .center, spacing: 12) {
                        Button(action: {
                            let addressOptions = ["home", "work", "school", "other"]
                            activeLabelTarget = LabelTarget(
                                title: "Label",
                                category: "address",
                                options: addressOptions,
                                currentSelection: formLabel,
                                onSelect: { selected in
                                    formLabel = selected
                                }
                            )
                        }) {
                            HStack(spacing: 4) {
                                Text(formLabel)
                                    .font(.subheadline)
                                    .lineLimit(1)
                                Image(systemName: "chevron.right")
                                    .font(.caption2.weight(.bold))
                            }
                            .foregroundColor(.blue)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .frame(width: 75, alignment: .leading)
                        
                        Divider()
                            .frame(height: 180)
                        
                        VStack(alignment: .leading, spacing: 0) {
                            HStack {
                                TextField("Street", text: $formStreet)
                                    .font(.body)
                            }
                            .padding(.vertical, 12)
                            
                            Divider()
                            
                            HStack {
                                TextField("Street 2", text: $formStreet2)
                                    .font(.body)
                            }
                            .padding(.vertical, 12)
                            
                            Divider()
                            
                            HStack {
                                TextField("City", text: $formCity)
                                    .font(.body)
                            }
                            .padding(.vertical, 12)
                            
                            Divider()
                            
                            HStack(spacing: 0) {
                                HStack {
                                    TextField("State", text: $formState)
                                        .font(.body)
                                }
                                
                                Divider()
                                    .frame(height: 24)
                                    .padding(.horizontal, 12)
                                
                                HStack {
                                    TextField("ZIP", text: $formZip)
                                        .font(.body)
                                        .keyboardType(.numberPad)
                                }
                            }
                            .padding(.vertical, 12)
                        }
                    }
                    .padding(.horizontal, 20)
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                .padding(.horizontal)
                .padding(.top, 16)
            }
        }
        #if os(iOS)
        .scrollContentBackground(.hidden)
        #endif
        .background(Color.murphysGroupedBackground)
    }
    
    // MARK: - Actions
    private func openFormForNewAddress() {
        selectedAddressIndex = nil
        originalAddress = nil
        formLabel = "home"
        formStreet = ""
        formStreet2 = ""
        formCity = ""
        formState = ""
        formZip = ""
        withAnimation(.easeInOut(duration: 0.2)) {
            activeViewMode = .form
        }
    }
    
    private func openFormForEditing(index: Int, address: Address) {
        selectedAddressIndex = index
        originalAddress = address
        formLabel = address.type == .commercial ? "work" : "home"
        formStreet = address.street
        formStreet2 = ""
        formCity = address.city
        formState = address.state
        formZip = address.zipCode
        withAnimation(.easeInOut(duration: 0.2)) {
            activeViewMode = .form
        }
    }
    
    private func handleCancelForm() {
        if hasUnsavedChanges {
            showDiscardChangesAlert = true
        } else {
            withAnimation(.easeInOut(duration: 0.2)) {
                activeViewMode = .list
            }
        }
    }
    
    private func saveSingleAddressForm() {
        let type: AddressType = (formLabel == "work") ? .commercial : .residential
        let fullStreet = formStreet2.isEmpty ? formStreet : "\(formStreet) \(formStreet2)"
        let newAddress = Address(
            street: fullStreet,
            city: formCity,
            state: formState,
            zipCode: formZip,
            type: type
        )
        
        if let idx = selectedAddressIndex, idx < allCustomerLocations.count {
            allCustomerLocations[idx] = newAddress
        } else {
            allCustomerLocations.append(newAddress)
        }
        
        onSave(allCustomerLocations)
        
        withAnimation(.easeInOut(duration: 0.2)) {
            activeViewMode = .list
        }
    }
    
    private func deleteLocation(at offsets: IndexSet) {
        allCustomerLocations.remove(atOffsets: offsets)
        onSave(allCustomerLocations)
    }
}
