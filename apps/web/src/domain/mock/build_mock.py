import re
import os

with open('apps/mobile/Sources/MurphysUI/Models/Customer.swift', 'r', encoding='utf-8') as f:
    swift_customers = f.read()

with open('apps/mobile/Sources/MurphysUI/Models/Appointment.swift', 'r', encoding='utf-8') as f:
    swift_appointments = f.read()

with open('apps/mobile/Sources/MurphysUI/Stores/PriceBookStore.swift', 'r', encoding='utf-8') as f:
    swift_pricebook = f.read()

os.makedirs('packages/domain/src/mock', exist_ok=True)

# 1. Generate customers.ts
cust_pattern = re.compile(
    r'Customer\(\s*id:\s*UUID\(uuidString:\s*"([^"]+)"\)!,\s*name:\s*"([^"]+)",\s*email:\s*"([^"]+)",\s*phone:\s*"([^"]+)",\s*address:\s*Address\(street:\s*"([^"]+)",\s*city:\s*"([^"]+)",\s*state:\s*"([^"]+)",\s*zipCode:\s*"([^"]+)"(?:,\s*type:\s*\.([a-zA-Z]+))?\)(?:,\s*customerType:\s*\.([a-zA-Z]+))?',
    re.MULTILINE
)

cust_matches = cust_pattern.findall(swift_customers)

customers_ts = '''/**
 * Canonical Mock Customers Dataset (50 records matching mobile & web).
 */
import { CanonicalCustomer } from '../types/customer.js';

export const CANONICAL_MOCK_CUSTOMERS: CanonicalCustomer[] = [
'''

for m in cust_matches:
    cid, name, email, phone, street, city, state, zipCode, addrType, custType = m
    ctype = (custType or addrType or 'residential').lower()
    parts = name.split(' ')
    fname = parts[0] if len(parts) > 1 else ''
    lname = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]
    
    customers_ts += f'''  {{
    id: '{cid}',
    name: '{name}',
    firstName: '{fname}',
    lastName: '{lname}',
    qbName: '{lname}, {fname}',
    email: '{email}',
    phone: '{phone}',
    mobilePhone: '{phone}',
    homePhone: null,
    customerType: '{ctype}',
    createdAt: '2026-01-01T08:00:00.000Z',
    address: {{
      street: '{street}',
      city: '{city}',
      state: '{state}',
      zipCode: '{zipCode}',
      type: '{ctype}',
      billingType: '{'Commercial' if ctype == 'commercial' else 'Residential'}',
      isDefault: true,
    }},
    locations: [
      {{
        street: '{street}',
        city: '{city}',
        state: '{state}',
        zipCode: '{zipCode}',
        type: '{ctype}',
        billingType: '{'Commercial' if ctype == 'commercial' else 'Residential'}',
        isDefault: true,
      }},
      {{
        street: '{street}, Ste B',
        city: '{city}',
        state: '{state}',
        zipCode: '{zipCode}',
        type: '{ctype}',
        billingType: '{'Commercial' if ctype == 'commercial' else 'Residential'}',
        isDefault: false,
      }}
    ],
    contacts: ['{name}'],
    paymentTerms: 'Due upon Receipt',
    autoSyncStatus: 'Synced',
    customerStatus: 'Active',
  }},
'''

customers_ts += '];\n'

with open('packages/domain/src/mock/customers.ts', 'w', encoding='utf-8') as f:
    f.write(customers_ts)

print(f'Generated {len(cust_matches)} mock customers in customers.ts')

# 2. Generate appointments.ts
blocks = re.findall(r'Appointment\(([\s\S]*?)\n\s*\)', swift_appointments)

status_map = {
    'inProgress': 'In progress',
    'assigned': 'Assigned',
    'completed': 'Completed',
    'dispatched': 'Dispatched',
    'enRoute': 'En route',
    'unassigned': 'Unassigned',
    'cancelled': 'Cancelled',
    'onHold': 'On hold',
}

appointments_ts = '''/**
 * Canonical Mock Appointments & Jobs Dataset.
 */
import { CanonicalAppointment } from '../types/appointment.js';

export const CANONICAL_MOCK_APPOINTMENTS: CanonicalAppointment[] = [
'''

