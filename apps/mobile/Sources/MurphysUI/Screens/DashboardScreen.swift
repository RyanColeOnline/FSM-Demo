import SwiftUI

public struct DashboardScreen: View {
    @Environment(ScheduleStore.self) var scheduleStore
    @Environment(CustomerStore.self) var customerStore
    var sessionManager = SessionManager.shared
    
    @Environment(\.openURL) var openURL
    @State var currentDate = Date()
    @State var showDatePicker = false
    @State var showRoutesSheet = false
    @State var showScheduleSheet = false
    @State var showSelectCustomerForAppointment = false
    @State var selectedTechnicianName: String
    @State var dragDirection: DateDragDirection = .forward
    var receivedFollowUpsCount: Int {
        FollowUpStore.shared.followUps.filter { !$0.isComplete }.count
    }
    var technicians: [String] {
        let isOfficeOrAdmin = sessionManager.currentUser?.accountType == .admin || sessionManager.currentUser?.accountType == .office
        var list = ["All Techs"]
        if isOfficeOrAdmin {
            for group in DispatchGroupCategory.allCases {
                for t in scheduleStore.technicians(for: group) {
                    if !list.contains(t) {
                        list.append(t)
                    }
                }
            }
            return list
        }
        let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
        let currentUserName = sessionManager.currentUser?.name ?? "Justin Lung"
        if !list.contains(currentUserName) {
            list.append(currentUserName)
        }
        for t in scheduleStore.technicians(for: group) {
            if !list.contains(t) {
                list.append(t)
            }
        }
        return list
    }
    
    enum DateDragDirection {
        case forward
        case backward
    }
    
    public init() {
        _selectedTechnicianName = State(initialValue: "All Techs")
    }
    
    public var body: some View {
        VStack(spacing: 16) {
            // Custom Date Picker/Navigation Header (Swipeable Date Header with Slide-Out & Fade-In Animations)
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
            
            // Sub Control Buttons (GlassEffectContainer Compact Defined)
            GlassEffectContainer(spacing: 24.0) {
                HStack(spacing: 24.0) {
                    // 1. Schedule Button (Presents large sheet)
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
            .padding(.top, 4)
            .padding(.bottom, 22)
            
            // Main Display Content (Pinned Header + ScrollView underneath)
            appointmentListView
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Jobs")
        #if os(iOS)
        .toolbarTitleDisplayMode(.inlineLarge)
        #endif
        #if os(iOS)
        .toolbarBackground(.visible, for: .navigationBar)
        #endif
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink(destination: MyFollowUpsScreen()) {
                    Image(systemName: "flag")
                        .foregroundColor(.primary)
                }
                .badge(receivedFollowUpsCount)
            }
        }
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
                                    .foregroundColor(.blue)
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
            .padding(.top, 6)
            .padding(.bottom, 12)
            .background(Color.murphysGroupedBackground)
            .zIndex(1)
            
            // ScrollView for list of appointments scrolling behind the pinned header
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    let dayAppointments = getAppointmentsForDay()
                    if dayAppointments.isEmpty {
                        VStack(spacing: 14) {
                            Image(systemName: "calendar.badge.exclamationmark")
                                .font(.largeTitle)
                                .foregroundColor(.secondary)
                            Text("No appointments scheduled for this day")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            
                            let isOfficeOrAdmin = sessionManager.currentUser?.accountType == .admin || sessionManager.currentUser?.accountType == .office
                            let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
                            let allAppts = (selectedTechnicianName == "All Techs" || isOfficeOrAdmin) ? scheduleStore.appointments(for: .officeStaff) : scheduleStore.appointments(for: group)
                            if let latest = allAppts.first(where: { selectedTechnicianName == "All Techs" ? true : ($0.assignedTech?.localizedCaseInsensitiveContains(selectedTechnicianName) == true || selectedTechnicianName.localizedCaseInsensitiveContains($0.assignedTech ?? "")) }) {
                                Button(action: {
                                    withAnimation(.easeInOut(duration: 0.25)) {
                                        currentDate = latest.startDate
                                    }
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "arrow.uturn.forward")
                                            .font(.caption.weight(.bold))
                                        Text("Jump to \(formattedDate(latest.startDate))")
                                            .font(.callout.weight(.medium))
                                    }
                                    .foregroundColor(.blue)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(8)
                                }
                                .buttonStyle(PlainButtonStyle())
                                .padding(.top, 4)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        ForEach(dayAppointments) { appointment in
                            let customer = customerStore.customers.first(where: { $0.id == appointment.customerId })
                                ?? (appointment.jobNumber == 140020 ? customerStore.customers.first(where: { $0.name == "Fiona Gallagher" }) : nil)
                                ?? (appointment.jobNumber == 140019 ? customerStore.customers.first(where: { $0.name == "Evan Williams" }) : nil)
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
        let isOfficeOrAdmin = sessionManager.currentUser?.accountType == .admin || sessionManager.currentUser?.accountType == .office
        let allAppts: [Appointment] = {
            if selectedTechnicianName == "All Techs" || isOfficeOrAdmin {
                return scheduleStore.appointments(for: .officeStaff)
            } else {
                let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
                return scheduleStore.appointments(for: group)
            }
        }()
        
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
}

/// Helper subview for rendering a single tile according to screenshot layout
struct DashboardTileView: View {
    var title: String
    var systemImage: String
    var fallbackImage: String? = nil
    var color: Color
    var topRightText: String? = nil
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                if #available(iOS 18.0, *) {
                    Image(systemName: systemImage)
                        .font(.title3)
                        .foregroundColor(color)
                        .padding(12)
                        .background(color.opacity(0.1))
                        .cornerRadius(12)
                } else {
                    Image(systemName: fallbackImage ?? systemImage)
                        .font(.title3)
                        .foregroundColor(color)
                        .padding(12)
                        .background(color.opacity(0.1))
                        .cornerRadius(12)
                }
                Spacer()
                
                if let text = topRightText {
                    Text(text)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.top, 2)
                }
            }
            
            Text(title)
                .font(.callout.weight(.semibold))
                .foregroundColor(Color(red: 0.15, green: 0.25, blue: 0.45)) // Dark blue-gray text
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(height: 120) // Uniform height
        .background(Color.murphysCardBackground)
        .cornerRadius(18)
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 3)
    }
}




