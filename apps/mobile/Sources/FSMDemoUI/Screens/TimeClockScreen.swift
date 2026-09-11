import SwiftUI
import Foundation

public struct TimeClockScreen: View {
    @Environment(ScheduleStore.self) var scheduleStore
    var sessionManager = SessionManager.shared
    
    public init() {}
    
    private var userInitials: String {
        let name = sessionManager.currentUser?.name ?? "Justin Lung"
        let components = name.split(separator: " ").filter { !$0.isEmpty }
        if components.count >= 2 {
            let first = components[0].prefix(1)
            let last = components[components.count - 1].prefix(1)
            return "\(first)\(last)".uppercased()
        } else if let single = components.first {
            return String(single.prefix(2)).uppercased()
        }
        return "JL"
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // 1. Top Card Module (User Profile, Floating Timer & Animated Action Buttons)
                ZStack(alignment: .topTrailing) {
                    // Floating Digital Timer in Top Right Corner
                    if scheduleStore.isClockedIn {
                        Text(scheduleStore.elapsedTimeString)
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(.secondary)
                            .padding(.top, 14)
                            .padding(.trailing, 28)
                    }
                    
                    HStack(alignment: .center, spacing: 14) {
                        // Left: Profile Initials Avatar & Labels
                        VStack(alignment: .center, spacing: 6) {
                            ZStack(alignment: .bottomTrailing) {
                                ZStack {
                                    Circle()
                                        .fill(Color(red: 10/255.0, green: 25/255.0, blue: 55/255.0))
                                        .frame(width: 54, height: 54)
                                    
                                    Text(userInitials)
                                        .font(.headline.weight(.bold))
                                        .foregroundColor(.white)
                                }
                                .overlay(
                                    Circle()
                                        .stroke(scheduleStore.isClockedIn ? Color.green : Color.red, lineWidth: 2)
                                )
                                
                                Circle()
                                    .fill(scheduleStore.isClockedIn ? Color.green : Color.red)
                                    .frame(width: 12, height: 12)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.white, lineWidth: 1.5)
                                    )
                            }
                            
                            VStack(alignment: .center, spacing: 2) {
                                Text(sessionManager.currentUser?.name ?? "Justin Lung")
                                    .font(.subheadline.weight(.bold))
                                    .foregroundColor(.primary)
                                Text(sessionManager.currentUser?.dispatchGroup.displayName ?? "Appliance Techs")
                                    .font(.caption.weight(.medium))
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        // Right: Animated Action Buttons (Smooth scaling and fade animation)
                        HStack(spacing: 8) {
                            if !scheduleStore.isClockedIn {
                                Button(action: {
                                    withAnimation(.easeInOut(duration: 0.3)) {
                                        let _ = _Concurrency.Task {
                                            await scheduleStore.toggleClockInStatus()
                                        }
                                    }
                                }) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "play.fill")
                                            .font(.footnote.weight(.bold))
                                        Text("Clock In")
                                            .font(.footnote.weight(.bold))
                                    }
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 11)
                                    .background(Color.green)
                                    .cornerRadius(12)
                                    .shadow(color: Color.green.opacity(0.25), radius: 6, x: 0, y: 3)
                                }
                                .buttonStyle(PlainButtonStyle())
                            } else {
                                Button(action: {
                                    withAnimation(.easeInOut(duration: 0.3)) {
                                        let _ = _Concurrency.Task {
                                            await scheduleStore.toggleBreakStatus()
                                        }
                                    }
                                }) {
                                    HStack(spacing: 5) {
                                        Image(systemName: scheduleStore.isOnBreak ? "play.fill" : "cup.and.saucer.fill")
                                            .font(.caption.weight(.bold))
                                        Text(scheduleStore.isOnBreak ? "End Break" : "Take Break")
                                            .font(.caption.weight(.bold))
                                    }
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 10)
                                    .background(Color.orange)
                                    .cornerRadius(12)
                                    .shadow(color: Color.orange.opacity(0.25), radius: 6, x: 0, y: 3)
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                Button(action: {
                                    withAnimation(.easeInOut(duration: 0.3)) {
                                        let _ = _Concurrency.Task {
                                            await scheduleStore.toggleClockInStatus()
                                        }
                                    }
                                }) {
                                    HStack(spacing: 5) {
                                        Image(systemName: "stop.fill")
                                            .font(.caption.weight(.bold))
                                        Text("Clock Out")
                                            .font(.caption.weight(.bold))
                                    }
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 10)
                                    .background(Color.red)
                                    .cornerRadius(12)
                                    .shadow(color: Color.red.opacity(0.25), radius: 6, x: 0, y: 3)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .transition(.opacity.combined(with: .scale(scale: 0.96)))
                    }
                    .padding(.horizontal, 30)
                    .padding(.vertical, 18)
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(18)
                .shadow(color: Color.black.opacity(0.02), radius: 4, x: 0, y: 2)
                
                // 2. "My Week" Module (Scrollable Daily View, Weekends Excluded)
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("My Week")
                            .font(.callout.weight(.bold))
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    
                    Divider()
                    
