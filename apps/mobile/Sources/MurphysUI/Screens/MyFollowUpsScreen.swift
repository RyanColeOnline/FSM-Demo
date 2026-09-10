import SwiftUI

public struct FollowUpItem: Identifiable, Hashable {
    public let id = UUID()
    public var type: String
    public var sender: String
    public var assignee: String
    public var jobNumber: String
    public var appointmentNumber: String
    public var customerName: String
    public var note: String
    public var dateCreated: Date
    public var dueDate: Date
    public var isCompleted: Bool = false
    
    public init(type: String, sender: String, assignee: String, jobNumber: String, appointmentNumber: String = "#140010", customerName: String, note: String, dateCreated: Date, dueDate: Date, isCompleted: Bool = false) {
        self.type = type
        self.sender = sender
        self.assignee = assignee
        self.jobNumber = jobNumber
        self.appointmentNumber = appointmentNumber
        self.customerName = customerName
        self.note = note
        self.dateCreated = dateCreated
        self.dueDate = dueDate
        self.isCompleted = isCompleted
    }
}

public struct MyFollowUpsScreen: View {
    @Environment(CustomerStore.self) var customerStore
    @Environment(ScheduleStore.self) var scheduleStore
    
    enum FollowUpTab: String, CaseIterable {
        case received = "Received"
        case completed = "Completed"
    }
    
    @State var selectedTab: FollowUpTab = .received
    
    @State var followUps: [FollowUpItem] = []
    
    @State var itemToDelete: FollowUpItem? = nil
    @State var showDeleteAlert: Bool = false
    @State var activeFollowUpItem: FollowUpItem? = nil
    @State var startInEditMode: Bool = false
    @State var completingItemID: UUID? = nil
    
    public init() {}
    
    var filteredFollowUps: [FollowUpItem] {
        switch selectedTab {
        case .received:
            return followUps.filter { !$0.isCompleted }
        case .completed:
            return followUps.filter { $0.isCompleted }
        }
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Two-option slider (Received / Completed)
            Picker("Follow-Ups Filter", selection: $selectedTab) {
                ForEach(FollowUpTab.allCases, id: \.self) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 4)
            .background(Color.murphysGroupedBackground)
            
            // Flag List wrapped in NavigationLinks
            if filteredFollowUps.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "flag.slash")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 48, height: 48)
                        .foregroundColor(.secondary)
                    Text("No \(selectedTab.rawValue) Follow-Ups")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, minHeight: 300)
                .background(Color.murphysGroupedBackground)
            } else {
                List {
                    ForEach(filteredFollowUps) { item in
                        NavigationLink(destination: FollowUpDetailScreen(item: item, startInEditMode: false, onToggleComplete: {
                            toggleComplete(for: item)
                        }, onUpdate: { updated in
                            if let idx = followUps.firstIndex(where: { $0.id == updated.id }) {
                                followUps[idx] = updated
                            }
                        })) {
                            AnimatedFollowUpRowView(item: item, isCompleting: completingItemID == item.id)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            switch selectedTab {
                            case .received:
                                Button(role: .destructive) {
                                    itemToDelete = item
                                    showDeleteAlert = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                
                                Button {
                                    startInEditMode = true
                                    activeFollowUpItem = item
                                } label: {
                                    Label("Edit", systemImage: "pencil")
                                }
                                .tint(.blue)
                                
                                Button {
                                    toggleComplete(for: item)
                                } label: {
                                    Label("Complete", systemImage: "checkmark.circle")
                                }
                                .tint(.green)
                                
                            case .completed:
                                Button(role: .destructive) {
                                    itemToDelete = item
                                    showDeleteAlert = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                
                                Button {
                                    toggleComplete(for: item)
                                } label: {
                                    Label("Reopen", systemImage: "arrow.uturn.backward")
                                }
                                .tint(.green)
                            }
                        }
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .move(edge: .bottom)),
                            removal: .opacity.combined(with: .move(edge: .top))
                        ))
                    }
                }
                .padding(.top, -4)
                #if true
                .listStyle(.insetGrouped)
                #endif
            }
        }
        .navigationTitle("My Follow-Ups")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .onAppear {
            loadFollowUps()
            Task {
                await FollowUpStore.shared.fetchFollowUps()
                loadFollowUps()
            }
        }
        .sheet(item: $activeFollowUpItem) { item in
            NavigationStack {
                FollowUpDetailScreen(
                    item: item,
                    startInEditMode: startInEditMode,
                    onToggleComplete: {
                        toggleComplete(for: item)
                    },
                    onUpdate: { updated in
                        if let idx = followUps.firstIndex(where: { $0.id == updated.id }) {
                            followUps[idx] = updated
                        }
                    }
                )
            }
        }
        .alert("Delete Follow-Up?", isPresented: $showDeleteAlert, presenting: itemToDelete) { item in
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                deleteFollowUp(item)
            }
        } message: { item in
            Text("Are you sure you want to delete the follow-up for \(item.customerName)?")
        }
    }
    
    private func loadFollowUps() {
        self.followUps = FollowUpStore.shared.followUps.map { flag in
            FollowUpItem(
                type: flag.followUpType,
                sender: flag.notes.first?.author ?? SessionManager.shared.currentUser?.name ?? "Justin Lung",
                assignee: flag.assignedTo,
                jobNumber: "#\(flag.jobNumber)",
                appointmentNumber: "#\(flag.jobNumber)",
                customerName: flag.customerName,
                note: flag.reason,
                dateCreated: flag.notes.first?.timestamp ?? Date(),
                dueDate: flag.dueDate,
                isCompleted: flag.isComplete
            )
        }
    }
    
    private func toggleComplete(for item: FollowUpItem) {
        if !item.isCompleted {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                completingItemID = item.id
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
                withAnimation(.easeInOut(duration: 0.45)) {
                    completingItemID = nil
                    if let index = followUps.firstIndex(where: { $0.id == item.id }) {
                        followUps[index].isCompleted.toggle()
                    }
                    scheduleStore.unflagAppointment(jobNumber: item.jobNumber)
                    updateStoreForCompletion(item: item, isComplete: true)
                }
            }
        } else {
            withAnimation(.easeInOut(duration: 0.45)) {
                if let index = followUps.firstIndex(where: { $0.id == item.id }) {
                    followUps[index].isCompleted.toggle()
                }
                updateStoreForCompletion(item: item, isComplete: false)
            }
        }
    }
    
    private func updateStoreForCompletion(item: FollowUpItem, isComplete: Bool) {
        let cleanJob = Int(item.jobNumber.replacingOccurrences(of: "#", with: "")) ?? 140010
        Task {
            await FollowUpStore.shared.toggleFollowUp(jobNumber: cleanJob, isComplete: isComplete)
        }
    }
    
    private func deleteFollowUp(_ item: FollowUpItem) {
        followUps.removeAll(where: { $0.id == item.id })
        scheduleStore.unflagAppointment(jobNumber: item.jobNumber)
        let cleanJob = Int(item.jobNumber.replacingOccurrences(of: "#", with: "")) ?? 140010
        FollowUpStore.shared.deleteFollowUp(jobNumber: cleanJob)
    }
}

