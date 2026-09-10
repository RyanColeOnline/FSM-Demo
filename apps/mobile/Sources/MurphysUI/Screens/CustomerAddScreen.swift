import SwiftUI

public enum AddCustomerFocusField: Hashable, Sendable {
    case firstName
    case lastName
    case company
    case phone(UUID)
    case email(UUID)
    case addressStreet(UUID)
    case addressStreet2(UUID)
    case addressCity(UUID)
    case addressState(UUID)
    case addressZip(UUID)
    case authorizedFirstName(UUID)
    case authorizedLastName(UUID)
    case authorizedPhone(UUID)
    case authorizedEmail(UUID)
}

public struct DynamicField: Identifiable, Equatable, Sendable {
    public let id: UUID
    public var label: String
    public var value: String
    public var isDeleteRevealed: Bool
    
    public init(id: UUID = UUID(), label: String, value: String = "", isDeleteRevealed: Bool = false) {
        self.id = id
        self.label = label
        self.value = value
        self.isDeleteRevealed = isDeleteRevealed
    }
}

public struct DynamicAddress: Identifiable, Equatable, Sendable {
    public let id: UUID
    public var label: String
    public var street: String
    public var street2: String
    public var city: String
    public var state: String
    public var zipCode: String
    public var isDeleteRevealed: Bool
    
    public init(
        id: UUID = UUID(),
        label: String,
        street: String = "",
        street2: String = "",
        city: String = "",
        state: String = "",
        zipCode: String = "",
        isDeleteRevealed: Bool = false
    ) {
        self.id = id
        self.label = label
        self.street = street
        self.street2 = street2
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.isDeleteRevealed = isDeleteRevealed
    }
}

public struct DynamicAuthorizedPerson: Identifiable, Equatable, Sendable {
    public let id: UUID
    public var positionLabel: String
    public var firstName: String
    public var lastName: String
    public var phone: String
    public var email: String
    public var isDeleteRevealed: Bool
    
    public init(
        id: UUID = UUID(),
        positionLabel: String = "Owner",
        firstName: String = "",
        lastName: String = "",
        phone: String = "",
        email: String = "",
        isDeleteRevealed: Bool = false
    ) {
        self.id = id
        self.positionLabel = positionLabel
        self.firstName = firstName
        self.lastName = lastName
        self.phone = phone
        self.email = email
        self.isDeleteRevealed = isDeleteRevealed
    }
}

public struct DynamicResidentialAuthorizedPerson: Identifiable, Equatable, Sendable {
    public let id: UUID
    public var positionLabel: String
    public var firstName: String
    public var lastName: String
    public var phone: String
    public var email: String
    public var isDeleteRevealed: Bool
    
    public init(
        id: UUID = UUID(),
        positionLabel: String = "",
        firstName: String = "",
        lastName: String = "",
        phone: String = "",
        email: String = "",
        isDeleteRevealed: Bool = false
    ) {
        self.id = id
        self.positionLabel = positionLabel
        self.firstName = firstName
        self.lastName = lastName
        self.phone = phone
        self.email = email
        self.isDeleteRevealed = isDeleteRevealed
    }
}

public struct LabelTarget: Identifiable {
    public let id = UUID()
    public var title: String
    public var category: String
    public var options: [String]
    public var currentSelection: String
    public var onSelect: (String) -> Void
}

public struct CustomerAddScreen: View {
    @Environment(CustomerStore.self) var customerStore
    @Environment(\.dismiss) var dismiss
    
    var customerToEdit: Customer?
    
    @State var firstName = ""
    @State var lastName = ""
    @State var company = ""
    
    @State var customerType: AddressType = .residential
    @State var paymentTerms: String = ""
    @State var optOutOfTexts = false
    @State var optOutOfEmails = false
    
    @State var phones: [DynamicField] = []
    @State var emails: [DynamicField] = []
    @State var addresses: [DynamicAddress] = []
    @State var allCustomerLocations: [Address] = []
    @State var showManageAddressesSheet = false
    @State var authorizedPersons: [DynamicAuthorizedPerson] = []
    @State var residentialAuthorizedPersons: [DynamicResidentialAuthorizedPerson] = []
    
    @State var userCustomLabels: [String] = []
    
    @FocusState var focusedField: AddCustomerFocusField?
    
    @State var activeLabelTarget: LabelTarget? = nil
    
