import SwiftUI

public struct LocationSelectionModal: View {
    public var customerName: String
    public var locations: [Address]
    public var selectedAddressString: String?
    public var onSelect: (Address) -> Void
    @Environment(\.dismiss) var dismiss
    @Environment(\.colorScheme) var colorScheme
    @State var searchText: String = ""
    
    public init(
        customerName: String,
        locations: [Address],
        selectedAddressString: String? = nil,
        onSelect: @escaping (Address) -> Void
    ) {
        self.customerName = customerName
        self.locations = locations
        self.selectedAddressString = selectedAddressString
        self.onSelect = onSelect
    }
    
    var filteredLocations: [(index: Int, address: Address)] {
        let indexed = Array(locations.enumerated().map { (index: $0.offset, address: $0.element) })
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if trimmed.isEmpty {
            return indexed
        }
        return indexed.filter { item in
            let loc = item.address
            let full = "\(loc.street) \(loc.city) \(loc.state) \(loc.zipCode)".lowercased()
            return full.contains(trimmed)
        }
    }
    
    public var body: some View {
        NavigationStack {
            List {
                if filteredLocations.isEmpty {
                    Text("No locations found")
                        .font(.callout)
                        .foregroundColor(.secondary)
                        .listRowBackground(Color.clear)
                } else {
                    ForEach(filteredLocations, id: \.index) { item in
                        let loc = item.address
                        let fullStr = "\(loc.street), \(loc.city), \(loc.state) \(loc.zipCode)".trimmingCharacters(in: .whitespaces)
                        let isSelected = (selectedAddressString != nil && (selectedAddressString == fullStr || selectedAddressString?.contains(loc.street) == true))
                        let isDefault = (item.index == 0)
                        
                        Button(action: {
                            onSelect(loc)
                            dismiss()
                        }) {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    HStack(spacing: 6) {
                                        if isDefault {
                                            Text("Default")
                                                .font(.caption2.weight(.bold))
                                                .foregroundColor(.blue)
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color.blue.opacity(0.12))
                                                .cornerRadius(4)
                                        }
                                        
                                        Text(loc.street.isEmpty ? "Location \(item.index + 1)" : loc.street)
                                            .font(.callout.weight(.medium))
                                            .foregroundColor(.primary)
                                    }
                                    
                                    if !loc.city.isEmpty || !loc.state.isEmpty || !loc.zipCode.isEmpty {
                                        Text("\(loc.city), \(loc.state) \(loc.zipCode)".trimmingCharacters(in: .whitespaces))
                                            .font(.callout)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                
                                Spacer()
                                
                                if isSelected {
                                    Image(systemName: "checkmark")
                                        .font(.callout.weight(.bold))
                                        .foregroundColor(.blue)
                                }
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())
                        .listRowBackground(isSelected ? Color.blue.opacity(0.08) : Color.murphysCardBackground)
                    }
                }
            }
            #if true
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Color.murphysGroupedBackground)
            #endif
            .searchable(text: $searchText, prompt: "Search locations...")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    VStack(spacing: 2) {
                        Text("Locations")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Text(customerName)
                            .font(.caption.weight(.medium))
                            .foregroundColor(.secondary)
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        dismiss()
                    }
                    .font(.callout)
                }
            }
        }
        #if os(iOS)
        .presentationDetents([.large])
        #endif
    }
}
