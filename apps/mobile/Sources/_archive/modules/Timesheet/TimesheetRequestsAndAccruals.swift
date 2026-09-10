import SwiftUI
import Foundation

// MARK: - Models for Time Off Requests
enum RequestStatus: String, Codable, CaseIterable {
    case pending = "Pending"
    case approved = "Approved"
    case denied = "Denied"
    
    var backgroundColor: Color {
        switch self {
        case .pending: return Color(red: 255/255.0, green: 251/255.0, blue: 235/255.0) // bg-amber-50
        case .approved: return Color(red: 236/255.0, green: 253/255.0, blue: 245/255.0) // bg-emerald-50
        case .denied: return Color(red: 254/255.0, green: 242/255.0, blue: 242/255.0) // bg-red-50
        }
    }
    
    var textColor: Color {
        switch self {
        case .pending: return Color(red: 180/255.0, green: 83/255.0, blue: 9/255.0) // text-amber-700
        case .approved: return Color(red: 4/255.0, green: 120/255.0, blue: 87/255.0) // text-emerald-700
        case .denied: return Color(red: 185/255.0, green: 28/255.0, blue: 28/255.0) // text-red-700
        }
    }
    
    var borderColor: Color {
        switch self {
        case .pending: return Color(red: 253/255.0, green: 230/255.0, blue: 138/255.0) // border-amber-200
        case .approved: return Color(red: 167/255.0, green: 243/255.0, blue: 208/255.0) // border-emerald-200
        case .denied: return Color(red: 254/255.0, green: 202/255.0, blue: 202/255.0) // border-red-200
        }
    }
}

struct TimeOffRequest: Identifiable {
    let id = UUID()
    var type: String
    var startDate: Date
    var endDate: Date
    var status: RequestStatus
    var notes: String?
    var hasAttachment: Bool = false
    
    var dateRangeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        if Calendar.current.isDate(startDate, inSameDayAs: endDate) {
            return formatter.string(from: startDate)
        }
        return "\(formatter.string(from: startDate)) - \(formatter.string(from: endDate))"
    }
}

// MARK: - Request Detail Page
struct RequestDetailScreen: View {
    @Environment(\.dismiss) var dismiss
    let request: TimeOffRequest
    var onDelete: (() -> Void)? = nil
    var isReadOnly: Bool = false
    @State var showDeleteConfirmation = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(spacing: 14) {
                    HStack {
                        Text(request.type)
                            .font(.title3.weight(.bold))
                            .foregroundColor(.primary)
                        Spacer()
                        
                        Text(request.status.rawValue)
                            .font(.caption.weight(.bold))
                            .foregroundColor(request.status.textColor)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(request.status.backgroundColor)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(request.status.borderColor, lineWidth: 1)
                            )
                            .cornerRadius(6)
                    }
                    
                    Divider()
                    
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Dates:")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(request.dateRangeString)
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(.primary)
                        }
                        
                        if let notes = request.notes, !notes.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Notes:")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                Text(notes)
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                            }
                        }
                    }
                }
                .padding(18)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                if !isReadOnly && request.status == .pending {
                    Button(role: .destructive, action: {
                        showDeleteConfirmation = true
                    }) {
                        Text("Delete Request")
                            .font(.headline.weight(.semibold))
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                    }
                    .confirmationDialog("Delete Request", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
                        Button("Delete Request", role: .destructive) {
                            onDelete?()
                            dismiss()
                        }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        Text("Are you sure you want to delete this time off request?")
                    }
                }
            }
            .padding(16)
        }
        .navigationTitle("Request Details")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .background(Color.murphysGroupedBackground)
    }
}

// MARK: - Past Requests History
struct PastRequestsScreen: View {
    let requests: [TimeOffRequest]
    
    var body: some View {
        List {
            ForEach(requests) { req in
                NavigationLink(destination: RequestDetailScreen(request: req, isReadOnly: true)) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(req.type)
                                .font(.headline)
                            Spacer()
                            Text(req.status.rawValue)
                                .font(.caption.weight(.bold))
                                .foregroundColor(req.status.textColor)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(req.status.backgroundColor)
                                .cornerRadius(6)
                        }
                        Text(req.dateRangeString)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Past Requests")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

// MARK: - Timesheet Requests Main Hub Screen
struct TimesheetRequestsStubScreen: View {
    @State var requests: [TimeOffRequest] = [
        TimeOffRequest(
            type: "Vacation",
            startDate: Calendar.current.date(byAdding: .day, value: 5, to: Date()) ?? Date(),
            endDate: Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date(),
            status: .pending,
            notes: "Family trip."
        ),
        TimeOffRequest(
            type: "Sick Leave",
            startDate: Calendar.current.date(byAdding: .day, value: -10, to: Date()) ?? Date(),
            endDate: Calendar.current.date(byAdding: .day, value: -10, to: Date()) ?? Date(),
            status: .approved,
            notes: "Doctor appointment."
        ),
        TimeOffRequest(
            type: "PTO",
            startDate: Calendar.current.date(byAdding: .day, value: -25, to: Date()) ?? Date(),
            endDate: Calendar.current.date(byAdding: .day, value: -24, to: Date()) ?? Date(),
            status: .denied,
            notes: "Staffing shortage."
        )
    ]
    
    @State var isPresentingAddSheet = false
    @State var selectedDetent: PresentationDetent = .fraction(0.55)
    @State var editingRequest: TimeOffRequest? = nil
    
    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                // 1. Time Off Balances Module
                HStack(spacing: 12) {
                    TimeOffBalanceCardView(title: "Vacation", available: "80.0 hrs", used: "40.0 hrs")
                    TimeOffBalanceCardView(title: "Sick Leave", available: "40.0 hrs", used: "8.0 hrs")
                }
                
                // 2. Recent Requests Module
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Recent Requests")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.primary)
                        Spacer()
                        NavigationLink(destination: PastRequestsScreen(requests: requests)) {
                            Text("View All")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.blue)
                        }
                    }
                    
                    Divider()
                    
                    VStack(spacing: 8) {
                        ForEach(requests.prefix(3)) { req in
                            NavigationLink(destination: RequestDetailScreen(request: req, onDelete: {
                                if let idx = requests.firstIndex(where: { $0.id == req.id }) {
                                    requests.remove(at: idx)
                                }
                            })) {
                                RecentRequestRowView(req: req)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
                .padding(16)
                .background(Color.murphysCardBackground)
                .cornerRadius(18)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            .padding(16)
        }
        .navigationTitle("Requests")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: {
                    editingRequest = nil
                    selectedDetent = .fraction(0.55)
                    isPresentingAddSheet = true
                }) {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundColor(.blue)
                }
            }
        }
        .sheet(isPresented: $isPresentingAddSheet) {
            AddTimeOffRequestSheet(selectedDetent: $selectedDetent, editingRequest: editingRequest) { newRequest in
                requests.insert(newRequest, at: 0)
            }
        }
        #endif
        .background(Color.murphysGroupedBackground)
    }
}

