import os
import sys
import zipfile
import xml.etree.ElementTree as ET
import re
import json
import time
import urllib.request
import urllib.parse
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

def parse_xlsx_data(file_path):
    print(f"Reading spreadsheet: {file_path}")
    with zipfile.ZipFile(file_path, "r") as z:
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
        
        table_data = []
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
                
    return table_data

def get_category_info(cat1, cat2, cat3, prod_name=""):
    c1 = (cat1 or "").strip().lower()
    c2 = (cat2 or "").strip().lower()
    c3 = (cat3 or "").strip().lower()
    p_lower = (prod_name or "").strip().lower()
    
    # Check specific multi-category configurations from spreadsheet
    if "fuel surcharge" in p_lower:
        return "cat-app-res", ["cat-app-res", "cat-app-comm", "cat-hvac"], "Appliance - Residential, Commercial & HVAC", ["Appliance - Residential", "Appliance - Commercial", "HVAC"]
        
    if "military discount" in p_lower:
        return "cat-cod-resorts", ["cat-cod-resorts", "cat-app-res"], "COD and Resorts", ["COD and Resorts", "Appliance - Residential"]

    if "r22 american home" in p_lower:
        return "cat-ahs", ["cat-ahs", "cat-hvac-refrig"], "Home Warranty Pricing - Basic > American Home Shield", ["Home Warranty Pricing - Basic > American Home Shield", "HVAC Refrigerants"]
        
    if "r22 old republic" in p_lower:
        return "cat-old-rep", ["cat-old-rep", "cat-hvac-refrig"], "Home Warranty Pricing - Basic > Old Republic", ["Home Warranty Pricing - Basic > Old Republic", "HVAC Refrigerants"]
        
    if "r410a american home" in p_lower:
        return "cat-ahs", ["cat-ahs", "cat-hvac-refrig"], "Home Warranty Pricing - Basic > American Home Shield", ["Home Warranty Pricing - Basic > American Home Shield", "HVAC Refrigerants"]
        
    if "r410a old republic" in p_lower:
        return "cat-old-rep", ["cat-old-rep", "cat-hvac-refrig"], "Home Warranty Pricing - Basic > Old Republic", ["Home Warranty Pricing - Basic > Old Republic", "HVAC Refrigerants"]

    # Standard category hierarchy mapping
    if "appliance -  commercial" in c1 or "appliance - commercial" in c1:
        return "cat-app-comm", ["cat-app-comm"], "Appliance - Commercial", ["Appliance - Commercial"]
    if "appliance - residential" in c1:
        return "cat-app-res", ["cat-app-res"], "Appliance - Residential", ["Appliance - Residential"]
        
    if "cod and resorts" in c1:
        if "cod" in c2: return "cat-cod", ["cat-cod"], "COD and Resorts > COD", ["COD and Resorts", "COD"]
        if "comm" in c2: return "cat-comm", ["cat-comm"], "COD and Resorts > Commercial", ["COD and Resorts", "Commercial"]
        if "resort" in c2: return "cat-resort", ["cat-resort"], "COD and Resorts > Resort", ["COD and Resorts", "Resort"]
        if "appliance" in c2: return "cat-app-res", ["cat-app-res"], "Appliance - Residential", ["Appliance - Residential"]
        return "cat-cod-resorts", ["cat-cod-resorts"], "COD and Resorts", ["COD and Resorts"]
        
    if "home warranty" in c1:
        if "american home" in c2 or "ahs" in c2: return "cat-ahs", ["cat-ahs"], "Home Warranty Pricing - Basic > American Home Shield", ["Home Warranty Pricing - Basic", "American Home Shield"]
        if "hw parts" in c2: return "cat-hw-parts", ["cat-hw-parts"], "Home Warranty Pricing - Basic > HW Parts only", ["Home Warranty Pricing - Basic", "HW Parts only"]
        if "old republic" in c2: return "cat-old-rep", ["cat-old-rep"], "Home Warranty Pricing - Basic > Old Republic", ["Home Warranty Pricing - Basic", "Old Republic"]
        return "cat-hw-basic", ["cat-hw-basic"], "Home Warranty Pricing - Basic", ["Home Warranty Pricing - Basic"]
        
    if "hvac commercial installs" in c1:
        if "additional" in c2 or "fee" in c2: return "cat-hci-fees", ["cat-hci-fees"], "HVAC Commercial Installs > Additional Fees", ["HVAC Commercial Installs", "Additional Fees"]
        if "install service" in c2: return "cat-hci-services", ["cat-hci-services"], "HVAC Commercial Installs > Install Services", ["HVAC Commercial Installs", "Install Services"]
        if "equipment" in c2: return "cat-hci-equip", ["cat-hci-equip"], "HVAC Commercial Installs > Equipment", ["HVAC Commercial Installs", "Equipment"]
        return "cat-hvac-comm-inst", ["cat-hvac-comm-inst"], "HVAC Commercial Installs", ["HVAC Commercial Installs"]
        
    if "hvac residential installs" in c1:
        if "heat kit" in c3 or "heat kit" in c2 or "heat kit" in p_lower:
            return "cat-hri-heatkits", ["cat-hri-heatkits"], "HVAC Residential Installs > Equipment Residential 1.5-5 Ton > Heat Kits", ["HVAC Residential Installs", "Equipment Residential 1.5-5 Ton", "Heat Kits"]
        if "additional" in c2 or "fee" in c2:
            return "cat-hri-fees", ["cat-hri-fees"], "HVAC Residential Installs > Additional Fees", ["HVAC Residential Installs", "Additional Fees"]
        if "install service" in c2:
            return "cat-hri-services", ["cat-hri-services"], "HVAC Residential Installs > Install Services", ["HVAC Residential Installs", "Install Services"]
        if "equipment" in c2 or "1.5-5 ton" in c2:
            return "cat-hri-equip", ["cat-hri-equip"], "HVAC Residential Installs > Equipment Residential 1.5-5 Ton", ["HVAC Residential Installs", "Equipment Residential 1.5-5 Ton"]
        return "cat-hvac-res-inst", ["cat-hvac-res-inst"], "HVAC Residential Installs", ["HVAC Residential Installs"]
        
    if "hvac refrigerants" in c1 or "refrigerant" in c1:
        return "cat-hvac-refrig", ["cat-hvac-refrig"], "HVAC Refrigerants", ["HVAC Refrigerants"]
        
    if "preventative maintenance" in c1:
        return "cat-prev-maint", ["cat-prev-maint"], "Preventative Maintenance", ["Preventative Maintenance"]
        
    if "hvac" in c1:
        if "additional" in c2 or "fee" in c2: return "cat-add-fees", ["cat-add-fees"], "HVAC > Additional Install Fees", ["HVAC", "Additional Install Fees"]
        if "comm" in c2: return "cat-hvac-comm", ["cat-hvac-comm"], "HVAC > Commercial", ["HVAC", "Commercial"]
        if "part" in c2: return "cat-parts", ["cat-parts"], "HVAC > Parts", ["HVAC", "Parts"]
        if "service" in c2: return "cat-service", ["cat-service"], "HVAC > Service", ["HVAC", "Service"]
        if "equipment" in c2: return "cat-equip", ["cat-equip"], "HVAC > Equipment", ["HVAC", "Equipment"]
        return "cat-hvac", ["cat-hvac"], "HVAC", ["HVAC"]
        
    return "cat-hvac", ["cat-hvac"], "HVAC", ["HVAC"]

