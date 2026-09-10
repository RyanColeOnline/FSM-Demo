import SwiftUI

public struct TechProfile: Identifiable, Sendable {
    public var id: String { name }
    public var name: String
    public var avatarUrl: String
    
    public init(name: String, avatarUrl: String) {
        self.name = name
        self.avatarUrl = avatarUrl
    }
}

public struct AppointmentDetailScreen: View {
    @Environment(ScheduleStore.self) var scheduleStore
    @Environment(CustomerStore.self) var customerStore
    @Environment(EquipmentStore.self) var equipmentStore
    @Environment(\.openURL) var openURL
    @Environment(\.dismiss) var dismiss
    
    var appointment: Appointment
    
    // Status tracking conforming to new dropdown options and colors
    public enum JobStatus: String, CaseIterable, Codable {
        case idle = "Idle"
        case enRoute = "En Route"
        case arrived = "Arrived"
        case completed = "Complete"
        
        public var backgroundColor: Color {
            switch self {
            case .idle:
                return Color.red.opacity(0.12)
            case .enRoute:
                return Color.orange.opacity(0.15)
            case .arrived:
                return Color.blue.opacity(0.12)
            case .completed:
                return Color.green.opacity(0.12)
            }
        }
        
        public var textColor: Color {
            switch self {
            case .idle:
                return Color.red
            case .enRoute:
                return Color.orange
            case .arrived:
                return Color.blue
            case .completed:
                return Color.green
            }
        }
        
        public var borderColor: Color {
            switch self {
            case .idle:
                return Color.red.opacity(0.35)
            case .enRoute:
                return Color.orange.opacity(0.35)
            case .arrived:
                return Color.blue.opacity(0.35)
            case .completed:
                return Color.green.opacity(0.35)
            }
        }
    }
    
    struct JobTimerState: Codable {
        var status: String
        var seconds: Int
        var lastActiveTimestamp: Double?
    }
    
    @State var jobStatus: JobStatus = .idle
    @State var jobTimerActive = false
    @State var elapsedSeconds = 0
    @State var lastActiveTimestamp: Double? = nil
    @State var showJobMenu = false
    @State var showNewAppointmentSheet = false
    @State var showEditAppointmentSheet = false
    @State var showFlagForFollowUpSheet = false
    @State var showTechPopover = false
    @State var showCheckmarkAnimation = false
    @State var customerCardPageIndex: Int = 0
    @State var showMessageSheet = false
    @State var loadedCustomer: Customer? = nil
    