struct FollowUpRowCard: View {
    var item: FollowUpItem
    
    private var formattedDueDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: item.dueDate)
    }
    
    private var derivedJobNum: String {
        if item.appointmentNumber.contains("-") {
            let prefix = item.appointmentNumber.components(separatedBy: "-").first?.trimmingCharacters(in: .whitespaces) ?? item.jobNumber
            return prefix.hasPrefix("#") ? prefix : "#\(prefix)"
        } else if !item.jobNumber.isEmpty {
            return item.jobNumber.hasPrefix("#") ? item.jobNumber : "#\(item.jobNumber)"
        } else {
            return "#140010"
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            // Line 1: Customer Name (with topTrailing overlay for right-stacked header)
            HStack(spacing: 6) {
                Text(item.customerName)
                    .font(.callout.weight(.semibold))
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .topTrailing) {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(item.type)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    
                    Text(formattedDueDate)
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
                .padding(.trailing, -22)
            }
            
            // Line 2: Appt # (Exact 22pt spacing below Customer Name)
            Text(derivedJobNum)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.secondary)
            
            // Line 3: Note Body Snippet (Exact 22pt spacing below Appt #, aligned right to -22)
            Text(item.note)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.trailing, -22)
        }
        .padding(.vertical, 4)
    }
}

struct FollowUpNoteModuleCard: View {
    var initialAuthor: String
    var initialDate: Date
    var initialNoteText: String
    
