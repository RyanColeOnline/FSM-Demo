import { CanonicalCustomer } from '../types/customer';

export const DEMO_CUSTOMERS: CanonicalCustomer[] = [
  {
    "id": "cust-res-01",
    "customerNumber": "C-1001",
    "accountNumber": "ACC-1001",
    "name": "Eleanor Vance",
    "firstName": "Eleanor",
    "lastName": "Vance",
    "qbName": "Vance, Eleanor",
    "phone": "(407) 555-8121",
    "mobilePhone": "(407) 555-8121",
    "email": "eleanor.vance@example.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card, ACH, Check",
    "preferredCommunicationMethod": "Text",
    "preferredTechnician": "Marcus Vance",
    "address": {
      "street": "1420 Lakeview Drive",
      "city": "Winter Park",
      "state": "FL",
      "zipCode": "32789",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-01-a",
        "street": "1420 Lakeview Drive",
        "city": "Winter Park",
        "state": "FL",
        "zipCode": "32789",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-01-a",
        "firstName": "Eleanor",
        "lastName": "Vance",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-8121",
        "email": "eleanor.vance@example.com",
        "isPrimary": true
      },
      {
        "id": "auth-01-b",
        "firstName": "James",
        "lastName": "Vance",
        "positionLabel": "Spouse",
        "phone": "(407) 555-8122",
        "email": "james.vance@example.com",
        "isPrimary": false
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Gold Care)",
    "financials": {
      "totalInvoiced": 1845,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-08-10T14:30:00.000Z"
  },
  {
    "id": "cust-res-02",
    "customerNumber": "C-1002",
    "accountNumber": "ACC-1002",
    "name": "Dr. Aris Thorne",
    "firstName": "Aris",
    "lastName": "Thorne",
    "qbName": "Thorne, Aris",
    "phone": "(407) 555-9204",
    "mobilePhone": "(407) 555-9204",
    "email": "dr.thorne@winterparkclinic.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card, ACH",
    "preferredCommunicationMethod": "Email",
    "preferredTechnician": "Alex Reynolds",
    "address": {
      "street": "884 Palmer Avenue",
      "city": "Winter Park",
      "state": "FL",
      "zipCode": "32789",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-02-a",
        "street": "884 Palmer Avenue",
        "city": "Winter Park",
        "state": "FL",
        "zipCode": "32789",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-02-a",
        "firstName": "Aris",
        "lastName": "Thorne",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-9204",
        "email": "dr.thorne@winterparkclinic.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Silver Care)",
    "financials": {
      "totalInvoiced": 450,
      "totalProposed": 12450,
      "currency": "USD"
    },
    "createdAt": "2026-02-20T09:15:00.000Z",
    "updatedAt": "2026-09-07T11:00:00.000Z"
  },
  {
    "id": "cust-res-03",
    "customerNumber": "C-1003",
    "accountNumber": "ACC-1003",
    "name": "Sophia Rodriguez",
    "firstName": "Sophia",
    "lastName": "Rodriguez",
    "qbName": "Rodriguez, Sophia",
    "phone": "(407) 555-3391",
    "mobilePhone": "(407) 555-3391",
    "email": "sophia.rodriguez@designstudio.org",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card",
    "preferredCommunicationMethod": "Text",
    "preferredTechnician": "Carlos Mendez",
    "address": {
      "street": "312 E Robinson Street",
      "city": "Orlando",
      "state": "FL",
      "zipCode": "32801",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-03-a",
        "street": "312 E Robinson Street",
        "city": "Orlando",
        "state": "FL",
        "zipCode": "32801",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-03-a",
        "firstName": "Sophia",
        "lastName": "Rodriguez",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-3391",
        "email": "sophia.rodriguez@designstudio.org",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "None",
    "financials": {
      "totalInvoiced": 385,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-03-12T14:20:00.000Z",
    "updatedAt": "2026-09-08T16:45:00.000Z"
  },
  {
    "id": "cust-res-04",
    "customerNumber": "C-1004",
    "accountNumber": "ACC-1004",
    "name": "Robert & Evelyn Chen",
    "firstName": "Robert",
    "lastName": "Chen",
    "qbName": "Chen, Robert",
    "phone": "(407) 555-7740",
    "mobilePhone": "(407) 555-7740",
    "email": "rchen@chenfamilyfl.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card, ACH",
    "preferredCommunicationMethod": "Email",
    "preferredTechnician": "Marcus Vance",
    "address": {
      "street": "6104 Isleworth Country Club Drive",
      "city": "Windermere",
      "state": "FL",
      "zipCode": "34786",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-04-a",
        "street": "6104 Isleworth Country Club Drive",
        "city": "Windermere",
        "state": "FL",
        "zipCode": "34786",
        "type": "residential",
        "isDefault": true,
        "description": "Primary Residence"
      },
      {
        "id": "loc-res-04-b",
        "street": "6108 Isleworth Country Club Drive (Guest House)",
        "city": "Windermere",
        "state": "FL",
        "zipCode": "34786",
        "type": "residential",
        "isDefault": false,
        "description": "Guest House & Pool Pavilion"
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-04-a",
        "firstName": "Robert",
        "lastName": "Chen",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-7740",
        "email": "rchen@chenfamilyfl.com",
        "isPrimary": true
      },
      {
        "id": "auth-04-b",
        "firstName": "Evelyn",
        "lastName": "Chen",
        "positionLabel": "Spouse",
        "phone": "(407) 555-7741",
        "email": "evelyn@chenfamilyfl.com",
        "isPrimary": false
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Platinum Care)",
    "financials": {
      "totalInvoiced": 4890,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-01-05T08:00:00.000Z",
    "updatedAt": "2026-08-25T10:00:00.000Z"
  },
  {
    "id": "cust-res-05",
    "customerNumber": "C-1005",
    "accountNumber": "ACC-1005",
    "name": "Bradley Jenkins",
    "firstName": "Bradley",
    "lastName": "Jenkins",
    "qbName": "Jenkins, Bradley",
    "phone": "(407) 555-2248",
    "mobilePhone": "(407) 555-2248",
    "email": "bjenkins48@cfl.rr.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card, Check",
    "preferredCommunicationMethod": "Text",
    "preferredTechnician": "Carlos Mendez",
    "address": {
      "street": "512 Packwood Avenue",
      "city": "Maitland",
      "state": "FL",
      "zipCode": "32751",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-05-a",
        "street": "512 Packwood Avenue",
        "city": "Maitland",
        "state": "FL",
        "zipCode": "32751",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-05-a",
        "firstName": "Bradley",
        "lastName": "Jenkins",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-2248",
        "email": "bjenkins48@cfl.rr.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Silver Care)",
    "financials": {
      "totalInvoiced": 720,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-04-10T11:00:00.000Z",
    "updatedAt": "2026-08-15T15:20:00.000Z"
  },
  {
    "id": "cust-res-06",
    "customerNumber": "C-1006",
    "accountNumber": "ACC-1006",
    "name": "Tyler & Chloe Brooks",
    "firstName": "Tyler",
    "lastName": "Brooks",
    "qbName": "Brooks, Tyler",
    "phone": "(321) 555-6682",
    "mobilePhone": "(321) 555-6682",
    "email": "brooksfamily@gmail.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card",
    "preferredCommunicationMethod": "Text",
    "preferredTechnician": "Tyler Reed",
    "address": {
      "street": "409 Windmill Court",
      "city": "Lake Mary",
      "state": "FL",
      "zipCode": "32746",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-06-a",
        "street": "409 Windmill Court",
        "city": "Lake Mary",
        "state": "FL",
        "zipCode": "32746",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-06-a",
        "firstName": "Tyler",
        "lastName": "Brooks",
        "positionLabel": "Homeowner",
        "phone": "(321) 555-6682",
        "email": "brooksfamily@gmail.com",
        "isPrimary": true
      },
      {
        "id": "auth-06-b",
        "firstName": "Chloe",
        "lastName": "Brooks",
        "positionLabel": "Spouse",
        "phone": "(321) 555-6683",
        "email": "chloebrooks88@gmail.com",
        "isPrimary": false
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Appliance Care)",
    "financials": {
      "totalInvoiced": 645,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-05-18T13:30:00.000Z",
    "updatedAt": "2026-09-08T11:00:00.000Z"
  },
  {
    "id": "cust-res-07",
    "customerNumber": "C-1007",
    "accountNumber": "ACC-1007",
    "name": "Sarah & Michael O'Connor",
    "firstName": "Sarah",
    "lastName": "O'Connor",
    "qbName": "O'Connor, Sarah",
    "phone": "(407) 555-4419",
    "mobilePhone": "(407) 555-4419",
    "email": "sarah.oconnor@orlandomedia.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card, ACH",
    "preferredCommunicationMethod": "Email",
    "preferredTechnician": "Marcus Vance",
    "address": {
      "street": "725 Spring Valley Road",
      "city": "Altamonte Springs",
      "state": "FL",
      "zipCode": "32714",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-07-a",
        "street": "725 Spring Valley Road",
        "city": "Altamonte Springs",
        "state": "FL",
        "zipCode": "32714",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-07-a",
        "firstName": "Sarah",
        "lastName": "O'Connor",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-4419",
        "email": "sarah.oconnor@orlandomedia.com",
        "isPrimary": true
      },
      {
        "id": "auth-07-b",
        "firstName": "Michael",
        "lastName": "O'Connor",
        "positionLabel": "Spouse",
        "phone": "(407) 555-4420",
        "email": "m.oconnor@orlandomedia.com",
        "isPrimary": false
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Gold Care)",
    "financials": {
      "totalInvoiced": 1420,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-03-01T09:00:00.000Z",
    "updatedAt": "2026-08-20T12:00:00.000Z"
  },
  {
    "id": "cust-res-08",
    "customerNumber": "C-1008",
    "accountNumber": "ACC-1008",
    "name": "Patricia Gallagher",
    "firstName": "Patricia",
    "lastName": "Gallagher",
    "qbName": "Gallagher, Patricia",
    "phone": "(407) 555-9012",
    "mobilePhone": "(407) 555-9012",
    "email": "patricia.gallagher@outlook.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card, Check",
    "preferredCommunicationMethod": "Text",
    "preferredTechnician": "Carlos Mendez",
    "address": {
      "street": "2300 Osceola Parkway",
      "city": "Kissimmee",
      "state": "FL",
      "zipCode": "34744",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-08-a",
        "street": "2300 Osceola Parkway",
        "city": "Kissimmee",
        "state": "FL",
        "zipCode": "34744",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-08-a",
        "firstName": "Patricia",
        "lastName": "Gallagher",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-9012",
        "email": "patricia.gallagher@outlook.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Silver Care)",
    "financials": {
      "totalInvoiced": 890,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-02-14T10:00:00.000Z",
    "updatedAt": "2026-07-19T14:15:00.000Z"
  },
  {
    "id": "cust-res-09",
    "customerNumber": "C-1009",
    "accountNumber": "ACC-1009",
    "name": "David & Linda Alvarez",
    "firstName": "David",
    "lastName": "Alvarez",
    "qbName": "Alvarez, David",
    "phone": "(407) 555-1178",
    "mobilePhone": "(407) 555-1178",
    "email": "dalvarez@alvarezarch.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card, ACH",
    "preferredCommunicationMethod": "Email",
    "preferredTechnician": "Marcus Vance",
    "address": {
      "street": "155 Plant Street",
      "city": "Winter Garden",
      "state": "FL",
      "zipCode": "34787",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-09-a",
        "street": "155 Plant Street",
        "city": "Winter Garden",
        "state": "FL",
        "zipCode": "34787",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-09-a",
        "firstName": "David",
        "lastName": "Alvarez",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-1178",
        "email": "dalvarez@alvarezarch.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Gold Care)",
    "financials": {
      "totalInvoiced": 2150,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-01-22T08:30:00.000Z",
    "updatedAt": "2026-08-30T16:00:00.000Z"
  },
  {
    "id": "cust-res-10",
    "customerNumber": "C-1010",
    "accountNumber": "ACC-1010",
    "name": "Jonathan Myers",
    "firstName": "Jonathan",
    "lastName": "Myers",
    "qbName": "Myers, Jonathan",
    "phone": "(407) 555-5801",
    "mobilePhone": "(407) 555-5801",
    "email": "jmyers.celebration@gmail.com",
    "customerType": "residential",
    "taxGroup": "FL (7%)",
    "acceptedPaymentMethods": "Credit Card",
    "preferredCommunicationMethod": "Text",
    "address": {
      "street": "810 Celebration Avenue",
      "city": "Celebration",
      "state": "FL",
      "zipCode": "34747",
      "type": "residential",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-res-10-a",
        "street": "810 Celebration Avenue",
        "city": "Celebration",
        "state": "FL",
        "zipCode": "34747",
        "type": "residential",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-10-a",
        "firstName": "Jonathan",
        "lastName": "Myers",
        "positionLabel": "Homeowner",
        "phone": "(407) 555-5801",
        "email": "jmyers.celebration@gmail.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Account on Hold",
    "autoSyncStatus": "Pending",
    "maintenancePlanStatus": "None",
    "financials": {
      "totalInvoiced": 520,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-06-05T12:00:00.000Z",
    "updatedAt": "2026-08-12T09:00:00.000Z"
  },
  {
    "id": "cust-com-01",
    "customerNumber": "C-2001",
    "accountNumber": "ACC-2001",
    "name": "Magnolia Bay Bistro",
    "businessName": "Magnolia Bay Hospitality LLC",
    "qbName": "Magnolia Bay Bistro",
    "phone": "(407) 555-9800",
    "mobilePhone": "(407) 555-9800",
    "email": "catering@magnoliabaybistro.com",
    "customerType": "commercial",
    "taxGroup": "FL (7%)",
    "paymentTerms": "Net 30",
    "acceptedPaymentMethods": "Credit Card, ACH, Check",
    "preferredCommunicationMethod": "Email",
    "preferredTechnician": "David Ross",
    "address": {
      "street": "450 S New York Avenue",
      "city": "Winter Park",
      "state": "FL",
      "zipCode": "32789",
      "type": "commercial",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-com-01-a",
        "street": "450 S New York Avenue",
        "city": "Winter Park",
        "state": "FL",
        "zipCode": "32789",
        "type": "commercial",
        "isDefault": true,
        "description": "Main Dining & Commercial Kitchen"
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-com-01-a",
        "firstName": "Chef Antonio",
        "lastName": "Rossi",
        "positionLabel": "Executive Chef / General Manager",
        "phone": "(407) 555-9801",
        "email": "antonio@magnoliabaybistro.com",
        "isPrimary": true
      },
      {
        "id": "auth-com-01-b",
        "firstName": "Maria",
        "lastName": "Santos",
        "positionLabel": "Kitchen Manager",
        "phone": "(407) 555-9802",
        "email": "maria@magnoliabaybistro.com",
        "isPrimary": false
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Commercial Care)",
    "financials": {
      "totalInvoiced": 4850,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-02-01T08:00:00.000Z",
    "updatedAt": "2026-09-09T08:00:00.000Z"
  },
  {
    "id": "cust-com-02",
    "customerNumber": "C-2002",
    "accountNumber": "ACC-2002",
    "name": "Orlando Spine & Rehabilitation",
    "businessName": "Orlando Spine LLC",
    "qbName": "Orlando Spine & Rehabilitation",
    "phone": "(407) 555-7342",
    "mobilePhone": "(407) 555-7342",
    "email": "admin@orlandospineclinic.com",
    "customerType": "commercial",
    "taxGroup": "FL (7%)",
    "paymentTerms": "Net 30",
    "acceptedPaymentMethods": "ACH, Credit Card",
    "preferredCommunicationMethod": "Email",
    "preferredTechnician": "Marcus Vance",
    "address": {
      "street": "1200 S Orange Avenue, Suite 300",
      "city": "Orlando",
      "state": "FL",
      "zipCode": "32806",
      "type": "commercial",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-com-02-a",
        "street": "1200 S Orange Avenue, Suite 300",
        "city": "Orlando",
        "state": "FL",
        "zipCode": "32806",
        "type": "commercial",
        "isDefault": true,
        "description": "Suite 300 - Physical Therapy Wing"
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-com-02-a",
        "firstName": "Karen",
        "lastName": "Holt",
        "positionLabel": "Practice Administrator",
        "phone": "(407) 555-7342",
        "email": "karen.holt@orlandospineclinic.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Commercial Care)",
    "financials": {
      "totalInvoiced": 3200,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-01-18T10:00:00.000Z",
    "updatedAt": "2026-08-14T11:00:00.000Z"
  },
  {
    "id": "cust-com-03",
    "customerNumber": "C-2003",
    "accountNumber": "ACC-2003",
    "name": "Lake Eola Law Group",
    "businessName": "Lake Eola Legal Partners PA",
    "qbName": "Lake Eola Law Group",
    "phone": "(407) 555-8990",
    "mobilePhone": "(407) 555-8990",
    "email": "facilities@lakeeolalaw.com",
    "customerType": "commercial",
    "taxGroup": "FL (7%)",
    "paymentTerms": "Net 15",
    "acceptedPaymentMethods": "ACH, Check",
    "preferredCommunicationMethod": "Email",
    "preferredTechnician": "Carlos Mendez",
    "address": {
      "street": "201 E Pine Street, Floor 8",
      "city": "Orlando",
      "state": "FL",
      "zipCode": "32801",
      "type": "commercial",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-com-03-a",
        "street": "201 E Pine Street, Floor 8",
        "city": "Orlando",
        "state": "FL",
        "zipCode": "32801",
        "type": "commercial",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-com-03-a",
        "firstName": "Gregory",
        "lastName": "Stone",
        "positionLabel": "Managing Partner",
        "phone": "(407) 555-8991",
        "email": "gstone@lakeeolalaw.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Commercial Care)",
    "financials": {
      "totalInvoiced": 2750,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-03-05T09:30:00.000Z",
    "updatedAt": "2026-08-28T16:00:00.000Z"
  },
  {
    "id": "cust-com-04",
    "customerNumber": "C-2004",
    "accountNumber": "ACC-2004",
    "name": "Winter Park Boutique Hotel",
    "businessName": "Park Avenue Lodging LLC",
    "qbName": "Winter Park Boutique Hotel",
    "phone": "(407) 555-6200",
    "mobilePhone": "(407) 555-6200",
    "email": "maintenance@wpboutiquehotel.com",
    "customerType": "commercial",
    "taxGroup": "FL (7%)",
    "paymentTerms": "Net 30",
    "acceptedPaymentMethods": "Credit Card, ACH",
    "preferredCommunicationMethod": "Text",
    "preferredTechnician": "Marcus Vance",
    "address": {
      "street": "556 N Park Avenue",
      "city": "Winter Park",
      "state": "FL",
      "zipCode": "32789",
      "type": "commercial",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-com-04-a",
        "street": "556 N Park Avenue",
        "city": "Winter Park",
        "state": "FL",
        "zipCode": "32789",
        "type": "commercial",
        "isDefault": true,
        "description": "Main Hotel & Executive Suites"
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-com-04-a",
        "firstName": "Julian",
        "lastName": "Mercer",
        "positionLabel": "Chief Engineer / Facilities Director",
        "phone": "(407) 555-6205",
        "email": "jmercer@wpboutiquehotel.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "Active (Commercial Care)",
    "financials": {
      "totalInvoiced": 7800,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-09-02T10:00:00.000Z"
  },
  {
    "id": "cust-com-05",
    "customerNumber": "C-2005",
    "accountNumber": "ACC-2005",
    "name": "Bayside Bakery & Cafe",
    "businessName": "Bayside Bakery LLC",
    "qbName": "Bayside Bakery & Cafe",
    "phone": "(407) 555-6110",
    "mobilePhone": "(407) 555-6110",
    "email": "info@baysidebakeryfl.com",
    "customerType": "commercial",
    "taxGroup": "FL (7%)",
    "paymentTerms": "Due Upon Receipt",
    "acceptedPaymentMethods": "Credit Card, ACH",
    "preferredCommunicationMethod": "Email",
    "preferredTechnician": "David Ross",
    "address": {
      "street": "424 Central Avenue",
      "city": "Orlando",
      "state": "FL",
      "zipCode": "32801",
      "type": "commercial",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-com-05-a",
        "street": "424 Central Avenue",
        "city": "Orlando",
        "state": "FL",
        "zipCode": "32801",
        "type": "commercial",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-com-05-a",
        "firstName": "Claire",
        "lastName": "Dupont",
        "positionLabel": "Head Baker / Owner",
        "phone": "(407) 555-6110",
        "email": "claire@baysidebakeryfl.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Active",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "None",
    "financials": {
      "totalInvoiced": 1240,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-06-10T11:00:00.000Z",
    "updatedAt": "2026-09-04T14:00:00.000Z"
  },
  {
    "id": "cust-com-06",
    "customerNumber": "C-2006",
    "accountNumber": "ACC-2006",
    "name": "Citrus Tower Dental Associates",
    "businessName": "Citrus Tower Dental Group PA",
    "qbName": "Citrus Tower Dental Associates",
    "phone": "(352) 555-4100",
    "mobilePhone": "(352) 555-4100",
    "email": "office@citrustowerdental.com",
    "customerType": "commercial",
    "taxGroup": "FL (7%)",
    "paymentTerms": "Net 30",
    "acceptedPaymentMethods": "Credit Card, Check",
    "preferredCommunicationMethod": "Email",
    "address": {
      "street": "141 N US Highway 27",
      "city": "Clermont",
      "state": "FL",
      "zipCode": "34711",
      "type": "commercial",
      "isDefault": true
    },
    "locations": [
      {
        "id": "loc-com-06-a",
        "street": "141 N US Highway 27",
        "city": "Clermont",
        "state": "FL",
        "zipCode": "34711",
        "type": "commercial",
        "isDefault": true
      }
    ],
    "authorizedPersons": [
      {
        "id": "auth-com-06-a",
        "firstName": "Dr. Rebecca",
        "lastName": "Shaw",
        "positionLabel": "Lead Dentist / Owner",
        "phone": "(352) 555-4101",
        "email": "rshaw@citrustowerdental.com",
        "isPrimary": true
      }
    ],
    "customerStatus": "Inactive",
    "autoSyncStatus": "Synced",
    "maintenancePlanStatus": "None",
    "financials": {
      "totalInvoiced": 980,
      "totalProposed": 0,
      "currency": "USD"
    },
    "createdAt": "2026-04-12T10:00:00.000Z",
    "updatedAt": "2026-07-22T15:00:00.000Z"
  }
];

export const CANONICAL_MOCK_CUSTOMERS: CanonicalCustomer[] = [...DEMO_CUSTOMERS];