    var assignedTechsList: [TechProfile] {
        guard let techString = appointment.assignedTech?.trimmingCharacters(in: .whitespacesAndNewlines), !techString.isEmpty, techString != "Unassigned" else {
            let defaultName = SessionManager.shared.currentUser?.name ?? "Justin Lung"
            let matched = scheduleStore.allUsers.first(where: { $0.name.localizedCaseInsensitiveContains(defaultName) })
            return [TechProfile(name: defaultName, avatarUrl: matched?.avatarUrl ?? "")]
        }
        
        let rawNames = techString.components(separatedBy: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        
        var seen = Set<String>()
        var uniqueNames: [String] = []
        for name in rawNames {
            if !seen.contains(name) {
                seen.insert(name)
                uniqueNames.append(name)
            }
        }
        
        if uniqueNames.isEmpty {
            let defaultName = SessionManager.shared.currentUser?.name ?? "Justin Lung"
            let matched = scheduleStore.allUsers.first(where: { $0.name.localizedCaseInsensitiveContains(defaultName) })
            return [TechProfile(name: defaultName, avatarUrl: matched?.avatarUrl ?? "")]
        }
        
        return uniqueNames.map { name in
            let matchedUser = scheduleStore.allUsers.first(where: {
                $0.name.localizedCaseInsensitiveContains(name) || name.localizedCaseInsensitiveContains($0.name)
            })
            return TechProfile(
                name: name,
                avatarUrl: matchedUser?.avatarUrl ?? ""
            )
        }
    }
    
    public init(appointment: Appointment) {
        self.appointment = appointment
        let key = "job_timer_state_\(appointment.id.uuidString)"
        if let data = UserDefaults.standard.data(forKey: key),
           let savedState = try? JSONDecoder().decode(JobTimerState.self, from: data) {
            let loadedStatus = JobStatus(rawValue: savedState.status) ?? .idle
            var secs = savedState.seconds
            var lastTime = savedState.lastActiveTimestamp
            let isActive = (loadedStatus == .arrived || loadedStatus == .enRoute)
            
            if isActive, let lastTs = lastTime {
                let now = Date().timeIntervalSince1970 * 1000.0
                let deltaSeconds = max(0, Int((now - lastTs) / 1000.0))
                secs += deltaSeconds
                lastTime = now
            }
            
            self._jobStatus = State(initialValue: loadedStatus)
            self._elapsedSeconds = State(initialValue: secs)
            self._lastActiveTimestamp = State(initialValue: lastTime)
            self._jobTimerActive = State(initialValue: isActive)
        } else {
            self._jobStatus = State(initialValue: .idle)
            self._elapsedSeconds = State(initialValue: 0)
            self._lastActiveTimestamp = State(initialValue: nil)
            self._jobTimerActive = State(initialValue: false)
        }
        let cached = CustomerStore.shared.customers.first(where: { $0.id == appointment.customerId || ($0.name == appointment.customerName && appointment.customerName != nil) })
        self._loadedCustomer = State(initialValue: cached)
    }
    
    public var body: some View {
        let matchedCustomer = loadedCustomer
            ?? customerStore.customers.first(where: { $0.id == appointment.customerId || ($0.name == appointment.customerName && appointment.customerName != nil) })
        
        let currentCustomer = matchedCustomer ?? Customer(
            id: appointment.customerId,
            name: appointment.customerName ?? "Customer",
            email: appointment.customerEmail ?? "",
            phone: appointment.customerPhone ?? "",
            address: Address(
                street: appointment.locationAddress ?? "",
                city: "",
                state: "",
                zipCode: "",
                type: .residential
            ),
            authorizedPersons: []
        )
        
        ScrollView {
            VStack(spacing: 12) {
                // 1. Job Timer Card
                timerCardView
                
                // 2. Customer Info Card & 3. Job Details Card
                customerCardView(customer: currentCustomer)
                jobDetailsCardView(customer: currentCustomer)
                
                // 4. Custom Grouped Card Table for Action Menu Links
                VStack(spacing: 0) {
                    NavigationLink(destination: CustomerSubScreen(title: "Attachments", customer: currentCustomer, appointment: appointment)) {
                        customMenuRow(icon: "paperclip", title: "Attachments")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 12)
                    
                    NavigationLink(destination: CustomerSubScreen(title: "Checklists", customer: currentCustomer, appointment: appointment)) {
                        customMenuRow(icon: "list.bullet.clipboard", title: "Checklists")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 12)
                    
                    NavigationLink(destination: CustomerSubScreen(title: "Equipment", customer: currentCustomer, appointment: appointment)) {
                        customMenuRow(icon: "wrench.adjustable", title: "Equipment")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 12)
                    
                    NavigationLink(destination: CustomerSubScreen(title: "Invoices", customer: currentCustomer, appointment: appointment)) {
                        customMenuRow(icon: "doc.text", title: "Invoices")
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Divider().padding(.horizontal, 12)
                    
                    NavigationLink(destination: CustomerSubScreen(title: "Proposals", customer: currentCustomer, appointment: appointment)) {
                        customMenuRow(icon: "briefcase", title: "Proposals")
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                .padding(.top, 9)
                .padding(.horizontal)
                .padding(.bottom)
            }
            .refreshable {
                try? await Task.sleep(nanoseconds: 500_000_000)
                await scheduleStore.fetchAppointments()
                await customerStore.fetchCustomers()
                await equipmentStore.fetchEquipment(for: currentCustomer)
            }
            .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Appointment")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(appointment.formattedAppointmentNumber)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            #if os(iOS)
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(destination: CustomerSubScreen(title: "Notes", customer: currentCustomer, appointment: appointment, autoFocusAddNote: true)) {
                        Label("Add Note", systemImage: "bubble.left")
                    }
                    NavigationLink(destination: CreateInvoiceScreen(customer: currentCustomer, appointment: appointment, isNew: true)) {
                        Label("Create Invoice", systemImage: "doc.text")
                    }
                    NavigationLink(destination: CreateInvoiceScreen(customer: currentCustomer, appointment: appointment, isProposalMode: true, isNew: true)) {
                        Label("Create Proposal", systemImage: "briefcase")
                    }
                    Button(action: {
                        showEditAppointmentSheet = true
                    }) {
                        Label("Edit Appointment", systemImage: "pencil")
                    }
                    Button(action: {
                        showFlagForFollowUpSheet = true
                    }) {
                        Label("Flag for Follow-Up", systemImage: "exclamationmark.triangle")
                    }
                    Button(action: {
                        showNewAppointmentSheet = true
                    }) {
                        Label("New Appointment", systemImage: "calendar.badge.plus")
                    }
                    Button(action: {}) {
                        Label("Process Payment", systemImage: "creditcard")
                    }
                    Button(action: {}) {
                        Label("Record Payment", systemImage: "checkmark")
                    }
                    NavigationLink(destination: CustomerSubScreen(title: "Attachments", customer: currentCustomer, appointment: appointment, autoTriggerPhotoPicker: true)) {
                        Label("Upload Photo", systemImage: "photo")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.callout)
                }
            }
            #else
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button("New Appointment") { showNewAppointmentSheet = true }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.callout)
                }
            }
            #endif
        }
        .sheet(isPresented: $showNewAppointmentSheet) {
            NavigationStack {
                AppointmentAddScreen(customer: currentCustomer, initialJobNumber: "#\(appointment.jobNumber)", sourceAppointment: appointment)
                    .toolbar {
                        #if os(iOS)
                        ToolbarItem(placement: .topBarLeading) {
                            Button(action: { showNewAppointmentSheet = false }) {
                                Image(systemName: "xmark")
                                    .font(.callout.weight(.semibold))
                            }
                        }
                        #else
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showNewAppointmentSheet = false }
                        }
                        #endif
                    }
            }
        }
        .sheet(isPresented: $showEditAppointmentSheet) {
            NavigationStack {
                AppointmentAddScreen(customer: currentCustomer, initialJobNumber: "#\(appointment.jobNumber)", sourceAppointment: appointment, isEditing: true)
                    .toolbar {
                        #if os(iOS)
                        ToolbarItem(placement: .topBarLeading) {
                            Button(action: { showEditAppointmentSheet = false }) {
                                Image(systemName: "xmark")
                                    .font(.callout.weight(.semibold))
                            }
                        }
                        #else
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Cancel") { showEditAppointmentSheet = false }
                        }
                        #endif
                    }
            }
        }
        .sheet(isPresented: $showFlagForFollowUpSheet) {
            NavigationStack {
                NewFollowUpScreen(appointment: appointment)
            }
        }
        .task {
            let mode = DatabaseMode.current
            if loadedCustomer == nil {
                if let cust = await FirestoreClient.shared.fetchCustomer(id: appointment.customerId, rawId: appointment.customerName, customerName: appointment.customerName, mode: mode) {
                    await MainActor.run {
                        self.loadedCustomer = cust
                    }
                }
            }
            
            await InvoiceStore.shared.fetchInvoices(for: appointment)
            await ProposalStore.shared.fetchProposals(for: appointment)
            await EquipmentStore.shared.fetchEquipment(customerId: appointment.customerId, customerName: appointment.customerName)
            await ChecklistStore.shared.fetchChecklists(jobId: appointment.id)
            await AttachmentStore.shared.fetchAttachments(customerId: appointment.customerId)
            
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                if jobTimerActive {
                    elapsedSeconds += 1
                    saveCurrentState()
                }
            }
        }
    }
    
    private func handleStatusChange(_ newStatus: JobStatus) {
        jobStatus = newStatus
        jobTimerActive = (newStatus == .enRoute || newStatus == .arrived)
        
        let now = Date().timeIntervalSince1970 * 1000.0
        let timestamp: Double? = (newStatus == .enRoute || newStatus == .arrived) ? now : nil
        lastActiveTimestamp = timestamp
        
        let updatedSeconds = elapsedSeconds
        let state = JobTimerState(
            status: newStatus.rawValue,
            seconds: updatedSeconds,
            lastActiveTimestamp: timestamp
        )
        
        let key = "job_timer_state_\(appointment.id.uuidString)"
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: key)
        }
        
        let mappedStatus: AppointmentStatus
        switch newStatus {
        case .idle: 
            mappedStatus = .assigned
        case .enRoute: 
            mappedStatus = .enRoute
        case .arrived: 
            mappedStatus = .inProgress
            if appointment.arrivedAt == nil {
                appointment.arrivedAt = Date()
            }
        case .completed: 
            mappedStatus = .completed
            if appointment.completedAt == nil {
                appointment.completedAt = Date()
            }
        }
        appointment.status = mappedStatus
        Task {
            await scheduleStore.updateAppointment(appointment)
        }
    }
    
    private func saveCurrentState() {
        let now = Date().timeIntervalSince1970 * 1000.0
        let timestamp: Double? = (jobStatus == .enRoute || jobStatus == .arrived) ? (lastActiveTimestamp ?? now) : nil
        let state = JobTimerState(
            status: jobStatus.rawValue,
            seconds: elapsedSeconds,
            lastActiveTimestamp: timestamp
        )
        let key = "job_timer_state_\(appointment.id.uuidString)"
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
    
    private var timeRangeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mma"
        return "\(formatter.string(from: appointment.startDate)) - \(formatter.string(from: appointment.endDate))"
    }
    
    private var statusColor: Color {
        jobStatus.textColor
    }
    
    private var timerString: String {
        let hours = elapsedSeconds / 3600
        let minutes = (elapsedSeconds % 3600) / 60
        let seconds = elapsedSeconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
    
    private var techPopoverView: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(assignedTechsList) { tech in
                techPopoverRow(tech)
            }
        }
        .padding(16)
        #if os(iOS)
        .presentationCompactAdaptation(.popover)
        #endif
    }
    
    private var techAvatarStackView: some View {
        Button(action: { showTechPopover = true }) {
            HStack(spacing: -14) {
                ForEach(assignedTechsList) { tech in
                    techAvatarItem(tech)
                }
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    @ViewBuilder
    private func techAvatarItem(_ tech: TechProfile) -> some View {
        if !tech.avatarUrl.isEmpty && tech.avatarUrl.starts(with: "http") && !tech.avatarUrl.contains("unsplash.com") {
            AsyncImage(url: URL(string: tech.avatarUrl)) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                techInitialsBadge(name: tech.name, size: 44)
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())
            .overlay(Circle().stroke(Color.murphysCardBackground, lineWidth: 2))
        } else {
            techInitialsBadge(name: tech.name, size: 44)
                .overlay(Circle().stroke(Color.murphysCardBackground, lineWidth: 2))
        }
    }

    @ViewBuilder
    private func techPopoverRow(_ tech: TechProfile) -> some View {
        HStack(spacing: 12) {
            if !tech.avatarUrl.isEmpty && tech.avatarUrl.starts(with: "http") && !tech.avatarUrl.contains("unsplash.com") {
                AsyncImage(url: URL(string: tech.avatarUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    techInitialsBadge(name: tech.name, size: 36)
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
            } else {
                techInitialsBadge(name: tech.name, size: 36)
            }
            
            Text(tech.name)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.primary)
        }
    }
    
    private func techInitialsBadge(name: String, size: CGFloat) -> some View {
        let parts = name.split(separator: " ").filter { !$0.isEmpty }
        let initials: String = {
            if parts.count >= 2 {
                let first = parts[0].prefix(1)
                let last = parts[parts.count - 1].prefix(1)
                return "\(first)\(last)".uppercased()
            } else if let single = parts.first {
                return String(single.prefix(2)).uppercased()
            }
            return "T"
        }()
        
        return ZStack {
            Circle()
                .fill(Color(red: 10/255.0, green: 25/255.0, blue: 55/255.0))
                .frame(width: size, height: size)
            Text(initials)
                .font(.system(size: size * 0.4, weight: .bold))
                .foregroundColor(.white)
        }
    }
    
    @ViewBuilder
    private var timerCardView: some View {
        ZStack {
            Text(timerString)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.secondary)
            
            HStack {
                #if os(iOS)
                techAvatarStackView
                    .popover(isPresented: $showTechPopover) {
                        techPopoverView
                    }
                #else
                techAvatarStackView
                    .sheet(isPresented: $showTechPopover) {
                        techPopoverView
                    }
                #endif
                
                Spacer()
                
                Menu {
                    Button(action: {
                        handleStatusChange(.idle)
                    }) {
                        Label {
                            Text("Idle")
                        } icon: {
                            Image(systemName: "clock")
                                .foregroundColor(.red)
                        }
                    }
                    
                    Button(action: {
                        handleStatusChange(.enRoute)
                    }) {
                        Label {
                            Text("En Route")
                        } icon: {
                            Image(systemName: "car.fill")
                                .foregroundColor(.orange)
                        }
                    }
                    
                    Button(action: {
                        handleStatusChange(.arrived)
                    }) {
                        Label {
                            Text("Arrived")
                        } icon: {
                            Image(systemName: "mappin.and.ellipse")
                                .foregroundColor(.blue)
                        }
                    }
                    
                    Button(action: {
                        handleStatusChange(.completed)
                    }) {
                        Label {
                            Text("Complete")
                        } icon: {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                } label: {
                    Text(jobStatus.rawValue)
                        .font(.caption.weight(.semibold))
                        .lineLimit(1)
                        .multilineTextAlignment(.center)
                        .foregroundColor(jobStatus.textColor)
                        .frame(width: 76, height: 26)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(jobStatus.backgroundColor)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(jobStatus.borderColor, lineWidth: 1)
                        )
                        .id(jobStatus)
                        .animation(nil, value: jobStatus)
                        #if os(iOS)
                        .contentTransition(.identity)
                        #endif
                }
                .buttonStyle(.plain)
                #if os(iOS)
                .transaction { $0.animation = nil }
                #endif
            }
        }
        .padding(16)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    @ViewBuilder
    private func customerCardView(customer: Customer) -> some View {
        TabView(selection: $customerCardPageIndex) {
            // Page 1: Customer Details & Contact Actions
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(alignment: .center, spacing: 8) {
                            NavigationLink(destination: CustomerProfileScreen(customer: customer)) {
                                Text(customer.displayName)
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                    .multilineTextAlignment(.leading)
                            }
                            
                            let designation = appointment.jobTypeBadge
                            Text(designation)
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.primary.opacity(0.06))
                                .cornerRadius(4)
                        }
                        
                        if let contact = appointment.resolveAuthorizedContact(customer: customer) {
                            HStack(spacing: 4) {
                                Image(systemName: "person.badge.shield.checkmark.fill")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Text(contact)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                            .padding(.top, 1)
                        }
                    }
                    .padding(.bottom, 3.5)
                    
                    Spacer()
                    
                    Text(appointment.timeRangeFormatted)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.top, 2)
                }
                
                let (displayStreet, displayCityStateZip): (String, String) = {
                    if let loc = appointment.locationAddress?.trimmingCharacters(in: .whitespacesAndNewlines), !loc.isEmpty {
                        let parts = loc.components(separatedBy: ",")
                        if parts.count >= 2 {
                            let streetPart = parts[0].trimmingCharacters(in: .whitespaces)
                            let rest = parts.dropFirst().joined(separator: ",").trimmingCharacters(in: .whitespaces)
                            return (streetPart, rest)
                        }
                        return (loc, "")
                    }
                    let cityStateZip = (customer.address.city.isEmpty && customer.address.state.isEmpty) ? "" : "\(customer.address.city), \(customer.address.state) \(customer.address.zipCode)".trimmingCharacters(in: .whitespaces)
                    return (customer.address.street, cityStateZip)
                }()
                
                HStack(alignment: .bottom) {
                    TwoLineAddressDisplay(
                        street: displayStreet,
                        cityStateZip: displayCityStateZip,
                        font: .subheadline.weight(.regular),
                        foregroundColor: .secondary,
                        alignment: .leading
                    )
                    
                    Spacer()
                    
                    HStack(spacing: 28) {
                        Button(action: {
                            if let url = URL(string: "tel:\(customer.phone)") {
                                openURL(url)
                            }
                        }) {
                            Image(systemName: "phone")
                                .font(.title3)
                                .foregroundColor(.indigo)
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Button(action: {
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
                        }) {
                            Image(systemName: "bubble.left")
                                .font(.title3)
                                .foregroundColor(.indigo)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .sheet(isPresented: $showMessageSheet) {
                            MessageComposeView(recipient: customer.phone)
                                .ignoresSafeArea()
                        }
                        
                        Button(action: {
                            let targetAddress = appointment.locationAddress ?? "\(customer.address.street), \(customer.address.city), \(customer.address.state) \(customer.address.zipCode)"
                            let urlString = "https://maps.apple.com/?daddr=\(targetAddress)"
                            if let url = URL(string: urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "") {
                                openURL(url)
                            }
                        }) {
                            Image(systemName: "arrow.triangle.turn.up.right.diamond")
                                .font(.title3)
                                .foregroundColor(.indigo)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 16)
            .tag(0)
            
            // Page 2: Access Information (Max 4 items, 2x2 grid, formatted using .subheadline)
            VStack(alignment: .leading, spacing: 10) {
                Text("Access Information")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                let codesToShow = appointment.accessCodes.filter { !$0.code.isEmpty }.prefix(4)
                if codesToShow.isEmpty {
                    Text("No access codes provided.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } else {
                    LazyVGrid(columns: [GridItem(.flexible(), alignment: .leading), GridItem(.flexible(), alignment: .leading)], spacing: 6) {
                        ForEach(Array(codesToShow.enumerated()), id: \.offset) { _, item in
                            HStack(spacing: 4) {
                                Text("\(item.label):")
                                    .font(.subheadline.weight(.regular))
                                    .foregroundColor(.secondary)
                                Text(item.code.isEmpty ? "N/A" : item.code)
                                    .font(.subheadline.weight(.regular))
                                    .foregroundColor(.primary)
                            }
                            .lineLimit(1)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 16)
            .tag(1)
        }
        .frame(height: (appointment.resolveAuthorizedContact(customer: customer) != nil || customer.primaryAuthorizedPerson != nil) ? 120 : 102)
        #if os(iOS)
        .tabViewStyle(.page(indexDisplayMode: .never))
        #endif
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    @ViewBuilder
    private func jobDetailsCardView(customer: Customer) -> some View {
        let techName: String = appointment.assignedTech ?? "Justin Lung"
        let serviceNoteText: String? = appointment.serviceNotes
        
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                NavigationLink(destination: CustomerSubScreen(title: "Job History", customer: customer, appointment: appointment)) {
                    HStack(spacing: 4) {
                        if appointment.isFlaggedForFollowUp {
                            Image(systemName: "flag.fill")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.red)
                        }
                        Text(appointment.formattedJobNumber)
                            .fontWeight(.bold)
                        Text(" - \(appointment.jobType)")
                            .fontWeight(.regular)
                    }
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                }
                .buttonStyle(PlainButtonStyle())
                
                Spacer()
            }
            
            if let note = serviceNoteText, !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                Divider()
                
                NavigationLink(destination: CustomerSubScreen(title: "Notes", customer: customer, appointment: appointment)) {
                    HStack(alignment: .center) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(techName)
                                .font(.footnote.weight(.bold))
                                .foregroundColor(.secondary)
                            
                            Text(note)
                                .font(.subheadline)
                                .foregroundColor(.primary)
                                .multilineTextAlignment(.leading)
                        }
                        
                        Spacer()
                        
                        Image(systemName: "chevron.right")
                            .font(.footnote.weight(.semibold))
                            .foregroundColor(.secondary.opacity(0.4))
                    }
                    #if os(iOS)
                    .contentShape(Rectangle())
                    #endif
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(16)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    private func customMenuRow(icon: String, title: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.callout)
                .foregroundStyle(.indigo)
                .frame(width: 24, alignment: .center)
            
            Text(title)
                .font(.callout)
                .foregroundColor(.primary)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary.opacity(0.4))
        }
        .padding(.vertical, 14)
        .padding(.leading, 12)
        .padding(.trailing, 16)
        #if os(iOS)
        .contentShape(Rectangle())
        #endif
    }
}

struct RowLinkView: View {
    var icon: String
    var title: String
    var count: Int
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(.indigo)
                .frame(width: 24, alignment: .center)
            
            Text(title)
                .font(.body)
                .foregroundColor(.primary)
                .padding(.leading, 8)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .padding(.leading, 4)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        #if os(iOS)
        .contentShape(Rectangle())
        #endif
    }
}