appt_count = 0
for b in blocks:
    id_m = re.search(r'id:\s*UUID\(uuidString:\s*"([^"]+)"\)', b)
    cust_m = re.search(r'customerId:\s*UUID\(uuidString:\s*"([^"]+)"\)', b)
    job_num_m = re.search(r'jobNumber:\s*(\d+)', b)
    job_type_m = re.search(r'jobType:\s*"([^"]+)"', b)
    status_m = re.search(r'status:\s*\.([a-zA-Z]+)', b)
    notes_m = re.search(r'serviceNotes:\s*"([^"]+)"', b)
    desig_m = re.search(r'designationOverride:\s*"([^"]+)"', b)
    tech_m = re.search(r'assignedTech:\s*"([^"]+)"', b)
    flag_m = re.search(r'isFlaggedForFollowUp:\s*(true|false)', b)
    
    if not (id_m and cust_m and job_num_m and job_type_m):
        continue
    
    appt_count += 1
    aid = id_m.group(1)
    cid = cust_m.group(1)
    jnum = int(job_num_m.group(1))
    jtype = job_type_m.group(1)
    status_val = status_map.get(status_m.group(1) if status_m else 'assigned', 'Assigned')
    notes_val = f"'{notes_m.group(1)}'" if notes_m else 'null'
    desig_val = f"'{desig_m.group(1)}'" if desig_m else 'null'
    tech_val = tech_m.group(1) if tech_m else 'Technician'
    flag_val = 'true' if flag_m and flag_m.group(1) == 'true' else 'false'
    
    appointments_ts += f'''  {{
    id: '{aid}',
    customerId: '{cid}',
    jobNumber: {jnum},
    appointmentSequenceNumber: 1,
    dateTime: '2026-02-27T10:00:00.000Z',
    durationHours: 2.0,
    status: '{status_val}',
    jobType: '{jtype}',
    designationOverride: {desig_val},
    assignedTech: '{tech_val}',
    isFlaggedForFollowUp: {flag_val},
    serviceNotes: {notes_val},
    accessCodes: [
      {{ id: 'code-1', label: 'Gate Code', code: '#4920' }},
      {{ id: 'code-2', label: 'Door Code', code: '8821' }},
      {{ id: 'code-3', label: 'Alarm Code', code: '1092#' }},
    ],
  }},
'''

appointments_ts += '];\n'

with open('packages/domain/src/mock/appointments.ts', 'w', encoding='utf-8') as f:
    f.write(appointments_ts)

print(f'Generated {appt_count} mock appointments in appointments.ts')

# 3. Generate priceBook.ts
pb_blocks = re.findall(r'PriceBookItem\(([\s\S]*?)\n\s*\)', swift_pricebook)

pricebook_ts = '''/**
 * Canonical Mock Price Book Items Dataset.
 */
import { CanonicalPriceBookItem } from '../types/priceBook.js';

export const CANONICAL_MOCK_PRICEBOOK_ITEMS: CanonicalPriceBookItem[] = [
'''

pb_count = 0
for pb in pb_blocks:
    id_m = re.search(r'id:\s*"([^"]+)"', pb)
    name_m = re.search(r'name:\s*"([^"]+)"', pb)
    prod_num_m = re.search(r'productNumber:\s*(?:"([^"]+)"|nil)', pb)
    account_m = re.search(r'incomeAccount:\s*"([^"]+)"', pb)
    tax_m = re.search(r'isTaxable:\s*(true|false)', pb)
    labor_m = re.search(r'laborHours:\s*([\d\.]+)', pb)
    std_price_m = re.search(r'standardPrice:\s*([\d\.]+)', pb)
    maint_price_m = re.search(r'maintenancePlanPrice:\s*(?:([\d\.]+)|nil)', pb)
    cats_m = re.search(r'categoryPaths:\s*\[(.*?)\]', pb, re.DOTALL)
    
    if not (id_m and name_m and account_m):
        continue
    
    pb_count += 1
    pbid = id_m.group(1)
    pbname = name_m.group(1).replace("'", "\\'")
    pbpnum = f"'{prod_num_m.group(1)}'" if prod_num_m and prod_num_m.group(1) else 'undefined'
    pbaccount = account_m.group(1).replace("'", "\\'")
    pbtax = 'true' if tax_m and tax_m.group(1) == 'true' else 'false'
    pblabor = labor_m.group(1) if labor_m else '0.0'
    pbstd = std_price_m.group(1) if std_price_m else '0.0'
    pbmaint = maint_price_m.group(1) if maint_price_m and maint_price_m.group(1) else 'undefined'
    
    cats_str = cats_m.group(1) if cats_m else '""'
    cats_list = [c.strip().strip('"') for c in cats_str.split(',') if c.strip().strip('"')]
    cats_formatted = ', '.join([f"'{c}'" for c in cats_list])
    
    pricebook_ts += f'''  {{
    id: '{pbid}',
    name: '{pbname}',
    sku: {pbpnum if pbpnum != 'undefined' else f"'{pbid}'"},
    productNumber: {pbpnum},
    description: '{pbname}',
    incomeAccount: '{pbaccount}',
    isTaxable: {pbtax},
    laborHours: {pblabor},
    sellingPrice: {pbstd},
    standardPrice: {pbstd},
    maintenancePlanPrice: {pbmaint},
    categoryPaths: [{cats_formatted}],
  }},
'''

pricebook_ts += '];\n'

with open('packages/domain/src/mock/priceBook.ts', 'w', encoding='utf-8') as f:
    f.write(pricebook_ts)

print(f'Generated {pb_count} mock price book items in priceBook.ts')
