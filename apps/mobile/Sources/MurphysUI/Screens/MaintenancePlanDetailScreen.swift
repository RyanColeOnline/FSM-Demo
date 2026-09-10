import SwiftUI


public struct MaintenancePlanDetailScreen: View {
    public var customer: Customer
    public var plan: MaintenancePlanItem
    
    public init(customer: Customer, plan: MaintenancePlanItem = MaintenancePlanItem(
        name: "Gold Protection Plan",
        status: "ACTIVE",
        description: "Includes 2 bi-annual tune-ups (Spring/Fall) and 15% discount on repair parts.",
        expiresDate: "8/12/26",
        contractTotal: "$348.00",
        annualPrice: "$348.00",
        balance: "$174.00"
    )) {
        self.customer = customer
        self.plan = plan
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Grouped Table List with 4 Native Options
                VStack(spacing: 0) {
                    // 1. Contract
                    NavigationLink(destination: MaintenanceContractScreen(customer: customer, plan: plan)) {
                        MaintenanceNavRow(title: "Contract")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 2. Service Windows
                    NavigationLink(destination: MaintenanceServiceWindowsScreen(customer: customer, plan: plan)) {
                        MaintenanceNavRow(title: "Service Windows")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 3. Reminders
                    NavigationLink(destination: MaintenanceRemindersScreen(customer: customer, plan: plan)) {
                        MaintenanceNavRow(title: "Reminders")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 4. Payments
                    NavigationLink(destination: MaintenancePaymentsScreen(customer: customer, plan: plan)) {
                        MaintenanceNavRow(title: "Payments")
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
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(plan.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(customer.displayName)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button(action: {}) {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
        }
    }
}

// MARK: - Navigation Row Component (.callout font)
struct MaintenanceNavRow: View {
    var title: String
    
    var body: some View {
        HStack {
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

// MARK: - 1. Contract Screen (Structured Form with Ordered Fields & Contract Terms)
public struct MaintenanceContractScreen: View {
    @Environment(\.dismiss) var dismiss
    @Environment(MaintenancePlanStore.self) var maintenancePlanStore
    public var customer: Customer
    public var plan: MaintenancePlanItem
    
    @State var startDate: Date
    @State var endDate: Date
    @State var annualPrice: String
    @State var selectedSalesAgent: String
    @State var collectTax: Bool = false
    @State var savedSignatureLines: [SignatureLine] = []
    @FocusState var isAnnualPriceFocused: Bool
    
    let salesAgents = [
        "Justin Lung",
        "Minor Cover",
        "Wes Rykoskey",
        "Andrew (Jr) Murphy",
        "Joe Colacino",
        "Robert Hudson",
        "Ethan Mitchell",
        "Matt Curtsinger",
        "Jon Martin",
        "Justin Dunlap",
        "Danny Pardo",
        "Nancy Murphy",
        "Amanda Hoover"
    ]
    
    public init(customer: Customer, plan: MaintenancePlanItem) {
        self.customer = customer
        self.plan = plan
        
        let cal = Calendar.current
        let defaultStart = cal.date(byAdding: .year, value: -1, to: Date()) ?? Date()
        let defaultEnd = Date()
        _startDate = State(initialValue: defaultStart)
        _endDate = State(initialValue: defaultEnd)
        _annualPrice = State(initialValue: plan.annualPrice.replacingOccurrences(of: "$", with: ""))
        _selectedSalesAgent = State(initialValue: "")
    }
    
    private var calculatedContractTotal: Double {
        let cleanPriceStr = annualPrice.replacingOccurrences(of: "$", with: "").replacingOccurrences(of: ",", with: "").trimmingCharacters(in: .whitespaces)
        let annualVal = Double(cleanPriceStr) ?? 348.0
        let diffComponents = Calendar.current.dateComponents([.year, .month], from: startDate, to: endDate)
        let yearsDiff = diffComponents.year ?? 0
        let monthsDiff = diffComponents.month ?? 0
        let totalYears = max(1, yearsDiff + (monthsDiff > 6 ? 1 : 0))
        return annualVal * Double(totalYears)
    }
    
    private var formattedContractTotal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: calculatedContractTotal)) ?? String(format: "$%.2f", calculatedContractTotal)
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Group 1: Plan Details & Location
                VStack(spacing: 0) {
                    // 1. Plan (prepopulated, disabled)
                    HStack {
                        Text("Plan")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Spacer()
                        Text(plan.name)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 2. Description
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Description")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Text(plan.description.isEmpty ? "Includes 2 bi-annual tune-ups (Spring/Fall) and 15% discount on repair parts." : plan.description)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 3. Location (disabled from changing, 2-line format)
                    let loc = customer.locations.first(where: { !plan.locationStreet.isEmpty && $0.street == plan.locationStreet }) ?? customer.locations.first
                    let streetLine = loc?.street.isEmpty == false ? loc!.street : "Main Location"
                    let cityStateZipLine = "\(loc?.city.isEmpty == false ? loc!.city : "Chicago"), \(loc?.state.isEmpty == false ? loc!.state : "IL") \(loc?.zipCode.isEmpty == false ? loc!.zipCode : "60601")"
                    
                    HStack(alignment: .center) {
                        Text("Location")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text(streetLine)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Text(cityStateZipLine)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // Group 2: Pricing, Dates, Sales Agent, Tax & Contract Total
                VStack(spacing: 0) {
                    // 4. Plan start date
                    DatePicker("Plan Start Date", selection: $startDate, displayedComponents: .date)
                        .font(.subheadline)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 20)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 5. Plan end date
                    DatePicker("Plan End Date", selection: $endDate, displayedComponents: .date)
                        .font(.subheadline)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 20)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 6. Annual price
                    HStack {
                        Text("Annual Price")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Spacer()
                        HStack(spacing: 2) {
                            Text("$")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            TextField("0.00", text: $annualPrice)
                                .focused($isAnnualPriceFocused)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.trailing)
                                #if os(iOS)
                                .keyboardType(.decimalPad)
                                #endif
                        }
                        .frame(maxWidth: 120, alignment: .trailing)
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 7. Sales Agent (users, empty by default with "Select" placeholder)
                    HStack {
                        Text("Sales Agent")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Spacer()
                        Menu {
                            Button("Select") {
                                selectedSalesAgent = ""
                            }
                            Divider()
                            ForEach(salesAgents, id: \.self) { agent in
                                Button(agent) {
                                    selectedSalesAgent = agent
                                }
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text(selectedSalesAgent.isEmpty ? "Select" : selectedSalesAgent)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.8))
                            }
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 8. Collect tax? (toggle)
                    Toggle("Collect Tax?", isOn: $collectTax)
                        .font(.subheadline)
                        .padding(.vertical, 12)
                        .padding(.horizontal, 20)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // 9. Contract total (calculated & disabled from changing)
                    HStack {
                        Text("Contract Total")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                        Spacer()
                        Text(formattedContractTotal)
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // Group 3: Contract Terms & Signature Card (Reused identical component)
                VStack(alignment: .leading, spacing: 10) {
                    Text("Contract Terms")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    Text("The customer has agreed to the terms and conditions of this maintenance plan")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        .fixedSize(horizontal: false, vertical: true)
                    
                    Text(savedSignatureLines.isEmpty ? "Customer Signature (Tap to Sign)" : "Customer Signature (Tap to Edit)")
                        .font(.callout)
                        .foregroundColor(.primary)
                        .padding(.top, 4)
                    
                    if !savedSignatureLines.isEmpty {
                        List {
                            NavigationLink(destination: SignatureCaptureScreen(savedSignatureLines: $savedSignatureLines, formattedInvoiceNumber: "MP-2026-8841")) {
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
                        NavigationLink(destination: SignatureCaptureScreen(savedSignatureLines: $savedSignatureLines, formattedInvoiceNumber: "MP-2026-8841")) {
                            Image(systemName: "plus.circle.fill")
                                .font(.headline)
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
            .padding(16)
        }
        #if os(iOS)
        .scrollDismissesKeyboard(.interactively)
        #endif
        .background(Color.murphysGroupedBackground)
        .onTapGesture {
            isAnnualPriceFocused = false
        }
        .navigationTitle("Contract")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Save") {
                    isAnnualPriceFocused = false
                    var updatedPlan = plan
                    updatedPlan.annualPrice = annualPrice
                    updatedPlan.customerId = customer.id
                    Task {
                        await MaintenancePlanStore.shared.savePlan(updatedPlan)
                        dismiss()
                    }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.primary)
            }
        }
        #if os(iOS)
        .onAppear {
            OrientationManager.lockOrientation(.portrait)
        }
        #endif
    }
}

// MARK: - 2. Service Windows Screen
public struct MaintenanceServiceWindowsScreen: View {
    @Environment(MaintenancePlanStore.self) var maintenancePlanStore
    public var customer: Customer
    public var plan: MaintenancePlanItem
    
    @State var serviceWindows: [ServiceWindowItem] = []
    @State var showAddWindowSheet: Bool = false
    
    public init(customer: Customer, plan: MaintenancePlanItem) {
        self.customer = customer
        self.plan = plan
        
        var items: [ServiceWindowItem] = []
        var jobId = 134354
        let startYear = 2026
        let totalYears = 20
        
        for yearOffset in 0..<totalYears {
            let currentYear = startYear + yearOffset
            
            // Late Summer / Fall visit
            let isFirst = (yearOffset == 0)
            items.append(ServiceWindowItem(
                dateRange: "Aug \(currentYear) - Sep \(currentYear)",
                jobSubtitle: "Job #\(jobId): \(isFirst ? "J-1st" : "1st") Visit 1 System",
                isComplete: isFirst
            ))
            jobId += 1
            
            // Spring visit next year
            items.append(ServiceWindowItem(
                dateRange: "Mar \(currentYear + 1) - Apr \(currentYear + 1)",
                jobSubtitle: "Job #\(jobId): 2nd Visit 1 System",
                isComplete: false
            ))
            jobId += 1
        }
        self._serviceWindows = State(initialValue: items)
    }
    
    public var body: some View {
        List {
            ForEach(serviceWindows) { item in
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.dateRange)
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.primary)
                        Text(item.jobSubtitle)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    DesignatedStatusBadge(status: item.isComplete ? "Complete" : "Unscheduled")
                    
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.35))
                        .padding(.leading, 4)
                }
                .padding(.vertical, 2)
                #if true
                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                #endif
            }
        }
        .listStyle(.plain)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(plan.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(customer.displayName)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button(action: {
                    showAddWindowSheet = true
                }) {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
        }
        .sheet(isPresented: $showAddWindowSheet) {
            AddServiceWindowSheet { newWindow in
                serviceWindows.insert(newWindow, at: 0)
                var updatedPlan = plan
                updatedPlan.serviceWindows = serviceWindows
                updatedPlan.customerId = customer.id
                Task {
                    await MaintenancePlanStore.shared.savePlan(updatedPlan)
                }
            }
            #if os(iOS)
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
            #endif
        }
    }
}

// MARK: - Add Service Window Sheet
public struct AddServiceWindowSheet: View {
    @Environment(\.dismiss) var dismiss
    public var onSave: (ServiceWindowItem) -> Void
    
    @State var startMonth: String = "Aug"
    @State var startYear: Int = 2026
    @State var endMonth: String = "Sep"
    @State var endYear: Int = 2026
    @State var jobName: String = ""
    @State var showDiscardConfirmation: Bool = false
    
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    
    let years = Array(2025...2046)
    
    private var isModified: Bool {
        !jobName.trimmingCharacters(in: .whitespaces).isEmpty ||
        startMonth != "Aug" || startYear != 2026 ||
        endMonth != "Sep" || endYear != 2026
    }
    
    public init(onSave: @escaping (ServiceWindowItem) -> Void) {
        self.onSave = onSave
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    VStack(spacing: 0) {
                        // 1. Starting Month
                        HStack {
                            Text("Starting Month")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                            Spacer()
                            HStack(spacing: 6) {
                                Menu {
                                    ForEach(months, id: \.self) { m in
                                        Button(m) { startMonth = m }
                                    }
                                } label: {
                                    HStack(spacing: 3) {
                                        Text(startMonth)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(.secondary.opacity(0.7))
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.secondary.opacity(0.1))
                                    .cornerRadius(6)
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                Menu {
                                    ForEach(years, id: \.self) { y in
                                        Button(String(y)) { startYear = y }
                                    }
                                } label: {
                                    HStack(spacing: 3) {
                                        Text(String(startYear))
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(.secondary.opacity(0.7))
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.secondary.opacity(0.1))
                                    .cornerRadius(6)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.vertical, 12)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                        
                        // 2. Ending Month
                        HStack {
                            Text("Ending Month")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                            Spacer()
                            HStack(spacing: 6) {
                                Menu {
                                    ForEach(months, id: \.self) { m in
                                        Button(m) { endMonth = m }
                                    }
                                } label: {
                                    HStack(spacing: 3) {
                                        Text(endMonth)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(.secondary.opacity(0.7))
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.secondary.opacity(0.1))
                                    .cornerRadius(6)
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                Menu {
                                    ForEach(years, id: \.self) { y in
                                        Button(String(y)) { endYear = y }
                                    }
                                } label: {
                                    HStack(spacing: 3) {
                                        Text(String(endYear))
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(.secondary.opacity(0.7))
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.secondary.opacity(0.1))
                                    .cornerRadius(6)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.vertical, 12)
                        .padding(.horizontal, 20)
                        
                        Divider().padding(.horizontal, 20)
                        
                        // 3. Job Name
                        HStack {
                            Text("Job Name")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                                .frame(width: 85, alignment: .leading)
                            
                            TextField("1st Visit 1 System", text: $jobName)
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                .padding(16)
            }
            .background(Color.murphysGroupedBackground)
            .navigationTitle("Add Service Window")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            .interactiveDismissDisabled(isModified)
            #endif
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        if isModified {
                            showDiscardConfirmation = true
                        } else {
                            dismiss()
                        }
                    }
                    .font(.subheadline)
                    .foregroundColor(.primary)
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button("Save") {
                        let finalJobName = jobName.trimmingCharacters(in: .whitespaces)
                        let newWindow = ServiceWindowItem(
                            dateRange: "\(startMonth) \(startYear) - \(endMonth) \(endYear)",
                            jobSubtitle: finalJobName.isEmpty ? "1st Visit 1 System" : finalJobName,
                            isComplete: false
                        )
                        onSave(newWindow)
                        dismiss()
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primary)
                    .disabled(jobName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .confirmationDialog(
                "Unsaved Changes",
                isPresented: $showDiscardConfirmation,
                titleVisibility: .visible
            ) {
                Button("Discard Changes", role: .destructive) {
                    dismiss()
                }
                Button("Keep Editing", role: .cancel) {}
            } message: {
                Text("You have unsaved changes. Are you sure you want to discard them?")
            }
        }
    }
}

// MARK: - 3. Reminders Screen
public struct ReminderRecipientItem: Identifiable, Equatable {
    public let id = UUID()
    public var name: String
    public var channel: String
    
    public init(name: String, channel: String = "Email") {
        self.name = name
        self.channel = channel
    }
}

public struct MaintenanceRemindersScreen: View {
    @Environment(\.dismiss) var dismiss
    @Environment(MaintenancePlanStore.self) var maintenancePlanStore
    public var customer: Customer
    public var plan: MaintenancePlanItem
    
    @State var sendServiceReminders: Bool = true
    @State var recipients: [ReminderRecipientItem] = []
    @State var showAuthorizedPersonsPicker: Bool = false
    
    public init(customer: Customer, plan: MaintenancePlanItem) {
        self.customer = customer
        self.plan = plan
        self._recipients = State(initialValue: [
            ReminderRecipientItem(name: customer.name, channel: "Email")
        ])
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // 1. Reminders Section
                VStack(alignment: .leading, spacing: 6) {
                    Text("REMINDERS")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.leading, 8)
                    
                    VStack(spacing: 0) {
                        Toggle("Send Service Reminders", isOn: $sendServiceReminders)
                            .font(.subheadline)
                            .padding(.vertical, 12)
                            .padding(.horizontal, 20)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                
                // 2. Recipients Section
                VStack(alignment: .leading, spacing: 6) {
                    Text("RECIPIENTS")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.leading, 8)
                    
                    VStack(spacing: 0) {
                        ForEach(Array(recipients.indices), id: \.self) { idx in
                            HStack {
                                Text(recipients[idx].name)
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                                
                                Spacer()
                                
                                Menu {
                                    Button("Email") {
                                        recipients[idx].channel = "Email"
                                    }
                                    Button("Text") {
                                        recipients[idx].channel = "Text"
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(recipients[idx].channel)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption2.weight(.bold))
                                            .foregroundColor(.secondary)
                                    }
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            
                            Divider().padding(.horizontal, 20)
                        }
                        
                        // 'add recipient' text button with green + symbol
                        Button(action: {
                            showAuthorizedPersonsPicker = true
                        }) {
                            HStack(spacing: 12) {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundColor(.green)
                                    .font(.title3)
                                Text("add recipient")
                                    .font(.subheadline)
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
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(plan.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(customer.displayName)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .primaryAction) {
                Button("Save") {
                    var updatedPlan = plan
                    updatedPlan.customerId = customer.id
                    Task {
                        await MaintenancePlanStore.shared.savePlan(updatedPlan)
                        dismiss()
                    }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.primary)
            }
        }
        .sheet(isPresented: $showAuthorizedPersonsPicker) {
            CustomerAuthorizedPersonsSheet(customer: customer) { selectedPerson in
                if !recipients.contains(where: { $0.name == selectedPerson.fullName }) {
                    recipients.append(ReminderRecipientItem(name: selectedPerson.fullName, channel: "Email"))
                }
            }
        }
    }
}

// MARK: - 4. Payments Screen
public struct MaintenancePaymentsScreen: View {
    @Environment(\.dismiss) var dismiss
    @Environment(MaintenancePlanStore.self) var maintenancePlanStore
    public var customer: Customer
    public var plan: MaintenancePlanItem
    
    public init(customer: Customer, plan: MaintenancePlanItem) {
        self.customer = customer
        self.plan = plan
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // 1. Financial Metrics Card (Evenly Distributed Centered Row)
                HStack(alignment: .top, spacing: 0) {
                    VStack(alignment: .center, spacing: 3) {
                        Text("Contract Total")
                            .font(.caption2.weight(.medium))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                        Text(plan.contractTotal)
                            .font(.footnote.weight(.semibold))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    
                    VStack(alignment: .center, spacing: 3) {
                        Text("Annual Price")
                            .font(.caption2.weight(.medium))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                        Text(plan.annualPrice)
                            .font(.footnote.weight(.semibold))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    
                    VStack(alignment: .center, spacing: 3) {
                        Text("Applied")
                            .font(.caption2.weight(.medium))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                        Text("$0.00")
                            .font(.footnote.weight(.semibold))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    
                    VStack(alignment: .center, spacing: 3) {
                        Text("Balance")
                            .font(.caption2.weight(.medium))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                        Text(plan.balance)
                            .font(.footnote.weight(.semibold))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                            .fixedSize(horizontal: true, vertical: false)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 10)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // 2. Payments Section
                VStack(alignment: .leading, spacing: 6) {
                    Text("PAYMENTS")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.leading, 8)
                    
                    VStack(spacing: 0) {
                        Button(action: {}) {
                            HStack {
                                Text("Process Payment")
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.secondary.opacity(0.35))
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 20)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Divider().padding(.horizontal, 20)
                        
                        Button(action: {}) {
                            HStack {
                                Text("Record Payment")
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.secondary.opacity(0.35))
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
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(plan.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(customer.displayName)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .primaryAction) {
                Button("Save") {
                    var updatedPlan = plan
                    updatedPlan.customerId = customer.id
                    Task {
                        await MaintenancePlanStore.shared.savePlan(updatedPlan)
                        dismiss()
                    }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.primary)
            }
        }
    }
}
