"""
Parallel Batch Importer to Firestore via REST API using Firebase CLI OAuth Token.
Uploads 16,463 historical customer records into 'sandbox_customers' (or 'customers').
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

def get_firebase_access_token():
    config_paths = [
        os.path.expanduser('~/.config/configstore/firebase-tools.json'),
        os.path.join(os.environ.get('APPDATA', ''), 'configstore', 'firebase-tools.json'),
        os.path.join(os.environ.get('LOCALAPPDATA', ''), 'configstore', 'firebase-tools.json'),
    ]
    
    for p in config_paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
                tokens = data.get('tokens', {})
                access_token = tokens.get('access_token')
                if access_token:
                    return access_token
    raise RuntimeError("Firebase CLI token not found. Please run 'firebase login'.")

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

def upload_batch(batch_tuple):
    batch_idx, chunk, project_id, target_collection, access_token = batch_tuple
    commit_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:commit"
    
    writes = []
    for cust in chunk:
        doc_id = cust.get('id') or cust.get('customerNumber') or f"cust-{int(time.time()*1000)}"
        doc_name = f"projects/{project_id}/databases/(default)/documents/{target_collection}/{doc_id}"
        
        fields = {}
        for k, v in cust.items():
            if v is not None:
                fields[k] = to_firestore_value(v)
                
        writes.append({
            'update': {
                'name': doc_name,
                'fields': fields
            }
        })
        
    payload = json.dumps({'writes': writes}).encode('utf-8')
    req = urllib.request.Request(
        commit_url,
        data=payload,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    
    retries = 3
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status == 200:
                    res_data = json.loads(resp.read().decode('utf-8'))
                    return (batch_idx, len(chunk), len(res_data.get('writeResults', [])))
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8')
            if attempt == retries - 1:
                raise RuntimeError(f"Batch {batch_idx} failed with HTTP {e.code}: {err_msg}")
            time.sleep(2 * (attempt + 1))
        except Exception as e:
            if attempt == retries - 1:
                raise RuntimeError(f"Batch {batch_idx} failed: {e}")
            time.sleep(2 * (attempt + 1))

def main():
    target_mode = 'sandbox'
    if '--mode=live' in sys.argv:
        target_mode = 'live'
        
    json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../mock/wex_customers.json'))
    if not os.path.exists(json_path):
        print(f"Error: JSON file not found at {json_path}")
        sys.exit(1)
        
    print("================================================================")
    print(f"?? Uploading Historical WEX Customers to Firestore")
    print(f"?? Target Mode: {target_mode.upper()} ('sandbox_customers' if sandbox else 'customers')")
    print(f"?? Source: {json_path}")
    print("================================================================\n")
    
    with open(json_path, 'r', encoding='utf-8') as f:
        customers = json.load(f)
        
    total_customers = len(customers)
    print(f"? Loaded {total_customers:,} canonical customer records.")
    
    access_token = get_firebase_access_token()
    print("? Successfully authenticated with Firebase CLI OAuth token.")
    
    project_id = 'murphys-fsm-staging'
    target_collection = 'sandbox_customers' if target_mode == 'sandbox' else 'customers'
    
    CHUNK_SIZE = 400
    chunks = [customers[i:i + CHUNK_SIZE] for i in range(0, total_customers, CHUNK_SIZE)]
    total_batches = len(chunks)
    print(f"? Prepared {total_batches} batches ({CHUNK_SIZE} writes per batch).")
    print(f"\n? Committing batches to Firestore collection '{target_collection}'...")
    
    batch_tuples = [
        (idx + 1, chunk, project_id, target_collection, access_token)
        for idx, chunk in enumerate(chunks)
    ]
    
    start_time = time.time()
    completed_count = 0
    total_written = 0
    
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(upload_batch, bt): bt[0] for bt in batch_tuples}
        for future in as_completed(futures):
            b_idx = futures[future]
            try:
                b_idx, chunk_len, write_len = future.result()
                completed_count += 1
                total_written += write_len
                pct = (completed_count / total_batches) * 100
                print(f"  ? [{completed_count:2d}/{total_batches}] Batch {b_idx:2d} committed ({chunk_len:3d} docs) - {pct:.1f}%")
            except Exception as e:
                print(f"  ? Batch {b_idx} failed: {e}")
                raise e

    elapsed = time.time() - start_time
    print(f"\n?? Successfully uploaded {total_written:,} customer records into Firestore '{target_collection}' in {elapsed:.2f} seconds!")

if __name__ == '__main__':
    main()
