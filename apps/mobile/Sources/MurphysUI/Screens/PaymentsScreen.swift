import SwiftUI

// MARK: - Designated Status Indicator Badge
public struct DesignatedStatusBadge: View {
    @Environment(\.colorScheme) var colorScheme
    public var status: String
    
    public init(status: String) {
        self.status = status
    }
    
    private var badgeColors: (fg: Color, bg: Color, border: Color) {
        switch status.lowercased() {
        case "approved", "paid", "disbursed", "billing", "completed", "complete":
            return (
                fg: colorScheme == .dark ? Color(red: 110/255.0, green: 231/255.0, blue: 183/255.0) : Color(red: 4/255.0, green: 120/255.0, blue: 87/255.0),
                bg: colorScheme == .dark ? Color(red: 2/255.0, green: 44/255.0, blue: 34/255.0) : Color(red: 236/255.0, green: 253/255.0, blue: 245/255.0),
                border: colorScheme == .dark ? Color(red: 6/255.0, green: 95/255.0, blue: 70/255.0) : Color(red: 167/255.0, green: 243/255.0, blue: 208/255.0)
            )
        case "settled", "default", "assigned":
            return (
                fg: colorScheme == .dark ? Color(red: 147/255.0, green: 197/255.0, blue: 253/255.0) : Color(red: 29/255.0, green: 78/255.0, blue: 216/255.0),
                bg: colorScheme == .dark ? Color(red: 23/255.0, green: 37/255.0, blue: 84/255.0) : Color(red: 239/255.0, green: 246/255.0, blue: 255/255.0),
                border: colorScheme == .dark ? Color(red: 30/255.0, green: 64/255.0, blue: 175/255.0) : Color(red: 191/255.0, green: 219/255.0, blue: 254/255.0)
            )
        case "pending", "partial", "pending disbursal", "refunded", "on hold", "en route", "in progress", "unscheduled":
            return (
                fg: colorScheme == .dark ? Color(red: 252/255.0, green: 211/255.0, blue: 77/255.0) : Color(red: 180/255.0, green: 83/255.0, blue: 9/255.0),
                bg: colorScheme == .dark ? Color(red: 69/255.0, green: 26/255.0, blue: 3/255.0) : Color(red: 254/255.0, green: 243/255.0, blue: 199/255.0),
                border: colorScheme == .dark ? Color(red: 146/255.0, green: 64/255.0, blue: 14/255.0) : Color(red: 253/255.0, green: 230/255.0, blue: 138/255.0)
            )
        case "unpaid":
            return (
                fg: colorScheme == .dark ? Color(red: 156/255.0, green: 163/255.0, blue: 175/255.0) : Color(red: 75/255.0, green: 85/255.0, blue: 99/255.0),
                bg: colorScheme == .dark ? Color(red: 31/255.0, green: 41/255.0, blue: 55/255.0) : Color(red: 243/255.0, green: 244/255.0, blue: 246/255.0),
                border: colorScheme == .dark ? Color(red: 55/255.0, green: 65/255.0, blue: 81/255.0) : Color(red: 229/255.0, green: 231/255.0, blue: 235/255.0)
            )
        default: // cancelled, unassigned
            return (
                fg: colorScheme == .dark ? Color(red: 252/255.0, green: 165/255.0, blue: 165/255.0) : Color(red: 185/255.0, green: 28/255.0, blue: 28/255.0),
                bg: colorScheme == .dark ? Color(red: 69/255.0, green: 10/255.0, blue: 10/255.0) : Color(red: 254/255.0, green: 226/255.0, blue: 226/255.0),
                border: colorScheme == .dark ? Color(red: 153/255.0, green: 27/255.0, blue: 27/255.0) : Color(red: 254/255.0, green: 202/255.0, blue: 202/255.0)
            )
        }
    }
    
    public var body: some View {
        let colors = badgeColors
        Text(status)
            .font(.caption.weight(.medium))
            .foregroundColor(colors.fg)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(colors.bg)
            .cornerRadius(6)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(colors.border, lineWidth: 1)
            )
    }
}

