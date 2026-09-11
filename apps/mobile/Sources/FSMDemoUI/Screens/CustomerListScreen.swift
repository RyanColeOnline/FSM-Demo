import SwiftUI

public struct CustomerListScreen: View {
    @Environment(CustomerStore.self) var customerStore
    @State var searchTerm = ""
    
    @State var showAddCustomerSheet = false
    #if true
    @Namespace private var animationNamespace
    #endif
    
    var navigationTitle: String?
    var forceEmpty: Bool
    var paymentActionType: PaymentActionType?
    var showSkipButton: Bool
    var isAppointmentFlow: Bool
    @State var navigateWithoutCustomer = false
    
    public init(navigationTitle: String? = nil, forceEmpty: Bool = false, paymentActionType: PaymentActionType? = nil, showSkipButton: Bool = false, isAppointmentFlow: Bool = false) {
        self.navigationTitle = navigationTitle
        self.forceEmpty = forceEmpty
        self.paymentActionType = paymentActionType
        self.showSkipButton = showSkipButton
        self.isAppointmentFlow = isAppointmentFlow || (navigationTitle == "Select Customer")
    }
    
    private var isTopLevelTab: Bool {
        navigationTitle == nil || navigationTitle == "Customers" || navigationTitle == "Office"
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "person.2.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 48, height: 48)
                .foregroundColor(.secondary)
            Text("No Customers Found")
                .font(.headline)
                .foregroundColor(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, minHeight: 300)
        .background(Color.murphysGroupedBackground)
    }
    
    struct CustomerGroupSection: Identifiable {
        let id: String
        let letter: String
        let customers: [Customer]
    }
    
    private func buildSections(from list: [Customer]) -> [CustomerGroupSection] {
        let grouped = Dictionary(grouping: list) { $0.firstLetterGroup }
        let sortedKeys = grouped.keys.sorted { (a, b) -> Bool in
            if a == "#" { return true }
            if b == "#" { return false }
            return a < b
        }
        return sortedKeys.map { letter in
            let items = grouped[letter] ?? []
            let sortedItems = items.sorted {
                $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending
            }
            return CustomerGroupSection(id: letter, letter: letter, customers: sortedItems)
        }
    }
    
    @ViewBuilder
    private func customerListView(filtered: [Customer]) -> some View {
        let sections = buildSections(from: filtered)
        
        List {
            ForEach(sections) { section in
                Section(header: makeSectionHeader(section.letter)) {
                    ForEach(section.customers) { customer in
                        CustomerRowView(
                            customer: customer,
                            navigationTitle: navigationTitle,
                            paymentActionType: paymentActionType,
                            isAppointmentFlow: isAppointmentFlow
                        )
                        .id(customer.id)
                    }
                }
                .id(section.letter)
            }
            
            if customerStore.hasMorePages && searchTerm.isEmpty {
                HStack {
                    Spacer()
                    ProgressView()
                        .padding(.vertical, 16)
                    Spacer()
                }
                .listRowBackground(Color.clear)
                .onAppear {
                    Task {
                        await customerStore.loadMoreCustomers()
                    }
                }
            }
        }
        #if true
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(Color.murphysSystemBackground)
        #else
        .background(Color.white)
        #endif
    }
    
    @ViewBuilder
    private var mainContentView: some View {
        let filtered = getFilteredCustomers()
        if navigationTitle == "Office" {
            OfficeTilesView()
        } else if filtered.isEmpty {
            emptyStateView
        } else {
            customerListView(filtered: filtered)
        }
    }
    
