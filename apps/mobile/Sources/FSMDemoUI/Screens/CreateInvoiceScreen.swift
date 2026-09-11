import SwiftUI

public struct InvoiceItem: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var name: String
    public var code: String?
    public var price: Double
    
    public init(id: UUID = UUID(), name: String, code: String? = nil, price: Double) {
        self.id = id
        self.name = name
        self.code = code
        self.price = price
    }
    
    public var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: price)) ?? "$\(price)"
    }
}

public struct InvoiceItemNode: Identifiable, Hashable, Sendable {
    public let id: String
    public var name: String
    public var code: String?
    public var price: Double?
    public var children: [InvoiceItemNode]?
    
    public init(id: String, name: String, code: String? = nil, price: Double? = nil, children: [InvoiceItemNode]? = nil) {
        self.id = id
        self.name = name
        self.code = code
        self.price = price
        self.children = children
    }
    
    public var isLeaf: Bool {
        children == nil
    }
    
    public var formattedPriceText: String? {
        guard let p = price else { return nil }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: p)) ?? "$\(p)"
    }
}

public struct InvoiceDetailsScreen: View {
    var customer: Customer
    var appointment: Appointment?
    
    @Environment(\.dismiss) var dismiss
    
    @State var totalJobTime: String = "1 hr 30 min"
    @State var technician: String
    @State var issueDate: Date = Date()
    @State var dueDate: Date = Date()
    @State var paymentTerms: String = "Due Upon Receipt"
    @State var acceptedPaymentMethod: String = "All"
    @State var contractTerms: String = "Standard Terms"
    
    @State var billToCustomer: String
    @State var selectedBillingLocation: Address
    @State var selectedJobLocation: Address
    @State var selectedClass: String
    
    @State var pricingStrategy: String = "Flat Rate"
    @Binding var showMaintenancePlanPricing: Bool
    @Binding var showLineItemAmountsAndQuantity: Bool
    
    @State var isEdited: Bool = false
    @State var showDiscardAlert: Bool = false
    @State var showBillingLocationModal: Bool = false
    @State var showJobLocationModal: Bool = false
    
    public init(
        customer: Customer,
        appointment: Appointment? = nil,
        showMaintenancePlanPricing: Binding<Bool> = .constant(false),
        showLineItemAmountsAndQuantity: Binding<Bool> = .constant(true)
    ) {
        self.customer = customer
        self.appointment = appointment
        _technician = State(initialValue: appointment?.assignedTech ?? SessionManager.shared.currentUser?.name ?? "Justin Lung")
        _billToCustomer = State(initialValue: customer.name)
        
        let initialLoc = customer.locations.first ?? customer.address
        _selectedBillingLocation = State(initialValue: initialLoc)
        _selectedJobLocation = State(initialValue: initialLoc)
        
        _selectedClass = State(initialValue: customer.customerType == .commercial ? "Commercial" : "Residential")
        self._showMaintenancePlanPricing = showMaintenancePlanPricing
        self._showLineItemAmountsAndQuantity = showLineItemAmountsAndQuantity
    }
    
    let technicianOptions = ["Justin Lung", "Minor Cover", "Wes Rykoskey", "Andrew (Jr) Murphy", "Joe Colacino", "Robert Hudson", "Ethan Mitchell", "Matt Curtsinger", "Jon Martin"]
    let customerNameOptions = ["Evan Williams", "Fiona Gallagher", "John Smith", "Wayne Enterprises", "Robert Johnson"]
    let paymentTermOptions = ["Due Upon Receipt", "Net 15", "Net 30", "Net 60"]
    let paymentMethodOptions = ["All", "Debit or Credit"]
    let contractTermOptions = ["Standard Terms", "Net 30 Terms", "Custom Terms"]
    let classOptions = ["Residential", "Commercial"]
    let pricingStrategyOptions = ["Flat Rate", "Time & Materials", "Custom"]
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Section 1: General Details
                VStack(alignment: .leading, spacing: 8) {
                    Text("General Details")
                        .font(.footnote.weight(.bold))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, 4)
                    