    @Binding var addedNotes: [NoteItem]
    @FocusState.Binding var focusedNoteID: UUID?
    @State var showNoteDeleteConfirmation: Bool = false
    @State var noteToDelete: NoteItem? = nil
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy h:mma"
        return formatter.string(from: initialDate)
    }
    
    private var isActivelyTyping: Bool {
        addedNotes.contains(where: { $0.isEditing })
    }
    
    private func noteTextBinding(for idx: Int) -> Binding<String> {
        Binding(
            get: { idx < addedNotes.count ? addedNotes[idx].text : "" },
            set: { newValue in
                if idx < addedNotes.count {
                    addedNotes[idx].text = newValue
                }
            }
        )
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Initial Creation Note
            VStack(alignment: .leading, spacing: 6) {
                Text("\(initialAuthor) - \(formattedDate)")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary)
                
                Text(initialNoteText)
                    .font(.callout)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.leading)
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 20)
            .frame(maxWidth: .infinity, alignment: .leading)
            
            Divider().padding(.horizontal, 20)
            
            // Added Notes Loop (Matching Notes Page in Customer Section)
            ForEach(Array(addedNotes.enumerated()), id: \.element.id) { idx, note in
                VStack(spacing: 0) {
                    if note.isEditing {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(note.author) - \(formattedDate)")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary)
                            
                            #if true
                            TextField("Add a note...", text: noteTextBinding(for: idx), axis: .vertical)
                            .focused($focusedNoteID, equals: note.id)
                            .lineLimit(1...10)
                            .font(.callout)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                            .onAppear {
                                focusedNoteID = note.id
                            }
                            #else
                            TextField("Add a note...", text: noteTextBinding(for: idx))
                            .focused($focusedNoteID, equals: note.id)
                            .font(.callout)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                            .onAppear {
                                focusedNoteID = note.id
                            }
                            #endif
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 20)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    } else {
                        SwipeableNoteRow {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("\(note.author) - \(formattedDate)")
                                    .font(.caption.weight(.bold))
                                    .foregroundColor(.secondary)
                                
                                Text(note.text)
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                    .multilineTextAlignment(.leading)
                            }
                            .padding(.vertical, 16)
                            .padding(.horizontal, 20)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        } onEdit: {
                            withAnimation(.easeInOut) {
                                if idx < addedNotes.count {
                                    addedNotes[idx].savedText = addedNotes[idx].text
                                    addedNotes[idx].isEditing = true
                                }
                            }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                focusedNoteID = note.id
                            }
                        } onDelete: {
                            noteToDelete = note
                            showNoteDeleteConfirmation = true
                        }
                        .confirmationDialog(
                            "Delete Note",
                            isPresented: Binding(
                                get: { showNoteDeleteConfirmation && noteToDelete?.id == note.id },
                                set: { if !$0 { showNoteDeleteConfirmation = false; noteToDelete = nil } }
                            ),
                            titleVisibility: .visible
                        ) {
                            Button("Delete Note", role: .destructive) {
                                withAnimation {
                                    addedNotes.removeAll(where: { $0.id == note.id })
                                    noteToDelete = nil
                                    showNoteDeleteConfirmation = false
                                }
                            }
                            Button("Cancel", role: .cancel) {
                                noteToDelete = nil
                                showNoteDeleteConfirmation = false
                            }
                        } message: {
                            Text("Are you sure you want to delete this note entry?")
                        }
                    }
                    
                    Divider().padding(.horizontal, 20)
                }
            }
            
            // Add Note Button
            Button(action: {
                guard !isActivelyTyping else { return }
                let newNote = NoteItem(author: "Justin Lung", dateStarted: Date(), text: "", isEditing: true, isNewDraft: true)
                withAnimation(.easeInOut) {
                    addedNotes.append(newNote)
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    focusedNoteID = newNote.id
                }
            }) {
                HStack(spacing: 12) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(isActivelyTyping ? .secondary.opacity(0.4) : .green)
                        .font(.title3)
                    Text("add note")
                        .font(.callout)
                        .foregroundColor(isActivelyTyping ? .secondary : .primary)
                    Spacer()
                }
                .padding(.vertical, 16)
                .padding(.horizontal, 20)
                #if os(iOS)
                .contentShape(Rectangle())
                #endif
            }
            .buttonStyle(PlainButtonStyle())
            .disabled(isActivelyTyping)
        }
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 3)
    }
}

struct FollowUpDetailScreen: View {
    @State var item: FollowUpItem
    var onToggleComplete: (() -> Void)? = nil
    var onUpdate: ((FollowUpItem) -> Void)? = nil
    
    @Environment(CustomerStore.self) var customerStore
    @Environment(\.dismiss) var dismiss
    
    @State var isCompleted: Bool = false
    @State var addedNotes: [NoteItem] = []
    @FocusState var focusedNoteID: UUID?
    @State var showCompletionCheckmarkAnimation: Bool = false
    
    // In-place inline edit state
    @State var isEditingDetails: Bool = false
    @State var selectedType: String = ""
    @State var selectedAssignee: String = ""
    @State var selectedDueDate: Date = Date()
    
