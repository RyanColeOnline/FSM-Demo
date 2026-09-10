import SwiftUI

public struct EventUsersSelectionScreen: View {
    @Environment(\.dismiss) var dismiss
    @Binding var selectedUsers: Set<String>
    
    let dispatchGroups: [DispatchGroupCategory] = DispatchGroupCategory.allCases
    
    public init(selectedUsers: Binding<Set<String>>) {
        self._selectedUsers = selectedUsers
    }
    
    private var allEmployees: [String] {
        dispatchGroups.flatMap { $0.technicians }
    }
    
    private func isGroupSelected(_ group: DispatchGroupCategory) -> Bool {
        !group.technicians.isEmpty && group.technicians.allSatisfy { selectedUsers.contains($0) }
    }
    
    private func toggleGroup(_ group: DispatchGroupCategory) {
        if isGroupSelected(group) {
            for emp in group.technicians {
                selectedUsers.remove(emp)
            }
        } else {
            for emp in group.technicians {
                selectedUsers.insert(emp)
            }
        }
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header Bar showing selected count and Clear option (transparent/grouped background)
            HStack {
                Text("Selected: \(selectedUsers.count)")
                    .font(.callout.weight(.medium))
                    .foregroundColor(.primary)
                Spacer()
                if !selectedUsers.isEmpty {
                    Button("Clear") {
                        selectedUsers.removeAll()
                    }
                    .font(.callout.weight(.medium))
                    .foregroundColor(.blue)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.murphysGroupedBackground)
            
            Divider()
            
            List {
                // Section 1: DISPATCH GROUPS
                Section(header: Text("DISPATCH GROUPS")
                    .font(.footnote.weight(.bold))
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)) {
                    ForEach(dispatchGroups, id: \.id) { group in
                        Button {
                            toggleGroup(group)
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: isGroupSelected(group) ? "checkmark.circle.fill" : "circle")
                                    .font(.callout)
                                    .foregroundColor(isGroupSelected(group) ? .blue : .secondary.opacity(0.4))
                                Text(group.displayName)
                                    .font(.callout.weight(.medium))
                                    .foregroundColor(.primary)
                                Spacer()
                            }
                            .frame(height: 24)
                            #if true
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                
                // Section 2: INDIVIDUAL EMPLOYEES
                Section(header: Text("INDIVIDUAL EMPLOYEES")
                    .font(.footnote.weight(.bold))
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)) {
                    ForEach(allEmployees, id: \.self) { employee in
                        Button {
                            if selectedUsers.contains(employee) {
                                selectedUsers.remove(employee)
                            } else {
                                selectedUsers.insert(employee)
                            }
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: selectedUsers.contains(employee) ? "checkmark.circle.fill" : "circle")
                                    .font(.callout)
                                    .foregroundColor(selectedUsers.contains(employee) ? .blue : .secondary.opacity(0.4))
                                Text(employee)
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                            }
                            .frame(height: 24)
                            #if true
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            .listStyle(.plain)
            .background(Color.murphysGroupedBackground)
        }
        .navigationTitle("Select Users")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    dismiss()
                }
                .font(.subheadline.weight(.medium))
            }
        }
    }
}

public struct AddOtherEventScreen: View {
    @Environment(\.dismiss) var dismiss
    
    @State var eventName: String = ""
    @State var dateTime: Date = Date()
    @State var duration: String = "30 mins"
    @State var frequency: String = "One time"
    @State var placeArea: String = ""
    @State var selectedUsers: Set<String> = []
    @State var descriptionText: String = ""
    @State var eventType: String = ""
    @State var selectedColor: String = "Blue"
    @State var showUnsavedChangesAlert: Bool = false
    
    let durations = ["15 mins", "30 mins", "45 mins", "1.00 Hour", "1.50 Hours", "2.00 Hours", "3.00 Hours", "4.00 Hours", "All Day"]
    let frequencies = ["One time", "Daily", "Weekly", "Bi-weekly", "Monthly", "Yearly"]
    let eventTypes = ["Meeting", "Personal", "Training", "Maintenance", "Break", "Other"]
    let colorsList = ["Blue", "Green", "Orange", "Purple", "Red", "Grey"]
    
    public init() {}
    
    var isFormValid: Bool {
        !eventName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !selectedUsers.isEmpty &&
        !eventType.isEmpty
    }
    
    var isFormDirty: Bool {
        !eventName.isEmpty ||
        !descriptionText.isEmpty ||
        !placeArea.isEmpty ||
        !selectedUsers.isEmpty ||
        duration != "30 mins" ||
        frequency != "One time" ||
        !eventType.isEmpty ||
        selectedColor != "Blue"
    }
    