                    // Compact Scrollable Daily View
                    if currentWeekEntries.isEmpty {
                        Text("No time entries for this week")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 24)
                    } else {
                        ScrollView {
                            VStack(spacing: 6) {
                                ForEach(currentWeekEntries, id: \.date) { entry in
                                    HStack {
                                        HStack(spacing: 6) {
                                            Text(entry.day)
                                                .font(.footnote.weight(.bold))
                                                .foregroundColor(.primary)
                                            Text(entry.date)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Text(entry.times)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        
                                        Text(entry.hrs)
                                            .font(.footnote.weight(.bold))
                                            .foregroundColor(.primary)
                                            .frame(width: 55, alignment: .trailing)
                                    }
                                    .padding(.vertical, 7)
                                    .padding(.horizontal, 10)
                                    .background(Color.secondary.opacity(0.04))
                                    .cornerRadius(8)
                                }
                            }
                        }
                        .frame(maxHeight: 180)
                    }
                }
                .padding(16)
                .background(Color.murphysCardBackground)
                .cornerRadius(18)
                .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 3)
                
                // 3. Grouped Table Menu (Timesheets)
                VStack(spacing: 0) {
                    NavigationLink(destination: TimesheetsHistoryStubScreen()) {
                        HStack(spacing: 12) {
                            Image(systemName: "document.badge.clock")
                                .font(.body)
                                .foregroundColor(.indigo)
                                .frame(width: 24, alignment: .center)
                            Text("Timesheets")
                                .font(.body)
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
            .padding(.horizontal)
            .padding(.vertical, 16)
        }
        .navigationTitle("Time Clock")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .background(Color.murphysGroupedBackground)
    }
    
    private var currentWeekEntries: [(day: String, date: String, times: String, hrs: String)] {
        var entries: [(day: String, date: String, times: String, hrs: String)] = []
        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "EEE"
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM d"
        let timeFormatter = DateFormatter()
        timeFormatter.timeStyle = .short
        
        if let session = scheduleStore.activeClockInSession {
            let day = dayFormatter.string(from: session.clockInTime)
            let date = dateFormatter.string(from: session.clockInTime)
            let inStr = timeFormatter.string(from: session.clockInTime)
            let diff = max(0, Date().timeIntervalSince(session.clockInTime))
            let hrsStr = String(format: "%.1f hrs", diff / 3600.0)
            entries.append((day: day, date: date, times: "\(inStr) - Active", hrs: hrsStr))
        }
        return entries
    }
}

// MARK: - Timesheets History View with Pay Period Selector, Scrollable Daily My Week & Period Summary
struct TimesheetsHistoryStubScreen: View {
    @Environment(ScheduleStore.self) var scheduleStore
    @State var selectedMode: String = "Pay Period"
    @State var startDate: Date = Calendar.current.date(byAdding: .day, value: -14, to: Date()) ?? Date()
    @State var endDate: Date = Date()
    
    @State var payPeriodOffset: Int = 0
    let payPeriods = [
        (offset: -3, label: "Jun 7 - Jun 20, 2026"),
        (offset: -2, label: "Jun 21 - Jul 4, 2026"),
        (offset: -1, label: "Jul 5 - Jul 18, 2026"),
        (offset: 0, label: "Jul 19 - Aug 1, 2026")
    ]
    
