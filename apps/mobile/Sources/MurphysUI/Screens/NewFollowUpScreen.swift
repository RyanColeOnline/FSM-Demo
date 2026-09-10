import SwiftUI

public struct NewFollowUpScreen: View {
    @Environment(\.dismiss) var dismiss
    @Environment(FollowUpStore.self) var followUpStore
    
    var appointment: Appointment?
    var followUpToEdit: FollowUpItem? = nil
    
    @State var followUpType: String = "Select"
    @State var assignee: String = "Select"
    @State var dueDate: Date = Date()
    @State var jobNote: String = ""
    
    @FocusState var isNoteFocused: Bool
    @State var activeTimestamp: Date? = nil
    @State var isSending: Bool = false
    @State var showCheckmarkAnimation: Bool = false
    
    let followUpTypes = [
        "Awaiting call back",
        "General",
        "HW Work Complete/Bill out",
        "Need more info",
        "Need Quote/Autho",
        "Order now",
        "Part order",
        "Parts in",
        "Parts ordered",
        "Parts ready for PU",
        "Register equipment",
        "Return Part/Bill LTD",
        "Return visit needed",
        "Waiting approval"
    ]
    let assignees = ["Justin Lung", "Alex Rivera", "Bob Vance", "Charlie Green", "Unassigned"]
    
    public init(appointment: Appointment? = nil, followUpToEdit: FollowUpItem? = nil) {
        self.appointment = appointment
        self.followUpToEdit = followUpToEdit
        
        if let editItem = followUpToEdit {
            _followUpType = State(initialValue: editItem.type)
            _assignee = State(initialValue: editItem.assignee)
            _dueDate = State(initialValue: editItem.dueDate)
            _jobNote = State(initialValue: editItem.note)
            _activeTimestamp = State(initialValue: editItem.dateCreated)
        }
    }
    
    var isFormValid: Bool {
        followUpType != "Select" && !followUpType.isEmpty
    }
    
    private var apptNumberString: String {
        if let editItem = followUpToEdit {
            return editItem.jobNumber.hasPrefix("#") ? editItem.jobNumber : "#\(editItem.jobNumber)"
        } else if let appt = appointment {
            return appt.formattedJobNumber
        } else {
            return "#140010"
        }
    }
    