    var selectedUsersSummary: String {
        if selectedUsers.isEmpty {
            return "Select"
        } else {
            return "\(selectedUsers.count) Selected"
        }
    }
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                eventDetailsSection
                scheduleTimeSection
                locationUserSection
                classificationSection
            }
            .padding(16)
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
        .navigationTitle("Add Other Event")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(isFormDirty)
        #endif
        .toolbar {
            if isFormDirty {
                #if os(iOS)
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showUnsavedChangesAlert = true
                    } label: {
                        Image(systemName: "xmark")
                            .font(.body.weight(.medium))
                            .foregroundColor(.primary)
                    }
                }
                #endif
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    dismiss()
                }
                .font(.subheadline.weight(.medium))
                .disabled(!isFormValid)
            }
        }
        .alert("Discard Unsaved Changes?", isPresented: $showUnsavedChangesAlert) {
            Button("Discard", role: .destructive) {
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("You have unsaved changes. Are you sure you want to discard them?")
        }
    }
    
    // MARK: - Subviews
    @ViewBuilder
    private var eventDetailsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("EVENT DETAILS")
                .font(.footnote.weight(.bold))
                .foregroundColor(.secondary)
                .textCase(.uppercase)
                .padding(.horizontal, 4)
            
            VStack(spacing: 0) {
                HStack {
                    Text("Event Name")
                        .font(.callout)
                        .foregroundColor(.primary)
                        .frame(width: 110, alignment: .leading)
                    TextField("Enter event name", text: $eventName)
                        .font(.callout)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.trailing)
                }
                .padding(14)
                
                Divider().padding(.horizontal, 14)
                
                HStack {
                    Text("Description")
                        .font(.callout)
                        .foregroundColor(.primary)
                        .frame(width: 110, alignment: .leading)
                    TextField("Enter description", text: $descriptionText)
                        .font(.callout)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.trailing)
                }
                .padding(14)
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }
    
    @ViewBuilder
    private var scheduleTimeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SCHEDULE & TIME")
                .font(.footnote.weight(.bold))
                .foregroundColor(.secondary)
                .textCase(.uppercase)
                .padding(.horizontal, 4)
            
            VStack(spacing: 0) {
                DatePicker("Date & Start Time", selection: $dateTime, displayedComponents: [.date, .hourAndMinute])
                    .font(.callout)
                    .padding(14)
                
                Divider().padding(.horizontal, 14)
                
                HStack {
                    Text("Event Duration")
                        .font(.callout)
                        .foregroundColor(.primary)
                    Spacer()
                    Menu {
                        ForEach(durations, id: \.self) { d in
                            Button(d) { duration = d }
                        }
                    } label: {
                        HStack {
                            Text(duration)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(14)
                
                Divider().padding(.horizontal, 14)
                
                HStack {
                    Text("Frequency")
                        .font(.callout)
                        .foregroundColor(.primary)
                    Spacer()
                    Menu {
                        ForEach(frequencies, id: \.self) { f in
                            Button(f) { frequency = f }
                        }
                    } label: {
                        HStack {
                            Text(frequency)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(14)
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }
    
    @ViewBuilder
    private var locationUserSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("LOCATION & USER")
                .font(.footnote.weight(.bold))
                .foregroundColor(.secondary)
                .textCase(.uppercase)
                .padding(.horizontal, 4)
            
            VStack(spacing: 0) {
                HStack {
                    Text("Place/Area")
                        .font(.callout)
                        .foregroundColor(.primary)
                        .frame(width: 110, alignment: .leading)
                    TextField("Enter location / area", text: $placeArea)
                        .font(.callout)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.trailing)
                }
                .padding(14)
                
                Divider().padding(.horizontal, 14)
                
                NavigationLink(destination: EventUsersSelectionScreen(selectedUsers: $selectedUsers)) {
                    HStack {
                        Text("Users")
                            .font(.callout)
                            .foregroundColor(.primary)
                        Spacer()
                        Text(selectedUsersSummary)
                            .font(.callout)
                            .foregroundColor(.secondary)
                        Image(systemName: "chevron.right")
                            .font(.footnote.weight(.semibold))
                            .foregroundColor(.secondary.opacity(0.4))
                    }
                    .padding(14)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }
    
    @ViewBuilder
    private var classificationSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("CLASSIFICATION")
                .font(.footnote.weight(.bold))
                .foregroundColor(.secondary)
                .textCase(.uppercase)
                .padding(.horizontal, 4)
            
            VStack(spacing: 0) {
                HStack {
                    Text("Event Type")
                        .font(.callout)
                        .foregroundColor(.primary)
                    Spacer()
                    Menu {
                        ForEach(eventTypes, id: \.self) { t in
                            Button(t) { eventType = t }
                        }
                    } label: {
                        HStack {
                            Text(eventType.isEmpty ? "Select" : eventType)
                                .font(.callout)
                                .foregroundColor(eventType.isEmpty ? .secondary : .primary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(14)
                
                Divider().padding(.horizontal, 14)
                
                HStack {
                    Text("Color")
                        .font(.callout)
                        .foregroundColor(.primary)
                    Spacer()
                    Menu {
                        ForEach(colorsList, id: \.self) { c in
                            Button(c) { selectedColor = c }
                        }
                    } label: {
                        HStack {
                            Text(selectedColor)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(14)
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }
}