// MARK: - Main Payments Tab Screen
public struct PaymentsScreen: View {
    @Environment(CustomerStore.self) var customerStore
    
    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                // 1. Process Payment Tile (Green)
                NavigationLink(destination: CustomerListScreen(navigationTitle: "Select Customer", paymentActionType: .processPayment, showSkipButton: true)) {
                    OfficeTileCard(
                        title: "Process Payment",
                        iconName: "creditcard",
                        darkIconName: "creditcard.fill",
                        iconColor: .green
                    )
                }
                .buttonStyle(PlainButtonStyle())
                
                // 2. Record Payment Tile (Blue)
                NavigationLink(destination: CustomerListScreen(navigationTitle: "Select Customer", paymentActionType: .recordPayment, showSkipButton: true)) {
                    OfficeTileCard(
                        title: "Record Payment",
                        iconName: "square.and.pencil",
                        darkIconName: "square.and.pencil",
                        iconColor: .blue,
                        lightIconWeight: .regular,
                        darkIconWeight: .semibold
                    )
                }
                .buttonStyle(PlainButtonStyle())
                
                // 3. Transaction Activity Tile (Orange)
                NavigationLink(destination: TransactionActivityScreen()) {
                    OfficeTileCard(
                        title: "Transaction Activity",
                        iconName: "arrow.left.arrow.right",
                        darkIconName: "arrow.left.arrow.right",
                        iconColor: .orange,
                        lightIconWeight: .regular,
                        darkIconWeight: .semibold
                    )
                }
                .buttonStyle(PlainButtonStyle())
                
                // 4. Submit Loan Application Tile (Purple)
                NavigationLink(destination: SubmitLoanApplicationScreen()) {
                    OfficeTileCard(
                        title: "Submit Loan Application",
                        iconName: "doc.text",
                        darkIconName: "doc.text.fill",
                        iconColor: .purple
                    )
                }
                .buttonStyle(PlainButtonStyle())
                
                // 5. Financing Dashboard Tile (Teal)
                NavigationLink(destination: FinancingDashboardScreen()) {
                    OfficeTileCard(
                        title: "Financing Dashboard",
                        iconName: "chart.bar.doc.horizontal",
                        darkIconName: "chart.bar.doc.horizontal.fill",
                        iconColor: .teal
                    )
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Payments")
        #if os(iOS)
        .toolbarTitleDisplayMode(.inlineLarge)
        #endif
        #if os(iOS)
        .toolbarBackground(.visible, for: .navigationBar)
        #endif
    }
}

// MARK: - Payment Action Types
public enum PaymentActionType: String, Identifiable {
    case processPayment = "Process Payment"
    case recordPayment = "Record Payment"
    case setupPaymentPlan = "Set Up Payment Plan"
    
    public var id: String { rawValue }
}

// MARK: - Invoice Item Model
struct PaymentInvoiceItem: Identifiable {
    let id: String
    let date: String
    let amount: String
    let status: String
    let location: String
}

// MARK: - Invoice Selection Screen (Process / Record Payment Step 2 - Skippable)
public struct PaymentInvoiceSelectScreen: View {
    let customer: Customer?
    let actionType: PaymentActionType
    
    public init(customer: Customer? = nil, actionType: PaymentActionType = .processPayment) {
        self.customer = customer
        self.actionType = actionType
        self._isPaymentWithoutInvoice = State(initialValue: customer == nil)
    }
    
    @State var selectedLocationFilter: String = "All Locations"
    @State var selectedInvoiceIds: Set<String> = []
    @State var isPaymentWithoutInvoice: Bool = false
    @State var customPaymentAmount: String = ""
    @State var navigateToDetails: Bool = false
    
    var isCustomAmountValid: Bool {
        let cleaned = customPaymentAmount
            .replacingOccurrences(of: "$", with: "")
            .replacingOccurrences(of: ",", with: "")
            .trimmingCharacters(in: .whitespaces)
        if let val = Double(cleaned), val > 0 {
            return true
        }
        return false
    }
    
