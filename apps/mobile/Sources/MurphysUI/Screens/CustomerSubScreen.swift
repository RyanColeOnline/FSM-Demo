import SwiftUI
#if os(iOS)
import PhotosUI
import QuickLook
#endif


public struct SwipeableCardRow<Content: View>: View {
    let onDelete: () -> Void
    let content: Content
    
    @State var offset: CGFloat = 0
    @State var isSwiped: Bool = false
    
    public init(onDelete: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.onDelete = onDelete
        self.content = content()
    }
    
    public var body: some View {
        let maxOffset: CGFloat = -70
        ZStack(alignment: .trailing) {
            Color.murphysGroupedBackground
            
            HStack(spacing: 12) {
                Spacer()
                
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        offset = 0
                        isSwiped = false
                    }
                    onDelete()
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: "trash.fill")
                            .font(.callout.weight(.bold))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(Color.red)
                            .clipShape(Circle())
                        
                        Text("Delete")
                            .font(.caption2.weight(.medium))
                            .foregroundColor(.red)
                    }
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(.trailing, 16)
            .opacity(offset < -5 ? 1 : 0)
            
            content
                .background(Color.murphysCardBackground)
                .offset(x: offset)
                #if true
                .highPriorityGesture(
                    DragGesture(minimumDistance: 10, coordinateSpace: .local)
                        .onChanged { gesture in
                            if abs(gesture.translation.width) > abs(gesture.translation.height) {
                                if gesture.translation.width < 0 {
                                    let translation = gesture.translation.width
                                    offset = isSwiped ? max(translation + maxOffset, maxOffset) : max(translation, maxOffset)
                                } else if gesture.translation.width > 0 {
                                    offset = isSwiped ? min(gesture.translation.width + maxOffset, 0) : min(gesture.translation.width, 0)
                                }
                            }
                        }
                        .onEnded { gesture in
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                if gesture.translation.width < -30 {
                                    offset = maxOffset
                                    isSwiped = true
                                } else {
                                    offset = 0
                                    isSwiped = false
                                }
                            }
                        }
                )
                #endif
        }
        .clipped()
    }
}

public struct ContractorWarrantyEditScreen: View {
    @Environment(\.dismiss) var dismiss
    var customer: Customer
    var appointment: Appointment?
    var onSave: (ContractorWarrantyItem) -> Void
    
    @State var selectedWarrantyName: String = ""
    @State var warrantyDescription: String = ""
    @State var showDiscardAlert: Bool = false
    
    let availableWarranties: [(name: String, desc: String)] = [
        ("1-year Labor Warranty", "1 year warranty on labor"),
        ("1-Year Parts Warranty", "1 Year warranty on installed parts."),
        ("10 Year Manufacture Warranty", "10 year warranty rom the manufacture that covers the equipment from any defects."),
        ("Standard 1-Year Labor Warranty", "Covers all labor and installation craftsmanship for 1 full year from date of service."),
        ("Premium 5-Year Craftsmanship Warranty", "Extended coverage protecting all labor, ductwork, and structural fitting installations for 5 years.")
    ]
    
    public init(customer: Customer, appointment: Appointment? = nil, onSave: @escaping (ContractorWarrantyItem) -> Void) {
        self.customer = customer
        self.appointment = appointment
        self.onSave = onSave
    }
    
    public var body: some View {
        ZStack {
            Color.murphysGroupedBackground
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 16) {
                    VStack(spacing: 0) {
                        HStack {
                            Text("Warranty Name")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            Menu {
                                ForEach(availableWarranties, id: \.name) { item in
                                    Button(action: {
                                        selectedWarrantyName = item.name
                                        warrantyDescription = item.desc
                                    }) {
                                        HStack {
                                            Text(item.name)
                                            if selectedWarrantyName == item.name {
                                                Image(systemName: "checkmark")
                                            }
                                        }
                                    }
                                }
                            } label: {
                                HStack(spacing: 6) {
                                    Text(selectedWarrantyName.isEmpty ? "Select Warranty" : selectedWarrantyName)
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.secondary)
                                        .lineLimit(2)
                                        .multilineTextAlignment(.trailing)
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(.secondary.opacity(0.8))
                                }
                            }
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 16)
                        
                        if !selectedWarrantyName.isEmpty {
                            Divider()
                                .padding(.leading, 16)
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Description")
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                
                                Text(warrantyDescription)
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .multilineTextAlignment(.leading)
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                .padding(16)
            }
        }
        .alert("Discard Changes?", isPresented: $showDiscardAlert) {
            Button("Discard Changes", role: .destructive) {
                #if os(iOS)
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                #endif
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("None of your changes will be saved if you leave this page.")
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(action: {
                    #if os(iOS)
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    #endif
                    showDiscardAlert = true
                }) {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
            
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Contractor Warranties")
                        .font(.headline)
                        .lineLimit(1)
                        .foregroundColor(.primary)
                    Text(appointment?.formattedAppointmentNumber ?? customer.displayName)
                        .font(.caption.weight(.medium))
                        .lineLimit(1)
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    #if os(iOS)
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    #endif
                    if !selectedWarrantyName.isEmpty {
                        onSave(ContractorWarrantyItem(name: selectedWarrantyName, descriptionText: warrantyDescription))
                    }
                    dismiss()
                }
            }
        }
    }
}

public struct RebateEditScreen: View {
    @Environment(\.dismiss) var dismiss
    var rebateToEdit: RebateItem?
    var customer: Customer
    var appointment: Appointment?
    var onSave: (RebateItem) -> Void
    
    @State var rebateName: String
    @State var amount: String
    @State var descriptionText: String
    @State var initialName: String
    @State var initialAmount: String
    @State var initialDescription: String
    @State var showDiscardAlert: Bool = false
    @FocusState var isAmountFocused: Bool
    
    public init(rebate: RebateItem? = nil, customer: Customer, appointment: Appointment? = nil, onSave: @escaping (RebateItem) -> Void) {
        self.rebateToEdit = rebate
        self.customer = customer
        self.appointment = appointment
        self.onSave = onSave
        
        let initN = rebate?.name ?? ""
        let initA = rebate?.amount ?? ""
        let initD = rebate?.descriptionText ?? ""
        
        _rebateName = State(initialValue: initN)
        _amount = State(initialValue: initA)
        _descriptionText = State(initialValue: initD)
        _initialName = State(initialValue: initN)
        _initialAmount = State(initialValue: initA)
        _initialDescription = State(initialValue: initD)
    }
    