                    VStack(spacing: 0) {
                        HStack {
                            Text("Total Job Time")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            Spacer()
                            Text(totalJobTime)
                                .font(.callout)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                        
                        Menu {
                            ForEach(technicianOptions, id: \.self) { tech in
                                Button(tech) {
                                    technician = tech
                                    isEdited = true
                                }
                            }
                        } label: {
                            HStack {
                                Text("Technician")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(technician)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.6))
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Divider().padding(.horizontal, 20)
                        
                        HStack {
                            Text("Issue Date")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            Spacer()
                            DatePicker("", selection: $issueDate, displayedComponents: [.date])
                                .labelsHidden()
                                .onChange(of: issueDate) { _, _ in isEdited = true }
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                        
                        HStack {
                            Text("Due Date")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            Spacer()
                            DatePicker("", selection: $dueDate, displayedComponents: [.date])
                                .labelsHidden()
                                .onChange(of: dueDate) { _, _ in isEdited = true }
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                        
                        Menu {
                            ForEach(paymentTermOptions, id: \.self) { opt in
                                Button(opt) {
                                    paymentTerms = opt
                                    isEdited = true
                                }
                            }
                        } label: {
                            HStack {
                                Text("Payment Terms")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(paymentTerms)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.6))
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Divider().padding(.horizontal, 20)
                        
                        Menu {
                            ForEach(paymentMethodOptions, id: \.self) { opt in
                                Button(opt) {
                                    acceptedPaymentMethod = opt
                                    isEdited = true
                                }
                            }
                        } label: {
                            HStack {
                                Text("Accepted Payment Method")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(acceptedPaymentMethod)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.6))
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Divider().padding(.horizontal, 20)
                        
                        Menu {
                            ForEach(contractTermOptions, id: \.self) { opt in
                                Button(opt) {
                                    contractTerms = opt
                                    isEdited = true
                                }
                            }
                        } label: {
                            HStack {
                                Text("Contract Terms")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(contractTerms)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.6))
                            }
                            .padding(.vertical, 14)
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
                
                // Section 2: Addresses & Groupings
                VStack(alignment: .leading, spacing: 8) {
                    Text("Addresses & Groupings")
                        .font(.footnote.weight(.bold))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, 4)
                    
                    VStack(spacing: 0) {
                        Menu {
                            ForEach(customerNameOptions, id: \.self) { cName in
                                Button(cName) {
                                    billToCustomer = cName
                                    isEdited = true
                                }
                            }
                        } label: {
                            HStack {
                                Text("Invoice Bill to Customer")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(billToCustomer)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.6))
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Divider().padding(.horizontal, 20)
                        
                        if customer.locations.count >= 25 {
                            Button(action: {
                                showBillingLocationModal = true
                            }) {
                                HStack(alignment: .center) {
                                    Text("Invoice Billing Address")
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                    Spacer()
                                    TwoLineAddressDisplay(
                                        street: selectedBillingLocation.street,
                                        cityStateZip: "\(selectedBillingLocation.city), \(selectedBillingLocation.state) \(selectedBillingLocation.zipCode)",
                                        font: .callout,
                                        foregroundColor: .secondary,
                                        alignment: .trailing
                                    )
                                    .frame(maxWidth: 200, alignment: .trailing)
                                    
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(.secondary.opacity(0.6))
                                        .padding(.leading, 2)
                                }
                                .padding(.vertical, 14)
                                .padding(.horizontal, 20)
                                #if os(iOS)
                                .contentShape(Rectangle())
                                #endif
                            }
                            .buttonStyle(PlainButtonStyle())
                            .sheet(isPresented: $showBillingLocationModal) {
                                LocationSelectionModal(
                                    customerName: customer.name,
                                    locations: customer.locations,
                                    selectedAddressString: "\(selectedBillingLocation.street), \(selectedBillingLocation.city), \(selectedBillingLocation.state) \(selectedBillingLocation.zipCode)",
                                    onSelect: { loc in
                                        selectedBillingLocation = loc
                                        isEdited = true
                                    }
                                )
                            }
                        } else {
                            Menu {
                                ForEach(customer.locations, id: \.street) { loc in
                                    Button(action: {
                                        selectedBillingLocation = loc
                                        isEdited = true
                                    }) {
                                        Text("\(loc.street)\n\(loc.city), \(loc.state) \(loc.zipCode)")
                                    }
                                }
                            } label: {
                                HStack(alignment: .center) {
                                    Text("Invoice Billing Address")
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                    Spacer()
                                    TwoLineAddressDisplay(
                                        street: selectedBillingLocation.street,
                                        cityStateZip: "\(selectedBillingLocation.city), \(selectedBillingLocation.state) \(selectedBillingLocation.zipCode)",
                                        font: .callout,
                                        foregroundColor: .secondary,
                                        alignment: .trailing
                                    )
                                    .frame(maxWidth: 200, alignment: .trailing)
                                    
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(.secondary.opacity(0.6))
                                        .padding(.leading, 2)
                                }
                                .padding(.vertical, 14)
                                .padding(.horizontal, 20)
                                #if os(iOS)
                                .contentShape(Rectangle())
                                #endif
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                        Divider().padding(.horizontal, 20)
                        
                        if customer.locations.count >= 25 {
                            Button(action: {
                                showJobLocationModal = true
                            }) {
                                HStack(alignment: .center) {
                                    Text("Invoice Location")
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                    Spacer()
                                    TwoLineAddressDisplay(
                                        street: selectedJobLocation.street,
                                        cityStateZip: "\(selectedJobLocation.city), \(selectedJobLocation.state) \(selectedJobLocation.zipCode)",
                                        font: .callout,
                                        foregroundColor: .secondary,
                                        alignment: .trailing
                                    )
                                    .frame(maxWidth: 200, alignment: .trailing)
                                    
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(.secondary.opacity(0.6))
                                        .padding(.leading, 2)
                                }
                                .padding(.vertical, 14)
                                .padding(.horizontal, 20)
                                #if os(iOS)
                                .contentShape(Rectangle())
                                #endif
                            }
                            .buttonStyle(PlainButtonStyle())
                            .sheet(isPresented: $showJobLocationModal) {
                                LocationSelectionModal(
                                    customerName: customer.name,
                                    locations: customer.locations,
                                    selectedAddressString: "\(selectedJobLocation.street), \(selectedJobLocation.city), \(selectedJobLocation.state) \(selectedJobLocation.zipCode)",
                                    onSelect: { loc in
                                        selectedJobLocation = loc
                                        isEdited = true
                                    }
                                )
                            }
                        } else {
                            Menu {
                                ForEach(customer.locations, id: \.street) { loc in
                                    Button(action: {
                                        selectedJobLocation = loc
                                        isEdited = true
                                    }) {
                                        Text("\(loc.street)\n\(loc.city), \(loc.state) \(loc.zipCode)")
                                    }
                                }
                            } label: {
                                HStack(alignment: .center) {
                                    Text("Invoice Location")
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                    Spacer()
                                    TwoLineAddressDisplay(
                                        street: selectedJobLocation.street,
                                        cityStateZip: "\(selectedJobLocation.city), \(selectedJobLocation.state) \(selectedJobLocation.zipCode)",
                                        font: .callout,
                                        foregroundColor: .secondary,
                                        alignment: .trailing
                                    )
                                    .frame(maxWidth: 200, alignment: .trailing)
                                    
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(.secondary.opacity(0.6))
                                        .padding(.leading, 2)
                                }
                                .padding(.vertical, 14)
                                .padding(.horizontal, 20)
                                #if os(iOS)
                                .contentShape(Rectangle())
                                #endif
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                        Divider().padding(.horizontal, 20)
                        
                        Menu {
                            ForEach(classOptions, id: \.self) { opt in
                                Button(opt) {
                                    selectedClass = opt
                                    isEdited = true
                                }
                            }
                        } label: {
                            HStack {
                                Text("Class")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(selectedClass)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.6))
                            }
                            .padding(.vertical, 14)
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
                
                // Section 3: Pricing Settings
                VStack(alignment: .leading, spacing: 8) {
                    Text("Pricing Settings")
                        .font(.footnote.weight(.bold))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, 4)
                    
                    VStack(spacing: 0) {
                        Menu {
                            ForEach(pricingStrategyOptions, id: \.self) { opt in
                                Button(opt) {
                                    pricingStrategy = opt
                                    isEdited = true
                                }
                            }
                        } label: {
                            HStack {
                                Text("Pricing Strategy")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(pricingStrategy)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.6))
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Divider().padding(.horizontal, 20)
                        
                        Toggle(isOn: $showMaintenancePlanPricing) {
                            Text("Show Maintenance Plan Pricing")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 20)
                        .onChange(of: showMaintenancePlanPricing) { _, _ in isEdited = true }
                        
                        Divider().padding(.horizontal, 20)
                        
                        Toggle(isOn: $showLineItemAmountsAndQuantity) {
                            Text("Show Line Item Amounts & Quantity")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 20)
                        .onChange(of: showLineItemAmountsAndQuantity) { _, _ in isEdited = true }
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Invoice Details")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        #endif
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(action: {
                    showDiscardAlert = true
                }) {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
            
            ToolbarItem(placement: .confirmationAction) {
                Button(action: {
                    dismiss()
                }) {
                    Image(systemName: "checkmark")
                        .font(.subheadline.weight(.semibold))
                }
                #if true
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.circle)
                .tint(.blue)
                #endif
            }
        }
        .alert("Discard Changes?", isPresented: $showDiscardAlert) {
            Button("Discard Changes", role: .destructive) {
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("None of your changes will be saved if you leave this page.")
        }
    }
}

public struct CreateInvoiceScreen: View {
    var appointment: Appointment?
    var customer: Customer
    var isProposalMode: Bool
    var onSaveInvoice: (() -> Void)? = nil
    
    @Environment(\.dismiss) var dismiss
    @Environment(InvoiceStore.self) var invoiceStore
    @Environment(ProposalStore.self) var proposalStore
    @State var selectedItems: [InvoiceItem] = []
    @State var selectedMaintenancePlan: String = "None"
    @State var notesText: String = ""
    @State var isTaxExempt: Bool = false
    @State var isSaved: Bool = false
    
    @State var itemToDelete: InvoiceItem? = nil
    @State var showDeleteItemConfirmation: Bool = false
    @State var showDiscardAlert: Bool = false
    @State var showMaintenancePlanPricing: Bool = false
    @State var showLineItemAmountsAndQuantity: Bool = true
    
    let maintenancePlanOptions = [
        "None",
        "Bronze Plan (10% Off)",
        "Silver Plan (15% Off)",
        "Gold Plan (20% Off)"
    ]
    
    public var invNumberOverride: String?
    
    public init(
        customer: Customer,
        appointment: Appointment? = nil,
        isProposalMode: Bool = false,
        selectedItems: [InvoiceItem] = [],
        isTaxExempt: Bool = false,
        notesText: String = "",
        isNew: Bool = false,
        invNumberOverride: String? = nil,
        onSaveInvoice: (() -> Void)? = nil
    ) {
        self.customer = customer
        self.appointment = appointment
        self.isProposalMode = isProposalMode
        self.invNumberOverride = invNumberOverride
        if isNew {
            self._selectedItems = State(initialValue: [])
        } else {
            self._selectedItems = State(initialValue: selectedItems.isEmpty ? [
                InvoiceItem(name: "Diagnostic Fee & System Evaluation", code: "Labor", price: 89.00),
                InvoiceItem(name: "Dual Run Capacitor (45/5 MFD 440V)", code: "Parts", price: 96.00)
            ] : selectedItems)
        }
        self._isTaxExempt = State(initialValue: isTaxExempt)
        self._notesText = State(initialValue: notesText)
        self.onSaveInvoice = onSaveInvoice
    }
    
    public var formattedInvoiceNumber: String {
        if let overrideNum = invNumberOverride {
            return overrideNum
        }
        if let appt = appointment {
            return appt.formattedInvoiceNumber(sequence: 1)
        }
        return "#140020-01"
    }
    
    public var formattedProposalNumber: String {
        if let overrideNum = invNumberOverride {
            return overrideNum
        }
        if let appt = appointment {
            return appt.formattedProposalNumber(sequence: 1)
        }
        return "#140020-01"
    }
    
    public var subtotal: Double {
        selectedItems.reduce(0.0) { $0 + $1.price }
    }
    
    public var taxRate: Double {
        isTaxExempt ? 0.0 : 0.07
    }
    
    public var taxAmount: Double {
        subtotal * taxRate
    }
    
    public var totalAmount: Double {
        subtotal + taxAmount
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: value)) ?? "$\(value)"
    }
    
    public var uniqueSelectedItems: [InvoiceItem] {
        selectedItems.reduce(into: [InvoiceItem]()) { list, item in
            if !list.contains(where: { $0.name == item.name }) {
                list.append(item)
            }
        }
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 1. Customer Name Single-Row Grouped Table
                customerHeaderModule
                
                // 2. Connected Items Card
                connectedItemsModule
                
                // 3. Total Summary Module
                totalSummaryModule
                
                // 3B. Offer Financing (Proposal Mode)
                if isProposalMode {
                    offerFinancingModule
                }
                
                // 4. Maintenance Plan Selection Pop-Up Menu
                maintenancePlanModule
                
                // 5. Notes Field Module
                notesModule
                
                // 6. Options Navigation Menu Section
                optionsNavigationMenu
            }
            .padding(16)
            .padding(.bottom, 72)
        }
        .overlay(bottomActionBar)
        .confirmationDialog(
            "Are you sure you want to remove \(itemToDelete?.name ?? "this item")?",
            isPresented: $showDeleteItemConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete Item", role: .destructive) {
                if let target = itemToDelete {
                    selectedItems.removeAll(where: { $0.name == target.name })
                }
                itemToDelete = nil
            }
            Button("Cancel", role: .cancel) {
                itemToDelete = nil
            }
        } message: {
            Text("This item will be removed from the invoice.")
        }
        .alert("Discard Changes?", isPresented: $showDiscardAlert) {
            Button("Discard Changes", role: .destructive) {
                #if os(iOS)
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                #endif
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("None of your changes will be saved if you leave this page.")
        }
        .onAppear {
            if isSaved {
                dismiss()
            }
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(action: {
                    #if os(iOS)
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    #endif
                    showDiscardAlert = true
                }) {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
            
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(isProposalMode ? "Create Proposal" : "Create Invoice")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(isProposalMode ? formattedProposalNumber : formattedInvoiceNumber)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    let num = isProposalMode ? formattedProposalNumber : formattedInvoiceNumber
                    let lineItemsList: [InvoiceLineItem] = selectedItems.map { item in
                        InvoiceLineItem(sku: item.code, name: item.name, unitPrice: item.price, totalPrice: item.price)
                    }
                    let tax = isTaxExempt ? 0.0 : (subtotal * 0.07)
                    let tot = subtotal + tax
                    
                    Task {
                        if isProposalMode {
                            let opt = ProposalOptionItem(
                                tier: "Option A",
                                title: "Standard Option",
                                lineItems: lineItemsList,
                                subtotal: subtotal,
                                taxAmount: tax,
                                total: tot
                            )
                            let prop = ProposalRecord(
                                proposalNumber: num,
                                customerId: customer.id,
                                jobId: appointment?.id,
                                jobNumber: appointment?.jobNumber,
                                appointmentId: appointment?.id,
                                status: "Presented",
                                options: [opt],
                                billToCustomer: customer.name,
                                jobLocation: customer.address.street,
                                technician: appointment?.assignedTech ?? SessionManager.shared.currentUser?.name ?? "Justin Lung",
                                notes: notesText
                            )
                            await ProposalStore.shared.saveProposal(prop)
                        } else {
                            let inv = InvoiceRecord(
                                invNumber: num,
                                status: "Open - Draft",
                                paymentStatus: "Unpaid",
                                dueDate: "8/8/26",
                                amount: String(format: "$%.2f", tot),
                                customerId: customer.id,
                                jobId: appointment?.id,
                                jobNumber: appointment?.jobNumber,
                                appointmentId: appointment?.id,
                                subtotal: subtotal,
                                taxAmount: tax,
                                total: tot,
                                balanceDue: tot,
                                billToCustomer: customer.name,
                                billingAddress: customer.address.street,
                                jobLocation: customer.address.street,
                                technician: appointment?.assignedTech ?? SessionManager.shared.currentUser?.name ?? "Justin Lung",
                                lineItems: lineItemsList,
                                notes: notesText
                            )
                            await InvoiceStore.shared.saveInvoice(inv)
                        }
                        
                        isSaved = true
                        onSaveInvoice?()
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var maintenancePlanModule: some View {
        VStack(spacing: 0) {
            Menu {
                ForEach(maintenancePlanOptions, id: \.self) { plan in
                    Button(plan) {
                        selectedMaintenancePlan = plan
                    }
                }
            } label: {
                HStack {
                    Text("Offer Maintenance Plan")
                        .font(.callout.weight(.regular))
                        .foregroundColor(.primary)
                    Spacer()
                    Text(selectedMaintenancePlan)
                        .font(.callout)
                        .foregroundColor(.secondary)
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.caption.weight(.bold))
                        .foregroundColor(.secondary.opacity(0.6))
                }
                .padding(.vertical, 14)
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
    
    private var notesModule: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Notes")
                .font(.callout.weight(.regular))
                .foregroundColor(.primary)
            
            TextEditor(text: $notesText)
                .frame(height: 80)
                .font(.callout)
                .padding(.horizontal, -4)
                #if os(iOS)
                .scrollContentBackground(.hidden)
                #endif
                .background(Color.clear)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    private var optionsNavigationMenu: some View {
        let menuItems: [(String, String)] = [
            ("Attachments", "paperclip"),
            ("Checklists", "checkmark.square"),
            ("Contractor Warranties", "shield.checkerboard"),
            ("Equipment & Mfr. Warranties", "wrench.and.screwdriver"),
            ("Rebates", "dollarsign.circle")
        ]
        
        return VStack(spacing: 0) {
            ForEach(0..<menuItems.count, id: \.self) { idx in
                let item = menuItems[idx]
                VStack(spacing: 0) {
                    NavigationLink(destination: CustomerSubScreen(title: item.0, customer: customer, appointment: appointment)) {
                        HStack(spacing: 14) {
                            Image(systemName: item.1)
                                .font(.callout)
                                .foregroundColor(.indigo)
                                .frame(width: 24)
                            
                            Text(item.0)
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(.secondary.opacity(0.4))
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                        #if os(iOS)
                        .contentShape(Rectangle())
                        #endif
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    if idx < menuItems.count - 1 {
                        Divider().padding(.leading, 58).padding(.trailing, 20)
                    }
                }
            }
        }
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    private var customerHeaderModule: some View {
        VStack(spacing: 0) {
            NavigationLink(destination: InvoiceDetailsScreen(
                customer: customer,
                appointment: appointment,
                showMaintenancePlanPricing: $showMaintenancePlanPricing,
                showLineItemAmountsAndQuantity: $showLineItemAmountsAndQuantity
            )) {
                HStack {
                    Text(customer.displayName)
                        .font(.callout.weight(.regular))
                        .foregroundColor(.primary)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.4))
                }
                .padding(.vertical, 14)
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

    private var connectedItemsModule: some View {
        VStack(spacing: 0) {
            if !uniqueSelectedItems.isEmpty {
                VStack(spacing: 0) {
                    ForEach(uniqueSelectedItems) { item in
                        let count = selectedItems.filter({ $0.name == item.name }).count
                        InvoiceItemRowView(
                            item: item,
                            count: count,
                            formatCurrency: { self.formatCurrency($0) },
                            onDelete: {
                                withAnimation {
                                    selectedItems.removeAll(where: { $0.name == item.name })
                                }
                            }
                        )
                        
                        Divider().padding(.horizontal, 20)
                    }
                }
            }
            
            NavigationLink(destination: SelectInvoiceItemsScreen(selectedItems: $selectedItems)) {
                HStack(spacing: 12) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2.weight(.semibold))
                        .foregroundColor(Color(red: 0.2, green: 0.78, blue: 0.35))
                    Text("add items")
                        .font(.callout.weight(.regular))
                        .foregroundColor(.primary)
                    Spacer()
                }
                .padding(.vertical, 14)
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

    private var totalSummaryModule: some View {
        VStack(spacing: 10) {
            HStack {
                Text("Subtotal")
                    .font(.callout.weight(.regular))
                    .foregroundColor(.primary)
                Spacer()
                Text(formatCurrency(subtotal))
                    .font(.callout.weight(.regular))
                    .foregroundColor(.secondary)
            }
            
            HStack {
                Text(isTaxExempt ? "Tax (0%)" : "Tax (7%)")
                    .font(.callout.weight(.regular))
                    .foregroundColor(.primary)
                Spacer()
                Text(formatCurrency(taxAmount))
                    .font(.callout.weight(.regular))
                    .foregroundColor(.secondary)
            }
            
            HStack {
                Text("Total")
                    .font(.callout.weight(.semibold))
                    .foregroundColor(.primary)
                Spacer()
                Text(formatCurrency(totalAmount))
                    .font(.callout.weight(.semibold))
                    .foregroundColor(.primary)
            }
            
            Divider().padding(.top, 2)
            
            Toggle(isOn: $isTaxExempt) {
                Text("Tax Exempt")
                    .font(.callout.weight(.regular))
                    .foregroundColor(.primary)
            }
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }

    private var offerFinancingModule: some View {
        VStack(spacing: 0) {
            NavigationLink(destination: NewLoanScreen(customer: customer, appointment: appointment)) {
                HStack {
                    Text("Offer Financing")
                        .font(.callout.weight(.regular))
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
            .buttonStyle(PlainButtonStyle())
        }
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }

    private var bottomActionBar: some View {
        VStack(spacing: 0) {
            Spacer()
            VStack(spacing: 0) {
                NavigationLink(destination: PresentInvoiceScreen(
                    customer: customer,
                    appointment: appointment,
                    selectedItems: selectedItems,
                    isTaxExempt: isTaxExempt,
                    notesText: notesText,
                    isProposalMode: isProposalMode,
                    showMaintenancePlanPricing: showMaintenancePlanPricing,
                    showLineItemAmountsAndQuantity: showLineItemAmountsAndQuantity,
                    onSaveInvoice: {
                        isSaved = true
                        onSaveInvoice?()
                        dismiss()
                    }
                )) {
                    Text(isProposalMode ? "Present Proposal" : "Present Invoice")
                        .font(.headline.weight(.semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.red)
                        .cornerRadius(14)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.murphysCardBackground)
            .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: -2)
        }
    }
}

struct InvoiceItemRowView: View {
    let item: InvoiceItem
    let count: Int
    let formatCurrency: (Double) -> String
    let onDelete: () -> Void
    
    var body: some View {
        SwipeableInvoiceItemRow(
            itemName: item.name,
            onDelete: onDelete
        ) {
            HStack(alignment: .center) {
                Text(item.name)
                    .font(.callout.weight(.regular))
                    .foregroundColor(.primary)
                
                Spacer()
                
                let itemTotal = item.price * Double(count)
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(formatCurrency(itemTotal))
                        .font(.callout.weight(.regular))
                        .foregroundColor(.primary)
                    Text("Qty: \(count)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 20)
        }
    }
}

struct SwipeableInvoiceItemRow<Content: View>: View {
    let content: Content
    let itemName: String
    let onDelete: () -> Void
    
    @State var offset: CGFloat = 0
    @State var isSwiped: Bool = false
    @State var showDeletePopover: Bool = false
    
    init(itemName: String, onDelete: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.itemName = itemName
        self.onDelete = onDelete
        self.content = content()
    }
    
    var body: some View {
        let maxOffset: CGFloat = -70
        ZStack(alignment: .trailing) {
            Color.murphysGroupedBackground
            
            HStack(spacing: 0) {
                Spacer()
                Button(action: {
                    showDeletePopover = true
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: "trash.fill")
                            .font(.callout.weight(.bold))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(Color.red)
                            .clipShape(Circle())
                        
                        Text("Delete")
                            .font(.caption2.weight(.medium))
                            .foregroundColor(.red)
                    }
                }
                .buttonStyle(.plain)
                #if os(iOS)
                .popover(isPresented: $showDeletePopover) {
                    VStack(spacing: 12) {
                        Text("Remove Item?")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Text(itemName)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .fixedSize(horizontal: false, vertical: true)
                        
                        Divider()
                        
                        Button(role: .destructive, action: {
                            showDeletePopover = false
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                offset = 0
                                isSwiped = false
                            }
                            onDelete()
                        }) {
                            Text("Delete Item")
                                .font(.callout.weight(.semibold))
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity)
                        }
                        
                        Divider()
                        
                        Button("Cancel", role: .cancel) {
                            showDeletePopover = false
                        }
                        .font(.callout)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                    }
                    .padding(16)
                    .frame(width: 220)
                    .presentationCompactAdaptation(.popover)
                }
                #endif
            }
            .padding(.trailing, 16)
            .opacity(offset < -5 ? 1 : 0)
            
            content
                .background(Color.murphysCardBackground)
                .offset(x: offset)
                #if true
                .highPriorityGesture(
                    DragGesture(minimumDistance: 10, coordinateSpace: .local)
                        .onChanged { gesture in
                            if abs(gesture.translation.width) > abs(gesture.translation.height) {
                                if gesture.translation.width < 0 {
                                    let translation = gesture.translation.width
                                    offset = isSwiped ? max(translation + maxOffset, maxOffset) : max(translation, maxOffset)
                                } else if gesture.translation.width > 0 {
                                    offset = isSwiped ? min(gesture.translation.width + maxOffset, 0) : min(gesture.translation.width, 0)
                                }
                            }
                        }
                        .onEnded { gesture in
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                if gesture.translation.width < -30 {
                                    offset = maxOffset
                                    isSwiped = true
                                } else {
                                    offset = 0
                                    isSwiped = false
                                }
                            }
                        }
                )
                #endif
        }
        .clipped()
    }
}

public struct SignatureLine: Identifiable, Sendable {
    public let id = UUID()
    public var points: [CGPoint] = []
    public init(points: [CGPoint] = []) {
        self.points = points
    }
}

public struct SignatureCaptureScreen: View {
    @Environment(\.dismiss) var dismiss
    @Binding var savedSignatureLines: [SignatureLine]
    var formattedInvoiceNumber: String = "#I-1042 - 1"
    @State var currentLines: [SignatureLine] = []
    @State var canvasId = UUID()
    
    public init(savedSignatureLines: Binding<[SignatureLine]>, formattedInvoiceNumber: String = "#I-1042 - 1") {
        self._savedSignatureLines = savedSignatureLines
        self.formattedInvoiceNumber = formattedInvoiceNumber
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            GeometryReader { geo in
                #if true
                Canvas { context, size in
                    for line in currentLines {
                        var path = Path()
                        if let first = line.points.first {
                            path.move(to: first)
                            for point in line.points.dropFirst() {
                                path.addLine(to: point)
                            }
                        }
                        context.stroke(path, with: .color(Color.primary), lineWidth: 3)
                    }
                }
                .id(canvasId)
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            let newPoint = value.location
                            if currentLines.isEmpty || value.translation == .zero {
                                currentLines.append(SignatureLine(points: [newPoint]))
                            } else {
                                let index = currentLines.count - 1
                                if index >= 0 && index < currentLines.count {
                                    currentLines[index].points.append(newPoint)
                                }
                            }
                        }
                        .onEnded { _ in
                            currentLines.append(SignatureLine())
                        }
                )
                #else
                ZStack {
                    ForEach(currentLines) { line in
                        Path { path in
                            if let first = line.points.first {
                                path.move(to: first)
                            }
                            for point in line.points.dropFirst() {
                                path.addLine(to: point)
                            }
                        }
                        .stroke(Color.primary, lineWidth: 3)
                    }
                }
                .id(canvasId)
                #endif
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .padding(12)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Customer Signature")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(formattedInvoiceNumber)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    savedSignatureLines = currentLines.filter { !$0.points.isEmpty }
                    #if os(iOS)
                    OrientationManager.lockOrientation(.portrait)
                    #endif
                    dismiss()
                }
            }
            
            ToolbarItem(placement: .bottomBar) {
                HStack {
                    Spacer()
                    Button(action: {
                        currentLines.removeAll()
                        savedSignatureLines.removeAll()
                        canvasId = UUID()
                    }) {
                        Text("Clear Signature")
                            .font(.callout.weight(.medium))
                            .foregroundColor(.red)
                    }
                    .buttonStyle(PlainButtonStyle())
                    Spacer()
                }
            }
        }
        #if os(iOS)
        .onAppear {
            currentLines = savedSignatureLines
            OrientationManager.lockOrientation(.landscapeRight)
        }
        .onDisappear {
            OrientationManager.lockOrientation(.portrait)
        }
        #else
        .onAppear {
            currentLines = savedSignatureLines
        }
        #endif
    }
}

public struct PresentInvoiceScreen: View {
    @Environment(\.dismiss) var dismiss
    var customer: Customer
    var appointment: Appointment?
    var selectedItems: [InvoiceItem]
    var isTaxExempt: Bool
    var notesText: String
    var isProposalMode: Bool = false
    var showMaintenancePlanPricing: Bool = false
    var showLineItemAmountsAndQuantity: Bool = true
    var onSaveInvoice: (() -> Void)? = nil
    
    @State var savedSignatureLines: [SignatureLine] = []
    @State var showPaymentAlert: Bool = false
    @State var showRecordAlert: Bool = false
    @State var showPDFSheet: Bool = false
    @State var showSendConfirmation: Bool = false
    @State var showDiscardAlert: Bool = false
    @State var showConvertAlert: Bool = false
    @State var proposalAccepted: Bool? = nil
    
    var formattedInvoiceNumber: String {
        if let appt = appointment {
            return appt.formattedInvoiceNumber(sequence: 1)
        }
        return "#140020-01"
    }
    
    var formattedProposalNumber: String {
        if let appt = appointment {
            return appt.formattedProposalNumber(sequence: 1)
        }
        return "#140020-01"
    }
    
    var uniqueSelectedItems: [InvoiceItem] {
        var list: [InvoiceItem] = []
        for item in selectedItems {
            if !list.contains(where: { $0.name == item.name }) {
                list.append(item)
            }
        }
        return list
    }
    
    var subtotal: Double {
        if showMaintenancePlanPricing {
            return selectedItems.reduce(0.0) { $0 + ($1.price * 0.85) }
        }
        return selectedItems.reduce(0.0) { $0 + $1.price }
    }
    
    var taxAmount: Double {
        isTaxExempt ? 0.0 : (subtotal * 0.07)
    }
    
    var totalAmount: Double {
        subtotal + taxAmount
    }
    
    func formatCurrency(_ val: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: val)) ?? "$\(val)"
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 4A: Top Card (Customer Name & Total centered stacked without invoice #)
                VStack(spacing: 4) {
                    Text(customer.displayName)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(formatCurrency(totalAmount))
                        .font(.title2.weight(.semibold))
                        .foregroundColor(.primary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .padding(.horizontal, 16)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // 4B: Selected Items Table (Read-Only)
                VStack(spacing: 0) {
                    ForEach(uniqueSelectedItems) { item in
                        VStack(spacing: 0) {
                            HStack(alignment: .center) {
                                let count = selectedItems.filter({ $0.name == item.name }).count
                                let unitPrice = showMaintenancePlanPricing ? (item.price * 0.85) : item.price
                                let itemTotal = unitPrice * Double(count)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.name)
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                    if showLineItemAmountsAndQuantity {
                                        if showMaintenancePlanPricing {
                                            HStack(spacing: 4) {
                                                Text("\(count) x \(formatCurrency(unitPrice))")
                                                    .font(.caption)
                                                    .foregroundColor(.secondary)
                                                Text("(Plan Price)")
                                                    .font(.caption.weight(.medium))
                                                    .foregroundColor(.green)
                                            }
                                        } else {
                                            Text("\(count) x \(formatCurrency(item.price))")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                }
                                
                                Spacer()
                                
                                if showLineItemAmountsAndQuantity {
                                    Text(formatCurrency(itemTotal))
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                }
                            }
                            .padding(.vertical, 12)
                            .padding(.horizontal, 20)
                            
                            Divider().padding(.horizontal, 20)
                        }
                    }
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // 4C: 3-Line Total Module (Subtotal, Tax, Total stacked without tax exempt row)
                VStack(spacing: 10) {
                    HStack {
                        Text("Subtotal")
                            .font(.callout.weight(.regular))
                            .foregroundColor(.primary)
                        Spacer()
                        Text(formatCurrency(subtotal))
                            .font(.callout.weight(.regular))
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text(isTaxExempt ? "Tax (0%)" : "Tax (7%)")
                            .font(.callout.weight(.regular))
                            .foregroundColor(.primary)
                        Spacer()
                        Text(formatCurrency(taxAmount))
                            .font(.callout.weight(.regular))
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("Total")
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.primary)
                        Spacer()
                        Text(formatCurrency(totalAmount))
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.primary)
                    }
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 20)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // 4D: Contract Terms & Customer Signature Card (Matching Card Styling)
                if isProposalMode {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Contract Terms")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        VStack(alignment: .leading, spacing: 12) {
                            // Option 1: Accept
                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    proposalAccepted = true
                                }
                            }) {
                                HStack(alignment: .top, spacing: 12) {
                                    Image(systemName: proposalAccepted == true ? "checkmark.circle.fill" : "circle")
                                        .font(.title3)
                                        .foregroundColor(proposalAccepted == true ? .indigo : .secondary.opacity(0.5))
                                    Text("I accept this proposal and agree to the terms and conditions")
                                        .font(.subheadline)
                                        .foregroundColor(.primary)
                                        .multilineTextAlignment(.leading)
                                    Spacer()
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Divider()
                            
                            // Option 2: Decline
                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    proposalAccepted = false
                                    savedSignatureLines = []
                                }
                            }) {
                                HStack(alignment: .top, spacing: 12) {
                                    Image(systemName: proposalAccepted == false ? "checkmark.circle.fill" : "circle")
                                        .font(.title3)
                                        .foregroundColor(proposalAccepted == false ? .indigo : .secondary.opacity(0.5))
                                    Text("I decline this proposal")
                                        .font(.subheadline)
                                        .foregroundColor(.primary)
                                        .multilineTextAlignment(.leading)
                                    Spacer()
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                        // If "I accept..." is selected, show Customer Signature block below
                        if proposalAccepted == true {
                            VStack(alignment: .leading, spacing: 8) {
                                Divider()
                                    .padding(.vertical, 4)
                                
                                Text(savedSignatureLines.isEmpty ? "Customer Signature (Tap to Sign)" : "Customer Signature (Tap to Edit)")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                
                                if !savedSignatureLines.isEmpty {
                                    List {
                                        NavigationLink(destination: SignatureCaptureScreen(savedSignatureLines: $savedSignatureLines, formattedInvoiceNumber: formattedProposalNumber)) {
                                            #if true
                                            Canvas { context, size in
                                                let allPoints = savedSignatureLines.flatMap { $0.points }
                                                let minX = allPoints.map { $0.x }.min() ?? 0
                                                let maxX = allPoints.map { $0.x }.max() ?? 1
                                                let minY = allPoints.map { $0.y }.min() ?? 0
                                                let maxY = allPoints.map { $0.y }.max() ?? 1
                                                let width = max(1, maxX - minX)
                                                let height = max(1, maxY - minY)
                                                let scaleX = (size.width - 16) / width
                                                let scaleY = (size.height - 16) / height
                                                let scale = min(scaleX, scaleY)
                                                
                                                for line in savedSignatureLines {
                                                    var path = Path()
                                                    if let first = line.points.first {
                                                        let scaledFirst = CGPoint(x: (first.x - minX) * scale + 8, y: (first.y - minY) * scale + 8)
                                                        path.move(to: scaledFirst)
                                                        for pt in line.points.dropFirst() {
                                                            let scaledPt = CGPoint(x: (pt.x - minX) * scale + 8, y: (pt.y - minY) * scale + 8)
                                                            path.addLine(to: scaledPt)
                                                        }
                                                    }
                                                    context.stroke(path, with: .color(Color.primary), lineWidth: 2)
                                                }
                                            }
                                            .frame(height: 50)
                                            #else
                                            HStack {
                                                Image(systemName: "signature")
                                                    .foregroundColor(.primary)
                                                Text("Signature Attached")
                                                    .font(.callout)
                                                    .foregroundColor(.secondary)
                                            }
                                            #endif
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                        .listRowBackground(Color.murphysCardBackground)
                                        #if true
                                        .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                                        .listRowSeparator(.hidden)
                                        #endif
                                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                            Button(role: .destructive) {
                                                savedSignatureLines = []
                                            } label: {
                                                Label("Delete", systemImage: "trash")
                                            }
                                            .tint(.red)
                                        }
                                    }
                                    .listStyle(.plain)
                                    .frame(height: 54)
                                    .scrollDisabled(true)
                                } else {
                                    NavigationLink(destination: SignatureCaptureScreen(savedSignatureLines: $savedSignatureLines, formattedInvoiceNumber: formattedProposalNumber)) {
                                        Image(systemName: "plus.circle.fill")
                                            .font(.title2.weight(.semibold))
                                            .foregroundColor(Color(red: 0.2, green: 0.78, blue: 0.35))
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .transition(.opacity.combined(with: .move(edge: .top)))
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Contract Terms")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        Text("I agree to the terms and that the work has been completed to my satisfaction")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                            .fixedSize(horizontal: false, vertical: true)
                        
                        Text(savedSignatureLines.isEmpty ? "Customer Signature (Tap to Sign)" : "Customer Signature (Tap to Edit)")
                            .font(.callout)
                            .foregroundColor(.primary)
                            .padding(.top, 4)
                        
                        if !savedSignatureLines.isEmpty {
                            List {
                                NavigationLink(destination: SignatureCaptureScreen(savedSignatureLines: $savedSignatureLines, formattedInvoiceNumber: formattedInvoiceNumber)) {
                                    #if true
                                    Canvas { context, size in
                                        let allPoints = savedSignatureLines.flatMap { $0.points }
                                        let minX = allPoints.map { $0.x }.min() ?? 0
                                        let maxX = allPoints.map { $0.x }.max() ?? 1
                                        let minY = allPoints.map { $0.y }.min() ?? 0
                                        let maxY = allPoints.map { $0.y }.max() ?? 1
                                        let width = max(1, maxX - minX)
                                        let height = max(1, maxY - minY)
                                        let scaleX = (size.width - 16) / width
                                        let scaleY = (size.height - 16) / height
                                        let scale = min(scaleX, scaleY)
                                        
                                        for line in savedSignatureLines {
                                            var path = Path()
                                            if let first = line.points.first {
                                                let scaledFirst = CGPoint(x: (first.x - minX) * scale + 8, y: (first.y - minY) * scale + 8)
                                                path.move(to: scaledFirst)
                                                for pt in line.points.dropFirst() {
                                                    let scaledPt = CGPoint(x: (pt.x - minX) * scale + 8, y: (pt.y - minY) * scale + 8)
                                                    path.addLine(to: scaledPt)
                                                }
                                            }
                                            context.stroke(path, with: .color(Color.primary), lineWidth: 2)
                                        }
                                    }
                                    .frame(height: 50)
                                    #else
                                    HStack {
                                        Image(systemName: "signature")
                                            .foregroundColor(.primary)
                                        Text("Signature Attached")
                                            .font(.callout)
                                            .foregroundColor(.secondary)
                                    }
                                    #endif
                                }
                                .buttonStyle(PlainButtonStyle())
                                .listRowBackground(Color.murphysCardBackground)
                                #if true
                                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                                .listRowSeparator(.hidden)
                                #endif
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        savedSignatureLines = []
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                    .tint(.red)
                                }
                            }
                            .listStyle(.plain)
                            .frame(height: 54)
                            .scrollDisabled(true)
                        } else {
                            NavigationLink(destination: SignatureCaptureScreen(savedSignatureLines: $savedSignatureLines, formattedInvoiceNumber: formattedInvoiceNumber)) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title2.weight(.semibold))
                                    .foregroundColor(Color(red: 0.2, green: 0.78, blue: 0.35))
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
            }
            .padding(16)
            .padding(.bottom, 135)
        }
        .overlay(
            VStack(spacing: 0) {
                Spacer()
                
                // 4E: Solid Bottom Container Wrapping Action Buttons & Floating Red Action Button
                VStack(spacing: 12) {
                    if isProposalMode {
                        HStack(spacing: 12) {
                            NavigationLink(destination: CreateInvoiceScreen(
                                customer: customer,
                                appointment: appointment,
                                isProposalMode: false,
                                selectedItems: selectedItems,
                                isTaxExempt: isTaxExempt,
                                notesText: notesText
                            )) {
                                VStack(spacing: 4) {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .font(.subheadline)
                                        .foregroundColor(.indigo)
                                    Text("Convert to Invoice")
                                        .font(.footnote.weight(.regular))
                                        .foregroundColor(.primary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.secondary.opacity(0.12))
                                .cornerRadius(10)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Button(action: { showPDFSheet = true }) {
                                VStack(spacing: 4) {
                                    Image(systemName: "doc.text")
                                        .font(.subheadline)
                                        .foregroundColor(.indigo)
                                    Text("View PDF")
                                        .font(.footnote.weight(.regular))
                                        .foregroundColor(.primary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.secondary.opacity(0.12))
                                .cornerRadius(10)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    } else {
                        HStack(spacing: 8) {
                            Button(action: { showPaymentAlert = true }) {
                                VStack(spacing: 4) {
                                    Image(systemName: "creditcard")
                                        .font(.subheadline)
                                        .foregroundColor(.indigo)
                                    Text("Process Payment")
                                        .font(.footnote.weight(.regular))
                                        .foregroundColor(.primary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.secondary.opacity(0.12))
                                .cornerRadius(10)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Button(action: { showRecordAlert = true }) {
                                VStack(spacing: 4) {
                                    Image(systemName: "square.and.pencil")
                                        .font(.subheadline)
                                        .foregroundColor(.indigo)
                                    Text("Record Payment")
                                        .font(.footnote.weight(.regular))
                                        .foregroundColor(.primary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.secondary.opacity(0.12))
                                .cornerRadius(10)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            Button(action: { showPDFSheet = true }) {
                                VStack(spacing: 4) {
                                    Image(systemName: "doc.text")
                                        .font(.subheadline)
                                        .foregroundColor(.indigo)
                                    Text("View PDF")
                                        .font(.footnote.weight(.regular))
                                        .foregroundColor(.primary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .background(Color.secondary.opacity(0.12))
                                .cornerRadius(10)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    
                    Button(action: { showSendConfirmation = true }) {
                        Text(isProposalMode ? "Send Proposal" : "Send Invoice")
                            .font(.headline.weight(.semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red)
                            .cornerRadius(14)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.murphysCardBackground)
                .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: -2)
            }
        )
        .alert("Process Payment", isPresented: $showPaymentAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Payment processing initiated.")
        }
        .alert("Record Payment", isPresented: $showRecordAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Payment recorded.")
        }
        .alert("Convert to Invoice", isPresented: $showConvertAlert) {
            Button("Convert", role: .destructive) { dismiss() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This proposal will be converted to an active invoice.")
        }
        .alert("View PDF", isPresented: $showPDFSheet) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Generating PDF document...")
        }
        .alert(isProposalMode ? "Send Proposal" : "Send Invoice", isPresented: $showSendConfirmation) {
            Button("Send", role: .destructive) {
                onSaveInvoice?()
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(isProposalMode ? "Proposal will be sent to \(customer.name)." : "Invoice will be sent to \(customer.name).")
        }
        .alert("Discard Changes?", isPresented: $showDiscardAlert) {
            Button("Discard Changes", role: .destructive) {
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("None of your changes will be saved if you leave this page.")
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(action: {
                    showDiscardAlert = true
                }) {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
            
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(isProposalMode ? "Proposal" : "Invoice")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(isProposalMode ? formattedProposalNumber : formattedInvoiceNumber)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    onSaveInvoice?()
                    dismiss()
                }
            }
        }
        #if os(iOS)
        .onAppear {
            OrientationManager.lockOrientation(.portrait)
        }
        #endif
    }
}

public struct InvoiceItemNodeRow: View {
    var itemNode: InvoiceItemNode
    @Binding var tempSelectedItemsMap: [String: InvoiceItem]
    @Binding var itemQuantities: [String: Int]
    
    public var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(itemNode.name)
                    .font(.callout.weight(.regular))
                    .foregroundColor(.primary)
                if let priceText = itemNode.formattedPriceText, !priceText.isEmpty {
                    Text(priceText)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            let qty = itemQuantities[itemNode.id] ?? 0
            if qty > 0 {
                // Selected State: Custom Neutral Gray Pill Stepper (- [qty] +)
                HStack(spacing: 8) {
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            let newQty = qty - 1
                            if newQty <= 0 {
                                itemQuantities.removeValue(forKey: itemNode.id)
                                tempSelectedItemsMap.removeValue(forKey: itemNode.id)
                            } else {
                                itemQuantities[itemNode.id] = newQty
                            }
                        }
                    }) {
                        Image(systemName: "minus")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                            .frame(width: 22, height: 22)
                            .background(Circle().fill(Color.secondary.opacity(0.15)))
                    }
                    .buttonStyle(.plain)
                    
                    Text("\(qty)")
                        .font(.callout.weight(.semibold))
                        .foregroundColor(.primary)
                        .frame(minWidth: 16)
                    
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            itemQuantities[itemNode.id] = qty + 1
                        }
                    }) {
                        Image(systemName: "plus")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.white)
                            .frame(width: 22, height: 22)
                            .background(Circle().fill(Color.secondary))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(Capsule().fill(Color.secondary.opacity(0.12)))
                .transition(.asymmetric(insertion: .scale.combined(with: .opacity), removal: .scale.combined(with: .opacity)))
            } else {
                // Default State: Green Circle '+' Button
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        let item = InvoiceItem(
                            id: UUID(),
                            name: itemNode.name,
                            code: itemNode.code,
                            price: itemNode.price ?? 0.0
                        )
                        tempSelectedItemsMap[itemNode.id] = item
                        itemQuantities[itemNode.id] = 1
                    }
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2.weight(.semibold))
                        .foregroundColor(Color(red: 0.2, green: 0.78, blue: 0.35))
                }
                .buttonStyle(.plain)
                .transition(.asymmetric(insertion: .scale.combined(with: .opacity), removal: .scale.combined(with: .opacity)))
            }
        }
        .padding(.vertical, 4)
    }
}

public struct SelectedItemsSummarySheet: View {
    @Binding var selectedItemsMap: [String: InvoiceItem]
    @Binding var itemQuantities: [String: Int]
    @Binding var sheetDetent: PresentationDetent
    var onAdd: () -> Void
    
    @State var sheetItemToDelete: InvoiceItem? = nil
    @State var showSheetDeleteConfirmation: Bool = false
    
    var selectedList: [InvoiceItem] {
        Array(selectedItemsMap.values)
    }
    
    var totalCount: Int {
        itemQuantities.values.reduce(0, +)
    }
    
    var totalPrice: Double {
        var sum: Double = 0.0
        for (id, item) in selectedItemsMap {
            let qty = itemQuantities[id] ?? 1
            sum += item.price * Double(qty)
        }
        return sum
    }
    
    var formattedTotalPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: totalPrice)) ?? "$\(totalPrice)"
    }
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if sheetDetent == .large && !selectedList.isEmpty {
                    List {
                        ForEach(selectedList) { item in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.name)
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                    if let code = item.code {
                                        Text(code)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                
                                Spacer()
                                
                                HStack(spacing: 12) {
                                    Button(action: {
                                        let key = selectedItemsMap.first(where: { $0.value.name == item.name })?.key ?? item.name
                                        if let qty = itemQuantities[key], qty > 1 {
                                            itemQuantities[key] = qty - 1
                                        } else {
                                            itemQuantities.removeValue(forKey: key)
                                            selectedItemsMap.removeValue(forKey: key)
                                        }
                                    }) {
                                        Image(systemName: "minus.circle.fill")
                                            .font(.title3)
                                            .foregroundColor(.secondary)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                    
                                    let key = selectedItemsMap.first(where: { $0.value.name == item.name })?.key ?? item.name
                                    Text("\(itemQuantities[key] ?? 1)")
                                        .font(.callout.weight(.semibold))
                                        .foregroundColor(.primary)
                                        .frame(minWidth: 16)
                                    
                                    Button(action: {
                                        let key = selectedItemsMap.first(where: { $0.value.name == item.name })?.key ?? item.name
                                        let current = itemQuantities[key] ?? 1
                                        itemQuantities[key] = current + 1
                                    }) {
                                        Image(systemName: "plus.circle.fill")
                                            .font(.title3)
                                            .foregroundColor(Color(red: 0.2, green: 0.78, blue: 0.35))
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding(.vertical, 4)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    sheetItemToDelete = item
                                    showSheetDeleteConfirmation = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                .tint(.red)
                            }
                        }
                    }
                    .listStyle(.plain)
                } else {
                    Spacer(minLength: 4)
                }
                
                VStack(spacing: 12) {
                    if sheetDetent == .large {
                        Divider()
                    }
                    
                    HStack {
                        Text("\(totalCount) \(totalCount == 1 ? "Item" : "Items")")
                            .font(.callout.weight(.regular))
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        Text(formattedTotalPrice)
                            .font(.title3.weight(.semibold))
                            .foregroundColor(.primary)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, sheetDetent == .large ? 0 : 8)
                    
                    Button(action: {
                        onAdd()
                    }) {
                        Text("Add")
                            .font(.headline.weight(.semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.blue)
                            .cornerRadius(14)
                    }
                    .padding(.horizontal, 20)
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.bottom, 16)
            }
            .confirmationDialog(
                "Are you sure you want to remove \(sheetItemToDelete?.name ?? "this item")?",
                isPresented: $showSheetDeleteConfirmation,
                titleVisibility: .visible
            ) {
                Button("Delete Item", role: .destructive) {
                    if let target = sheetItemToDelete {
                        let key = selectedItemsMap.first(where: { $0.value.name == target.name })?.key ?? target.name
                        selectedItemsMap.removeValue(forKey: key)
                        itemQuantities.removeValue(forKey: key)
                    }
                    sheetItemToDelete = nil
                }
                Button("Cancel", role: .cancel) {
                    sheetItemToDelete = nil
                }
            } message: {
                Text("This item will be removed from your selection.")
            }
            .navigationTitle(sheetDetent == .large ? "Item Summary" : "")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                if sheetDetent == .large {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            withAnimation {
                                sheetDetent = .fraction(0.15)
                            }
                        } label: {
                            Image(systemName: "xmark")
                        }
                    }
                }
            }
        }
        #if true
        .presentationBackground(Color.murphysModalBackground)
        #endif
    }
}

public struct InvoiceCategoryNodeCell: View {
    var itemNode: InvoiceItemNode
    @Binding var tempSelectedItemsMap: [String: InvoiceItem]
    @Binding var itemQuantities: [String: Int]
    @State var isExpanded: Bool = true
    
    public var body: some View {
        if itemNode.isLeaf {
            InvoiceItemNodeRow(
                itemNode: itemNode,
                tempSelectedItemsMap: $tempSelectedItemsMap,
                itemQuantities: $itemQuantities
            )
        } else if let children = itemNode.children {
            DisclosureGroup(isExpanded: $isExpanded) {
                ForEach(children) { childNode in
                    InvoiceCategoryNodeCell(
                        itemNode: childNode,
                        tempSelectedItemsMap: $tempSelectedItemsMap,
                        itemQuantities: $itemQuantities
                    )
                }
            } label: {
                Text(itemNode.name)
                    .font(.callout.weight(.medium))
                    .foregroundColor(.primary)
                    .padding(.vertical, 4)
            }
        }
    }
}

#if true
struct NativeiOSCategoryList: View {
    let categories: [InvoiceItemNode]
    @Binding var tempSelectedItemsMap: [String: InvoiceItem]
    @Binding var itemQuantities: [String: Int]
    
    var body: some View {
        List(categories, children: \.children) { itemNode in
            if itemNode.isLeaf {
                InvoiceItemNodeRow(
                    itemNode: itemNode,
                    tempSelectedItemsMap: $tempSelectedItemsMap,
                    itemQuantities: $itemQuantities
                )
            } else {
                Text(itemNode.name)
                    .font(.callout.weight(.medium))
                    .foregroundColor(.primary)
                    .padding(.vertical, 4)
                    .tint(.secondary)
            }
        }
        .listStyle(.plain)
    }
}
#endif

public struct SelectInvoiceItemsScreen: View {
    @Environment(\.dismiss) var dismiss
    @Binding var selectedItems: [InvoiceItem]
    
    @State var searchText: String = ""
    @State var selectedSource: ItemSource = .priceBook
    
    @State var showSummarySheet: Bool = true
    @State var tempSelectedItemsMap: [String: InvoiceItem] = [:]
    @State var itemQuantities: [String: Int] = [:]
    @State var sheetDetent: PresentationDetent = .fraction(0.15)
    
    enum ItemSource: String, CaseIterable, Identifiable {
        case priceBook = "Price Book"
        case quickBooks = "QuickBooks"
        public var id: String { rawValue }
    }
    
    let samplePriceBookCategories: [InvoiceItemNode] = [
        InvoiceItemNode(id: "cat-1", name: "Capacitors & Electrical", children: [
            InvoiceItemNode(id: "pb-1", name: "Dual Run Capacitor (45/5 MFD)", code: "CAP-455", price: 145.00),
            InvoiceItemNode(id: "pb-2", name: "Hard Start Kit", code: "HSK-100", price: 95.00),
            InvoiceItemNode(id: "pb-3", name: "Contactor 30 AMP Single Pole", code: "CON-301", price: 65.00)
        ]),
        InvoiceItemNode(id: "cat-2", name: "Refrigerant & Coils", children: [
            InvoiceItemNode(id: "pb-4", name: "Refrigerant R-410A (per lb)", code: "REF-410", price: 85.00),
            InvoiceItemNode(id: "pb-5", name: "Condenser Coil Cleaning", code: "CLN-COIL", price: 195.00),
            InvoiceItemNode(id: "pb-6", name: "Evaporator Coil Leak Repair", code: "LEAK-EVAP", price: 350.00)
        ]),
        InvoiceItemNode(id: "cat-3", name: "Maintenance & Diagnostic", children: [
            InvoiceItemNode(id: "pb-7", name: "Diagnostic Fee", code: "DIAG-01", price: 99.00),
            InvoiceItemNode(id: "pb-8", name: "Flame Sensor Cleaning & Tune", code: "FLM-SEN", price: 120.00),
            InvoiceItemNode(id: "pb-9", name: "Blower Wheel Deep Cleaning", code: "BLW-CLN", price: 210.00)
        ])
    ]
    
    let sampleQuickBooksCategories: [InvoiceItemNode] = [
        InvoiceItemNode(id: "qb-cat-1", name: "Labor Services", children: [
            InvoiceItemNode(id: "qb-1", name: "HVAC Service Labor (Standard)", code: "LBR-STD", price: 125.00),
            InvoiceItemNode(id: "qb-2", name: "HVAC Service Labor (Overtime)", code: "LBR-OT", price: 187.50)
        ]),
        InvoiceItemNode(id: "qb-cat-2", name: "Thermostats & Controls", children: [
            InvoiceItemNode(id: "qb-3", name: "Thermostat Ecobee Smart Pro", code: "ECO-PRO", price: 249.99),
            InvoiceItemNode(id: "qb-4", name: "Honeywell Programmable Thermostat", code: "HON-PROG", price: 149.00)
        ]),
        InvoiceItemNode(id: "qb-cat-3", name: "Filters & Air Quality", children: [
            InvoiceItemNode(id: "qb-5", name: "Filter Replacement (20x25x1)", code: "FLT-2025", price: 35.00),
            InvoiceItemNode(id: "qb-6", name: "Pleated Air Filter (16x25x1)", code: "FLT-1625", price: 28.00)
        ])
    ]
    
    public init(selectedItems: Binding<[InvoiceItem]>) {
        self._selectedItems = selectedItems
        var initialMap: [String: InvoiceItem] = [:]
        var initialQty: [String: Int] = [:]
        for item in selectedItems.wrappedValue {
            let key = item.name
            initialMap[key] = item
            initialQty[key] = (initialQty[key] ?? 0) + 1
        }
        _tempSelectedItemsMap = State(initialValue: initialMap)
        _itemQuantities = State(initialValue: initialQty)
    }
    
    private var priceBookNodes: [InvoiceItemNode] {
        let store = PriceBookStore.shared
        if !store.allItems.isEmpty {
            let grouped = Dictionary(grouping: store.allItems) { item -> String in
                if let first = item.categoryPaths.first {
                    let comp = first.split(separator: ">").first.map(String.init) ?? "General"
                    let trimmed = comp.trimmingCharacters(in: .whitespaces)
                    return trimmed.isEmpty ? "General Parts" : trimmed
                }
                return "General Parts"
            }
            
            return grouped.keys.sorted().map { catName in
                let items = grouped[catName]!.sorted(by: { $0.name < $1.name })
                let children = items.map { pbItem in
                    InvoiceItemNode(
                        id: pbItem.id,
                        name: pbItem.name,
                        code: pbItem.productNumber,
                        price: pbItem.standardPrice
                    )
                }
                return InvoiceItemNode(
                    id: "pb-cat-\(catName)",
                    name: catName,
                    children: children
                )
            }
        }
        return samplePriceBookCategories
    }
    
    private var quickBooksNodes: [InvoiceItemNode] {
        let store = PriceBookStore.shared
        let qbAccounts = store.quickBooksAccounts
        if !qbAccounts.isEmpty {
            return qbAccounts.map { (account, items) in
                let children = items.map { pbItem in
                    InvoiceItemNode(
                        id: "qb-\(pbItem.id)",
                        name: pbItem.name,
                        code: pbItem.productNumber,
                        price: pbItem.standardPrice
                    )
                }
                return InvoiceItemNode(
                    id: "qb-acc-\(account)",
                    name: account,
                    children: children
                )
            }
        }
        return sampleQuickBooksCategories
    }
    
    var currentCategories: [InvoiceItemNode] {
        let base = selectedSource == .priceBook ? priceBookNodes : quickBooksNodes
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if query.isEmpty {
            return base
        }
        
        func filterNode(_ node: InvoiceItemNode) -> InvoiceItemNode? {
            if node.isLeaf {
                let matchesName = node.name.lowercased().contains(query)
                let matchesCode = node.code?.lowercased().contains(query) ?? false
                return (matchesName || matchesCode) ? node : nil
            } else if let children = node.children {
                let filteredChildren = children.compactMap { filterNode($0) }
                if !filteredChildren.isEmpty {
                    var newNode = node
                    newNode.children = filteredChildren
                    return newNode
                }
            }
            return nil
        }
        
        return base.compactMap { filterNode($0) }
    }
    
    public var body: some View {
        VStack(spacing: 12) {
            // Two-Option Segmented Slider (Price Book / QuickBooks)
            Picker("Item Source", selection: $selectedSource) {
                ForEach(ItemSource.allCases) { source in
                    Text(source.rawValue).tag(source)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 8)
            
            #if true
            NativeiOSCategoryList(
                categories: currentCategories,
                tempSelectedItemsMap: $tempSelectedItemsMap,
                itemQuantities: $itemQuantities
            )
            #else
            // Skip / Android Fallback List
            List {
                ForEach(currentCategories) { catNode in
                    InvoiceCategoryNodeCell(
                        itemNode: catNode,
                        tempSelectedItemsMap: $tempSelectedItemsMap,
                        itemQuantities: $itemQuantities
                    )
                }
            }
            .listStyle(.plain)
            #endif
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Items")
        .searchable(text: $searchText, prompt: "Search items...")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showSummarySheet) {
            SelectedItemsSummarySheet(
                selectedItemsMap: $tempSelectedItemsMap,
                itemQuantities: $itemQuantities,
                sheetDetent: $sheetDetent,
                onAdd: {
                    showSummarySheet = false
                    var result: [InvoiceItem] = []
                    for (id, item) in tempSelectedItemsMap {
                        let qty = itemQuantities[id] ?? 1
                        for _ in 0..<qty {
                            result.append(item)
                        }
                    }
                    selectedItems = result
                    dismiss()
                }
            )
            .presentationDetents([.fraction(0.15), .large], selection: $sheetDetent)
            .presentationBackgroundInteraction(.enabled(upThrough: .fraction(0.15)))
            .presentationDragIndicator(.visible)
            .interactiveDismissDisabled(true)
        }
        #endif
    }
}

public struct JobSelectionScreen: View {
    @Environment(\.dismiss) var dismiss
    var customer: Customer
    var onSaveInvoice: ((InvoiceRecord) -> Void)? = nil
    
    @State var selectedLocation: Address
    @State var selectedJobOption: String = "New"
    @State var selectedJobType: String = "Diagnostic"
    @State var isSaved: Bool = false
    
    public init(customer: Customer, onSaveInvoice: ((InvoiceRecord) -> Void)? = nil) {
        self.customer = customer
        self.onSaveInvoice = onSaveInvoice
        self._selectedLocation = State(initialValue: customer.effectiveBillingAddress)
    }
    
    let jobOptions = ["New", "Job #140029 - Diagnostic", "Job #139820 - Sealed System", "Job #138450 - Installation"]
    var jobTypeCategories: [JobTypeCategory] {
        let group = SessionManager.shared.currentUser?.dispatchGroup ?? .applianceTechs
        return JobTypeRegistry.shared.categories(for: group)
    }
    
    var jobTypes: [String] {
        let group = SessionManager.shared.currentUser?.dispatchGroup ?? .applianceTechs
        return JobTypeRegistry.shared.flatNames(for: group)
    }
    
    private var generatedInvoiceNumber: String {
        if selectedJobOption == "New" {
            return "I-140020-02"
        } else if selectedJobOption.contains("140029") {
            return "I-140029-02"
        } else if selectedJobOption.contains("139820") {
            return "I-139820-02"
        } else if selectedJobOption.contains("138450") {
            return "I-138450-02"
        }
        return "I-140020-02"
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(spacing: 0) {
                    // Row 1: Location (2-line address format)
                    Menu {
                        ForEach(customer.locations, id: \.self) { loc in
                            Button(action: { selectedLocation = loc }) {
                                VStack(alignment: .leading) {
                                    Text(loc.street.isEmpty ? "Main Location" : loc.street)
                                    Text(loc.city.isEmpty ? "Chicago, IL 60601" : "\(loc.city), \(loc.state) \(loc.zipCode)")
                                }
                            }
                        }
                    } label: {
                        HStack {
                            Text("Location")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(selectedLocation.street.isEmpty ? "Main Location" : selectedLocation.street)
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.secondary)
                                Text(selectedLocation.city.isEmpty ? "Chicago, IL 60601" : "\(selectedLocation.city), \(selectedLocation.state) \(selectedLocation.zipCode)")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.secondary)
                            }
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.6))
                        }
                        .padding(.vertical, 12)
                        .padding(.horizontal, 20)
                        #if os(iOS)
                        .contentShape(Rectangle())
                        #endif
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 20)
                    
                    // Row 2: Job
                    Menu {
                        ForEach(jobOptions, id: \.self) { job in
                            Button(job) {
                                selectedJobOption = job
                                if job.contains("Diagnostic") {
                                    selectedJobType = "Diagnostic"
                                } else if job.contains("Sealed System") {
                                    selectedJobType = "Sealed System"
                                } else if job.contains("Installation") {
                                    selectedJobType = "Installation"
                                } else if job.contains("Repair") {
                                    selectedJobType = "Repair"
                                } else if job.contains("Maintenance") {
                                    selectedJobType = "Maintenance"
                                } else if job.contains("Parts") {
                                    selectedJobType = "Parts"
                                }
                            }
                        }
                    } label: {
                        HStack {
                            Text("Job")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            Spacer()
                            Text(selectedJobOption)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.6))
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                        #if os(iOS)
                        .contentShape(Rectangle())
                        #endif
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 20)
                    
                    // Row 3: Job Type (Hierarchical Designation > Description Submenus)
                    Menu {
                        ForEach(jobTypeCategories) { category in
                            Menu(category.name) {
                                ForEach(category.standardItems) { item in
                                    Button(action: {
                                        selectedJobType = item.name
                                    }) {
                                        if selectedJobType == item.name {
                                            Label(item.name, systemImage: "checkmark")
                                        } else {
                                            Text(item.name)
                                        }
                                    }
                                }
                                
                                if !category.providerItems.isEmpty {
                                    Divider()
                                    ForEach(category.providerItems) { item in
                                        Button(action: {
                                            selectedJobType = item.name
                                        }) {
                                            if selectedJobType == item.name {
                                                Label(item.name, systemImage: "checkmark")
                                            } else {
                                                Text(item.name)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack {
                            Text("Job Type")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            Spacer()
                            Text(selectedJobType)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.6))
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                        #if os(iOS)
                        .contentShape(Rectangle())
                        #endif
                    }
                    .buttonStyle(.plain)
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            .padding(16)
        }
        .overlay(
            VStack(spacing: 0) {
                Spacer()
                VStack(spacing: 0) {
                    NavigationLink(destination: CreateInvoiceScreen(
                        customer: customer,
                        appointment: nil,
                        isProposalMode: false,
                        isNew: (selectedJobOption == "New"),
                        invNumberOverride: generatedInvoiceNumber,
                        onSaveInvoice: {
                            let newRecord = InvoiceRecord(
                                invNumber: generatedInvoiceNumber,
                                status: "Open - Draft",
                                paymentStatus: "Unpaid",
                                dueDate: "8/8/26",
                                amount: "$0.00"
                            )
                            isSaved = true
                            onSaveInvoice?(newRecord)
                            dismiss()
                        }
                    )) {
                        Text("Next")
                            .font(.headline.weight(.semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red)
                            .cornerRadius(14)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.murphysCardBackground)
                .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: -2)
            }
        )
        .onAppear {
            if isSaved {
                dismiss()
            }
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Job Selection")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        #endif
    }
}

public struct NewLoanScreen: View {
    var customer: Customer
    var appointment: Appointment?
    
    @Environment(\.dismiss) var dismiss
    @State var selectedState: String = "Florida"
    @State var selectedPlan: String = "12 Months Same as Cash (0% APR)"
    @State var amountToFinanceText: String = ""
    @State var showUnsavedChangesAlert: Bool = false
    @State var isEdited: Bool = false
    
    let stateOptions = [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
        "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
        "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
        "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
        "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
    ]
    
    let planOptions = [
        "12 Months Same as Cash (0% APR)",
        "60 Months Fixed (9.99% APR)",
        "120 Months Reduced Rate (11.99% APR)"
    ]
    
    public init(customer: Customer, appointment: Appointment? = nil) {
        self.customer = customer
        self.appointment = appointment
    }
    
    public var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 16) {
                    VStack(spacing: 0) {
                        // Row 1: Project Location (Popup Menu with list of states, Florida preselected)
                        HStack {
                            Text("Project Location")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            Menu {
                                ForEach(stateOptions, id: \.self) { st in
                                    Button(st) {
                                        selectedState = st
                                        isEdited = true
                                    }
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    Text(selectedState)
                                        .font(.callout)
                                        .foregroundColor(.secondary)
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(14)
                        
                        Divider().padding(.horizontal, 14)
                        
                        // Row 2: Plan (Popup Menu with 3 plans)
                        HStack {
                            Text("Plan")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            Menu {
                                ForEach(planOptions, id: \.self) { plan in
                                    Button(plan) {
                                        selectedPlan = plan
                                        isEdited = true
                                    }
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    Text(selectedPlan)
                                        .font(.callout)
                                        .foregroundColor(.secondary)
                                        .multilineTextAlignment(.trailing)
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(14)
                        
                        Divider().padding(.horizontal, 14)
                        
                        // Row 3: Amount to Finance ($ Amount, decimalPad keyboard)
                        HStack {
                            Text("Amount to Finance")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            HStack(spacing: 2) {
                                Text("$")
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                TextField("0.00", text: Binding(
                                    get: { amountToFinanceText },
                                    set: { newVal in
                                        let filtered = newVal.filter { "0123456789.".contains($0) }
                                        let parts = filtered.components(separatedBy: ".")
                                        if parts.count > 2 {
                                            amountToFinanceText = parts[0] + "." + parts[1...].joined()
                                        } else {
                                            amountToFinanceText = filtered
                                        }
                                        isEdited = true
                                    }
                                ))
                                    .font(.callout)
                                    .multilineTextAlignment(.trailing)
                                    #if os(iOS)
                                    .keyboardType(.decimalPad)
                                    #endif
                            }
                            .frame(maxWidth: 140)
                        }
                        .padding(14)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                .padding(16)
                .padding(.bottom, 100)
            }
            
            // Bottom Red Floating Action Button (Identical to Send Invoice, Labeled "Save")
            VStack(spacing: 0) {
                Spacer()
                VStack(spacing: 12) {
                    Button(action: {
                        dismiss()
                    }) {
                        Text("Save")
                            .font(.headline.weight(.semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red)
                            .cornerRadius(14)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.murphysGroupedBackground)
            }
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("New Loan")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(isEdited)
        .toolbar {
            if isEdited {
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: {
                        showUnsavedChangesAlert = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                                .font(.body.weight(.semibold))
                            Text("Back")
                        }
                    }
                }
            }
        }
        #endif
        .alert("Unsaved Changes", isPresented: $showUnsavedChangesAlert) {
            Button("Discard Changes", role: .destructive) {
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("Are you sure you want to leave this page? Your financing changes will be lost.")
        }
    }
}