// MARK: - Recent Request Row View
struct RecentRequestRowView: View {
    let req: TimeOffRequest
    
    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                Text(req.type)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.primary)
                Text(req.dateRangeString)
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text(req.status.rawValue)
                .font(.caption.weight(.bold))
                .foregroundColor(req.status.textColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(req.status.backgroundColor)
                .cornerRadius(6)
            
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundColor(.secondary.opacity(0.5))
        }
        .padding(12)
        .background(Color.secondary.opacity(0.04))
        .cornerRadius(12)
    }
}

// MARK: - Time Off Balance Card View
struct TimeOffBalanceCardView: View {
    let title: String
    let available: String
    let used: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondary)
            Text(available)
                .font(.title2.weight(.bold))
                .foregroundColor(.primary)
            HStack(spacing: 4) {
                Text("Used:")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Text(used)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(.secondary)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.murphysCardBackground)
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.02), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Add Time Off Request Sheet
struct AddTimeOffRequestSheet: View {
    @Environment(\.dismiss) var dismiss
    @Binding var selectedDetent: PresentationDetent
    var editingRequest: TimeOffRequest? = nil
    var onSubmit: (TimeOffRequest) -> Void
    
    @State var selectedType: String = "Vacation"
    @State var startDate: Date = Date()
    @State var endDate: Date = Date()
    @State var notes: String = ""
    
    let types = ["Vacation", "Sick Leave", "PTO", "Personal"]
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Request Type")) {
                    Picker("Type", selection: $selectedType) {
                        ForEach(types, id: \.self) { t in
                            Text(t).tag(t)
                        }
                    }
                }
                
                Section(header: Text("Dates")) {
                    DatePicker("Start Date", selection: $startDate, displayedComponents: [.date])
                    DatePicker("End Date", selection: $endDate, displayedComponents: [.date])
                }
                
                Section(header: Text("Notes (Optional)")) {
                    TextField("Reason or details", text: $notes)
                }
            }
            .navigationTitle("New Request")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") {
                        let req = TimeOffRequest(
                            type: selectedType,
                            startDate: startDate,
                            endDate: endDate,
                            status: .pending,
                            notes: notes.isEmpty ? nil : notes
                        )
                        onSubmit(req)
                        dismiss()
                    }
                }
            }
            #endif
        }
        .presentationDetents([.medium, .large])
    }
}

// MARK: - Accruals Screen
struct AccrualsScreen: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // 1. PTO Module
                VStack(alignment: .leading, spacing: 14) {
                    Text("Paid Time Off (PTO)")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Divider()
                    
                    VStack(spacing: 12) {
                        HStack {
                            Text("Accrued YTD")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("120.0 hrs")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                        
                        HStack {
                            Text("Used YTD")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("40.0 hrs")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                        
                        Divider()
                        
                        HStack {
                            Text("Total Available")
                                .font(.callout.weight(.bold))
                                .foregroundColor(.primary)
                            Spacer()
                            Text("80.0 hrs")
                                .font(.callout.weight(.bold))
                                .foregroundColor(.primary)
                        }
                    }
                }
                .padding(18)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                
                // 2. Sick Leave Module
                VStack(alignment: .leading, spacing: 14) {
                    Text("Sick Leave")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Divider()
                    
                    VStack(spacing: 12) {
                        HStack {
                            Text("Accrued YTD")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("40.0 hrs")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                        
                        HStack {
                            Text("Used YTD")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("0.0 hrs")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                        
                        Divider()
                        
                        HStack {
                            Text("Total Available")
                                .font(.callout.weight(.bold))
                                .foregroundColor(.primary)
                            Spacer()
                            Text("40.0 hrs")
                                .font(.callout.weight(.bold))
                                .foregroundColor(.primary)
                        }
                    }
                }
                .padding(18)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            .padding(16)
        }
        .navigationTitle("Accruals")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .background(Color.murphysGroupedBackground)
    }
}
