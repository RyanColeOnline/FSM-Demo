import os
import sys
import csv
import json
import time
import urllib.request
import glob
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
    appt_files = sorted(glob.glob(r"e:\Murphys\data\wex_exports\appointments and service requests\Appointments*.csv"))
    print(f"Found {len(appt_files)} Appointment CSV files.")
    
    unique_appts = {}
    for f in appt_files:
        with open(f, "r", encoding="utf-16", errors="replace") as csvf:
            reader = csv.reader(csvf, delimiter="\t")
            headers = [h.strip() for h in next(reader)]
            for r in reader:
                if any(r):
                    row_dict = {h: v.strip() for h, v in zip(headers, r) if h}
                    appt_id = row_dict.get("Appointment ID")
                    if appt_id and appt_id not in unique_appts:
                        unique_appts[appt_id] = row_dict
                        
    print(f"Deduplicated to {len(unique_appts)} unique appointments.")
    
    cutoff = datetime(2025, 1, 10)
    def parse_date(date_str):
        if not date_str: return None
        date_str = str(date_str).strip()
        formats = [
            "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %I:%M %p", "%m/%d/%Y", "%Y-%m-%d"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                pass
        m = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", date_str)
        if m:
            m_val, d_val, y_val = int(m.group(1)), int(m.group(2)), int(m.group(3))
            if y_val < 100: y_val += 2000 if y_val < 50 else 1900
            try:
                return datetime(y_val, m_val, d_val)
            except ValueError:
                pass
        return None

    canonical_appts = []
    archive_appts = []
    
    for appt_id, r in unique_appts.items():
        doc_id = f"appt-{appt_id}"
        job_num = r.get("Job #") or ""
        created_str = r.get("Created Date") or r.get("Appointment Date/Time") or ""
        dt = parse_date(created_str)
        
        item = {
            "id": doc_id,
            "appointmentId": appt_id,
            "jobNumber": job_num,
            "jobId": f"job-{job_num}" if job_num else "",
            "wexJobId": r.get("job_id") or "",
            "type": r.get("Type") or "Appointment",
            "createdDate": r.get("Created Date") or "",
            "dateTime": r.get("Appointment Date/Time") or "",
            "tags": r.get("Tags") or "",
            "status": r.get("Appt Status") or "Complete",
            "customerName": r.get("Customer Name") or "",
            "locationAddress": r.get("Location") or "",
            "coverageZone": r.get("Coverage Zone") or "",
            "serviceNotes": r.get("Appointment Note ") or r.get("Appointment Note") or "",
            "appointmentNote": r.get("Appointment Note ") or r.get("Appointment Note") or "",
            "jobType": r.get("Job Type") or "HVAC service",
            "jobName": r.get("Job Name") or "",
            "isConfirmed": (r.get("Confirmed?") or "").lower() == "yes",
            "technician": r.get("Appointment Tech") or "",
            "assignedTech": r.get("Appointment Tech") or "",
            "hoursScheduled": r.get("Hours Scheduled") or "",
            "hoursWorked": r.get("Hours Worked (All Techs)") or "",
            "isHistoricalArchive": bool(dt and dt < cutoff),
            "createdAt": "2026-08-26T00:00:00Z"
        }
        
        if dt and dt < cutoff:
            archive_appts.append(item)
        else:
            canonical_appts.append(item)
        
    print(f"Partitioned {len(unique_appts)} total appointments:")
    print(f"  -> Operational Appointments (>= 2025-01-10): {len(canonical_appts)}")
    print(f"  -> Historical Archive Appointments (< 2025-01-10): {len(archive_appts)}")
    
    # Save mock cache in domain & web mock directories
    mock_out_domain = r"e:\Murphys\packages\domain\src\mock\appointments.json"
    mock_out_web = r"e:\Murphys\apps\web\src\domain\mock\appointments.json"
    with open(mock_out_domain, "w", encoding="utf-8") as f:
        json.dump(canonical_appts, f, indent=2)
    with open(mock_out_web, "w", encoding="utf-8") as f:
        json.dump(canonical_appts, f, indent=2)
    print(f"Saved mock cache ({len(canonical_appts)} docs) to domain & web directories.")
    
    # Upload to Firestore 'sandbox_appointments'
    try:
        access_token = get_firebase_access_token()
        project_id = "murphys-fsm-staging"
        target_collection = "sandbox_appointments"
        
        CHUNK_SIZE = 100
        chunks = [canonical_appts[i:i + CHUNK_SIZE] for i in range(0, len(canonical_appts), CHUNK_SIZE)]
        total_batches = len(chunks)
        print(f"\nCommitting {total_batches} batches ({len(canonical_appts)} docs) to Firestore '{target_collection}'...")
        
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
                if b_idx % 20 == 0 or b_idx == total_batches:
                    print(f"  [OK] Batch {b_idx}/{total_batches} committed ({total_written}/{len(canonical_appts)} docs)...")

        elapsed = time.time() - start_time
        print(f"\nSuccessfully committed {total_written} Appointments to Firestore '{target_collection}' in {elapsed:.2f} seconds!")
    except Exception as e:
        print(f"Note: Firestore upload skipped or requires login: {e}")

if __name__ == "__main__":
    main()
