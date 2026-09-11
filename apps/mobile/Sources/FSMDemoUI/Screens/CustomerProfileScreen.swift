import SwiftUI

public struct CustomerProfileScreen: View {
    @Environment(CustomerStore.self) var customerStore
    @Environment(EquipmentStore.self) var equipmentStore
    @Environment(InvoiceStore.self) var invoiceStore
    @Environment(ProposalStore.self) var proposalStore
    @Environment(MaintenancePlanStore.self) var maintenancePlanStore
    @Environment(AttachmentStore.self) var attachmentStore
    @Environment(NoteStore.self) var noteStore
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.openURL) var openURL
    
    var customer: Customer
    @State var showEditProfileSheet = false
    @State var showAddLocationSheet = false
    @State var showAuthorizedPersonsSheet = false
    @State var isAddingAuthPerson = false
    @State var showMessageSheet = false
    #if true
    @Namespace private var profileNamespace
    #endif
    
    public init(customer: Customer) {
        self.customer = customer
    }
    
    var profileLocations: [Address] {
        let locs = customer.locations
        guard let defaultLoc = customer.locations.first else { return [] }
        let billingLoc = customer.effectiveBillingAddress
        
        var result: [Address] = [defaultLoc]
        if billingLoc != defaultLoc && locs.contains(billingLoc) {
            result.append(billingLoc)
        }
        return result
    }
    
    private func locationGroupedRow(loc: Address, isDefault: Bool, isBilling: Bool) -> some View {
        let formattedStr = "\(loc.street), \(loc.city), \(loc.state) \(loc.zipCode)"
        
        return VStack(alignment: .leading, spacing: 10) {
            if isDefault || isBilling {
                HStack(spacing: 6) {
                    if isDefault {
                        let fg = colorScheme == .dark ? Color(red: 147/255.0, green: 197/255.0, blue: 253/255.0) : Color(red: 29/255.0, green: 78/255.0, blue: 216/255.0)
                        let bg = colorScheme == .dark ? Color(red: 23/255.0, green: 37/255.0, blue: 84/255.0) : Color(red: 239/255.0, green: 246/255.0, blue: 255/255.0)
                        let border = colorScheme == .dark ? Color(red: 30/255.0, green: 64/255.0, blue: 175/255.0) : Color(red: 191/255.0, green: 219/255.0, blue: 254/255.0)
                        Text("Default")
                            .font(.caption.weight(.medium))
                            .foregroundColor(fg)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(bg)
                            .cornerRadius(6)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(border, lineWidth: 1)
                            )
                    }
                    
                    if isBilling {
                        let fg = colorScheme == .dark ? Color(red: 110/255.0, green: 231/255.0, blue: 183/255.0) : Color(red: 4/255.0, green: 120/255.0, blue: 87/255.0)
                        let bg = colorScheme == .dark ? Color(red: 2/255.0, green: 44/255.0, blue: 34/255.0) : Color(red: 236/255.0, green: 253/255.0, blue: 245/255.0)
                        let border = colorScheme == .dark ? Color(red: 6/255.0, green: 95/255.0, blue: 70/255.0) : Color(red: 167/255.0, green: 243/255.0, blue: 208/255.0)
                        Text("Billing")
                            .font(.caption.weight(.medium))
                            .foregroundColor(fg)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(bg)
                            .cornerRadius(6)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(border, lineWidth: 1)
                            )
                    }
                }
            }
            
            Text(formattedStr)
                .font(.callout)
                .foregroundColor(.primary)
                .lineLimit(1)
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                // 1. Top Customer Contact Card (Centered)
                VStack(alignment: .center, spacing: 14) {
                    ViewThatFits(in: .horizontal) {
                        // Primary (1 line): HStack with scaling title text and indicator badge side-by-side
                        HStack(alignment: .center, spacing: 8) {
                            Text(customer.displayName)
                                .font(.title3.weight(.bold))
                                .foregroundColor(.primary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                            
                            Text(customer.customerType.rawValue.capitalized)
                                .font(.caption.weight(.medium))
                                .foregroundColor(colorScheme == .dark ? Color(white: 0.75) : .secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(colorScheme == .dark ? Color(white: 0.07) : Color(white: 0, opacity: 0.05))
                                .cornerRadius(6)
                                .alignmentGuide(VerticalAlignment.center) { d in
                                    d[VerticalAlignment.center]
                                }
                        }
                        
                        // Fallback (2 lines): VStack centering indicator badge directly underneath the title
                        VStack(alignment: .center, spacing: 6) {
                            Text(customer.displayName)
                                .font(.title3.weight(.bold))
                                .foregroundColor(.primary)
                                .lineLimit(1)
                                .minimumScaleFactor(0.70)
                                .multilineTextAlignment(.center)
                            
                            Text(customer.customerType.rawValue.capitalized)
                                .font(.caption.weight(.medium))
                                .foregroundColor(colorScheme == .dark ? Color(white: 0.75) : .secondary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(colorScheme == .dark ? Color(white: 0.07) : Color(white: 0, opacity: 0.05))
                                .cornerRadius(6)
                        }
                    }
                    
                    GlassEffectContainer(spacing: 24.0) {
                        HStack(spacing: 24.0) {
                            Button {
                                let sanitized = customer.phone.filter { "+0123456789".contains($0) }
                                #if os(iOS) && canImport(MessageUI)
                                if MessageComposeView.canSendText() {
                                    showMessageSheet = true
                                } else if let url = URL(string: "sms:\(sanitized)") {
                                    openURL(url)
                                }
                                #else
                                if let url = URL(string: "sms:\(sanitized)") {
                                    openURL(url)
                                }
                                #endif
                            } label: {
                                Image(systemName: "message.fill")
                                    .font(.title2)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 48, height: 48)
                            }
                            #if os(iOS)
                            .buttonStyle(.glass)
                            #else
                            .buttonStyle(PlainButtonStyle())
                            #endif
                            .accessibilityLabel("Message")
                            .sheet(isPresented: $showMessageSheet) {
                                MessageComposeView(recipient: customer.phone)
                                    .ignoresSafeArea()
                            }
                            
                            Button {
                                if let url = URL(string: "tel:\(customer.phone)") {
                                    openURL(url)
                                }
                            } label: {
                                Image(systemName: "phone.fill")
                                    .font(.title2)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 48, height: 48)
                            }
                            #if os(iOS)
                            .buttonStyle(.glass)
                            #else
                            .buttonStyle(PlainButtonStyle())
                            #endif
                            .accessibilityLabel("Call")
                            
                            Button {
                                if let url = URL(string: "mailto:\(customer.email)") {
                                    openURL(url)
                                }
                            } label: {
                                Image(systemName: "envelope.fill")
                                    .font(.title2)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 48, height: 48)
                            }
                            #if os(iOS)
                            .buttonStyle(.glass)
                            #else
                            .buttonStyle(PlainButtonStyle())
                            #endif
                            .accessibilityLabel("Email")
                            
                            Button {
                                isAddingAuthPerson = false
                                showAuthorizedPersonsSheet = true
                            } label: {
                                Image(systemName: "person.badge.shield.checkmark.fill")
                                    .font(.title2)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 48, height: 48)
                            }
                            #if os(iOS)
                            .buttonStyle(.glass)
                            #else
                            .buttonStyle(PlainButtonStyle())
                            #endif
                            .accessibilityLabel("Authorized Persons")
                        }
                    }
                }
                .padding(18)
                .frame(maxWidth: .infinity, alignment: .center)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // 2. Locations Grouped Card
                VStack(spacing: 0) {
                    HStack {
                        Text("Locations")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                    .frame(minHeight: 48)
                    
                    Divider().padding(.horizontal, 20)
                    
                    ForEach(Array(profileLocations.enumerated()), id: \.element) { idx, loc in
                        let isDefault = (loc == customer.locations.first)
                        let isBilling = (loc == customer.effectiveBillingAddress || customer.locations.count == 1)
                        locationGroupedRow(loc: loc, isDefault: isDefault, isBilling: isBilling)
                        Divider().padding(.horizontal, 20)
                    }
                    
                    NavigationLink {
                        CustomerLocationsScreen(customer: customer)
                    } label: {
                        HStack {
                            Text("View All")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.indigo)
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.indigo)
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                        .frame(minHeight: 48)
                        #if os(iOS)
                        .contentShape(Rectangle())
                        #endif
                    }
                    .buttonStyle(.plain)
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // 3. Menu Nav Links (Non-filled variants & wrench.adjustable)
                VStack(spacing: 0) {
                    NavigationLink(destination: CustomerSubScreen(title: "Job History", customer: customer)) {
                        ProfileNavLinkRow(title: "Job History", systemImage: "clock.arrow.circlepath")
                    }
                    Divider().padding(.horizontal, 20)
                    NavigationLink(destination: CustomerSubScreen(title: "Attachments", customer: customer)) {
                        ProfileNavLinkRow(title: "Attachments", systemImage: "paperclip")
                    }
                    Divider().padding(.horizontal, 20)
                    NavigationLink(destination: CustomerSubScreen(title: "Notes", customer: customer)) {
                        ProfileNavLinkRow(title: "Notes", systemImage: "note.text")
                    }
                    Divider().padding(.horizontal, 20)
                    NavigationLink(destination: CustomerSubScreen(title: "Equipment", customer: customer)) {
                        ProfileNavLinkRow(title: "Equipment", systemImage: "wrench.adjustable")
                    }
                    Divider().padding(.horizontal, 20)
                    NavigationLink(destination: CustomerSubScreen(title: "Proposals", customer: customer)) {
                        ProfileNavLinkRow(title: "Proposals", systemImage: "doc.text")
                    }
                    Divider().padding(.horizontal, 20)
                    NavigationLink(destination: CustomerSubScreen(title: "Invoices", customer: customer)) {
                        ProfileNavLinkRow(title: "Invoices", systemImage: "doc.text")
                    }
                    Divider().padding(.horizontal, 20)
                    NavigationLink(destination: CustomerSubScreen(title: "Maintenance Plans", customer: customer)) {
                        ProfileNavLinkRow(title: "Maintenance Plans", systemImage: "book.and.wrench")
                    }
                    Divider().padding(.horizontal, 20)
                    NavigationLink(destination: CustomerSubScreen(title: "Payment Accounts", customer: customer)) {
                        ProfileNavLinkRow(title: "Payment Accounts", systemImage: "creditcard")
                    }
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            .padding(16)
        }
        .task {
            await equipmentStore.fetchEquipment(for: customer)
            await invoiceStore.fetchInvoices(for: customer)
            await proposalStore.fetchProposals(for: customer)
            await maintenancePlanStore.fetchPlans(for: customer)
            await attachmentStore.fetchAttachments(customerId: customer.id)
            await noteStore.fetchNotes(customerId: customer.id)
        }
        .navigationTitle("Customer Profile")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .background(Color.murphysGroupedBackground)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                #if true
                Button("Edit") {
                    showEditProfileSheet = true
                }
                .font(.callout.weight(.semibold))
                .applyMatchedSource(id: "editProfile", in: profileNamespace)
                #else
                Button("Edit") {
                    showEditProfileSheet = true
                }
                .font(.callout.weight(.semibold))
                #endif
            }
        }
        .sheet(isPresented: $showEditProfileSheet) {
            NavigationStack {
                CustomerAddScreen(customerToEdit: customer)
            }
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showAddLocationSheet) {
            AddLocationSheet { newLoc in
                customer.locations.append(newLoc)
                customerStore.updateCustomerLocally(customer)
            }
        }
        .sheet(isPresented: $showAuthorizedPersonsSheet) {
            CustomerAuthorizedPersonsSheet(customer: customer)
        }
    }
}