    let followUpTypeOptions = [
        "Parts ordered",
        "Awaiting call back",
        "Waiting approval",
        "Part Quote",
        "Proposal Approval",
        "Customer Callback",
        "Warranty Claim",
        "Return Visit"
    ]
    
    let assigneeOptions = [
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
    
    private var derivedJobNum: String {
        if item.appointmentNumber.contains("-") {
            let prefix = item.appointmentNumber.components(separatedBy: "-").first?.trimmingCharacters(in: .whitespaces) ?? item.jobNumber
            return prefix.hasPrefix("#") ? prefix : "#\(prefix)"
        } else if !item.jobNumber.isEmpty {
            return item.jobNumber.hasPrefix("#") ? item.jobNumber : "#\(item.jobNumber)"
        } else {
            return "#140010"
        }
    }
    
    public init(item: FollowUpItem, startInEditMode: Bool = false, onToggleComplete: (() -> Void)? = nil, onUpdate: ((FollowUpItem) -> Void)? = nil) {
        self._item = State(initialValue: item)
        self.onToggleComplete = onToggleComplete
        self.onUpdate = onUpdate
        self._isCompleted = State(initialValue: item.isCompleted)
        self._isEditingDetails = State(initialValue: startInEditMode)
        self._selectedType = State(initialValue: item.type)
        self._selectedAssignee = State(initialValue: item.assignee)
        self._selectedDueDate = State(initialValue: item.dueDate)
    }
    
    private var formattedCreatedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy h:mma"
        return formatter.string(from: item.dateCreated)
    }
    