    public var body: some View {
        ZStack {
            Color.murphysGroupedBackground
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 16) {
                    VStack(spacing: 0) {
                        HStack {
                            Text("Rebate Name")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                                .frame(width: 120, alignment: .leading)
                            
                            TextField("Enter rebate name...", text: $rebateName)
                                .font(.callout.weight(.regular))
                                .multilineTextAlignment(.trailing)
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 16)
                        
                        Divider()
                            .padding(.leading, 16)
                        
                        HStack {
                            Text("Amount")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                                .frame(width: 120, alignment: .leading)
                            
                            TextField("$0.00", text: Binding(
                                get: { amount },
                                set: { newValue in
                                    if isAmountFocused {
                                        if newValue.isEmpty || !newValue.hasPrefix("$") {
                                            let cleaned = newValue.replacingOccurrences(of: "$", with: "").filter { $0.isNumber || $0 == "." }
                                            amount = "$" + cleaned
                                        } else {
                                            let cleaned = newValue.dropFirst().filter { $0.isNumber || $0 == "." }
                                            amount = "$" + cleaned
                                        }
                                    } else {
                                        amount = newValue
                                    }
                                }
                            ))
                            .font(.callout.weight(.regular))
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .focused($isAmountFocused)
                            .onChange(of: isAmountFocused) { _, focused in
                                if focused {
                                    if amount.isEmpty {
                                        amount = "$"
                                    }
                                } else {
                                    if amount == "$" {
                                        amount = ""
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 16)
                        
                        Divider()
                            .padding(.leading, 16)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Description")
                                .font(.callout.weight(.regular))
                                .foregroundColor(.primary)
                            
                            #if os(iOS)
                            TextField("Enter description...", text: $descriptionText, axis: .vertical)
                                .font(.callout.weight(.regular))
                                .lineLimit(2...4)
                            #else
                            TextEditor(text: $descriptionText)
                                .frame(height: 50)
                                .font(.callout.weight(.regular))
                            #endif
                        }
                        .padding(.vertical, 14)
                        .padding(.horizontal, 16)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                .padding(16)
            }
        }
        .alert("Discard Changes?", isPresented: $showDiscardAlert) {
            Button("Discard Changes", role: .destructive) {
                #if os(iOS)
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                #endif
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("None of your changes will be saved if you leave this page.")
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(action: {
                    #if os(iOS)
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    #endif
                    let hasChanges = (rebateName != initialName || amount != initialAmount || descriptionText != initialDescription)
                    if hasChanges {
                        showDiscardAlert = true
                    } else {
                        dismiss()
                    }
                }) {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
            
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Rebates")
                        .font(.headline)
                        .lineLimit(1)
                        .foregroundColor(.primary)
                    Text(appointment?.formattedAppointmentNumber ?? customer.displayName)
                        .font(.caption.weight(.medium))
                        .lineLimit(1)
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    #if os(iOS)
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    #endif
                    let item = RebateItem(
                        id: rebateToEdit?.id ?? UUID(),
                        name: rebateName.isEmpty ? "Rebate" : rebateName,
                        amount: amount,
                        descriptionText: descriptionText
                    )
                    onSave(item)
                    dismiss()
                }
            }
        }
    }
}

public struct ChecklistRunnerScreen: View {
    @Environment(\.dismiss) var dismiss
    @Environment(ChecklistStore.self) var checklistStore
    var template: ChecklistTemplateItem
    var customer: Customer
    var appointment: Appointment?
    var onSave: ((Int) -> Void)? = nil
    
    @State var checklistNotes: String = ""
    @State var savedSignatureLines: [SignatureLine] = []
    @State var selectedTechnician: String = "Justin Lung"
    @State var showDiscardAlert: Bool = false
    
    @State var steps: [ChecklistStepItem] = []
    
    public init(template: ChecklistTemplateItem, customer: Customer, appointment: Appointment? = nil, onSave: ((Int) -> Void)? = nil) {
        self.template = template
        self.customer = customer
        self.appointment = appointment
        self.onSave = onSave
        
        let initialSteps: [ChecklistStepItem]
        if !template.steps.isEmpty {
            initialSteps = template.steps
        } else {
            initialSteps = [
                ChecklistStepItem(
                    question: "Reclaim ALL Refrigerant?",
                    type: .selection,
                    options: ["Yes", "No"],
                    selectedOption: nil,
                    textInput: "",
                    isSkipped: false
                ),
                ChecklistStepItem(
                    question: "Refrigerant Type & Amount (lbs)",
                    type: .textInput,
                    options: [],
                    selectedOption: nil,
                    textInput: "",
                    isSkipped: false
                ),
                ChecklistStepItem(
                    question: "Condenser Coil & Blower Fan Cleaned?",
                    type: .selection,
                    options: ["Yes", "No", "N/A"],
                    selectedOption: nil,
                    textInput: "",
                    isSkipped: false
                ),
                ChecklistStepItem(
                    question: "Operating Pressure & Temperature Differential",
                    type: .textInput,
                    options: [],
                    selectedOption: nil,
                    textInput: "",
                    isSkipped: false
                ),
                ChecklistStepItem(
                    question: "Customer Verbal Sign-Off",
                    type: .selection,
                    options: ["Approved", "Pending Final Test"],
                    selectedOption: nil,
                    textInput: "",
                    isSkipped: false
                )
            ]
        }
        _steps = State(initialValue: initialSteps)
    }
    
    public var body: some View {
        ZStack {
            Color.murphysGroupedBackground
                .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 16) {
                    ForEach(Array(steps.enumerated()), id: \.element.id) { idx, _ in
                        stepCardView(idx: idx)
                    }
                    
                    // Bottom Notes Module (Identical to Create Invoice Page)
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Notes")
                            .font(.callout.weight(.regular))
                            .foregroundColor(.primary)
                        
                        TextEditor(text: $checklistNotes)
                            .frame(height: 80)
                            .font(.callout)
                            .padding(.horizontal, -4)
                            #if os(iOS)
                            .scrollContentBackground(.hidden)
                            #endif
                            .background(Color.clear)
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    
                    // Bottom Customer Signature & Completed By Module
                    bottomSignatureCard
                }
                .padding(16)
                .padding(.bottom, 30)
            }
        }
        .alert("Discard Changes?", isPresented: $showDiscardAlert) {
            Button("Discard Changes", role: .destructive) {
                #if os(iOS)
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                #endif
                dismiss()
            }
            Button("Keep Editing", role: .cancel) {}
        } message: {
            Text("None of your changes will be saved if you leave this page.")
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .tabBar)
        #endif
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(action: {
                    #if os(iOS)
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    #endif
                    showDiscardAlert = true
                }) {
                    Image(systemName: "chevron.left")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
            
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(template.title)
                        .font(.headline)
                        .lineLimit(1)
                        .foregroundColor(.primary)
                    Text(appointment?.formattedAppointmentNumber ?? "#140020")
                        .font(.caption.weight(.medium))
                        .lineLimit(1)
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    #if os(iOS)
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    #endif
                    let completed = steps.filter { $0.selectedOption != nil || !$0.textInput.trimmingCharacters(in: .whitespaces).isEmpty || $0.isSkipped }.count
                    let instance = ChecklistInstanceItem(
                        templateId: template.id,
                        jobId: appointment?.id,
                        jobNumber: appointment?.jobNumber,
                        customerId: customer.id,
                        appointmentId: appointment?.id,
                        title: template.title,
                        category: template.category,
                        isCompleted: completed == steps.count,
                        completedBy: selectedTechnician,
                        completedAt: Date(),
                        steps: steps
                    )
                    Task {
                        await ChecklistStore.shared.saveChecklistInstance(instance)
                        onSave?(completed)
                        dismiss()
                    }
                }
            }
        }
        #if os(iOS)
        .onAppear {
            OrientationManager.lockOrientation(.portrait)
        }
        #endif
    }
    
    private var bottomSignatureCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(savedSignatureLines.isEmpty ? "Customer Signature (Tap to Sign)" : "Customer Signature (Tap to Edit)")
                .font(.callout.weight(.regular))
                .foregroundColor(.primary)
            
            if !savedSignatureLines.isEmpty {
                List {
                    NavigationLink(destination: SignatureCaptureScreen(savedSignatureLines: $savedSignatureLines, formattedInvoiceNumber: appointment != nil ? "I-\(appointment!.rawJobNumberString)-01" : "I-140020-01")) {
                        #if true
                        Canvas { context, size in
                            let allPoints = savedSignatureLines.flatMap { $0.points }
                            let minX = allPoints.map { $0.x }.min() ?? 0
                            let maxX = allPoints.map { $0.x }.max() ?? 1
                            let minY = allPoints.map { $0.y }.min() ?? 0
                            let maxY = allPoints.map { $0.y }.max() ?? 1
                            let width = max(1, maxX - minX)
                            let height = max(1, maxY - minY)
                            let scaleX = (size.width - 16) / width
                            let scaleY = (size.height - 16) / height
                            let scale = min(scaleX, scaleY)
                            
                            for line in savedSignatureLines {
                                var path = Path()
                                if let first = line.points.first {
                                    let scaledFirst = CGPoint(x: (first.x - minX) * scale + 8, y: (first.y - minY) * scale + 8)
                                    path.move(to: scaledFirst)
                                    for pt in line.points.dropFirst() {
                                        let scaledPt = CGPoint(x: (pt.x - minX) * scale + 8, y: (pt.y - minY) * scale + 8)
                                        path.addLine(to: scaledPt)
                                    }
                                }
                                context.stroke(path, with: .color(Color.primary), lineWidth: 2)
                            }
                        }
                        .frame(height: 50)
                        #else
                        HStack {
                            Image(systemName: "signature")
                                .foregroundColor(.primary)
                            Text("Signature Attached")
                                .font(.callout)
                                .foregroundColor(.secondary)
                        }
                        #endif
                    }
                    .buttonStyle(PlainButtonStyle())
                    .listRowBackground(Color.murphysCardBackground)
                    #if true
                    .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
                    .listRowSeparator(.hidden)
                    #endif
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            savedSignatureLines = []
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        .tint(.red)
                    }
                }
                .listStyle(.plain)
                .frame(height: 54)
                .scrollDisabled(true)
            } else {
                NavigationLink(destination: SignatureCaptureScreen(savedSignatureLines: $savedSignatureLines, formattedInvoiceNumber: appointment != nil ? "I-\(appointment!.rawJobNumberString)-01" : "I-140020-01")) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2.weight(.semibold))
                        .foregroundColor(Color(red: 0.2, green: 0.78, blue: 0.35))
                }
            }
            
            Divider()
                .padding(.vertical, 2)
            
            HStack {
                Text("Completed By")
                    .font(.callout.weight(.regular))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Menu {
                    ForEach(["Justin Lung", "Minor Cover", "Wes Rykoskey", "Joe Colacino", "Robert Hudson", "Ethan Mitchell", "Andrew (Jr) Murphy", "Matt Curtsinger", "Jon Martin"], id: \.self) { tech in
                        Button(action: { selectedTechnician = tech }) {
                            HStack {
                                Text(tech)
                                if selectedTechnician == tech {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 6) {
                        Text(selectedTechnician)
                            .font(.callout.weight(.regular))
                            .foregroundColor(.secondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary.opacity(0.8))
                    }
                }
            }
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    @ViewBuilder
    private func stepCardView(idx: Int) -> some View {
        let step = steps[idx]
        
        VStack(alignment: .leading, spacing: step.isSkipped ? 0 : 18) {
            // Header Row: Question Title & Skip/Undo Button
            HStack(alignment: .center) {
                Text(step.question)
                    .font(.callout.weight(.regular))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        steps[idx].isSkipped.toggle()
                    }
                }) {
                    Text(step.isSkipped ? "Undo" : "Skip")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            if !step.isSkipped {
                if step.type == .selection {
                    // Configuration 1: Selectable List of Predetermined Items
                    VStack(alignment: .leading, spacing: 16) {
                        ForEach(step.options, id: \.self) { option in
                            HStack(spacing: 10) {
                                if step.selectedOption == option {
                                    Image(systemName: "checkmark")
                                        .font(.callout.weight(.bold))
                                        .foregroundColor(.blue)
                                        .frame(width: 20)
                                    Text(option)
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                } else {
                                    Color.clear
                                        .frame(width: 20, height: 20)
                                    Text(option)
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                }
                                
                                Spacer()
                            }
                            #if true
                            .contentShape(Rectangle())
                            #endif
                            .onTapGesture {
                                steps[idx].selectedOption = option
                            }
                        }
                    }
                } else if step.type == .textInput {
                    // Configuration 2: Text Entry Field
                    TextField("Enter details...", text: Binding(
                        get: { steps[idx].textInput },
                        set: { steps[idx].textInput = $0 }
                    ))
                    .font(.callout.weight(.regular))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.secondary.opacity(0.06))
                    .cornerRadius(10)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
}

public struct NewChecklistSelectionScreen: View {
    @Environment(\.dismiss) var dismiss
    @Environment(ChecklistStore.self) var checklistStore
    var customer: Customer
    var appointment: Appointment?
    var onSelect: (ChecklistTemplateItem) -> Void
    
    var availableChecklists: [ChecklistTemplateItem] {
        checklistStore.checklistTemplates
    }
    
    @State var selectedID: UUID?
    @State var activeTemplateToRun: ChecklistTemplateItem? = nil
    
    public init(customer: Customer, appointment: Appointment? = nil, onSelect: @escaping (ChecklistTemplateItem) -> Void) {
        self.customer = customer
        self.appointment = appointment
        self.onSelect = onSelect
        _selectedID = State(initialValue: nil)
    }
    
    public var body: some View {
        Group {
            if let templateRun = activeTemplateToRun {
                ChecklistRunnerScreen(template: templateRun, customer: customer, appointment: appointment, onSave: { completedCount in
                    let result = ChecklistTemplateItem(id: templateRun.id, title: templateRun.title, itemCount: templateRun.itemCount, completedCount: completedCount)
                    onSelect(result)
                    dismiss()
                })
            } else {
                selectionView
            }
        }
    }
    
    private var selectionView: some View {
        VStack(spacing: 0) {
            List {
                Section {
                    ForEach(availableChecklists) { template in
                        HStack(spacing: 14) {
                            if selectedID == template.id {
                                Image(systemName: "checkmark")
                                    .font(.callout.weight(.bold))
                                    .foregroundColor(.blue)
                                    .frame(width: 20)
                            } else {
                                Color.clear
                                    .frame(width: 20, height: 20)
                            }
                            
                            VStack(alignment: .leading, spacing: 3) {
                                Text(template.title)
                                    .font(.callout.weight(.regular))
                                    .foregroundColor(.primary)
                                Text("\(template.itemCount) items")
                                    .font(.footnote)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                        }
                        .padding(.vertical, 4)
                        #if os(iOS)
                        .contentShape(Rectangle())
                        #endif
                        .onTapGesture {
                            selectedID = template.id
                        }
                    }
                }
            }
            #if true
            .listStyle(.inset)
            #endif
            .padding(.bottom, 80)
        }
        .overlay(
            VStack(spacing: 0) {
                Spacer()
                
                VStack(spacing: 0) {
                    Button(action: {
                        if let selID = selectedID, let target = availableChecklists.first(where: { $0.id == selID }) {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                activeTemplateToRun = target
                            }
                        }
                    }) {
                        Text("Create")
                            .font(.headline.weight(.semibold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.red)
                            .cornerRadius(14)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .disabled(selectedID == nil)
                    .opacity(selectedID == nil ? 0.5 : 1.0)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(Color.murphysCardBackground)
                .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: -2)
            }
        )
        .background(Color.murphysGroupedBackground)
        .navigationTitle("New Checklist")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        #endif
    }
}


public struct CustomerSubScreen: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    @Environment(ScheduleStore.self) var scheduleStore
    @Environment(EquipmentStore.self) var equipmentStore
    @Environment(InvoiceStore.self) var invoiceStore
    @Environment(ProposalStore.self) var proposalStore
    @Environment(NoteStore.self) var noteStore
    @Environment(AttachmentStore.self) var attachmentStore
    @Environment(ChecklistStore.self) var checklistStore
    @Environment(MaintenancePlanStore.self) var maintenancePlanStore
    var title: String
    var customer: Customer
    var appointment: Appointment?
    var autoFocusAddNote: Bool = false
    var autoTriggerPhotoPicker: Bool = false
    
    @State var showPhotoPicker: Bool = false
    @State var showCamera: Bool = false
    @State var showFileImporter: Bool = false
    @State var attachmentFilter: String = "All"
    @State var selectedTeamFilter: String = "All"
    @State var selectedLocationFilter: String = "All Locations"
    @State var showLocationsModal: Bool = false
    @State var showNewEquipmentSheet: Bool = false
    @State var equipmentSegment: String = "Equipment"
    @State var equipmentList: [EquipmentItem] = []
    @State var documentURLs: [URL] = []
    @State var selectedQuickLookURL: URL? = nil
    @State var selectedAttachmentIndex: Int? = nil
    @State var showDeleteAttachmentAlert: Bool = false
    @State var itemToDelete: EquipmentItem? = nil
    @State var showEquipmentDeleteConfirmation: Bool = false
    @State var addedNotes: [NoteItem] = []
    @State var noteToDelete: NoteItem? = nil
    @State var showNoteDeleteConfirmation: Bool = false
    @State var initialNoteText: String = ""
    @State var savedInitialNoteText: String = ""
    @State var isEditingInitialNote: Bool = false
    @State var isInitialNoteDeleted: Bool = false
    @State var showInitialNoteDeleteAlert: Bool = false
    @State var selectedNotesFilter: String = "All"
    @FocusState var focusedNoteID: UUID?
    @FocusState var isInitialNoteFocused: Bool
    @State var invoiceChecklists: [ChecklistTemplateItem] = []
    @State var jobChecklists: [ChecklistTemplateItem] = []
    @State var contractorWarranties: [ContractorWarrantyItem] = []
    @State var appliedRebates: [RebateItem] = []
    @State var appointmentInvoices: [InvoiceRecord] = []
    @State var appointmentProposals: [InvoiceRecord] = []
    
    #if os(iOS)
    @State var equipmentSheetDetent: PresentationDetent = .large
    @State var selectedPhotoItem: PhotosPickerItem? = nil
    @State var selectedPhotoData: Data? = nil
    @State var selectedUIImage: UIImage? = nil
    #endif
    
    private func matchesLocation(itemLocation: String, filter: String) -> Bool {
        if filter == "All Locations" { return true }
        if itemLocation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return true }
        let cleanItem = itemLocation.lowercased().replacingOccurrences(of: " ", with: "")
        let cleanFilter = filter.lowercased().replacingOccurrences(of: " ", with: "")
        if cleanItem == cleanFilter { return true }
        let filterStreet = filter.components(separatedBy: ",").first?.trimmingCharacters(in: .whitespaces).lowercased() ?? ""
        let itemStreet = itemLocation.components(separatedBy: ",").first?.trimmingCharacters(in: .whitespaces).lowercased() ?? ""
        if !filterStreet.isEmpty && !itemStreet.isEmpty {
            if filterStreet.contains(itemStreet) || itemStreet.contains(filterStreet) { return true }
        }
        return cleanFilter.contains(cleanItem) || cleanItem.contains(cleanFilter)
    }
    
    public init(title: String, customer: Customer, appointment: Appointment? = nil, autoFocusAddNote: Bool = false, autoTriggerPhotoPicker: Bool = false) {
        self.title = title
        self.customer = customer
        self.appointment = appointment
        self.autoFocusAddNote = autoFocusAddNote
        self.autoTriggerPhotoPicker = autoTriggerPhotoPicker
        
        let defaultLoc = customer.locations.first ?? customer.address
        let defaultLocStr = defaultLoc.street.isEmpty ? "Main Location" : "\(defaultLoc.street), \(defaultLoc.city), \(defaultLoc.state) \(defaultLoc.zipCode)".trimmingCharacters(in: .whitespaces)
        _selectedLocationFilter = State(initialValue: defaultLocStr)
        _equipmentSegment = State(initialValue: "All")
        
        let storedEquipment = EquipmentStore.shared.equipment(for: customer)
        let storedInvoices: [InvoiceRecord] = {
            if let appt = appointment {
                return InvoiceStore.shared.invoices(for: appt)
            }
            return InvoiceStore.shared.invoices(for: customer)
        }()
        let storedProposals: [InvoiceRecord] = {
            let rawProps = (appointment != nil) ? ProposalStore.shared.proposals(for: appointment!) : ProposalStore.shared.proposals(for: customer)
            return rawProps.map { prop in
                InvoiceRecord(
                    id: prop.id,
                    invNumber: prop.proposalNumber,
                    status: prop.status,
                    paymentStatus: "Unpaid",
                    dueDate: "8/8/26",
                    amount: String(format: "$%.2f", prop.options.first?.total ?? 0.0),
                    customerId: prop.customerId,
                    jobNumber: prop.jobNumber,
                    jobLocation: prop.jobLocation
                )
            }
        }()
        let storedChecklists = ChecklistStore.shared.checklistTemplates
        let storedNotes = NoteStore.shared.notes(for: customer)
        let storedAttachments = AttachmentStore.shared.attachments(for: customer).compactMap { URL(string: $0.imageURL) }
        
        _equipmentList = State(initialValue: storedEquipment)
        _jobChecklists = State(initialValue: storedChecklists)
        _appointmentInvoices = State(initialValue: storedInvoices)
        _appointmentProposals = State(initialValue: storedProposals)
        _addedNotes = State(initialValue: storedNotes)
        _documentURLs = State(initialValue: storedAttachments)
        
        if let appt = appointment {
            if let note = appt.serviceNotes, !note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                _initialNoteText = State(initialValue: note)
                _savedInitialNoteText = State(initialValue: note)
                _isInitialNoteDeleted = State(initialValue: false)
            } else {
                _initialNoteText = State(initialValue: "")
                _savedInitialNoteText = State(initialValue: "")
                _isInitialNoteDeleted = State(initialValue: true)
            }
        } else {
            _initialNoteText = State(initialValue: "")
            _savedInitialNoteText = State(initialValue: "")
            _isInitialNoteDeleted = State(initialValue: true)
        }
    }
    
    public var body: some View {
        ZStack {
            Color.murphysGroupedBackground
                .ignoresSafeArea()
            
            subScreenContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.murphysGroupedBackground)
        .onAppear {
            equipmentList = equipmentStore.equipment(for: customer)
            if let appt = appointment {
                appointmentInvoices = invoiceStore.invoices(for: appt)
                appointmentProposals = proposalStore.proposals(for: appt).map { prop in
                    InvoiceRecord(
                        id: prop.id,
                        invNumber: prop.proposalNumber,
                        status: prop.status,
                        paymentStatus: "Unpaid",
                        dueDate: "8/8/26",
                        amount: String(format: "$%.2f", prop.options.first?.total ?? 0.0),
                        customerId: prop.customerId,
                        jobNumber: prop.jobNumber,
                        jobLocation: prop.jobLocation
                    )
                }
            } else {
                appointmentInvoices = invoiceStore.invoices(for: customer)
                appointmentProposals = proposalStore.proposals(for: customer).map { prop in
                    InvoiceRecord(
                        id: prop.id,
                        invNumber: prop.proposalNumber,
                        status: prop.status,
                        paymentStatus: "Unpaid",
                        dueDate: "8/8/26",
                        amount: String(format: "$%.2f", prop.options.first?.total ?? 0.0),
                        customerId: prop.customerId,
                        jobNumber: prop.jobNumber,
                        jobLocation: prop.jobLocation
                    )
                }
            }
            let existingNotes = noteStore.notes(for: customer)
            if !existingNotes.isEmpty {
                addedNotes = existingNotes
            }
            let existingUrls = attachmentStore.attachments(for: customer).compactMap { URL(string: $0.imageURL) }
            if !existingUrls.isEmpty {
                documentURLs = existingUrls
            }
            jobChecklists = checklistStore.checklistTemplates
            
            if title == "Notes" && autoFocusAddNote && addedNotes.isEmpty {
                let authorName = appointment?.assignedTech ?? "Justin Lung"
                let newNote = NoteItem(author: authorName, dateStarted: Date(), text: "", isEditing: true)
                addedNotes.append(newNote)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    focusedNoteID = newNote.id
                }
            }
            if autoTriggerPhotoPicker {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    showPhotoPicker = true
                }
            }
        }
        .task {
            if title == "Equipment" || title == "Equipment & Mfr. Warranties" || title == "Equipment & Manufacturer Warranties" {
                await equipmentStore.fetchEquipment(for: customer)
                equipmentList = equipmentStore.equipment(for: customer)
            } else if title == "Invoices" {
                if let appt = appointment {
                    await invoiceStore.fetchInvoices(for: appt)
                    appointmentInvoices = invoiceStore.invoices(for: appt)
                } else {
                    await invoiceStore.fetchInvoices(for: customer)
                    appointmentInvoices = invoiceStore.invoices(for: customer)
                }
            } else if title == "Proposals" {
                if let appt = appointment {
                    await proposalStore.fetchProposals(for: appt)
                    appointmentProposals = proposalStore.proposals(for: appt).map { prop in
                        InvoiceRecord(
                            id: prop.id,
                            invNumber: prop.proposalNumber,
                            status: prop.status,
                            paymentStatus: "Unpaid",
                            dueDate: "8/8/26",
                            amount: String(format: "$%.2f", prop.options.first?.total ?? 0.0),
                            customerId: prop.customerId,
                            jobNumber: prop.jobNumber,
                            jobLocation: prop.jobLocation
                        )
                    }
                } else {
                    await proposalStore.fetchProposals(for: customer)
                    appointmentProposals = proposalStore.proposals(for: customer).map { prop in
                        InvoiceRecord(
                            id: prop.id,
                            invNumber: prop.proposalNumber,
                            status: prop.status,
                            paymentStatus: "Unpaid",
                            dueDate: "8/8/26",
                            amount: String(format: "$%.2f", prop.options.first?.total ?? 0.0),
                            customerId: prop.customerId,
                            jobNumber: prop.jobNumber,
                            jobLocation: prop.jobLocation
                        )
                    }
                }
            } else if title == "Maintenance Plans" {
                await maintenancePlanStore.fetchPlans(for: customer)
            } else if title == "Notes" {
                await noteStore.fetchNotes(customerId: customer.id, jobId: appointment?.id)
                let remoteNotes = noteStore.notes(for: customer)
                if !remoteNotes.isEmpty {
                    addedNotes = remoteNotes
                }
            } else if title == "Attachments" {
                await attachmentStore.fetchAttachments(customerId: customer.id, jobId: appointment?.id)
                let remoteAtts = attachmentStore.attachments(for: customer)
                let urls = remoteAtts.compactMap { URL(string: $0.imageURL) }
                if !urls.isEmpty {
                    documentURLs = urls
                }
            } else if title == "Checklists" {
                await checklistStore.fetchChecklists(jobId: appointment?.id)
                jobChecklists = checklistStore.checklistTemplates
            }
        }
        #if os(iOS)
        .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhotoItem, matching: .images)
        .sheet(isPresented: $showCamera) {
            CameraCaptureView { image in
                if let img = image {
                    if let jpegData = img.jpegData(compressionQuality: 0.8) {
                        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("PHOTO_\(UUID().uuidString).jpg")
                        try? jpegData.write(to: tempURL)
                        documentURLs.insert(tempURL, at: 0)
                        let att = AttachmentItem(
                            filename: tempURL.lastPathComponent,
                            imageURL: tempURL.absoluteString,
                            customerId: customer.id,
                            jobId: appointment?.id,
                            jobNumber: appointment?.jobNumber,
                            category: attachmentFilter == "All" ? "Diagnostic" : attachmentFilter,
                            uploadedBy: appointment?.assignedTech ?? "Technician"
                        )
                        Task {
                            await AttachmentStore.shared.saveAttachment(att)
                        }
                    }
                }
            }
        }
        .fileImporter(isPresented: $showFileImporter, allowedContentTypes: [.pdf, .text, .item]) { result in
            switch result {
            case .success(let url):
                let canAccess = url.startAccessingSecurityScopedResource()
                documentURLs.insert(url, at: 0)
                let att = AttachmentItem(
                    filename: url.lastPathComponent,
                    imageURL: url.absoluteString,
                    customerId: customer.id,
                    jobId: appointment?.id,
                    jobNumber: appointment?.jobNumber,
                    category: attachmentFilter == "All" ? "Document" : attachmentFilter,
                    uploadedBy: appointment?.assignedTech ?? "Technician"
                )
                Task {
                    await AttachmentStore.shared.saveAttachment(att)
                }
                if canAccess {
                    url.stopAccessingSecurityScopedResource()
                }
            case .failure(let error):
                print("File import failed: \(error.localizedDescription)")
            }
        }
        #endif
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .navigationBarBackButtonHidden(title == "Notes" && (addedNotes.contains(where: { $0.isEditing }) || isEditingInitialNote))
        .toolbar {
            customToolbarContent
        }
        .sheet(isPresented: $showNewEquipmentSheet) {
            #if os(iOS)
            NewEquipmentSheet(customer: customer) { newEquip in
                equipmentList.append(newEquip)
            }
            .presentationDetents([.large])
            #else
            NewEquipmentSheet(customer: customer) { newEquip in
                equipmentList.append(newEquip)
            }
            #endif
        }
        .alert("Delete Equipment?", isPresented: $showEquipmentDeleteConfirmation, presenting: itemToDelete) { item in
            Button("Cancel", role: .cancel) { itemToDelete = nil }
            Button("Delete", role: .destructive) {
                withAnimation {
                    equipmentList.removeAll(where: { $0.id == item.id })
                }
                Task {
                    await EquipmentStore.shared.deleteEquipment(item)
                }
            }
        } message: { item in
            Text("Are you sure you want to delete \(item.name)? This action cannot be undone.")
        }
    }
    
    @ToolbarContentBuilder
    private var customToolbarContent: some ToolbarContent {
        ToolbarItem(placement: .principal) {
            VStack(spacing: 2) {
                if (title == "Job History" || title == "Customer History") && appointment != nil {
                    Text("Appointments")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(appointment!.formattedJobNumber)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                } else {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(title == "Equipment" ? customer.displayName : (appointment != nil ? appointment!.formattedAppointmentNumber : customer.displayName))
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
        }
        
        if title == "Equipment" {
            ToolbarItem(placement: .primaryAction) {
                Button(action: { showNewEquipmentSheet = true }) {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
        }
        
        if title == "Checklists" || title == "Checklist" {
            ToolbarItem(placement: .primaryAction) {
                NavigationLink(destination: NewChecklistSelectionScreen(customer: customer, appointment: appointment) { newChecklist in
                    invoiceChecklists.append(newChecklist)
                }) {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
        }
        
        if title == "Contractor Warranties" || title == "Warranties" {
            ToolbarItem(placement: .primaryAction) {
                NavigationLink(destination: ContractorWarrantyEditScreen(customer: customer, appointment: appointment, onSave: { item in
                    contractorWarranties.append(item)
                })) {
                    Image(systemName: "plus")
                        .font(.headline)
                        .foregroundColor(.primary)
                }
            }
        }
        
        if title == "Rebates" {
            ToolbarItem(placement: .primaryAction) {
                NavigationLink(destination: RebateEditScreen(customer: customer, appointment: appointment, onSave: { item in
                    appliedRebates.append(item)
                })) {
                    Image(systemName: "plus")
                        .font(.callout.weight(.semibold))
                        .foregroundColor(.primary)
                }
            }
        }
        
        if title == "Invoices" {
            ToolbarItem(placement: .primaryAction) {
                invoicesNavLink
            }
        }
        
        if title == "Proposals" {
            ToolbarItem(placement: .primaryAction) {
                proposalsNavLink
            }
        }
        
        if title == "Attachments" {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button(action: {
                        showCamera = true
                    }) {
                        Label("Take Photo", systemImage: "camera")
                    }

                    #if os(iOS)
                    Button(action: {
                        showPhotoPicker = true
                    }) {
                        Label("Photo Library", systemImage: "photo.on.rectangle")
                    }
                    #else
                    Button(action: {
                        showPhotoPicker = true
                    }) {
                        Label("Photo Library", systemImage: "photo.on.rectangle")
                    }
                    #endif

                    Button(action: {
                        showFileImporter = true
                    }) {
                        Label("Upload PDF or Word Doc", systemImage: "doc.badge.plus")
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.callout.weight(.semibold))
                        .foregroundColor(.primary)
                }
            }
        }
        
        if title == "Notes" {
            let isActivelyTyping = addedNotes.contains(where: { $0.isEditing }) || isEditingInitialNote
            if isActivelyTyping {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        withAnimation {
                            if isEditingInitialNote {
                                initialNoteText = savedInitialNoteText
                                isEditingInitialNote = false
                            }
                            var i = 0
                            while i < addedNotes.count {
                                if addedNotes[i].isEditing {
                                    if addedNotes[i].savedText.isEmpty {
                                        addedNotes.remove(at: i)
                                        continue
                                    } else {
                                        addedNotes[i].text = addedNotes[i].savedText
                                        addedNotes[i].isEditing = false
                                    }
                                }
                                i += 1
                            }
                        }
                    }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    Button("Save") {
                        withAnimation {
                            if isEditingInitialNote {
                                savedInitialNoteText = initialNoteText
                                isEditingInitialNote = false
                            }
                            for i in 0..<addedNotes.count {
                                if addedNotes[i].isEditing {
                                    addedNotes[i].savedText = addedNotes[i].text
                                    addedNotes[i].isEditing = false
                                    var noteToSave = addedNotes[i]
                                    noteToSave.customerId = customer.id
                                    noteToSave.jobId = appointment?.id
                                    noteToSave.jobNumber = appointment?.jobNumber
                                    Task {
                                        await NoteStore.shared.saveNote(noteToSave)
                                    }
                                }
                            }
                        }
                    }
                    .fontWeight(.bold)
                }
            } else if appointment == nil {
                // Toolbar + is ONLY shown on Customer profile, NOT when accessed from appointment screen
                ToolbarItem(placement: .primaryAction) {
                    Button(action: {
                        withAnimation {
                            let newNote = NoteItem(
                                author: appointment?.assignedTech ?? "Justin Lung",
                                dateStarted: Date(),
                                text: "",
                                savedText: "",
                                isEditing: true
                            )
                            addedNotes.append(newNote)
                            focusedNoteID = newNote.id
                        }
                    }) {
                        Image(systemName: "plus")
                            .font(.headline)
                            .foregroundColor(.primary)
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private var invoicesNavLink: some View {
        if let appt = appointment {
            let nextSeq = String(format: "%02d", appointmentInvoices.count + 1)
            let newInvNum = "\(appt.formattedJobNumber)-\(nextSeq)"
            NavigationLink(destination: CreateInvoiceScreen(customer: customer, appointment: appt, isNew: true, invNumberOverride: newInvNum, onSaveInvoice: {
                appointmentInvoices.append(InvoiceRecord(invNumber: newInvNum, status: "Open - Draft", paymentStatus: "Unpaid", dueDate: "8/8/26", amount: "$0.00"))
            })) {
                Image(systemName: "plus")
                    .font(.callout.weight(.semibold))
                    .foregroundColor(.primary)
            }
        } else {
            NavigationLink(destination: JobSelectionScreen(customer: customer, onSaveInvoice: { newRecord in
                appointmentInvoices.append(newRecord)
            })) {
                Image(systemName: "plus")
                    .font(.callout.weight(.semibold))
                    .foregroundColor(.primary)
            }
        }
    }
    
    @ViewBuilder
    private var proposalsNavLink: some View {
        if let appt = appointment {
            let nextSeq = String(format: "%02d", appointmentProposals.count + 1)
            let newPropNum = "\(appt.formattedJobNumber)-\(nextSeq)"
            NavigationLink(destination: CreateInvoiceScreen(customer: customer, appointment: appt, isProposalMode: true, isNew: true, invNumberOverride: newPropNum, onSaveInvoice: {
                appointmentProposals.append(InvoiceRecord(invNumber: newPropNum, status: "Open - Draft", paymentStatus: "Unpaid", dueDate: "8/8/26", amount: "$0.00"))
            })) {
                Image(systemName: "plus")
                    .font(.callout.weight(.semibold))
                    .foregroundColor(.primary)
            }
        } else {
            let nextSeq = String(format: "%02d", appointmentProposals.count + 1)
            let newPropNum = "#140020-\(nextSeq)"
            NavigationLink(destination: CreateInvoiceScreen(customer: customer, isProposalMode: true, isNew: true, invNumberOverride: newPropNum, onSaveInvoice: {
                appointmentProposals.append(InvoiceRecord(invNumber: newPropNum, status: "Open - Draft", paymentStatus: "Unpaid", dueDate: "8/8/26", amount: "$0.00"))
            })) {
                Image(systemName: "plus")
                    .font(.callout.weight(.semibold))
                    .foregroundColor(.primary)
            }
        }
    }
    
    @ViewBuilder
    private func statusBadge(isComplete: Bool) -> some View {
        if isComplete {
            let fg = colorScheme == .dark ? Color(red: 134/255.0, green: 239/255.0, blue: 172/255.0) : Color(red: 21/255.0, green: 128/255.0, blue: 61/255.0)
            let bg = colorScheme == .dark ? Color(red: 5/255.0, green: 46/255.0, blue: 22/255.0) : Color(red: 220/255.0, green: 252/255.0, blue: 231/255.0)
            let border = colorScheme == .dark ? Color(red: 22/255.0, green: 101/255.0, blue: 52/255.0) : Color(red: 134/255.0, green: 239/255.0, blue: 172/255.0)
            Text("Complete")
                .font(.caption.weight(.medium))
                .foregroundColor(fg)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(bg)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(border, lineWidth: 1)
                )
        } else {
            let fg = colorScheme == .dark ? Color(red: 252/255.0, green: 165/255.0, blue: 165/255.0) : Color(red: 185/255.0, green: 28/255.0, blue: 28/255.0)
            let bg = colorScheme == .dark ? Color(red: 69/255.0, green: 10/255.0, blue: 10/255.0) : Color(red: 254/255.0, green: 226/255.0, blue: 226/255.0)
            let border = colorScheme == .dark ? Color(red: 153/255.0, green: 27/255.0, blue: 27/255.0) : Color(red: 252/255.0, green: 165/255.0, blue: 165/255.0)
            Text("Incomplete")
                .font(.caption.weight(.medium))
                .foregroundColor(fg)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(bg)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(border, lineWidth: 1)
                )
        }
    }
    
    @ViewBuilder
    private var subScreenContent: some View {
        if title == "Attachments" {
            appointmentAttachmentsList
        } else if title == "Equipment" || title == "Equipment & Mfr. Warranties" || title == "Equipment & Manufacturer Warranties" {
            equipmentTabList
        } else if (title == "Contractor Warranties" || title == "Warranties") && contractorWarranties.isEmpty {
            VStack(spacing: 12) {
                Spacer().frame(height: 60)
                Image(systemName: "shield.checkerboard")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 44, height: 44)
                    .foregroundColor(.secondary.opacity(0.6))
                Text("No Contractor Warranties")
                    .font(.headline)
                    .foregroundColor(.primary)
                Text("No contractor warranty records found.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.murphysGroupedBackground)
        } else if title == "Rebates" && appliedRebates.isEmpty {
            VStack(spacing: 12) {
                Spacer().frame(height: 60)
                Image(systemName: "dollarsign.circle")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 44, height: 44)
                    .foregroundColor(.secondary.opacity(0.6))
                Text("No Rebates")
                    .font(.headline)
                    .foregroundColor(.primary)
                Text("No rebate records found.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.murphysGroupedBackground)
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    subScreenScrollViewContent
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .padding(16)
            }
            .refreshable {
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.murphysGroupedBackground)
        }
    }
    
    @ViewBuilder
    private var subScreenScrollViewContent: some View {
        if (title == "Customer History" || title == "Job History") && appointment == nil {
            Picker("Team Filter", selection: $selectedTeamFilter) {
                Text("All").tag("All")
                Text("Appliance").tag("Appliance")
                Text("HVAC").tag("HVAC")
            }
            .pickerStyle(.segmented)
            
            locationSelectorMenu
        } else if (title == "Invoices" || title == "Proposals" || title == "Maintenance Plans") && appointment == nil {
            locationSelectorMenu
        }
        
        if title == "Notes" && appointment == nil {
            Picker("Notes Filter", selection: $selectedNotesFilter) {
                Text("All").tag("All")
                Text("Customer").tag("Customer")
                Text("Job").tag("Job")
            }
            .pickerStyle(.segmented)
            
            if selectedNotesFilter == "All" || selectedNotesFilter == "Customer" {
                VStack(alignment: .leading, spacing: 6) {
                    Text("CUSTOMER")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.leading, 4)
                    
                    appointmentNotesGroupedList
                }
            }
            
            if selectedNotesFilter == "All" || selectedNotesFilter == "Job" {
                VStack(alignment: .leading, spacing: 6) {
                    Text("JOB")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.leading, 4)
                    
                    customerJobsNotesGroupedList
                }
            }
        } else if title == "Invoices" {
            invoiceGroupedList
        } else if title == "Proposals" {
            proposalGroupedList
        } else if title == "Equipment & Mfr. Warranties" || title == "Equipment & Manufacturer Warranties" {
            VStack(spacing: 16) {
                Picker("Type", selection: $equipmentSegment) {
                    Text("Equipment").tag("Equipment")
                    Text("Mfr. Warranties").tag("Mfr. Warranties")
                }
                .pickerStyle(.segmented)
                
                if equipmentSegment == "Equipment" {
                    VStack(spacing: 12) {
                        Spacer().frame(height: 60)
                        Image(systemName: "wrench.adjustable")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 44, height: 44)
                            .foregroundColor(.secondary.opacity(0.6))
                        Text("No Equipment Warranties Added")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text("No equipment warranty records found for this invoice.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                } else {
                    VStack(spacing: 12) {
                        Spacer().frame(height: 60)
                        Image(systemName: "shield.text.fill")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 44, height: 44)
                            .foregroundColor(.secondary.opacity(0.6))
                        Text("No Manufacturer Warranties")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text("No manufacturer warranty records found.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                }
            }
        } else if title == "Checklists" || title == "Checklist" {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("THIS INVOICE & JOB")
                        .font(.footnote.weight(.bold))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, 4)
                    
                    if invoiceChecklists.isEmpty {
                        Text("No checklists added to this invoice.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.leading, 4)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(invoiceChecklists.enumerated()), id: \.element.id) { idx, item in
                                SwipeableCardRow(onDelete: {
                                    if let index = invoiceChecklists.firstIndex(where: { $0.id == item.id }) {
                                        withAnimation {
                                            _ = invoiceChecklists.remove(at: index)
                                        }
                                    }
                                }) {
                                    NavigationLink(destination: ChecklistRunnerScreen(template: item, customer: customer, appointment: appointment, onSave: { count in
                                        if let index = invoiceChecklists.firstIndex(where: { $0.id == item.id }) {
                                            invoiceChecklists[index].completedCount = count
                                        }
                                    })) {
                                        HStack(alignment: .center, spacing: 12) {
                                            Text("\(item.title) (\(item.completedCount)/\(item.itemCount))")
                                                .font(.callout.weight(.regular))
                                                .foregroundColor(.primary)
                                                .lineLimit(2)
                                                .multilineTextAlignment(.leading)
                                            
                                            Spacer(minLength: 8)
                                            
                                            statusBadge(isComplete: item.completedCount >= item.itemCount)
                                            
                                            Image(systemName: "chevron.right")
                                                .font(.footnote.weight(.semibold))
                                                .foregroundColor(.secondary.opacity(0.4))
                                        }
                                        .padding(.vertical, 14)
                                        .padding(.horizontal, 16)
                                        #if os(iOS)
                                        .contentShape(Rectangle())
                                        #endif
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                                
                                if idx < invoiceChecklists.count - 1 {
                                    Divider().padding(.leading, 16)
                                }
                            }
                        }
                        .background(Color.murphysCardBackground)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    }
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    let jobNum = appointment?.formattedJobNumber ?? "#140020"
                    Text("JOB \(jobNum) ONLY")
                        .font(.footnote.weight(.bold))
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.horizontal, 4)
                    
                    if jobChecklists.isEmpty {
                        Text("No other checklists for this job.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.leading, 4)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(jobChecklists.enumerated()), id: \.element.id) { idx, item in
                                SwipeableCardRow(onDelete: {
                                    if let index = jobChecklists.firstIndex(where: { $0.id == item.id }) {
                                        withAnimation {
                                            _ = jobChecklists.remove(at: index)
                                        }
                                    }
                                }) {
                                    NavigationLink(destination: ChecklistRunnerScreen(template: item, customer: customer, appointment: appointment, onSave: { count in
                                        if let index = jobChecklists.firstIndex(where: { $0.id == item.id }) {
                                            jobChecklists[index].completedCount = count
                                        }
                                    })) {
                                        HStack(alignment: .center, spacing: 12) {
                                            Text("\(item.title) (\(item.completedCount)/\(item.itemCount))")
                                                .font(.callout.weight(.regular))
                                                .foregroundColor(.primary)
                                                .lineLimit(2)
                                                .multilineTextAlignment(.leading)
                                            
                                            Spacer(minLength: 8)
                                            
                                            statusBadge(isComplete: item.completedCount >= item.itemCount)
                                            
                                            Image(systemName: "chevron.right")
                                                .font(.footnote.weight(.semibold))
                                                .foregroundColor(.secondary.opacity(0.4))
                                        }
                                        .padding(.vertical, 14)
                                        .padding(.horizontal, 16)
                                        #if os(iOS)
                                        .contentShape(Rectangle())
                                        #endif
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                                
                                if idx < jobChecklists.count - 1 {
                                    Divider().padding(.leading, 16)
                                }
                            }
                        }
                        .background(Color.murphysCardBackground)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    }
                }
            }
        } else if title == "Job History" || title == "Customer History" {
            jobHistoryGroupedList
        } else if title == "Calls & Notes" {
            callLogGroupedList
        } else if title == "Notes" {
            appointmentNotesGroupedList
        } else if title == "Attachments" {
            VStack(spacing: 0) {
                #if os(iOS)
                if let uiImage = selectedUIImage {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("SELECTED PHOTO PREVIEW")
                                .font(.footnote.weight(.bold))
                                .foregroundColor(.secondary)
                            Spacer()
                            
                            PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                                HStack(spacing: 4) {
                                    Image(systemName: "arrow.triangle.2.circlepath")
                                        .font(.caption)
                                    Text("Change")
                                        .font(.caption.weight(.semibold))
                                }
                                .foregroundColor(.indigo)
                            }
                            
                            Button(action: {
                                withAnimation {
                                    selectedPhotoItem = nil
                                    selectedPhotoData = nil
                                    selectedUIImage = nil
                                }
                            }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "trash")
                                        .font(.caption)
                                    Text("Remove")
                                        .font(.caption.weight(.semibold))
                                }
                                .foregroundColor(.red)
                                .padding(.leading, 8)
                            }
                        }
                        
                        HStack(spacing: 14) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 72, height: 72)
                                .cornerRadius(12)
                                .clipped()
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Ready to Upload")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundColor(.primary)
                                Text("\((selectedPhotoData?.count ?? 0) / 1024) KB • Photo Media")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                
                                Button(action: {
                                    withAnimation {
                                        if let data = selectedPhotoData {
                                            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".jpg")
                                            try? data.write(to: tempURL)
                                            documentURLs.insert(tempURL, at: 0)
                                        }
                                        selectedPhotoItem = nil
                                        selectedPhotoData = nil
                                        selectedUIImage = nil
                                    }
                                }) {
                                    Text("Upload Photo")
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 6)
                                        .background(Color.indigo)
                                        .cornerRadius(8)
                                }
                            }
                            Spacer()
                        }
                    }
                    .padding(14)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                }
                #endif
                
                #if os(iOS)
                let hasPhotos = !documentURLs.isEmpty || selectedUIImage != nil
                #else
                let hasPhotos = !documentURLs.isEmpty
                #endif
                
                if !hasPhotos {
                    VStack(spacing: 12) {
                        Spacer().frame(height: 60)
                        Image(systemName: "paperclip")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 44, height: 44)
                            .foregroundColor(.secondary.opacity(0.6))
                        Text("No Attachments")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text("Photos and files uploaded will appear here.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.murphysGroupedBackground)
                } else {
                    Picker("Filter", selection: $attachmentFilter) {
                        Text("All").tag("All")
                        Text("Customer").tag("Customer")
                        Text("Job").tag("Job")
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 4)
                    .background(Color.murphysGroupedBackground)
                    
                    attachmentsGroupedList
                }
            }
            #if os(iOS)
            .onChange(of: selectedPhotoItem) { _, newItem in
                Task {
                    if let newItem = newItem {
                        if let data = try? await newItem.loadTransferable(type: Data.self) {
                            await MainActor.run {
                                selectedPhotoData = data
                                selectedUIImage = UIImage(data: data)
                            }
                        }
                    }
                }
            }
            #endif
        } else if (title == "Contractor Warranties" || title == "Warranties") && !contractorWarranties.isEmpty {
            VStack(spacing: 0) {
                ForEach(Array(contractorWarranties.enumerated()), id: \.element.id) { idx, item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.name)
                            .font(.callout.weight(.regular))
                            .foregroundColor(.primary)
                        Text(item.descriptionText)
                            .font(.callout.weight(.regular))
                            .foregroundColor(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                            .multilineTextAlignment(.leading)
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    
                    if idx < contractorWarranties.count - 1 {
                        Divider().padding(.leading, 16)
                    }
                }
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        } else if title == "Rebates" && !appliedRebates.isEmpty {
            VStack(spacing: 0) {
                ForEach(Array(appliedRebates.enumerated()), id: \.element.id) { idx, item in
                    SwipeableCardRow(onDelete: {
                        if let index = appliedRebates.firstIndex(where: { $0.id == item.id }) {
                            withAnimation {
                                _ = appliedRebates.remove(at: index)
                            }
                        }
                    }) {
                        NavigationLink(destination: RebateEditScreen(rebate: item, customer: customer, appointment: appointment, onSave: { updated in
                            if let index = appliedRebates.firstIndex(where: { $0.id == updated.id }) {
                                appliedRebates[index] = updated
                            }
                        })) {
                            HStack(alignment: .center, spacing: 12) {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(item.name)
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                    Text(item.descriptionText)
                                        .font(.footnote.weight(.regular))
                                        .foregroundColor(.secondary)
                                        .lineLimit(2)
                                }
                                
                                Spacer()
                                
                                if !item.amount.isEmpty {
                                    Text(item.amount.contains("$") ? item.amount : "$\(item.amount)")
                                        .font(.callout.weight(.regular))
                                        .foregroundColor(.primary)
                                }
                                
                                Image(systemName: "chevron.right")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundColor(.secondary.opacity(0.4))
                            }
                            .padding(.vertical, 14)
                            .padding(.horizontal, 16)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    
                    if idx < appliedRebates.count - 1 {
                        Divider().padding(.leading, 16)
                    }
                }
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        } else if title == "Maintenance Plans" {
            maintenancePlansGroupedList
        } else if title == "Payment Accounts" {
            paymentAccountsGroupedList
        } else {
            genericGroupedList
        }
    }
    
    // MARK: - Checklist Grouped Table List
    private var checklistGroupedList: some View {
        VStack(spacing: 0) {
            checklistRow(title: "Pre-Service Inspection & Safety Check", isCompleted: true, category: "INSPECTION")
            Divider().padding(.horizontal, 16)
            checklistRow(title: "HVAC Air Filter Replacement (MERV 11)", isCompleted: true, category: "SERVICE")
            Divider().padding(.horizontal, 16)
            checklistRow(title: "Condenser Coil & Drain Line Flush", isCompleted: false, category: "MAINTENANCE")
            Divider().padding(.horizontal, 16)
            checklistRow(title: "Post-Service Test Run & Customer Sign-Off", isCompleted: false, category: "FINAL CHECK")
        }
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    private func checklistRow(title: String, isCompleted: Bool, category: String) -> some View {
        HStack(alignment: .center, spacing: 12) {
            Image(systemName: isCompleted ? "checkmark.circle.fill" : "circle")
                .font(.title3.weight(.semibold))
                .foregroundColor(isCompleted ? .green : .secondary.opacity(0.5))
            
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primary)
                Text(category)
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text(isCompleted ? "Completed" : "Pending")
                .font(.caption.weight(.medium))
                .foregroundColor(isCompleted ? .green : .orange)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(isCompleted ? Color.green.opacity(colorScheme == .dark ? 0.28 : 0.1) : Color.orange.opacity(colorScheme == .dark ? 0.28 : 0.1))
                .cornerRadius(6)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
    }
    
    @ViewBuilder
    private func paymentStatusIndicator(_ status: String) -> some View {
        let isPaid = status.lowercased() == "paid"
        
        let fgColor: Color = isPaid ? (colorScheme == .dark ? Color(red: 110/255.0, green: 231/255.0, blue: 183/255.0) : Color(red: 4/255.0, green: 120/255.0, blue: 87/255.0)) :
            (colorScheme == .dark ? Color(red: 156/255.0, green: 163/255.0, blue: 175/255.0) : Color(red: 75/255.0, green: 85/255.0, blue: 99/255.0))
            
        let bgColor: Color = isPaid ? (colorScheme == .dark ? Color(red: 2/255.0, green: 44/255.0, blue: 34/255.0) : Color(red: 236/255.0, green: 253/255.0, blue: 245/255.0)) :
            (colorScheme == .dark ? Color(red: 31/255.0, green: 41/255.0, blue: 55/255.0) : Color(red: 243/255.0, green: 244/255.0, blue: 246/255.0))
            
        let borderColor: Color = isPaid ? (colorScheme == .dark ? Color(red: 6/255.0, green: 95/255.0, blue: 70/255.0) : Color(red: 167/255.0, green: 243/255.0, blue: 208/255.0)) :
            (colorScheme == .dark ? Color(red: 55/255.0, green: 65/255.0, blue: 81/255.0) : Color(red: 229/255.0, green: 231/255.0, blue: 235/255.0))
        
        Text(status)
            .font(.caption.weight(.medium))
            .foregroundColor(fgColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(bgColor)
            .cornerRadius(6)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(borderColor, lineWidth: 1)
            )
    }
    
    // MARK: - Invoice Grouped Table List
    private var invoiceGroupedList: some View {
        let displayedInvoices: [InvoiceRecord] = {
            if let appt = appointment {
                return appointmentInvoices.filter { inv in
                    let jn = "\(appt.jobNumber)"
                    return inv.jobNumber == appt.jobNumber || inv.invNumber.contains(jn) || inv.jobId == appt.id
                }
            }
            return appointmentInvoices.filter { inv in
                matchesLocation(itemLocation: inv.jobLocation, filter: selectedLocationFilter)
            }
        }()
        
        return VStack(spacing: 16) {
            if displayedInvoices.isEmpty {
                VStack(spacing: 12) {
                    Spacer().frame(height: 60)
                    Image(systemName: "doc.text")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 44, height: 44)
                        .foregroundColor(.secondary.opacity(0.6))
                    Text("No Invoices")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(appointment != nil ? "No invoices found for this appointment." : "No invoices found for this location.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("INVOICES")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.leading, 4)
                    
                    VStack(spacing: 0) {
                        ForEach(Array(displayedInvoices.enumerated()), id: \.element.id) { idx, record in
                            draftInvoiceRow(record: record)
                            if idx < displayedInvoices.count - 1 {
                                Divider().padding(.horizontal, 16)
                            }
                        }
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
            }
        }
    }
    
    private func draftInvoiceRow(record: InvoiceRecord) -> some View {
        let isOpenOrDraft = record.status.contains("Open") || record.status.contains("Draft") || record.paymentStatus == "Unpaid"
        return SwipeableInvoiceRow(
            canDelete: isOpenOrDraft,
            onDelete: {
                withAnimation {
                    appointmentInvoices.removeAll(where: { $0.id == record.id })
                }
            }
        ) {
            NavigationLink(destination: CreateInvoiceScreen(customer: customer, appointment: appointment)) {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(record.invNumber)
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.primary)
                        
                        Text(record.status)
                            .font(.caption.weight(.medium))
                            .foregroundColor(.orange)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(record.amount)
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.primary)
                        
                        Text("Due: \(record.dueDate)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        let amt = record.amount.trimmingCharacters(in: .whitespaces)
                        let statusToDisplay = (amt == "$0.00" || amt == "$0" || amt == "0.00" || amt == "0") ? "No Payment Required" : record.paymentStatus
                        paymentStatusIndicator(statusToDisplay)
                            .padding(.top, 2)
                    }
                    
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.4))
                }
                .padding(16)
                #if os(iOS)
                .contentShape(Rectangle())
                #endif
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
    
           // MARK: - Equipment Grouped Table List
    private var equipmentTabList: some View {
        VStack(spacing: 0) {
            if appointment == nil {
                Picker("Segment", selection: $equipmentSegment) {
                    Text("All").tag("All")
                    Text("HVAC").tag("HVAC")
                    Text("Appliance").tag("Appliance")
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 8)
                .background(Color.murphysGroupedBackground)
            }
            
            locationSelectorMenu
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
                .background(Color.murphysGroupedBackground)
            
            let baseList: [EquipmentItem] = {
                if let appt = appointment {
                    let rawNum = appt.rawJobNumberString
                    let apptSpecific = equipmentList.filter { item in
                        item.appointmentID == rawNum ||
                        item.appointmentID == appt.formattedAppointmentNumber ||
                        item.jobNumber == appt.jobNumber ||
                        (item.appointmentID != nil && appt.formattedJobNumber.contains(item.appointmentID!))
                    }
                    if !apptSpecific.isEmpty {
                        return apptSpecific
                    }
                    let typeMatch = equipmentList.filter { $0.type.lowercased() == appt.jobType.lowercased() }
                    return typeMatch.isEmpty ? equipmentList : typeMatch
                } else {
                    return equipmentList
                }
            }()
            
            let filtered = baseList.filter { item in
                matchesLocation(itemLocation: item.locationAddress, filter: selectedLocationFilter)
            }
            
            let hvacItems = filtered.filter { $0.type == "HVAC" }
            let applianceItems = filtered.filter { $0.type == "Appliance" }
            
            if filtered.isEmpty {
                VStack(spacing: 12) {
                    Spacer().frame(height: 60)
                    Image(systemName: "wrench.adjustable")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 44, height: 44)
                        .foregroundColor(.secondary.opacity(0.6))
                    Text("No Equipment Added")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text("No equipment records found for this location.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.murphysGroupedBackground)
            } else {
                List {
                    if equipmentSegment == "All" || equipmentSegment == "Equipment" || equipmentSegment == "HVAC" {
                        Section(header: Text("HVAC")) {
                            if hvacItems.isEmpty {
                                Text("No HVAC equipment found")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            } else {
                                ForEach(hvacItems) { item in
                                    equipmentRow(item)
                                }
                            }
                        }
                    }
                    
                    if equipmentSegment == "All" || equipmentSegment == "Equipment" || equipmentSegment == "Appliance" {
                        Section(header: Text("APPLIANCE")) {
                            if applianceItems.isEmpty {
                                Text("No Appliance equipment found")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            } else {
                                ForEach(applianceItems) { item in
                                    equipmentRow(item)
                                }
                            }
                        }
                    }
                }
                #if os(iOS)
                .listStyle(.insetGrouped)
                #endif
                .scrollContentBackground(.hidden)
                .background(Color.murphysGroupedBackground)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.murphysGroupedBackground)
    }
    
    private func equipmentRow(_ item: EquipmentItem) -> some View {
        NavigationLink(destination: EquipmentDetailScreen(item: item, customer: customer)) {
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    let cleanName = item.name.replacingOccurrences(of: item.manufacturer, with: "").trimmingCharacters(in: .whitespaces)
                    let displayTitle = "\(item.manufacturer) - \(cleanName.isEmpty ? item.name : cleanName)"
                    
                    Text(displayTitle)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 0) {
                            Text("Model:")
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(.secondary)
                                .frame(width: 48, alignment: .leading)
                            Text(" \(item.modelNumber)")
                                .font(.footnote.weight(.regular))
                                .foregroundColor(.secondary)
                        }
                        
                        HStack(spacing: 0) {
                            Text("S/N:")
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(.secondary)
                                .frame(width: 48, alignment: .leading)
                            Text(" \(item.serialNumber)")
                                .font(.footnote.weight(.regular))
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Spacer()
            }
            .padding(.vertical, 4)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                itemToDelete = item
                showEquipmentDeleteConfirmation = true
            } label: {
                Label("Delete", systemImage: "trash")
            }
            .tint(.red)
        }
    }
    
    // MARK: - Proposals Grouped Table List
    private var proposalGroupedList: some View {
        let displayedProposals: [InvoiceRecord] = {
            if let appt = appointment {
                return appointmentProposals.filter { prop in
                    let jn = "\(appt.jobNumber)"
                    return prop.jobNumber == appt.jobNumber || prop.invNumber.contains(jn) || prop.jobId == appt.id
                }
            }
            return appointmentProposals.filter { prop in
                matchesLocation(itemLocation: prop.jobLocation, filter: selectedLocationFilter)
            }
        }()
        
        return VStack(spacing: 16) {
            if displayedProposals.isEmpty {
                VStack(spacing: 12) {
                    Spacer().frame(height: 60)
                    Image(systemName: "doc.text")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 44, height: 44)
                        .foregroundColor(.secondary.opacity(0.6))
                    Text("No Proposals")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(appointment != nil ? "No proposals found for this appointment." : "No proposals found for this location.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("PROPOSALS")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.leading, 4)
                    
                    VStack(spacing: 0) {
                        ForEach(Array(displayedProposals.enumerated()), id: \.element.id) { idx, record in
                            draftProposalRow(record: record)
                            if idx < displayedProposals.count - 1 {
                                Divider().padding(.horizontal, 16)
                            }
                        }
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
            }
        }
    }
    
    private func draftProposalRow(record: InvoiceRecord) -> some View {
        let isOpenOrDraft = record.status.contains("Open") || record.status.contains("Draft") || record.paymentStatus == "Unpaid"
        return SwipeableInvoiceRow(
            canDelete: isOpenOrDraft,
            onDelete: {
                withAnimation {
                    appointmentProposals.removeAll(where: { $0.id == record.id })
                }
            }
        ) {
            NavigationLink(destination: CreateInvoiceScreen(customer: customer, appointment: appointment, isProposalMode: true, invNumberOverride: record.invNumber)) {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(record.invNumber)
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.primary)
                        
                        Text(record.status)
                            .font(.caption.weight(.medium))
                            .foregroundColor(.orange)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(record.amount)
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.primary)
                        
                        Text("Due: \(record.dueDate)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        let amt = record.amount.trimmingCharacters(in: .whitespaces)
                        let statusToDisplay = (amt == "$0.00" || amt == "$0" || amt == "0.00" || amt == "0") ? "No Payment Required" : record.paymentStatus
                        paymentStatusIndicator(statusToDisplay)
                    }
                    
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.4))
                }
                .padding(16)
                #if os(iOS)
                .contentShape(Rectangle())
                #endif
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
    
    // MARK: - Location Selector Menu Helper
    @ViewBuilder
    private var locationSelectorMenu: some View {
        if customer.locations.count >= 25 {
            Button(action: {
                showLocationsModal = true
            }) {
                HStack {
                    Image(systemName: "mappin.and.ellipse")
                        .foregroundColor(.indigo)
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
            .buttonStyle(PlainButtonStyle())
            .sheet(isPresented: $showLocationsModal) {
                LocationSelectionModal(
                    customerName: customer.name,
                    locations: customer.locations,
                    selectedAddressString: selectedLocationFilter,
                    onSelect: { loc in
                        let locStr = loc.street.isEmpty ? "Main Location" : "\(loc.street), \(loc.city), \(loc.state) \(loc.zipCode)".trimmingCharacters(in: .whitespaces)
                        selectedLocationFilter = locStr
                    }
                )
            }
        } else {
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
                        .foregroundColor(.indigo)
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
        }
    }

    private func historyAppointmentCard(idx: Int, itemAppt: Appointment, jobTypeOverride: String? = nil, jobDetailOverride: String? = nil) -> some View {
        let df = DateFormatter()
        df.dateFormat = "MMM d, yyyy"
        let dateStr = df.string(from: itemAppt.dateTime)
        let noteStr = itemAppt.serviceNotes ?? jobDetailOverride ?? "Diagnostic and service"
        let titleStr = "#\(idx + 1) - \(jobTypeOverride ?? itemAppt.jobType)"
        
        return NavigationLink(destination: AppointmentDetailScreen(appointment: itemAppt)) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 8) {
                    Text(titleStr)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Text(dateStr)
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.top, 2)
                }
                
                HStack(alignment: .center) {
                    Text(noteStr)
                        .font(.subheadline)
                        .foregroundColor(.secondary.opacity(0.9))
                        .multilineTextAlignment(.leading)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.4))
                }
            }
            .padding(16)
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            #if os(iOS)
            .contentShape(Rectangle())
            #endif
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Job History Individual Cards List
    private var jobHistoryGroupedList: some View {
        let customerAppts = scheduleStore.appointments.filter { $0.customerId == customer.id }
        
        if let appt = appointment {
            let jobAppts = customerAppts.filter { $0.jobNumber == appt.jobNumber }
            let displayList = jobAppts.isEmpty ? [appt] : jobAppts
            let sortedAppts = displayList.sorted(by: { $0.appointmentSequenceNumber < $1.appointmentSequenceNumber })
            
            return AnyView(
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(Array(sortedAppts.enumerated()), id: \.element.id) { idx, itemAppt in
                        historyAppointmentCard(idx: idx, itemAppt: itemAppt)
                    }
                }
            )
        } else {
            if customerAppts.isEmpty {
                return AnyView(
                    VStack(spacing: 12) {
                        Spacer().frame(height: 60)
                        Image(systemName: "clock.arrow.circlepath")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 44, height: 44)
                            .foregroundColor(.secondary.opacity(0.6))
                        Text("No Job History")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text("No prior jobs found for this customer.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                )
            }
            
            let groupedByJob = Dictionary(grouping: customerAppts, by: { $0.jobNumber })
            let jobItems: [JobHistoryItem] = groupedByJob.map { (jobNum, appts) in
                let first = appts.first!
                let df = DateFormatter()
                df.dateFormat = "MMMM d, yyyy"
                let dateStr = df.string(from: first.dateTime)
                let teamStr = first.jobType.lowercased().contains("hvac") ? "HVAC" : "Appliance"
                return JobHistoryItem(
                    title: first.jobType,
                    jobNumber: jobNum,
                    formattedJobNumber: "#\(jobNum)",
                    jobType: first.jobType,
                    team: teamStr,
                    date: dateStr,
                    detail: first.serviceNotes ?? "Diagnostic and service",
                    appointments: appts
                )
            }.sorted(by: { $0.jobNumber > $1.jobNumber })
            
            let filteredJobs = jobItems.filter { job in
                if selectedTeamFilter != "All" && job.team != selectedTeamFilter { return false }
                if selectedLocationFilter != "All Locations" {
                    let matchesLoc = job.appointments.contains { appt in
                        if let loc = appt.locationAddress, !loc.isEmpty {
                            return selectedLocationFilter.localizedCaseInsensitiveContains(loc) || loc.localizedCaseInsensitiveContains(selectedLocationFilter)
                        }
                        return true
                    }
                    if !matchesLoc { return false }
                }
                return true
            }
            
            if filteredJobs.isEmpty {
                return AnyView(
                    VStack(spacing: 12) {
                        Spacer().frame(height: 60)
                        Image(systemName: "clock.arrow.circlepath")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 44, height: 44)
                            .foregroundColor(.secondary.opacity(0.6))
                        Text("No Jobs Found")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text("No job history found matching the selected filters.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                )
            }
            
            return AnyView(
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(filteredJobs) { job in
                        jobCardRow(job)
                    }
                }
            )
        }
    }
    
    private func jobCardRow(_ job: JobHistoryItem) -> some View {
        NavigationLink(destination: JobDetailScreen(job: job, customer: customer)) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 6) {
                    if job.appointments.contains(where: { $0.isFlaggedForFollowUp }) {
                        Image(systemName: "flag.fill")
                            .font(.subheadline.weight(.bold))
                            .foregroundColor(.red)
                    }
                    Text("\(job.formattedJobNumber) - \(job.jobType)")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Text(job.date)
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.top, 2)
                }
                
                HStack(alignment: .center) {
                    Text(job.detail)
                        .font(.subheadline)
                        .foregroundColor(.secondary.opacity(0.9))
                        .multilineTextAlignment(.leading)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.4))
                }
            }
            .padding(16)
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            #if os(iOS)
            .contentShape(Rectangle())
            #endif
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Calls & Notes Grouped Table List
    private var callLogGroupedList: some View {
        Group {
            VStack(spacing: 12) {
                Spacer().frame(height: 40)
                Image(systemName: "phone.badge.plus")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 44, height: 44)
                    .foregroundColor(.secondary.opacity(0.6))
                Text("No Calls or Notes")
                    .font(.headline)
                    .foregroundColor(.primary)
                Text("No logged calls or internal notes for this customer.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer().frame(height: 40)
            }
            .frame(maxWidth: .infinity)
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }
    
    private func callLogRow(type: String, date: String, note: String, isLast: Bool) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(type)
                    .font(.callout.weight(.bold))
                    .foregroundColor(.primary)
                Spacer()
                Text(date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Text(note)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(16)
    }
    
    // MARK: - Attachments Grouped Table List
    private var attachmentsGroupedList: some View {
        if documentURLs.isEmpty {
            return AnyView(
                VStack(spacing: 12) {
                    Spacer().frame(height: 60)
                    Image(systemName: "paperclip")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 44, height: 44)
                        .foregroundColor(.secondary.opacity(0.6))
                    Text("No Attachments")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text("No files or photos uploaded.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.murphysGroupedBackground)
            )
        }
        
        return AnyView(
            List {
                // CUSTOMER Section
                if attachmentFilter == "All" || attachmentFilter == "Customer" {
                    Section(header: 
                        Text("CUSTOMER")
                            .font(.footnote)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)
                            .textCase(.uppercase)
                    ) {
                        CustomerAttachmentGridRow(
                            urls: documentURLs,
                            selectedURL: $selectedQuickLookURL
                        )
                    }
                }
            }
            #if os(iOS)
            .listStyle(.insetGrouped)
            .listSectionSpacing(.compact)
            .quickLookPreview($selectedQuickLookURL, in: documentURLs)
            #endif
        )
    }
    
    // MARK: - Payment Accounts Grouped Table List
    private var paymentAccountsGroupedList: some View {
        VStack(spacing: 16) {
            VStack(spacing: 12) {
                Spacer().frame(height: 40)
                Image(systemName: "creditcard")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 44, height: 44)
                    .foregroundColor(.secondary.opacity(0.6))
                Text("No Saved Payment Methods")
                    .font(.headline)
                    .foregroundColor(.primary)
                Text("No saved credit cards or bank accounts found.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer().frame(height: 40)
            }
            .frame(maxWidth: .infinity)
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }
    
    private func attachmentRow(filename: String, tag: String, size: String, date: String, icon: String, isLast: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.blue)
                .frame(width: 28)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(filename)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(.primary)
                Text("\(tag) • \(size) • \(date)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundColor(.secondary.opacity(0.5))
        }
        .padding(16)
    }
    
    // MARK: - Maintenance Plans Grouped Table List
    private var maintenancePlansGroupedList: some View {
        let plans = maintenancePlanStore.plans(for: customer)
        let filteredPlans = plans.filter { plan in
            matchesLocation(itemLocation: plan.locationStreet, filter: selectedLocationFilter)
        }
        
        return VStack(spacing: 0) {
            if filteredPlans.isEmpty {
                VStack(spacing: 12) {
                    Spacer().frame(height: 40)
                    Image(systemName: "book.and.wrench")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 44, height: 44)
                        .foregroundColor(.secondary.opacity(0.6))
                    Text("No Maintenance Plans")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text("No active maintenance plans for this location.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer().frame(height: 40)
                }
                .frame(maxWidth: .infinity)
                .padding(16)
            } else {
                ForEach(Array(filteredPlans.enumerated()), id: \.element.id) { (idx, plan) in
                    NavigationLink(destination: MaintenancePlanDetailScreen(customer: customer, plan: plan)) {
                        HStack(alignment: .center, spacing: 12) {
                            VStack(alignment: .leading, spacing: 12) {
                                // Header: Plan Name and Expires directly underneath
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(plan.name)
                                        .font(.callout.weight(.semibold))
                                        .foregroundColor(.primary)
                                    
                                    Text("Expires: \(plan.expiresDate)")
                                        .font(.footnote)
                                        .foregroundColor(.secondary)
                                }
                                
                                // Left-Aligned 3 Metrics Row: Contract Total, Annual Price, Balance
                                HStack(spacing: 28) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Contract Total")
                                            .font(.caption2.weight(.medium))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                            .fixedSize(horizontal: true, vertical: false)
                                        Text(plan.contractTotal)
                                            .font(.footnote.weight(.semibold))
                                            .foregroundColor(.primary)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Annual Price")
                                            .font(.caption2.weight(.medium))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                            .fixedSize(horizontal: true, vertical: false)
                                        Text(plan.annualPrice)
                                            .font(.footnote.weight(.semibold))
                                            .foregroundColor(.primary)
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Balance")
                                            .font(.caption2.weight(.medium))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                            .fixedSize(horizontal: true, vertical: false)
                                        Text(plan.balance)
                                            .font(.footnote.weight(.semibold))
                                            .foregroundColor(.primary)
                                    }
                                    
                                    Spacer()
                                }
                                .padding(.top, 2)
                            }
                            
                            Image(systemName: "chevron.right")
                                .font(.footnote.weight(.semibold))
                                .foregroundColor(.secondary.opacity(0.4))
                        }
                        .padding(16)
                        #if os(iOS)
                        .contentShape(Rectangle())
                        #endif
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    if idx < filteredPlans.count - 1 {
                        Divider().padding(.horizontal, 16)
                    }
                }
            }
        }
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
    
    // MARK: - Fallback Grouped List
    private var genericGroupedList: some View {
        VStack(spacing: 0) {
            HStack {
                Text("No records found")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
            }
            .padding(16)
        }
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
}


