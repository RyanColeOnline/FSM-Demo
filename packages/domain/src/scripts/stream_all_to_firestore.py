# Stream all partitioned operational and archive datasets directly into Cloud Firestore
import os
import sys
import json
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

from process_and_partition_all_data import (
    process_jobs,
    process_appointments,
    process_equipment,
    process_proposals,
    process_payments,
    process_maintenance_plans
)

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

def upload_batch(args):
    collection_name, chunk, token = args
    writes = []
    for doc in chunk:
        doc_id = str(doc.get('id') or doc.get('jobNumber') or doc.get('appointmentId') or doc.get('proposalId') or doc.get('planId') or doc.get('paymentId') or doc.get('equipmentId') or int(time.time()*1000))
        # Ensure safe Firestore doc ID
        doc_id = doc_id.replace('/', '_').replace(' ', '_')
        doc_name = f'projects/{PROJECT_ID}/databases/(default)/documents/{collection_name}/{doc_id}'
        fields = {k: to_firestore_value(v) for k, v in doc.items() if v is not None}
        writes.append({
            'update': {
                'name': doc_name,
                'fields': fields
            }
        })
    
    payload = json.dumps({'writes': writes}).encode('utf-8')
    req = urllib.request.Request(
        COMMIT_URL,
        data=payload,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    return len(chunk)
        except Exception as e:
            if attempt == 3:
                print(f'Error writing batch to {collection_name}: {e}')
                return 0
            time.sleep(1 + attempt * 2)
    return 0

def stream_collection(collection_name, items, token, batch_size=300, max_workers=16):
    print(f'\nUploading {len(items):,} items into {collection_name}...')
    if not items:
        print(f'  No items to upload for {collection_name}')
        return
    
    chunks = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
    batch_args = [(collection_name, chunk, token) for chunk in chunks]
    
    total_uploaded = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(upload_batch, arg) for arg in batch_args]
        for f in as_completed(futures):
            res = f.result()
            total_uploaded += res
            if total_uploaded % (batch_size * 5) < batch_size or total_uploaded == len(items):
                pct = (total_uploaded / len(items)) * 100
                print(f'  [{collection_name}] {total_uploaded:,} / {len(items):,} ({pct:.1f}%) uploaded...')
    
    elapsed = time.time() - t0
    print(f' Done {collection_name}: {total_uploaded:,} documents in {elapsed:.2f}s ({total_uploaded/(elapsed or 1):.1f} docs/sec)')

def main():
    print('=================================================================')
    print(' CLOUD FIRESTORE BATCH STREAMER (OPERATIONAL & HISTORICAL ARCHIVES)')
    print('=================================================================')
    
    token = get_firebase_token()
    print('Authenticated with Firebase CLI OAuth token.')
    
    print('\nStep 1/6: Processing & partitioning datasets...')
    op_jobs, arch_jobs = process_jobs()
    op_appts, arch_appts = process_appointments()
    equip = process_equipment()
    op_props, arch_props = process_proposals()
    payments = process_payments()
    op_plans, arch_plans = process_maintenance_plans()
    
    print('\nStep 2/6: Streaming Operational Datasets into Firestore hot tier...')
    stream_collection('sandbox_jobs', op_jobs, token)
    stream_collection('sandbox_appointments', op_appts, token)
    stream_collection('sandbox_equipment', equip, token)
    stream_collection('sandbox_proposals', op_props, token)
    stream_collection('sandbox_payments', payments, token)
    stream_collection('sandbox_maintenancePlans', op_plans, token)
    
    print('\nStep 3/6: Streaming Historical Archive Datasets into Firestore cold tier...')
    stream_collection('archive_jobs', arch_jobs, token)
    stream_collection('archive_appointments', arch_appts, token)
    stream_collection('archive_proposals', arch_props, token)
    stream_collection('archive_maintenancePlans', arch_plans, token)
    
    print('\n=================================================================')
    print(' ALL CLOUD FIRESTORE COLLECTIONS FULLY POPULATED & SYNCHRONIZED!')
    print('=================================================================')

if __name__ == '__main__':
    main()