    var totalSelectedAmount: Double {
        customerInvoices
            .filter { selectedInvoiceIds.contains($0.id) }
            .compactMap { Double($0.amount.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: ",", with: "")) }
            .reduce(0.0, +)
    }
    
    var formattedSelectedAmount: String {
        String(format: "%.2f", totalSelectedAmount)
    }
    
    var selectedInvoicesSummary: String {
        customerInvoices
            .filter { selectedInvoiceIds.contains($0.id) }
            .map { $0.id }
            .joined(separator: ", ")
    }
    
    var isNextEnabled: Bool {
        if isPaymentWithoutInvoice {
            return isCustomAmountValid
        } else {
            return !selectedInvoiceIds.isEmpty
        }
    }
    
    var customerInvoices: [PaymentInvoiceItem] {
        guard let cust = customer else {
            return []
        }
        let storeInvoices = InvoiceStore.shared.invoices.filter { $0.customerId == cust.id }
        return storeInvoices.map { inv in
            PaymentInvoiceItem(
                id: inv.invNumber,
                date: inv.dueDate,
                amount: inv.amount,
                status: inv.status,
                location: cust.address.street.isEmpty ? "Main Location" : cust.address.street
            )
        }
    }
    
    var locationsList: [String] {
        if let cust = customer {
            let locs = cust.locations.map { $0.street.isEmpty ? "Main Location" : "\($0.street), \($0.city), \($0.state) \($0.zipCode)".trimmingCharacters(in: .whitespaces) }
            return locs.isEmpty ? [cust.address.formattedAddress] : locs
        }
        return []
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    // Top Module: Location Selector Menu (Identical to Equipment / Add Appt page)
                    if customer != nil {
                        Menu {
                            Button {
                                selectedLocationFilter = "All Locations"
                            } label: {
                                HStack {
                                    Text("All Locations")
                                    if selectedLocationFilter == "All Locations" {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                            
                            Divider()
                            
                            ForEach(locationsList, id: \.self) { locStr in
                                Button {
                                    selectedLocationFilter = locStr
                                } label: {
                                    HStack {
                                        Text(locStr)
                                        if selectedLocationFilter == locStr {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack {
                                Image(systemName: "mappin.and.ellipse")
                                    .foregroundColor(.indigo)
                                    .font(.headline)
                                Text(selectedLocationFilter)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                                Spacer()
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(Color.murphysCardBackground)
                            .cornerRadius(12)
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 12)
                    }
                    
                    // Header
                    if let cust = customer {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Select Invoice")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Text("Open invoices for \(cust.name)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 16)
                    }
                    
                    // Invoice Cards List
                    if customer == nil {
                        Text("Customer skipped. Enter payment below.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, 24)
                            .padding(.horizontal, 16)
                    } else if customerInvoices.isEmpty {
                        Text("No open invoices found.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, 24)
                            .padding(.horizontal, 16)
                    } else {
                        VStack(spacing: 10) {
                            ForEach(customerInvoices) { inv in
                                let isSelected = !isPaymentWithoutInvoice && selectedInvoiceIds.contains(inv.id)
                                Button(action: {
                                    if isPaymentWithoutInvoice {
                                        isPaymentWithoutInvoice = false
                                    }
                                    if selectedInvoiceIds.contains(inv.id) {
                                        selectedInvoiceIds.remove(inv.id)
                                    } else {
                                        selectedInvoiceIds.insert(inv.id)
                                    }
                                }) {
                                    HStack(spacing: 12) {
                                        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                                            .font(.title3)
                                            .foregroundColor(isSelected ? .blue : .secondary)
                                        
                                        Text(inv.id)
                                            .font(.headline)
                                            .foregroundColor(.primary)
                                        
                                        Spacer()
                                        
                                        Text(inv.amount)
                                            .font(.headline.weight(.bold))
                                            .foregroundColor(.primary)
                                    }
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 12)
                                    .background(Color.murphysCardBackground)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
                                     )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.bottom, 20)
            }
            .background(Color.murphysGroupedBackground)
            
            // Bottom Sticky Bar (White Backdrop with Red 'Next' Button)
            VStack(spacing: 14) {
                // Selectable Option: Payment without Invoice
                Button(action: {
                    isPaymentWithoutInvoice.toggle()
                    if isPaymentWithoutInvoice {
                        selectedInvoiceIds.removeAll()
                    }
                }) {
                    HStack {
                        Image(systemName: isPaymentWithoutInvoice ? "checkmark.circle.fill" : "circle")
                            .font(.title3)
                            .foregroundColor(isPaymentWithoutInvoice ? .blue : .secondary)
                        
                        Text("Payment without Invoice")
                            .font(.body)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        if isPaymentWithoutInvoice {
                            HStack(spacing: 4) {
                                Text("$")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                                TextField("0.00", text: Binding(
                                    get: { customPaymentAmount },
                                    set: { newVal in
                                        let filtered = newVal.filter { "0123456789.".contains($0) }
                                        let parts = filtered.components(separatedBy: ".")
                                        if parts.count > 2 {
                                            customPaymentAmount = parts[0] + "." + parts[1...].joined()
                                        } else {
                                            customPaymentAmount = filtered
                                        }
                                    }
                                ))
                                    .font(.headline)
                                    .keyboardType(.decimalPad)
                                    .multilineTextAlignment(.trailing)
                                    .frame(width: 80)
                                    .textFieldStyle(.plain)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.murphysGroupedBackground)
                            .cornerRadius(8)
                        }
                    }
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.horizontal, 16)
                
                // Red Button Labeled 'Next'
                Button(action: {
                    navigateToDetails = true
                }) {
                    Text("Next")
                        .font(.headline.weight(.bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(isNextEnabled ? Color.red : Color.gray.opacity(0.35))
                        .cornerRadius(14)
                }
                .disabled(!isNextEnabled)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            }
            .padding(.top, 16)
            .background(Color.murphysCardBackground)
            .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: -3)
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .navigationTitle(actionType.rawValue)
        .navigationDestination(isPresented: $navigateToDetails) {
            let finalAmt = isPaymentWithoutInvoice ? customPaymentAmount : formattedSelectedAmount
            let finalInvSummary = isPaymentWithoutInvoice ? nil : (selectedInvoicesSummary.isEmpty ? nil : selectedInvoicesSummary)
            if actionType == .processPayment {
                ProcessPaymentFormScreen(
                    customer: customer,
                    amount: finalAmt,
                    selectedInvoiceId: finalInvSummary
                )
            } else if actionType == .recordPayment {
                RecordPaymentFormScreen(
                    customer: customer,
                    amount: finalAmt,
                    selectedInvoiceId: finalInvSummary
                )
            } else {
                SetupPaymentPlanFormScreen(customer: customer)
            }
        }
    }
}

// MARK: - Process Payment Form Screen
struct ProcessPaymentFormScreen: View {
    let customer: Customer?
    let amount: String
    let selectedInvoiceId: String?
    
    @State var selectedMethod: String = "Credit Card"
    @State var cardNumber: String = ""
    @State var expDate: String = ""
    @State var cvv: String = ""
    @State var zipCode: String = ""
    @State var saveCardOnFile: Bool = true
    @State var isSuccess: Bool = false
    
    var body: some View {
        Form {
            Section(header: Text("Customer & Amount")) {
                HStack {
                    Text("Customer")
                    Spacer()
                    Text(customer?.name ?? "No Customer Tagged")
                        .foregroundColor(.secondary)
                }
                if let inv = selectedInvoiceId {
                    HStack {
                        Text(inv.contains(",") ? "Invoices" : "Invoice")
                        Spacer()
                        Text(inv)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.trailing)
                    }
                }
                HStack {
                    Text("Amount")
                    Spacer()
                    Text("$\(amount.isEmpty ? "0.00" : amount)")
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                }
            }
            
            Section(header: Text("Payment Method")) {
                Picker("Method", selection: $selectedMethod) {
                    Text("Credit Card").tag("Credit Card")
                    Text("ACH / Bank Transfer").tag("ACH / Bank Transfer")
                }
                .pickerStyle(.segmented)
            }
            
            Section(header: Text("Card Details")) {
                TextField("Card Number", text: $cardNumber)
                    .keyboardType(.numberPad)
                HStack {
                    TextField("MM/YY", text: $expDate)
                        .keyboardType(.numbersAndPunctuation)
                    Divider()
                    TextField("CVV", text: $cvv)
                        .keyboardType(.numberPad)
                }
                TextField("ZIP Code", text: $zipCode)
                    .keyboardType(.numberPad)
                Toggle("Save card on file", isOn: $saveCardOnFile)
            }
            
            Section {
                Button(action: {
                    isSuccess = true
                }) {
                    HStack {
                        Spacer()
                        Text("Process Payment ($\(amount.isEmpty ? "0.00" : amount))")
                            .font(.headline.weight(.bold))
                            .foregroundColor(.white)
                        Spacer()
                    }
                }
                .listRowBackground(Color.blue)
            }
        }
        .navigationTitle("Process Payment")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .alert("Payment Successful", isPresented: $isSuccess) {
            Button("Done", role: .cancel) {}
        } message: {
            Text("Processed $\(amount.isEmpty ? "0.00" : amount) successfully.")
        }
    }
}

// MARK: - Record Payment Form Screen
struct RecordPaymentFormScreen: View {
    let customer: Customer?
    let amount: String
    let selectedInvoiceId: String?
    
    @State var selectedType: String = "Check"
    @State var checkNumber: String = ""
    @State var notes: String = ""
    @State var isSuccess: Bool = false
    
    var body: some View {
        Form {
            Section(header: Text("Customer & Amount")) {
                HStack {
                    Text("Customer")
                    Spacer()
                    Text(customer?.name ?? "No Customer Tagged")
                        .foregroundColor(.secondary)
                }
                if let inv = selectedInvoiceId {
                    HStack {
                        Text(inv.contains(",") ? "Invoices" : "Invoice")
                        Spacer()
                        Text(inv)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.trailing)
                    }
                }
                HStack {
                    Text("Amount")
                    Spacer()
                    Text("$\(amount.isEmpty ? "0.00" : amount)")
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                }
            }
            
            Section(header: Text("Payment Details")) {
                Picker("Payment Type", selection: $selectedType) {
                    Text("Check").tag("Check")
                    Text("Cash").tag("Cash")
                    Text("Other").tag("Other")
                }
                .pickerStyle(.segmented)
                
                if selectedType == "Check" {
                    TextField("Check Number", text: $checkNumber)
                        .keyboardType(.numbersAndPunctuation)
                }
                
                TextField("Notes / Reference", text: $notes)
            }
            
            Section {
                Button(action: {
                    isSuccess = true
                }) {
                    HStack {
                        Spacer()
                        Text("Record Payment ($\(amount.isEmpty ? "0.00" : amount))")
                            .font(.headline.weight(.bold))
                            .foregroundColor(.white)
                        Spacer()
                    }
                }
                .listRowBackground(Color.green)
            }
        }
        .navigationTitle("Record Payment")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .alert("Payment Recorded", isPresented: $isSuccess) {
            Button("Done", role: .cancel) {}
        } message: {
            Text("Recorded payment of $\(amount.isEmpty ? "0.00" : amount) successfully.")
        }
    }
}

// MARK: - Set Up Payment Plan Form Screen
struct SetupPaymentPlanFormScreen: View {
    let customer: Customer?
    
    @State var totalAmount: String = ""
    @State var numberOfInstallments: Int = 4
    @State var frequency: String = "Monthly"
    @State var isSuccess: Bool = false
    
    var body: some View {
        Form {
            Section(header: Text("Customer")) {
                HStack {
                    Text("Customer")
                    Spacer()
                    Text(customer?.name ?? "Select on Next Step")
                        .foregroundColor(.secondary)
                }
            }
            
            Section(header: Text("Plan Details")) {
                HStack {
                    Text("Total Amount")
                    Spacer()
                    TextField("0.00", text: $totalAmount)
                        .multilineTextAlignment(.trailing)
                        .keyboardType(.decimalPad)
                }
                
                Stepper("Installments: \(numberOfInstallments)", value: $numberOfInstallments, in: 2...24)
                
                Picker("Frequency", selection: $frequency) {
                    Text("Weekly").tag("Weekly")
                    Text("Bi-Weekly").tag("Bi-Weekly")
                    Text("Monthly").tag("Monthly")
                }
            }
            
            Section {
                Button(action: {
                    isSuccess = true
                }) {
                    HStack {
                        Spacer()
                        Text("Create Payment Plan")
                            .font(.headline.weight(.bold))
                            .foregroundColor(.white)
                        Spacer()
                    }
                }
                .listRowBackground(Color.blue)
            }
        }
        .navigationTitle("Set Up Payment Plan")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .alert("Payment Plan Created", isPresented: $isSuccess) {
            Button("Done", role: .cancel) {}
        } message: {
            Text("Created \(numberOfInstallments)-\(frequency.lowercased()) installment plan for $\(totalAmount.isEmpty ? "0.00" : totalAmount).")
        }
    }
}

// MARK: - Transaction Detail Screen
struct TransactionDetailScreen: View {
    let transaction: StripeTransaction
    
    var body: some View {
        List {
            Section(header: Text("Transaction Summary")) {
                HStack {
                    Text("Customer")
                    Spacer()
                    Text(transaction.customerName)
                        .foregroundColor(.secondary)
                }
                if let email = transaction.customerEmail {
                    HStack {
                        Text("Email")
                        Spacer()
                        Text(email)
                            .foregroundColor(.secondary)
                    }
                }
                HStack {
                    Text("Amount")
                    Spacer()
                    Text(transaction.formattedAmount)
                        .fontWeight(.bold)
                        .foregroundColor(transaction.isSettled ? .green : .yellow)
                }
                HStack {
                    Text("Date & Time")
                    Spacer()
                    Text(transaction.formattedDate)
                        .foregroundColor(.secondary)
                }
                HStack {
                    Text("Status")
                    Spacer()
                    Text(transaction.status.displayTitle)
                        .fontWeight(.semibold)
                        .foregroundColor(transaction.isSettled ? .green : .yellow)
                }
                if let brand = transaction.cardBrand, let last4 = transaction.cardLast4 {
                    HStack {
                        Text("Payment Method")
                        Spacer()
                        Text("\(brand) •••• \(last4)")
                            .foregroundColor(.secondary)
                    }
                }
                if let provider = transaction.financingProvider {
                    HStack {
                        Text("Financing Provider")
                        Spacer()
                        Text(provider)
                            .foregroundColor(.secondary)
                    }
                }
                if let loanId = transaction.loanId {
                    HStack {
                        Text("Loan Reference")
                        Spacer()
                        Text(loanId)
                            .foregroundColor(.secondary)
                    }
                }
                HStack {
                    Text("Stripe ID")
                    Spacer()
                    Text(transaction.id)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .navigationTitle("Transaction Details")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}


// MARK: - Transaction Activity Screen
struct TransactionActivityScreen: View {
    @State var startDate: Date = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
    @State var endDate: Date = Date()
    @State var selectedSegment = 0
    @State var transactionStore = StripeTransactionStore()
    
    var filteredTransactions: [StripeTransaction] {
        if selectedSegment == 0 {
            return transactionStore.cardTransactions(startDate: startDate, endDate: endDate)
        } else {
            return transactionStore.financingTransactions(startDate: startDate, endDate: endDate)
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Top Item: Date Range Selector Side-by-Side & Segmented Control
            VStack(spacing: 12) {
                HStack(spacing: 0) {
                    CustomCompactDatePicker(label: "Start Date", selection: $startDate, maxDate: endDate)
                    CustomCompactDatePicker(label: "End Date", selection: $endDate, maxDate: Date(), minDate: startDate)
                }
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(Color.murphysCardBackground)
                .cornerRadius(18)
                .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 3)
                
                // Two-Option Slider / Segmented Control: Cards | Financing
                Picker("Transaction Type", selection: $selectedSegment) {
                    Text("Cards").tag(0)
                    Text("Financing").tag(1)
                }
                .pickerStyle(.segmented)
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 8)
            
            // Transaction List (pulled up higher to eliminate dead space)
            List {
                Section(header: Text(selectedSegment == 0 ? "Card Transactions" : "Financing Transactions")) {
                    if filteredTransactions.isEmpty {
                        Text("No transactions found for the selected date range.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.vertical, 8)
                    } else {
                        ForEach(filteredTransactions) { tx in
                            NavigationLink(destination: TransactionDetailScreen(transaction: tx)) {
                                TransactionRow(
                                    title: tx.customerName,
                                    date: tx.formattedDate,
                                    amount: tx.formattedAmount,
                                    isSettled: tx.isSettled
                                )
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
            .padding(.top, -6)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Transaction Activity")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

struct TransactionRow: View {
    let title: String
    let date: String
    let amount: String
    let isSettled: Bool
    
    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                Text(date)
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text(amount)
                .font(.headline.weight(.semibold))
                .foregroundColor(isSettled ? .green : .yellow)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Submit Loan Application Screen
struct SubmitLoanApplicationScreen: View {
    @Environment(CustomerStore.self) var customerStore
    
    @State var selectedCustomerIndex = 0
    @State var requestedAmount = "3500"
    @State var termMonths = "24"
    @State var annualIncome = "75000"
    @State var applicationSubmitted = false
    
    var body: some View {
        Form {
            Section(header: Text("Applicant Information")) {
                if !customerStore.customers.isEmpty {
                    Menu {
                        ForEach(0..<customerStore.customers.count, id: \.self) { idx in
                            Button(action: {
                                selectedCustomerIndex = idx
                            }) {
                                HStack {
                                    Text(customerStore.customers[idx].name)
                                    if selectedCustomerIndex == idx {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack {
                            Text("Customer")
                                .foregroundColor(.primary)
                            Spacer()
                            Text(customerStore.customers[selectedCustomerIndex].name)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                                .padding(.leading, 4)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                
                HStack {
                    Text("Annual Income ($)")
                    Spacer()
                    TextField("75,000", text: Binding(
                        get: { annualIncome },
                        set: { annualIncome = $0.filter { "0123456789".contains($0) } }
                    ))
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                }
            }
            
            Section(header: Text("Loan Request")) {
                HStack {
                    Text("Requested Amount ($)")
                    Spacer()
                    TextField("0.00", text: Binding(
                        get: { requestedAmount },
                        set: { newVal in
                            let filtered = newVal.filter { "0123456789.".contains($0) }
                            let parts = filtered.components(separatedBy: ".")
                            if parts.count > 2 {
                                requestedAmount = parts[0] + "." + parts[1...].joined()
                            } else {
                                requestedAmount = filtered
                            }
                        }
                    ))
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                }
                
                Picker("Term (Months)", selection: $termMonths) {
                    Text("12 Months").tag("12")
                    Text("24 Months").tag("24")
                    Text("36 Months").tag("36")
                    Text("48 Months").tag("48")
                    Text("60 Months").tag("60")
                }
            }
            
            Section {
                Button(action: {
                    applicationSubmitted = true
                }) {
                    HStack {
                        Spacer()
                        Text("Submit Loan Application")
                            .fontWeight(.semibold)
                        Spacer()
                    }
                }
            }
        }
        .navigationTitle("Submit Loan Application")
        .alert("Application Submitted", isPresented: $applicationSubmitted) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Loan application for $\(requestedAmount) has been submitted for review.")
        }
    }
}


// MARK: - Financing Dashboard Screen
struct FinancingDashboardScreen: View {
    var body: some View {
        List {
            NavigationLink(destination: FinancingSubListScreen(title: "Active Loans")) {
                Label("Active Loans", systemImage: "banknote.fill")
                    .font(.body)
            }
            
            NavigationLink(destination: FinancingSubListScreen(title: "Pending Applications")) {
                Label("Pending Applications", systemImage: "clock.arrow.circlepath")
                    .font(.body)
            }
            
            NavigationLink(destination: FinancingSubListScreen(title: "Pre-Approval Requests")) {
                Label("Pre-Approval Requests", systemImage: "checkmark.seal.fill")
                    .font(.body)
            }
            
            NavigationLink(destination: FinancingSubListScreen(title: "Promotional Rates & Offers")) {
                Label("Promotional Rates & Offers", systemImage: "percent")
                    .font(.body)
            }
            
            NavigationLink(destination: FinancingSubListScreen(title: "Financing Settings")) {
                Label("Financing Settings", systemImage: "gearshape.fill")
                    .font(.body)
            }
        }
        .listStyle(.plain)
        .navigationTitle("Financing Dashboard")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

struct FinancingSubListScreen: View {
    let title: String
    
    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 6) {
                    Text("\(title) Summary")
                        .font(.headline)
                    Text("No active records found for \(title.lowercased()) at this time.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 8)
            }
        }
        #if true
        .listStyle(.insetGrouped)
        #else
        .listStyle(.plain)
        #endif
        .navigationTitle(title)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}
