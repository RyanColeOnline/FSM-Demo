import SwiftUI

public struct AuthorizedPersonDraft: Identifiable, Equatable, Sendable {
    public let id: UUID
    public var positionLabel: String
    public var firstName: String
    public var lastName: String
    public var phone: String
    public var email: String
    public var assignedLocation: String
    public var isDeleteRevealed: Bool
    
    public init(
        id: UUID = UUID(),
        positionLabel: String = "Spouse",
        firstName: String = "",
        lastName: String = "",
        phone: String = "",
        email: String = "",
        assignedLocation: String = "",
        isDeleteRevealed: Bool = false
    ) {
        self.id = id
        self.positionLabel = positionLabel
        self.firstName = firstName
        self.lastName = lastName
        self.phone = phone
        self.email = email
        self.assignedLocation = assignedLocation
        self.isDeleteRevealed = isDeleteRevealed
    }
}

public struct CustomerAuthorizedPersonsSheet: View {
    @Environment(\.dismiss) var dismiss
    @Environment(CustomerStore.self) var customerStore
    var customer: Customer
    var onSelectPerson: ((AuthorizedPerson) -> Void)? = nil
    
    @State var isAddingPerson: Bool = false
    @State var selectedDetent: PresentationDetent = .medium
    @State var draftPersons: [AuthorizedPersonDraft] = [AuthorizedPersonDraft()]
    
    @State var personToDelete: AuthorizedPerson? = nil
    @State var showDeleteConfirmation: Bool = false
    @FocusState var focusedFieldID: UUID?
    
    let labelOptions = ["Spouse", "Partner", "Family Member", "Property Manager", "Tenant", "Manager", "Other"]
    
    public init(
        customer: Customer,
        isAddingPerson: Bool = false,
        onSelectPerson: ((AuthorizedPerson) -> Void)? = nil
    ) {
        self.customer = customer
        self._isAddingPerson = State(initialValue: isAddingPerson)
        self.onSelectPerson = onSelectPerson
        self._selectedDetent = State(initialValue: isAddingPerson ? .large : .medium)
    }
    
    var activeDetents: Set<PresentationDetent> {
        return [.medium, .large]
    }
    
    private func deleteDraftPerson(at index: Int) {
        if index < draftPersons.count {
            let targetID = draftPersons[index].id
            focusedFieldID = nil
            withAnimation(.easeInOut) {
                draftPersons.removeAll { $0.id == targetID }
            }
        }
    }
    
    private func addAnotherDraftPerson() {
        focusedFieldID = nil
        let newDraft = AuthorizedPersonDraft()
        withAnimation(.easeInOut) {
            draftPersons.append(newDraft)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            focusedFieldID = newDraft.id
        }
    }
    
    private func saveNewPersons() {
        focusedFieldID = nil
        #if os(iOS)
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        #endif
        var firstCreatedPerson: AuthorizedPerson? = nil
        for draft in draftPersons {
            if !draft.firstName.trimmingCharacters(in: .whitespaces).isEmpty {
                let newPerson = AuthorizedPerson(
                    positionLabel: draft.positionLabel.isEmpty ? "Authorized Person" : draft.positionLabel,
                    firstName: draft.firstName,
                    lastName: draft.lastName,
                    phone: draft.phone,
                    email: draft.email,
                    assignedLocation: draft.assignedLocation.isEmpty ? nil : draft.assignedLocation
                )
                customer.authorizedPersons.append(newPerson)
                if firstCreatedPerson == nil {
                    firstCreatedPerson = newPerson
                }
            }
        }
        customerStore.updateCustomerLocally(customer)
        if let onSelect = onSelectPerson, let created = firstCreatedPerson {
            onSelect(created)
            dismiss()
        } else {
            withAnimation(.easeInOut(duration: 0.35)) {
                isAddingPerson = false
                selectedDetent = .medium
            }
        }
    }
    
    private func startAddingPerson() {
        focusedFieldID = nil
        let firstDraft = AuthorizedPersonDraft()
        draftPersons = [firstDraft]
        withAnimation(.easeInOut(duration: 0.35)) {
            isAddingPerson = true
            selectedDetent = .large
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            focusedFieldID = firstDraft.id
        }
    }
    
