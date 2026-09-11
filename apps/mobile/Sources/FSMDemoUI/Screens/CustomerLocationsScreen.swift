import SwiftUI

public struct CustomerLocationsScreen: View {
    @Environment(CustomerStore.self) var customerStore
    @Environment(\.colorScheme) var colorScheme
    var customer: Customer
    
    @State var searchText = ""
    @State var showAddLocationSheet = false
    @State var locationToDelete: Address? = nil
    @State var showDeleteConfirmation = false
    @State var locationToEdit: Address? = nil
    @State var showEditLocationSheet = false
    @State var displayedLocations: [Address] = []
    
    public init(customer: Customer) {
        self.customer = customer
    }
    
    var currentCustomer: Customer {
        customerStore.customers.first(where: { $0.id == customer.id }) ?? customer
    }
    
    var sortedLocations: [Address] {
        let locs = currentCustomer.locations
        guard let defaultLoc = currentCustomer.locations.first else { return locs }
        
        var result: [Address] = [defaultLoc]
        var seen = Set<Address>([defaultLoc])
        
        let billing = currentCustomer.effectiveBillingAddress
        if billing != defaultLoc && locs.contains(billing) {
            result.append(billing)
            seen.insert(billing)
        }
        
        for loc in locs {
            if !seen.contains(loc) {
                seen.insert(loc)
                result.append(loc)
            }
        }
        return result
    }
    