    private var formattedCreatedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy h:mma"
        if let editItem = followUpToEdit {
            return formatter.string(from: editItem.dateCreated)
        }
        return formatter.string(from: Date())
    }
    
    public var body: some View {
        List {
            Section(footer: Group {
                if let editItem = followUpToEdit {
                    HStack {
                        Spacer()
                        Text("Created by: \(editItem.sender) - \(formattedCreatedDate)")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                            .padding(.top, 8)
                        Spacer()
                    }
                }
            }) {
                // 1. Follow-Up Type (Required - Compact height)
                HStack {
                    Text("Follow-Up Type")
                        .font(.callout)
                        .foregroundColor(.primary)
                    Spacer()
                    Menu {
                        ForEach(followUpTypes, id: \.self) { type in
                            Button {
                                followUpType = type
                            } label: {
                                HStack {
                                    Text(type)
                                        .font(.callout)
                                    if followUpType == type {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(followUpType)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.vertical, 1)
                .frame(minHeight: 32)
                
                // 2. Assignee (Compact height)
                HStack {
                    Text("Assignee")
                        .font(.callout)
                        .foregroundColor(.primary)
                    Spacer()
                    Menu {
                        ForEach(assignees, id: \.self) { person in
                            Button {
                                assignee = person
                            } label: {
                                HStack {
                                    Text(person)
                                        .font(.callout)
                                    if assignee == person {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(assignee)
                                .font(.callout)
                                .foregroundColor(.secondary)
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.vertical, 1)
                .frame(minHeight: 32)
                
                // 3. Due Date (Compact height)
                DatePicker("Due Date", selection: $dueDate, displayedComponents: .date)
                    .font(.callout)
                    .padding(.vertical, 1)
                    .frame(minHeight: 32)
                
                // 4. Note (text field 3 lines deep with active cursor timestamp)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Note")
                        .font(.callout)
                        .foregroundColor(.primary)
                    
                    if let timestamp = activeTimestamp {
                        Text("\(followUpToEdit?.sender ?? SessionManager.shared.currentUser?.name ?? "Justin Lung") • \(formattedTimestamp(for: timestamp))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .transition(.opacity)
                    }
                    
                    TextEditor(text: $jobNote)
                        .focused($isNoteFocused)
                        .frame(height: 72)
                        .font(.callout)
                        .padding(.leading, -5)
                        .padding(.top, 2)
                        #if os(iOS)
                        .scrollContentBackground(.hidden)
                        #endif
                        .background(Color.clear)
                        .onChange(of: isNoteFocused) { _, newValue in
                            if newValue && activeTimestamp == nil {
                                withAnimation {
                                    activeTimestamp = Date()
                                }
                            }
                        }
                }
                .padding(.vertical, 4)
            }
            .listRowBackground(Color.murphysCardBackground)
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #endif
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            #if os(iOS)
            ToolbarItem(placement: .topBarLeading) {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.subheadline.weight(.semibold))
                }
                .disabled(isSending)
            }
            
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(followUpToEdit != nil ? "Edit Follow-Up" : "New Follow-Up")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(apptNumberString)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: { handleSend() }) {
                    Image(systemName: "checkmark")
                        .font(.subheadline.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.circle)
                .disabled(!isFormValid || isSending)
            }
            #else
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { handleSend() }
                    .disabled(!isFormValid || isSending)
            }
            #endif
        }
        .overlay {
            if isSending {
                ZStack {
                    Rectangle()
                        .fill(.ultraThinMaterial)
                        .overlay(Color.black.opacity(0.25))
                        .ignoresSafeArea()
                    
                    VStack {
                        Spacer().frame(height: 70)
                        
                        VStack(spacing: 16) {
                            Image(systemName: "paperplane.fill")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 44, height: 44)
                                .foregroundColor(.blue)
                                .scaleEffect(showCheckmarkAnimation ? 1.0 : 0.3)
                                .rotationEffect(.degrees(showCheckmarkAnimation ? 0 : -25))
                                .opacity(showCheckmarkAnimation ? 1.0 : 0.0)
                            
                            Text("Follow-Up Sent")
                                .font(.headline.weight(.semibold))
                                .foregroundColor(.primary)
                                .opacity(showCheckmarkAnimation ? 1.0 : 0.0)
                        }
                        .padding(.horizontal, 32)
                        .padding(.vertical, 24)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(Color.murphysCardBackground)
                                .shadow(color: Color.black.opacity(0.2), radius: 16, x: 0, y: 8)
                        )
                        
                        Spacer()
                    }
                }
                .transition(.opacity)
            }
        }
    }
    
    private func handleSend() {
        withAnimation(.easeOut(duration: 0.25)) {
            isSending = true
        }
        withAnimation(.spring(response: 0.45, dampingFraction: 0.7).delay(0.1)) {
            showCheckmarkAnimation = true
        }
        
        let jn: Int = {
            if let editItem = followUpToEdit {
                let cleaned = editItem.jobNumber.replacingOccurrences(of: "#", with: "")
                return Int(cleaned) ?? 140019
            } else if let appt = appointment {
                return appt.jobNumber
            }
            return 140019
        }()
        
        var notesList: [FlagNoteEntry] = []
        if !jobNote.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            notesList.append(FlagNoteEntry(author: followUpToEdit?.sender ?? SessionManager.shared.currentUser?.name ?? "Justin Lung", text: jobNote))
        }
        
        let flag = FollowUpFlag(
            id: followUpToEdit?.id ?? UUID(),
            jobId: appointment?.id,
            jobNumber: jn,
            customerId: appointment?.customerId,
            customerName: appointment?.assignedTech ?? "Customer",
            followUpType: followUpType,
            reason: jobNote,
            assignedTo: assignee,
            dueDate: dueDate,
            notes: notesList
        )
        
        Task {
            await FollowUpStore.shared.saveFollowUp(flag)
            try? await Task.sleep(nanoseconds: 800_000_000)
            dismiss()
        }
    }
    
    private func formattedTimestamp(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
