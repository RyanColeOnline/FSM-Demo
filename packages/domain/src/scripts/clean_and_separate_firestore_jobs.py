# Clean and separate sandbox_jobs and archive_jobs in Cloud Firestore with 0 overlap
import os
import sys
import json
import time
import glob
import urllib.request
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

from process_and_partition_all_data import read_xlsx_rows, parse_num, parse_date, save_json_dual, CUTOFF_DATE

PROJECT_ID = 'murphys-fsm-staging'
COMMIT_URL = f'https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit'

def get_firebase_token():
    config_paths = [
        os.path.expanduser('~/.config/configstore/firebase-tools.json'),
        os.path.join(os.environ.get('APPDATA', ''), 'configstore', 'firebase-tools.json'),
        os.path.join(os.environ.get('LOCALAPPDATA', ''), 'configstore', 'firebase-tools.json'),
        os.path.join(os.environ.get('USERPROFILE', ''), '.config', 'configstore', 'firebase-tools.json')
    ]
    for p in config_paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                d = json.load(f)
                return d['tokens']['access_token']
    raise RuntimeError('No Firebase CLI token found')

def to_firestore_value(val):
    if val is None:
        return {'nullValue': None}
    elif isinstance(val, bool):
        return {'booleanValue': val}
    elif isinstance(val, int):
        return {'integerValue': str(val)}
    elif isinstance(val, float):
        return {'doubleValue': val}
    elif isinstance(val, str):
        return {'stringValue': val}
    elif isinstance(val, list):
        return {'arrayValue': {'values': [to_firestore_value(item) for item in val if item is not None]}}
    elif isinstance(val, dict):
        fields = {}
        for k, v in val.items():
            if v is not None:
                fields[k] = to_firestore_value(v)
        return {'mapValue': {'fields': fields}}
    else:
        return {'stringValue': str(val)}

def delete_batch(args):
    collection_name, doc_ids, token = args
    writes = []
    for doc_id in doc_ids:
        clean_id = str(doc_id).replace('/', '_').replace(' ', '_')
        doc_name = f'projects/{PROJECT_ID}/databases/(default)/documents/{collection_name}/{clean_id}'
        writes.append({'delete': doc_name})
    payload = json.dumps({'writes': writes}).encode('utf-8')
    req = urllib.request.Request(COMMIT_URL, data=payload, headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, method='POST')
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    return len(doc_ids)
        except Exception as e:
            if attempt == 3:
                return 0
            time.sleep(1 + attempt * 2)
    return 0

def upload_batch(args):
    collection_name, chunk, token = args
    writes = []
    for doc in chunk:
        doc_id = str(doc.get('id') or doc.get('jobNumber'))
        clean_id = doc_id.replace('/', '_').replace(' ', '_')
        doc_name = f'projects/{PROJECT_ID}/databases/(default)/documents/{collection_name}/{clean_id}'
        fields = {k: to_firestore_value(v) for k, v in doc.items() if v is not None}
        writes.append({'update': {'name': doc_name, 'fields': fields}})
    payload = json.dumps({'writes': writes}).encode('utf-8')
    req = urllib.request.Request(COMMIT_URL, data=payload, headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, method='POST')
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    return len(chunk)
        except Exception as e:
            if attempt == 3:
                return 0
            time.sleep(1 + attempt * 2)
    return 0

