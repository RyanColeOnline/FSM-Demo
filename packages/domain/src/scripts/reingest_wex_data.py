import os
import sys
import csv
import json
import time
import zipfile
import re
import html
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ID = "murphys-fsm-staging"
COMMIT_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit"

def get_firebase_token():
    config_paths = [
        os.path.expanduser("~/.config/configstore/firebase-tools.json"),
        os.path.join(os.environ.get("APPDATA", ""), "configstore", "firebase-tools.json"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "configstore", "firebase-tools.json"),
        os.path.join(os.environ.get("USERPROFILE", ""), ".config", "configstore", "firebase-tools.json")
    ]
    for p in config_paths:
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                d = json.load(f)
                return d["tokens"]["access_token"]
    raise RuntimeError("No Firebase CLI token found. Run 'firebase login'.")

def clean_wex_note(text):
    if not text:
        return ""
    s = html.unescape(text)
    # Remove mojibake sequences from Windows-1252 / UTF-8 decoding
    s = s.replace(chr(194) + chr(160), " ")
    s = s.replace(chr(194), " ")
    s = s.replace(chr(160), " ")
    s = s.replace(chr(226) + chr(8364) + chr(8482), "'")
    s = s.replace("â€™", "'").replace("â€˜", "'")
    s = s.replace("â€œ", '"').replace("â€", '"')
    s = s.replace("â€“", "-").replace("—", "-")
    s = s.replace("\u20ac", "").replace("\u2122", "")
    s = s.replace("\ufffd", " ")
    # HTML cleanup
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.IGNORECASE)
    s = re.sub(r"<[^>]+>", " ", s)
    # Typography cleanup
    s = s.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2013", "-").replace("\u2014", "-")
    # Normalize spaces
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in s.splitlines()]
    return "\n".join(line for line in lines if line)

def parse_iso_date(date_str):
    if not date_str:
        return ""
    clean = date_str.replace("\r", " ").replace("\n", " ").strip()
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", clean)
    if m:
        mo, da, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{yr:04d}-{mo:02d}-{da:02d}"
    return ""

def parse_iso_datetime(date_str):
    if not date_str:
        return ""
    clean = date_str.replace("\r", " ").replace("\n", " ").strip()
    # Try formats like 9/3/2026 9:10:17 AM
    formats = [
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%Y-%m-%d"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(clean, fmt)
            return dt.strftime("%Y-%m-%dT%H:%M:%S")
        except ValueError:
            pass
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", clean)
    if m:
        mo, da, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return f"{yr:04d}-{mo:02d}-{da:02d}T00:00:00"
    return ""

def col2num(col_str):
    num = 0
    for c in col_str:
        num = num * 26 + (ord(c.upper()) - ord("A")) + 1
    return num

def parse_num(val, default=0):
    if not val:
        return default
    clean = re.sub(r"[^\d.]", "", str(val))
    try:
        if "." in clean:
            return float(clean)
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

def upload_batch(args):
    collection_name, chunk, token = args
    writes = []
    for doc in chunk:
        doc_id = str(doc.get("id"))
        clean_id = doc_id.replace("/", "_").replace(" ", "_")
        doc_name = f"projects/{PROJECT_ID}/databases/(default)/documents/{collection_name}/{clean_id}"
        fields = {k: to_firestore_value(v) for k, v in doc.items() if v is not None and v != ""}
        writes.append({
            "update": {
                "name": doc_name,
                "fields": fields
            }
        })
    payload = json.dumps({"writes": writes}).encode("utf-8")
    req = urllib.request.Request(
        COMMIT_URL,
        data=payload,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST"
    )
    retries = 4
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                if resp.status == 200:
                    return len(chunk)
        except Exception as e:
            if attempt == retries - 1:
                raise RuntimeError(f"Failed committing batch to {collection_name}: {e}")
            time.sleep(1 + attempt * 2)
    return 0

def commit_collection_data(collection_name, items, token, chunk_size=100):
    chunks = [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]
    total_batches = len(chunks)
    print(f"Uploading {len(items)} records to `{collection_name}` across {total_batches} batches...")
    
    batch_args = [(collection_name, chunk, token) for chunk in chunks]
    total_written = 0
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(upload_batch, arg): arg for arg in batch_args}
        for future in as_completed(futures):
            written = future.result()
            total_written += written
            
    elapsed = time.time() - start_time
    print(f" -> Successfully committed {total_written}/{len(items)} docs to `{collection_name}` in {elapsed:.2f}s.")
    return total_written