    @ViewBuilder
    private var baseScreenContent: some View {
        VStack(spacing: 0) {
            mainContentView
            
            // Floating Quick Action bar
            if navigationTitle == nil {
                HStack(spacing: 24) {
                    HStack(spacing: 16) {
                        Button(action: {
                            // voice placeholder
                        }) {
                            Image(systemName: "mic.fill")
                                .font(.title3)
                                .foregroundColor(.primary)
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Divider()
                            .frame(height: 24)
                        
                        Button(action: {
                            // Quick notes
                        }) {
                            Image(systemName: "square.and.pencil")
                                .font(.title3)
                                .foregroundColor(.primary)
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Color.murphysCardBackground)
                    .cornerRadius(20)
                    .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 4)
                    
                    Spacer()
                    
                    #if true
                    Button(action: {
                        showAddCustomerSheet = true
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "person.badge.plus")
                                .font(.callout.weight(.bold))
                            Text("New Customer")
                                .font(.subheadline.weight(.semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.blue)
                        .cornerRadius(20)
                        .shadow(color: Color.blue.opacity(0.25), radius: 8, x: 0, y: 4)
                    }
                    .buttonStyle(PlainButtonStyle())
                    .applyMatchedSource(id: "addCustomer", in: animationNamespace)
                    #else
                    Button(action: {
                        showAddCustomerSheet = true
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "person.badge.plus")
                                .font(.callout.weight(.bold))
                            Text("New Customer")
                                .font(.subheadline.weight(.semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.blue)
                        .cornerRadius(20)
                        .shadow(color: Color.blue.opacity(0.25), radius: 8, x: 0, y: 4)
                    }
                    .buttonStyle(PlainButtonStyle())
                    #endif
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
        .navigationTitle(navigationTitle ?? "Office")
        #if os(iOS)
        .toolbarTitleDisplayMode(isTopLevelTab ? .inlineLarge : .inline)
        #endif
        #if os(iOS)
        .toolbarBackground(.visible, for: .navigationBar)
        #endif
        .toolbar {
            if navigationTitle == "Customers" || isAppointmentFlow || navigationTitle == "Select Customer" {
                ToolbarItem(placement: .primaryAction) {
                    #if true
                    Button(action: { showAddCustomerSheet = true }) {
                        Image(systemName: "plus")
                            .font(.headline)
                            .foregroundColor(.primary)
                    }
                    .applyMatchedSource(id: "addCustomer", in: animationNamespace)
                    #else
                    Button(action: { showAddCustomerSheet = true }) {
                        Image(systemName: "plus")
                            .font(.headline)
                            .foregroundColor(.primary)
                    }
                    #endif
                }
            }
            if showSkipButton {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Skip") {
                        navigateWithoutCustomer = true
                    }
                    .fontWeight(.medium)
                }
            }
        }
        .sheet(isPresented: $showAddCustomerSheet) {
            NavigationStack {
                CustomerAddScreen()
            }
            .presentationDragIndicator(.visible)
        }
        .navigationDestination(isPresented: $navigateWithoutCustomer) {
            if let action = paymentActionType {
                if action == .setupPaymentPlan {
                    SetupPaymentPlanFormScreen(customer: nil)
                } else {
                    PaymentInvoiceSelectScreen(customer: nil, actionType: action)
                }
            } else {
                AppointmentAddScreen(customer: Customer(id: UUID(), name: "Sample Customer", email: "", phone: "", address: Address(street: "", city: "", state: "", zipCode: "")))
            }
        }
        .onChange(of: searchTerm) { _, newTerm in
            customerStore.searchCustomers(query: newTerm)
        }
        .onAppear {
            if !forceEmpty {
                Task {
                    await customerStore.fetchCustomers()
                }
            }
        }
    }
    
    public var body: some View {
        if navigationTitle == "Office" {
            baseScreenContent
        } else {
            baseScreenContent
                .searchable(text: $searchTerm, prompt: "Search name, email, phone...")
        }
    }
    
    @ViewBuilder
    private func makeSectionHeader(_ letter: String) -> some View {
        #if true
        Text(letter)
            .font(.callout)
            .foregroundColor(.secondary)
            .textCase(nil)
            .id(letter)
            .listRowInsets(EdgeInsets(top: 6, leading: 25, bottom: 6, trailing: 16))
        #else
        Text(letter)
            .font(.callout)
            .foregroundColor(.secondary)
            .textCase(nil)
            .id(letter)
        #endif
    }
    
    private func getFilteredCustomers() -> [Customer] {
        if forceEmpty {
            return []
        }
        let trimmed = searchTerm.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty {
            return customerStore.customers
        }
        let term = trimmed.lowercased()
        
        var combined = customerStore.customers
        for rc in customerStore.remoteSearchResults {
            if !combined.contains(where: { $0.id == rc.id }) {
                combined.append(rc)
            }
        }
        
        return combined.filter { customer in
            customer.displayName.lowercased().contains(term) ||
            customer.name.lowercased().contains(term) ||
            customer.email.lowercased().contains(term) ||
            customer.phone.lowercased().contains(term) ||
            customer.address.street.lowercased().contains(term) ||
            customer.address.city.lowercased().contains(term)
        }
    }
}


struct CustomerRowView: View {
    var customer: Customer
    var navigationTitle: String? = nil
    var paymentActionType: PaymentActionType? = nil
    var isAppointmentFlow: Bool = false
    
    private var isSelectMode: Bool {
        if isAppointmentFlow { return true }
        if let title = navigationTitle, !title.isEmpty {
            return title != "Customers" && title != "Office"
        }
        return false
    }
    
    var body: some View {
        ZStack(alignment: .leading) {
            if let action = paymentActionType {
                if action == .setupPaymentPlan {
                    NavigationLink(destination: SetupPaymentPlanFormScreen(customer: customer)) {
                        EmptyView()
                    }
                    .opacity(0)
                } else {
                    NavigationLink(destination: PaymentInvoiceSelectScreen(customer: customer, actionType: action)) {
                        EmptyView()
                    }
                    .opacity(0)
                }
            } else if isSelectMode {
                NavigationLink(destination: AppointmentAddScreen(customer: customer)) {
                    EmptyView()
                }
                .opacity(0)
            } else {
                NavigationLink(destination: CustomerProfileScreen(customer: customer)) {
                    EmptyView()
                }
                .opacity(0)
            }
            
            CustomerNameLabel(name: customer.displayName)
        }
        #if true
        .listRowInsets(EdgeInsets(top: 8, leading: 25, bottom: 8, trailing: 16))
        #endif
    }
}

struct CustomerNameLabel: View {
    let name: String
    
    var body: some View {
        HStack {
            Text(name)
                .font(.headline)
                .foregroundColor(.primary)
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

#if compiler(>=6.0)
struct ZoomTransitionModifier: ViewModifier {
    var sourceID: String
    var namespace: Namespace.ID
    
    func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.zoomTransition(sourceID: sourceID, in: namespace)
        } else {
            content
        }
    }
}

struct MatchedSourceModifier: ViewModifier {
    var id: String
    var namespace: Namespace.ID
    
    func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.matchedSource(id: id, in: namespace)
        } else {
            content
        }
    }
}
#endif

extension View {
    #if compiler(>=6.0)
    @available(iOS 18.0, *)
    fileprivate func zoomTransition(sourceID: String, in namespace: Namespace.ID) -> some View {
        self.navigationTransition(.zoom(sourceID: sourceID, in: namespace))
    }
    
    @available(iOS 18.0, *)
    fileprivate func matchedSource(id: String, in namespace: Namespace.ID) -> some View {
        self.matchedTransitionSource(id: id, in: namespace)
    }
    
    func applyZoomTransition(sourceID: String, in namespace: Namespace.ID) -> some View {
        self.modifier(ZoomTransitionModifier(sourceID: sourceID, namespace: namespace))
    }
    
    func applyMatchedSource(id: String, in namespace: Namespace.ID) -> some View {
        self.modifier(MatchedSourceModifier(id: id, namespace: namespace))
    }
    #endif
}

struct OfficeTilesView: View {
    @Environment(ScheduleStore.self) var scheduleStore
    
    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                // 1. Time Clock Tile
                NavigationLink(destination: TimeClockScreen()) {
                    TimeClockTileCard()
                }
                .buttonStyle(PlainButtonStyle())
                
                // 2. Price Book Tile
                NavigationLink(destination: PriceBookScreen()) {
                    OfficeTileCard(
                        title: "Price Book",
                        iconName: "text.book.closed",
                        darkIconName: "text.book.closed.fill",
                        iconColor: .indigo
                    )
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(16)
        }
        .background(Color.murphysGroupedBackground)
    }
}

public struct OfficeTileCard: View {
    @Environment(\.colorScheme) var colorScheme
    
    public var title: String
    public var lightIconName: String
    public var darkIconName: String
    public var iconColor: Color
    public var lightIconWeight: Font.Weight
    public var darkIconWeight: Font.Weight
    
    public init(
        title: String,
        iconName: String,
        darkIconName: String? = nil,
        iconColor: Color,
        lightIconWeight: Font.Weight = .regular,
        darkIconWeight: Font.Weight = .regular
    ) {
        self.title = title
        self.lightIconName = iconName
        self.darkIconName = darkIconName ?? iconName
        self.iconColor = iconColor
        self.lightIconWeight = lightIconWeight
        self.darkIconWeight = darkIconWeight
    }
    
    var activeIconName: String {
        colorScheme == .dark ? darkIconName : lightIconName
    }
    
    var activeIconWeight: Font.Weight {
        colorScheme == .dark ? darkIconWeight : lightIconWeight
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Image(systemName: activeIconName)
                    .font(.title2.weight(activeIconWeight))
                    .foregroundColor(iconColor)
                    .frame(width: 44, height: 44)
                    .background(iconColor.opacity(0.12))
                    .cornerRadius(12)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary.opacity(0.5))
            }
            
            Spacer(minLength: 8)
            
            Text(title)
                .font(.callout.weight(.semibold))
                .foregroundColor(.primary)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
                .multilineTextAlignment(.leading)
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 130, maxHeight: 130, alignment: .topLeading)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 3)
    }
}

struct TimeClockTileCard: View {
    @Environment(\.colorScheme) var colorScheme
    @Environment(ScheduleStore.self) var scheduleStore
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header: Clock icon and Chevron
            HStack {
                Image(systemName: colorScheme == .dark ? "clock.fill" : "clock")
                    .font(.title2)
                    .foregroundColor(.blue)
                    .frame(width: 44, height: 44)
                    .background(Color.blue.opacity(0.12))
                    .cornerRadius(12)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundColor(.secondary.opacity(0.5))
            }
            
            Spacer(minLength: 8)
            
            // If clocked in, show timer above the title
            if scheduleStore.isClockedIn {
                Text(scheduleStore.elapsedTimeString)
                    .font(.caption.weight(.medium))
                    #if os(iOS)
                    .monospacedDigit()
                    #endif
                    .foregroundColor(.secondary)
                    .padding(.bottom, 2)
            }
            
            Text("Time Clock")
                .font(.callout.weight(.semibold))
                .foregroundColor(.primary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 130, maxHeight: 130, alignment: .topLeading)
        .background(Color.murphysCardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 3)
    }
}






























