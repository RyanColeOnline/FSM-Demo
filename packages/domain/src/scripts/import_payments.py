import os
import sys
import csv
import json
import time
import urllib.request
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def get_firebase_access_token():
    config_paths = [
        os.path.expanduser("~/.config/configstore/firebase-tools.json"),
        os.path.join(os.environ.get("APPDATA", ""), "configstore", "firebase-tools.json"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "configstore", "firebase-tools.json"),
    ]
    for p in config_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                tokens = data.get("tokens", {})
                access_token = tokens.get("access_token")
                if access_token:
                    return access_token
    raise RuntimeError("Firebase CLI token not found. Please run 'firebase login'.")

def parse_price(val):
    if not val: return 0.0
    clean = re.sub(r"[^\d.]", "", str(val))
    try:
        return float(clean)
    except ValueError:
        return 0.0

def to_firestore_value(val):
    if val is None:
        return {"nullValue": None}
    elif isinstance(val, bool):
        return {"booleanValue": val}
    elif isinstance(val, int):
        return {"integerValue": str(val)}
    elif isinstance(val, float):
        return {"doubleValue": val}
    elif isinstance(val, str):
        return {"stringValue": val}
    elif isinstance(val, list):
        return {"arrayValue": {"values": [to_firestore_value(item) for item in val if item is not None]}}
    elif isinstance(val, dict):
        fields = {}
        for k, v in val.items():
            if v is not None:
                fields[k] = to_firestore_value(v)
        return {"mapValue": {"fields": fields}}
    else:
        return {"stringValue": str(val)}

def upload_batch(batch_tuple):
    batch_idx, chunk, project_id, target_collection, access_token = batch_tuple
    commit_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents:commit"
    
    writes = []
    for item in chunk:
        doc_id = item.get("id")
        doc_name = f"projects/{project_id}/databases/(default)/documents/{target_collection}/{doc_id}"
        
        fields = {}
        for k, v in item.items():
            if v is not None and v != "":
                fields[k] = to_firestore_value(v)
                
        writes.append({
            "update": {
                "name": doc_name,
                "fields": fields
            }
        })
        
    payload = json.dumps({"writes": writes}).encode("utf-8")
    req = urllib.request.Request(
        commit_url,
        data=payload,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    retries = 3
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                if resp.status == 200:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    return (batch_idx, len(chunk), len(res_data.get("writeResults", [])))
        except Exception as e:
            if attempt == retries - 1:
                raise RuntimeError(f"Batch {batch_idx} failed: {e}")
            time.sleep(2 * (attempt + 1))

def main():
    tx_file = r"e:\Murphys\data\wex_exports\transactions\Payzer_Transactions_PaymentsReceived_20260812.csv"
    print(f"Reading Transactions CSV: {tx_file}")
    
    records = []
    with open(tx_file, "r", encoding="utf-8-sig", errors="replace") as f:
        reader = csv.reader(f)
        headers = [h.strip() for h in next(reader)]
        for r in reader:
            if any(r):
                records.append({h: v.strip() for h, v in zip(headers, r) if h})
                
    print(f"Parsed {len(records)} raw payment transaction rows.")
    
    canonical_payments = []
    seen_ids = set()
    
    for idx, r in enumerate(records):
        ref_num = r.get("REFERENCE NUMBER") or f"TX-{idx+1:05d}"
        doc_id = f"pay-{ref_num}"
        if doc_id in seen_ids:
            doc_id = f"pay-{ref_num}-{idx+1}"
        seen_ids.add(doc_id)
        
        c_name = r.get("FROM") or r.get("DISPLAY NAME") or ""
        c_num = r.get("CUSTOMER NUMBER") or ""
        inv_num = r.get("INVOICE NUMBER") or ""
        amt = parse_price(r.get("AMOUNT"))
        net_amt = parse_price(r.get("NET AMOUNT")) or amt
        
        item = {
            "id": doc_id,
            "referenceNumber": ref_num,
            "paymentDate": r.get("PAYMENT DATE") or "",
            "dateTime": r.get("PAYMENT DATE") or "",
            "customerNumber": c_num,
            "customerId": f"cust-{c_num}" if c_num else "",
            "customerName": c_name,
            "payerName": c_name,
            "amount": amt,
            "netAmount": net_amt,
            "invoiceNumber": inv_num,
            "paymentNetwork": r.get("PAYMENT NETWORK") or "Credit Card",
            "method": r.get("PAYMENT NETWORK") or "Credit Card",
            "type": r.get("TYPE") or "Processed",
            "status": r.get("STATUS") or "Settled",
            "takenBy": r.get("TAKEN BY") or "Office",
            "memo": r.get("MEMO") or "",
            "last4": r.get("LAST4") or "",
            "businessName": r.get("BUSINESS NAME") or "",
            "settlementBatch": r.get("SETTLEMENT BATCH") or "",
            "batchTotal": parse_price(r.get("BATCH TOTAL")),
            "customerMobilePhone": r.get("CUSTOMER MOBILE PHONE") or "",
            "customerHomePhone": r.get("CUSTOMER HOME PHONE") or "",
            "merchantName": r.get("MERCHANT NAME") or "Murphy's Home Services",
            "payzerId": r.get("PAYZER ID") or "",
            "group": r.get("GROUP") or "Self Service",
            "createdAt": "2026-08-26T00:00:00Z"
        }
        canonical_payments.append(item)
        
    print(f"Generated {len(canonical_payments)} canonical payment records.")
    
    # Save mock cache in domain & web mock directories
    mock_out_domain = r"e:\Murphys\packages\domain\src\mock\payments.json"
    mock_out_web = r"e:\Murphys\apps\web\src\domain\mock\payments.json"
    with open(mock_out_domain, "w", encoding="utf-8") as f:
        json.dump(canonical_payments, f, indent=2)
    with open(mock_out_web, "w", encoding="utf-8") as f:
        json.dump(canonical_payments, f, indent=2)
    print(f"Saved mock cache ({len(canonical_payments)} payment records) to domain & web directories.")
    
    # Upload to Firestore 'sandbox_payments'
    try:
        access_token = get_firebase_access_token()
        project_id = "murphys-fsm-staging"
        target_collection = "sandbox_payments"
        
        CHUNK_SIZE = 100
        chunks = [canonical_payments[i:i + CHUNK_SIZE] for i in range(0, len(canonical_payments), CHUNK_SIZE)]
        total_batches = len(chunks)
        print(f"\nCommitting {total_batches} batches ({len(canonical_payments)} docs) to Firestore '{target_collection}'...")
        
        batch_tuples = [
            (idx + 1, chunk, project_id, target_collection, access_token)
            for idx, chunk in enumerate(chunks)
        ]
        
        start_time = time.time()
        total_written = 0
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {executor.submit(upload_batch, bt): bt[0] for bt in batch_tuples}
            for future in as_completed(futures):
                b_idx = futures[future]
                b_idx, chunk_len, write_len = future.result()
                total_written += write_len
                if b_idx % 10 == 0 or b_idx == total_batches:
                    print(f"  [OK] Batch {b_idx}/{total_batches} committed ({total_written}/{len(canonical_payments)} docs)...")

        elapsed = time.time() - start_time
        print(f"\nSuccessfully committed {total_written} Payments to Firestore '{target_collection}' in {elapsed:.2f} seconds!")
    except Exception as e:
        print(f"Note: Firestore upload skipped or requires login: {e}")

if __name__ == "__main__":
    main()