// MARK: - New Equipment Sheet Modal
struct NewEquipmentSheet: View {
    @Environment(\.dismiss) var dismiss
    @Environment(EquipmentStore.self) var equipmentStore
    var customer: Customer
    var editingItem: EquipmentItem?
    var onSave: (EquipmentItem) -> Void
    
    @State var equipmentType: String = "HVAC"
    @State var selectedLocationStreet: String = ""
    @State var selectedLocationCityZip: String = ""
    @State var name: String = ""
    @State var manufacturer: String = ""
    @State var modelNumber: String = ""
    @State var serialNumber: String = ""
    @State var installDate: Date = Date()
    @State var status: String = "Active"
    @State var warranty: String = "" // Empty state initially
    @State var effectiveStart: Date = Date()
    @State var effectiveEnd: Date = Date() // Today's date by default on empty state
    @State var otherWarranties: [OtherWarrantyItem] = []
    @State var uploadedPhotos: [String] = []
    @State var showCamera: Bool = false
    @State var showFileImporter: Bool = false
    #if os(iOS)
    @State var selectedEquipmentPhotoItem: PhotosPickerItem? = nil
    #endif
    
    init(customer: Customer, editingItem: EquipmentItem? = nil, onSave: @escaping (EquipmentItem) -> Void) {
        self.customer = customer
        self.editingItem = editingItem
        self.onSave = onSave
        if let item = editingItem {
            self._equipmentType = State(initialValue: item.type)
            self._name = State(initialValue: item.name)
            self._manufacturer = State(initialValue: item.manufacturer)
            self._modelNumber = State(initialValue: item.modelNumber)
            self._serialNumber = State(initialValue: item.serialNumber)
            self._installDate = State(initialValue: item.installDate)
            self._status = State(initialValue: item.status)
            self._warranty = State(initialValue: item.warranty)
            self._uploadedPhotos = State(initialValue: item.photos)
            let parts = item.locationAddress.components(separatedBy: ",")
            if parts.count >= 2 {
                self._selectedLocationStreet = State(initialValue: parts[0].trimmingCharacters(in: .whitespaces))
                self._selectedLocationCityZip = State(initialValue: parts.dropFirst().joined(separator: ",").trimmingCharacters(in: .whitespaces))
            } else {
                self._selectedLocationStreet = State(initialValue: item.locationAddress)
            }
        }
    }
    
