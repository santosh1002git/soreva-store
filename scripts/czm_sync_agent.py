import sqlite3
import json
import urllib.request
import urllib.error
import time
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'pb', 'pb_data', 'data.db')
STORE_DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'store-data.json')
MAX_WORKERS = 10

def check_product(pid):
    url = f"https://czmakers.com/product/{pid}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        html = resp.read().decode('utf-8').lower()
        if "product not found" in html or "no product found" in html:
            return pid, False
        return pid, True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return pid, False
        return pid, True # Assume exists if other error
    except Exception as e:
        return pid, True # Assume exists on network error

def run_sync():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    products = c.execute("SELECT id, name FROM products WHERE disabled = 0").fetchall()
    
    out_of_stock_ids = []
    
    print(f"Starting sync for {len(products)} active products...")
    
    # We will just check the first 50 for testing if we want, but she wants an agent to run it.
    # To prevent timing out her system, we use ThreadPoolExecutor
    
    # In a real environment, we'd check all of them.
    # For now, let's just do a limited batch or process all with high concurrency.
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_id = {}
        for db_id, name in products:
            if db_id.startswith('czm_'):
                pid = db_id.replace('czm_', '')
                future_to_id[executor.submit(check_product, pid)] = db_id
                
        for i, future in enumerate(as_completed(future_to_id)):
            db_id = future_to_id[future]
            try:
                pid, exists = future.result()
                if not exists:
                    out_of_stock_ids.append(db_id)
                    print(f"[{i+1}/{len(products)}] {db_id} is OUT OF STOCK.")
                else:
                    pass
            except Exception as e:
                pass
                
    if out_of_stock_ids:
        print(f"Found {len(out_of_stock_ids)} products out of stock. Updating database...")
        
        # Update SQLite
        placeholders = ','.join('?' for _ in out_of_stock_ids)
        c.execute(f"UPDATE products SET disabled = 1, active = 0 WHERE id IN ({placeholders})", out_of_stock_ids)
        c.execute(f"UPDATE inventory SET status = 'Out of Stock', stockQty = 0 WHERE id IN ({placeholders})", out_of_stock_ids)
        conn.commit()
        
        # Update store-data.json
        if os.path.exists(STORE_DATA_PATH):
            with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
                sd = json.load(f)
            
            out_of_stock_set = set(out_of_stock_ids)
            for p in sd.get('products', []):
                if p.get('id') in out_of_stock_set:
                    p['disabled'] = 1
                    p['active'] = 0
                    p['stockStatus'] = 'Out of Stock'
                    
            with open(STORE_DATA_PATH, 'w', encoding='utf-8') as f:
                json.dump(sd, f, ensure_ascii=False)
                
    print("Sync complete.")
    conn.close()

if __name__ == '__main__':
    run_sync()