    @ViewBuilder
    private func locationMenuLabel(for assignedLocation: String) -> some View {
        HStack(alignment: .center) {
            if !assignedLocation.isEmpty {
                let newlineParts = assignedLocation.components(separatedBy: "\n")
                if newlineParts.count >= 2 {
                    TwoLineAddressDisplay(
                        street: newlineParts[0].trimmingCharacters(in: .whitespaces),
                        cityStateZip: newlineParts[1].trimmingCharacters(in: .whitespaces),
                        font: .subheadline.weight(.regular),
                        foregroundColor: .primary,
                        alignment: .leading
                    )
                    .padding(.top, 16)
                    .padding(.bottom, 12)
                } else {
                    let parts = assignedLocation.components(separatedBy: ",")
                    if parts.count >= 2 {
                        let street = parts[0].trimmingCharacters(in: .whitespaces)
                        let cityStateZip = parts.dropFirst().joined(separator: ",").trimmingCharacters(in: .whitespaces)
                        TwoLineAddressDisplay(
                            street: street,
                            cityStateZip: cityStateZip,
                            font: .subheadline.weight(.regular),
                            foregroundColor: .primary,
                            alignment: .leading
                        )
                        .padding(.top, 16)
                        .padding(.bottom, 12)
                    } else {
                        TwoLineAddressDisplay(
                            street: assignedLocation,
                            cityStateZip: "Chicago, IL 60601",
                            font: .subheadline.weight(.regular),
                            foregroundColor: .primary,
                            alignment: .leading
                        )
                        .padding(.top, 16)
                        .padding(.bottom, 12)
                    }
                }
            } else {
                Text("Select Location")
                    .font(.subheadline.weight(.regular))
                    .padding(.vertical, 12)
                    .foregroundColor(.secondary.opacity(0.6))
            }
            Spacer()
            Image(systemName: "chevron.up.chevron.down")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary.opacity(0.8))
        }
        .frame(height: 44)
    }
    
    @ViewBuilder
    private func draftRowView(idx: Int) -> some View {
        if idx < draftPersons.count {
            let itemId = draftPersons[idx].id
            let isRevealed = draftPersons[idx].isDeleteRevealed
            let posLabel = draftPersons[idx].positionLabel
            let assignedLoc = draftPersons[idx].assignedLocation
            
            HStack(alignment: .center, spacing: 12) {
                if draftPersons.count > 1 {
                    Button(action: {
                        focusedFieldID = nil
                        withAnimation(.easeInOut) {
                            draftPersons[idx].isDeleteRevealed.toggle()
                        }
                    }) {
                        Image(systemName: "minus.circle.fill")
                            .foregroundColor(.red)
                            .font(.title3)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                
                Menu {
                    ForEach(labelOptions, id: \.self) { opt in
                        Button(opt) {
                            draftPersons[idx].positionLabel = opt
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(posLabel)
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
                .frame(width: 78, alignment: .leading)
                
                Divider()
                    .frame(height: 220)
                
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        TextField("First name", text: Binding(
                            get: { idx < draftPersons.count ? draftPersons[idx].firstName : "" },
                            set: { if idx < draftPersons.count { draftPersons[idx].firstName = $0 } }
                        ))
                        .focused($focusedFieldID, equals: itemId)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    }
                    .frame(height: 44)
                    
                    Divider()
                    
                    HStack {
                        TextField("Last name", text: Binding(
                            get: { idx < draftPersons.count ? draftPersons[idx].lastName : "" },
                            set: { if idx < draftPersons.count { draftPersons[idx].lastName = $0 } }
                        ))
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    }
                    .frame(height: 44)
                    
                    Divider()
                    
                    HStack {
                        TextField("Phone number", text: Binding(
                            get: { idx < draftPersons.count ? draftPersons[idx].phone : "" },
                            set: { newValue in
                                if idx < draftPersons.count {
                                    let oldVal = draftPersons[idx].phone
                                    draftPersons[idx].phone = formatPhoneNumber(newNumber: newValue, oldNumber: oldVal)
                                }
                            }
                        ))
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        #if os(iOS)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                        #endif
                    }
                    .frame(height: 44)
                    
                    Divider()
                    
                    HStack {
                        TextField("Email address", text: Binding(
                            get: { idx < draftPersons.count ? draftPersons[idx].email : "" },
                            set: { if idx < draftPersons.count { draftPersons[idx].email = $0 } }
                        ))
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    }
                    .frame(height: 44)
                    
                    Divider()
                    
                    HStack {
                        Menu {
                            Button("Select Location") {
                                draftPersons[idx].assignedLocation = ""
                            }
                            Divider()
                            ForEach(customer.locations, id: \.street) { loc in
                                let streetStr = loc.street.isEmpty ? "Main Location" : loc.street
                                let cityStateZipStr = "\(loc.city.isEmpty ? "Chicago" : loc.city), \(loc.state.isEmpty ? "IL" : loc.state) \(loc.zipCode.isEmpty ? "60601" : loc.zipCode)"
                                Button(action: {
                                    draftPersons[idx].assignedLocation = "\(streetStr)\n\(cityStateZipStr)"
                                }) {
                                    Text("\(streetStr)\n\(cityStateZipStr)")
                                }
                            }
                        } label: {
                            locationMenuLabel(for: assignedLoc)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .frame(height: assignedLoc.isEmpty ? 44 : nil)
                    .frame(minHeight: 44)
                }
                
                if isRevealed {
                    Button(action: { deleteDraftPerson(at: idx) }) {
                        Text("Delete")
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(.white)
                            .padding(.vertical, 8)
                            .padding(.horizontal, 14)
                            .background(Color.red)
                            .cornerRadius(8)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
        }
    }
    
    @ViewBuilder
    private var addPersonFormView: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(spacing: 0) {
                    ForEach(0..<draftPersons.count, id: \.self) { idx in
                        draftRowView(idx: idx)
                        Divider().padding(.horizontal, 20)
                    }
                    
                    Button(action: addAnotherDraftPerson) {
                        HStack(spacing: 12) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.green)
                                .font(.title3)
                            Text("add authorized person")
                                .font(.body)
                                .foregroundColor(.primary)
                            Spacer()
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .transition(.opacity)
    }
    
    @ViewBuilder
    private func authorizedPersonRow(_ person: AuthorizedPerson) -> some View {
        Button(action: {
            if let onSelectPerson = onSelectPerson {
                onSelectPerson(person)
                dismiss()
            }
        }) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(person.fullName)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Text(person.positionLabel)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                if !person.phone.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "phone.fill")
                            .font(.caption)
                            .foregroundColor(.blue)
                        Text(person.phone)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let email = person.email, !email.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "envelope.fill")
                            .font(.caption)
                            .foregroundColor(.blue)
                        Text(email)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                if let location = person.assignedLocation, !location.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "mappin.and.ellipse")
                            .font(.caption)
                            .foregroundColor(.red)
                        Text(location)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.vertical, 4)
            #if os(iOS)
            .contentShape(Rectangle())
            #endif
        }
        .buttonStyle(PlainButtonStyle())
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                personToDelete = person
                showDeleteConfirmation = true
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }
    
    @ViewBuilder
    private var personListView: some View {
        List {
            Section {
                if customer.authorizedPersons.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "person.crop.rectangle.stack")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 40, height: 40)
                            .foregroundStyle(.secondary)
                        Text("No Authorized Persons")
                            .font(.headline)
                            .foregroundStyle(.primary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 32)
                    .listRowBackground(Color.clear)
                } else {
                    ForEach(customer.authorizedPersons) { person in
                        authorizedPersonRow(person)
                    }
                }
            }
        }
        #if true
        .listStyle(.insetGrouped)
        #endif
        .transition(.opacity)
    }
    
    public var body: some View {
        NavigationStack {
            Group {
                if isAddingPerson {
                    addPersonFormView
                        .transition(.opacity)
                } else {
                    personListView
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.25), value: isAddingPerson)
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: {
                        if isAddingPerson {
                            focusedFieldID = nil
                            #if os(iOS)
                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                            #endif
                            withAnimation(.easeInOut(duration: 0.35)) {
                                isAddingPerson = false
                                selectedDetent = .medium
                            }
                        } else {
                            dismiss()
                        }
                    }) {
                        Image(systemName: "xmark")
                            .font(.callout.weight(.bold))
                            .foregroundColor(.secondary)
                    }
                }
                
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text(isAddingPerson ? "Add Authorized Person" : "Authorized Persons")
                            .font(.headline)
                            .animation(.easeInOut(duration: 0.2), value: isAddingPerson)
                        Text(customer.displayName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    if isAddingPerson {
                        Button(action: saveNewPersons) {
                            Image(systemName: "checkmark")
                                .font(.subheadline.weight(.semibold))
                        }
                        .buttonStyle(.borderedProminent)
                        #if true
                        .buttonBorderShape(.circle)
                        #endif
                        .disabled(draftPersons.contains(where: { $0.firstName.trimmingCharacters(in: .whitespaces).isEmpty }))
                    } else {
                        Button(action: startAddingPerson) {
                            Image(systemName: "plus")
                        }
                    }
                }
            }
            .confirmationDialog(
                "Delete Authorized Person",
                isPresented: $showDeleteConfirmation,
                titleVisibility: .visible,
                presenting: personToDelete
            ) { person in
                Button("Delete \(person.fullName)", role: .destructive) {
                    withAnimation {
                        customer.authorizedPersons.removeAll { $0.id == person.id }
                    }
                    customerStore.updateCustomerLocally(customer)
                }
                Button("Cancel", role: .cancel) {}
            } message: { person in
                Text("Are you sure you want to delete \(person.fullName) from authorized persons?")
            }
        }
        #if true
        .presentationDetents(activeDetents, selection: $selectedDetent)
        #endif
    }
    
    private func formatPhoneNumber(newNumber: String, oldNumber: String) -> String {
        // 1. Detect if the user pressed backspace
        let isDeleting = newNumber.count < oldNumber.count
        
        // 2. Extract raw digits
        var numbers = newNumber.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        // 3. If deleting and the last raw character was blocked by a mask constraint,
        // drop the trailing digit so backspacing over a dash actually deletes a number.
        if isDeleting && oldNumber.suffix(1) == "-" && newNumber.count == oldNumber.count - 1 {
            if !numbers.isEmpty {
                numbers.removeLast()
            }
        }

        // Limit to standard 10-digit maximum
        let maxDigits = 10
        let cleanNumbers = String(numbers.prefix(maxDigits))
        
        // 4. Apply Mask (XXX-XXX-XXXX)
        let mask = "XXX-XXX-XXXX"
        var result = ""
        var index = cleanNumbers.startIndex

        for ch in mask {
            guard index < cleanNumbers.endIndex else { break }
            
            if ch == "X" {
                result.append(cleanNumbers[index])
                index = cleanNumbers.index(after: index)
            } else {
                result.append(ch)
            }
        }
        
        return result
    }
}
