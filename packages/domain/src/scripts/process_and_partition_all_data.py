import os
import sys
import csv
import json
import time
import glob
import zipfile
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CUTOFF_DATE = datetime(2025, 1, 10)
CUTOFF_ISO = '2025-01-10T00:00:00.000Z'

DOMAIN_MOCK_DIR = r'e:\Murphys\packages\domain\src\mock'
WEB_MOCK_DIR = r'e:\Murphys\apps\web\src\domain\mock'

os.makedirs(DOMAIN_MOCK_DIR, exist_ok=True)
os.makedirs(WEB_MOCK_DIR, exist_ok=True)

def parse_date(date_str):
    if not date_str:
        return None
    date_str = str(date_str).strip()
    formats = [
        '%m/%d/%Y %H:%M:%S', '%m/%d/%Y %I:%M %p', '%m/%d/%Y %I:%M:%S %p',
        '%m/%d/%Y %H:%M', '%m/%d/%Y', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d', '%d-%b-%y', '%d-%b-%Y', '%m/%d/%y', '%m-%d-%Y'
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    m = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', date_str)
    if m:
        m_val, d_val, y_val = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y_val < 100:
            y_val += 2000 if y_val < 50 else 1900
        try:
            return datetime(y_val, m_val, d_val)
        except ValueError:
            pass
    return None

def col2num(col_str):
    num = 0
    for c in col_str:
        num = num * 26 + (ord(c.upper()) - ord('A')) + 1
    return num

def parse_num(val, default=0):
    if not val: return default
    clean = re.sub(r'[^\d.]', '', str(val))
    try:
        if '.' in clean: return float(clean)
        return int(clean)
    except ValueError:
        return default

def parse_price(val):
    if not val: return 0.0
    clean = re.sub(r'[^\d.]', '', str(val))
    try:
        return float(clean)
    except ValueError:
        return 0.0

def read_xlsx_rows(path):
    table_data = []
    with zipfile.ZipFile(path, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t = si.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                if t is not None and t.text:
                    shared_strings.append(t.text)
                else:
                    texts = [elem.text for elem in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if elem.text]
                    shared_strings.append(''.join(texts))
        sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rows = sheet_tree.findall('.//ns:row', ns)
        headers = {}
        for r_idx, r in enumerate(rows):
            cells = r.findall('ns:c', ns)
            row_dict = {}
            for c in cells:
                ref = c.get('r')
                m = re.match(r'([A-Z]+)(\d+)', ref)
                col_idx = col2num(m.group(1))
                t = c.get('t')
                v = c.find('ns:v', ns)
                val = ''
                if v is not None and v.text is not None:
                    if t == 's':
                        s_idx = int(v.text)
                        val = shared_strings[s_idx] if s_idx < len(shared_strings) else v.text
                    else:
                        val = v.text
                if r_idx == 0:
                    headers[col_idx] = val.strip() if val else f'Col_{col_idx}'
                else:
                    header_name = headers.get(col_idx, f'Col_{col_idx}')
                    row_dict[header_name] = val
            if r_idx > 0 and any(row_dict.values()):
                table_data.append(row_dict)
    return table_data

def save_json_dual(filename, data):
    p1 = os.path.join(DOMAIN_MOCK_DIR, filename)
    p2 = os.path.join(WEB_MOCK_DIR, filename)
    with open(p1, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    with open(p2, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f'  [SAVED] {filename} -> {len(data)} records saved.')

def process_jobs():
    print('\n=======================================================')
    print('1. PROCESSING JOBS (Cutoff: Jan 10, 2025)')
    print('=======================================================')
    job_files = sorted(glob.glob(r'e:\Murphys\data\wex_exports\jobs\WEX Job Summaries\*\*.xlsx'))
    all_jobs = {}
    for jf in job_files:
        rows = read_xlsx_rows(jf)
        for r in rows:
            j_num = r.get('Job #')
            if j_num and j_num not in all_jobs:
                all_jobs[j_num] = r

    operational_jobs = []
    archive_jobs = []

    for j_num, r in all_jobs.items():
        doc_id = f'job-{j_num}'
        c_num = r.get('Customer Number') or ''
        c_name = r.get('Customer Name') or ''
        j_stat = r.get('Job Status') or 'Closed'
        
        if j_stat.lower() in ['open', 'opened', 'in progress']:
            status_val = 'Opened'
        elif j_stat.lower() in ['abandon', 'abandoned', 'cancelled']:
            status_val = 'Abandoned'
        else:
            status_val = 'Closed'
            
        inv_tot = parse_num(r.get('Invoices Total'), 0.0)
        prop_tot = parse_num(r.get('Signed Proposals Total'), 0.0)
        created_str = r.get('Job Creation Date') or ''
        dt = parse_date(created_str)
        
        item = {
            'id': doc_id,
            'jobNumber': j_num,
            'customerId': f'cust-{c_num}' if c_num else '',
            'customerNumber': c_num,
            'customerName': c_name,
            'customerCreatedDate': r.get('Customer Created Date') or '',
            'email': r.get('Email') or '',
            'homePhone': r.get('Home Phone') or '',
            'mobilePhone': r.get('Mobile Phone') or '',
            'phone': r.get('Mobile Phone') or r.get('Home Phone') or '',
            'locationAddress': r.get('Location Address') or '',
            'locationCity': r.get('Location City') or '',
            'locationState': r.get('Location State') or '',
            'locationZip': r.get('Location Zip') or '',
            'address': {
                'street': r.get('Location Address') or '',
                'city': r.get('Location City') or '',
                'state': r.get('Location State') or '',
                'zip': r.get('Location Zip') or ''
            },
            'jobType': r.get('Job Type') or 'HVAC service',
            'jobName': r.get('Job Type') or '',
            'status': status_val,
            'followUpFlag': r.get('Follow-up Flag?') or 'N',
            'isFlagged': (r.get('Follow-up Flag?') or '').upper() == 'Y',
            'followUpDate': r.get('Follow-up Date') or '',
            'checklists': r.get('Checklists') or '',
            'leadSource': r.get('Lead Source') or '',
            'apptsScheduledCount': parse_num(r.get('# of Appts Scheduled'), 0),
            'apptsCompletedCount': parse_num(r.get('# of Appts Complete'), 0),
            'signedProposalsCount': parse_num(r.get('Signed Proposals #'), 0),
            'signedProposalsTotal': prop_tot,
            'invoicesCount': parse_num(r.get('Invoices #'), 0),
            'invoicesTotal': inv_tot,
            'jobPrice': f"${inv_tot:,.2f}" if inv_tot > 0 else "$0.00",
            'jobCreationDate': created_str,
            'isHistoricalArchive': bool((dt and dt < CUTOFF_DATE) or ('esc' in (r.get('Job Type') or '').lower())),
            'createdAt': '2026-08-26T00:00:00Z'
        }
        
        is_esc = 'esc' in (r.get('Job Type') or '').lower() or 'imported' in (r.get('Job Type') or '').lower()
        if (dt and dt < CUTOFF_DATE) or is_esc:
            archive_jobs.append(item)
        else:
            operational_jobs.append(item)

    print(f'Total Jobs parsed: {len(all_jobs)}')
    print(f'  -> Operational Jobs (>= 2025-01-10): {len(operational_jobs)}')
    print(f'  -> Historical Archive Jobs (< 2025-01-10): {len(archive_jobs)}')

    operational_jobs.sort(key=lambda x: x.get('jobCreationDate', ''), reverse=True)
    save_json_dual('jobs_sample.json', operational_jobs)
    return operational_jobs, archive_jobs

def process_appointments():
    print('\n=======================================================')
    print('2. PROCESSING APPOINTMENTS (Cutoff: Jan 10, 2025)')
    print('=======================================================')
    appt_files = sorted(glob.glob(r'e:\Murphys\data\wex_exports\appointments and service requests\Appointments*.csv'))
    unique_appts = {}
    for f in appt_files:
        with open(f, 'r', encoding='utf-16', errors='replace') as csvf:
            reader = csv.reader(csvf, delimiter='\t')
            headers = [h.strip() for h in next(reader)]
            for r in reader:
                if any(r):
                    row_dict = {h: v.strip() for h, v in zip(headers, r) if h}
                    aid = row_dict.get('Appointment ID')
                    if aid and aid not in unique_appts:
                        unique_appts[aid] = row_dict

    operational_appts = []
    archive_appts = []

    for aid, r in unique_appts.items():
        doc_id = f'appt-{aid}'
        job_num = r.get('Job #') or ''
        created_str = r.get('Created Date') or r.get('Appointment Date/Time') or ''
        dt = parse_date(created_str)

        item = {
            'id': doc_id,
            'appointmentId': aid,
            'jobNumber': job_num,
            'jobId': f'job-{job_num}' if job_num else '',
            'wexJobId': r.get('job_id') or '',
            'type': r.get('Type') or 'Appointment',
            'createdDate': r.get('Created Date') or '',
            'dateTime': r.get('Appointment Date/Time') or '',
            'tags': r.get('Tags') or '',
            'status': r.get('Appt Status') or 'Complete',
            'customerName': r.get('Customer Name') or '',
            'locationAddress': r.get('Location') or '',
            'coverageZone': r.get('Coverage Zone') or '',
            'serviceNotes': r.get('Appointment Note ') or r.get('Appointment Note') or '',
            'appointmentNote': r.get('Appointment Note ') or r.get('Appointment Note') or '',
            'jobType': r.get('Job Type') or 'HVAC service',
            'jobName': r.get('Job Name') or '',
            'isConfirmed': (r.get('Confirmed?') or '').lower() == 'yes',
            'technician': r.get('Appointment Tech') or '',
            'assignedTech': r.get('Appointment Tech') or '',
            'hoursScheduled': r.get('Hours Scheduled') or '',
            'hoursWorked': r.get('Hours Worked (All Techs)') or '',
            'isHistoricalArchive': bool((dt and dt < CUTOFF_DATE) or ('esc' in (r.get('Job Type') or '').lower())),
            'createdAt': '2026-08-26T00:00:00Z'
        }

        is_esc = 'esc' in (r.get('Job Type') or '').lower() or 'imported' in (r.get('Job Type') or '').lower()
        if (dt and dt < CUTOFF_DATE) or is_esc:
            archive_appts.append(item)
        else:
            operational_appts.append(item)

    print(f'Total Appointments: {len(unique_appts)}')
    print(f'  -> Operational Appointments: {len(operational_appts)}')
    print(f'  -> Historical Archive Appointments: {len(archive_appts)}')

    save_json_dual('appointments.json', operational_appts)
    return operational_appts, archive_appts

def process_equipment():
    print('\n=======================================================')
    print('3. PROCESSING EQUIPMENT & WARRANTIES (100% RETAINED IN HOT DB)')
    print('=======================================================')
    equip_file = r'e:\Murphys\data\wex_exports\equipment\WEX Equipment-Warranty.csv'
    records = []
    with open(equip_file, 'r', encoding='utf-16', errors='replace') as f:
        reader = csv.reader(f, delimiter='\t')
        _ = next(reader)
        headers = [h.strip() for h in next(reader)]
        for r in reader:
            if any(r):
                records.append({h: v.strip() for h, v in zip(headers, r) if h})

    canonical_equipment = []
    for idx, r in enumerate(records):
        equip_id = r.get('Equipment ID') or f'EQ-{idx+1:05d}'
        doc_id = f'eq-{equip_id}'
        cust_id = r.get('business_customer_id') or ''
        c_name = r.get('Customer Name') or ''
        eq_name = r.get('Equipment Name') or r.get('System Name') or 'HVAC Equipment'
        
        item = {
            'id': doc_id,
            'equipmentId': equip_id,
            'customerId': f'cust-{cust_id}' if cust_id else '',
            'businessCustomerId': cust_id,
            'customerName': c_name,
            'customerStatus': r.get('Customer Status') or 'Active',
            'phone': r.get('Phone') or '',
            'customerType': r.get('Customer Type') or 'Residential',
            'locationAddress': r.get('Equipment Location') or '',
            'systemName': r.get('System Name') or '',
            'equipmentName': eq_name,
            'name': eq_name,
            'equipmentDescription': r.get('Equipment Description') or '',
            'equipmentStatus': r.get('Equipment Status') or 'Active',
            'status': (r.get('Equipment Status') or 'Active').lower(),
            'systemAge': r.get('System Age') or '',
            'installationDate': r.get('Installation Date') or '',
            'modelNumber': r.get('Model Number') or '',
            'serialNumber': r.get('Serial Number') or '',
            'manufacturer': r.get('Manufacturer') or '',
            'manufacturerWarrantyName': r.get('Manufacturer Warranty Name') or '',
            'manufacturerWarrantyStatus': r.get('Manufacturer Warranty Status') or '',
            'manufacturerWarrantyEffectiveDate': r.get('Manufacturer Warranty Effective Date') or '',
            'manufacturerWarrantyDescription': r.get('Manufacturer Warranty Desription') or '',
            'manufacturerWarrantyEffectiveEnd': r.get('Manufacturer Warranty Effective End') or '',
            'otherWarrantyName': r.get('Other Warranty Name') or '',
            'otherWarrantyEffectiveDate': r.get('Other Warranty Effective') or '',
            'otherWarrantyEndDate': r.get('Other Warranty End') or '',
            'otherWarrantyDescription': r.get('Other Warranty Description') or '',
            'createdAt': '2026-08-26T00:00:00Z'
        }
        canonical_equipment.append(item)

    print(f'Total Equipment items (100% Operational): {len(canonical_equipment)}')
    save_json_dual('equipment.json', canonical_equipment)
    return canonical_equipment

def process_proposals():
    print('\n=======================================================')
    print('4. PROCESSING PROPOSALS (Cutoff: Jan 10, 2025)')
    print('=======================================================')
    prop_xlsx = r'e:\Murphys\data\wex_exports\proposals\proposals-2018-01-01-2026-08-16.xlsx'
    table_data = read_xlsx_rows(prop_xlsx)

    operational_proposals = []
    archive_proposals = []
    seen_ids = set()

    for idx, r in enumerate(table_data):
        p_num = r.get('Proposal Number') or f'P-{idx+1:05d}'
        clean_num = p_num.replace('#', '').strip()
        doc_id = f'prop-{clean_num.lower()}'
        if doc_id in seen_ids:
            doc_id = f'prop-{clean_num.lower()}-{idx+1}'
        seen_ids.add(doc_id)
        
        c_name = r.get('Name') or ''
        job_num = r.get('Job Number') or ''
        amount = parse_price(r.get('Amount'))
        issued_str = r.get('Issue Date') or ''
        dt = parse_date(issued_str)
        
        item = {
            'id': doc_id,
            'proposalNumber': clean_num,
            'jobNumber': job_num,
            'jobId': f'job-{job_num}' if job_num else '',
            'customerName': c_name,
            'billToCustomer': c_name,
            'locationAddress': r.get('Location') or '',
            'jobLocation': r.get('Location') or '',
            'jobType': r.get('Job Type') or 'HVAC service',
            'jobName': r.get('Job Name') or '',
            'technician': r.get('Technician') or '',
            'status': r.get('Status') or 'Presented',
            'amount': amount,
            'total': amount,
            'issueDate': issued_str,
            'isHistoricalArchive': bool((dt and dt < CUTOFF_DATE) or ('esc' in (r.get('Job Type') or '').lower())),
            'createdAt': '2026-08-26T00:00:00Z'
        }

        is_esc = 'esc' in (r.get('Job Type') or '').lower() or 'imported' in (r.get('Job Type') or '').lower()
        if (dt and dt < CUTOFF_DATE) or is_esc:
            archive_proposals.append(item)
        else:
            operational_proposals.append(item)

    print(f'Total Proposals: {len(table_data)}')
    print(f'  -> Operational Proposals: {len(operational_proposals)}')
    print(f'  -> Historical Archive Proposals: {len(archive_proposals)}')

    save_json_dual('proposals.json', operational_proposals)
    return operational_proposals, archive_proposals

def process_payments():
    print('\n=======================================================')
    print('5. PROCESSING PAYMENTS & TRANSACTIONS')
    print('=======================================================')
    tx_file = r'e:\Murphys\data\wex_exports\transactions\Payzer_Transactions_PaymentsReceived_20260812.csv'
    records = []
    with open(tx_file, 'r', encoding='utf-8-sig', errors='replace') as f:
        reader = csv.reader(f)
        headers = [h.strip() for h in next(reader)]
        for r in reader:
            if any(r):
                records.append({h: v.strip() for h, v in zip(headers, r) if h})

    canonical_payments = []
    seen_ids = set()
    for idx, r in enumerate(records):
        ref_num = r.get('REFERENCE NUMBER') or f'TX-{idx+1:05d}'
        doc_id = f'pay-{ref_num}'
        if doc_id in seen_ids:
            doc_id = f'pay-{ref_num}-{idx+1}'
        seen_ids.add(doc_id)
        
        c_name = r.get('FROM') or r.get('DISPLAY NAME') or ''
        c_num = r.get('CUSTOMER NUMBER') or ''
        inv_num = r.get('INVOICE NUMBER') or ''
        amt = parse_price(r.get('AMOUNT'))
        net_amt = parse_price(r.get('NET AMOUNT')) or amt
        
        item = {
            'id': doc_id,
            'referenceNumber': ref_num,
            'paymentDate': r.get('PAYMENT DATE') or '',
            'dateTime': r.get('PAYMENT DATE') or '',
            'customerNumber': c_num,
            'customerId': f'cust-{c_num}' if c_num else '',
            'customerName': c_name,
            'payerName': c_name,
            'amount': amt,
            'netAmount': net_amt,
            'invoiceNumber': inv_num,
            'paymentNetwork': r.get('PAYMENT NETWORK') or 'Credit Card',
            'method': r.get('PAYMENT NETWORK') or 'Credit Card',
            'type': r.get('TYPE') or 'Processed',
            'status': r.get('STATUS') or 'Settled',
            'takenBy': r.get('TAKEN BY') or 'Office',
            'memo': r.get('MEMO') or '',
            'last4': r.get('LAST4') or '',
            'businessName': r.get('BUSINESS NAME') or '',
            'settlementBatch': r.get('SETTLEMENT BATCH') or '',
            'batchTotal': parse_price(r.get('BATCH TOTAL')),
            'customerMobilePhone': r.get('CUSTOMER MOBILE PHONE') or '',
            'customerHomePhone': r.get('CUSTOMER HOME PHONE') or '',
            'merchantName': r.get('MERCHANT NAME') or "Murphy's Home Services",
            'payzerId': r.get('PAYZER ID') or '',
            'group': r.get('GROUP') or 'Self Service',
            'createdAt': '2026-08-26T00:00:00Z'
        }
        canonical_payments.append(item)

    print(f'Total Payments (100% Operational): {len(canonical_payments)}')
    save_json_dual('payments.json', canonical_payments)
    return canonical_payments

def process_maintenance_plans():
    print('\n=======================================================')
    print('6. PROCESSING MAINTENANCE PLANS (Cutoff: Jan 10, 2025)')
    print('=======================================================')
    mp_csv = r'e:\Murphys\data\wex_exports\maintenance plans\WEX MP_Data.csv'
    mp_xlsx = r'e:\Murphys\data\wex_exports\maintenance plans customers\WEX maintenance-plans-customers.xlsx'
    
    mp_rows = []
    with open(mp_csv, 'r', encoding='utf-16', errors='replace') as f:
        reader = csv.reader(f, delimiter='\t')
        headers = [h.strip() for h in next(reader)]
        for r in reader:
            if any(r):
                mp_rows.append({h: v.strip() for h, v in zip(headers, r) if h})

    xlsx_rows = read_xlsx_rows(mp_xlsx)
    xlsx_map = {}
    for r in xlsx_rows:
        c_name = r.get('Customer Name', '').strip().lower()
        if c_name:
            xlsx_map[c_name] = r

    operational_plans = []
    archive_plans = []

    for idx, r in enumerate(mp_rows):
        plan_id = r.get('id') or f'MP-{idx+1:05d}'
        doc_id = f'mp-{plan_id}'
        c_name = r.get('Customer') or ''
        cust_id = r.get('customer_id') or ''
        p_name = r.get('Plan Name') or 'HVAC Maintenance Plan'
        x_info = xlsx_map.get(c_name.strip().lower(), {})
        
        contract_price = parse_price(r.get('Contract Price'))
        payments_applied = parse_price(r.get('Payments Applied'))
        contract_balance = parse_price(r.get('Contract Balance'))
        
        start_str = r.get('Start Date') or x_info.get('Start Date') or ''
        exp_str = r.get('Expiration Date') or x_info.get('Expiration Date') or ''
        dt = parse_date(start_str) or parse_date(exp_str)

        item = {
            'id': doc_id,
            'planId': plan_id,
            'name': p_name,
            'planName': p_name,
            'customerId': f'cust-{cust_id}' if cust_id else '',
            'customer_id': cust_id,
            'customerName': c_name,
            'status': r.get('Status') or 'Current',
            'serviceWindow': r.get('Service Window') or '0 of 2 Scheduled',
            'serviceWindowJobs': x_info.get('Service Window Jobs') or r.get('Service Window') or '',
            'startDate': start_str,
            'expirationDate': exp_str,
            'contractPrice': contract_price,
            'contractTotal': contract_price,
            'paymentsApplied': payments_applied,
            'contractBalance': contract_balance,
            'balanceDue': contract_balance,
            'planPaymentStatus': r.get('Plan Payment Status') or 'PAID',
            'salesAgent': r.get('Sales Agent') or '',
            'email': r.get('Email') or x_info.get('Email') or '',
            'phone': r.get('Phone') or x_info.get('Mobile Phone') or '',
            'locationAddress': r.get('Plan Location') or x_info.get('Maintenance Plan Address') or '',
            'billingAddress': x_info.get('Billing Address') or '',
            'billingCity': x_info.get('Billing City') or '',
            'billingState': x_info.get('Billing State') or '',
            'billingZip': x_info.get('Billing Zip') or '',
            'futurePlan': x_info.get('Future Plan') or 'N',
            'isHistoricalArchive': bool(dt and dt < CUTOFF_DATE),
            'createdAt': '2026-08-26T00:00:00Z'
        }

        if dt and dt < CUTOFF_DATE:
            archive_plans.append(item)
        else:
            operational_plans.append(item)

    print(f'Total Maintenance Plans: {len(mp_rows)}')
    print(f'  -> Operational Plans: {len(operational_plans)}')
    print(f'  -> Historical Archive Plans: {len(archive_plans)}')

    save_json_dual('maintenance_plans.json', operational_plans)
    return operational_plans, archive_plans

def main():
    print('=================================================================')
    print('🚀 MURPHYS FSM DATA PARTITION & CACHE GENERATOR (HOT & ARCHIVE)')
    print(f'   Operational Cutoff Date: {CUTOFF_ISO}')
    print('=================================================================')

    t0 = time.time()
    op_jobs, arch_jobs = process_jobs()
    op_appts, arch_appts = process_appointments()
    equip = process_equipment()
    op_props, arch_props = process_proposals()
    payments = process_payments()
    op_plans, arch_plans = process_maintenance_plans()

    elapsed = time.time() - t0
    print('\n=================================================================')
    print(f'✅ ALL DATASETS SUCCESSFULLY PARTITIONED & SYNCED IN {elapsed:.2f}s!')
    print('   Hot Operational Totals:')
    print(f'     - Jobs: {len(op_jobs):,}')
    print(f'     - Appointments: {len(op_appts):,}')
    print(f'     - Equipment & Warranties: {len(equip):,}')
    print(f'     - Proposals: {len(op_props):,}')
    print(f'     - Payments: {len(payments):,}')
    print(f'     - Maintenance Plans: {len(op_plans):,}')
    print('   Historical Archive Totals (Available for BigQuery/Analytics):')
    print(f'     - Archive Jobs (ESC): {len(arch_jobs):,}')
    print(f'     - Archive Appointments: {len(arch_appts):,}')
    print(f'     - Archive Proposals: {len(arch_props):,}')
    print(f'     - Archive Maintenance Plans: {len(arch_plans):,}')
    print('=================================================================\n')

if __name__ == '__main__':
    main()
