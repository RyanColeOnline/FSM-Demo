import SwiftUI

public struct ScheduleTileScreen: View {
    @Environment(ScheduleStore.self) var scheduleStore
    @Environment(CustomerStore.self) var customerStore
    var sessionManager = SessionManager.shared
    
    @Environment(\.openURL) var openURL
    @State var currentDate = Date()
    @State var showDatePicker = false
    @State var showRoutesSheet = false
    @State var showScheduleSheet = false
    @State var showSelectCustomerForAppointment = false
    @State var selectedTechnicianName: String = SessionManager.shared.currentUser?.name ?? "Justin Lung"
    @State var dragDirection: DateDragDirection = .forward
    var technicians: [String] {
        let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
        return ["All Techs"] + scheduleStore.technicians(for: group)
    }
    
    enum DateDragDirection {
        case forward
        case backward
    }
    
    public init() {
        let defaultName = SessionManager.shared.currentUser?.name ?? "Justin Lung"
        self._selectedTechnicianName = State(initialValue: defaultName)
    }
    
    public var body: some View {
        VStack(spacing: 16) {
            // Date Navigation (Swipeable Date Header with Slide-Out & Fade-In Animations)
            HStack {
                Button(action: { showDatePicker = true }) {
                    Text(formattedDate(currentDate))
                        .font(.title2.weight(.semibold))
                        .foregroundColor(.primary)
                        .id(currentDate)
                        .transition(
                            .asymmetric(
                                insertion: .opacity,
                                removal: .move(edge: dragDirection == .forward ? .leading : .trailing).combined(with: .opacity)
                            )
                        )
                }
                #if os(iOS)
                .popover(isPresented: $showDatePicker) {
                    DatePicker("", selection: $currentDate, displayedComponents: [.date])
                        .datePickerStyle(.graphical)
                        .labelsHidden()
                        .padding()
                        .frame(width: 320)
                        .presentationCompactAdaptation(.popover)
                }
                #else
                .sheet(isPresented: $showDatePicker) {
                    DatePickerHelper(selectedDate: $currentDate, isPresented: $showDatePicker)
                }
                #endif
                .buttonStyle(PlainButtonStyle())
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 14)
            #if os(iOS)
            .contentShape(Rectangle())
            #endif
            .gesture(
                DragGesture(minimumDistance: 15, coordinateSpace: .local)
                    .onEnded { value in
                        if value.translation.width < -15 {
                            dragDirection = .forward
                            withAnimation(.easeInOut(duration: 0.22)) {
                                adjustDate(by: 1)
                            }
                        } else if value.translation.width > 15 {
                            dragDirection = .backward
                            withAnimation(.easeInOut(duration: 0.22)) {
                                adjustDate(by: -1)
                            }
                        }
                    }
            )
            .padding(.top, 20)
            
            // Sub Control Buttons (GlassEffectContainer Compact Defined)
            GlassEffectContainer(spacing: 24.0) {
                HStack(spacing: 24.0) {
                    // 1. Schedule Button
                    Button(action: { showScheduleSheet = true }) {
                        Image(systemName: "calendar")
                            .font(.title3.weight(.medium))
                            .foregroundStyle(.primary)
                            .frame(width: 48, height: 48)
                    }
                    #if os(iOS)
                    .buttonStyle(.glass)
                    #else
                    .buttonStyle(PlainButtonStyle())
                    #endif
                    .accessibilityLabel("Schedule")

                    // 2. Routes Button
                    Button(action: { showRoutesSheet = true }) {
                        Image(systemName: "point.topleft.filled.down.to.point.bottomright.curvepath")
                            .font(.title3.weight(.medium))
                            .foregroundStyle(.primary)
                            .frame(width: 48, height: 48)
                    }
                    #if os(iOS)
                    .buttonStyle(.glass)
                    #else
                    .buttonStyle(PlainButtonStyle())
                    #endif
                    .accessibilityLabel("Routes")

                    // 3. Add Button with Quick-Selection Menu
                    Menu {
                        Button(action: { showSelectCustomerForAppointment = true }) {
                            Label("New Appointment", systemImage: "calendar.badge.plus")
                        }
                        
                        NavigationLink(destination: AddOtherEventScreen()) {
                            Label("Other Event", systemImage: "clock.badge.plus")
                        }
                    } label: {
                        Image(systemName: "plus")
                            .font(.title3.weight(.medium))
                            .foregroundStyle(.primary)
                            .frame(width: 48, height: 48)
                    }
                    #if os(iOS)
                    .buttonStyle(.glass)
                    #else
                    .buttonStyle(PlainButtonStyle())
                    #endif
                    .accessibilityLabel("Add New")
                }
            }
            .padding(.top, 14)
            .padding(.bottom, 22)
            
            // Main Display Content (Pinned Header + ScrollView underneath)
            appointmentListView
        }
        .navigationTitle("My Schedule")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .navigationDestination(isPresented: $showSelectCustomerForAppointment) {
            CustomerListScreen(navigationTitle: "Select Customer", showSkipButton: false, isAppointmentFlow: true)
        }
        .sheet(isPresented: $showScheduleSheet) {
            NavigationStack {
                ScheduleScreen(selectedDate: currentDate)
            }
            .presentationDragIndicator(.visible)
            .interactiveDismissDisabled(true)
        }
        .sheet(isPresented: $showRoutesSheet) {
            NavigationStack {
                let dayAppts = getAppointmentsForDay()
                TechnicianRouteView(appointments: dayAppts)
                    #if os(iOS)
                    .navigationBarTitleDisplayMode(.inline)
                    #endif
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button(action: { showRoutesSheet = false }) {
                                Image(systemName: "chevron.left")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                            }
                        }
                    }
            }
            .presentationDragIndicator(.visible)
        }
    }
    
    private var appointmentListView: some View {
        VStack(spacing: 0) {
            // Pinned Header outside ScrollView with solid background
            HStack {
                if sessionManager.permissions.canSwitchTechnicianSchedules {
                    Menu {
                        ForEach(technicians, id: \.self) { techName in
                            Button(action: {
                                withAnimation(.easeInOut(duration: 0.15)) {
                                    selectedTechnicianName = techName
                                }
                            }) {
                                HStack {
                                    Text(techName)
                                    if techName == selectedTechnicianName {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 6) {
                            let currentUserName = sessionManager.currentUser?.name ?? "My"
                            Text(selectedTechnicianName == "All Techs" ? "All Appointments" : (selectedTechnicianName == currentUserName ? "My Appointments" : "\(selectedTechnicianName)'s Appointments"))
                                .font(.title3.weight(.semibold))
                                .lineLimit(1)
                            
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.subheadline)
                        }
                        .foregroundStyle(.secondary)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .id(selectedTechnicianName)
                } else {
                    Text("My Appointments")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                
                Spacer()
            }
            .padding(.horizontal)
            .padding(.bottom, 8)
            .background(Color.murphysGroupedBackground)
            .zIndex(1)
            
            // ScrollView for list of appointments scrolling behind the pinned header
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    let dayAppointments = getAppointmentsForDay()
                    if dayAppointments.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "calendar.badge.exclamationmark")
                                .font(.largeTitle)
                                .foregroundColor(.secondary)
                            Text("No appointments scheduled for this day")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        ForEach(dayAppointments) { appointment in
                            let customer = customerStore.customers.first(where: { $0.id == appointment.customerId || ($0.name == appointment.customerName && appointment.customerName != nil) })
                            NavigationLink(destination: AppointmentDetailScreen(appointment: appointment)) {
                                AppointmentCardView(appointment: appointment, customer: customer)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
                .padding(.top, 4)
            }
            .refreshable {
                try? await Task.sleep(nanoseconds: 500_000_000)
                await scheduleStore.fetchAppointments()
                await customerStore.fetchCustomers()
            }
        }
    }
    
    private var routesView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Daily Route Sequence")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                    .padding(.horizontal)
                
                let dayAppointments = getAppointmentsForDay()
                if dayAppointments.isEmpty {
                    Text("No routes available.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.horizontal)
                } else {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(0..<dayAppointments.count, id: \.self) { index in
                            let appointment = dayAppointments[index]
                            let customer = customerStore.customers.first(where: { $0.id == appointment.customerId || ($0.name == appointment.customerName && appointment.customerName != nil) })
                            
                            HStack(alignment: .top, spacing: 12) {
                                VStack {
                                    Circle()
                                        .fill(Color.blue)
                                        .frame(width: 24, height: 24)
                                        .overlay(
                                            Text("\(index + 1)")
                                                .font(.caption2)
                                                .fontWeight(.bold)
                                                .foregroundColor(.white)
                                        )
                                    
                                    if index < dayAppointments.count - 1 {
                                        Rectangle()
                                            .fill(Color.blue.opacity(0.3))
                                            .frame(width: 2, height: 40)
                                    }
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(appointment.title)
                                        .font(.subheadline)
                                        .fontWeight(.bold)
                                    
                                    if let address = customer?.address {
                                        Text("\(address.street), \(address.city)")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                    
                    // Maps Launch Button
                    Button(action: {
                        launchExternalMaps(with: dayAppointments)
                    }) {
                        Label("Navigate Route", systemImage: "arrow.triangle.turn.up.right.diamond.fill")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .padding(.top, 8)
                }
            }
            .padding(.vertical)
        }
    }
    
    private func adjustDate(by days: Int) {
        if let newDate = Calendar.current.date(byAdding: .day, value: days, to: currentDate) {
            currentDate = newDate
        }
    }
    
    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: date)
    }
    
    private func getAppointmentsForDay() -> [Appointment] {
        let calendar = Calendar.current
        let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
        let allAppts = scheduleStore.appointments(for: group)
        
        return allAppts.filter { app in
            guard calendar.isDate(app.startDate, inSameDayAs: currentDate) else { return false }
            if selectedTechnicianName == "All Techs" {
                return true
            }
            if let tech = app.assignedTech, !tech.isEmpty {
                return tech == selectedTechnicianName || tech.localizedCaseInsensitiveContains(selectedTechnicianName) || selectedTechnicianName.localizedCaseInsensitiveContains(tech)
            }
            return false
        }.sorted { $0.startDate < $1.startDate }
    }
    
    private func launchExternalMaps(with appointments: [Appointment]) {
        let addresses = appointments.compactMap { app -> String? in
            if let loc = app.locationAddress, !loc.isEmpty {
                return loc
            }
            let cust = customerStore.customers.first(where: { $0.id == app.customerId || ($0.name == app.customerName && app.customerName != nil) })
            guard let c = cust else { return nil }
            return "\(c.address.street), \(c.address.city), \(c.address.state) \(c.address.zipCode)"
        }
        
        guard !addresses.isEmpty else { return }
        
        let path = addresses.map { $0.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "" }.joined(separator: "+to+")
        
        let urlString = "https://maps.apple.com/?daddr=\(path)"
        if let url = URL(string: urlString) {
            openURL(url)
        }
    }
}

// Simple Date Picker sheet helper
struct DatePickerHelper: View {
    @Binding var selectedDate: Date
    @Binding var isPresented: Bool
    
    var body: some View {
        NavigationStack {
            VStack {
                DatePicker("Select Date", selection: $selectedDate, displayedComponents: [.date])
                    #if os(iOS)
                    .datePickerStyle(.graphical)
                    #endif
                    .padding()
                
                Spacer()
            }
            .navigationTitle("Select Date")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        isPresented = false
                    }
                }
            }
        }
    }
}

struct AppointmentCardView: View {
    var appointment: Appointment
    var customer: Customer?
    
    var body: some View {
        let isCompleted = (appointment.status == .completed)
        
        VStack(alignment: .leading, spacing: 10) { // Equal 10px spacing centers Row 2 between Row 1 and Row 3
            // Row 1: Name (No Underline), Centered Designation, Time
            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .top, spacing: 8) {
                    HStack(alignment: .center, spacing: 8) {
                        let displayName = customer?.displayName ?? appointment.displayCustomerName
                        Text(displayName)
                            .font(.headline)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                            .lineLimit(nil)
                            .fixedSize(horizontal: false, vertical: true)
                        
                        let designation = appointment.jobTypeBadge
                        Text(designation)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.primary.opacity(0.05))
                            .cornerRadius(4)
                    }
                    
                    Spacer()
                    
                    Text(timeRangeString)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.secondary)
                }
                
                if let contact = appointment.resolveAuthorizedContact(customer: customer) {
                    HStack(spacing: 4) {
                        Image(systemName: "person.badge.shield.checkmark.fill")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text(contact)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .lineLimit(nil)
                    }
                    .padding(.top, 1)
                }
            }
            
            // Row 2: BOLD Job ID - Diagnostic + Chevron (Centered between Row 1 and Row 3)
            HStack {
                HStack(spacing: 4) {
                    if appointment.isFlaggedForFollowUp {
                        Image(systemName: "flag.fill")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.red)
                    }
                    Text(appointment.formattedJobNumber)
                        .font(.subheadline.weight(.semibold))
                    Text(" - \(appointment.jobType)")
                        .font(.subheadline)
                }
                .foregroundColor(.secondary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary.opacity(0.6))
            }
            
            // Row 3: Address (Saved Appointment Location with 3-line wrapping support)
            let (displayStreet, displayCityStateZip): (String, String) = {
                if let loc = appointment.locationAddress?.trimmingCharacters(in: .whitespacesAndNewlines), !loc.isEmpty {
                    let parts = loc.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }
                    if parts.count >= 3 {
                        let streetPart = parts.dropLast().joined(separator: ", ")
                        let cityPart = parts.last ?? ""
                        return (streetPart, cityPart)
                    } else if parts.count == 2 {
                        return (parts[0], parts[1])
                    }
                    return (loc, "")
                }
                if let address = customer?.address, !address.street.isEmpty {
                    let cityStateZip = (address.city.isEmpty && address.state.isEmpty) ? "" : "\(address.city), \(address.state) \(address.zipCode)".trimmingCharacters(in: .whitespaces)
                    return (address.street, cityStateZip)
                }
                return ("", "")
            }()
            
            if !displayStreet.isEmpty || !displayCityStateZip.isEmpty {
                TwoLineAddressDisplay(
                    street: displayStreet,
                    cityStateZip: displayCityStateZip,
                    font: .subheadline,
                    foregroundColor: .secondary,
                    alignment: .leading,
                    lineLimit: nil
                )
                .padding(.top, 2)
            }
        }
        .padding(.top, 14)
        .padding(.bottom, 12)
        .padding(.horizontal, 16)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .overlay(
            Group {
                if isCompleted {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.primary.opacity(0.03))
                }
            }
        )
        .opacity(isCompleted ? 0.82 : 1.0)
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 3)
        .padding(.horizontal)
    }
    
    private var timeRangeString: String {
        appointment.timeRangeFormatted
    }
}