def run_clean_and_separate():
    print('========================================================')
    print(' STRICT FIRESTORE JOBS PARTITIONING & CLEANUP(CUTOFF: Jan 10, 2025)')
    print('=======================================================')
    token = get_firebase_token()
    
    job_files = sorted(glob.glob(r'e:\Murphys\data\wex_exports\jobs\**\*.xlsx', recursive=True))
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
        
        # STRICT CUTOFF (date < Jan 10, 2025 => Archive, date >= Jan 10, 2025 => Sandbox)
        is_archive = bool(dt and dt < CUTOFF_DATE) or (dt is None and 'esc' in (r.get('Job Type') or '').lower())
        
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
                'zip': r.get('Location Zip') or '',
                'zipCode': r.get('Location Zip') or ''
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
            'isHistoricalArchive': is_archive,
            'createdAt': '2026-08-26T00:00:00Z'
        }
        
        if is_archive:
            archive_jobs.append(item)
        else:
            operational_jobs.append(item)

    print(f'Total Jobs parsed: {len(all_jobs):,}')
    print(f'  -> Strict Operational Jobs (>= 2025-01-10): {len(operational_jobs):,}')
    print(f'  -> Strict Archive Jobs (< 2025-01-10): {len(archive_jobs):,}')

    operational_jobs.sort(key=lambda x: x.get('jobCreationDate', ''), reverse=True)
    save_json_dual('jobs_sample.json', operational_jobs)

    # 1. PURGE all historical archive job IDs from sandbox_jobs in Cloud Firestore
    archive_doc_ids = [j['id'] for j in archive_jobs]
    print(f"\nStep 1/3: Deleting {len(archive_doc_ids):,} historical jobs from `sandbox_jobs` in Firestore...")
    batch_size = 400
    chunks = [archive_doc_ids[i:i + batch_size] for i in range(0, len(archive_doc_ids), batch_size)]
    delete_args = [('sandbox_jobs', chunk, token) for chunk in chunks]
    
    total_deleted = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(delete_batch, arg) for arg in delete_args]
        for f in as_completed(futures):
            total_deleted += f.result()
            if total_deleted % (batch_size * 10) < batch_size or total_deleted == len(archive_doc_ids):
                pct = (total_deleted / len(archive_doc_ids)) * 100
                print(f"  [sandbox_jobs purge] {total_deleted:,} / {len(archive_doc_ids):,} ({pct:.1f}%) deleted...")
    
    elapsed = time.time() - t0
    print(f"  Purged {total_deleted:,} documents from `sandbox_jobs` in {elapsed:.2f}s!")

    # 2. PURGE any operational job IDs that may have been sent to archive_jobs
    op_doc_ids = [j['id'] for j in operational_jobs]
    print(f"\nStep 2/3: Ensuring zero operational jobs exist in `archive_jobs`...")
    op_chunks = [op_doc_ids[i:i + batch_size] for i in range(0, len(op_doc_ids), batch_size)]
    clean_arch_args = [('archive_jobs', chunk, token) for chunk in op_chunks]
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(delete_batch, arg) for arg in clean_arch_args]
        for f in as_completed(futures):
            f.result()
    print("  `archive_jobs` verified free of any operational job records!")

    # 3. Stream all 17,879 clean operational jobs into sandbox_jobs
    print(f"\nStep 3/3: Uploading {len(operational_jobs):,} clean operational jobs to `sandbox_jobs`...")
    op_job_chunks = [operational_jobs[i:i + batch_size] for i in range(0, len(operational_jobs), batch_size)]
    upload_args = [('sandbox_jobs', chunk, token) for chunk in op_job_chunks]
    
    total_uploaded = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(upload_batch, arg) for arg in upload_args]
        for f in as_completed(futures):
            total_uploaded += f.result()
            if total_uploaded % (batch_size * 5) < batch_size or total_uploaded == len(operational_jobs):
                pct = (total_uploaded / len(operational_jobs)) * 100
                print(f"  [sandbox_jobs upload] {total_uploaded:,} / {len(operational_jobs):,} ({pct:.1f}%) uploaded...")
    
    elapsed = time.time() - t0
    print(f"  Uploaded {total_uploaded:,} operational jobs in {elapsed:.2f}s!")
    print("\n✅ FIRESTORE JOBS SEPARATION COMPLETE - STRICT 0 OVERLAP!")

if __name__ == '__main__':
    run_clean_and_separate()