def determine_product_type(name, cat_name, labor_hours):
    n_lower = name.lower()
    c_lower = cat_name.lower()
    
    if "discount" in n_lower:
        return "Discount"
        
    if (labor_hours > 0 or 
        "service" in c_lower or 
        "install service" in c_lower or 
        "labor" in n_lower or 
        "service call" in n_lower or 
        "tune up" in n_lower or 
        "tune-up" in n_lower or 
        "hourly rate" in n_lower or 
        "diagnostic" in n_lower or 
        "brazing" in n_lower or 
        "crane service" in n_lower or 
        "leak search" in n_lower or 
        "iso test" in n_lower or 
        "maintenance" in c_lower or 
        "inspection" in n_lower or
        "flush" in n_lower or
        "clean" in n_lower):
        return "Product - Labor/Service Only"
    return "Product - Single Part Only"

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
        except Exception as e:
            if attempt == retries - 1:
                raise RuntimeError(f"Batch {batch_idx} failed: {e}")
            time.sleep(2 * (attempt + 1))

def main():
    xlsx_path = r"e:\Murphys\data\wex_exports\price book\product-groups-2026-08-23 14_11_29.xlsx"
    table_data = parse_xlsx_data(xlsx_path)
    print(f"Loaded {len(table_data)} rows from Excel.")
    
    canonical_items = []
    store_products = []
    category_counts = {}
    
    for idx, row in enumerate(table_data):
        item_id = f"pb-{idx + 1:03d}"
        p_name = (row.get("Product Name") or "").strip()
        p_num = (row.get("Product Number") or "").strip() or f"WEX-PB-{idx + 1:03d}"
        inc_account = (row.get("Income Account") or "").strip() or "HVAC Equipment"
        is_taxable = (row.get("Is Taxable") or "").strip().lower() == "yes"
        
        try:
            labor_hours = float(row.get("Labor Hours") or 0)
        except ValueError:
            labor_hours = 0.0
            
        try:
            std_price = float(row.get("Standard Price") or 0)
        except ValueError:
            std_price = 0.0
            
        try:
            maint_price = float(row.get("Maintenance Plan Price") or 0)
        except ValueError:
            maint_price = 0.0
            
        cat1 = row.get("Category 1") or ""
        cat2 = row.get("Category 2") or ""
        cat3 = row.get("Category 3") or ""
        
        cat_id, cat_ids, cat_name, cat_paths = get_category_info(cat1, cat2, cat3, p_name)
        for cid in cat_ids:
            category_counts[cid] = category_counts.get(cid, 0) + 1
        
        prod_type = determine_product_type(p_name, cat_name, labor_hours)
        
        # Estimate unitCost (default ~50% of sellingPrice if priced, else 0)
        unit_cost = round(std_price * 0.5, 2) if std_price > 0 else 0.0
        
        # Canonical model for @murphys/domain & Firestore
        canonical_item = {
            "id": item_id,
            "name": p_name,
            "sku": p_num,
            "productNumber": p_num,
            "description": p_name,
            "incomeAccount": inc_account,
            "isTaxable": is_taxable,
            "laborHours": labor_hours,
            "sellingPrice": std_price,
            "standardPrice": std_price,
            "maintenancePlanPrice": maint_price if maint_price > 0 else std_price,
            "categoryPaths": cat_paths,
            "categoryId": cat_id,
            "categoryIds": cat_ids,
            "productType": prod_type,
            "unitCost": unit_cost,
        }
        canonical_items.append(canonical_item)
        
        # Store model for apps/web PriceBookStore
        store_item = {
            "id": item_id,
            "categoryId": cat_id,
            "categoryIds": cat_ids,
            "productType": prod_type,
            "categoryName": cat_name,
            "sku": p_num,
            "name": p_name,
            "description": p_name,
            "unitCost": unit_cost,
            "sellingPrice": std_price,
            "isTaxable": is_taxable,
            "accountName": inc_account,
            "qbAccount": inc_account,
            "imageUrl": "",
            "maintPlanOverride": maint_price > 0 and maint_price != std_price,
            "maintPlanPrice": maint_price if maint_price > 0 else std_price,
            "laborHours": labor_hours,
            "isFavorite": False
        }
        store_products.append(store_item)

    print(f"Generated {len(canonical_items)} canonical price book items across {len(category_counts)} categories.")
    
    # 1. Update packages/domain/src/mock/priceBook.ts
    domain_mock_file = r"e:\Murphys\packages\domain\src\mock\priceBook.ts"
    domain_code = f"""/**
 * Canonical Mock Price Book Items generated from WEX Product Groups Export.
 * Total Items: {len(canonical_items)}
 */
import {{ CanonicalPriceBookItem }} from '../types/priceBook.js';

export const CANONICAL_MOCK_PRICEBOOK_ITEMS: CanonicalPriceBookItem[] = {json.dumps(canonical_items, indent=2)};
"""
    with open(domain_mock_file, "w", encoding="utf-8") as f:
        f.write(domain_code)
    print(f"Updated {domain_mock_file}")

    # 2. Update apps/web/src/data/priceBookStore.ts initialProducts
    web_store_file = r"e:\Murphys\apps\web\src\data\priceBookStore.ts"
    with open(web_store_file, "r", encoding="utf-8") as f:
        store_content = f.read()

    # Replace initialProducts array
    products_json_str = json.dumps(store_products, indent=2)
    # Ensure types match TypeScript
    new_store_content = re.sub(
        r"export const initialProducts: PriceBookItem\[\] = \[[\s\S]*?\];",
        f"export const initialProducts: PriceBookItem[] = {products_json_str};",
        store_content
    )
    with open(web_store_file, "w", encoding="utf-8") as f:
        f.write(new_store_content)
    print(f"Updated {web_store_file} with {len(store_products)} products.")

    # 3. Upload to Firestore collections 'sandbox_priceBook' and 'priceBook'
    access_token = get_firebase_access_token()
    project_id = "murphys-fsm-staging"
    
    for target_collection in ["sandbox_priceBook", "priceBook"]:
        CHUNK_SIZE = 100
        chunks = [canonical_items[i:i + CHUNK_SIZE] for i in range(0, len(canonical_items), CHUNK_SIZE)]
        total_batches = len(chunks)
        print(f"\nCommitting {total_batches} batches ({len(canonical_items)} docs) to Firestore '{target_collection}'...")
        
        batch_tuples = [
            (idx + 1, chunk, project_id, target_collection, access_token)
            for idx, chunk in enumerate(chunks)
        ]
        
        start_time = time.time()
        completed_count = 0
        total_written = 0
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {executor.submit(upload_batch, bt): bt[0] for bt in batch_tuples}
            for future in as_completed(futures):
                b_idx = futures[future]
                b_idx, chunk_len, write_len = future.result()
                completed_count += 1
                total_written += write_len
                print(f"  [OK] Batch {b_idx} committed ({chunk_len} items).")

        elapsed = time.time() - start_time
        print(f"\nSuccessfully committed {total_written} Price Book items to Firestore '{target_collection}' in {elapsed:.2f} seconds!")

if __name__ == "__main__":
    main()