    let options = ["Pay Period", "Date Range"]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 1. Two-Option Slider (Pay Period vs Date Range)
                Picker("View Mode", selection: Binding(
                    get: { selectedMode },
                    set: { newMode in
                        withAnimation(.easeInOut(duration: 0.25)) {
                            selectedMode = newMode
                        }
                    }
                )) {
                    ForEach(options, id: \.self) { opt in
                        Text(opt).tag(opt)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 4)
                
                // 2. Pay Period Selector or Date Range Card
                if selectedMode == "Pay Period" {
                    HStack {
                        Button(action: {
                            if payPeriodOffset > -3 {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    payPeriodOffset -= 1
                                }
                            }
                        }) {
                            Image(systemName: "chevron.backward.circle.fill")
                                .font(.title2)
                                .foregroundStyle(payPeriodOffset > -3 ? Color.blue : Color.gray.opacity(0.35))
                        }
                        .disabled(payPeriodOffset <= -3)
                        .buttonStyle(PlainButtonStyle())
                        
                        Spacer()
                        
                        Text(payPeriods.first(where: { $0.offset == payPeriodOffset })?.label ?? "Jul 19 - Aug 1, 2026")
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Button(action: {
                            if payPeriodOffset < 0 {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    payPeriodOffset += 1
                                }
                            }
                        }) {
                            Image(systemName: "chevron.forward.circle.fill")
                                .font(.title2)
                                .foregroundStyle(payPeriodOffset < 0 ? Color.blue : Color.gray.opacity(0.35))
                        }
                        .disabled(payPeriodOffset >= 0)
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(18)
                    .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 3)
                    .transition(.opacity.combined(with: .scale(scale: 0.96, anchor: .top)))
                } else {
                    // Singular card module for Date Range pickers (labels centered on top)
                    HStack(spacing: 0) {
                        CustomCompactDatePicker(label: "From", selection: $startDate)
                        CustomCompactDatePicker(label: "To", selection: $endDate)
                    }
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(18)
                    .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 3)
                    .transition(.opacity.combined(with: .scale(scale: 0.96, anchor: .top)))
                }
                
                // 3. "Period Details" Module (Scrollable Daily View, Weekends Excluded)
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Period Details")
                            .font(.callout.weight(.bold))
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    
                    Divider()
                    
                    // Compact Scrollable Daily View
                    if computedDailyEntries.isEmpty {
                        Text("No timesheet entries for this period")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.vertical, 24)
                    } else {
                        ScrollView {
                            VStack(spacing: 6) {
                                ForEach(computedDailyEntries, id: \.date) { entry in
                                    HStack {
                                        HStack(spacing: 6) {
                                            Text(entry.day)
                                                .font(.footnote.weight(.bold))
                                                .foregroundColor(.primary)
                                            Text(entry.date)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        
                                        Spacer()
                                        
                                        Text(entry.times)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                        
                                        Text(entry.hrs)
                                            .font(.footnote.weight(.bold))
                                            .foregroundColor(.primary)
                                            .frame(width: 55, alignment: .trailing)
                                    }
                                    .padding(.vertical, 7)
                                    .padding(.horizontal, 10)
                                    .background(Color.secondary.opacity(0.04))
                                    .cornerRadius(8)
                                }
                            }
                        }
                        .frame(maxHeight: 180)
                    }
                }
                .padding(16)
                .background(Color.murphysCardBackground)
                .cornerRadius(18)
                .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 3)
                
                // 4. Period Summary Module (Includes Total Hours row at bottom)
                VStack(alignment: .leading, spacing: 14) {
                    Text("Period Summary")
                        .font(.callout.weight(.bold))
                        .foregroundColor(.primary)
                    
                    Divider()
                    
                    VStack(spacing: 12) {
                        let summaryRows = [
                            ("Hours Worked", "0.0 hrs"),
                            ("Break", "0.0 hrs"),
                            ("Overtime", "0.0 hrs"),
                            ("PTO", "0.0 hrs"),
                            ("Sick", "0.0 hrs")
                        ]
                        
                        ForEach(summaryRows, id: \.0) { label, value in
                            LabeledContent(label, value: value)
                                .font(.subheadline)
                        }
                        
                        Divider()
                        
                        LabeledContent("Total Hours", value: "0.0 hrs")
                            .font(.callout.weight(.bold))
                    }
                }
                .padding(18)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            .padding(16)
        }
        .navigationTitle("Timesheets")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .background(Color.murphysGroupedBackground)
    }
    
    var computedDailyEntries: [(day: String, date: String, times: String, hrs: String)] {
        if true {
            return []
        }
        if selectedMode == "Pay Period" {
            return [
                ("Mon", "Jul 20", "8:00 AM - 4:30 PM", "8.0 hrs"),
                ("Tue", "Jul 21", "8:00 AM - 4:30 PM", "8.0 hrs"),
                ("Wed", "Jul 22", "8:00 AM - 4:30 PM", "8.0 hrs"),
                ("Thu", "Jul 23", "8:00 AM - 4:30 PM", "8.0 hrs"),
                ("Fri", "Jul 24", "8:00 AM - 4:30 PM", "8.0 hrs"),
                ("Mon", "Jul 27", "8:00 AM - 4:30 PM", "8.0 hrs"),
                ("Tue", "Jul 28", "8:00 AM - 5:00 PM", "8.5 hrs"),
                ("Wed", "Jul 29", "8:00 AM - 4:30 PM", "8.0 hrs"),
                ("Thu", "Jul 30", "8:00 AM - 4:30 PM", "8.0 hrs"),
                ("Fri", "Jul 31", "8:00 AM - 4:30 PM", "8.0 hrs")
            ]
        } else {
            var result: [(String, String, String, String)] = []
            let calendar = Calendar.current
            let start = calendar.startOfDay(for: startDate)
            let end = calendar.startOfDay(for: endDate)
            var current = start
            
            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "EEE"
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "MMM d"
            
            while current <= end {
                let weekday = calendar.component(.weekday, from: current)
                if weekday != 1 && weekday != 7 {
                    let dayStr = dayFormatter.string(from: current)
                    let dateStr = dateFormatter.string(from: current)
                    result.append((dayStr, dateStr, "8:00 AM - 4:30 PM", "8.0 hrs"))
                }
                guard let next = calendar.date(byAdding: .day, value: 1, to: current) else { break }
                current = next
            }
            if result.isEmpty {
                let dayStr = dayFormatter.string(from: startDate)
                let dateStr = dateFormatter.string(from: startDate)
                result.append((dayStr, dateStr, "8:00 AM - 4:30 PM", "8.0 hrs"))
            }
            return result
        }
    }
}
