import os
import sys
import csv
import json
import time
import urllib.request
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
    equip_file = r"e:\Murphys\data\wex_exports\equipment\WEX Equipment-Warranty.csv"
    print(f"Reading Equipment CSV: {equip_file}")
    
    records = []
    with open(equip_file, "r", encoding="utf-16", errors="replace") as f:
        reader = csv.reader(f, delimiter="\t")
        _ = next(reader)
        headers = [h.strip() for h in next(reader)]
        for r in reader:
            if any(r):
                row_dict = {h: v.strip() for h, v in zip(headers, r) if h}
                records.append(row_dict)
                
    print(f"Parsed {len(records)} raw equipment rows.")
    
    canonical_equipment = []
    for idx, r in enumerate(records):
        equip_id = r.get("Equipment ID") or f"EQ-{idx+1:05d}"
        doc_id = f"eq-{equip_id}"
        cust_id = r.get("business_customer_id") or ""
        c_name = r.get("Customer Name") or ""
        eq_name = r.get("Equipment Name") or r.get("System Name") or "HVAC Equipment"
        
        item = {
            "id": doc_id,
            "equipmentId": equip_id,
            "customerId": f"cust-{cust_id}" if cust_id else "",
            "businessCustomerId": cust_id,
            "customerName": c_name,
            "customerStatus": r.get("Customer Status") or "Active",
            "phone": r.get("Phone") or "",
            "customerType": r.get("Customer Type") or "Residential",
            "locationAddress": r.get("Equipment Location") or "",
            "systemName": r.get("System Name") or "",
            "equipmentName": eq_name,
            "name": eq_name,
            "equipmentDescription": r.get("Equipment Description") or "",
            "equipmentStatus": r.get("Equipment Status") or "Active",
            "status": (r.get("Equipment Status") or "Active").lower(),
            "systemAge": r.get("System Age") or "",
            "installationDate": r.get("Installation Date") or "",
            "modelNumber": r.get("Model Number") or "",
            "serialNumber": r.get("Serial Number") or "",
            "manufacturer": r.get("Manufacturer") or "",
            "manufacturerWarrantyName": r.get("Manufacturer Warranty Name") or "",
            "manufacturerWarrantyStatus": r.get("Manufacturer Warranty Status") or "",
            "manufacturerWarrantyEffectiveDate": r.get("Manufacturer Warranty Effective Date") or "",
            "manufacturerWarrantyDescription": r.get("Manufacturer Warranty Desription") or "",
            "manufacturerWarrantyEffectiveEnd": r.get("Manufacturer Warranty Effective End") or "",
            "otherWarrantyName": r.get("Other Warranty Name") or "",
            "otherWarrantyEffectiveDate": r.get("Other Warranty Effective") or "",
            "otherWarrantyEndDate": r.get("Other Warranty End") or "",
            "otherWarrantyDescription": r.get("Other Warranty Description") or "",
            "createdAt": "2026-08-26T00:00:00Z"
        }
        canonical_equipment.append(item)
        
    print(f"Generated {len(canonical_equipment)} canonical equipment records.")
    
    # Write canonical mock JSON cache to domain and web directories
    mock_out_domain = r"e:\Murphys\packages\domain\src\mock\equipment.json"
    mock_out_web = r"e:\Murphys\apps\web\src\domain\mock\equipment.json"
    with open(mock_out_domain, "w", encoding="utf-8") as f:
        json.dump(canonical_equipment, f, indent=2)
    with open(mock_out_web, "w", encoding="utf-8") as f:
        json.dump(canonical_equipment, f, indent=2)
    print(f"Saved mock cache ({len(canonical_equipment)} equipment items) to domain & web directories.")
    
    # Upload to Firestore 'sandbox_equipment'
    try:
        access_token = get_firebase_access_token()
        project_id = "murphys-fsm-staging"
        target_collection = "sandbox_equipment"
        
        CHUNK_SIZE = 100
        chunks = [canonical_equipment[i:i + CHUNK_SIZE] for i in range(0, len(canonical_equipment), CHUNK_SIZE)]
        total_batches = len(chunks)
        print(f"\nCommitting {total_batches} batches ({len(canonical_equipment)} docs) to Firestore '{target_collection}'...")
        
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
                    print(f"  [OK] Batch {b_idx}/{total_batches} committed ({total_written}/{len(canonical_equipment)} docs)...")

        elapsed = time.time() - start_time
        print(f"\nSuccessfully committed {total_written} Equipment items to Firestore '{target_collection}' in {elapsed:.2f} seconds!")
    except Exception as e:
        print(f"Note: Firestore upload skipped or requires login: {e}")

if __name__ == "__main__":
    main()