    private var formattedDueDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: item.dueDate)
    }
    
    private var isActivelyTyping: Bool {
        focusedNoteID != nil || addedNotes.contains(where: { $0.isEditing })
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Section 1: Inset Grouped Table with Follow-Up Type, Assignee, Due Date & Centered Created Footnote
                VStack(spacing: 0) {
                    VStack(spacing: 0) {
                        // Row 1: Follow-Up Type
                        HStack {
                            Text("Follow-Up Type")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            if isEditingDetails {
                                Menu {
                                    ForEach(followUpTypeOptions, id: \.self) { opt in
                                        Button {
                                            selectedType = opt
                                        } label: {
                                            HStack {
                                                Text(opt)
                                                if selectedType == opt {
                                                    Image(systemName: "checkmark")
                                                }
                                            }
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(selectedType.isEmpty ? "Select Type" : selectedType)
                                            .font(.callout)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption.weight(.bold))
                                            .foregroundColor(.secondary.opacity(0.8))
                                    }
                                }
                            } else {
                                Text(item.type)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 16)
                        
                        Divider().padding(.horizontal, 16)
                        
                        // Row 2: Assignee
                        HStack {
                            Text("Assignee")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            if isEditingDetails {
                                Menu {
                                    ForEach(assigneeOptions, id: \.self) { tech in
                                        Button {
                                            selectedAssignee = tech
                                        } label: {
                                            HStack {
                                                Text(tech)
                                                if selectedAssignee == tech {
                                                    Image(systemName: "checkmark")
                                                }
                                            }
                                        }
                                    }
                                } label: {
                                    HStack(spacing: 4) {
                                        Text(selectedAssignee.isEmpty ? "Select Assignee" : selectedAssignee)
                                            .font(.callout)
                                            .foregroundColor(.secondary)
                                        Image(systemName: "chevron.up.chevron.down")
                                            .font(.caption.weight(.bold))
                                            .foregroundColor(.secondary.opacity(0.8))
                                    }
                                }
                            } else {
                                Text(item.assignee)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 16)
                        
                        Divider().padding(.horizontal, 16)
                        
                        // Row 3: Due Date
                        if isEditingDetails {
                            DatePicker("Due Date", selection: $selectedDueDate, displayedComponents: .date)
                                .font(.callout)
                                .padding(.vertical, 10)
                                .padding(.horizontal, 16)
                        } else {
                            HStack {
                                Text("Due Date")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(formattedDueDate)
                                    .font(.callout)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 16)
                        }
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    
                    // Table Footnote (Centered under table)
                    HStack {
                        Spacer()
                        Text("Created by: \(item.sender) - \(formattedCreatedDate)")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                            .padding(.top, 8)
                        Spacer()
                    }
                }
                
                // Section 2: Identical Customer Section Note Module Card
                FollowUpNoteModuleCard(
                    initialAuthor: item.sender,
                    initialDate: item.dateCreated,
                    initialNoteText: item.note,
                    addedNotes: $addedNotes,
                    focusedNoteID: $focusedNoteID
                )
                
                // Action Buttons Row (Add Follow-Up Appointment & Complete side-by-side with equal size)
                HStack(spacing: 12) {
                    let matchedCustomer = customerStore.customers.first(where: { $0.name.lowercased() == item.customerName.lowercased() })
                    if let customer = matchedCustomer {
                        NavigationLink(destination: AppointmentAddScreen(customer: customer, initialJobNumber: item.jobNumber)) {
                            Text("Add Follow-Up Appt")
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.85)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 11)
                                .background(Color.blue)
                                .cornerRadius(10)
                        }
                        .buttonStyle(.plain)
                    } else {
                        NavigationLink(destination: CustomerListScreen(navigationTitle: "Select Customer", showSkipButton: false, isAppointmentFlow: true)) {
                            Text("Add Follow-Up Appt")
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.85)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 11)
                                .background(Color.blue)
                                .cornerRadius(10)
                        }
                        .buttonStyle(.plain)
                    }
                    
                    // Complete Button
                    Button(action: {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                            showCompletionCheckmarkAnimation = true
                        }
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                            onToggleComplete?()
                            withAnimation(.easeInOut(duration: 0.35)) {
                                showCompletionCheckmarkAnimation = false
                                dismiss()
                            }
                        }
                    }) {
                        ZStack {
                            Text(isCompleted ? "Completed" : "Complete")
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(.white)
                                .opacity(showCompletionCheckmarkAnimation ? 0 : 1)
                            
                            if showCompletionCheckmarkAnimation {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .transition(.scale.combined(with: .opacity))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 11)
                        .background(Color.green)
                        .cornerRadius(10)
                    }
                    .buttonStyle(.plain)
                }
                .disabled(isActivelyTyping)
                .opacity(isActivelyTyping ? 0.45 : 1.0)
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .navigationBarBackButtonHidden(isActivelyTyping)
        .toolbar {
            if isActivelyTyping {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        #if os(iOS)
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        #endif
                        focusedNoteID = nil
                        withAnimation(.easeInOut) {
                            if let editingIdx = addedNotes.firstIndex(where: { $0.isEditing }) {
                                if addedNotes[editingIdx].isNewDraft {
                                    addedNotes.remove(at: editingIdx)
                                } else {
                                    addedNotes[editingIdx].text = addedNotes[editingIdx].savedText
                                    addedNotes[editingIdx].isEditing = false
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "xmark")
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(.primary)
                    }
                }
            }
            
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Follow-Up Details")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(derivedJobNum)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            if isActivelyTyping {
                let activeNoteText = addedNotes.first(where: { $0.isEditing })?.text ?? ""
                let canSave = !activeNoteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        #if os(iOS)
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        #endif
                        focusedNoteID = nil
                        withAnimation(.easeInOut) {
                            for i in 0..<addedNotes.count {
                                if addedNotes[i].isEditing {
                                    addedNotes[i].savedText = addedNotes[i].text
                                    addedNotes[i].isNewDraft = false
                                    addedNotes[i].isEditing = false
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "checkmark")
                            .font(.subheadline.weight(.semibold))
                    }
                    #if true
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.circle)
                    #endif
                    .disabled(!canSave)
                }
            } else if isEditingDetails {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        item.type = selectedType
                        item.assignee = selectedAssignee
                        item.dueDate = selectedDueDate
                        onUpdate?(item)
                        withAnimation {
                            isEditingDetails = false
                        }
                    }
                    .font(.body.weight(.semibold))
                    .foregroundColor(.primary)
                }
            } else {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") {
                        selectedType = item.type
                        selectedAssignee = item.assignee
                        selectedDueDate = item.dueDate
                        withAnimation {
                            isEditingDetails = true
                        }
                    }
                    .font(.body)
                    .foregroundColor(.primary)
                }
            }
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

struct AnimatedFollowUpRowView: View {
    var item: FollowUpItem
    var isCompleting: Bool
    
    var body: some View {
        ZStack {
            FollowUpRowCard(item: item)
                .opacity(isCompleting ? 0.3 : 1.0)
            
            if isCompleting {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2.weight(.bold))
                        .foregroundColor(.green)
                    Text("Completed")
                        .font(.callout.weight(.bold))
                        .foregroundColor(.green)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Capsule().fill(Color.murphysCardBackground).shadow(color: Color.black.opacity(0.12), radius: 6, x: 0, y: 3))
                .transition(.scale(scale: 0.7).combined(with: .opacity))
            }
        }
    }
}