    var filteredLocations: [Address] {
        let base = displayedLocations.isEmpty ? sortedLocations : displayedLocations
        if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return base
        } else {
            let query = searchText.lowercased()
            return base.filter { loc in
                "\(loc.street), \(loc.city), \(loc.state) \(loc.zipCode)".lowercased().contains(query)
            }
        }
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            List {
                Section {
                    if filteredLocations.isEmpty {
                        Text("No locations found")
                            .foregroundColor(.secondary)
                            .font(.subheadline)
                    } else {
                        ForEach(filteredLocations, id: \.formattedAddress) { loc in
                            let formattedStr = "\(loc.street), \(loc.city), \(loc.state) \(loc.zipCode)"
                            let isDefault = (loc == currentCustomer.address || loc == currentCustomer.locations.first)
                            let isBilling = (loc == currentCustomer.effectiveBillingAddress || currentCustomer.locations.count == 1)
                            
                            HStack(alignment: .center, spacing: 10) {
                                VStack(alignment: .leading, spacing: 6) {
                                    if isDefault || isBilling {
                                        HStack(spacing: 8) {
                                            if isDefault {
                                                let fg = colorScheme == .dark ? Color(red: 147/255.0, green: 197/255.0, blue: 253/255.0) : Color(red: 29/255.0, green: 78/255.0, blue: 216/255.0)
                                                let bg = colorScheme == .dark ? Color(red: 23/255.0, green: 37/255.0, blue: 84/255.0) : Color(red: 239/255.0, green: 246/255.0, blue: 255/255.0)
                                                let border = colorScheme == .dark ? Color(red: 30/255.0, green: 64/255.0, blue: 175/255.0) : Color(red: 191/255.0, green: 219/255.0, blue: 254/255.0)
                                                Text("Default")
                                                    .font(.caption.weight(.medium))
                                                    .foregroundColor(fg)
                                                    .padding(.horizontal, 10)
                                                    .padding(.vertical, 4)
                                                    .background(bg)
                                                    .cornerRadius(6)
                                                    .overlay(
                                                        RoundedRectangle(cornerRadius: 6)
                                                            .stroke(border, lineWidth: 1)
                                                    )
                                            }
                                            if isBilling {
                                                let fg = colorScheme == .dark ? Color(red: 110/255.0, green: 231/255.0, blue: 183/255.0) : Color(red: 4/255.0, green: 120/255.0, blue: 87/255.0)
                                                let bg = colorScheme == .dark ? Color(red: 2/255.0, green: 44/255.0, blue: 34/255.0) : Color(red: 236/255.0, green: 253/255.0, blue: 245/255.0)
                                                let border = colorScheme == .dark ? Color(red: 6/255.0, green: 95/255.0, blue: 70/255.0) : Color(red: 167/255.0, green: 243/255.0, blue: 208/255.0)
                                                Text("Billing")
                                                    .font(.caption.weight(.medium))
                                                    .foregroundColor(fg)
                                                    .padding(.horizontal, 10)
                                                    .padding(.vertical, 4)
                                                    .background(bg)
                                                    .cornerRadius(6)
                                                    .overlay(
                                                        RoundedRectangle(cornerRadius: 6)
                                                            .stroke(border, lineWidth: 1)
                                                    )
                                            }
                                        }
                                        .frame(height: 24)
                                    }
                                    
                                    Text(formattedStr)
                                        .font(.callout)
                                        .foregroundColor(.primary)
                                        .lineLimit(1)
                                }
                                
                                Spacer()
                            }
                            .padding(.vertical, 6)
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                if currentCustomer.locations.count == 1 {
                                    Button(action: {
                                        locationToEdit = loc
                                        showEditLocationSheet = true
                                    }) {
                                        Label("Edit", systemImage: "pencil")
                                    }
                                    .tint(.blue)
                                } else {
                                    Button(role: .destructive, action: {
                                        locationToDelete = loc
                                        showDeleteConfirmation = true
                                    }) {
                                        Label("Delete", systemImage: "trash")
                                    }
                                    .tint(.red)
                                    
                                    Button(action: {
                                        let updated = currentCustomer
                                        updated.effectiveBillingAddress = loc
                                        customerStore.updateCustomerLocally(updated)
                                    }) {
                                        Label("Billing", systemImage: "creditcard")
                                    }
                                    .tint(.green)
                                    
                                    Button(action: {
                                        let updated = currentCustomer
                                        if let idx = updated.locations.firstIndex(where: { $0 == loc }), idx != 0 {
                                            let item = updated.locations.remove(at: idx)
                                            updated.locations.insert(item, at: 0)
                                            updated.address = item
                                            customerStore.updateCustomerLocally(updated)
                                        }
                                    }) {
                                        Label("Default", systemImage: "star")
                                    }
                                    .tint(.blue)
                                }
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
            .searchable(text: $searchText, prompt: "Search locations")
        }
        .onAppear {
            displayedLocations = sortedLocations
        }
        .toolbar {
            ToolbarItem(placement: .principal) {
                VStack(spacing: 2) {
                    Text("Locations")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text(customer.displayName)
                        .font(.caption.weight(.medium))
                        .foregroundColor(.secondary)
                }
            }
            
            ToolbarItem(placement: .primaryAction) {
                Button(action: {
                    showAddLocationSheet = true
                }) {
                    Image(systemName: "plus")
                        .font(.callout.weight(.semibold))
                        .foregroundColor(.primary)
                }
            }
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .confirmationDialog("Delete Location?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
            Button("Delete Location", role: .destructive) {
                if let locToDelete = locationToDelete {
                    performDelete(location: locToDelete)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this location? This action cannot be undone.")
        }
        .sheet(isPresented: $showAddLocationSheet) {
            AddLocationSheet { newLoc in
                customer.locations.append(newLoc)
                customerStore.updateCustomerLocally(customer)
                displayedLocations.append(newLoc)
            }
        }
        .sheet(isPresented: $showEditLocationSheet) {
            if let editLoc = locationToEdit {
                EditSingleLocationSheet(address: editLoc) { updatedLoc in
                    if let idx = customer.locations.firstIndex(where: { $0 == editLoc }) {
                        customer.locations[idx] = updatedLoc
                        if customer.address == editLoc {
                            customer.address = updatedLoc
                        }
                        if customer.billingAddress == editLoc {
                            customer.billingAddress = updatedLoc
                        }
                        customerStore.updateCustomerLocally(customer)
                    }
                    if let dIdx = displayedLocations.firstIndex(where: { $0 == editLoc }) {
                        displayedLocations[dIdx] = updatedLoc
                    }
                }
            }
        }
    }
    
    private func performDelete(location: Address) {
        withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
            let isWasDefault = (location == customer.locations.first)
            let isWasBilling = (location == customer.billingAddress)
            
            customer.locations.removeAll(where: { $0 == location })
            displayedLocations.removeAll(where: { $0 == location })
            
            if let remainingFirst = customer.locations.first {
                if isWasDefault || customer.address == location {
                    customer.address = remainingFirst
                }
                if isWasBilling || customer.billingAddress == location {
                    customer.billingAddress = remainingFirst
                }
                if customer.locations.count == 1 {
                    customer.address = remainingFirst
                    customer.billingAddress = remainingFirst
                }
            }
            customerStore.updateCustomerLocally(customer)
            locationToDelete = nil
        }
    }
}

struct EditSingleLocationSheet: View {
    @Environment(\.dismiss) var dismiss
    @State var street: String
    @State var city: String
    @State var stateStr: String
    @State var zipCode: String
    
    var onSave: (Address) -> Void
    
    init(address: Address, onSave: @escaping (Address) -> Void) {
        self._street = State(initialValue: address.street)
        self._city = State(initialValue: address.city)
        self._stateStr = State(initialValue: address.state)
        self._zipCode = State(initialValue: address.zipCode)
        self.onSave = onSave
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Address Details") {
                    TextField("Street", text: $street)
                    TextField("City", text: $city)
                    TextField("State", text: $stateStr)
                    TextField("ZIP Code", text: $zipCode)
                }
            }
            .navigationTitle("Edit Address")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        let updated = Address(street: street, city: city, state: stateStr, zipCode: zipCode)
                        onSave(updated)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}