struct ProfileField: View {
    var label: String
    @Binding var value: String
    var isEditing: Bool
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(width: 65, alignment: .leading)
            
            if isEditing {
                TextField(label, text: $value)
                    .textFieldStyle(.roundedBorder)
                    .font(.subheadline)
            } else {
                Text(value)
                    .font(.subheadline)
                    .foregroundColor(.primary)
                Spacer()
            }
        }
    }
}

struct ProfileNavLinkRow: View {
    var title: String
    var systemImage: String
    
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.callout)
                .foregroundColor(.indigo)
                .frame(width: 24, alignment: .center)
            
            Text(title)
                .font(.callout)
                .foregroundColor(.primary)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary.opacity(0.6))
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        #if os(iOS)
        .contentShape(Rectangle())
        #endif
    }
}

struct CustomerLocationTileView: View {
    @Environment(CustomerStore.self) var customerStore
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.openURL) var openURL
    var customer: Customer
    var loc: Address
    var index: Int
    
    @State var showDeleteConfirmation = false
    
    var isDefault: Bool { index == 0 }
    var isBilling: Bool { loc == customer.effectiveBillingAddress || customer.locations.count == 1 }
    var formattedStr: String { "\(loc.street), \(loc.city), \(loc.state) \(loc.zipCode)" }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if isDefault || isBilling {
                HStack(spacing: 8) {
                    if isDefault {
                        let fg = colorScheme == .dark ? Color(red: 147/255.0, green: 197/255.0, blue: 253/255.0) : Color(red: 29/255.0, green: 78/255.0, blue: 216/255.0)
                        let bg = colorScheme == .dark ? Color(red: 23/255.0, green: 37/255.0, blue: 84/255.0) : Color(red: 239/255.0, green: 246/255.0, blue: 255/255.0)
                        let border = colorScheme == .dark ? Color(red: 30/255.0, green: 64/255.0, blue: 175/255.0) : Color(red: 191/255.0, green: 219/255.0, blue: 254/255.0)
                        Text("Default")
                            .font(.caption.weight(.medium))
                            .foregroundColor(fg)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(bg)
                            .cornerRadius(6)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(border, lineWidth: 1)
                            )
                    }
                    
                    if isBilling {
                        let fg = colorScheme == .dark ? Color(red: 110/255.0, green: 231/255.0, blue: 183/255.0) : Color(red: 4/255.0, green: 120/255.0, blue: 87/255.0)
                        let bg = colorScheme == .dark ? Color(red: 2/255.0, green: 44/255.0, blue: 34/255.0) : Color(red: 236/255.0, green: 253/255.0, blue: 245/255.0)
                        let border = colorScheme == .dark ? Color(red: 6/255.0, green: 95/255.0, blue: 70/255.0) : Color(red: 167/255.0, green: 243/255.0, blue: 208/255.0)
                        Text("Billing")
                            .font(.caption.weight(.medium))
                            .foregroundColor(fg)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(bg)
                            .cornerRadius(6)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(border, lineWidth: 1)
                            )
                    }
                }
            }
            
            HStack(alignment: .center, spacing: 10) {
                Text(formattedStr)
                    .font(.callout)
                    .foregroundColor(.primary)
                    .lineLimit(1)
                
                Spacer()
                
                Menu {
                    Button(action: {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                            if let idx = customer.locations.firstIndex(where: { $0 == loc }), idx != 0 {
                                let item = customer.locations.remove(at: idx)
                                customer.locations.insert(item, at: 0)
                                customer.address = item
                                customerStore.updateCustomerLocally(customer)
                            }
                        }
                    }) {
                        Label(isDefault ? "Default Address  ✓" : "Default Address", systemImage: "star")
                    }
                    
                    Button(action: {
                        customer.effectiveBillingAddress = loc
                        customerStore.updateCustomerLocally(customer)
                    }) {
                        Label(isBilling ? "Billing Address  ✓" : "Billing Address", systemImage: "creditcard")
                    }
                    
                    Button(action: {
                        let encoded = formattedStr.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                        if let url = URL(string: "https://maps.apple.com/?q=\(encoded)") {
                            openURL(url)
                        }
                    }) {
                        Label("Open in Maps", systemImage: "map")
                    }
                    
                    if customer.locations.count > 1 {
                        Button(role: .destructive, action: {
                            showDeleteConfirmation = true
                        }) {
                            Label("Delete Address", systemImage: "trash")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.body.weight(.medium))
                        .foregroundColor(.secondary.opacity(0.7))
                        .frame(width: 24, height: 24)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(14)
            .background(Color(white: 0, opacity: 0.02))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.black.opacity(0.06), lineWidth: 1)
            )
            .confirmationDialog("Delete Location?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
                Button("Delete Location", role: .destructive) {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                        customer.locations.removeAll(where: { $0 == loc })
                        if customer.address == loc, let first = customer.locations.first {
                            customer.address = first
                        }
                        customerStore.updateCustomerLocally(customer)
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to delete this location?")
            }
        }
    }
}










