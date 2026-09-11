import SwiftUI
import Foundation

#if canImport(MapKit)
import MapKit

public struct TechnicianRouteView: View {
    public let appointments: [Appointment]
    @Environment(CustomerStore.self) var customerStore
    @Environment(\.openURL) var openURL
    
    @State private var routes: [MKRoute] = []
    @State private var stopCoordinates: [CLLocationCoordinate2D] = []
    @State private var selectedMapStopIndex: Int? = nil
    @State private var mapCameraPosition: MapCameraPosition = .automatic
    @State private var showMessageSheet: Bool = false
    
    // Default starting point: Murphy's Home Services Office (Destin, FL)
    let startingLocation = CLLocationCoordinate2D(latitude: 30.3872, longitude: -86.4428)
    
    public init(appointments: [Appointment]) {
        self.appointments = appointments
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Native Map View with Map Marker Popover Callout
            ZStack(alignment: .bottom) {
                Map(position: $mapCameraPosition) {
                    Marker("Office", systemImage: "briefcase.fill", coordinate: startingLocation)
                        .tint(.blue)
                    
                    ForEach(Array(stopCoordinates.enumerated()), id: \.offset) { index, coordinate in
                        Annotation(
                            "Stop",
                            coordinate: coordinate,
                            anchor: .center
                        ) {
                            let appt = appointments[index]
                            let colors = getCircleColors(for: appt)
                            
                            Button(action: {
                                let allLats = stopCoordinates.map { $0.latitude }
                                let minLat = allLats.min() ?? coordinate.latitude
                                let maxLat = allLats.max() ?? coordinate.latitude
                                let midLat = (minLat + maxLat) / 2.0
                                
                                // Only pan if the marker is in the lower region where bottom banner would cover it
                                let targetCenter: CLLocationCoordinate2D
                                if coordinate.latitude <= midLat {
                                    targetCenter = CLLocationCoordinate2D(latitude: coordinate.latitude - 0.004, longitude: coordinate.longitude)
                                } else {
                                    targetCenter = coordinate
                                }
                                
                                withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                    selectedMapStopIndex = index
                                    mapCameraPosition = .camera(MapCamera(centerCoordinate: targetCenter, distance: 12000))
                                }
                            }) {
                                RouteStopNumberBadge(number: index + 1, colors: colors)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    
                    ForEach(routes, id: \.self) { route in
                        MapPolyline(route.polyline)
                            .stroke(Color.blue, lineWidth: 4)
                    }
                }
                .frame(height: 300)
                
                // Map Stop Popover Callout
                if let idx = selectedMapStopIndex, idx < appointments.count {
                    let appt = appointments[idx]
                    let customer = customerStore.customers.first(where: { $0.id == appt.customerId })
                    let designation = appt.jobTypeBadge
                    let colors = getCircleColors(for: appt)
                    let displayName = customer?.displayName ?? appt.displayCustomerName
                    let contact = appt.resolveAuthorizedContact(customer: customer)
                    let phoneToUse = customer?.phone ?? appt.customerPhone ?? ""
                    let addressToUse = (appt.locationAddress?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) ? appt.locationAddress! : (customer?.address.formattedAddress ?? "")
                    
                    ZStack(alignment: .topTrailing) {
                        HStack(alignment: .center, spacing: 0) {
                            // 1. Circle Number Badge (Matching list below) & Customer Info (Left)
                            NavigationLink(destination: AppointmentDetailScreen(appointment: appt)) {
                                HStack(alignment: .center, spacing: 16) {
                                    RouteStopNumberBadge(number: idx + 1, colors: colors)
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        HStack(spacing: 6) {
                                            Text(displayName)
                                                .font(.subheadline.weight(.bold))
                                                .foregroundColor(.primary)
                                                .lineLimit(nil)
                                                .fixedSize(horizontal: false, vertical: true)
                                            
                                            Text(designation)
                                                .font(.caption2.weight(.bold))
                                                .foregroundStyle(.secondary)
                                                .padding(.horizontal, 5)
                                                .padding(.vertical, 1.5)
                                                .background(Color.primary.opacity(0.06))
                                                .cornerRadius(4)
                                        }
                                        
                                        if let contact = contact {
                                            HStack(spacing: 3) {
                                                Image(systemName: "person.badge.shield.checkmark.fill")
                                                    .font(.caption2)
                                                    .foregroundColor(.secondary)
                                                Text(contact)
                                                    .font(.caption2)
                                                    .foregroundColor(.secondary)
                                                    .lineLimit(1)
                                            }
                                        }
                                        
                                        Text(formatTimeRange(start: appt.startDate, end: appt.endDate))
                                            .font(.caption.weight(.medium))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            // Left Spacer to push icons into center of middle gap
                            Spacer(minLength: 8)
                            
                            // 2. Action Buttons perfectly centered between customer info and X button
                            HStack(spacing: 6) {
                                Button(action: {
                                    if !phoneToUse.isEmpty {
                                        let sanitized = phoneToUse.filter { "+0123456789".contains($0) }
                                        #if os(iOS) && canImport(MessageUI)
                                        if MessageComposeView.canSendText() {
                                            showMessageSheet = true
                                        } else if let url = URL(string: "sms:\(sanitized)") {
                                            openURL(url)
                                        }
                                        #else
                                        if let url = URL(string: "sms:\(sanitized)") {
                                            openURL(url)
                                        }
                                        #endif
                                    }
                                }) {
                                    Image(systemName: "message.fill")
                                        .font(.title2)
                                        .foregroundColor(.blue)
                                        .frame(width: 39, height: 39)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(PlainButtonStyle())
                                .sheet(isPresented: $showMessageSheet) {
                                    if !phoneToUse.isEmpty {
                                        MessageComposeView(recipient: phoneToUse)
                                            .ignoresSafeArea()
                                    }
                                }
                                
                                Button(action: {
                                    if !phoneToUse.isEmpty, let url = URL(string: "tel:\(phoneToUse)") {
                                        openURL(url)
                                    }
                                }) {
                                    Image(systemName: "phone.fill")
                                        .font(.title2)
                                        .foregroundColor(.green)
                                        .frame(width: 39, height: 39)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(PlainButtonStyle())
                                
                                Button(action: {
                                    if !addressToUse.isEmpty {
                                        let encoded = addressToUse.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
                                        if let url = URL(string: "https://maps.apple.com/?daddr=\(encoded)") {
                                            openURL(url)
                                        }
                                    }
                                }) {
                                    Image(systemName: "arrow.triangle.turn.up.right.diamond.fill")
                                        .font(.title2)
                                        .foregroundColor(.purple)
                                        .frame(width: 39, height: 39)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                            
                            // Right Spacer to keep icons centered relative to the top-right X button
                            Spacer(minLength: 8)
                            
                            // Reserved space matching X button offset for exact symmetry
                            Color.clear.frame(width: 16, height: 28)
                        }
                        .padding(.vertical, 12)
                        .padding(.leading, 14)
                        .padding(.trailing, 10)
                        .background(Color.murphysCardBackground)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.12), radius: 10, x: 0, y: 4)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 12)
                        
                        // Top Right X Close Button
                        Button(action: {
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                selectedMapStopIndex = nil
                                mapCameraPosition = .automatic
                            }
                        }) {
                            Image(systemName: "xmark")
                                .font(.footnote.weight(.bold))
                                .foregroundColor(.secondary)
                                .padding(8)
                        }
                        .buttonStyle(PlainButtonStyle())
                        .padding(.trailing, 18)
                        .padding(.top, 4)
                    }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            
            // Scrollable list showing stops as card tiles with connected numbered circles
            ScrollView {
                VStack(spacing: 12) {
                    if appointments.isEmpty {
                        Text("No appointments scheduled for this date.")
                            .foregroundColor(.secondary)
                            .padding(.vertical, 32)
                    } else {
                        ForEach(Array(appointments.enumerated()), id: \.element.id) { index, appt in
                            let customer = customerStore.customers.first(where: { $0.id == appt.customerId || ($0.name == appt.customerName && appt.customerName != nil) })
                            let designation = appt.jobTypeBadge
                            let colors = getCircleColors(for: appt)
                            let displayName = customer?.displayName ?? appt.displayCustomerName
                            let contact = appt.resolveAuthorizedContact(customer: customer)
                            let displayAddress = (appt.locationAddress?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) ? appt.locationAddress! : (customer?.address.fullString ?? "No Address")
                            
                            HStack(alignment: .center, spacing: 14) {
                                // Left column with vertically-centered circle & seamless vertical connector lines
                                ZStack(alignment: .center) {
                                    VStack(spacing: 0) {
                                        Rectangle()
                                            .fill(index == 0 ? Color.clear : Color.secondary.opacity(0.55))
                                            .frame(width: 2)
                                            .frame(maxHeight: .infinity)
                                            .padding(.top, index == 0 ? 0 : -6)
                                        
                                        Rectangle()
                                            .fill(index == appointments.count - 1 ? Color.clear : Color.secondary.opacity(0.55))
                                            .frame(width: 2)
                                            .frame(maxHeight: .infinity)
                                            .padding(.bottom, index == appointments.count - 1 ? 0 : -6)
                                    }
                                    
                                    RouteStopNumberBadge(number: index + 1, colors: colors)
                                }
                                .frame(width: 28)
                                
                                // Stop Tile Card navigating to AppointmentDetailScreen
                                NavigationLink(destination: AppointmentDetailScreen(appointment: appt)) {
                                    VStack(alignment: .leading, spacing: 8) {
                                        HStack(alignment: .top) {
                                            HStack(spacing: 6) {
                                                Text(displayName)
                                                    .font(.subheadline.weight(.bold))
                                                    .foregroundColor(.primary)
                                                    .lineLimit(nil)
                                                    .fixedSize(horizontal: false, vertical: true)
                                                
                                                Text(designation)
                                                    .font(.caption2.weight(.bold))
                                                    .foregroundStyle(.secondary)
                                                    .padding(.horizontal, 5)
                                                    .padding(.vertical, 1.5)
                                                    .background(Color.primary.opacity(0.06))
                                                    .cornerRadius(4)
                                            }
                                            
                                            Spacer()
                                            
                                            Text(appt.timeRangeFormatted)
                                                .font(.caption.weight(.semibold))
                                                .foregroundColor(.secondary)
                                        }
                                        
                                        if let contact = contact {
                                            HStack(spacing: 4) {
                                                Image(systemName: "person.badge.shield.checkmark.fill")
                                                    .font(.caption)
                                                    .foregroundColor(.secondary)
                                                Text(contact)
                                                    .font(.caption)
                                                    .foregroundColor(.secondary)
                                                    .lineLimit(1)
                                            }
                                        }
                                        
                                        Text(displayAddress)
                                            .font(.footnote.weight(.medium))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                    }
                                    .padding(.horizontal, 14)
                                    .padding(.top, 12)
                                    .padding(.bottom, 10)
                                    .background(Color.murphysCardBackground)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.black.opacity(0.06), lineWidth: 1)
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                }
                .padding(.vertical, 14)
            }
            .background(Color.murphysGroupedBackground)
        }
        .onAppear {
            calculateRoutes()
        }
    }
    
    private func getCircleColors(for appt: Appointment) -> (bg: Color, stroke: Color) {
        let baseColor = appt.tripSemanticColor
        return (baseColor.opacity(0.85), baseColor)
    }
    
    private func calculateRoutes() {
        Task {
            var coords: [CLLocationCoordinate2D] = []
            let geocoder = CLGeocoder()
            for appt in appointments {
                let customer = customerStore.customers.first(where: { $0.id == appt.customerId || ($0.name == appt.customerName && appt.customerName != nil) })
                let addrStr = (appt.locationAddress?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) ? appt.locationAddress! : (customer?.address.formattedAddress ?? "")
                
                var foundCoord: CLLocationCoordinate2D? = nil
                if !addrStr.isEmpty {
                    do {
                        let placemarks = try await geocoder.geocodeAddressString(addrStr)
                        if let loc = placemarks.first?.location {
                            foundCoord = loc.coordinate
                        }
                    } catch {
                        // Fallback
                    }
                }
                
                if let coord = foundCoord {
                    coords.append(coord)
                } else {
                    coords.append(getFallbackCoordinate(for: addrStr.isEmpty ? appt.id.uuidString : addrStr))
                }
            }
            
            self.stopCoordinates = coords
            
            guard !coords.isEmpty else { return }
            
            let allPoints = [startingLocation] + coords
            var calculatedRoutes: [MKRoute] = []
            for i in 0..<(allPoints.count - 1) {
                if let route = await getRoute(from: allPoints[i], to: allPoints[i+1]) {
                    calculatedRoutes.append(route)
                }
            }
            self.routes = calculatedRoutes
            
            // Adjust camera to fit all points
            let allLats = allPoints.map { $0.latitude }
            let allLons = allPoints.map { $0.longitude }
            let minLat = allLats.min() ?? startingLocation.latitude
            let maxLat = allLats.max() ?? startingLocation.latitude
            let minLon = allLons.min() ?? startingLocation.longitude
            let maxLon = allLons.max() ?? startingLocation.longitude
            
            let center = CLLocationCoordinate2D(latitude: (minLat + maxLat) / 2.0, longitude: (minLon + maxLon) / 2.0)
            let span = MKCoordinateSpan(latitudeDelta: max(0.08, (maxLat - minLat) * 1.5), longitudeDelta: max(0.08, (maxLon - minLon) * 1.5))
            self.mapCameraPosition = .region(MKCoordinateRegion(center: center, span: span))
        }
    }
    
    private func getRoute(from source: CLLocationCoordinate2D, to destination: CLLocationCoordinate2D) async -> MKRoute? {
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: source))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: destination))
        request.transportType = .automobile
        
        let directions = MKDirections(request: request)
        do {
            let response = try await directions.calculate()
            return response.routes.first
        } catch {
            return nil
        }
    }
    
    private func getFallbackCoordinate(for key: String) -> CLLocationCoordinate2D {
        let hash = abs(key.hashValue)
        let latOffset = Double((hash % 100) - 50) * 0.0008
        let lonOffset = Double(((hash / 100) % 100) - 50) * 0.0015
        return CLLocationCoordinate2D(latitude: 30.3935 + latOffset, longitude: -86.4958 + lonOffset)
    }
    
    private func formatTimeRange(start: Date, end: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: start) + " - " + formatter.string(from: end)
    }
}

public struct RouteStopNumberBadge: View {
    public let number: Int
    public let colors: (bg: Color, stroke: Color)
    public var size: CGFloat = 28
    @Environment(\.colorScheme) var colorScheme
    
    public init(number: Int, colors: (bg: Color, stroke: Color), size: CGFloat = 28) {
        self.number = number
        self.colors = colors
        self.size = size
    }
    
    public var body: some View {
        ZStack {
            Circle()
                .fill(colors.bg)
                .frame(width: size, height: size)
            Circle()
                .stroke(colors.stroke, lineWidth: 2)
                .frame(width: size, height: size)
            Text("\(number)")
                .font(.footnote.weight(.bold))
                .foregroundColor(colorScheme == .dark ? .white : .primary)
        }
        .frame(width: size, height: size)
    }
}

struct DottedLine: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        return path
    }
}
#else
public struct TechnicianRouteView: View {
    public init(appointments: [Any]) {}
    
    public var body: some View {
        VStack {
            Text("Routes Dashboard")
                .font(.headline)
                .padding()
            Text("Native routing maps are supported on iOS target.")
                .foregroundColor(.secondary)
        }
    }
}
#endif


