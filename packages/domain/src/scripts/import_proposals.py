import os
import sys
import json
import time
import urllib.request
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
    prop_xlsx = r"e:\Murphys\data\wex_exports\proposals\proposals-2018-01-01-2026-08-16.xlsx"
    print(f"Reading Proposals XLSX: {prop_xlsx}")
    
    table_data = []
    with zipfile.ZipFile(prop_xlsx, "r") as z:
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
                table_data.append(row_dict)

    print(f"Parsed {len(table_data)} raw proposal rows.")
    
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

    canonical_proposals = []
    archive_proposals = []
    seen_ids = set()
    
    for idx, r in enumerate(table_data):
        p_num = r.get("Proposal Number") or f"P-{idx+1:05d}"
        clean_num = p_num.replace("#", "").strip()
        doc_id = f"prop-{clean_num.lower()}"
        if doc_id in seen_ids:
            doc_id = f"prop-{clean_num.lower()}-{idx+1}"
        seen_ids.add(doc_id)
        
        c_name = r.get("Name") or ""
        job_num = r.get("Job Number") or ""
        amount = parse_price(r.get("Amount"))
        issued_str = r.get("Issue Date") or ""
        dt = parse_date(issued_str)
        
        item = {
            "id": doc_id,
            "proposalNumber": clean_num,
            "jobNumber": job_num,
            "jobId": f"job-{job_num}" if job_num else "",
            "customerName": c_name,
            "billToCustomer": c_name,
            "locationAddress": r.get("Location") or "",
            "jobLocation": r.get("Location") or "",
            "jobType": r.get("Job Type") or "HVAC service",
            "jobName": r.get("Job Name") or "",
            "technician": r.get("Technician") or "",
            "status": r.get("Status") or "Presented",
            "amount": amount,
            "total": amount,
            "issueDate": issued_str,
            "isHistoricalArchive": bool(dt and dt < cutoff),
            "createdAt": "2026-08-26T00:00:00Z"
        }
        
        if dt and dt < cutoff:
            archive_proposals.append(item)
        else:
            canonical_proposals.append(item)
        
    print(f"Partitioned {len(table_data)} total proposals:")
    print(f"  -> Operational Proposals (>= 2025-01-10): {len(canonical_proposals)}")
    print(f"  -> Historical Archive Proposals (< 2025-01-10): {len(archive_proposals)}")
    
    # Save mock cache in domain and web mock locations
    mock_out_domain = r"e:\Murphys\packages\domain\src\mock\proposals.json"
    mock_out_web = r"e:\Murphys\apps\web\src\domain\mock\proposals.json"
    with open(mock_out_domain, "w", encoding="utf-8") as f:
        json.dump(canonical_proposals, f, indent=2)
    with open(mock_out_web, "w", encoding="utf-8") as f:
        json.dump(canonical_proposals, f, indent=2)
    print(f"Saved mock cache ({len(canonical_proposals)} docs) to domain & web directories.")
    
    # Upload to Firestore 'sandbox_proposals'
    try:
        access_token = get_firebase_access_token()
        project_id = "murphys-fsm-staging"
        target_collection = "sandbox_proposals"
        
        CHUNK_SIZE = 100
        chunks = [canonical_proposals[i:i + CHUNK_SIZE] for i in range(0, len(canonical_proposals), CHUNK_SIZE)]
        total_batches = len(chunks)
        print(f"\nCommitting {total_batches} batches ({len(canonical_proposals)} docs) to Firestore '{target_collection}'...")
        
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
                    print(f"  [OK] Batch {b_idx}/{total_batches} committed ({total_written}/{len(canonical_proposals)} docs)...")

        elapsed = time.time() - start_time
        print(f"\nSuccessfully committed {total_written} Proposals to Firestore '{target_collection}' in {elapsed:.2f} seconds!")
    except Exception as e:
        print(f"Note: Firestore upload skipped or requires login: {e}")

if __name__ == "__main__":
    main()