    let statuses = ["Active", "Needs Service", "Inactive"]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Two option slider at top (reduced spacing)
                    Picker("Type", selection: $equipmentType) {
                        Text("HVAC").tag("HVAC")
                        Text("Appliance").tag("Appliance")
                    }
                    .pickerStyle(.segmented)
                    .padding(.top, 0)
                    
                    // Grouped Table List 1: Location & Equipment Details
                    VStack(spacing: 0) {
                        // Location (2-line layout on the right side - identical font & color)
                        HStack {
                            Text("Location")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            Menu {
                                ForEach(customer.locations, id: \.self) { loc in
                                    let streetStr = loc.street.isEmpty ? "Main Location" : loc.street
                                    let cityZipStr = "\(loc.city), \(loc.state) \(loc.zipCode)".trimmingCharacters(in: .whitespaces)
                                    Button {
                                        selectedLocationStreet = streetStr
                                        selectedLocationCityZip = cityZipStr
                                    } label: {
                                        Text("\(streetStr)\(cityZipStr.isEmpty ? "" : " - " + cityZipStr)")
                                    }
                                }
                            } label: {
                                HStack(spacing: 4) {
                                    VStack(alignment: .trailing, spacing: 2) {
                                        Text(selectedLocationStreet.isEmpty ? "Select Location" : selectedLocationStreet)
                                            .font(.callout)
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                        if !selectedLocationCityZip.isEmpty {
                                            Text(selectedLocationCityZip)
                                                .font(.callout)
                                                .foregroundColor(.secondary)
                                                .lineLimit(1)
                                        }
                                    }
                                    .multilineTextAlignment(.trailing)
                                    .frame(maxWidth: 220, alignment: .trailing)
                                    
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(.secondary.opacity(0.8))
                                        .padding(.leading, 4)
                                }
                            }
                        }
                        .frame(minHeight: 52)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        
                        Divider().padding(.horizontal, 16)
                        
                        // Manufacturer (BEFORE Equipment Name)
                        HStack {
                            Text("Manufacturer")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            TextField("Manufacturer", text: $manufacturer)
                                .multilineTextAlignment(.trailing)
                                .font(.callout)
                                .foregroundColor(.secondary)
                                .frame(height: 28)
                        }
                        .frame(height: 52)
                        .padding(.horizontal, 16)
                        
                        Divider().padding(.horizontal, 16)
                        
                        // Equipment Name
                        HStack(alignment: .center) {
                            Text("Equipment Name")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            TextField("Name", text: $name)
                                .lineLimit(1)
                                .multilineTextAlignment(.trailing)
                                .font(.callout)
                                .foregroundColor(.secondary)
                                .frame(height: 28)
                        }
                        .frame(height: 52)
                        .padding(.horizontal, 16)
                        
                        Divider().padding(.horizontal, 16)
                        
                        // Model Number
                        HStack {
                            Text("Model Number")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            TextField("Model #", text: $modelNumber)
                                .multilineTextAlignment(.trailing)
                                .font(.callout)
                                .foregroundColor(.secondary)
                                .frame(height: 28)
                        }
                        .frame(height: 52)
                        .padding(.horizontal, 16)
                        
                        Divider().padding(.horizontal, 16)
                        
                        // Serial Number
                        HStack {
                            Text("Serial Number")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            TextField("Serial #", text: $serialNumber)
                                .multilineTextAlignment(.trailing)
                                .font(.callout)
                                .foregroundColor(.secondary)
                                .frame(height: 28)
                        }
                        .frame(height: 52)
                        .padding(.horizontal, 16)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    
                    // Grouped Table List 2: Install Date, Status, Warranties
                    VStack(spacing: 0) {
                        // Install Date
                        DatePicker("Install Date", selection: $installDate, displayedComponents: .date)
                            .font(.callout)
                            .frame(height: 52)
                            .padding(.horizontal, 16)
                        
                        Divider().padding(.horizontal, 16)
                        
                        // Status
                        HStack {
                            Text("Status")
                                .font(.callout)
                                .foregroundColor(.primary)
                            Spacer()
                            Menu {
                                ForEach(statuses, id: \.self) { st in
                                    Button(st) { status = st }
                                }
                            } label: {
                                HStack {
                                    Text(status)
                                        .font(.callout)
                                        .foregroundColor(.secondary)
                                    Image(systemName: "chevron.up.chevron.down")
                                        .font(.caption.weight(.bold))
                                        .foregroundColor(.secondary.opacity(0.8))
                                        .padding(.leading, 4)
                                }
                            }
                        }
                        .frame(height: 52)
                        .padding(.horizontal, 16)
                        
                        Divider().padding(.horizontal, 16)
                        
                        // Warranties (Row leading to Warranties subscreen - 2-line layout)
                        NavigationLink(destination: WarrantiesDetailScreen(
                            warranty: $warranty,
                            effectiveStart: $effectiveStart,
                            effectiveEnd: $effectiveEnd,
                            otherWarranties: $otherWarranties
                        )) {
                            HStack {
                                Text("Warranties")
                                    .font(.callout)
                                    .foregroundColor(.primary)
                                Spacer()
                                VStack(alignment: .trailing, spacing: 2) {
                                    if warranty.isEmpty {
                                        Text("Select Warranty")
                                            .font(.callout)
                                            .foregroundColor(.secondary)
                                    } else {
                                        let cleanW = warranty.replacingOccurrences(of: "\u{00A0}", with: " ")
                                        if cleanW.contains(" Manufacturer Warranty") {
                                            let prefix = cleanW.replacingOccurrences(of: " Manufacturer Warranty", with: "")
                                            Text(prefix)
                                                .font(.callout)
                                                .foregroundColor(.secondary)
                                            Text("Manufacturer Warranty")
                                                .font(.callout)
                                                .foregroundColor(.secondary)
                                        } else if cleanW.contains(" Parts Warranty") {
                                            let prefix = cleanW.replacingOccurrences(of: " Parts Warranty", with: "")
                                            Text(prefix)
                                                .font(.callout)
                                                .foregroundColor(.secondary)
                                            Text("Parts Warranty")
                                                .font(.callout)
                                                .foregroundColor(.secondary)
                                        } else {
                                            Text(warranty)
                                                .font(.callout)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                }
                                .multilineTextAlignment(.trailing)
                                
                                Image(systemName: "chevron.right")
                                    .font(.footnote)
                                    .foregroundColor(.secondary)
                            }
                            .frame(minHeight: 52)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    
                    // Grouped Table List 3: Photo Upload Section at Bottom
                    VStack(alignment: .leading, spacing: 12) {
                        Text("PHOTOS")
                            .font(.footnote)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)
                            .textCase(.uppercase)
                            .padding(.leading, 8)
                        
                        VStack(spacing: 12) {
                            if !uploadedPhotos.isEmpty {
                                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4), spacing: 6) {
                                    ForEach(uploadedPhotos, id: \.self) { photoUrl in
                                        ZStack(alignment: .topTrailing) {
                                            if let url = URL(string: photoUrl) {
                                                AsyncImage(url: url) { image in
                                                    image.resizable().aspectRatio(1, contentMode: .fill)
                                                } placeholder: {
                                                    Color.secondary.opacity(0.2)
                                                }
                                                .frame(maxWidth: .infinity)
                                                .aspectRatio(1, contentMode: .fill)
                                                .clipped()
                                            }
                                            
                                            DeletePhotoBadge {
                                                uploadedPhotos.removeAll(where: { $0 == photoUrl })
                                            }
                                            .offset(x: 4, y: -4)
                                        }
                                    }
                                }
                            }
                            
                            Menu {
                                Button {
                                    showCamera = true
                                } label: {
                                    Label("Take Photo", systemImage: "camera")
                                }
                                
                                #if os(iOS)
                                PhotosPicker(selection: $selectedEquipmentPhotoItem, matching: .images) {
                                    Label("Photo Library", systemImage: "photo")
                                }
                                #else
                                Button {
                                    addSamplePhoto()
                                } label: {
                                    Label("Photo Library", systemImage: "photo")
                                }
                                #endif
                                
                                Button {
                                    showFileImporter = true
                                } label: {
                                    Label("Select Files", systemImage: "doc.badge.plus")
                                }
                            } label: {
                                HStack {
                                    Image(systemName: "camera.fill")
                                    Text("Add / Upload Photo")
                                }
                                .font(.subheadline.weight(.semibold))
                                .foregroundColor(.blue)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.blue.opacity(0.08))
                                .cornerRadius(10)
                            }
                        }
                        .padding(16)
                        .background(Color.murphysCardBackground)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    }
                }
                .padding(16)
            }
            .background(Color.murphysGroupedBackground)
            .navigationTitle(editingItem != nil ? "Edit Equipment" : "New Equipment")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            #if os(iOS)
            .sheet(isPresented: $showCamera) {
                CameraCaptureView { image in
                    if let img = image {
                        if let jpegData = img.jpegData(compressionQuality: 0.8) {
                            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("EQUIP_\(UUID().uuidString).jpg")
                            try? jpegData.write(to: tempURL)
                            uploadedPhotos.append(tempURL.absoluteString)
                        }
                    }
                }
            }
            .fileImporter(isPresented: $showFileImporter, allowedContentTypes: [.pdf, .text, .item]) { result in
                switch result {
                case .success(let url):
                    let canAccess = url.startAccessingSecurityScopedResource()
                    uploadedPhotos.append(url.absoluteString)
                    if canAccess {
                        url.stopAccessingSecurityScopedResource()
                    }
                case .failure(let error):
                    print("File import failed: \(error.localizedDescription)")
                }
            }
            .onChange(of: selectedEquipmentPhotoItem) { _, newItem in
                Task {
                    if let newItem = newItem {
                        if let data = try? await newItem.loadTransferable(type: Data.self) {
                            await MainActor.run {
                                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".jpg")
                                try? data.write(to: tempURL)
                                uploadedPhotos.append(tempURL.absoluteString)
                            }
                        }
                    }
                }
            }
            #endif
            .toolbar {
                #if os(iOS)
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.subheadline.weight(.semibold))
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        save()
                    } label: {
                        Image(systemName: "checkmark")
                            .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.circle)
                    .tint(.blue)
                    .disabled(name.isEmpty)
                }
                #else
                ToolbarItem(placement: .cancellationAction) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.subheadline.weight(.semibold))
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        save()
                    } label: {
                        Image(systemName: "checkmark")
                            .font(.subheadline.weight(.semibold))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.blue)
                    .disabled(name.isEmpty)
                }
                #endif
            }
        }
        .onAppear {
            if selectedLocationStreet.isEmpty {
                if let loc = customer.locations.first {
                    selectedLocationStreet = loc.street.isEmpty ? "Main Location" : loc.street
                    selectedLocationCityZip = "\(loc.city), \(loc.state) \(loc.zipCode)".trimmingCharacters(in: .whitespaces)
                } else {
                    selectedLocationStreet = customer.address.street.isEmpty ? "Main Location" : customer.address.street
                    selectedLocationCityZip = "\(customer.address.city), \(customer.address.state) \(customer.address.zipCode)".trimmingCharacters(in: .whitespaces)
                }
            }
        }
    }
    
    private func formattedShortDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        return formatter.string(from: date)
    }
    
    private func addSamplePhoto() {
        let samplePhotos = [
            "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?fit=crop&w=300&h=300",
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?fit=crop&w=300&h=300",
            "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?fit=crop&w=300&h=300"
        ]
        if let nextPhoto = samplePhotos.first(where: { !uploadedPhotos.contains($0) }) {
            uploadedPhotos.append(nextPhoto)
        } else {
            uploadedPhotos.append("https://images.unsplash.com/photo-1581094288338-2314dddb7ece?fit=crop&w=300&h=300")
        }
    }
    
    private func save() {
        let fullLoc = selectedLocationCityZip.isEmpty ? selectedLocationStreet : "\(selectedLocationStreet), \(selectedLocationCityZip)"
        let newEquip = EquipmentItem(
            id: editingItem?.id ?? UUID(),
            name: name,
            type: equipmentType,
            manufacturer: manufacturer.isEmpty ? "Generic" : manufacturer,
            modelNumber: modelNumber.isEmpty ? "N/A" : modelNumber,
            serialNumber: serialNumber.isEmpty ? "N/A" : serialNumber,
            locationAddress: fullLoc,
            installDate: installDate,
            status: status,
            warranty: warranty.isEmpty ? "Unassigned" : warranty,
            photos: uploadedPhotos,
            customerId: customer.id
        )
        Task {
            await equipmentStore.saveEquipment(newEquip)
            onSave(newEquip)
            dismiss()
        }
    }
}

