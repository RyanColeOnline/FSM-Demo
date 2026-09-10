import SwiftUI

public struct AdditionalTechRow: Identifiable, Equatable, Sendable {
    public let id: UUID
    public var name: String
    
    public init(id: UUID = UUID(), name: String = "Select") {
        self.id = id
        self.name = name
    }
}

public enum AppointmentMode: String, CaseIterable, Sendable {
    case scheduleNow = "Schedule Now"
    case createServiceRequest = "Create Service Request"
}

public struct AppointmentAddScreen: View {
    @Environment(ScheduleStore.self) var scheduleStore
    @Environment(CustomerStore.self) var customerStore
    @Environment(\.dismiss) var dismiss
    @Environment(\.openURL) var openURL
    var sessionManager = SessionManager.shared
    
    var isEditing: Bool = false
    var sourceAppointment: Appointment? = nil
    
    @State var appointmentStatus: String = "Assigned"
    @State var appointmentConfirmation: String = "Confirmed"
    
    let appointmentStatusOptions = ["Unassigned", "Assigned", "Dispatched", "En route", "In progress", "Completed", "Cancelled", "On hold"]
    let appointmentConfirmationOptions = ["Unconfirmed", "Confirmed", "Left Message", "Needs Follow Up", "Rescheduled"]
    
    var customer: Customer
    
    @State var appointmentMode: AppointmentMode = .scheduleNow
    @State var activeJobSelection: String? = nil
    
    @State var selectedLocation: Address = Address(street: "", city: "", state: "", zipCode: "")
    @State var selectedContact: String = ""
    @State var accessCodes: [AccessCode] = []
    
    @State var selectedJob = "New"
    @State var selectedJobType = "Select"
    @State var selectedTripType = ""
    @State var jobType = "Select"
    @State var selectedDesignation = ""
    @State var leadSource = "Select"
    @State var notes = ""
    @State var dateTime: Date? = Date()
    @State var duration = "Select"
    @State var frequency = "One time"
    @State var showDurationPopover = false
    @State var primaryTech = "Select"
    @State var additionalTechs: [AdditionalTechRow] = []
    
    @State var showAddLocationSheet = false
    @State var showLocationsLargeModal = false
    @State var showAddContactSheet = false
    @State var showMessageSheet = false
    @State var showCancelUnscheduleSheet = false
    
    @FocusState var isNotesFocused: Bool
    
    var jobTypeCategories: [JobTypeCategory] {
        let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
        return JobTypeRegistry.shared.categories(for: group)
    }
    
    func cleanCategoryName(_ raw: String) -> String {
        if raw.contains("Residential") { return "Residential" }
        if raw.contains("Commercial") { return "Commercial" }
        if raw.contains("Home Warranty") { return "Home Warranty" }
        if raw.contains("Resort") || raw.contains("RES") { return "Res" }
        if raw.contains("COD") { return "COD" }
        return raw.components(separatedBy: "(").first?.trimmingCharacters(in: .whitespaces) ?? raw
    }
    
    var jobTypeDisplayString: String {
        if selectedJobType != "Select" && !selectedJobType.isEmpty {
            if !selectedTripType.isEmpty {
                return "\(selectedJobType) - \(selectedTripType)"
            }
            return selectedJobType
        }
        return jobType
    }
    
    var jobTypes: [String] {
        let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
        return JobTypeRegistry.shared.flatNames(for: group)
    }
    
    var techs: [String] {
        let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
        var list = group.technicians
        if !list.contains("Unassigned") {
            list.append("Unassigned")
        }
        return list
    }
    let leadSources = ["Google", "Referral", "Website", "Yelp"]
    let frequencies = ["One time", "Daily", "Weekly", "Bi-weekly", "Monthly", "Yearly"]
    
    let activeJobsList = [
        "New",
        "#140010 - Diagnostic",
        "#139880 - Parts",
        "#138520 - Installation",
        "#137110 - Maintenance",
        "#135440 - Sealed System"
    ]
    
    let durations: [String] = {
        var list: [String] = []
        for val in stride(from: 0.25, through: 6.0, by: 0.25) {
            if val == 1.0 {
                list.append("1.00 Hour")
            } else {
                list.append(String(format: "%.2f Hours", val))
            }
        }
        return list
    }()
    