def main():
    print("==================================================================")
    print(" RE-INGESTING WEX APPOINTMENTS & JOBS (WITH FULL FIELD MAPPINGS)")
    print("==================================================================")
    
    now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    token = get_firebase_token()
    
    # 1. Parse Jobs first to build lookup index
    job_path = r"data\wex_exports\jobs\WEX Job Summaries\2020-current\job-summary (37).xlsx"
    if not os.path.exists(job_path):
        raise FileNotFoundError(f"Missing jobs file: {job_path}")
        
    raw_jobs = []
    with zipfile.ZipFile(job_path, "r") as z:
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
                col_idx = col2num(m.group(1))
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
                raw_jobs.append(row_dict)
                
    unique_jobs_map = {}
    for r in raw_jobs:
        j_num = r.get("Job #")
        if j_num:
            unique_jobs_map[str(j_num).strip()] = r
            
    canonical_jobs = []
    for j_num, r in unique_jobs_map.items():
        doc_id = f"job-{j_num}"
        c_num = str(r.get("Customer Number") or "").strip()
        c_name = r.get("Customer Name") or ""
        j_stat = r.get("Job Status") or "Opened"
        
        if j_stat.lower() in ["open", "opened", "in progress"]:
            status_val = "Opened"
        elif j_stat.lower() in ["abandon", "abandoned", "cancelled"]:
            status_val = "Abandoned"
        else:
            status_val = "Closed"
            
        inv_tot = parse_num(r.get("Invoices Total"), 0.0)
        prop_tot = parse_num(r.get("Signed Proposals Total"), 0.0)
        is_flagged = (r.get("Follow-up Flag?") or "").upper() == "Y"
        
        raw_created = r.get("Job Creation Date") or ""
        iso_created = parse_iso_datetime(raw_created) or f"{parse_iso_date(raw_created)}T00:00:00"
        
        job_doc = {
            "id": doc_id,
            "jobNumber": str(j_num),
            "customerId": f"cust-{c_num}" if c_num else "",
            "customerNumber": str(c_num),
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
            "followUpFlag": r.get("Follow-up Flag?") or ("Y" if is_flagged else "N"),
            "isFlagged": is_flagged,
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
            "jobCreationDate": raw_created,
            "createdAt": iso_created,
            "isHistoricalArchive": False,
            "updatedAt": now_iso
        }
        canonical_jobs.append(job_doc)
        
    print(f"Processed {len(canonical_jobs)} unique jobs (ISO createdAt: {canonical_jobs[0]['createdAt']}).")

    # 2. Parse Appointments
    appt_path = r"data\wex_exports\appointments and service requests\Appointments (6).csv"
    if not os.path.exists(appt_path):
        raise FileNotFoundError(f"Missing appointments file: {appt_path}")
        
    raw_appts = []
    with open(appt_path, "r", encoding="utf-16", errors="replace") as f:
        reader = csv.reader(f, delimiter="\t")
        headers = [h.strip() for h in next(reader)]
        for r in reader:
            if any(r):
                row_dict = {h: v.strip() for h, v in zip(headers, r) if h}
                raw_appts.append(row_dict)
                
    unique_appts_map = {}
    for r in raw_appts:
        aid = r.get("Appointment ID")
        if aid:
            unique_appts_map[str(aid).strip()] = r
            
    canonical_appts = []
    sanitized_notes_count = 0
    for aid, r in unique_appts_map.items():
        doc_id = f"appt-{aid}"
        job_num = str(r.get("Job #") or "").strip()
        raw_note = r.get("Appointment Note ") or r.get("Appointment Note") or ""
        clean_note = clean_wex_note(raw_note)
        if clean_note != raw_note:
            sanitized_notes_count += 1
            
        is_confirmed = (r.get("Confirmed?") or "").lower() == "yes"
        raw_dt = r.get("Appointment Date/Time") or r.get("Created Date") or ""
        
        # Parse appointmentDate (YYYY-MM-DD), startTime, endTime
        iso_appt_date = parse_iso_date(raw_dt)
        clean_dt = raw_dt.replace("\r", " ").replace("\n", " ").strip()
        m_time = re.search(r"(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)", clean_dt, re.I)
        start_time = m_time.group(1).strip() if m_time else ""
        end_time = m_time.group(2).strip() if m_time else ""
        
        # Match customer details from job
        matched_job = unique_jobs_map.get(job_num)
        cust_num = matched_job.get("Customer Number") if matched_job else ""
        cust_id = f"cust-{cust_num}" if cust_num else (f"cust-{job_num}" if job_num else "")
        
        tech_str = r.get("Appointment Tech") or ""
        tech_list = [t.strip() for t in tech_str.split(",") if t.strip()]
        
        loc_address = r.get("Location") or ""
        loc_street = loc_address.split("\n")[0].strip() if "\n" in loc_address else loc_address
        
        appt_doc = {
            "id": doc_id,
            "appointmentId": aid,
            "jobNumber": job_num,
            "jobId": f"job-{job_num}" if job_num else "",
            "wexJobId": r.get("job_id") or "",
            "type": r.get("Type") or "Appointment",
            "createdDate": r.get("Created Date") or "",
            "dateTime": raw_dt,
            "appointmentDateTime": raw_dt,
            "appointmentDate": iso_appt_date,
            "startTime": start_time,
            "endTime": end_time,
            "tags": r.get("Tags") or "",
            "status": r.get("Appt Status") or "Scheduled",
            "customerName": r.get("Customer Name") or "",
            "customerId": cust_id,
            "customerNumber": cust_num or "",
            "locationAddress": loc_address,
            "location": loc_address,
            "locationStreet": loc_street,
            "coverageZone": r.get("Coverage Zone") or "",
            "serviceNotes": clean_note,
            "appointmentNote": clean_note,
            "jobType": r.get("Job Type") or "HVAC service",
            "jobName": r.get("Job Name") or "",
            "isConfirmed": is_confirmed,
            "technician": tech_str,
            "assignedTech": tech_str,
            "technicians": tech_list,
            "hoursScheduled": r.get("Hours Scheduled") or "",
            "hoursWorked": r.get("Hours Worked (All Techs)") or "",
            "isHistoricalArchive": False,
            "createdAt": parse_iso_datetime(r.get("Created Date")) or f"{iso_appt_date}T00:00:00",
            "updatedAt": now_iso
        }
        canonical_appts.append(appt_doc)
        
    print(f"Processed {len(canonical_appts)} unique appointments (Sanitized notes: {sanitized_notes_count}, sample appointmentDate: {canonical_appts[0]['appointmentDate']}).")

    # 3. Commit to Target Collections
    print("\n--- COMMITTING TO FIRESTORE (LIVE & SANDBOX) ---")
    
    commit_collection_data("jobs", canonical_jobs, token, chunk_size=100)
    commit_collection_data("appointments", canonical_appts, token, chunk_size=100)
    commit_collection_data("sandbox_jobs", canonical_jobs, token, chunk_size=100)
    commit_collection_data("sandbox_appointments", canonical_appts, token, chunk_size=100)
    
    print("\n==================================================================")
    print(" RE-INGESTION WITH FULL FIELD MAPPING COMPLETED!")
    print(f" Total Jobs Committed: {len(canonical_jobs)} -> `jobs` & `sandbox_jobs`")
    print(f" Total Appointments Committed: {len(canonical_appts)} -> `appointments` & `sandbox_appointments`")
    print("==================================================================")

if __name__ == "__main__":
    main()