    public init(customerToEdit: Customer? = nil) {
        self.customerToEdit = customerToEdit
        if let c = customerToEdit {
            let fullName = c.name
            var parsedFirst = ""
            var parsedLast = ""
            var parsedCompany = ""
            
            if fullName.contains("(") && fullName.hasSuffix(")") {
                let parts = fullName.components(separatedBy: "(")
                let namePart = parts[0].trimmingCharacters(in: .whitespacesAndNewlines)
                let companyPart = parts[1].replacingOccurrences(of: ")", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
                
                parsedCompany = companyPart
                let nameComponents = namePart.components(separatedBy: " ")
                parsedFirst = nameComponents.first ?? ""
                parsedLast = nameComponents.dropFirst().joined(separator: " ")
            } else if c.customerType == .commercial {
                parsedCompany = fullName
            } else {
                let nameComponents = fullName.components(separatedBy: " ")
                parsedFirst = nameComponents.first ?? ""
                parsedLast = nameComponents.dropFirst().joined(separator: " ")
            }
            
            self._firstName = State(initialValue: parsedFirst)
            self._lastName = State(initialValue: parsedLast)
            self._company = State(initialValue: parsedCompany)
            self._customerType = State(initialValue: c.customerType)
            self._paymentTerms = State(initialValue: c.paymentTerms ?? "")
            
            if !c.phone.isEmpty {
                self._phones = State(initialValue: [DynamicField(label: "mobile", value: c.phone)])
            } else {
                self._phones = State(initialValue: [])
            }
            
            if !c.email.isEmpty {
                self._emails = State(initialValue: [DynamicField(label: "home", value: c.email)])
            } else {
                self._emails = State(initialValue: [])
            }
            
            let locs = c.locations.isEmpty ? [c.address] : c.locations
            self._allCustomerLocations = State(initialValue: locs)
            
            let dynamicAddresses = locs.prefix(2).map { loc in
                DynamicAddress(
                    label: loc.type == .residential ? "home" : "work",
                    street: loc.street,
                    street2: "",
                    city: loc.city,
                    state: loc.state,
                    zipCode: loc.zipCode
                )
            }
            self._addresses = State(initialValue: Array(dynamicAddresses))
            
            if c.customerType == .commercial {
                self._authorizedPersons = State(initialValue: [DynamicAuthorizedPerson(positionLabel: "Owner")])
            } else {
                self._authorizedPersons = State(initialValue: [])
            }
        } else {
            self._firstName = State(initialValue: "")
            self._lastName = State(initialValue: "")
            self._company = State(initialValue: "")
            self._customerType = State(initialValue: .residential)
            self._paymentTerms = State(initialValue: "")
            self._phones = State(initialValue: [])
            self._emails = State(initialValue: [])
            self._addresses = State(initialValue: [])
            self._allCustomerLocations = State(initialValue: [])
            self._authorizedPersons = State(initialValue: [])
        }
    }
    
    var isFormValid: Bool {
        if customerType == .commercial {
            let isCompanyValid = !company.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            let isAuthPersonsValid = !authorizedPersons.isEmpty && authorizedPersons.allSatisfy {
                !$0.firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
                !$0.lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            }
            let isPhonesValid = !phones.isEmpty && phones.allSatisfy { !$0.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            let isEmailsValid = !emails.isEmpty && emails.allSatisfy { !$0.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            let isAddressesValid = !addresses.isEmpty && addresses.allSatisfy {
                !$0.street.isEmpty && !$0.city.isEmpty && !$0.state.isEmpty && !$0.zipCode.isEmpty
            }
            return isCompanyValid && isAuthPersonsValid && isPhonesValid && isEmailsValid && isAddressesValid
        } else {
            let isNameValid = !firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
                !lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            let isPhonesValid = !phones.isEmpty && phones.allSatisfy { !$0.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            let isEmailsValid = !emails.isEmpty && emails.allSatisfy { !$0.value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            let isAddressesValid = !addresses.isEmpty && addresses.allSatisfy {
                !$0.street.isEmpty && !$0.city.isEmpty && !$0.state.isEmpty && !$0.zipCode.isEmpty
            }
            return isNameValid && isPhonesValid && isEmailsValid && isAddressesValid
        }
    }
    
    var canSave: Bool {
        isFormValid
    }
    
    var isEditMode: Bool {
        customerToEdit != nil
    }
    
    var phoneEmailTextColor: Color {
        isEditMode ? .primary : .blue
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Official Apple Segmented Picker Control
                Picker("Customer Type", selection: Binding(
                    get: { customerType },
                    set: { newType in
                        withAnimation(.easeInOut(duration: 0.2)) {
                            customerType = newType
                            if newType == .commercial {
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                    focusedField = .company
                                }
                            } else {
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                    focusedField = .firstName
                                }
                            }
                        }
                    }
                )) {
                    Text("Residential").tag(AddressType.residential)
                    Text("Commercial").tag(AddressType.commercial)
                }
                .pickerStyle(.segmented)
                .tint(.primary)
                .padding(.horizontal)
                .padding(.top, 12)
                
                // 1. Name / Company Card
                VStack(spacing: 0) {
                    if customerType == .residential {
                        HStack {
                            TextField("First name", text: $firstName)
                                .focused($focusedField, equals: .firstName)
                                .font(.body)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                        
                        HStack {
                            TextField("Last name", text: $lastName)
                                .focused($focusedField, equals: .lastName)
                                .font(.body)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                    } else {
                        HStack {
                            TextField("Company", text: $company)
                                .focused($focusedField, equals: .company)
                                .font(.body)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                    }
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                .padding(.horizontal)
                
                // 2. Commercial Authorized Person Section
                if customerType == .commercial {
                    VStack(spacing: 0) {
                        ForEach(Array(authorizedPersons.enumerated()), id: \.element.id) { idx, item in
                            HStack(alignment: .center, spacing: 12) {
                                Button(action: {
                                    withAnimation(.easeInOut) {
                                        authorizedPersons[idx].isDeleteRevealed.toggle()
                                    }
                                }) {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundColor(.red)
                                        .font(.title3)
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                Button(action: {
                                    let top10Positions = [
                                        "Owner",
                                        "President / CEO",
                                        "General Manager",
                                        "Manager",
                                        "Operations Manager",
                                        "Sales Director",
                                        "HR Manager",
                                        "Accounts Payable",
                                        "Property Manager",
                                        "Site Supervisor"
                                    ]
                                    activeLabelTarget = LabelTarget(
                                        title: "Position",
                                        category: "position",
                                        options: top10Positions,
                                        currentSelection: item.positionLabel,
                                        onSelect: { selected in
                                            authorizedPersons[idx].positionLabel = selected
                                        }
                                    )
                                }) {
                                    HStack(spacing: 4) {
                                        Text(formatPositionLabel(item.positionLabel))
                                            .font(.footnote.weight(.medium))
                                            .lineLimit(4)
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
                                    .frame(height: 135)
                                
                                 VStack(alignment: .leading, spacing: 0) {
                                     HStack {
                                         TextField("First name", text: Binding(
                                             get: { authorizedPersons.first(where: { $0.id == item.id })?.firstName ?? "" },
                                             set: { val in
                                                 if let i = authorizedPersons.firstIndex(where: { $0.id == item.id }) {
                                                     authorizedPersons[i].firstName = val
                                                 }
                                             }
                                         ))
                                         .focused($focusedField, equals: .authorizedFirstName(item.id))
                                         .font(.body)
                                     }
                                     .padding(.vertical, 12)
                                     
                                     Divider()
                                     
                                     HStack {
                                         TextField("Last name", text: Binding(
                                             get: { authorizedPersons.first(where: { $0.id == item.id })?.lastName ?? "" },
                                             set: { val in
                                                 if let i = authorizedPersons.firstIndex(where: { $0.id == item.id }) {
                                                     authorizedPersons[i].lastName = val
                                                 }
                                             }
                                         ))
                                         .focused($focusedField, equals: .authorizedLastName(item.id))
                                         .font(.body)
                                     }
                                     .padding(.vertical, 12)
                                     
                                     Divider()
                                     
                                     HStack {
                                         TextField("Phone number", text: Binding(
                                             get: { authorizedPersons.first(where: { $0.id == item.id })?.phone ?? "" },
                                             set: { val in
                                                 if let i = authorizedPersons.firstIndex(where: { $0.id == item.id }) {
                                                     authorizedPersons[i].phone = val
                                                 }
                                             }
                                         ))
                                         .focused($focusedField, equals: .authorizedPhone(item.id))
                                         .font(.body)
                                         #if os(iOS)
                                         .keyboardType(.phonePad)
                                         #endif
                                     }
                                     .padding(.vertical, 12)
                                     
                                     Divider()
                                     
                                     HStack {
                                         TextField("Email address", text: Binding(
                                             get: { authorizedPersons.first(where: { $0.id == item.id })?.email ?? "" },
                                             set: { val in
                                                 if let i = authorizedPersons.firstIndex(where: { $0.id == item.id }) {
                                                     authorizedPersons[i].email = val
                                                 }
                                             }
                                         ))
                                         .focused($focusedField, equals: .authorizedEmail(item.id))
                                         .font(.body)
                                         #if os(iOS)
                                         .keyboardType(.emailAddress)
                                         .autocapitalization(.none)
                                         #endif
                                     }
                                     .padding(.vertical, 12)
                                 }
                                
                                if item.isDeleteRevealed {
                                    Button(action: {
                                        withAnimation(.easeInOut) {
                                            authorizedPersons.removeAll { $0.id == item.id }
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
                            
                            Divider().padding(.horizontal, 20)
                        }
                        
                        Button(action: {
                            let newPerson = DynamicAuthorizedPerson(positionLabel: "Owner")
                            withAnimation(.easeInOut) {
                                authorizedPersons.append(newPerson)
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                focusedField = .authorizedFirstName(newPerson.id)
                            }
                        }) {
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
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
                
                // 3. Phone Card
                VStack(spacing: 0) {
                    ForEach(Array(phones.enumerated()), id: \.element.id) { idx, item in
                        HStack(spacing: 12) {
                            Button(action: {
                                withAnimation(.easeInOut) {
                                    phones[idx].isDeleteRevealed.toggle()
                                    focusedField = nil
                                }
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                                    .font(.title3)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Button(action: {
                                let phoneOptions = ["mobile", "home", "work", "school", "iPhone", "Apple Watch", "main", "home fax", "work fax", "pager", "other"]
                                activeLabelTarget = LabelTarget(
                                    title: "Label",
                                    category: "phone",
                                    options: phoneOptions,
                                    currentSelection: item.label,
                                    onSelect: { selected in
                                        phones[idx].label = selected
                                    }
                                )
                            }) {
                                let labelText: String = item.label
                                HStack(spacing: 4) {
                                    Text(labelText)
                                        .font(.subheadline)
                                    Image(systemName: "chevron.right")
                                        .font(.caption2.weight(.bold))
                                }
                                .foregroundColor(.blue)
                            }
                            .buttonStyle(PlainButtonStyle())
                            .frame(width: 65, alignment: .leading)
                            
                            HStack {
                                TextField("Phone", text: Binding(
                                    get: { phones.first(where: { $0.id == item.id })?.value ?? "" },
                                    set: { val in
                                        if let i = phones.firstIndex(where: { $0.id == item.id }) {
                                            phones[i].value = val
                                        }
                                    }
                                ))
                                .focused($focusedField, equals: .phone(item.id))
                                .font(.body)
                                .keyboardType(.phonePad)
                                .foregroundColor(phoneEmailTextColor)
                            }
                            
                            if item.isDeleteRevealed {
                                Button(action: {
                                    withAnimation(.easeInOut) {
                                        phones.removeAll { $0.id == item.id }
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
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                    }
                    
                    Button(action: {
                        let newField = DynamicField(label: "mobile")
                        withAnimation(.easeInOut) {
                            phones.append(newField)
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            focusedField = .phone(newField.id)
                        }
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.green)
                                .font(.title3)
                            Text("add phone")
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
                .padding(.horizontal)
                
                // 4. Email Card
                VStack(spacing: 0) {
                    ForEach(Array(emails.enumerated()), id: \.element.id) { idx, item in
                        HStack(spacing: 12) {
                            Button(action: {
                                withAnimation(.easeInOut) {
                                    emails[idx].isDeleteRevealed.toggle()
                                    focusedField = nil
                                }
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                                    .font(.title3)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Button(action: {
                                let emailOptions = ["home", "work", "school", "other"]
                                activeLabelTarget = LabelTarget(
                                    title: "Label",
                                    category: "email",
                                    options: emailOptions,
                                    currentSelection: item.label,
                                    onSelect: { selected in
                                        emails[idx].label = selected
                                    }
                                )
                            }) {
                                HStack(spacing: 4) {
                                    Text(item.label)
                                        .font(.subheadline)
                                    Image(systemName: "chevron.right")
                                        .font(.caption2.weight(.bold))
                                }
                                .foregroundColor(.blue)
                            }
                            .buttonStyle(PlainButtonStyle())
                            .frame(width: 65, alignment: .leading)
                            
                            HStack {
                                TextField("Email", text: Binding(
                                    get: { emails.first(where: { $0.id == item.id })?.value ?? "" },
                                    set: { val in
                                        if let i = emails.firstIndex(where: { $0.id == item.id }) {
                                            emails[i].value = val
                                        }
                                    }
                                ))
                                .focused($focusedField, equals: .email(item.id))
                                .font(.body)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .foregroundColor(phoneEmailTextColor)
                            }
                            
                            if item.isDeleteRevealed {
                                Button(action: {
                                    withAnimation(.easeInOut) {
                                        emails.removeAll { $0.id == item.id }
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
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                    }
                    
                    Button(action: {
                        let newField = DynamicField(label: "home")
                        withAnimation(.easeInOut) {
                            emails.append(newField)
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                            focusedField = .email(newField.id)
                        }
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.green)
                                .font(.title3)
                            Text("add email")
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
                .padding(.horizontal)
                
                // 5. Address Card
                VStack(spacing: 0) {
                    ForEach(Array(addresses.enumerated()), id: \.element.id) { idx, item in
                        HStack(alignment: .center, spacing: 12) {
                            Button(action: {
                                withAnimation(.easeInOut) {
                                    addresses[idx].isDeleteRevealed.toggle()
                                    focusedField = nil
                                }
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                                    .font(.title3)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Button(action: {
                                let addressOptions = ["home", "work", "school", "other"]
                                activeLabelTarget = LabelTarget(
                                    title: "Label",
                                    category: "address",
                                    options: addressOptions,
                                    currentSelection: item.label,
                                    onSelect: { selected in
                                        addresses[idx].label = selected
                                    }
                                )
                            }) {
                                HStack(spacing: 4) {
                                    Text(item.label)
                                        .font(.subheadline)
                                        .lineLimit(1)
                                        .minimumScaleFactor(0.8)
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
                                    TextField("Street", text: Binding(
                                        get: { addresses.first(where: { $0.id == item.id })?.street ?? "" },
                                        set: { val in
                                            if let i = addresses.firstIndex(where: { $0.id == item.id }) {
                                                addresses[i].street = val
                                            }
                                        }
                                    ))
                                    .focused($focusedField, equals: .addressStreet(item.id))
                                    .font(.body)
                                }
                                .padding(.vertical, 12)
                                
                                Divider()
                                
                                HStack {
                                    TextField("Street 2", text: Binding(
                                        get: { addresses.first(where: { $0.id == item.id })?.street2 ?? "" },
                                        set: { val in
                                            if let i = addresses.firstIndex(where: { $0.id == item.id }) {
                                                addresses[i].street2 = val
                                            }
                                        }
                                    ))
                                    .focused($focusedField, equals: .addressStreet2(item.id))
                                    .font(.body)
                                }
                                .padding(.vertical, 12)
                                
                                Divider()
                                
                                HStack {
                                    TextField("City", text: Binding(
                                        get: { addresses.first(where: { $0.id == item.id })?.city ?? "" },
                                        set: { val in
                                            if let i = addresses.firstIndex(where: { $0.id == item.id }) {
                                                addresses[i].city = val
                                            }
                                        }
                                    ))
                                    .focused($focusedField, equals: .addressCity(item.id))
                                    .font(.body)
                                }
                                .padding(.vertical, 12)
                                
                                Divider()
                                
                                HStack(spacing: 0) {
                                    HStack {
                                        TextField("State", text: Binding(
                                            get: { addresses.first(where: { $0.id == item.id })?.state ?? "" },
                                            set: { val in
                                                if let i = addresses.firstIndex(where: { $0.id == item.id }) {
                                                    addresses[i].state = val
                                                }
                                            }
                                        ))
                                        .focused($focusedField, equals: .addressState(item.id))
                                        .font(.body)
                                    }
                                    
                                    Divider()
                                        .frame(height: 24)
                                        .padding(.horizontal, 12)
                                    
                                    HStack {
                                        TextField("ZIP", text: Binding(
                                            get: { addresses.first(where: { $0.id == item.id })?.zipCode ?? "" },
                                            set: { val in
                                                if let i = addresses.firstIndex(where: { $0.id == item.id }) {
                                                    addresses[i].zipCode = val
                                                }
                                            }
                                        ))
                                        .focused($focusedField, equals: .addressZip(item.id))
                                        .font(.body)
                                        .keyboardType(.numberPad)
                                    }
                                }
                                .padding(.vertical, 12)
                            }
                            
                            if item.isDeleteRevealed {
                                Button(action: {
                                    withAnimation(.easeInOut) {
                                        addresses.removeAll { $0.id == item.id }
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
                        
                        Divider().padding(.horizontal, 20)
                    }
                    
                    let hasTwoOrMoreLocations = addresses.count >= 2 || allCustomerLocations.count >= 2
                    
                    Button(action: {
                        if hasTwoOrMoreLocations {
                            showManageAddressesSheet = true
                        } else {
                            let newField = DynamicAddress(label: "home")
                            withAnimation(.easeInOut) {
                                addresses.append(newField)
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                focusedField = .addressStreet(newField.id)
                            }
                        }
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.green)
                                .font(.title3)
                            Text(hasTwoOrMoreLocations ? "add/view addresses" : "add address")
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
                .padding(.horizontal)
                
                // 5b. Residential Authorized Persons Section (No label column, 3 fields: First name, Last name, Phone number)
                if customerType == .residential {
                    VStack(spacing: 0) {
                        ForEach(Array(residentialAuthorizedPersons.enumerated()), id: \.element.id) { idx, item in
                            HStack(alignment: .center, spacing: 12) {
                                Button(action: {
                                    withAnimation(.easeInOut) {
                                        residentialAuthorizedPersons[idx].isDeleteRevealed.toggle()
                                    }
                                }) {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundColor(.red)
                                        .font(.title3)
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                Button(action: {
                                    let top10Positions = [
                                        "Spouse",
                                        "Partner",
                                        "Family Member",
                                        "Property Manager",
                                        "Tenant",
                                        "Caregiver",
                                        "Other"
                                    ]
                                    activeLabelTarget = LabelTarget(
                                        title: "Label",
                                        category: "position",
                                        options: top10Positions,
                                        currentSelection: item.positionLabel,
                                        onSelect: { selected in
                                            residentialAuthorizedPersons[idx].positionLabel = selected
                                        }
                                    )
                                }) {
                                    HStack(spacing: 4) {
                                        Text(item.positionLabel.isEmpty ? "Label" : item.positionLabel)
                                            .font(.footnote.weight(.medium))
                                            .lineLimit(4)
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
                                    .frame(height: 176)
                                
                                VStack(alignment: .leading, spacing: 0) {
                                    HStack {
                                        TextField("First name", text: Binding(
                                            get: { item.firstName },
                                            set: { residentialAuthorizedPersons[idx].firstName = $0 }
                                        ))
                                        .font(.body)
                                    }
                                    .frame(height: 44)
                                    
                                    Divider()
                                    
                                    HStack {
                                        TextField("Last name", text: Binding(
                                            get: { item.lastName },
                                            set: { residentialAuthorizedPersons[idx].lastName = $0 }
                                        ))
                                        .font(.body)
                                    }
                                    .frame(height: 44)
                                    
                                    Divider()
                                    
                                    HStack {
                                        TextField("Phone number", text: Binding(
                                            get: { item.phone },
                                            set: { residentialAuthorizedPersons[idx].phone = $0 }
                                        ))
                                        .font(.body)
                                        .keyboardType(.phonePad)
                                    }
                                    .frame(height: 44)
                                    
                                    Divider()
                                    
                                    HStack {
                                        TextField("Email address", text: Binding(
                                            get: { item.email },
                                            set: { residentialAuthorizedPersons[idx].email = $0 }
                                        ))
                                        .font(.body)
                                    }
                                    .frame(height: 44)
                                }
                                
                                if item.isDeleteRevealed {
                                    Button(action: {
                                        withAnimation(.easeInOut) {
                                            residentialAuthorizedPersons.removeAll { $0.id == item.id }
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
                            
                            Divider().padding(.horizontal, 20)
                        }
                        
                        Button(action: {
                            let newPerson = DynamicResidentialAuthorizedPerson()
                            withAnimation(.easeInOut) {
                                residentialAuthorizedPersons.append(newPerson)
                            }
                        }) {
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
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
                
                // 6. Settings & Preferences Section (Payment type above Opt out options, title label removed)
                VStack(alignment: .leading, spacing: 8) {
                    VStack(spacing: 0) {
                        HStack {
                            Text("Payment Terms")
                                .font(.callout.weight(.medium))
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            Menu {
                                Button(action: { paymentTerms = "30 days" }) {
                                    Label("30 days", systemImage: paymentTerms == "30 days" ? "checkmark" : "")
                                }
                                Button(action: { paymentTerms = "COD" }) {
                                    Label("COD", systemImage: paymentTerms == "COD" ? "checkmark" : "")
                                }
                                Button(action: { paymentTerms = "Due upon Receipt" }) {
                                    Label("Due upon Receipt", systemImage: paymentTerms == "Due upon Receipt" ? "checkmark" : "")
                                }
                                Button(action: { paymentTerms = "Home Warranty AHS/OR" }) {
                                    Label("Home Warranty AHS/OR", systemImage: paymentTerms == "Home Warranty AHS/OR" ? "checkmark" : "")
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    Text(paymentTerms.isEmpty ? "Select" : paymentTerms)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                        
                        Toggle("Opt-out of Notification Texts", isOn: $optOutOfTexts)
                            .font(.callout.weight(.medium))
                            .toggleStyle(.switch)
                            .tint(.green)
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                        
                        Toggle("Opt-out of Notification Emails", isOn: $optOutOfEmails)
                            .font(.callout.weight(.medium))
                            .toggleStyle(.switch)
                            .tint(.green)
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                .padding(.horizontal)
            }
        }
        #if true
        .scrollDismissesKeyboard(.interactively)
        #endif
        .onTapGesture {
            #if canImport(UIKit)
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            #endif
        }
        #if os(iOS)
        .scrollContentBackground(.hidden)
        #endif
        .background(Color.murphysGroupedBackground)
        .navigationTitle(isEditMode ? "Edit Profile" : "New Customer")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.subheadline.weight(.semibold))
                }
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    saveCustomer()
                } label: {
                    Image(systemName: "checkmark")
                        .font(.subheadline.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
                #if os(iOS)
                .buttonBorderShape(.circle)
                #endif
                .tint(.blue)
                .disabled(!canSave)
            }
        }
        .onAppear {
            if customerType == .residential {
                focusedField = .firstName
            } else {
                focusedField = .company
            }
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
        .sheet(isPresented: $showManageAddressesSheet) {
            CustomerManageAddressesSheet(
                customerName: customerType == .residential ? "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces) : company,
                allCustomerLocations: $allCustomerLocations,
                onSave: { updatedLocations in
                    allCustomerLocations = updatedLocations
                    let prefixCount = min(2, updatedLocations.count)
                    let updatedPrefix = updatedLocations.prefix(prefixCount).map { loc in
                        DynamicAddress(
                            label: loc.type == .residential ? "home" : "work",
                            street: loc.street,
                            street2: "",
                            city: loc.city,
                            state: loc.state,
                            zipCode: loc.zipCode
                        )
                    }
                    addresses = Array(updatedPrefix)
                }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
    }
    
    private func saveCustomer() {
        var nameString = ""
        if customerType == .commercial {
            if company.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                if let firstAuth = authorizedPersons.first {
                    nameString = "\(firstAuth.firstName) \(firstAuth.lastName)".trimmingCharacters(in: .whitespacesAndNewlines)
                } else {
                    nameString = company
                }
            } else {
                nameString = company
            }
        } else {
            nameString = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespacesAndNewlines)
        }
        
        let primaryStreet = addresses.first?.street ?? ""
        let primaryCity = addresses.first?.city ?? ""
        let primaryState = addresses.first?.state ?? ""
        let primaryZip = addresses.first?.zipCode ?? ""
        
        let address = Address(
            street: primaryStreet,
            city: primaryCity,
            state: primaryState,
            zipCode: primaryZip,
            type: customerType
        )
        
        let primaryPhone = phones.first?.value ?? ""
        let primaryEmail = emails.first?.value ?? ""
        
        let inlineLocations = addresses.map {
            Address(street: $0.street, city: $0.city, state: $0.state, zipCode: $0.zipCode, type: customerType)
        }
        
        var finalLocations: [Address] = inlineLocations
        if allCustomerLocations.count > addresses.count {
            let remaining = allCustomerLocations.dropFirst(addresses.count)
            finalLocations.append(contentsOf: remaining)
        }
        if finalLocations.isEmpty && !address.street.isEmpty {
            finalLocations = [address]
        }
        
        if let editCustomer = customerToEdit {
            editCustomer.name = nameString.trimmingCharacters(in: .whitespacesAndNewlines)
            editCustomer.email = primaryEmail
            editCustomer.phone = primaryPhone
            editCustomer.address = address
            editCustomer.customerType = customerType
            editCustomer.locations = finalLocations
            editCustomer.paymentTerms = paymentTerms
            
            Task {
                await CustomerStore.shared.updateCustomer(editCustomer)
                dismiss()
            }
        } else {
            let newCustomer = Customer(
                id: UUID(),
                name: nameString.trimmingCharacters(in: .whitespacesAndNewlines),
                email: primaryEmail,
                phone: primaryPhone,
                address: address,
                customerType: customerType,
                createdAt: Date(),
                locations: finalLocations,
                paymentTerms: paymentTerms
            )
            
            Task {
                await CustomerStore.shared.createCustomer(newCustomer)
                dismiss()
            }
        }
    }
    
    private func formatPositionLabel(_ text: String) -> String {
        switch text {
        case "General Manager":
            return "General\nManager"
        case "Operations Manager":
            return "Operations\nManager"
        case "President / CEO":
            return "President /\nCEO"
        case "Sales Director":
            return "Sales\nDirector"
        case "HR Manager":
            return "HR\nManager"
        case "Accounts Payable":
            return "Accounts\nPayable"
        case "Property Manager":
            return "Property\nManager"
        case "Site Supervisor":
            return "Site\nSupervisor"
        default:
            return text
        }
    }
}

struct LabelSelectionSheet: View {
    @Environment(\.dismiss) var dismiss
    var title: String = "Label"
    var options: [String]
    var currentSelection: String
    @Binding var customLabels: [String]
    var onSelect: (String) -> Void
    
    @State var isEditingCustomLabels = false
    @State var customInputText = ""
    @FocusState var isCustomFieldFocused: Bool
    
    var body: some View {
        NavigationStack {
            List {
                if isEditingCustomLabels {
                    // EDIT MODE: Displays ONLY the custom list of labels added with native Apple row editing & swipe-to-delete
                    Section {
                        if customLabels.isEmpty {
                            Text("No custom labels added")
                                .foregroundColor(.secondary)
                                .font(.subheadline)
                                .listRowBackground(Color.murphysCardBackground)
                        } else {
                            ForEach(customLabels, id: \.self) { labelItem in
                                Text(labelItem)
                                    .font(.body)
                                    .foregroundColor(.primary)
                                    .listRowBackground(Color.murphysCardBackground)
                            }
                            .onDelete { indexSet in
                                withAnimation {
                                    customLabels.remove(atOffsets: indexSet)
                                }
                            }
                        }
                    }
                } else {
                    // NORMAL SELECTION MODE (Grouped Table List)
                    Section {
                        ForEach(options, id: \.self) { option in
                            Button(action: {
                                onSelect(option)
                                dismiss()
                            }) {
                                HStack {
                                    Text(option)
                                        .font(.body)
                                        .foregroundColor(.primary)
                                    Spacer()
                                    if option == currentSelection {
                                        Image(systemName: "checkmark")
                                            .font(.callout.weight(.bold))
                                            .foregroundColor(.blue)
                                    }
                                }
                                #if os(iOS)
                                .contentShape(Rectangle())
                                #endif
                            }
                            .buttonStyle(PlainButtonStyle())
                            .listRowBackground(Color.murphysCardBackground)
                        }
                    }
                    
                    Section {
                        TextField("Add Custom Label", text: $customInputText)
                            .onSubmit {
                                saveAndSelectCustomLabel()
                            }
                        .focused($isCustomFieldFocused)
                        .font(.body)
                        .foregroundColor(.primary)
                        .listRowBackground(Color.murphysCardBackground)
                        
                        ForEach(customLabels, id: \.self) { customLabel in
                            Button(action: {
                                onSelect(customLabel)
                                dismiss()
                            }) {
                                HStack {
                                    Text(customLabel)
                                        .font(.body)
                                        .foregroundColor(.primary)
                                    Spacer()
                                    if customLabel == currentSelection {
                                        Image(systemName: "checkmark")
                                            .font(.callout.weight(.bold))
                                            .foregroundColor(.blue)
                                    }
                                }
                                #if os(iOS)
                                .contentShape(Rectangle())
                                #endif
                            }
                            .buttonStyle(PlainButtonStyle())
                            .listRowBackground(Color.murphysCardBackground)
                        }
                        .onDelete { indexSet in
                            withAnimation {
                                customLabels.remove(atOffsets: indexSet)
                            }
                        }
                    }
                }
            }
            #if os(iOS)
            .listStyle(.insetGrouped)
            #endif
            .padding(.top, -10)
            #if os(iOS)
            .environment(\.editMode, .constant(isEditingCustomLabels ? .active : .inactive))
            #endif
            .navigationTitle(title)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.subheadline.weight(.semibold))
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    if isCustomFieldFocused {
                        let hasText = !customInputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        Button {
                            saveAndSelectCustomLabel()
                        } label: {
                            Image(systemName: "checkmark")
                                .font(.subheadline.weight(.semibold))
                        }
                        .buttonStyle(.borderedProminent)
                        #if true
                        .buttonBorderShape(.circle)
                        #endif
                        .tint(Color.blue)
                        .disabled(!hasText)
                    } else if isEditingCustomLabels {
                        Button("Done") {
                            isEditingCustomLabels = false
                        }
                    } else if !customLabels.isEmpty {
                        Button("Edit") {
                            isEditingCustomLabels = true
                        }
                    }
                }
                #else
                ToolbarItem(placement: .cancellationAction) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                    }
                }
                #endif
            }
        }
        .presentationDragIndicator(.visible)
        #if os(iOS)
        .onAppear {
            UITextField.appearance().clearButtonMode = .whileEditing
        }
        #endif
    }
    
    private func saveAndSelectCustomLabel() {
        let trimmed = customInputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        if !customLabels.contains(trimmed) {
            customLabels.append(trimmed)
        }
        onSelect(trimmed)
        dismiss()
    }
}