    public init(customer: Customer, initialJobNumber: String? = nil, sourceAppointment: Appointment? = nil, isEditing: Bool = false) {
        self.customer = customer
        self.isEditing = isEditing
        self.sourceAppointment = sourceAppointment
        
        var initLocation = customer.address
        if let apptLoc = sourceAppointment?.locationAddress, !apptLoc.isEmpty {
            if let matched = customer.locations.first(where: { apptLoc.localizedCaseInsensitiveContains($0.street) || $0.street.localizedCaseInsensitiveContains(apptLoc) }) {
                initLocation = matched
            } else {
                initLocation = Address(street: apptLoc, city: "", state: "", zipCode: "")
            }
        }
        self._selectedLocation = State(initialValue: initLocation)
        self._selectedContact = State(initialValue: sourceAppointment?.contactName ?? customer.name)
        self._accessCodes = State(initialValue: sourceAppointment?.accessCodes ?? [])
        let initialJobType = sourceAppointment?.jobType ?? "Select"
        self._jobType = State(initialValue: initialJobType)
        if initialJobType.contains(" - ") {
            let parts = initialJobType.components(separatedBy: " - ")
            self._selectedJobType = State(initialValue: parts[0])
            self._selectedTripType = State(initialValue: parts.dropFirst().joined(separator: " - "))
        } else if initialJobType != "Select" {
            self._selectedJobType = State(initialValue: initialJobType)
            self._selectedTripType = State(initialValue: "")
        } else {
            self._selectedJobType = State(initialValue: "Select")
            self._selectedTripType = State(initialValue: "")
        }
        self._leadSource = State(initialValue: "Google")
        let defaultTech = sourceAppointment?.assignedTech ?? SessionManager.shared.currentUser?.name ?? "Justin Lung"
        self._primaryTech = State(initialValue: defaultTech)
        self._additionalTechs = State(initialValue: [])
        self._appointmentStatus = State(initialValue: sourceAppointment?.status.rawValue ?? "Assigned")
        self._appointmentConfirmation = State(initialValue: "Confirmed")
        
        if isEditing, let appt = sourceAppointment {
            self._notes = State(initialValue: appt.serviceNotes ?? "")
            self._dateTime = State(initialValue: appt.dateTime)
            self._duration = State(initialValue: "1.00 Hour")
        } else {
            self._notes = State(initialValue: "")
            let now = Date()
            let cal = Calendar.current
            let min = cal.component(.minute, from: now)
            let roundedMin = (min / 15) * 15
            let roundedDate = cal.date(bySetting: .minute, value: roundedMin, of: now) ?? now
            self._dateTime = State(initialValue: roundedDate)
            self._duration = State(initialValue: "Select")
        }
        
        let jobNumToUse = initialJobNumber ?? (sourceAppointment != nil ? "#\(sourceAppointment!.jobNumber)" : nil)
        if let initialJob = jobNumToUse, !initialJob.isEmpty {
            let cleaned = initialJob.trimmingCharacters(in: .whitespacesAndNewlines)
            let knownJobs = [
                "#140010 - Diagnostic",
                "#139880 - Parts",
                "#138520 - Installation",
                "#137110 - Maintenance",
                "#135440 - Sealed System"
            ]
            let jobNumOnly = cleaned.components(separatedBy: " - ").first ?? cleaned
            let formattedJobNum = jobNumOnly.hasPrefix("#") ? jobNumOnly : "#\(jobNumOnly)"
            let match = knownJobs.first(where: { $0.contains(jobNumOnly) || $0.contains(formattedJobNum) }) ?? "\(formattedJobNum) - Diagnostic"
            self._selectedJob = State(initialValue: match)
            self._activeJobSelection = State(initialValue: match)
        }
    }
    
    var isFormValid: Bool {
        if appointmentMode == .scheduleNow {
            return jobType != "Select" &&
            selectedContact != "Select" && !selectedContact.isEmpty &&
            duration != "Select" &&
            primaryTech != "Select" &&
            dateTime != nil
        } else {
            return jobType != "Select" &&
            selectedContact != "Select" && !selectedContact.isEmpty
        }
    }
    