// MARK: - Warranties Detail Subscreen
struct WarrantiesDetailScreen: View {
    @Binding var warranty: String
    @Binding var effectiveStart: Date
    @Binding var effectiveEnd: Date
    @Binding var otherWarranties: [OtherWarrantyItem]
    var onAddWarranty: (() -> Void)? = nil
    
    let manufacturerOptions = [
        "None",
        "10-year Manufacturer Warranty",
        "1-Year Manufacture Warranty",
        "5-Year Parts Warranty",
        "1-Year Parts Warranty",
        "10 Year Manufacturer Warranty",
        "One Year Manufacturer Warranty"
    ]
    
    private func calculateEnd(for opt: String, start: Date) -> Date {
        if opt.contains("10 Year") {
            return Calendar.current.date(byAdding: .year, value: 10, to: start) ?? start
        } else if opt.contains("Five Year") || opt.contains("5 Year") {
            return Calendar.current.date(byAdding: .year, value: 5, to: start) ?? start
        } else if opt.contains("One Year") || opt.contains("1 Year") {
            return Calendar.current.date(byAdding: .year, value: 1, to: start) ?? start
        } else {
            return start
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            manufacturerSection
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 8)
                .background(Color.murphysGroupedBackground)
                .zIndex(1)
            
            if !otherWarranties.isEmpty {
                ScrollView {
                    otherWarrantiesSection
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                }
            } else {
                Spacer()
            }
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Warranties")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
    
    private var manufacturerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("MANUFACTURER WARRANTY")
                .font(.footnote.weight(.semibold))
                .foregroundColor(.secondary)
                .padding(.leading, 8)
            
            VStack(spacing: 0) {
                // Manufacturer Warranty Pop-Up
                HStack(alignment: .center, spacing: 12) {
                    Text("Manufacturer Warranty")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        #if os(iOS)
                        .layoutPriority(1)
                        #endif
                    
                    Spacer(minLength: 8)
                    
                    Menu {
                        ForEach(manufacturerOptions, id: \.self) { opt in
                            Button {
                                var transaction = Transaction()
                                transaction.disablesAnimations = true
                                withTransaction(transaction) {
                                    warranty = opt
                                    effectiveEnd = calculateEnd(for: opt, start: effectiveStart)
                                }
                            } label: {
                                if warranty == opt {
                                    Label(opt, systemImage: "checkmark")
                                } else {
                                    Text(opt)
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            VStack(alignment: .trailing, spacing: 2) {
                                if warranty.isEmpty || warranty == "None" {
                                    Text(warranty.isEmpty ? "Select Warranty" : "None")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                } else {
                                    let cleanW = warranty.replacingOccurrences(of: "\u{00A0}", with: " ")
                                    if cleanW.contains(" Manufacturer Warranty") {
                                        let prefix = cleanW.replacingOccurrences(of: " Manufacturer Warranty", with: "")
                                        Text(prefix)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        Text("Manufacturer Warranty")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    } else if cleanW.contains(" Parts Warranty") {
                                        let prefix = cleanW.replacingOccurrences(of: " Parts Warranty", with: "")
                                        Text(prefix)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        Text("Parts Warranty")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    } else {
                                        Text(warranty)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            .multilineTextAlignment(.trailing)
                            .fixedSize(horizontal: false, vertical: true)
                            
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary.opacity(0.8))
                                .padding(.leading, 4)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 20)
                
                Divider().padding(.horizontal, 20)
                
                // Effective Start Date
                DatePicker("Effective Start Date", selection: $effectiveStart, displayedComponents: .date)
                    .font(.subheadline)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 20)
                    #if os(iOS)
                    .onChange(of: effectiveStart) { _, newStart in
                        var transaction = Transaction()
                        transaction.disablesAnimations = true
                        withTransaction(transaction) {
                            effectiveEnd = calculateEnd(for: warranty, start: newStart)
                        }
                    }
                    #endif
                
                Divider().padding(.horizontal, 20)
                
                // Effective End Date
                DatePicker("Effective End Date", selection: $effectiveEnd, displayedComponents: .date)
                    .font(.subheadline)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 20)
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            
            // Floating button: Add other warranties
            Button {
                withAnimation(.easeInOut(duration: 0.25)) {
                    otherWarranties.append(OtherWarrantyItem())
                }
                onAddWarranty?()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.green)
                        .font(.title3)
                    Text("Add other warranties")
                        .font(.callout.weight(.medium))
                        .foregroundColor(.blue)
                    Spacer()
                }
                .padding(.vertical, 10)
                .padding(.horizontal, 8)
            }
            .buttonStyle(PlainButtonStyle())
        }
    }
    
    private var otherWarrantiesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("OTHER WARRANTIES")
                .font(.footnote.weight(.semibold))
                .foregroundColor(.secondary)
                .padding(.leading, 8)
            
            VStack(spacing: 16) {
                ForEach($otherWarranties) { $item in
                    OtherWarrantyCardView(
                        item: $item,
                        index: otherWarranties.firstIndex(where: { $0.id == item.id }) ?? 0,
                        onDelete: {
                            withAnimation(.easeInOut(duration: 0.25)) {
                                otherWarranties.removeAll(where: { $0.id == item.id })
                            }
                        }
                    )
                }
            }
        }
    }
}

