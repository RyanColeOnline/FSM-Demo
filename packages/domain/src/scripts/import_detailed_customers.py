import os
import sys
import csv
import json
import re
import time
import urllib.request
import urllib.parse
from collections import defaultdict
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

def clean_str(val):
    if val is None:
        return ""
    return str(val).strip()

def clean_float(val):
    if not val:
        return 0.0
    s = re.sub(r"[^\d.-]", "", str(val))
    try:
        return float(s)
    except ValueError:
        return 0.0

def format_10_digits(val):
    if not val:
        return None
    d = re.sub(r"\D", "", str(val))
    if len(d) == 10:
        return f"({d[:3]}) {d[3:6]}-{d[6:]}"
    elif len(d) == 11 and d.startswith("1"):
        return f"({d[1:4]}) {d[4:7]}-{d[7:]}"
    return val

def parse_phone_field(raw_phone, raw_home=None, raw_mobile=None):
    home = str(raw_home).strip() if raw_home else None
    mobile = str(raw_mobile).strip() if raw_mobile else None
    raw = str(raw_phone or "").strip()
    
    if raw:
        h_match = re.search(r"H:\s*([0-9\-\(\)\.\s]+)", raw, re.IGNORECASE)
        m_match = re.search(r"M:\s*([0-9\-\(\)\.\s]+)", raw, re.IGNORECASE)
        
        if h_match and not home:
            h_digits = re.sub(r"\D", "", h_match.group(1))
            if len(h_digits) >= 10:
                home = h_digits[:10]
            elif h_digits:
                home = h_digits
                
        if m_match and not mobile:
            m_digits = re.sub(r"\D", "", m_match.group(1))
            if len(m_digits) >= 10:
                mobile = m_digits[:10]
            elif m_digits:
                mobile = m_digits
                
        if not home and not mobile:
            digits = re.sub(r"\D", "", raw)
            if len(digits) == 20:
                home = digits[:10]
                mobile = digits[10:]
            elif len(digits) >= 10:
                mobile = digits[:10]
            elif digits:
                mobile = digits
                
    f_home = format_10_digits(home)
    f_mobile = format_10_digits(mobile)
    primary = f_mobile or f_home or ""
    
    return f_home, f_mobile, primary

def generate_search_keywords(cust):
    keywords = set()
    name = (cust.get("name") or "").lower()
    qb_name = (cust.get("qbName") or "").lower()
    first = (cust.get("firstName") or "").lower()
    last = (cust.get("lastName") or "").lower()
    biz = (cust.get("businessName") or "").lower()
    
    for text in [name, qb_name, first, last, biz]:
        for token in re.findall(r"[a-z0-9]+", text):
            if len(token) >= 1:
                keywords.add(token)
                
    cnum = (cust.get("customerNumber") or cust.get("id") or "").lower()
    if cnum:
        keywords.add(cnum)
        
    cid = (cust.get("wexCustomerId") or "").lower()
    if cid:
        keywords.add(cid)
        
    email = (cust.get("email") or "").lower()
    if email:
        keywords.add(email)
        for token in re.findall(r"[a-z0-9]+", email.split("@")[0]):
            keywords.add(token)
            
    for p in [cust.get("mobilePhone"), cust.get("homePhone"), cust.get("phone")]:
        if p:
            digits = re.sub(r"\D", "", str(p))
            if digits:
                keywords.add(digits)
                if len(digits) == 10:
                    keywords.add(digits[-4:])
                    keywords.add(digits[:3])
            
    # Include billing address tokens
    b_addr = cust.get("billingAddress") or {}
    for text in [b_addr.get("street") or "", b_addr.get("city") or "", b_addr.get("zipCode") or ""]:
        for token in re.findall(r"[a-z0-9]+", text.lower()):
            if len(token) >= 2:
                keywords.add(token)
                
    # Include all property locations tokens
    for loc in (cust.get("locations") or [])[:100]:
        for text in [loc.get("street") or "", loc.get("addr2") or "", loc.get("city") or "", loc.get("zipCode") or ""]:
            for token in re.findall(r"[a-z0-9]+", text.lower()):
                if len(token) >= 2:
                    keywords.add(token)
                
    return sorted(list(keywords))[:80]

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
    for cust in chunk:
        doc_id = cust.get("id") or cust.get("customerNumber")
        doc_name = f"projects/{project_id}/databases/(default)/documents/{target_collection}/{doc_id}"
        
        fields = {}
        for k, v in cust.items():
            if v is not None:
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
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8")
            if attempt == retries - 1:
                raise RuntimeError(f"Batch {batch_idx} failed with HTTP {e.code}: {err_msg}")
            time.sleep(2 * (attempt + 1))
        except Exception as e:
            if attempt == retries - 1:
                raise RuntimeError(f"Batch {batch_idx} failed: {e}")
            time.sleep(2 * (attempt + 1))

