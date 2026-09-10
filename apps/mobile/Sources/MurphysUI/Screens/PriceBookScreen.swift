import SwiftUI
import Foundation

// MARK: - Price Book Main Screen
public struct PriceBookScreen: View {
    @Environment(PriceBookStore.self) var priceBookStore
    var sessionManager = SessionManager.shared
    @State var selectedSegment = 0
    @State var searchText = ""
    
    public init() {}
    
    var searchResults: [PriceBookItem] {
        priceBookStore.search(query: searchText)
    }
    
    var displayedCategories: [PriceBookCategoryNode] {
        return priceBookStore.topLevelCategories
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // 2-Option Slider / Segmented Control
            Picker("View Mode", selection: $selectedSegment) {
                Text("Price Book").tag(0)
                Text("QuickBooks").tag(1)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 8)
            
            if !searchText.isEmpty {
                // Search Results List
                List {
                    Section(header: Text("Search Results (\(searchResults.count))")) {
                        if searchResults.isEmpty {
                            Text("No items found matching \"\(searchText)\".")
                                .foregroundColor(.secondary)
                                .padding(.vertical, 8)
                        } else {
                            ForEach(searchResults) { item in
                                NavigationLink(destination: PriceBookItemDetailScreen(item: item)) {
                                    PriceBookItemRow(item: item)
                                }
                            }
                        }
                    }
                }
                .listStyle(.plain)
            } else if selectedSegment == 0 {
                // Price Book Hierarchy View
                List {
                    Section(header: Text("Categories")) {
                        ForEach(displayedCategories) { category in
                            NavigationLink(destination: PriceBookCategoryScreen(category: category)) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(category.name)
                                        .font(.callout.weight(.semibold))
                                        .foregroundColor(.primary)
                                    Text("\(category.totalItemCount) items")
                                        .font(.caption.weight(.medium))
                                        .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                }
                .listStyle(.plain)
            } else {
                // QuickBooks Income Accounts View
                List {
                    Section(header: Text("Income Accounts")) {
                        ForEach(priceBookStore.quickBooksAccounts, id: \.account) { accountGroup in
                            NavigationLink(destination: QuickBooksAccountItemsScreen(accountName: accountGroup.account, items: accountGroup.items)) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(accountGroup.account)
                                        .font(.callout.weight(.semibold))
                                        .foregroundColor(.primary)
                                    Text("\(accountGroup.items.count) items")
                                        .font(.caption.weight(.medium))
                                        .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
        .background(Color.murphysGroupedBackground)
        .navigationTitle("Price Book")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search items, part numbers, accounts...")
        #endif
    }
}

// MARK: - Nested Category Screen
struct PriceBookCategoryScreen: View {
    let category: PriceBookCategoryNode
    
    var body: some View {
        List {
            if !category.subcategories.isEmpty {
                Section(header: Text("Subcategories")) {
                    ForEach(category.subcategories) { sub in
                        NavigationLink(destination: PriceBookCategoryScreen(category: sub)) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(sub.name)
                                    .font(.callout.weight(.semibold))
                                    .foregroundColor(.primary)
                                Text("\(sub.totalItemCount) items")
                                    .font(.caption.weight(.medium))
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            
            if !category.items.isEmpty {
                Section(header: Text("Items (\(category.items.count))")) {
                    ForEach(category.items) { item in
                        NavigationLink(destination: PriceBookItemDetailScreen(item: item)) {
                            PriceBookItemRow(item: item)
                        }
                    }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle(category.name)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

// MARK: - QuickBooks Account Items Screen
struct QuickBooksAccountItemsScreen: View {
    let accountName: String
    let items: [PriceBookItem]
    
    var body: some View {
        List {
            Section(header: Text("Mapped Products (\(items.count))")) {
                ForEach(items) { item in
                    NavigationLink(destination: PriceBookItemDetailScreen(item: item)) {
                        PriceBookItemRow(item: item)
                    }
                }
            }
        }
        .listStyle(.plain)
        .navigationTitle(accountName)
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

// MARK: - Price Book Item Row
struct PriceBookItemRow: View {
    let item: PriceBookItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(item.name)
                .font(.callout.weight(.semibold))
                .foregroundColor(.primary)
                .lineLimit(2)
            
            Text(item.formattedDualPrice)
                .font(.caption.weight(.medium))
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 2.5)
    }
}

// MARK: - Price Book Item Detail Screen
struct PriceBookItemDetailScreen: View {
    let item: PriceBookItem
    
    var body: some View {
        List {
            Section {
                HStack {
                    Text("Item Name")
                        .font(.callout)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(item.name)
                        .font(.callout)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.trailing)
                }
                
                HStack {
                    Text("Price")
                        .font(.callout)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(item.formattedDualPrice)
                        .font(.callout)
                        .foregroundColor(.primary)
                }
                
                HStack(alignment: .top) {
                    Text("Description")
                        .font(.callout)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(item.description?.isEmpty == false ? item.description! : "")
                        .font(.callout)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.trailing)
                }
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        #else
        .listStyle(.plain)
        #endif
        .navigationTitle("Item Details")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}
