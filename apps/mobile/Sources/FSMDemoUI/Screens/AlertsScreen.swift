import SwiftUI

public struct AlertsScreen: View {
    @State var alerts = [
        AlertItem(id: 1, title: "New Job Assigned", message: "Job #4930 at Magnolia Bay Bistro has been assigned to you.", time: "10m ago", category: .schedule, isUnread: true),
        AlertItem(id: 2, title: "Customer Update", message: "Aaron Knight updated their phone number to 555-0192.", time: "1h ago", category: .customer, isUnread: true),
        AlertItem(id: 3, title: "Invoice Paid", message: "Invoice #1029 for $350.00 was paid successfully.", time: "3h ago", category: .billing, isUnread: false),
        AlertItem(id: 4, title: "Time Card Warning", message: "Please check your clocked-in hours for Monday, July 13.", time: "1d ago", category: .system, isUnread: false)
    ]
    
    public init() {}
    
    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header Title
                Text("Alerts")
                    .font(.largeTitle.weight(.bold))
                    .foregroundColor(.primary)
                    .padding(.horizontal)
                
                // Alerts list
                LazyVStack(spacing: 12) {
                    ForEach(alerts) { alert in
                        HStack(spacing: 16) {
                            // Icon Container
                            Image(systemName: alert.category.systemImage)
                                .font(.title3)
                                .foregroundColor(alert.category.color)
                                .padding(12)
                                .background(alert.category.color.opacity(0.1))
                                .cornerRadius(12)
                            
                            // Text
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(alert.title)
                                        .font(.callout.weight(.semibold))
                                        .foregroundColor(.primary)
                                    Spacer()
                                    Text(alert.time)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                
                                Text(alert.message)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .lineLimit(2)
                            }
                            
                            // Unread indicator dot
                            if alert.isUnread {
                                Circle()
                                    .fill(Color.blue)
                                    .frame(width: 8, height: 8)
                                    .padding(.leading, 4)
                            }
                        }
                        .padding()
                        .background(Color.murphysCardBackground)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.02), radius: 6, x: 0, y: 3)
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .background(Color.murphysGroupedBackground)
    }
}

// Helper models for Alerts
struct AlertItem: Identifiable {
    let id: Int
    let title: String
    let message: String
    let time: String
    let category: AlertCategory
    let isUnread: Bool
}

enum AlertCategory {
    case schedule
    case customer
    case billing
    case system
    
    var systemImage: String {
        switch self {
        case .schedule: return "calendar"
        case .customer: return "person.text.rectangle"
        case .billing: return "creditcard"
        case .system: return "exclamationmark.triangle"
        }
    }
    
    var color: Color {
        switch self {
        case .schedule: return .blue
        case .customer: return .purple
        case .billing: return .green
        case .system: return .red
        }
    }
}