// MARK: - Other Warranty Card Subview
struct OtherWarrantyCardView: View {
    @Binding var item: OtherWarrantyItem
    var index: Int
    var onDelete: () -> Void
    
    @State var offset: CGFloat = 0
    @State var showDeleteAlert: Bool = false
    
    var body: some View {
        ZStack(alignment: .trailing) {
            // Trailing red trash action container revealed on swipe left
            HStack {
                Spacer()
                Button(action: {
                    showDeleteAlert = true
                }) {
                    ZStack {
                        Rectangle()
                            .fill(Color.red)
                            .cornerRadius(16)
                        Image(systemName: "trash.fill")
                            .font(.title3.weight(.bold))
                            .foregroundColor(.white)
                    }
                    .frame(width: 65)
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            // Main Warranty Card View
            VStack(spacing: 0) {
                // 1. Warranty Name
                HStack {
                    Text("Warranty Name")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    Spacer()
                    TextField("Name", text: $item.name)
                        .multilineTextAlignment(.trailing)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 20)
                
                Divider().padding(.horizontal, 20)
                
                // 2. Description
                HStack {
                    Text("Description")
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    Spacer()
                    TextField("Description", text: $item.description)
                        .multilineTextAlignment(.trailing)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 20)
                
                Divider().padding(.horizontal, 20)
                
                // 3. Effective Start Date
                DatePicker("Effective Start Date", selection: $item.effectiveStart, displayedComponents: .date)
                    .font(.subheadline)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 20)
                
                Divider().padding(.horizontal, 20)
                
                // 4. Effective End Date
                DatePicker("Effective End Date", selection: $item.effectiveEnd, displayedComponents: .date)
                    .font(.subheadline)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 20)
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            .offset(x: offset)
            .gesture(
                DragGesture()
                    .onChanged { gesture in
                        if gesture.translation.width < 0 {
                            offset = max(gesture.translation.width, -90)
                        } else if offset < 0 {
                            offset = min(gesture.translation.width - 75, 0)
                        }
                    }
                    .onEnded { _ in
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            if offset < -40 {
                                offset = -75
                            } else {
                                offset = 0
                            }
                        }
                    }
            )
        }
        .alert("Delete Warranty", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                withAnimation(.easeInOut(duration: 0.25)) {
                    offset = 0
                    onDelete()
                }
            }
            Button("Cancel", role: .cancel) {
                withAnimation(.easeInOut(duration: 0.25)) {
                    offset = 0
                }
            }
        } message: {
            Text("Are you sure you want to delete this warranty?")
        }
    }
}

// MARK: - Equipment Grouped Row View for unified grouped cards
struct EquipmentGroupedRowView: View {
    var item: EquipmentItem
    var customer: Customer? = nil
    var onDelete: () -> Void
    
    @State var offset: CGFloat = 0
    @State var showDeleteAlert: Bool = false
    
    var body: some View {
        ZStack(alignment: .trailing) {
            HStack(spacing: 0) {
                Spacer()
                Button {
                    showDeleteAlert = true
                } label: {
                    ZStack {
                        Color.red
                        Image(systemName: "trash.fill")
                            .foregroundColor(.white)
                            .font(.title3.weight(.semibold))
                    }
                    .frame(width: 80)
                }
            }
            
            NavigationLink(destination: EquipmentDetailScreen(item: item, customer: customer)) {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        let cleanName = item.name.replacingOccurrences(of: item.manufacturer, with: "").trimmingCharacters(in: .whitespaces)
                        let displayTitle = "\(item.manufacturer) - \(cleanName.isEmpty ? item.name : cleanName)"
                        
                        Text(displayTitle)
                            .font(.headline)
                            .foregroundColor(.primary)
                            .lineLimit(1)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 0) {
                                Text("Model:")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundColor(.secondary)
                                    .frame(width: 48, alignment: .leading)
                                Text(" \(item.modelNumber)")
                                    .font(.footnote.weight(.regular))
                                    .foregroundColor(.secondary)
                            }
                            
                            HStack(spacing: 0) {
                                Text("S/N:")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundColor(.secondary)
                                    .frame(width: 48, alignment: .leading)
                                Text(" \(item.serialNumber)")
                                    .font(.footnote.weight(.regular))
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.5))
                }
                .padding(16)
                .background(Color.murphysCardBackground)
            }
            .buttonStyle(PlainButtonStyle())
            .offset(x: offset)
            .simultaneousGesture(
                DragGesture(minimumDistance: 10, coordinateSpace: .local)
                    .onChanged { gesture in
                        if abs(gesture.translation.width) > abs(gesture.translation.height) {
                            if gesture.translation.width < 0 {
                                offset = max(gesture.translation.width, -80)
                            } else if offset < 0 {
                                offset = min(gesture.translation.width - 80, 0)
                            }
                        }
                    }
                    .onEnded { gesture in
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                            if offset < -30 || gesture.predictedEndTranslation.width < -50 {
                                offset = -80
                            } else {
                                offset = 0
                            }
                        }
                    }
            )
        }
        .clipped()
        .alert("Delete Equipment", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                withAnimation(.easeInOut(duration: 0.25)) {
                    offset = 0
                    onDelete()
                }
            }
            Button("Cancel", role: .cancel) {
                withAnimation(.easeInOut(duration: 0.25)) {
                    offset = 0
                }
            }
        } message: {
            Text("Are you sure you want to delete this equipment?")
        }
    }
}

// MARK: - Equipment Row View with Swipe to Delete & Navigation
struct EquipmentRowView: View {
    var item: EquipmentItem
    var customer: Customer? = nil
    var onDelete: () -> Void
    
    @State var offset: CGFloat = 0
    @State var showDeleteAlert: Bool = false
    
    var body: some View {
        ZStack(alignment: .trailing) {
            // Delete background container cleanly clipped inside rounded card
            HStack(spacing: 0) {
                Spacer()
                Button {
                    showDeleteAlert = true
                } label: {
                    ZStack {
                        Color.red
                        Image(systemName: "trash.fill")
                            .foregroundColor(.white)
                            .font(.title3.weight(.semibold))
                    }
                    .frame(width: 80)
                }
            }
            .cornerRadius(16)
            
            NavigationLink(destination: EquipmentDetailScreen(item: item, customer: customer)) {
                HStack(alignment: .center, spacing: 12) {
                    VStack(alignment: .leading, spacing: 10) {
                        let cleanName = item.name.replacingOccurrences(of: item.manufacturer, with: "").trimmingCharacters(in: .whitespaces)
                        let displayTitle = "\(item.manufacturer) - \(cleanName.isEmpty ? item.name : cleanName)"
                        
                        Text(displayTitle)
                            .font(.headline)
                            .foregroundColor(.primary)
                            .lineLimit(1)
                        
                        HStack(alignment: .center) {
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 0) {
                                    Text("Model:")
                                        .font(.footnote.weight(.semibold))
                                        .foregroundColor(.secondary)
                                        .frame(width: 48, alignment: .leading)
                                    Text(" \(item.modelNumber)")
                                        .font(.footnote.weight(.regular))
                                        .foregroundColor(.secondary)
                                }
                                
                                HStack(spacing: 0) {
                                    Text("S/N:")
                                        .font(.footnote.weight(.semibold))
                                        .foregroundColor(.secondary)
                                        .frame(width: 48, alignment: .leading)
                                    Text(" \(item.serialNumber)")
                                        .font(.footnote.weight(.regular))
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            Spacer()
                        }
                    }
                    
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.5))
                }
                .padding(16)
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
            }
            .buttonStyle(PlainButtonStyle())
            .offset(x: offset)
            .simultaneousGesture(
                DragGesture(minimumDistance: 10, coordinateSpace: .local)
                    .onChanged { gesture in
                        if abs(gesture.translation.width) > abs(gesture.translation.height) {
                            if gesture.translation.width < 0 {
                                offset = max(gesture.translation.width, -80)
                            } else if offset < 0 {
                                offset = min(gesture.translation.width - 80, 0)
                            }
                        }
                    }
                    .onEnded { gesture in
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                            if offset < -30 || gesture.predictedEndTranslation.width < -50 {
                                offset = -80
                            } else {
                                offset = 0
                            }
                        }
                    }
            )
        }
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        .alert("Delete Equipment", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                withAnimation(.easeInOut(duration: 0.25)) {
                    offset = 0
                    onDelete()
                }
            }
            Button("Cancel", role: .cancel) {
                withAnimation(.easeInOut(duration: 0.25)) {
                    offset = 0
                }
            }
        } message: {
            Text("Are you sure you want to delete \(item.name)?")
        }
    }
}

public struct IdentifiablePhoto: Identifiable {
    public var id: String
    public var url: String { id }
    public init(id: String) { self.id = id }
}

struct DeletePhotoBadge: View {
    var action: () -> Void
    
    var body: some View {
        Button(action: action) {
            #if os(iOS)
            Image(systemName: "xmark.circle.fill")
                .symbolRenderingMode(.palette)
                .foregroundStyle(Color.white, Color.black.opacity(0.75))
                .font(.body)
            #else
            Image(systemName: "xmark.circle.fill")
                .foregroundColor(.white)
                .font(.body)
            #endif
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Equipment Detail Screen
struct EquipmentDetailScreen: View {
    var item: EquipmentItem
    var customer: Customer?
    @State var itemPhotos: [String] = []
    @State var selectedPhoto: IdentifiablePhoto? = nil
    @State var selectedPhotoIndex: Int = 0
    @State var showDeletePhotoAlert: Bool = false
    @State var showEditSheet: Bool = false
    
    init(item: EquipmentItem, customer: Customer? = nil) {
        self.item = item
        self.customer = customer
        self._itemPhotos = State(initialValue: item.photos)
    }
    
    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }
    
    private var locationRow: some View {
        HStack(alignment: .top) {
            Text("Location")
                .font(.callout)
                .foregroundColor(.primary)
            Spacer()
            let parts = item.locationAddress.components(separatedBy: ",")
            if parts.count >= 2 {
                let street = parts[0].trimmingCharacters(in: .whitespaces)
                let cityStateZip = parts.dropFirst().joined(separator: ",").trimmingCharacters(in: .whitespaces)
                VStack(alignment: .trailing, spacing: 2) {
                    Text(street)
                        .font(.callout)
                        .foregroundColor(.secondary)
                    Text(cityStateZip)
                        .font(.callout)
                        .foregroundColor(.secondary)
                }
                .multilineTextAlignment(.trailing)
            } else {
                Text(item.locationAddress.isEmpty ? "Main Location" : item.locationAddress)
                    .font(.callout)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
    }
    
    var body: some View {
        let cleanName = item.name.replacingOccurrences(of: item.manufacturer, with: "").trimmingCharacters(in: .whitespaces)
        let equipmentDisplayName = cleanName.isEmpty ? item.name : cleanName
        
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Table 1: EQUIPMENT
                VStack(alignment: .leading, spacing: 8) {
                    Text("EQUIPMENT")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.leading, 8)
                    
                    VStack(spacing: 0) {
                        detailRow(title: "Equipment Name", value: equipmentDisplayName)
                        Divider().padding(.horizontal, 16)
                        detailRow(title: "Manufacturer", value: item.manufacturer)
                        Divider().padding(.horizontal, 16)
                        detailRow(title: "Model Number", value: item.modelNumber)
                        Divider().padding(.horizontal, 16)
                        detailRow(title: "Serial Number", value: item.serialNumber)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                
                // Table 2: DETAILS
                VStack(alignment: .leading, spacing: 8) {
                    Text("DETAILS")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.leading, 8)
                    
                    VStack(spacing: 0) {
                        locationRow
                        Divider().padding(.horizontal, 16)
                        detailRow(title: "Install Date", value: formattedDate(item.installDate))
                        Divider().padding(.horizontal, 16)
                        detailRow(title: "Warranties", value: item.warranty.isEmpty ? "None" : item.warranty)
                        Divider().padding(.horizontal, 16)
                        detailRow(title: "Status", value: item.status)
                    }
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
                
                // Section 3: ATTACHMENTS Card
                VStack(alignment: .leading, spacing: 8) {
                    Text("ATTACHMENTS")
                        .font(.footnote)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                        .padding(.leading, 8)
                    
                    VStack(alignment: .leading, spacing: 12) {
                        if itemPhotos.isEmpty {
                            Text("No photos uploaded for this equipment.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .padding(.vertical, 8)
                        } else {
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4), spacing: 6) {
                                ForEach(Array(itemPhotos.enumerated()), id: \.offset) { idx, photoUrl in
                                    Button {
                                        selectedPhotoIndex = idx
                                        selectedPhoto = IdentifiablePhoto(id: photoUrl)
                                    } label: {
                                        AsyncImage(url: URL(string: photoUrl)) { image in
                                            image
                                                .resizable()
                                                .aspectRatio(1, contentMode: .fill)
                                        } placeholder: {
                                            Color.gray.opacity(0.15)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .aspectRatio(1, contentMode: .fill)
                                        .clipped()
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        }
                    }
                    .padding(16)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(16)
                    .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                }
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Equipment")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(customer?.name ?? "Fiona Gallagher")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            #if os(iOS)
            ToolbarItem(placement: .topBarTrailing) {
                Button("Edit") {
                    showEditSheet = true
                }
            }
            #endif
        }
        .sheet(isPresented: $showEditSheet) {
            NewEquipmentSheet(
                customer: customer ?? Customer(name: "Customer", email: "", phone: "", address: Address(street: "", city: "", state: "", zipCode: ""), customerType: .residential),
                editingItem: item,
                onSave: { _ in showEditSheet = false }
            )
        }
        .fullScreenCover(item: $selectedPhoto) { _ in
            NavigationStack {
                ZStack {
                    Color.black.ignoresSafeArea()
                    
                    if !itemPhotos.isEmpty {
                        TabView(selection: $selectedPhotoIndex) {
                            ForEach(Array(itemPhotos.enumerated()), id: \.offset) { index, photoUrl in
                                ZoomableAsyncImageView(url: URL(string: photoUrl))
                                    .tag(index)
                            }
                        }
                        #if os(iOS)
                        .tabViewStyle(.page(indexDisplayMode: .always))
                        #endif
                    }
                }
                .toolbar {
                    #if os(iOS)
                    ToolbarItem(placement: .topBarLeading) {
                        Button(action: { selectedPhoto = nil }) {
                            Image(systemName: "xmark")
                                .foregroundColor(.white)
                                .font(.headline)
                        }
                    }
                    
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(role: .destructive) {
                            showDeletePhotoAlert = true
                        } label: {
                            Image(systemName: "trash")
                                .foregroundColor(.red)
                                .font(.headline)
                        }
                    }
                    #else
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") { selectedPhoto = nil }
                    }
                    ToolbarItem(placement: .primaryAction) {
                        Button("Delete", role: .destructive) { showDeletePhotoAlert = true }
                    }
                    #endif
                }
                .alert("Delete Photo", isPresented: $showDeletePhotoAlert) {
                    Button("Delete", role: .destructive) {
                        if selectedPhotoIndex < itemPhotos.count {
                            itemPhotos.remove(at: selectedPhotoIndex)
                            if itemPhotos.isEmpty {
                                selectedPhoto = nil
                            } else {
                                selectedPhotoIndex = min(selectedPhotoIndex, itemPhotos.count - 1)
                            }
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Are you sure you want to delete this photo?")
                }
            }
        }
    }
    
    private func detailRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.callout)
                .foregroundColor(.primary)
            Spacer()
            Text(value)
                .font(.callout)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
    }
}

// MARK: - Job Attachment Disclosure Row Component
struct JobAttachmentDisclosureRow<Content: View>: View {
    var title: String
    @ViewBuilder var content: () -> Content
    
    @State var isExpanded: Bool = false
    
    var body: some View {
        VStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "wrench.and.screwdriver")
                        .font(.callout.weight(.semibold))
                        .foregroundColor(.blue)
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 16)
            }
            .buttonStyle(PlainButtonStyle())
            
            if isExpanded {
                Divider()
                content()
            }
        }
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }
}


struct SwipeableInvoiceRow<Content: View>: View {
    let content: Content
    let onDelete: (() -> Void)?
    let canDelete: Bool
    
