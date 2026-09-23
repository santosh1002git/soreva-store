import sqlite3
import json
import os
import sys
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')
STORE_DATA_PATH = os.path.join(BASE_DIR, 'data', 'store-data.json')
DIST_PATH = os.path.join(BASE_DIR, 'data', 'czmakers_all_products.json')

def calc_retail(wholesale_inr):
    try:
        w = float(wholesale_inr)
    except (ValueError, TypeError):
        w = 450.0
    if w <= 0:
        w = 450.0
        
    if w < 100:
        r = max(499.0, w * 4.5)
    elif w < 500:
        r = max(999.0, w * 3.2)
    elif w < 2000:
        r = max(1999.0, w * 2.5)
    elif w < 5000:
        r = max(4999.0, w * 2.2)
    else:
        r = max(9999.0, w * 2.0)
    
    # round to nearest 100 and minus 1 -> 99
    retail = int(round(r / 100.0) * 100) - 1
    orig = int(round((retail * 1.35) / 100.0) * 100) - 1
    return retail, orig, round(w, 2)

def run_import():
    if not os.path.exists(DIST_PATH):
        print(f"Error: {DIST_PATH} not found.", file=sys.stderr)
        return False

    print("Loading distributor catalog JSON...")
    t0 = time.time()
    with open(DIST_PATH, 'r', encoding='utf-8') as f:
        dist_products = json.load(f)
    print(f"Loaded {len(dist_products)} distributor pieces in {time.time()-t0:.2f}s.")

    # Connect to SQLite
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Ensure schema has necessary columns
    cols = [c[1] for c in cur.execute("PRAGMA table_info(products);").fetchall()]
    if 'disabled' not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN disabled INTEGER DEFAULT 1;")
    if 'active' not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN active INTEGER DEFAULT 0;")
    if 'usdWholesale' not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN usdWholesale REAL DEFAULT 0.0;")

    # Prepare batch tuples for products and inventory
    product_rows = []
    inventory_rows = []

    print("Formatting records with intelligent markup and complete metadata...")
    for p in dist_products:
        pid = str(p['distributorId'])
        prod_id = f"czm_{pid}"
        sku = f"CZM-{pid}"
        name = p['name']
        cat = p['category']
        subcat = p.get('subCategory', '')
        plating = p.get('plating', 'gold')
        
        # calculate realistic retail pricing from distributor wholesale
        raw_wholesale = p.get('usdWholesale', 25.0) # which was data-price from czmakers
        retail_inr, orig_inr, wholesale_clean = calc_retail(raw_wholesale)
        
        badge = "Distributor Catalog"
        p_img = p.get('primaryImg', '')
        h_img = p.get('hoverImg', '')
        desc = p.get('description', f"Exquisitely handcrafted CZ designer piece from CZ Makers distributor catalog. Model: {p.get('code', pid)}.")
        rating = 4.8
        reviews = 12
        disabled = 1
        active = 0

        product_rows.append((
            prod_id, name, cat, subcat, plating,
            retail_inr, orig_inr, badge,
            p_img, h_img, desc, rating, reviews,
            disabled, active, wholesale_clean
        ))

        inventory_rows.append((
            prod_id, name, sku, cat, 0, 5, 'Disabled'
        ))

    print(f"Prepared {len(product_rows)} product rows and {len(inventory_rows)} inventory rows.")

    # Begin single SQLite transaction
    print("Executing batch insert into SQLite database...")
    t_db = time.time()
    cur.execute("BEGIN TRANSACTION;")

    # Insert or replace into products
    cur.executemany("""
        INSERT OR REPLACE INTO products (
            id, name, category, subCategory, plating,
            priceINR, originalPriceINR, badge,
            primaryImg, hoverImg, description, rating, reviews,
            disabled, active, usdWholesale
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, product_rows)

    # Insert or replace into inventory
    cur.executemany("""
        INSERT OR REPLACE INTO inventory (
            id, productName, sku, category, stockQty, lowStockThreshold, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, inventory_rows)

    conn.commit()
    conn.close()
    print(f"Database insertion completed in {time.time()-t_db:.2f}s!")

    # Verify counts in SQLite
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    prod_count = cur.execute("SELECT COUNT(*) FROM products;").fetchone()[0]
    inv_count = cur.execute("SELECT COUNT(*) FROM inventory;").fetchone()[0]
    disabled_count = cur.execute("SELECT COUNT(*) FROM products WHERE disabled = 1;").fetchone()[0]
    active_count = cur.execute("SELECT COUNT(*) FROM products WHERE disabled = 0;").fetchone()[0]
    conn.close()

    print("=" * 60)
    print("DATABASE STATUS SUMMARY:")
    print(f"  - Total Products in Database:  {prod_count:,}")
    print(f"  - Total Inventory Records:     {inv_count:,}")
    print(f"  - Disabled Distributor Pieces: {disabled_count:,} (active: 0, status: 'Disabled')")
    print(f"  - Live Active Brand Pieces:    {active_count}")
    print("=" * 60)

    # Sync store-data.json
    print("Synchronizing store-data.json...")
    with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
        store_data = json.load(f)

    # Preserve live store products
    existing_store_products = store_data.get('products', [])
    live_brand_products = [p for p in existing_store_products if not str(p.get('id', '')).startswith('czm_') and not str(p.get('sku', '')).startswith('CZM-')]

    # Write backup
    with open(STORE_DATA_PATH + '.backup_before_dist.json', 'w', encoding='utf-8') as f:
        json.dump(store_data, f, indent=2)

    # We keep live brand products active in store-data.json
    store_data['products'] = live_brand_products
    with open(STORE_DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(store_data, f, indent=2, ensure_ascii=False)

    print("store-data.json synced. Live storefront is clean and fast.")
    return True

if __name__ == '__main__':
    run_import()
