import SwiftUI

public struct ScheduleScreen: View {
    @Environment(ScheduleStore.self) var scheduleStore
    @Environment(CustomerStore.self) var customerStore
    @Environment(\.dismiss) var dismiss
    var sessionManager = SessionManager.shared
    
    @State var currentDate: Date
    @State var showDatePicker = false
    @State var dragDirection: DateDragDirection = .forward
    
    enum DateDragDirection {
        case forward
        case backward
    }
    
    var technicians: [String] {
        let isOfficeOrAdmin = sessionManager.currentUser?.accountType == .admin || sessionManager.currentUser?.accountType == .office
        if isOfficeOrAdmin {
            var allTechs = Set<String>()
            for group in DispatchGroupCategory.allCases {
                for t in scheduleStore.technicians(for: group) {
                    allTechs.insert(t)
                }
            }
            return Array(allTechs).sorted()
        }
        let group = sessionManager.currentUser?.dispatchGroup ?? .applianceTechs
        return scheduleStore.technicians(for: group)
    }
    
    public init(selectedDate: Date = Date()) {
        _currentDate = State(initialValue: selectedDate)
    }
    
    struct PreparedApptCard: Identifiable {
        var id: UUID { appt.id }
        let appt: Appointment
        let customerName: String
        let street: String
        let cityStateZip: String
        let designation: String
        let offset: CGFloat
        let height: CGFloat
    }
    