    @State var offset: CGFloat = 0
    @State var isSwiped: Bool = false
    
    init(canDelete: Bool = true, onDelete: (() -> Void)? = nil, @ViewBuilder content: () -> Content) {
        self.canDelete = canDelete
        self.content = content()
        self.onDelete = onDelete
    }
    
    var body: some View {
        let maxOffset: CGFloat = canDelete ? -70 : 0
        ZStack(alignment: .trailing) {
            Color.murphysGroupedBackground
            
            if canDelete, let onDelete = onDelete {
                HStack(spacing: 0) {
                    Spacer()
                    Button(action: {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            offset = 0
                            isSwiped = false
                        }
                        onDelete()
                    }) {
                        VStack(spacing: 4) {
                            Image(systemName: "trash.fill")
                                .font(.callout.weight(.bold))
                                .foregroundColor(.white)
                                .frame(width: 36, height: 36)
                                .background(Color.red)
                                .clipShape(Circle())
                            
                            Text("Delete")
                                .font(.caption2.weight(.medium))
                                .foregroundColor(.red)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(.trailing, 16)
                .opacity(offset < -5 ? 1 : 0)
            }
            
            content
                .background(Color.murphysCardBackground)
                .offset(x: offset)
                #if true
                .highPriorityGesture(
                    canDelete ? DragGesture(minimumDistance: 10, coordinateSpace: .local)
                        .onChanged { gesture in
                            if abs(gesture.translation.width) > abs(gesture.translation.height) {
                                if gesture.translation.width < 0 {
                                    let translation = gesture.translation.width
                                    offset = isSwiped ? max(translation + maxOffset, maxOffset) : max(translation, maxOffset)
                                } else if gesture.translation.width > 0 {
                                    offset = isSwiped ? min(gesture.translation.width + maxOffset, 0) : min(gesture.translation.width, 0)
                                }
                            }
                        }
                        .onEnded { gesture in
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                if gesture.translation.width < -30 {
                                    offset = maxOffset
                                    isSwiped = true
                                } else {
                                    offset = 0
                                    isSwiped = false
                                }
                            }
                        } : nil
                )
                #endif
        }
        .clipped()
    }
}

struct SwipeableNoteRow<Content: View>: View {
    let content: Content
    let onEdit: () -> Void
    let onDelete: (() -> Void)?
    let showDelete: Bool
    
    @State var offset: CGFloat = 0
    @State var isSwiped: Bool = false
    
    init(showDelete: Bool = true, @ViewBuilder content: () -> Content, onEdit: @escaping () -> Void, onDelete: (() -> Void)? = nil) {
        self.showDelete = showDelete
        self.content = content()
        self.onEdit = onEdit
        self.onDelete = onDelete
    }
    
    var body: some View {
        let maxOffset: CGFloat = showDelete ? -130 : -70
        ZStack(alignment: .trailing) {
            Color.murphysGroupedBackground
            
            HStack(spacing: 12) {
                Spacer()
                
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        offset = 0
                        isSwiped = false
                    }
                    onEdit()
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: "pencil")
                            .font(.callout.weight(.bold))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(Color.blue)
                            .clipShape(Circle())
                        
                        Text("Edit")
                            .font(.caption2.weight(.medium))
                            .foregroundColor(.blue)
                    }
                }
                .buttonStyle(PlainButtonStyle())
                
                if showDelete, let onDelete = onDelete {
                    Button(action: {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            offset = 0
                            isSwiped = false
                        }
                        onDelete()
                    }) {
                        VStack(spacing: 4) {
                            Image(systemName: "trash.fill")
                                .font(.callout.weight(.bold))
                                .foregroundColor(.white)
                                .frame(width: 36, height: 36)
                                .background(Color.red)
                                .clipShape(Circle())
                            
                            Text("Delete")
                                .font(.caption2.weight(.medium))
                                .foregroundColor(.red)
                        }
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.trailing, 16)
            .opacity(offset < -5 ? 1 : 0)
            
            content
                .background(Color.murphysCardBackground)
                .offset(x: offset)
                #if true
                .highPriorityGesture(
                    DragGesture(minimumDistance: 10, coordinateSpace: .local)
                        .onChanged { gesture in
                            if abs(gesture.translation.width) > abs(gesture.translation.height) {
                                if gesture.translation.width < 0 {
                                    let translation = gesture.translation.width
                                    offset = isSwiped ? max(translation + maxOffset, maxOffset) : max(translation, maxOffset)
                                } else if gesture.translation.width > 0 {
                                    offset = isSwiped ? min(gesture.translation.width + maxOffset, 0) : min(gesture.translation.width, 0)
                                }
                            }
                        }
                        .onEnded { gesture in
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                if gesture.translation.width < -40 {
                                    offset = maxOffset
                                    isSwiped = true
                                } else {
                                    offset = 0
                                    isSwiped = false
                                }
                            }
                        }
                )
                #else
                .gesture(
                    DragGesture(minimumDistance: 10, coordinateSpace: .local)
                        .onChanged { gesture in
                            if abs(gesture.translation.width) > abs(gesture.translation.height) {
                                if gesture.translation.width < 0 {
                                    let translation = gesture.translation.width
                                    offset = isSwiped ? max(translation + maxOffset, maxOffset) : max(translation, maxOffset)
                                } else if gesture.translation.width > 0 {
                                    offset = isSwiped ? min(gesture.translation.width + maxOffset, 0) : min(gesture.translation.width, 0)
                                }
                            }
                        }
                        .onEnded { gesture in
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                if gesture.translation.width < -40 {
                                    offset = maxOffset
                                    isSwiped = true
                                } else {
                                    offset = 0
                                    isSwiped = false
                                }
                            }
                        }
                )
                #endif
        }
        .clipped()
    }
}

extension CustomerSubScreen {
    private func formatNoteHeader(author: String, date: Date) -> String {
        let df = DateFormatter()
        df.dateFormat = "MMM d, yyyy h:mma"
        let dateStr = df.string(from: date)
        return "\(author) - \(dateStr)"
    }
    
    @ViewBuilder
    fileprivate var appointmentNotesGroupedList: some View {
        let techName = appointment?.assignedTech ?? "Justin Lung"
        let defaultNoteText = appointment?.serviceNotes ?? ""
        let initialDate = appointment?.dateTime ?? (Calendar.current.date(from: DateComponents(year: 2026, month: 6, day: 21, hour: 9, minute: 37)) ?? Date())
        let initialHeader = formatNoteHeader(author: techName, date: initialDate)
        let isActivelyTyping = addedNotes.contains(where: { $0.isEditing }) || isEditingInitialNote
        
        VStack(spacing: 0) {
            if !isInitialNoteDeleted {
                if isEditingInitialNote {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(initialHeader)
                            .font(.caption.weight(.bold))
                            .foregroundColor(.secondary)
                        
                        #if true
                        TextField("Add a note...", text: $initialNoteText, axis: .vertical)
                            .focused($isInitialNoteFocused)
                            .lineLimit(1...10)
                            .font(.callout)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                            .onAppear {
                                isInitialNoteFocused = true
                            }
                        #else
                        TextField("Add a note...", text: $initialNoteText)
                            .focused($isInitialNoteFocused)
                            .font(.callout)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                            .onAppear {
                                isInitialNoteFocused = true
                            }
                        #endif
                    }
                    .padding(.vertical, 14)
                    .padding(.horizontal, 20)
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else {
                    let canDeleteInitial = (appointment == nil)
                    SwipeableNoteRow(showDelete: canDeleteInitial) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(initialHeader)
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary)
                            
                            Text(initialNoteText.isEmpty ? defaultNoteText : initialNoteText)
                                .font(.callout)
                                .foregroundColor(.primary)
                                .multilineTextAlignment(.leading)
                        }
                        .padding(.vertical, 16)
                        .padding(.horizontal, 20)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    } onEdit: {
                        withAnimation(.easeInOut) {
                            if initialNoteText.isEmpty {
                                initialNoteText = defaultNoteText
                            }
                            savedInitialNoteText = initialNoteText
                            isEditingInitialNote = true
                        }
                    } onDelete: {
                        showInitialNoteDeleteAlert = true
                    }
                    .confirmationDialog(
                        "Delete Note",
                        isPresented: $showInitialNoteDeleteAlert,
                        titleVisibility: .visible
                    ) {
                        Button("Delete Note", role: .destructive) {
                            withAnimation {
                                isInitialNoteDeleted = true
                                showInitialNoteDeleteAlert = false
                            }
                        }
                        Button("Cancel", role: .cancel) {
                            showInitialNoteDeleteAlert = false
                        }
                    } message: {
                        Text("Are you sure you want to delete this note entry?")
                    }
                }
                
                Divider().padding(.horizontal, 20)
            }
            
            ForEach(Array(addedNotes.enumerated()), id: \.element.id) { idx, note in
                VStack(spacing: 0) {
                    if note.isEditing {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(formatNoteHeader(author: note.author, date: note.dateStarted))
                                .font(.caption.weight(.bold))
                                .foregroundColor(.secondary)
                            
                            #if true
                            TextField("Add a note...", text: Binding(
                                get: { idx < addedNotes.count ? addedNotes[idx].text : "" },
                                set: { if idx < addedNotes.count { addedNotes[idx].text = $0 } }
                            ), axis: .vertical)
                            .focused($focusedNoteID, equals: note.id)
                            .lineLimit(1...10)
                            .font(.callout)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                            .onAppear {
                                focusedNoteID = note.id
                            }
                            #else
                            TextField("Add a note...", text: Binding(
                                get: { idx < addedNotes.count ? addedNotes[idx].text : "" },
                                set: { if idx < addedNotes.count { addedNotes[idx].text = $0 } }
                            ))
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
                                Text(formatNoteHeader(author: note.author, date: note.dateStarted))
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
                                    let toDel = note
                                    addedNotes.removeAll(where: { $0.id == note.id })
                                    noteToDelete = nil
                                    showNoteDeleteConfirmation = false
                                    Task {
                                        await NoteStore.shared.deleteNote(toDel)
                                    }
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
            
            Button(action: {
                guard !isActivelyTyping else { return }
                let authorName = appointment?.assignedTech ?? "Justin Lung"
                let newNote = NoteItem(author: authorName, dateStarted: Date(), text: "", isEditing: true)
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
        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
    }

    @ViewBuilder
    fileprivate var customerJobsNotesGroupedList: some View {
        let customerAppts = scheduleStore.appointments.filter { $0.customerId == customer.id }
        if customerAppts.isEmpty {
            VStack(spacing: 12) {
                Spacer().frame(height: 40)
                Image(systemName: "note.text")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 44, height: 44)
                    .foregroundColor(.secondary.opacity(0.6))
                Text("No Job Notes")
                    .font(.headline)
                    .foregroundColor(.primary)
                Text("No job notes found for this customer.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer().frame(height: 40)
            }
            .frame(maxWidth: .infinity)
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        } else {
            let groupedByJob = Dictionary(grouping: customerAppts, by: { $0.jobNumber })
            let jobItems: [FieldItem] = groupedByJob.map { (jobNum, appts) in
                let first = appts.first!
                let children = appts.map { appt in
                    FieldItem(id: "appt_\(appt.id.uuidString)", label: "#\(appt.jobNumber)", appointmentID: appt.id.uuidString)
                }
                return FieldItem(
                    id: "job_\(jobNum)",
                    label: "#\(jobNum) - \(first.jobType)",
                    children: children
                )
            }.sorted(by: { $0.label > $1.label })
            
            VStack(spacing: 0) {
                ForEach(Array(jobItems.enumerated()), id: \.element.id) { idx, parentJob in
                    ExpandableJobRowView(parentJob: parentJob, isLast: idx == jobItems.count - 1, customer: customer)
                }
            }
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
        }
    }

    @ViewBuilder
    fileprivate var appointmentAttachmentsList: some View {
        let allURLs = documentURLs
        let photoURLs = Array(allURLs.prefix(8))
        let fileURLs = Array(allURLs.suffix(from: min(8, allURLs.count)))
        
        if allURLs.isEmpty {
            VStack(spacing: 12) {
                Spacer().frame(height: 60)
                Image(systemName: "paperclip")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 44, height: 44)
                    .foregroundColor(.secondary.opacity(0.6))
                Text("No Attachments")
                    .font(.headline)
                    .foregroundColor(.primary)
                Text("No files or photos uploaded for this appointment.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Section 1: PHOTOS
                    if !photoURLs.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("PHOTOS")
                                .font(.footnote)
                                .fontWeight(.bold)
                                .foregroundColor(.secondary)
                                .textCase(.uppercase)
                                .padding(.leading, 4)
                            
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 4), spacing: 2) {
                                ForEach(Array(photoURLs.enumerated()), id: \.element) { idx, url in
                                    Button {
                                        selectedAttachmentIndex = idx
                                    } label: {
                                        AsyncImage(url: url) { img in
                                            img.resizable().aspectRatio(1.0, contentMode: .fill)
                                        } placeholder: {
                                            Color.secondary.opacity(0.15)
                                        }
                                        .clipped()
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    
                    // Section 2: FILES
                    if !fileURLs.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("FILES")
                                .font(.footnote)
                                .fontWeight(.bold)
                                .foregroundColor(.secondary)
                                .textCase(.uppercase)
                                .padding(.leading, 4)
                            
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 4), spacing: 2) {
                                ForEach(Array(fileURLs.enumerated()), id: \.element) { idx, url in
                                    let absoluteIdx = photoURLs.count + idx
                                    Button {
                                        selectedAttachmentIndex = absoluteIdx
                                    } label: {
                                        AsyncImage(url: url) { img in
                                            img.resizable().aspectRatio(1.0, contentMode: .fill)
                                        } placeholder: {
                                            Color.secondary.opacity(0.15)
                                        }
                                        .clipped()
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.top, 12)
            }
            .fullScreenCover(isPresented: Binding(
                get: { selectedAttachmentIndex != nil },
                set: { if !$0 { selectedAttachmentIndex = nil } }
            )) {
                NavigationStack {
                    ZStack {
                        Color.black.ignoresSafeArea()
                        
                        let activeURLs = documentURLs
                        if !activeURLs.isEmpty {
                            TabView(selection: Binding(
                                get: { min(selectedAttachmentIndex ?? 0, activeURLs.count - 1) },
                                set: { selectedAttachmentIndex = $0 }
                            )) {
                                ForEach(Array(activeURLs.enumerated()), id: \.offset) { index, photoUrl in
                                    ZoomableAsyncImageView(url: photoUrl)
                                        .tag(index)
                                }
                            }
                            #if os(iOS)
                            .tabViewStyle(.page(indexDisplayMode: .always))
                            #endif
                        }
                    }
                    .toolbar {
                        #if os(iOS)
                        ToolbarItem(placement: .topBarLeading) {
                            Button(action: { selectedAttachmentIndex = nil }) {
                                Image(systemName: "xmark")
                                    .foregroundColor(.white)
                                    .font(.headline)
                            }
                        }
                        
                        ToolbarItem(placement: .topBarTrailing) {
                            Button(role: .destructive) {
                                showDeleteAttachmentAlert = true
                            } label: {
                                Image(systemName: "trash")
                                    .foregroundColor(.red)
                                    .font(.headline)
                            }
                        }
                        #else
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Close") { selectedAttachmentIndex = nil }
                        }
                        ToolbarItem(placement: .primaryAction) {
                            Button("Delete", role: .destructive) { showDeleteAttachmentAlert = true }
                        }
                        #endif
                    }
                    .alert("Delete Photo", isPresented: $showDeleteAttachmentAlert) {
                        Button("Delete", role: .destructive) {
                            if let idx = selectedAttachmentIndex {
                                var currentURLs = documentURLs
                                if idx < currentURLs.count {
                                    currentURLs.remove(at: idx)
                                    documentURLs = currentURLs
                                    if currentURLs.isEmpty {
                                        selectedAttachmentIndex = nil
                                    } else {
                                        selectedAttachmentIndex = min(idx, currentURLs.count - 1)
                                    }
                                }
                            }
                        }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        Text("Are you sure you want to delete this photo?")
                    }
                }
            }
        }
    }
}

#if os(iOS)
public struct UIKitCompositionalPhotoGrid: UIViewRepresentable {
    var urls: [URL]
    var onSelect: (URL) -> Void
    
    public func makeCoordinator() -> Coordinator {
        Coordinator(urls: urls, onSelect: onSelect)
    }
    
    public func makeUIView(context: Context) -> UICollectionView {
        let itemSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(0.25), heightDimension: .fractionalWidth(0.25))
        let item = NSCollectionLayoutItem(layoutSize: itemSize)
        item.contentInsets = NSDirectionalEdgeInsets(top: 1.0, leading: 1.0, bottom: 1.0, trailing: 1.0)
        
        let groupSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0), heightDimension: .fractionalWidth(0.25))
        let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])
        
        let section = NSCollectionLayoutSection(group: group)
        let layout = UICollectionViewCompositionalLayout(section: section)
        
        let collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.backgroundColor = .clear
        collectionView.delegate = context.coordinator
        collectionView.dataSource = context.coordinator
        collectionView.register(PhotoGridCell.self, forCellWithReuseIdentifier: PhotoGridCell.reuseIdentifier)
        return collectionView
    }
    
    public func updateUIView(_ uiView: UICollectionView, context: Context) {
        context.coordinator.urls = urls
        uiView.reloadData()
    }
    
    public class Coordinator: NSObject, UICollectionViewDelegate, UICollectionViewDataSource {
        var urls: [URL]
        var onSelect: (URL) -> Void
        
        init(urls: [URL], onSelect: @escaping (URL) -> Void) {
            self.urls = urls
            self.onSelect = onSelect
        }
        
        public func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
            urls.count
        }
        
        public func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: PhotoGridCell.reuseIdentifier, for: indexPath) as! PhotoGridCell
            let url = urls[indexPath.item]
            cell.configure(with: url)
            return cell
        }
        
        public func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
            let url = urls[indexPath.item]
            onSelect(url)
        }
    }
}