    private var accessSummary: String {
        let valid = accessCodes.filter { !$0.code.isEmpty }
        if valid.isEmpty {
            return "None"
        } else if valid.count == 1, let first = valid.first {
            return "\(first.label): \(first.code)"
        } else {
            return "\(valid.count) Access Codes"
        }
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                // 1. Contact Card at the top
                contactCard
                
                // 1.5 Status & Confirmation Grouped Card (only when editing appointment)
                if isEditing {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("STATUS & CONFIRMATION")
                            .font(.footnote.weight(.bold))
                            .foregroundColor(.secondary)
                            .textCase(.uppercase)
                            .padding(.horizontal, 4)
                        
                        VStack(spacing: 0) {
                            HStack {
                                Text("Appointment Status")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                                Menu {
                                    ForEach(appointmentStatusOptions, id: \.self) { status in
                                        Button {
                                            appointmentStatus = status
                                        } label: {
                                            HStack {
                                                Text(status)
                                                if appointmentStatus == status {
                                                    Image(systemName: "checkmark")
                                                }
                                            }
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(appointmentStatus)
                                            .font(.callout)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption.weight(.bold))
                                            .foregroundColor(.secondary.opacity(0.8))
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(14)
                            
                            Divider().padding(.horizontal, 14)
                            
                            HStack {
                                Text("Appointment Confirmation")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                                Menu {
                                    ForEach(appointmentConfirmationOptions, id: \.self) { confirm in
                                        Button {
                                            appointmentConfirmation = confirm
                                        } label: {
                                            HStack {
                                                Text(confirm)
                                                if appointmentConfirmation == confirm {
                                                    Image(systemName: "checkmark")
                                                }
                                            }
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(appointmentConfirmation)
                                            .font(.callout)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption.weight(.bold))
                                            .foregroundColor(.secondary.opacity(0.8))
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(14)
                        }
                        .background(Color.murphysCardBackground)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    }
                }
                
                // 2. Two-Option Segmented Slider (Schedule Now vs Create Service Request)
                Picker("Appointment Mode", selection: $appointmentMode) {
                    ForEach(AppointmentMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 4)
                
                // 3. Main Form
                newJobForm
                
                // 4. Red 'Cancel/Unschedule' Action Button at Bottom (ONLY visible on Edit Appointment page)
                if isEditing {
                    Button {
                        showCancelUnscheduleSheet = true
                    } label: {
                        Text("Cancel/Unschedule")
                            .font(.headline.weight(.semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red)
                            .cornerRadius(14)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 8)
                }
            }
            .padding([.horizontal, .bottom])
            .padding(.top, 4)
        }
        #if true
        .scrollDismissesKeyboard(.interactively)
        #endif
        .onTapGesture {
            #if canImport(UIKit)
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            #endif
        }
        .background(Color.murphysGroupedBackground)
        .transition(.opacity.combined(with: .move(edge: .trailing)))
        .navigationTitle(isEditing ? "" : "Add Appointment")
        .onAppear {
            if selectedContact.isEmpty {
                selectedContact = customer.name
            }
            if selectedLocation.street.isEmpty {
                selectedLocation = customer.address
            }
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            if isEditing {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("Edit Appointment")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text(sourceAppointment?.formattedJobNumber ?? selectedJob)
                            .font(.caption.weight(.medium))
                            .foregroundColor(.secondary)
                    }
                }
            }
            #if os(iOS)
            ToolbarItem(placement: .topBarTrailing) {
                Button("Save") {
                    saveAppointment()
                }
                .font(.subheadline.weight(.medium))
                .disabled(!isFormValid)
            }
            #else
            ToolbarItem(placement: .confirmationAction) {
                Button("Save", action: saveAppointment)
                    .disabled(!isFormValid)
            }
            #endif
        }
        .sheet(isPresented: $showAddLocationSheet) {
            AddLocationSheet { newLoc in
                customer.locations.append(newLoc)
                customerStore.updateCustomerLocally(customer)
                selectedLocation = newLoc
            }
        }
        .sheet(isPresented: $showAddContactSheet) {
            AddAuthorizedPersonSheet(customer: customer) { newPerson in
                customer.authorizedPersons.append(newPerson)
                let name = newPerson.fullName
                if !customer.contacts.contains(name) {
                    customer.contacts.append(name)
                }
                customerStore.updateCustomerLocally(customer)
                selectedContact = name
            }
        }
        .sheet(isPresented: $showCancelUnscheduleSheet) {
            NavigationStack {
                UnscheduleCancelDeleteScreen(appointment: sourceAppointment, onComplete: {
                    showCancelUnscheduleSheet = false
                    dismiss()
                })
            }
        }
    }
    
    // MARK: - Modular Helper Subviews
    
    private var contactCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center) {
                Text(customer.displayName)
                    .font(.title3.weight(.semibold))
                    .foregroundColor(.primary)
                
                Spacer()
                
                HStack(spacing: 20) {
                    Button(action: {
                        if let url = URL(string: "tel:\(customer.phone)") {
                            openURL(url)
                        }
                    }) {
                        Image(systemName: "phone.fill")
                            .font(.title3)
                            .foregroundColor(.green)
                    }
                    .buttonStyle(.plain)
                    
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
                        Image(systemName: "message.fill")
                            .font(.title3)
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(.plain)
                    .sheet(isPresented: $showMessageSheet) {
                        MessageComposeView(recipient: customer.phone)
                            .ignoresSafeArea()
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    private var newJobForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Job Details")
                    .font(.footnote)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)
                    .padding(.horizontal, 4)
                
                VStack(spacing: 0) {
                    // Location row
                    if customer.locations.count >= 25 {
                        Button(action: {
                            showLocationsLargeModal = true
                        }) {
                            HStack(alignment: .center) {
                                Text("Location")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                                TwoLineAddressDisplay(
                                    street: selectedLocation.street,
                                    cityStateZip: "\(selectedLocation.city), \(selectedLocation.state) \(selectedLocation.zipCode)",
                                    font: .callout,
                                    foregroundColor: .secondary,
                                    alignment: .trailing
                                )
                                .frame(maxWidth: 220, alignment: .trailing)
                                
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.8))
                                    .padding(.leading, 4)
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 20)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .sheet(isPresented: $showLocationsLargeModal) {
                            LocationSelectionModal(
                                customerName: customer.name,
                                locations: customer.locations,
                                selectedAddressString: "\(selectedLocation.street), \(selectedLocation.city), \(selectedLocation.state) \(selectedLocation.zipCode)",
                                onSelect: { loc in
                                    selectedLocation = loc
                                }
                            )
                        }
                    } else {
                        Menu {
                            ForEach(customer.locations, id: \.street) { loc in
                                Button(action: { selectedLocation = loc }) {
                                    let fullAddress = "\(loc.street), \(loc.city), \(loc.state) \(loc.zipCode)"
                                    if selectedLocation == loc {
                                        Label(fullAddress, systemImage: "checkmark")
                                    } else {
                                        Text(fullAddress)
                                    }
                                }
                            }
                            
                            Button(action: { showAddLocationSheet = true }) {
                                Label("Add New Location...", systemImage: "plus")
                             }
                        } label: {
                            HStack(alignment: .center) {
                                Text("Location")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                                TwoLineAddressDisplay(
                                    street: selectedLocation.street,
                                    cityStateZip: "\(selectedLocation.city), \(selectedLocation.state) \(selectedLocation.zipCode)",
                                    font: .callout,
                                    foregroundColor: .secondary,
                                    alignment: .trailing
                                )
                                .frame(maxWidth: 220, alignment: .trailing)
                                
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.8))
                                    .padding(.leading, 4)
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 20)
                        }
                        .buttonStyle(.plain)
                    }
                    
                    Divider().padding(.horizontal, 20)
                    
                    // Access row
                    NavigationLink(destination: AppointmentAccessScreen(accessCodes: $accessCodes)) {
                        HStack {
                            Text("Access")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            Text(accessSummary)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.right")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                                .padding(.leading, 4)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                    }
                    .buttonStyle(.plain)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // Primary Contact row
                    Menu {
                        Button(action: { selectedContact = customer.name }) {
                            if selectedContact == customer.name {
                                Label(customer.name, systemImage: "checkmark")
                            } else {
                                Text(customer.name)
                            }
                        }
                        
                        let authPersons = customer.authorizedPersons
                        let nonCustomerContacts = customer.contacts.filter { $0 != customer.name }
                        
                        if !authPersons.isEmpty {
                            Section(header: Text("Authorized Persons")) {
                                ForEach(authPersons) { person in
                                    let personName = person.fullName
                                    Button(action: { selectedContact = personName }) {
                                        if selectedContact == personName {
                                            Label(personName, systemImage: "checkmark")
                                        } else {
                                            Text(personName)
                                        }
                                    }
                                }
                            }
                        } else if !nonCustomerContacts.isEmpty {
                            Section(header: Text("Authorized Persons")) {
                                ForEach(nonCustomerContacts, id: \.self) { contact in
                                    Button(action: { selectedContact = contact }) {
                                        if selectedContact == contact {
                                            Label(contact, systemImage: "checkmark")
                                        } else {
                                            Text(contact)
                                        }
                                    }
                                }
                            }
                        }
                        
                        Divider()
                        
                        Button(action: { showAddContactSheet = true }) {
                            Label("Add Authorized Persons", systemImage: "plus")
                        }
                    } label: {
                        HStack {
                            Text("Primary Contact")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            Text(selectedContact)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                                .padding(.leading, 4)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                    }
                    .buttonStyle(.plain)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // Job selector (popup showing active jobs for customer, default "New")
                    Menu {
                        ForEach(activeJobsList, id: \.self) { jobStr in
                            Button(action: {
                                selectedJob = jobStr
                                if jobStr != "New" {
                                    let components = jobStr.components(separatedBy: " - ")
                                    if components.count > 1 {
                                        jobType = components[1]
                                    }
                                }
                            }) {
                                if selectedJob == jobStr {
                                    Label(jobStr, systemImage: "checkmark")
                                } else {
                                    Text(jobStr)
                                }
                            }
                        }
                    } label: {
                        HStack {
                            Text("Job")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            Text(selectedJob)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                                .padding(.leading, 4)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                    }
                    .buttonStyle(.plain)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // Job Type selector (Hierarchical Designation > Description Submenus)
                    Menu {
                        ForEach(jobTypeCategories) { category in
                            Menu(category.name) {
                                ForEach(category.standardItems) { item in
                                    Button(action: {
                                        let cleanCategory = cleanCategoryName(category.name)
                                        selectedJobType = cleanCategory
                                        selectedTripType = item.name
                                        jobType = "\(cleanCategory) - \(item.name)"
                                        selectedDesignation = item.designation
                                    }) {
                                        let cleanCategory = cleanCategoryName(category.name)
                                        if (selectedJobType == cleanCategory && selectedTripType == item.name) || jobType == "\(cleanCategory) - \(item.name)" || (jobType == item.name && (selectedDesignation == item.designation || selectedDesignation.isEmpty)) {
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
                                            selectedTripType = "Diagnostic"
                                            jobType = "\(item.name) - Diagnostic"
                                            selectedDesignation = item.name
                                        }) {
                                            if selectedJobType == item.name || jobType.starts(with: item.name) {
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
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            Text(jobTypeDisplayString)
                                .font(.callout)
                                .foregroundColor(jobTypeDisplayString == "Select" ? .secondary.opacity(0.7) : .secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                                .padding(.leading, 4)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                    }
                    .buttonStyle(.plain)
                    
                    Divider().padding(.horizontal, 20)
                    
                    // Notes row (Clean TextEditor)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Notes")
                            .font(.callout)
                            .foregroundColor(.primary)
                        
                        TextEditor(text: $notes)
                            .focused($isNotesFocused)
                            .frame(height: 80)
                            .font(.callout)
                            .padding(.horizontal, -4)
                            #if os(iOS)
                            .scrollContentBackground(.hidden)
                            #endif
                            .background(Color.clear)
                    }
                    .padding(.vertical, 16)
                    .padding(.horizontal, 20)
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            
            // Scheduling & Staffing Section (ONLY for Schedule Now tab)
            if appointmentMode == .scheduleNow {
                schedulingAndStaffingSection
            }
            
            // Lead Source Section
            leadSourceSection
        }
        .transition(.opacity.combined(with: .move(edge: .leading)))
    }
    
    private var activeJobForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let selectedJobStr = activeJobSelection {
                // 1. Collapsed Active Job Picker (Identical to Equipment page location module)
                Menu {
                    ForEach(activeJobsList, id: \.self) { jobStr in
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                activeJobSelection = jobStr
                            }
                        }) {
                            HStack {
                                Text(jobStr)
                                if activeJobSelection == jobStr {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "briefcase")
                            .foregroundColor(.blue)
                            .font(.headline)
                        Text(selectedJobStr)
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.02), radius: 4, x: 0, y: 2)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
                .padding(.bottom, 4)
                
                // 2. Active Job Details Form (ONLY Access, Primary Contact, and Notes)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Job Details")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, 4)
                    
                    VStack(spacing: 0) {
                        // Access row
                        NavigationLink(destination: AppointmentAccessScreen(accessCodes: $accessCodes)) {
                            HStack {
                                Text("Access")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(accessSummary)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.8))
                                    .padding(.leading, 4)
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 20)
                        }
                        .buttonStyle(.plain)
                        
                        Divider().padding(.horizontal, 20)
                        
                        // Primary Contact row
                        Menu {
                            Button(action: { selectedContact = customer.name }) {
                                if selectedContact == customer.name {
                                    Label(customer.name, systemImage: "checkmark")
                                } else {
                                    Text(customer.name)
                                }
                            }
                            
                            let authPersons = customer.authorizedPersons
                            let nonCustomerContacts = customer.contacts.filter { $0 != customer.name }
                            
                            if !authPersons.isEmpty {
                                Section(header: Text("Authorized Persons")) {
                                    ForEach(authPersons) { person in
                                        let personName = person.fullName
                                        Button(action: { selectedContact = personName }) {
                                            if selectedContact == personName {
                                                Label(personName, systemImage: "checkmark")
                                            } else {
                                                Text(personName)
                                            }
                                        }
                                    }
                                }
                            } else if !nonCustomerContacts.isEmpty {
                                Section(header: Text("Authorized Persons")) {
                                    ForEach(nonCustomerContacts, id: \.self) { contact in
                                        Button(action: { selectedContact = contact }) {
                                            if selectedContact == contact {
                                                Label(contact, systemImage: "checkmark")
                                            } else {
                                                Text(contact)
                                            }
                                        }
                                    }
                                }
                            }
                            
                            Divider()
                            
                            Button(action: { showAddContactSheet = true }) {
                                Label("Add Authorized Persons", systemImage: "plus")
                            }
                        } label: {
                            HStack {
                                Text("Primary Contact")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(selectedContact)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary.opacity(0.8))
                                    .padding(.leading, 4)
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 20)
                        }
                        .buttonStyle(.plain)
                        
                        Divider().padding(.horizontal, 20)
                        
                        // Notes row
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes")
                                .font(.callout)
                                .foregroundColor(.primary)
                            
                            TextEditor(text: $notes)
                                .focused($isNotesFocused)
                                .frame(height: 80)
                                .font(.callout)
                                .padding(.horizontal, -4)
                                #if os(iOS)
                                .scrollContentBackground(.hidden)
                                #endif
                                .background(Color.clear)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                
                // Scheduling & Staffing Section (Revealed after job choice)
                schedulingAndStaffingSection
                
                // Lead Source Section (Revealed after job choice)
                leadSourceSection
            } else {
                // Active Jobs Selection List ONLY (Before a job is selected)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Select Active Job")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, 4)
                    
                    VStack(spacing: 0) {
                        ForEach(activeJobsList, id: \.self) { jobStr in
                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.25)) {
                                    activeJobSelection = jobStr
                                }
                            }) {
                                HStack {
                                    Text(jobStr)
                                        .font(.callout.weight(.medium))
                                        .foregroundColor(.primary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(.secondary.opacity(0.8))
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 14)
                                .padding(.horizontal, 20)
                                .background(Color.clear)
                                #if true
                                .contentShape(Rectangle())
                                #endif
                            }
                            .buttonStyle(.plain)
                            
                            if jobStr != activeJobsList.last {
                                Divider().padding(.horizontal, 20)
                            }
                        }
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                .padding(.top, 4)
                .padding(.bottom, 6)
            }
        }
        .transition(.opacity.combined(with: .move(edge: .trailing)))
    }
    
    private var schedulingAndStaffingSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Scheduling & Staffing")
                .font(.footnote)
                .fontWeight(.bold)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
                .padding(.horizontal, 4)
                .padding(.top, 14)
            
            VStack(spacing: 0) {
                // Date & Start Time
                DatePicker("Date & Start Time", selection: Binding(get: { dateTime ?? Date() }, set: { dateTime = $0 }), displayedComponents: [.date, .hourAndMinute])
                    .font(.callout)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 20)
                
                Divider().padding(.horizontal, 20)
                
                // Duration selector (Matching follow up type native pop out menu format, no gray separator lines)
                Menu {
                    ForEach(durations, id: \.self) { dur in
                        Button(action: {
                            duration = dur
                        }) {
                            HStack {
                                Text(dur)
                                if duration == dur {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        Text("Duration")
                            .font(.callout)
                            .foregroundColor(.primary)
                        Spacer()
                        Text(duration)
                            .font(.callout)
                            .foregroundColor(.secondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary.opacity(0.8))
                            .padding(.leading, 4)
                    }
                    .padding(.vertical, 16)
                    .padding(.horizontal, 20)
                }
                .buttonStyle(.plain)
                
                Divider().padding(.horizontal, 20)
                
                // Primary Tech selector
                Menu {
                    ForEach(techs, id: \.self) { tech in
                        Button(tech) { primaryTech = tech }
                    }
                } label: {
                    HStack {
                        Text("Primary Tech")
                            .font(.callout)
                            .foregroundColor(.primary)
                        Spacer()
                        Text(primaryTech)
                            .font(.callout)
                            .foregroundColor(.secondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary.opacity(0.8))
                            .padding(.leading, 4)
                    }
                    .padding(.vertical, 16)
                    .padding(.horizontal, 20)
                }
                .buttonStyle(.plain)
                
                Divider().padding(.horizontal, 20)
                
                // Additional Tech fields
                ForEach(additionalTechs) { techRow in
                    SwipeableAdditionalTechRow(
                        techRow: techRow,
                        techs: techs,
                        onSelectTech: { selectedName in
                            if let idx = additionalTechs.firstIndex(where: { $0.id == techRow.id }) {
                                additionalTechs[idx].name = selectedName
                            }
                        },
                        onDelete: {
                            additionalTechs.removeAll(where: { $0.id == techRow.id })
                        }
                    )
                    
                    Divider().padding(.horizontal, 20)
                }
                
                // Add Additional Tech row
                HStack {
                    Button(action: {
                        additionalTechs.append(AdditionalTechRow())
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.green)
                                .font(.title3)
                            Text("add tech")
                                .font(.callout)
                                .foregroundColor(.primary)
                        }
                    }
                    .buttonStyle(.plain)
                    Spacer()
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 20)
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }
    
    private var leadSourceSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Lead Source")
                .font(.footnote)
                .fontWeight(.bold)
                .foregroundColor(.secondary)
                .textCase(.uppercase)
                .padding(.horizontal, 4)
                .padding(.top, 14)
            
            VStack(spacing: 0) {
                Menu {
                    ForEach(leadSources, id: \.self) { source in
                        Button(source) { leadSource = source }
                    }
                } label: {
                    HStack {
                        Text("Lead Source")
                            .font(.callout)
                            .foregroundColor(.primary)
                        Spacer()
                        Text(leadSource)
                            .font(.callout)
                            .foregroundColor(.secondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary.opacity(0.8))
                            .padding(.leading, 4)
                    }
                    .padding(.vertical, 16)
                    .padding(.horizontal, 20)
                }
                .buttonStyle(.plain)
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }
    
    private var parsedDurationHours: Double {
        if duration == "Select" || duration.isEmpty {
            return 1.0
        }
        let cleaned = duration
            .replacingOccurrences(of: "Hours", with: "")
            .replacingOccurrences(of: "Hour", with: "")
            .replacingOccurrences(of: "hours", with: "")
            .replacingOccurrences(of: "hour", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return Double(cleaned) ?? 1.0
    }
    
    private func saveAppointment() {
        let apptJobType = (jobType == "Select" || jobType.isEmpty) ? "Diagnostic" : jobType
        let apptDateTime = dateTime ?? Date()
        let apptDesignation = selectedDesignation.isEmpty ? nil : selectedDesignation
        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let apptTech = (primaryTech == "Select" || primaryTech.isEmpty) ? (sessionManager.currentUser?.name ?? "Justin Lung") : primaryTech
        
        let validAccessCodes = accessCodes.filter { !$0.code.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        let chosenContact = (selectedContact != "Select" && !selectedContact.isEmpty) ? selectedContact : customer.name
        let locAddr = selectedLocation.street.isEmpty ?
            "\(customer.address.street), \(customer.address.city), \(customer.address.state) \(customer.address.zipCode)".trimmingCharacters(in: .whitespaces) :
            (selectedLocation.city.isEmpty ? selectedLocation.street : "\(selectedLocation.street), \(selectedLocation.city), \(selectedLocation.state) \(selectedLocation.zipCode)".trimmingCharacters(in: .whitespaces))
        
        if isEditing, let appt = sourceAppointment {
            appt.jobType = apptJobType
            appt.dateTime = apptDateTime
            appt.durationHours = parsedDurationHours
            appt.serviceNotes = trimmedNotes.isEmpty ? nil : trimmedNotes
            appt.designationOverride = apptDesignation
            appt.assignedTech = apptTech
            appt.accessCodes = validAccessCodes
            appt.contactName = chosenContact
            appt.locationAddress = locAddr.isEmpty ? nil : locAddr
            
            Task {
                await scheduleStore.updateAppointment(appt)
                dismiss()
            }
        } else {
            let newAppt = Appointment(
                id: UUID(),
                customerId: customer.id,
                dateTime: apptDateTime,
                durationHours: parsedDurationHours,
                status: .assigned,
                serviceNotes: trimmedNotes.isEmpty ? nil : trimmedNotes,
                jobNumber: Int.random(in: 140000...150000),
                jobType: apptJobType,
                designationOverride: apptDesignation,
                assignedTech: apptTech,
                accessCodes: validAccessCodes,
                locationAddress: locAddr.isEmpty ? nil : locAddr,
                customerName: customer.name,
                contactName: chosenContact,
                customerPhone: customer.phone,
                customerEmail: customer.email
            )
            
            Task {
                await scheduleStore.scheduleAppointment(newAppt)
                dismiss()
            }
        }
    }
}

// Add Authorized Person Sheet
struct AddAuthorizedPersonSheet: View {
    @Environment(\.dismiss) var dismiss
    var customer: Customer
    let onSave: (AuthorizedPerson) -> Void
    
    @State var positionLabel = "Spouse"
    @State var firstName = ""
    @State var lastName = ""
    @State var phone = ""
    @State var email = ""
    
    let labelOptions = ["Spouse", "Partner", "Family Member", "Property Manager", "Tenant", "Manager", "Other"]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    HStack(alignment: .center, spacing: 12) {
                        Menu {
                            ForEach(labelOptions, id: \.self) { opt in
                                Button(opt) { positionLabel = opt }
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text(positionLabel)
                                    .font(.subheadline)
                                Image(systemName: "chevron.right")
                                    .font(.caption2.weight(.bold))
                            }
                            .foregroundColor(.blue)
                        }
                        .buttonStyle(.plain)
                        .frame(width: 90, alignment: .leading)
                        
                        Divider()
                            .frame(height: 176)
                        
                        VStack(alignment: .leading, spacing: 0) {
                            HStack {
                                TextField("First name", text: $firstName)
                                    .font(.body)
                                    .foregroundColor(.primary)
                            }
                            .frame(height: 44)
                            
                            Divider()
                            
                            HStack {
                                TextField("Last name", text: $lastName)
                                    .font(.body)
                                    .foregroundColor(.primary)
                            }
                            .frame(height: 44)
                            
                            Divider()
                            
                            HStack {
                                TextField("Phone number", text: $phone)
                                    .font(.body)
                                    .foregroundColor(.primary)
                                    #if os(iOS)
                                    .keyboardType(.phonePad)
                                    #endif
                            }
                            .frame(height: 44)
                            
                            Divider()
                            
                            HStack {
                                TextField("Email address", text: $email)
                                    .font(.body)
                                    .foregroundColor(.primary)
                            }
                            .frame(height: 44)
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
            .navigationTitle("Add Authorized Person")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add") {
                        let newPerson = AuthorizedPerson(
                            positionLabel: positionLabel.isEmpty ? "Authorized Person" : positionLabel,
                            firstName: firstName,
                            lastName: lastName,
                            phone: phone,
                            email: email
                        )
                        onSave(newPerson)
                        dismiss()
                    }
                    .disabled(firstName.isEmpty && lastName.isEmpty)
                }
                #else
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let newPerson = AuthorizedPerson(
                            positionLabel: positionLabel.isEmpty ? "Authorized Person" : positionLabel,
                            firstName: firstName,
                            lastName: lastName,
                            phone: phone,
                            email: email
                        )
                        onSave(newPerson)
                        dismiss()
                    }
                    .disabled(firstName.isEmpty && lastName.isEmpty)
                }
                #endif
            }
        }
    }
}

