"""
Sync Plating Information from CZMakers
======================================
Crawls CZMakers category plating filters and product pages to accurately
tag each piece with its genuine plating finish:
  - 'gold'      -> 24K Gold Plated
  - 'silver'    -> Rhodium Silver
  - 'rosegold'  -> Rose Gold Plated
  - 'two-tone'  -> Two Tone Plated
  - 'oxidised'  -> Oxidised Silver
  - 'antique'   -> Antique Mehndi Plated

Updates:
  1. SQLite database: `pb/pb_data/data.db` (products table)
  2. JSON store: `data/store-data.json`
"""

import urllib.request
import urllib.parse
import re
import ssl
import json
import sqlite3
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')
STORE_DATA_PATH = os.path.join(BASE_DIR, 'data', 'store-data.json')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

CZM_PLATINGS = {
    'Full Silver': 'silver',
    'Rose Gold': 'rosegold',
    'Two Tone': 'two-tone',
    'Oxidised': 'oxidised',
    'Antique (Mehndi)': 'antique',
}

CATEGORIES = [
    'necklaces',
    'choker-necklaces',
    'traditional-necklaces',
    'collar-necklace',
    'classic-necklace',
    'bridal-necklaces',
    'aurous-collection',
    'earrings',
    'big-size-earrings',
    'tops-&-studs',
    'medium-earrings',
    'small-earrings',
    'jhumka-earrings',
    'finger-rings',
    'cz-finger-rings',
    '925-sterling-finger-rings',
    'pendants',
    'cz-pendant-set',
    'pendant-with-broad-chain',
    'pendant-with-medium-chain',
    'mangalsutra',
    '925-sterling-silver-pendants',
    'wristwear',
    'cz-braclets',
    'cz-bangles',
    'bracelets-rings-combo',
    'silver-jewellery',
    '925-sterling-silver-earrings',
    'accessories',
    'cz-accessories',
    'cz-brooch',
    'mangtika'
]


def fetch_category_plating_page(cat, pl_name, page=1):
    url = f"https://czmakers.com/category/{cat}?platingColor={urllib.parse.quote(pl_name)}&page={page}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=12, context=SSL_CTX) as r:
            if r.status == 200:
                html = r.read().decode('utf-8', errors='ignore')
                pids = re.findall(r'product/(\d+)/', html)
                # Check if there is next page
                has_next = f"page={page + 1}" in html or 'rel="next"' in html
                return cat, pl_name, page, list(set(pids)), has_next
    except Exception as e:
        pass
    return cat, pl_name, page, [], False