class PhotoGridCell: UICollectionViewCell {
    static let reuseIdentifier = "PhotoGridCell"
    private let imageView = UIImageView()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        contentView.addSubview(imageView)
        imageView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            imageView.topAnchor.constraint(equalTo: contentView.topAnchor),
            imageView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            imageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor)
        ])
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func configure(with url: URL) {
        if let data = try? Data(contentsOf: url), let img = UIImage(data: data) {
            imageView.image = img
        } else {
            imageView.image = nil
            imageView.backgroundColor = .systemGray5
        }
    }
}
#endif

public struct AttachmentDetailView: View {
    @State var filename: String
    var imageURL: String
    var jobNumber: String
    @State var quickLookURL: URL? = nil
    
    public init(filename: String, imageURL: String, jobNumber: String) {
        _filename = State(initialValue: filename)
        self.imageURL = imageURL
        self.jobNumber = jobNumber
    }
    
    public var body: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    AsyncImage(url: URL(string: imageURL)) { img in
                        img.resizable()
                           .aspectRatio(contentMode: .fit)
                           .cornerRadius(8)
                    } placeholder: {
                        ProgressView()
                            .frame(height: 180)
                    }
                    .frame(maxWidth: .infinity, maxHeight: 260)
                    
                    Button(action: {
                        openQuickLook()
                    }) {
                        Label("Preview Document", systemImage: "eye.fill")
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 4)
            }
            
            Section {
                TextField("Document Name", text: $filename)
                    .textFieldStyle(.automatic)
            }
        }
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text(filename)
                        .font(.headline)
                        .lineLimit(1)
                    Text("#\(jobNumber)")
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
        }
        #if os(iOS)
        .quickLookPreview($quickLookURL)
        #endif
    }
    
    private func openQuickLook() {
        let tempDir = FileManager.default.temporaryDirectory
        let ext = (filename as NSString).pathExtension
        let safeExt = ext.isEmpty ? "pdf" : ext
        let fileURL = tempDir.appendingPathComponent("\(filename).\(safeExt)")
        if let data = "Sample Attachment Preview Document".data(using: .utf8) {
            try? data.write(to: fileURL)
        }
        quickLookURL = fileURL
    }
}

struct CustomerAttachmentGridRow: View {
    var urls: [URL]
    @Binding var selectedURL: URL?
    
    let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 4)
    
    var body: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(Array(urls.enumerated()), id: \.offset) { index, url in
                Button {
                    selectedURL = url
                } label: {
                    let isDoc = (index % 3 == 2)
                    let docType = (index % 2 == 0 ? "PDF" : "DOC")
                    
                    if isDoc {
                        ZStack {
                            Color.secondary.opacity(0.12)
                            VStack(spacing: 4) {
                                Image(systemName: "doc.text.fill")
                                    .font(.title2)
                                    .foregroundStyle(.blue)
                                Text(docType)
                                    .font(.caption2.weight(.bold))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .aspectRatio(1.0, contentMode: .fill)
                        .clipShape(Rectangle())
                    } else {
                        AsyncImage(url: url) { img in
                            img.resizable()
                               .aspectRatio(1.0, contentMode: .fill)
                        } placeholder: {
                            Color.secondary.opacity(0.12)
                        }
                        .clipped()
                        .clipShape(Rectangle())
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 4)
    }
}
struct ExpandableAttachmentDisclosureRow: View {
    var title: String
    var customer: Customer
    var appointment: Appointment?
    var urls: [URL]
    @Binding var selectedURL: URL?
    
    @State var isExpanded: Bool = false
    
    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(spacing: 0) {
                // Middle Row: Thumbnails
                GeometryReader { proxy in
                    let availableWidth = proxy.size.width
                    let totalSpacing: CGFloat = 8 * 4
                    let itemWidth = max(24, (availableWidth - totalSpacing) / 5)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(spacing: 8) {
                            ForEach(urls, id: \.self) { url in
                                Button {
                                    selectedURL = url
                                } label: {
                                    AsyncImage(url: url) { img in
                                        img.resizable()
                                           .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Color.secondary.opacity(0.15)
                                    }
                                    .frame(width: itemWidth, height: itemWidth)
                                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .frame(height: 56)
                .padding(.top, 8)
                .padding(.bottom, 12)
                
                Divider()
                
                // Bottom Row: Centered "View All"
                let destinationAppt = appointment ?? Appointment(customerId: customer.id, dateTime: Date(), jobNumber: 140029, jobType: "Service Call")
                NavigationLink(destination: CustomerSubScreen(title: "Attachments", customer: customer, appointment: destinationAppt)) {
                    HStack {
                        Text("View All")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.blue)
                        
                        Spacer()
                    }
                    .padding(.vertical, 10)
                    #if os(iOS)
                    .contentShape(Rectangle())
                    #endif
                }
                .buttonStyle(.plain)
            }
        } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.primary)
                .lineLimit(1)
        }
    }
}

// MARK: - Job History Data Model
public struct JobHistoryItem: Identifiable, Hashable, Equatable {
    public let id: UUID
    public var title: String
    public var jobNumber: Int
    public var formattedJobNumber: String
    public var jobType: String
    public var team: String
    public var date: String
    public var detail: String
    public var appointments: [Appointment]
    
    public static func == (lhs: JobHistoryItem, rhs: JobHistoryItem) -> Bool {
        lhs.id == rhs.id
    }
    
    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    public init(
        id: UUID = UUID(),
        title: String,
        jobNumber: Int,
        formattedJobNumber: String? = nil,
        jobType: String = "Installation",
        team: String = "Appliance",
        date: String,
        detail: String,
        appointments: [Appointment] = []
    ) {
        self.id = id
        self.title = title
        self.jobNumber = jobNumber
        if let formatted = formattedJobNumber {
            self.formattedJobNumber = formatted
        } else {
            self.formattedJobNumber = "#\(jobNumber)"
        }
        self.jobType = jobType
        self.team = team
        self.date = date
        self.detail = detail
        self.appointments = appointments
    }
}

// MARK: - Job Detail Screen (Opened on tapping a Job Card from Customer History)
public struct JobDetailScreen: View {
    var job: JobHistoryItem
    var customer: Customer
    
    public init(job: JobHistoryItem, customer: Customer) {
        self.job = job
        self.customer = customer
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            if job.appointments.isEmpty {
                VStack(spacing: 12) {
                    Spacer().frame(height: 120)
                    Image(systemName: "clock.arrow.circlepath")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 44, height: 44)
                        .foregroundColor(.secondary.opacity(0.6))
                    Text("No History for Job \(job.formattedJobNumber)")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text("No prior appointments found for this job.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.murphysGroupedBackground)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        let sortedAppts = job.appointments.sorted(by: { $0.appointmentSequenceNumber < $1.appointmentSequenceNumber })
                        ForEach(Array(sortedAppts.enumerated()), id: \.element.id) { idx, appt in
                            appointmentTileRow(appt: appt, sequenceNumber: idx + 1)
                        }
                    }
                    .padding(16)
                }
                .background(Color.murphysGroupedBackground)
            }
        }
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Appointments")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(job.formattedJobNumber)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    private func appointmentTileRow(appt: Appointment, sequenceNumber: Int) -> some View {
        NavigationLink(destination: AppointmentDetailScreen(appointment: appt)) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 8) {
                    Text("#\(sequenceNumber) - \(job.jobType)")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    let df = DateFormatter()
                    let _ = df.dateFormat = "MMM d, yyyy"
                    Text(df.string(from: appt.dateTime))
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary)
                        .padding(.top, 2)
                }
                
                HStack(alignment: .center) {
                    Text(appt.serviceNotes ?? job.detail)
                        .font(.subheadline)
                        .foregroundColor(.secondary.opacity(0.9))
                        .multilineTextAlignment(.leading)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.4))
                }
            }
            .padding(16)
            .background(Color.murphysCardBackground)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            #if os(iOS)
            .contentShape(Rectangle())
            #endif
        }
        .buttonStyle(PlainButtonStyle())
    }
}

public struct JobNotesAppointmentsScreen: View {
    public var jobNumber: String
    public var jobType: String
    public var customer: Customer
    @Environment(ScheduleStore.self) var scheduleStore
    
    public init(jobNumber: String, jobType: String, customer: Customer) {
        self.jobNumber = jobNumber
        self.jobType = jobType
        self.customer = customer
    }
    
    public var body: some View {
        let jobAppointments: [Appointment] = {
            let matches = scheduleStore.appointments.filter { appt in
                appt.formattedJobNumber == jobNumber || appt.rawJobNumberString == jobNumber.replacingOccurrences(of: "#", with: "")
            }
            var uniqueMap: [String: Appointment] = [:]
            for appt in matches {
                if uniqueMap[appt.formattedAppointmentNumber] == nil {
                    uniqueMap[appt.formattedAppointmentNumber] = appt
                }
            }
            return Array(uniqueMap.values).sorted(by: { $0.appointmentSequenceNumber < $1.appointmentSequenceNumber })
        }()
        
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(spacing: 0) {
                    ForEach(Array(jobAppointments.enumerated()), id: \.element.id) { idx, appt in
                        VStack(spacing: 0) {
                            NavigationLink(destination: CustomerSubScreen(title: "Notes", customer: customer, appointment: appt)) {
                                HStack(alignment: .center, spacing: 12) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(appt.formattedAppointmentNumber)
                                            .font(.headline)
                                            .foregroundColor(.primary)
                                        
                                        let dateStr = formattedApptDate(appt.startDate)
                                        let techName = appt.assignedTech ?? "Justin Lung"
                                        Text("\(dateStr) • \(techName)")
                                            .font(.caption.weight(.medium))
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    Image(systemName: "chevron.right")
                                        .font(.footnote.weight(.semibold))
                                        .foregroundColor(.secondary.opacity(0.4))
                                }
                                .padding(.vertical, 14)
                                .padding(.horizontal, 20)
                                #if os(iOS)
                                .contentShape(Rectangle())
                                #endif
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            if idx < jobAppointments.count - 1 {
                                Divider().padding(.horizontal, 20)
                            }
                        }
                    }
                }
                .background(Color.murphysCardBackground)
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Notes")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(jobNumber)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    private func formattedApptDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
}

public struct FieldItem: Identifiable, Sendable {
    public var id: String
    public var label: String
    public var appointmentID: String?
    public var children: [FieldItem]?
    
    public init(id: String, label: String, appointmentID: String? = nil, children: [FieldItem]? = nil) {
        self.id = id
        self.label = label
        self.appointmentID = appointmentID
        self.children = children
    }
}

struct ExpandableJobRowView: View {
    var parentJob: FieldItem
    var isLast: Bool
    var customer: Customer
    @State var isExpanded: Bool = false
    @Environment(ScheduleStore.self) var scheduleStore
    
    var body: some View {
        VStack(spacing: 0) {
            Button(action: {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            }) {
                HStack {
                    Text(parentJob.label)
                        .font(.callout.weight(.medium))
                        .foregroundColor(.primary)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.6))
                }
                .padding(.vertical, 14)
                .padding(.horizontal, 20)
                #if os(iOS)
                .contentShape(Rectangle())
                #endif
            }
            .buttonStyle(PlainButtonStyle())
            
            if isExpanded, let children = parentJob.children {
                ForEach(Array(children.enumerated()), id: \.element.id) { childIdx, childAppt in
                    VStack(spacing: 0) {
                        Divider().padding(.leading, 20)
                        
                        let matchedAppt = scheduleStore.appointments.first(where: { $0.id.uuidString == childAppt.appointmentID })
                        let targetAppt = matchedAppt ?? Appointment(
                            customerId: customer.id,
                            dateTime: Date().addingTimeInterval(-86400 * Double(childIdx + 2)),
                            status: .completed,
                            serviceNotes: "Recorded service note for appointment \(childAppt.label)",
                            jobNumber: 140029,
                            appointmentSequenceNumber: childIdx + 1,
                            jobType: "Diagnostic",
                            assignedTech: "Justin Lung"
                        )
                        
                        NavigationLink(destination: CustomerSubScreen(title: "Notes", customer: customer, appointment: targetAppt)) {
                            HStack {
                                Text(childAppt.label)
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundColor(.secondary.opacity(0.4))
                            }
                            .padding(.vertical, 12)
                            .padding(.leading, 32)
                            .padding(.trailing, 20)
                            #if os(iOS)
                            .contentShape(Rectangle())
                            #endif
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
            }
            
            if !isLast {
                Divider().padding(.horizontal, 20)
            }
        }
    }
}

public struct HistoryInvoiceRowView: View {
    @Environment(\.colorScheme) var colorScheme
    var invNumber: String
    var dueDate: String
    var amount: String
    var customer: Customer
    var paymentStatus: String?
    @State var selectedStatus: String
    
    let availableStatuses = ["Open - Draft", "Presented", "Signed", "Voided", "Closed"]
    
    public init(invNumber: String, initialStatus: String, dueDate: String, amount: String, customer: Customer, paymentStatus: String? = nil) {
        self.invNumber = invNumber
        self.dueDate = dueDate
        self.amount = amount
        self.customer = customer
        self.paymentStatus = paymentStatus
        self._selectedStatus = State(initialValue: initialStatus)
    }
    
    var effectivePaymentStatus: String {
        let amt = amount.trimmingCharacters(in: .whitespaces)
        if amt == "$0.00" || amt == "$0" || amt == "0.00" || amt == "0" {
            return "No Payment Required"
        }
        if let p = paymentStatus {
            return p
        }
        return "Paid"
    }
    
    @ViewBuilder
    private func paymentStatusIndicator(_ status: String) -> some View {
        let isPaid = status.lowercased() == "paid"
        
        let fgColor: Color = isPaid ? (colorScheme == .dark ? Color(red: 110/255.0, green: 231/255.0, blue: 183/255.0) : Color(red: 4/255.0, green: 120/255.0, blue: 87/255.0)) :
            (colorScheme == .dark ? Color(red: 156/255.0, green: 163/255.0, blue: 175/255.0) : Color(red: 75/255.0, green: 85/255.0, blue: 99/255.0))
            
        let bgColor: Color = isPaid ? (colorScheme == .dark ? Color(red: 2/255.0, green: 44/255.0, blue: 34/255.0) : Color(red: 236/255.0, green: 253/255.0, blue: 245/255.0)) :
            (colorScheme == .dark ? Color(red: 31/255.0, green: 41/255.0, blue: 55/255.0) : Color(red: 243/255.0, green: 244/255.0, blue: 246/255.0))
            
        let borderColor: Color = isPaid ? (colorScheme == .dark ? Color(red: 6/255.0, green: 95/255.0, blue: 70/255.0) : Color(red: 167/255.0, green: 243/255.0, blue: 208/255.0)) :
            (colorScheme == .dark ? Color(red: 55/255.0, green: 65/255.0, blue: 81/255.0) : Color(red: 229/255.0, green: 231/255.0, blue: 235/255.0))
        
        Text(status)
            .font(.caption.weight(.medium))
            .foregroundColor(fgColor)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(bgColor)
            .cornerRadius(6)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(borderColor, lineWidth: 1)
            )
    }
    
    public var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(invNumber)
                    .font(.callout.weight(.semibold))
                    .foregroundColor(.primary)
                
                Menu {
                    ForEach(availableStatuses, id: \.self) { status in
                        Button(status) {
                            selectedStatus = status
                        }
                    }
                } label: {
                    Text(selectedStatus)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.blue)
                }
                .buttonStyle(PlainButtonStyle())
            }
            
            Spacer()
            
            NavigationLink(destination: CreateInvoiceScreen(customer: customer)) {
                HStack(spacing: 12) {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(amount)
                            .font(.callout.weight(.semibold))
                            .foregroundColor(.primary)
                        
                        Text("Due: \(dueDate)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        paymentStatusIndicator(effectivePaymentStatus)
                            .padding(.top, 2)
                    }
                    
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.semibold))
                        .foregroundColor(.secondary.opacity(0.4))
                }
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(16)
        #if os(iOS)
        .contentShape(Rectangle())
        #endif
    }
}

public struct ZoomableAsyncImageView: View {
    public let url: URL?
    @State var scale: CGFloat = 1.0
    @State var lastScale: CGFloat = 1.0
    @State var offset: CGSize = .zero
    @State var lastOffset: CGSize = .zero
    
    public init(url: URL?) {
        self.url = url
    }
    
    public var body: some View {
        AsyncImage(url: url) { image in
            image
                .resizable()
                .aspectRatio(contentMode: .fit)
                .scaleEffect(scale)
                .offset(offset)
                #if true
                .gesture(
                    MagnificationGesture()
                        .onChanged { value in
                            let delta = value / lastScale
                            lastScale = value
                            scale = max(1.0, min(scale * delta, 4.0))
                        }
                        .onEnded { _ in
                            lastScale = 1.0
                            if scale <= 1.0 {
                                withAnimation(.spring()) {
                                    scale = 1.0
                                    offset = .zero
                                    lastOffset = .zero
                                }
                            }
                        }
                )
                .simultaneousGesture(
                    scale > 1.0 ?
                    DragGesture()
                        .onChanged { value in
                            offset = CGSize(
                                width: lastOffset.width + value.translation.width,
                                height: lastOffset.height + value.translation.height
                            )
                        }
                        .onEnded { _ in
                            lastOffset = offset
                        }
                    : nil
                )
                .onTapGesture(count: 2) {
                    withAnimation(.spring()) {
                        if scale > 1.0 {
                            scale = 1.0
                            offset = .zero
                            lastOffset = .zero
                        } else {
                            scale = 2.5
                        }
                    }
                }
                #endif
        } placeholder: {
            ProgressView().tint(.white)
        }
    }
}
