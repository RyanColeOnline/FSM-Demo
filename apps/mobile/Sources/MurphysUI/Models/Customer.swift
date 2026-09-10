import Foundation
import Observation
public enum AddressType: String, Codable, Sendable, CaseIterable {
    case residential
    case commercial
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = (try? container.decode(String.self).lowercased()) ?? "residential"
        if raw.contains("comm") {
            self = .commercial
        } else {
            self = .residential
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

public struct Address: Codable, Equatable, Hashable, Sendable {
    public var street: String
    public var city: String
    public var state: String
    public var zipCode: String
    public var type: AddressType
    
    public var formattedAddress: String {
        "\(street), \(city), \(state) \(zipCode)"
    }
    
    public var fullString: String {
        formattedAddress
    }
    
    public init(street: String, city: String, state: String, zipCode: String, type: AddressType = .residential) {
        self.street = street
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.type = type
    }
    
    enum CodingKeys: String, CodingKey {
        case street, city, state, zipCode, type
        case addr1, zip
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.street = (try? container.decode(String.self, forKey: .street)) ?? (try? container.decode(String.self, forKey: .addr1)) ?? ""
        self.city = (try? container.decode(String.self, forKey: .city)) ?? ""
        self.state = (try? container.decode(String.self, forKey: .state)) ?? ""
        self.zipCode = (try? container.decode(String.self, forKey: .zipCode)) ?? (try? container.decode(String.self, forKey: .zip)) ?? ""
        self.type = (try? container.decode(AddressType.self, forKey: .type)) ?? .residential
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(street, forKey: .street)
        try container.encode(city, forKey: .city)
        try container.encode(state, forKey: .state)
        try container.encode(zipCode, forKey: .zipCode)
        try container.encode(type, forKey: .type)
    }
}

public struct AuthorizedPerson: Codable, Equatable, Hashable, Identifiable, Sendable {
    public var id: UUID
    public var positionLabel: String
    public var firstName: String
    public var lastName: String
    public var phone: String
    public var email: String?
    public var assignedLocation: String?
    public var isPrimary: Bool

    public var fullName: String {
        let name = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? "Authorized Person" : name
    }

    public init(
        id: UUID = UUID(),
        positionLabel: String = "Owner",
        firstName: String = "",
        lastName: String = "",
        phone: String = "",
        email: String? = nil,
        assignedLocation: String? = nil,
        isPrimary: Bool = false
    ) {
        self.id = id
        self.positionLabel = positionLabel
        self.firstName = firstName
        self.lastName = lastName
        self.phone = phone
        self.email = email
        self.assignedLocation = assignedLocation
        self.isPrimary = isPrimary
    }

    enum CodingKeys: String, CodingKey {
        case id, positionLabel, firstName, lastName, phone, email, assignedLocation, isPrimary
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = (try? container.decode(UUID.self, forKey: .id)) ?? UUID()
        self.positionLabel = (try? container.decode(String.self, forKey: .positionLabel)) ?? "Authorized Person"
        self.firstName = (try? container.decode(String.self, forKey: .firstName)) ?? ""
        self.lastName = (try? container.decode(String.self, forKey: .lastName)) ?? ""
        self.phone = (try? container.decode(String.self, forKey: .phone)) ?? ""
        self.email = try? container.decodeIfPresent(String.self, forKey: .email)
        self.assignedLocation = try? container.decodeIfPresent(String.self, forKey: .assignedLocation)
        self.isPrimary = (try? container.decodeIfPresent(Bool.self, forKey: .isPrimary)) ?? false
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(positionLabel, forKey: .positionLabel)
        try container.encode(firstName, forKey: .firstName)
        try container.encode(lastName, forKey: .lastName)
        try container.encode(phone, forKey: .phone)
        try container.encodeIfPresent(email, forKey: .email)
        try container.encodeIfPresent(assignedLocation, forKey: .assignedLocation)
        try container.encode(isPrimary, forKey: .isPrimary)
    }
}

@Observable
public final class Customer: Identifiable, Codable, @unchecked Sendable {
    public let id: UUID
    public var name: String
    public var businessName: String?
    public var customerNumber: String?
    public var phone: String
    public var email: String
    public var address: Address
    public var customerType: AddressType
    public var createdAt: Date
    public var locations: [Address]
    public var contacts: [String]
    public var billingAddress: Address?
    public var paymentTerms: String?
    public var authorizedPersons: [AuthorizedPerson]
    
    public var effectiveBillingAddress: Address {
        get { billingAddress ?? (locations.first ?? address) }
        set { billingAddress = newValue }
    }
    
    public static func isBusinessName(_ str: String) -> Bool {
        let lower = str.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let businessIndicators = [
            "llc", "l.l.c.", "inc", "inc.", "corp", "corp.", "co.", "company",
            "ltd", "ltd.", "hoa", "h.o.a.", "condo", "condominium", "association",
            "properties", "property", "prop/", "prop ", "rentals", "rental",
            "management", "mgmt", "services", "enterprises", "holdings", "group",
            "ventures", "club", "resort", "inn", "suites", "hotel", "realty",
            "church", "school", "academy", "partners", "pllc", "llp"
        ]
        for ind in businessIndicators {
            if lower.contains(ind) { return true }
        }
        return false
    }
    
    public static func formatDisplayName(name: String, businessName: String? = nil, customerType: AddressType = .residential) -> String {
        if let bName = businessName?.trimmingCharacters(in: .whitespacesAndNewlines), !bName.isEmpty {
            return bName
        }
        
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if customerType == .commercial || isBusinessName(trimmed) {
            return trimmed
        }
        
        let parts = trimmed.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        if parts.count == 2 {
            let part1 = parts[0]
            let part2 = parts[1]
            let part2Lower = part2.lowercased()
            // If the second part is a business identifier or title, keep original
            if part2Lower == "llc" || part2Lower == "inc" || part2Lower == "corp" || part2Lower == "ltd" || part2Lower == "co" || isBusinessName(part2) {
                return trimmed
            }
            return "\(part2) \(part1)"
        }
        return trimmed
    }
    
    public var displayName: String {
        Customer.formatDisplayName(name: name, businessName: businessName, customerType: customerType)
    }

    public var firstLetterGroup: String {
        let trimmed = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let firstChar = trimmed.first?.uppercased() else { return "#" }
        if firstChar.rangeOfCharacter(from: .letters) != nil {
            return firstChar
        }
        return "#"
    }

    public var primaryAuthorizedPerson: AuthorizedPerson? {
        if let primary = authorizedPersons.first(where: { $0.isPrimary || $0.positionLabel.lowercased().contains("primary") }) {
            return primary
        }
        if let anyPerson = authorizedPersons.first {
            return anyPerson
        }
        // Fallback for sample demo customers if cached state in UserDefaults didn't persist authorizedPersons array:
        if name == "Fiona Gallagher" {
            return AuthorizedPerson(positionLabel: "Primary Contact", firstName: "Lip", lastName: "Gallagher", phone: "(555) 345-6789", isPrimary: true)
        } else if name == "Evan Williams" {
            return AuthorizedPerson(positionLabel: "Primary Contact", firstName: "Sarah", lastName: "Williams", phone: "(555) 123-9999", isPrimary: true)
        }
        return nil
    }
    
    public init(
        id: UUID = UUID(),
        name: String,
        businessName: String? = nil,
        customerNumber: String? = nil,
        email: String,
        phone: String,
        address: Address,
        customerType: AddressType = .residential,
        createdAt: Date = Date(),
        locations: [Address] = [],
        contacts: [String] = [],
        billingAddress: Address? = nil,
        paymentTerms: String? = "Due upon Receipt",
        authorizedPersons: [AuthorizedPerson] = []
    ) {
        self.id = id
        self.name = name
        self.businessName = businessName
        self.customerNumber = customerNumber
        self.email = email
        self.phone = phone
        self.address = address
        self.customerType = customerType
        self.createdAt = createdAt
        if !locations.isEmpty {
            self.locations = locations
        } else if !address.street.isEmpty {
            self.locations = [address]
        } else {
            self.locations = []
        }
        self.contacts = contacts.isEmpty ? [name] : contacts
        self.billingAddress = billingAddress
        self.paymentTerms = paymentTerms ?? "Due upon Receipt"
        self.authorizedPersons = authorizedPersons
    }
    
    enum CodingKeys: CodingKey {
        case id, name, businessName, customerNumber, phone, email, address, customerType, createdAt, locations, contacts, billingAddress, paymentTerms, authorizedPersons
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id: UUID
        if let uuid = try? container.decode(UUID.self, forKey: .id) {
            id = uuid
        } else if let idStr = try? container.decode(String.self, forKey: .id), let uuid = UUID(uuidString: idStr) {
            id = uuid
        } else {
            id = UUID()
        }
        
        let name = (try? container.decode(String.self, forKey: .name)) ?? "Customer"
        let businessName = try? container.decodeIfPresent(String.self, forKey: .businessName)
        let customerNumber = try? container.decodeIfPresent(String.self, forKey: .customerNumber)
        let phone = (try? container.decode(String.self, forKey: .phone)) ?? ""
        let email = (try? container.decode(String.self, forKey: .email)) ?? ""
        let address = (try? container.decode(Address.self, forKey: .address)) ?? Address(street: "", city: "", state: "", zipCode: "")
        let customerType = (try? container.decode(AddressType.self, forKey: .customerType)) ?? .residential
        
        let createdAt: Date
        if let date = try? container.decode(Date.self, forKey: .createdAt) {
            createdAt = date
        } else if let dateStr = try? container.decode(String.self, forKey: .createdAt) {
            let formatter = ISO8601DateFormatter()
            createdAt = formatter.date(from: dateStr) ?? Date()
        } else {
            createdAt = Date()
        }
        
        self.id = id
        self.name = name
        self.businessName = businessName
        self.customerNumber = customerNumber
        self.phone = phone
        self.email = email
        self.address = address
        self.customerType = customerType
        self.createdAt = createdAt
        
        let loadedLocs = (try? container.decode([Address].self, forKey: .locations)) ?? []
        if !loadedLocs.isEmpty {
            self.locations = loadedLocs
        } else if !address.street.isEmpty {
            self.locations = [address]
        } else {
            self.locations = []
        }
        self.contacts = (try? container.decode([String].self, forKey: .contacts)) ?? [name]
        self.billingAddress = try? container.decodeIfPresent(Address.self, forKey: .billingAddress)
        self.paymentTerms = (try? container.decodeIfPresent(String.self, forKey: .paymentTerms)) ?? "Due upon Receipt"
        self.authorizedPersons = (try? container.decodeIfPresent([AuthorizedPerson].self, forKey: .authorizedPersons)) ?? []
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(businessName, forKey: .businessName)
        try container.encodeIfPresent(customerNumber, forKey: .customerNumber)
        try container.encode(phone, forKey: .phone)
        try container.encode(email, forKey: .email)
        try container.encode(address, forKey: .address)
        try container.encode(customerType, forKey: .customerType)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(locations, forKey: .locations)
        try container.encode(contacts, forKey: .contacts)
        try container.encodeIfPresent(billingAddress, forKey: .billingAddress)
        try container.encodeIfPresent(paymentTerms, forKey: .paymentTerms)
        try container.encode(authorizedPersons, forKey: .authorizedPersons)
    }
}

extension Customer {
    public static func == (lhs: Customer, rhs: Customer) -> Bool {
        lhs.id == rhs.id
    }
}

extension Customer {
    public static let sampleList: [Customer] = [
        // A
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!,
            name: "Ashley Lewis",
            email: "ashley.l@example.com",
            phone: "(555) 678-5432",
            address: Address(street: "444 Hackberry Dr", city: "Boston", state: "MA", zipCode: "02127", type: .residential),
            customerType: .residential
        ),
        // B
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000002")!,
            name: "Betty White",
            email: "betty.w@example.com",
            phone: "(555) 345-8765",
            address: Address(street: "111 Sycamore Ln", city: "Boston", state: "MA", zipCode: "02110", type: .residential),
            customerType: .residential
        ),
        // C
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000003")!,
            name: "Charles Davis",
            email: "charles.d@example.com",
            phone: "(555) 890-1234",
            address: Address(street: "505 Walnut Ct", city: "Boston", state: "MA", zipCode: "02122", type: .residential),
            customerType: .residential
        ),
        // D
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000004")!,
            name: "David Jones",
            email: "david.j@example.com",
            phone: "(555) 678-9012",
            address: Address(street: "303 Cedar Dr", city: "Boston", state: "MA", zipCode: "02120", type: .residential),
            customerType: .residential
        ),
        // E
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000005")!,
            name: "Evan Williams",
            email: "evan.w@example.com",
            phone: "(555) 123-4567",
            address: Address(street: "654 Birch Road", city: "Boston", state: "MA", zipCode: "02108", type: .commercial),
            customerType: .commercial,
            authorizedPersons: [
                AuthorizedPerson(positionLabel: "Primary Contact", firstName: "Sarah", lastName: "Williams", phone: "(555) 123-9999", isPrimary: true)
            ]
        ),
        // F
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000006")!,
            name: "Fiona Gallagher",
            email: "fiona.g@example.com",
            phone: "(555) 234-5678",
            address: Address(street: "987 Elm Street", city: "Boston", state: "MA", zipCode: "02111", type: .residential),
            customerType: .residential,
            authorizedPersons: [
                AuthorizedPerson(positionLabel: "Primary Contact", firstName: "Lip", lastName: "Gallagher", phone: "(555) 345-6789", isPrimary: true)
            ]
        ),
        // G (Commercial Company)
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000007")!,
            name: "G&H Appliance Co.",
            email: "service@ghappliance.com",
            phone: "(555) 987-6543",
            address: Address(street: "321 Commercial St", city: "Boston", state: "MA", zipCode: "02109", type: .commercial),
            customerType: .commercial
        ),
        // H
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000008")!,
            name: "Henry Miller",
            email: "henry.m@example.com",
            phone: "(555) 876-5432",
            address: Address(street: "123 Hanover St", city: "Boston", state: "MA", zipCode: "02113", type: .residential),
            customerType: .residential
        ),
        // I
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000009")!,
            name: "Irene Adler",
            email: "irene.a@example.com",
            phone: "(555) 765-4321",
            address: Address(street: "456 Beacon St", city: "Boston", state: "MA", zipCode: "02116", type: .residential),
            customerType: .residential
        ),
        // J
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000010")!,
            name: "Joseph Rodriguez",
            email: "joseph.r@example.com",
            phone: "(555) 901-2345",
            address: Address(street: "606 Ash Dr", city: "Boston", state: "MA", zipCode: "02124", type: .residential),
            customerType: .residential
        ),
        // K
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000011")!,
            name: "Karen Lee",
            email: "karen.l@example.com",
            phone: "(555) 999-0000",
            address: Address(street: "770 Alder Pl", city: "Boston", state: "MA", zipCode: "02136", type: .residential),
            customerType: .residential
        ),
        // L
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000012")!,
            name: "Linda Taylor",
            email: "linda.t@example.com",
            phone: "(555) 444-5555",
            address: Address(street: "220 Cypress Ln", city: "Boston", state: "MA", zipCode: "02130", type: .residential),
            customerType: .residential
        ),
        // M
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000013")!,
            name: "Michael Williams",
            email: "michael.w@example.com",
            phone: "(555) 456-7890",
            address: Address(street: "101 Simple Way", city: "Boston", state: "MA", zipCode: "02116", type: .residential),
            customerType: .residential
        ),
        // N
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000014")!,
            name: "Nancy Perez",
            email: "nancy.p@example.com",
            phone: "(555) 123-0987",
            address: Address(street: "880 Beech St", city: "Boston", state: "MA", zipCode: "02215", type: .residential),
            customerType: .residential
        ),
        // O
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000015")!,
            name: "Oscar Wilde",
            email: "oscar.w@example.com",
            phone: "(555) 232-1111",
            address: Address(street: "15 Tremont St", city: "Boston", state: "MA", zipCode: "02108", type: .residential),
            customerType: .residential
        ),
        // P
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000016")!,
            name: "Patricia Garcia",
            email: "patricia.g@example.com",
            phone: "(555) 111-2222",
            address: Address(street: "808 Poplar Ave", city: "Boston", state: "MA", zipCode: "02127", type: .residential),
            customerType: .residential
        ),
        // Q (Commercial Company)
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000017")!,
            name: "Quincy Tech Solutions",
            email: "info@quincytech.com",
            phone: "(555) 543-2109",
            address: Address(street: "100 Innovation Way", city: "Boston", state: "MA", zipCode: "02110", type: .commercial),
            customerType: .commercial
        ),
        // R
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000018")!,
            name: "Robert Johnson",
            email: "robert.j@example.com",
            phone: "(555) 345-6789",
            address: Address(street: "789 Pine Rd", city: "Boston", state: "MA", zipCode: "02115", type: .residential),
            customerType: .residential
        ),
        // S
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000019")!,
            name: "Sarah Martin",
            email: "sarah.m@example.com",
            phone: "(555) 888-9999",
            address: Address(street: "660 Willow Way", city: "Boston", state: "MA", zipCode: "02135", type: .residential),
            customerType: .residential
        ),
        // T
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000020")!,
            name: "Thomas Martinez",
            email: "thomas.m@example.com",
            phone: "(555) 012-3456",
            address: Address(street: "707 Cherry St", city: "Boston", state: "MA", zipCode: "02125", type: .residential),
            customerType: .residential
        ),
        // U (Commercial Company)
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000021")!,
            name: "Universal Services Inc.",
            email: "contact@universalus.com",
            phone: "(555) 432-1098",
            address: Address(street: "500 Enterprise Dr", city: "Boston", state: "MA", zipCode: "02118", type: .commercial),
            customerType: .commercial
        ),
        // V
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000022")!,
            name: "Victor Hugo",
            email: "victor@example.com",
            phone: "(555) 321-0987",
            address: Address(street: "88 Les Miserables Rd", city: "Boston", state: "MA", zipCode: "02115", type: .residential),
            customerType: .residential
        ),
        // W
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000023")!,
            name: "William Brown",
            email: "william.b@example.com",
            phone: "(555) 567-8901",
            address: Address(street: "202 Elm St", city: "Boston", state: "MA", zipCode: "02118", type: .residential),
            customerType: .residential
        ),
        // X (Commercial Company)
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000024")!,
            name: "Xavier & Sons HVAC",
            email: "xavier@example.com",
            phone: "(555) 210-9876",
            address: Address(street: "90 Metal Works Way", city: "Boston", state: "MA", zipCode: "02120", type: .commercial),
            customerType: .commercial
        ),
        // Y
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000025")!,
            name: "Yvonne Craig",
            email: "yvonne@example.com",
            phone: "(555) 109-8765",
            address: Address(street: "12 Yellowbrick Rd", city: "Boston", state: "MA", zipCode: "02130", type: .residential),
            customerType: .residential
        ),
        // Z
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000026")!,
            name: "Zachary Taylor",
            email: "zachary.t@example.com",
            phone: "(555) 098-7654",
            address: Address(street: "45 Old Colony Rd", city: "Boston", state: "MA", zipCode: "02127", type: .residential),
            customerType: .residential
        ),
        
        // --- 24 more customers to make exactly 50 total ---
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000027")!,
            name: "Alice Adams",
            email: "alice@example.com",
            phone: "(555) 001-0001",
            address: Address(street: "10 A St", city: "Boston", state: "MA", zipCode: "02108"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000028")!,
            name: "Benjamin Baker",
            email: "ben@example.com",
            phone: "(555) 002-0002",
            address: Address(street: "20 B St", city: "Boston", state: "MA", zipCode: "02109"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000029")!,
            name: "Catherine Carter",
            email: "cat@example.com",
            phone: "(555) 003-0003",
            address: Address(street: "30 C St", city: "Boston", state: "MA", zipCode: "02110"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000030")!,
            name: "Daniel Dyer",
            email: "dan@example.com",
            phone: "(555) 004-0004",
            address: Address(street: "40 D St", city: "Boston", state: "MA", zipCode: "02111"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000031")!,
            name: "Edward Evans",
            email: "ed@example.com",
            phone: "(555) 005-0005",
            address: Address(street: "50 E St", city: "Boston", state: "MA", zipCode: "02113"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000032")!,
            name: "Franklin Foster",
            email: "frank@example.com",
            phone: "(555) 006-0006",
            address: Address(street: "60 F St", city: "Boston", state: "MA", zipCode: "02114"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000033")!,
            name: "George Green",
            email: "george@example.com",
            phone: "(555) 007-0007",
            address: Address(street: "70 G St", city: "Boston", state: "MA", zipCode: "02115"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000034")!,
            name: "Harold Hill",
            email: "harry@example.com",
            phone: "(555) 008-0008",
            address: Address(street: "80 H St", city: "Boston", state: "MA", zipCode: "02116"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000035")!,
            name: "Isabella Ingram",
            email: "bella@example.com",
            phone: "(555) 009-0009",
            address: Address(street: "90 I St", city: "Boston", state: "MA", zipCode: "02118"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000036")!,
            name: "Julia Jones",
            email: "julia@example.com",
            phone: "(555) 010-0010",
            address: Address(street: "10 J St", city: "Boston", state: "MA", zipCode: "02120"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000037")!,
            name: "Kevin King",
            email: "kevin@example.com",
            phone: "(555) 011-0011",
            address: Address(street: "11 K St", city: "Boston", state: "MA", zipCode: "02121"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000038")!,
            name: "Laura Lane",
            email: "laura@example.com",
            phone: "(555) 012-0012",
            address: Address(street: "12 L St", city: "Boston", state: "MA", zipCode: "02122"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000039")!,
            name: "Mason Morris",
            email: "mason@example.com",
            phone: "(555) 013-0013",
            address: Address(street: "13 M St", city: "Boston", state: "MA", zipCode: "02124"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000040")!,
            name: "Nathan Neal",
            email: "nathan@example.com",
            phone: "(555) 014-0014",
            address: Address(street: "14 N St", city: "Boston", state: "MA", zipCode: "02125"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000041")!,
            name: "Olivia Owens",
            email: "olivia@example.com",
            phone: "(555) 015-0015",
            address: Address(street: "15 O St", city: "Boston", state: "MA", zipCode: "02127"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000042")!,
            name: "Peter Parker",
            email: "peter@example.com",
            phone: "(555) 016-0016",
            address: Address(street: "16 P St", city: "Boston", state: "MA", zipCode: "02128"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000043")!,
            name: "Quentin Quick",
            email: "quentin@example.com",
            phone: "(555) 017-0017",
            address: Address(street: "17 Q St", city: "Boston", state: "MA", zipCode: "02129"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000044")!,
            name: "Rebecca Ross",
            email: "rebecca@example.com",
            phone: "(555) 018-0018",
            address: Address(street: "18 R St", city: "Boston", state: "MA", zipCode: "02130"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000045")!,
            name: "Samuel Smith",
            email: "samuel@example.com",
            phone: "(555) 019-0019",
            address: Address(street: "19 S St", city: "Boston", state: "MA", zipCode: "02131"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000046")!,
            name: "Timothy Turner",
            email: "tim@example.com",
            phone: "(555) 020-0020",
            address: Address(street: "20 T St", city: "Boston", state: "MA", zipCode: "02132"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000047")!,
            name: "Ursula Underwood",
            email: "ursula@example.com",
            phone: "(555) 021-0021",
            address: Address(street: "21 U St", city: "Boston", state: "MA", zipCode: "02134"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000048")!,
            name: "Valerie Vance",
            email: "val@example.com",
            phone: "(555) 022-0022",
            address: Address(street: "22 V St", city: "Boston", state: "MA", zipCode: "02135"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000049")!,
            name: "Wendy West",
            email: "wendy@example.com",
            phone: "(555) 023-0023",
            address: Address(street: "23 W St", city: "Boston", state: "MA", zipCode: "02136"),
            customerType: .residential
        ),
        Customer(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000000050")!,
            name: "Zoe Zimmerman",
            email: "zoe@example.com",
            phone: "(555) 024-0024",
            address: Address(street: "24 Z St", city: "Boston", state: "MA", zipCode: "02215"),
            customerType: .residential
        )
    ]
}