struct TopRoundedRectangle: Shape {
    var radius: CGFloat
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        #if canImport(UIKit)
        let pathUI = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: [.topLeft, .topRight],
            cornerRadii: CGSize(width: radius, height: radius)
        )
        path = Path(pathUI.cgPath)
        #else
        path.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + radius))
        path.addArc(center: CGPoint(x: rect.minX + radius, y: rect.minY + radius),
                    radius: radius,
                    startAngle: Angle(degrees: 180),
                    endAngle: Angle(degrees: 270),
                    clockwise: false)
        path.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
        path.addArc(center: CGPoint(x: rect.maxX - radius, y: rect.minY + radius),
                    radius: radius,
                    startAngle: Angle(degrees: 270),
                    endAngle: Angle(degrees: 360),
                    clockwise: false)
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.closeSubpath()
        #endif
        return path
    }
}

public struct SelectJobScreen: View {
    var customer: Customer
    var selectedLocation: Address
    @Binding var selectedJob: String
    @Environment(\.dismiss) var dismiss
    
    @State var selectedLocationFilter: String
    
    let knownJobs = [
        "#140010 - Diagnostic",
        "#139880 - Parts",
        "#138520 - Installation",
        "#137110 - Maintenance",
        "#135440 - Sealed System"
    ]
    
