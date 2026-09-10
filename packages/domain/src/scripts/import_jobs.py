import os
import sys
import json
import time
import urllib.request
import glob
import zipfile
import xml.etree.ElementTree as ET
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

def col2num(col_str):
    num = 0
    for c in col_str:
        num = num * 26 + (ord(c.upper()) - ord("A")) + 1
    return num

def parse_num(val, default=0):
    if not val: return default
    clean = re.sub(r"[^\d.]", "", str(val))
    try:
        if "." in clean: return float(clean)
        return int(clean)
    except ValueError:
        return default

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
    job_files = sorted(glob.glob(r"e:\Murphys\data\wex_exports\jobs\WEX Job Summaries\*\*.xlsx"))
    print(f"Reading {len(job_files)} Job Summary Excel files...")
    
    all_jobs = {}
    for jf_idx, jf in enumerate(job_files):
        with zipfile.ZipFile(jf, "r") as z:
            shared_strings = []
            if "xl/sharedStrings.xml" in z.namelist():
                tree = ET.fromstring(z.read("xl/sharedStrings.xml"))
                for si in tree.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                    t = si.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                    if t is not None and t.text:
                        shared_strings.append(t.text)
                    else:
                        texts = [elem.text for elem in si.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t") if elem.text]
                        shared_strings.append("".join(texts))
                        
            sheet_tree = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            rows = sheet_tree.findall(".//ns:row", ns)
            
            headers = {}
            for r_idx, r in enumerate(rows):
                cells = r.findall("ns:c", ns)
                row_dict = {}
                for c in cells:
                    ref = c.get("r")
                    m = re.match(r"([A-Z]+)(\d+)", ref)
                    col_letter = m.group(1)
                    col_idx = col2num(col_letter)
                    t = c.get("t")
                    v = c.find("ns:v", ns)
                    val = ""
                    if v is not None and v.text is not None:
                        if t == "s":
                            s_idx = int(v.text)
                            val = shared_strings[s_idx] if s_idx < len(shared_strings) else v.text
                        else:
                            val = v.text
                    if r_idx == 0:
                        headers[col_idx] = val.strip() if val else f"Col_{col_idx}"
                    else:
                        header_name = headers.get(col_idx, f"Col_{col_idx}")
                        row_dict[header_name] = val
                
                if r_idx > 0 and any(row_dict.values()):
                    j_num = row_dict.get("Job #")
                    if j_num and j_num not in all_jobs:
                        all_jobs[j_num] = row_dict

    print(f"Extracted {len(all_jobs)} unique historical jobs across all files.")
    
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

    canonical_jobs = []
    archive_jobs = []
    
    for j_num, r in all_jobs.items():
        doc_id = f"job-{j_num}"
        c_num = r.get("Customer Number") or ""
        c_name = r.get("Customer Name") or ""
        j_stat = r.get("Job Status") or "Closed"
        
        # Standardize Status: Opened, Closed, Abandoned
        if j_stat.lower() in ["open", "opened", "in progress"]:
            status_val = "Opened"
        elif j_stat.lower() in ["abandon", "abandoned", "cancelled"]:
            status_val = "Abandoned"
        else:
            status_val = "Closed"
            
        inv_tot = parse_num(r.get("Invoices Total"), 0.0)
        prop_tot = parse_num(r.get("Signed Proposals Total"), 0.0)
        created_str = r.get("Job Creation Date") or ""
        dt = parse_date(created_str)
        
        item = {
            "id": doc_id,
            "jobNumber": j_num,
            "customerId": f"cust-{c_num}" if c_num else "",
            "customerNumber": c_num,
            "customerName": c_name,
            "customerCreatedDate": r.get("Customer Created Date") or "",
            "email": r.get("Email") or "",
            "homePhone": r.get("Home Phone") or "",
            "mobilePhone": r.get("Mobile Phone") or "",
            "phone": r.get("Mobile Phone") or r.get("Home Phone") or "",
            "locationAddress": r.get("Location Address") or "",
            "locationCity": r.get("Location City") or "",
            "locationState": r.get("Location State") or "",
            "locationZip": r.get("Location Zip") or "",
            "address": {
                "street": r.get("Location Address") or "",
                "city": r.get("Location City") or "",
                "state": r.get("Location State") or "",
                "zip": r.get("Location Zip") or ""
            },
            "jobType": r.get("Job Type") or "HVAC service",
            "jobName": r.get("Job Type") or "",
            "status": status_val,
            "followUpFlag": r.get("Follow-up Flag?") or "N",
            "isFlagged": (r.get("Follow-up Flag?") or "").upper() == "Y",
            "followUpDate": r.get("Follow-up Date") or "",
            "checklists": r.get("Checklists") or "",
            "leadSource": r.get("Lead Source") or "",
            "apptsScheduledCount": parse_num(r.get("# of Appts Scheduled"), 0),
            "apptsCompletedCount": parse_num(r.get("# of Appts Complete"), 0),
            "signedProposalsCount": parse_num(r.get("Signed Proposals #"), 0),
            "signedProposalsTotal": prop_tot,
            "invoicesCount": parse_num(r.get("Invoices #"), 0),
            "invoicesTotal": inv_tot,
            "jobPrice": f"${inv_tot:,.2f}" if inv_tot > 0 else "$0.00",
            "jobCreationDate": created_str,
            "isHistoricalArchive": bool(dt and dt < cutoff),
            "createdAt": "2026-08-26T00:00:00Z"
        }
        
        if dt and dt < cutoff:
            archive_jobs.append(item)
        else:
            canonical_jobs.append(item)
        
    print(f"Partitioned {len(all_jobs)} total jobs:")
    print(f"  -> Operational Jobs (>= 2025-01-10): {len(canonical_jobs)}")
    print(f"  -> Historical Archive Jobs (< 2025-01-10): {len(archive_jobs)}")
    
    # Save operational mock cache in both domain and web mock locations
    mock_out_domain = r"e:\Murphys\packages\domain\src\mock\jobs_sample.json"
    mock_out_web = r"e:\Murphys\apps\web\src\domain\mock\jobs_sample.json"
    recent_sample = sorted(canonical_jobs, key=lambda x: x.get("jobCreationDate", ""), reverse=True)
    with open(mock_out_domain, "w", encoding="utf-8") as f:
        json.dump(recent_sample, f, indent=2)
    with open(mock_out_web, "w", encoding="utf-8") as f:
        json.dump(recent_sample, f, indent=2)
    print(f"Saved {len(recent_sample)} operational jobs to {mock_out_domain} & web mock directory.")
    
    # Upload to Firestore 'sandbox_jobs' (Operational) and 'archive_jobs' (Historical)
    try:
        access_token = get_firebase_access_token()
        project_id = "murphys-fsm-staging"
        target_collection = "sandbox_jobs"
        
        CHUNK_SIZE = 250
        chunks = [canonical_jobs[i:i + CHUNK_SIZE] for i in range(0, len(canonical_jobs), CHUNK_SIZE)]
        total_batches = len(chunks)
        print(f"\nCommitting {total_batches} batches ({len(canonical_jobs)} docs) to Firestore '{target_collection}'...")
        
        batch_tuples = [
            (idx + 1, chunk, project_id, target_collection, access_token)
            for idx, chunk in enumerate(chunks)
        ]
        
        start_time = time.time()
        total_written = 0
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(upload_batch, bt): bt[0] for bt in batch_tuples}
            for future in as_completed(futures):
                b_idx = futures[future]
                b_idx, chunk_len, write_len = future.result()
                total_written += write_len
                if b_idx % 25 == 0 or b_idx == total_batches:
                    print(f"  [OK] Batch {b_idx}/{total_batches} committed ({total_written}/{len(canonical_jobs)} docs)...")

        elapsed = time.time() - start_time
        print(f"\nSuccessfully committed {total_written} Operational Jobs to Firestore '{target_collection}' in {elapsed:.2f} seconds!")
    except Exception as e:
        print(f"Note: Firestore upload skipped or requires login: {e}")

if __name__ == "__main__":
    main()