def run_plating_sync():
    print("=" * 60)
    print("  💎 Sorèva Plating Sync Agent: Connecting to CZMakers...")
    print("=" * 60)

    discovered_platings = {}  # pid -> normalized_plating

    # Step 1: Scan non-gold plating filters across categories
    tasks = []
    for cat in CATEGORIES:
        for pl_name in CZM_PLATINGS.keys():
            tasks.append((cat, pl_name, 1))

    print(f"Scanning {len(tasks)} category plating channels...")
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_category_plating_page, cat, pl, pg): (cat, pl, pg) for cat, pl, pg in tasks}
        
        while futures:
            done_futures = []
            for f in as_completed(futures):
                done_futures.append(f)
                cat, pl_name, page, pids, has_next = f.result()
                norm = CZM_PLATINGS.get(pl_name, 'gold')
                if pids:
                    for pid in pids:
                        discovered_platings[str(pid)] = norm
                        discovered_platings[f"czm_{pid}"] = norm
                    print(f"  [+] {cat} ({pl_name} p{page}): found {len(pids)} pieces (Total discovered: {len(discovered_platings)//2})")
                
                # If there are subsequent pages, queue them up
                if has_next and page < 5:  # up to page 5
                    next_fut = executor.submit(fetch_category_plating_page, cat, pl_name, page + 1)
                    futures[next_fut] = (cat, pl_name, page + 1)
            
            for f in done_futures:
                del futures[f]

    # Step 2: Handle Silver Jewellery category items
    for cat in ['silver-jewellery', '925-sterling-silver-earrings', '925-sterling-silver-pendants', '925-sterling-finger-rings']:
        # All items in these are guaranteed silver
        req = urllib.request.Request(f"https://czmakers.com/category/{cat}?page=1", headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=10, context=SSL_CTX) as r:
                html = r.read().decode('utf-8', errors='ignore')
                for pid in set(re.findall(r'product/(\d+)/', html)):
                    discovered_platings[str(pid)] = 'silver'
                    discovered_platings[f"czm_{pid}"] = 'silver'
        except Exception:
            pass

    print("\n" + "=" * 60)
    print(f"  Discovered {len(discovered_platings)//2} specific plating entries from CZMakers.")
    from collections import Counter
    counts = Counter(discovered_platings.values())
    for pl, cnt in counts.items():
        print(f"    - {pl.upper()}: {cnt//2} items")
    print("=" * 60)

    # Step 3: Update SQLite database
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    updated_db = 0
    for pid_key, norm_plating in discovered_platings.items():
        clean_pid = str(pid_key).replace('czm_', '')
        czm_id = f"czm_{clean_pid}"
        c.execute("""
            UPDATE products 
            SET plating = ? 
            WHERE (id = ? OR id = ?)
              AND plating != ?
        """, (norm_plating, czm_id, clean_pid, norm_plating))
        if c.rowcount > 0:
            updated_db += c.rowcount

    # Also check title keywords for any remaining items
    c.execute("""
        UPDATE products 
        SET plating = 'silver' 
        WHERE (category = 'silver' OR subCategory LIKE '%silver%' OR LOWER(name) LIKE '%925%' OR LOWER(name) LIKE '%sterling%' OR LOWER(name) LIKE '%silver%')
          AND plating != 'silver'
    """)
    if c.rowcount > 0:
        updated_db += c.rowcount

    c.execute("""
        UPDATE products 
        SET plating = 'rosegold' 
        WHERE (LOWER(name) LIKE '%rose gold%' OR LOWER(name) LIKE '%rosegold%')
          AND plating != 'rosegold'
    """)
    if c.rowcount > 0:
        updated_db += c.rowcount

    c.execute("""
        UPDATE products 
        SET plating = 'two-tone' 
        WHERE (LOWER(name) LIKE '%two tone%' OR LOWER(name) LIKE '%two-tone%')
          AND plating != 'two-tone'
    """)
    if c.rowcount > 0:
        updated_db += c.rowcount

    c.execute("""
        UPDATE products 
        SET plating = 'antique' 
        WHERE (LOWER(name) LIKE '%antique%' OR LOWER(name) LIKE '%mehndi%')
          AND plating != 'antique'
    """)
    if c.rowcount > 0:
        updated_db += c.rowcount

    c.execute("""
        UPDATE products 
        SET plating = 'oxidised' 
        WHERE (LOWER(name) LIKE '%oxidise%' OR LOWER(name) LIKE '%oxidize%')
          AND plating != 'oxidised'
    """)
    if c.rowcount > 0:
        updated_db += c.rowcount

    # Log audit entry
    c.execute("""
        INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
        VALUES (?, 'Admin', 'Plating Sync', 'Product', 'ALL', ?)
    """, (f"log_plating_sync_{int(time.time())}", f"Synchronized live plating info from czmakers.com. {updated_db} database records updated."))
    conn.commit()

    # Step 4: Synchronize into store-data.json
    db_plating_map = {}
    for r in c.execute("SELECT id, plating FROM products WHERE plating IS NOT NULL AND plating != ''").fetchall():
        db_plating_map[str(r[0])] = r[1]
    conn.close()

    updated_json = 0
    if os.path.exists(STORE_DATA_PATH):
        with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
            sd = json.load(f)
        
        for p in sd.get('products', []):
            p_id = str(p.get('id', ''))
            p_db_id = str(p.get('dbId', ''))
            new_pl = db_plating_map.get(p_id) or db_plating_map.get(p_db_id)
            if new_pl and p.get('plating') != new_pl:
                p['plating'] = new_pl
                updated_json += 1
        
        tmp = STORE_DATA_PATH + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(sd, f, indent=2, ensure_ascii=False)
        os.replace(tmp, STORE_DATA_PATH)

    print(f"\n[DONE] SQLite updated: {updated_db} rows. store-data.json updated: {updated_json} items.")


if __name__ == '__main__':
    run_plating_sync()
