import json
import sqlite3
import urllib.request
import urllib.error
import re
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'pb', 'pb_data', 'data.db')
STORE_DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'store-data.json')
MAX_WORKERS = 40  # Faster scrape

def fetch_details(pid):
    url = f"https://czmakers.com/product/{pid}"
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    })
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        html = resp.read().decode('utf-8')
        
        table_match = re.search(r'<table class="table table-bordered">.*?<tbody>(.*?)</tbody>', html, re.DOTALL)
        details = {}
        if table_match:
            rows_html = table_match.group(1)
            row_pattern = r'<tr>\s*<td[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*</tr>'
            for k, v in re.findall(row_pattern, rows_html, re.DOTALL):
                clean_k = re.sub(r'<[^>]+>', '', k).strip().replace('\n', ' ').replace('\r', '')
                clean_v = re.sub(r'<[^>]+>', '', v).strip().replace('\n', ' ').replace('\r', '')
                clean_k = re.sub(r'\s+', ' ', clean_k)
                clean_v = re.sub(r'\s+', ' ', clean_v)
                if clean_k and clean_v:
                    details[clean_k] = clean_v
        return pid, details
    except Exception as e:
        return pid, None

def run_scrape():
    with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
        sd = json.load(f)
        
    products = sd.get('products', [])
    to_scrape = [p for p in products if not p.get('moreDetails')]
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    batch_size = 500
    for i in range(0, len(to_scrape), batch_size):
        batch = to_scrape[i:i+batch_size]
        updated_count = 0
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_p = {}
            for p in batch:
                pid = p['id'].replace('czm_', '') if p['id'].startswith('czm_') else p['id']
                future_to_p[executor.submit(fetch_details, pid)] = p
                
            for future in as_completed(future_to_p):
                p = future_to_p[future]
                try:
                    pid, details = future.result()
                    if details:
                        p['moreDetails'] = details
                        c.execute("UPDATE products SET more_details = ? WHERE id = ?", (json.dumps(details), p['id']))
                        updated_count += 1
                except Exception as e:
                    pass
        
        conn.commit()
        with open(STORE_DATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(sd, f, ensure_ascii=False)
            
    conn.close()

if __name__ == '__main__':
    run_scrape()