    private var memoizedCardsByTech: [String: [PreparedApptCard]] {
        let calendar = Calendar.current
        let startOfDaySevenAM = calendar.date(bySettingHour: 7, minute: 0, second: 0, of: currentDate) ?? currentDate
        let isOfficeOrAdmin = sessionManager.currentUser?.accountType == .admin || sessionManager.currentUser?.accountType == .office
        let appts = isOfficeOrAdmin ? scheduleStore.appointments(for: .officeStaff) : scheduleStore.appointments(for: sessionManager.currentUser?.dispatchGroup ?? .applianceTechs)
        let activeTechs = technicians
        
        var result: [String: [PreparedApptCard]] = [:]
        for tech in activeTechs {
            let techAppts = appts.filter { appt in
                guard calendar.isDate(appt.startDate, inSameDayAs: currentDate) else { return false }
                guard let assigned = appt.assignedTech, !assigned.isEmpty else { return false }
                return assigned == tech || assigned.localizedCaseInsensitiveContains(tech) || tech.localizedCaseInsensitiveContains(assigned)
            }
            
            var cards: [PreparedApptCard] = []
            for appt in techAppts {
                let startMin = calendar.dateComponents([.minute], from: startOfDaySevenAM, to: appt.startDate).minute ?? 0
                let endMin = calendar.dateComponents([.minute], from: startOfDaySevenAM, to: appt.endDate).minute ?? 0
                
                guard endMin > 0 && startMin < 600 else { continue }
                
                let clampedStart = max(0, startMin)
                let clampedEnd = min(600, endMin)
                let offset = CGFloat(clampedStart) * (40.0 / 30.0)
                let height = max(24, CGFloat(clampedEnd - clampedStart) * (40.0 / 30.0))
                
                let customer = customerStore.customers.first(where: {
                    $0.id == appt.customerId || ($0.name == appt.customerName && appt.customerName != nil)
                })
                let custName = customer?.displayName ?? appt.displayCustomerName
                
                let (displayStreet, displayCityStateZip): (String, String) = {
                    if let loc = appt.locationAddress?.trimmingCharacters(in: .whitespacesAndNewlines), !loc.isEmpty {
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
                        let csz = (address.city.isEmpty && address.state.isEmpty) ? "" : "\(address.city), \(address.state) \(address.zipCode)".trimmingCharacters(in: .whitespaces)
                        return (address.street, csz)
                    }
                    return ("", "")
                }()
                
                cards.append(PreparedApptCard(
                    appt: appt,
                    customerName: custName,
                    street: displayStreet,
                    cityStateZip: displayCityStateZip,
                    designation: appt.jobTypeBadge,
                    offset: offset,
                    height: height
                ))
            }
            result[tech] = cards
        }
        return result
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Custom Date Picker/Navigation Header (Swipeable Date Header with Slide-Out & Fade-In Animations)
            HStack {
                Button(action: { showDatePicker = true }) {
                    Text(formattedDate(currentDate))
                        .font(.title3.weight(.bold))
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
            .padding(.vertical, 16)
            
            let cardsMap = memoizedCardsByTech
            
            // Grid View with fixed narrow Time and horizontal scroll for Tech columns
            GeometryReader { geometry in
                let columnWidth = max(95.0, (geometry.size.width - 48.0) / 3.0)
                
                ScrollView(.vertical, showsIndicators: false) {
                    HStack(spacing: 0) {
                        // 1. Time Column
                        VStack(spacing: 0) {
                            // Header spacer matching tech columns
                            Color.murphysCardBackground
                                .frame(width: 48, height: 44)
                                .overlay(
                                    Rectangle()
                                        .fill(Color.secondary.opacity(0.25))
                                        .frame(width: 0.5),
                                    alignment: .trailing
                                )
                                .overlay(
                                    Rectangle()
                                        .fill(Color.secondary.opacity(0.25))
                                        .frame(height: 0.5),
                                    alignment: .bottom
                                )
                            
                            ForEach(0..<20) { slot in
                                let hour = 7 + slot / 2
                                let isHalfHour = slot % 2 == 1
                                
                                HStack {
                                    if !isHalfHour {
                                        Text(formatHour(hour))
                                            .font(.caption2.weight(.semibold))
                                            .foregroundColor(.secondary)
                                            .padding(.leading, 6)
                                    }
                                    Spacer()
                                }
                                .frame(width: 48, height: 40)
                                .overlay(
                                    Rectangle()
                                        .fill(Color.secondary.opacity(isHalfHour ? 0.12 : 0.25))
                                        .frame(height: 0.5),
                                    alignment: .top
                                )
                                .overlay(
                                    Rectangle()
                                        .fill(Color.secondary.opacity(0.25))
                                        .frame(width: 0.5),
                                    alignment: .trailing
                                )
                            }
                        }
                        .frame(width: 48)
                        
                        // 2. Tech Columns area (Horizontally Scrollable)
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 0) {
                                ForEach(technicians, id: \.self) { tech in
                                    VStack(spacing: 0) {
                                        // Column Header
                                        Text(tech)
                                            .font(.caption.weight(.bold))
                                            .foregroundColor(Color.blue)
                                            .frame(width: columnWidth, height: 44)
                                            .background(Color.murphysCardBackground)
                                            .overlay(
                                                Rectangle()
                                                    .fill(Color.secondary.opacity(0.25))
                                                    .frame(height: 0.5),
                                                alignment: .top
                                            )
                                            .overlay(
                                                Rectangle()
                                                    .fill(Color.secondary.opacity(0.25))
                                                    .frame(height: 0.5),
                                                alignment: .bottom
                                            )
                                            .overlay(
                                                Rectangle()
                                                    .fill(Color.secondary.opacity(0.25))
                                                    .frame(width: 0.5),
                                                alignment: .trailing
                                            )
                                        
                                        // Grid slots with Overlaid Cards
                                        ZStack(alignment: .topLeading) {
                                            // Grid lines
                                            VStack(spacing: 0) {
                                                ForEach(0..<20) { slot in
                                                    let isHalfHour = slot % 2 == 1
                                                    Rectangle()
                                                        .fill(Color.clear)
                                                        .frame(width: columnWidth, height: 40)
                                                        .overlay(
                                                            Rectangle()
                                                                .fill(Color.secondary.opacity(isHalfHour ? 0.12 : 0.25))
                                                                .frame(height: 0.5),
                                                            alignment: .top
                                                        )
                                                        .overlay(
                                                            Rectangle()
                                                                .fill(Color.secondary.opacity(0.25))
                                                                .frame(width: 0.5),
                                                            alignment: .trailing
                                                        )
                                                }
                                            }
                                            .overlay(
                                                Rectangle()
                                                    .fill(Color.secondary.opacity(0.25))
                                                    .frame(height: 0.5),
                                                alignment: .bottom
                                            )
                                            
                                            // Appointments for this Tech
                                            let techCards = cardsMap[tech] ?? []
                                            ForEach(techCards) { card in
                                                NavigationLink(destination: AppointmentDetailScreen(appointment: card.appt)) {
                                                    AppointmentGridCard(
                                                        name: card.customerName,
                                                        street: card.street,
                                                        cityStateZip: card.cityStateZip,
                                                        designation: card.designation,
                                                        tripColor: card.appt.tripSemanticColor,
                                                        width: columnWidth - 8,
                                                        height: card.height - 4
                                                    )
                                                }
                                                .buttonStyle(PlainButtonStyle())
                                                .offset(x: 4, y: card.offset + 2)
                                            }
                                        }
                                        .frame(width: columnWidth, height: CGFloat(20 * 40))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        .background(Color.murphysSystemBackground)
        .navigationTitle("Schedule")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .interactiveDismissDisabled(true)
        #endif
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(action: { dismiss() }) {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
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
    
    private func formatHour(_ hour: Int) -> String {
        let h = hour > 12 ? hour - 12 : hour
        let ampm = hour >= 12 ? "pm" : "am"
        return "\(h)\(ampm)"
    }
}

struct AppointmentGridCard: View {
    let name: String
    let street: String
    let cityStateZip: String
    let designation: String
    let tripColor: Color
    let width: CGFloat
    let height: CGFloat
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .top, spacing: 4) {
                Text(name)
                    .font(.caption.weight(.bold))
                    .foregroundColor(tripColor)
                    .lineLimit(1)
                
                Spacer(minLength: 0)
                
                if !designation.isEmpty {
                    Text(designation)
                        .font(.caption2.weight(.bold))
                        .foregroundColor(tripColor)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(tripColor.opacity(0.22))
                        .cornerRadius(4)
                }
            }
            
            if height >= 36 && (!street.isEmpty || !cityStateZip.isEmpty) {
                VStack(alignment: .leading, spacing: 1) {
                    if !street.isEmpty {
                        Text(street)
                            .font(.caption2)
                            .foregroundColor(tripColor.opacity(0.95))
                            .lineLimit(2)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if height >= 48 && !cityStateZip.isEmpty {
                        Text(cityStateZip)
                            .font(.caption2)
                            .foregroundColor(tripColor.opacity(0.95))
                            .lineLimit(1)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            
            Spacer(minLength: 0)
        }
        .padding(6)
        .frame(width: width, height: height, alignment: .topLeading)
        .background(
            ZStack {
                Color.murphysCardBackground
                tripColor.opacity(0.35)
            }
        )
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(tripColor.opacity(0.85), lineWidth: 1.5)
        )
    }
}