    public init(customer: Customer, selectedLocation: Address, selectedJob: Binding<String>) {
        self.customer = customer
        self.selectedLocation = selectedLocation
        self._selectedJob = selectedJob
        
        let initialLoc = selectedLocation.street.isEmpty ? "All Locations" : "\(selectedLocation.street), \(selectedLocation.city), \(selectedLocation.state) \(selectedLocation.zipCode)".trimmingCharacters(in: .whitespaces)
        self._selectedLocationFilter = State(initialValue: initialLoc.isEmpty ? "All Locations" : initialLoc)
    }
    
    private func isJobSelected(_ jobText: String) -> Bool {
        if jobText == "New" {
            return selectedJob == "New"
        } else {
            let jobNumber = jobText.components(separatedBy: " - ").first ?? jobText
            return selectedJob == jobText || selectedJob.contains(jobNumber)
        }
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Top Module: Identical Location Selector Menu from Equipment Page
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
                    
                    ForEach(customer.locations, id: \.self) { loc in
                        let locStr = loc.street.isEmpty ? "Main Location" : "\(loc.street), \(loc.city), \(loc.state) \(loc.zipCode)".trimmingCharacters(in: .whitespaces)
                        let streetLine = loc.street.isEmpty ? "Main Location" : loc.street
                        let cityStateZipLine = "\(loc.city), \(loc.state) \(loc.zipCode)".trimmingCharacters(in: .whitespaces)
                        let formattedMenuText = cityStateZipLine.isEmpty ? streetLine : "\(streetLine)\n\(cityStateZipLine)"
                        
                        Button {
                            selectedLocationFilter = locStr
                        } label: {
                            HStack {
                                Text(formattedMenuText)
                                if selectedLocationFilter == locStr {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "mappin.and.ellipse")
                            .foregroundColor(.blue)
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
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(12)
                    .shadow(color: Color.black.opacity(0.02), radius: 4, x: 0, y: 2)
                }
                .buttonStyle(.plain)
                
                // Grouped Table List: "New" option on top, followed by customer jobs in Job # - Job Type format
                VStack(spacing: 0) {
                    // 1. "New" Option
                    Button(action: {
                        selectedJob = "New"
                        dismiss()
                    }) {
                        HStack(spacing: 12) {
                            if isJobSelected("New") {
                                Image(systemName: "checkmark")
                                    .font(.callout.weight(.bold))
                                    .foregroundColor(.blue)
                            } else {
                                Color.clear.frame(width: 16, height: 16)
                            }
                            
                            Text("New")
                                .font(.callout)
                                .foregroundColor(.primary)
                            
                            Spacer()
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 16)
                    }
                    .buttonStyle(.plain)
                    
                    Divider().padding(.leading, 44)
                    
                    // 2. Customer's Jobs (Job # - Job Type)
                    ForEach(knownJobs, id: \.self) { job in
                        Button(action: {
                            selectedJob = job
                            dismiss()
                        }) {
                            HStack(spacing: 12) {
                                if isJobSelected(job) {
                                    Image(systemName: "checkmark")
                                        .font(.callout.weight(.bold))
                                        .foregroundColor(.blue)
                                } else {
                                    Color.clear.frame(width: 16, height: 16)
                                }
                                
                                Text(job)
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                
                                Spacer()
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 16)
                        }
                        .buttonStyle(.plain)
                        
                        if job != knownJobs.last {
                            Divider().padding(.leading, 44)
                        }
                    }
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(12)
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Select Job")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

struct SwipeableAdditionalTechRow: View {
    let techRow: AdditionalTechRow
    let techs: [String]
    let onSelectTech: (String) -> Void
    let onDelete: () -> Void
    
    @State var offset: CGFloat = 0
    @State var isSwiped: Bool = false
    
    var body: some View {
        ZStack(alignment: .trailing) {
            // Delete action button underneath on the right
            HStack {
                Spacer()
                Button(action: {
                    onDelete()
                }) {
                    ZStack {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 36, height: 36)
                        Image(systemName: "trash.fill")
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.white)
                    }
                    .frame(width: 70)
                }
                .buttonStyle(.plain)
            }
            
            // Main Row content
            HStack(spacing: 12) {
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        if isSwiped {
                            offset = 0
                            isSwiped = false
                        } else {
                            offset = -80
                            isSwiped = true
                        }
                    }
                }) {
                    Image(systemName: "minus.circle.fill")
                        .foregroundColor(.red)
                        .font(.body)
                }
                .buttonStyle(.plain)
                
                Text("Additional Tech")
                    .font(.callout)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Menu {
                    ForEach(techs, id: \.self) { t in
                        Button(t) {
                            onSelectTech(t)
                        }
                    }
                } label: {
                    HStack {
                        Text(techRow.name)
                            .font(.callout)
                            .foregroundColor(.secondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary.opacity(0.8))
                            .padding(.leading, 4)
                    }
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 20)
            .background(Color.murphysCardBackground)
            .offset(x: offset)
            .gesture(
                DragGesture()
                    .onChanged { gesture in
                        if gesture.translation.width < 0 {
                            offset = gesture.translation.width
                        }
                    }
                    .onEnded { gesture in
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            if gesture.translation.width < -40 {
                                offset = -80
                                isSwiped = true
                            } else {
                                offset = 0
                                isSwiped = false
                            }
                        }
                    }
            )
        }
    }
}