def main():
    detailed_csv = r"e:\Murphys\data\wex_exports\customers\WEX customer report detailed.csv"
    json_path = r"e:\Murphys\packages\domain\src\mock\wex_customers.json"
    
    print(f"Reading detailed customer report from: {detailed_csv}")
    with open(detailed_csv, "r", encoding="utf-16") as f:
        reader = csv.DictReader(f, delimiter="\t")
        rows = list(reader)
        
    print(f"Loaded {len(rows):,} total location rows.")
    
    # Group rows by Customer ID or Customer Number
    grouped = defaultdict(list)
    for r in rows:
        cid = clean_str(r.get("Customer ID")) or clean_str(r.get("Customer Number"))
        if cid:
            grouped[cid].append(r)
            
    print(f"Grouped into {len(grouped):,} unique customer profiles.")
    
    customers = []
    total_locations_count = 0
    multi_loc_count = 0
    both_phones_count = 0
    
    for cid, row_group in grouped.items():
        base_r = row_group[0]
        
        cnum = clean_str(base_r.get("Customer Number")) or cid
        raw_name = clean_str(base_r.get("Name"))
        biz_name = clean_str(base_r.get("Business Name"))
        first_name = clean_str(base_r.get("First Name"))
        last_name = clean_str(base_r.get("Last Name"))
        cust_type_raw = clean_str(base_r.get("Customer Type")).lower()
        cust_type = "commercial" if "commercial" in cust_type_raw else "residential"
        
        # Name resolution
        if not raw_name:
            if first_name or last_name:
                raw_name = f"{first_name} {last_name}".strip()
            elif biz_name:
                raw_name = biz_name
            else:
                raw_name = f"Customer #{cnum}"
                
        qb_name = ""
        if last_name and first_name:
            qb_name = f"{last_name}, {first_name}"
        elif biz_name:
            qb_name = biz_name
        else:
            qb_name = raw_name
            
        # Billing Address
        b_street = clean_str(base_r.get("Billing Address1")) or clean_str(base_r.get("Default Billing Address"))
        b_addr2 = clean_str(base_r.get("Billing Address2")) or clean_str(base_r.get("Billing Address3"))
        b_city = clean_str(base_r.get("Billing City"))
        b_state = clean_str(base_r.get("Billing State")) or "FL"
        b_zip = clean_str(base_r.get("Billing Zip"))
        
        billing_addr = None
        if b_street:
            billing_addr = {
                "id": "b-1",
                "street": b_street,
                "addr2": b_addr2,
                "addressLine2": b_addr2,
                "street2": b_addr2,
                "city": b_city or "Santa Rosa Beach",
                "state": b_state or "FL",
                "zipCode": b_zip or "32459",
                "type": cust_type,
                "isDefault": True,
                "description": "Primary Billing"
            }
            
        # Locations parsing & deduplication
        locations = []
        seen_loc_keys = set()
        
        for idx, lr in enumerate(row_group):
            loc_street = clean_str(lr.get("Location Address1"))
            if not loc_street:
                loc_raw = clean_str(lr.get("Location Address"))
                if loc_raw:
                    loc_street = loc_raw.split("\n")[0].strip()
                    
            loc_addr2 = clean_str(lr.get("Location Address2")) or clean_str(lr.get("Location Address3"))
            loc_city = clean_str(lr.get("Location City")) or b_city or "Santa Rosa Beach"
            loc_state = clean_str(lr.get("Location State")) or b_state or "FL"
            loc_zip = clean_str(lr.get("Location Zip")) or b_zip or "32459"
            
            if not loc_street and not loc_city and not loc_addr2:
                continue
                
            loc_key = f"{loc_street.lower()}|{loc_addr2.lower()}|{loc_city.lower()}|{loc_zip.lower()}"
            if loc_key in seen_loc_keys:
                continue
            seen_loc_keys.add(loc_key)
            
            loc_num = len(locations) + 1
            locations.append({
                "id": f"loc-{loc_num}",
                "street": loc_street or "Primary Location",
                "addr2": loc_addr2,
                "addressLine2": loc_addr2,
                "street2": loc_addr2,
                "city": loc_city,
                "state": loc_state,
                "zipCode": loc_zip,
                "type": cust_type,
                "isDefault": len(locations) == 0,
                "description": "Primary Location" if len(locations) == 0 else f"Location {loc_num}"
            })
            
        if len(locations) > 1:
            multi_loc_count += 1
        total_locations_count += len(locations)
        
        # Dual Address Guarantee
        if not locations and billing_addr:
            locations = [{
                "id": "loc-1",
                "street": billing_addr["street"],
                "addr2": billing_addr.get("addr2", ""),
                "addressLine2": billing_addr.get("addressLine2", ""),
                "street2": billing_addr.get("street2", ""),
                "city": billing_addr["city"],
                "state": billing_addr["state"],
                "zipCode": billing_addr["zipCode"],
                "type": cust_type,
                "isDefault": True,
                "description": "Primary Location"
            }]
        elif not locations:
            locations = [{
                "id": "loc-1",
                "street": "No street provided",
                "addr2": "",
                "addressLine2": "",
                "street2": "",
                "city": "Santa Rosa Beach",
                "state": "FL",
                "zipCode": "32459",
                "type": cust_type,
                "isDefault": True,
                "description": "Primary Location"
            }]
            
        if not billing_addr:
            billing_addr = {
                "id": "b-1",
                "street": locations[0]["street"],
                "addr2": locations[0].get("addr2", ""),
                "addressLine2": locations[0].get("addressLine2", ""),
                "street2": locations[0].get("street2", ""),
                "city": locations[0]["city"],
                "state": locations[0]["state"],
                "zipCode": locations[0]["zipCode"],
                "type": cust_type,
                "isDefault": True,
                "description": "Primary Billing"
            }
            
        primary_addr = locations[0]
        
        email = clean_str(base_r.get("Email")) or None
        
        # Phone parsing into separate Home and Mobile
        raw_p = clean_str(base_r.get("Phone"))
        home_phone, mobile_phone, primary_phone = parse_phone_field(raw_p)
        if home_phone and mobile_phone:
            both_phones_count += 1
            
        # Financials
        total_invoiced = clean_float(base_r.get("Total Invoiced "))
        total_proposed = clean_float(base_r.get("Total Proposed "))
        
        # Metadata
        creation_date = clean_str(base_r.get("Customer Creation Date"))
        last_visit_date = clean_str(base_r.get("Last Visit Date "))
        maint_status = clean_str(base_r.get("Maintenance Plan Status")) or "None"
        cust_status = clean_str(base_r.get("Customer Status")) or "Active"
        ref_source = clean_str(base_r.get("Referral Source")) or ""
        
        cust_obj = {
            "id": cnum,
            "customerNumber": cnum,
            "accountNumber": cnum,
            "wexCustomerId": cid,
            "legacyId": cid,
            "name": raw_name,
            "businessName": biz_name,
            "firstName": first_name,
            "lastName": last_name,
            "qbName": qb_name,
            "qbNameLower": (qb_name or raw_name).lower(),
            "nameLower": raw_name.lower(),
            "customerType": cust_type,
            "customerStatus": cust_status,
            "autoSyncStatus": "Synced",
            "paymentTerms": "Due upon Receipt",
            "email": email,
            "phone": primary_phone,
            "mobilePhone": mobile_phone,
            "homePhone": home_phone,
            "maintenancePlanStatus": maint_status if maint_status != "None" else None,
            "referralSource": ref_source or None,
            "lastVisitDate": last_visit_date or None,
            "address": primary_addr,
            "locations": locations,
            "billingAddress": billing_addr,
            "financials": {
                "totalInvoiced": total_invoiced,
                "totalProposed": total_proposed,
                "currency": "USD"
            },
            "wexMetadata": {
                "customerCreationDate": creation_date or None,
                "rawIndex": clean_str(base_r.get("INDEX")),
                "locationCount": len(locations),
            }
        }
        cust_obj["searchKeywords"] = generate_search_keywords(cust_obj)
        customers.append(cust_obj)
        
    print(f"Built {len(customers):,} customer objects ({both_phones_count:,} with both Home & Mobile phones).")
    
    # Save to mock JSON
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(customers, f, indent=2)
    print(f"Successfully saved {json_path} with {len(customers):,} records.")
    
    # Upload to Firestore
    access_token = get_firebase_access_token()
    project_id = "murphys-fsm-staging"
    target_collection = "sandbox_customers"
    
    CHUNK_SIZE = 250
    chunks = [customers[i:i + CHUNK_SIZE] for i in range(0, len(customers), CHUNK_SIZE)]
    total_batches = len(chunks)
    print(f"\nCommitting {total_batches} batches to Firestore collection '{target_collection}'...")
    
    batch_tuples = [
        (idx + 1, chunk, project_id, target_collection, access_token)
        for idx, chunk in enumerate(chunks)
    ]
    
    start_time = time.time()
    completed_count = 0
    total_written = 0
    
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(upload_batch, bt): bt[0] for bt in batch_tuples}
        for future in as_completed(futures):
            b_idx = futures[future]
            b_idx, chunk_len, write_len = future.result()
            completed_count += 1
            total_written += write_len
            pct = (completed_count / total_batches) * 100
            print(f"  [OK] [{completed_count:2d}/{total_batches}] Batch {b_idx:2d} committed ({chunk_len:3d} docs) - {pct:.1f}%")

    elapsed = time.time() - start_time
    print(f"\nSuccessfully committed all {total_written:,} customer records with separated Home & Mobile phones into Firestore '{target_collection}' in {elapsed:.2f} seconds!")

if __name__ == "__main__":
    main()