public struct UnscheduleCancelDeleteScreen: View {
    @Environment(\.dismiss) var dismiss
    @Environment(ScheduleStore.self) var scheduleStore
    var appointment: Appointment?
    var onComplete: (() -> Void)? = nil
    
    @State var selectedOption: String = "Unschedule"
    @State var cancelAllPastAppointments: Bool = false
    
    public init(appointment: Appointment? = nil, onComplete: (() -> Void)? = nil) {
        self.appointment = appointment
        self.onComplete = onComplete
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            List {
                // Option 1: Unschedule
                Button {
                    selectedOption = "Unschedule"
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: selectedOption == "Unschedule" ? "checkmark" : "")
                            .font(.body.weight(.bold))
                            .foregroundColor(.blue)
                            .frame(width: 20, alignment: .leading)
                            .padding(.top, 2)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Unschedule")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Text("This will take the appointment(s) and make a single service request, retaining the existing information.")
                                .font(.footnote)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.leading)
                        }
                    }
                    .padding(.vertical, 6)
                    #if os(iOS)
                    .contentShape(Rectangle())
                    #endif
                }
                .buttonStyle(.plain)
                
                // Option 2: Cancel
                Button {
                    selectedOption = "Cancel"
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: selectedOption == "Cancel" ? "checkmark" : "")
                            .font(.body.weight(.bold))
                            .foregroundColor(.blue)
                            .frame(width: 20, alignment: .leading)
                            .padding(.top, 2)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Cancel")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Text("This will set the status of the appointment(s) to \"cancelled.\" It will not be visible on the schedule, but will show as cancelled on the job.")
                                .font(.footnote)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.leading)
                            
                            Button {
                                cancelAllPastAppointments.toggle()
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: cancelAllPastAppointments ? "checkmark.square.fill" : "square")
                                        .font(.callout)
                                        .foregroundColor(cancelAllPastAppointments ? .blue : .secondary)
                                    Text("Cancel all past appointments")
                                        .font(.footnote)
                                        .foregroundColor(.primary)
                                }
                                .padding(.top, 6)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 6)
                    #if os(iOS)
                    .contentShape(Rectangle())
                    #endif
                }
                .buttonStyle(.plain)
                
                // Option 3: Delete
                Button {
                    selectedOption = "Delete"
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: selectedOption == "Delete" ? "checkmark" : "")
                            .font(.body.weight(.bold))
                            .foregroundColor(.blue)
                            .frame(width: 20, alignment: .leading)
                            .padding(.top, 2)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Delete")
                                .font(.headline)
                                .foregroundColor(.red)
                            Text("This will permanently delete the appointment(s).")
                                .font(.footnote)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.leading)
                        }
                    }
                    .padding(.vertical, 6)
                    #if os(iOS)
                    .contentShape(Rectangle())
                    #endif
                }
                .buttonStyle(.plain)
            }
            .listStyle(.plain)
            .background(Color.murphysGroupedBackground)
        }
        .navigationTitle("Cancel / Unschedule")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    dismiss()
                }
                .font(.subheadline)
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    saveAction()
                }
                .font(.subheadline.weight(.semibold))
            }
        }
    }
    
    private func saveAction() {
        guard let appt = appointment else {
            onComplete?()
            dismiss()
            return
        }
        
        Task {
            if selectedOption == "Unschedule" {
                // Convert to unscheduled Service Request
                appt.status = .unassigned
                appt.assignedTech = nil
                await scheduleStore.updateAppointment(appt)
            } else if selectedOption == "Cancel" {
                // Set status to cancelled
                appt.status = .cancelled
                await scheduleStore.updateAppointment(appt)
                if cancelAllPastAppointments {
                    let matching = scheduleStore.appointments.filter { $0.jobNumber == appt.jobNumber }
                    for pastAppt in matching {
                        pastAppt.status = .cancelled
                        await scheduleStore.updateAppointment(pastAppt)
                    }
                }
            } else if selectedOption == "Delete" {
                // Delete permanently
                await scheduleStore.deleteAppointment(appt)
            }
            
            onComplete?()
            dismiss()
        }
    }
}


































