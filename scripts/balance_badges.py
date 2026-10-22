#!/usr/bin/env python3
"""
Sorèva Badge Balancer
Distributes curated badges ('New Launch', 'Bestseller', 'Trending')
proportionately across major jewelry categories (necklace, earrings, rings, bracelets, pendants)
so no single category dominates the storefront, sliders, or catalog views.
"""

import os
import sys
import json
import sqlite3

def balance_badges(db_path, store_data_path=None):
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return False

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Clear existing curated badges
    c.execute("UPDATE products SET badge = '' WHERE badge IN ('New Launch', 'Bestseller', 'Trending')")
    conn.commit()

    # Core jewelry categories to balance across
    target_categories = ['necklace', 'earrings', 'rings', 'bracelets', 'pendants']
    
    # Check if inventory table exists for stock checking
    has_inventory = False
    try:
        c.execute("SELECT COUNT(*) FROM inventory")
        has_inventory = True
    except Exception:
        pass

    # 1. New Launch: 6 per category = 30 total
    nl_per_cat = 6
    nl_selected_ids = set()
    for cat in target_categories:
        if has_inventory:
            query = """
                SELECT p.id FROM products p
                LEFT JOIN inventory i ON p.id = i.id
                WHERE LOWER(p.category) = ? 
                  AND (p.disabled IS NULL OR p.disabled = 0) 
                  AND (p.active IS NULL OR p.active = 1)
                  AND (i.status IS NULL OR i.status = 'In Stock' OR i.status = '')
                ORDER BY p.id DESC
                LIMIT ?
            """
        else:
            query = """
                SELECT id FROM products 
                WHERE LOWER(category) = ? 
                  AND (disabled IS NULL OR disabled = 0) 
                  AND (active IS NULL OR active = 1)
                ORDER BY id DESC
                LIMIT ?
            """
        rows = c.execute(query, (cat, nl_per_cat)).fetchall()
        for r in rows:
            c.execute("UPDATE products SET badge = 'New Launch' WHERE id = ?", (r['id'],))
            nl_selected_ids.add(r['id'])
    
    conn.commit()

    # 2. Trending: 6 per category = 30 total (excluding New Launch)
    tr_per_cat = 6
    tr_selected_ids = set()
    for cat in target_categories:
        placeholders = ','.join(['?'] * len(nl_selected_ids)) if nl_selected_ids else "''"
        if has_inventory:
            query = f"""
                SELECT p.id FROM products p
                LEFT JOIN inventory i ON p.id = i.id
                WHERE LOWER(p.category) = ? 
                  AND (p.disabled IS NULL OR p.disabled = 0) 
                  AND (p.active IS NULL OR p.active = 1)
                  AND (i.status IS NULL OR i.status = 'In Stock' OR i.status = '')
                  AND p.id NOT IN ({placeholders})
                ORDER BY RANDOM()
                LIMIT ?
            """
        else:
            query = f"""
                SELECT id FROM products 
                WHERE LOWER(category) = ? 
                  AND (disabled IS NULL OR disabled = 0) 
                  AND (active IS NULL OR active = 1)
                  AND id NOT IN ({placeholders})
                ORDER BY RANDOM()
                LIMIT ?
            """
        params = list(nl_selected_ids) + [tr_per_cat] if nl_selected_ids else [cat, tr_per_cat]
        if nl_selected_ids:
            params = [cat] + list(nl_selected_ids) + [tr_per_cat]
        rows = c.execute(query, params).fetchall()
        for r in rows:
            c.execute("UPDATE products SET badge = 'Trending' WHERE id = ?", (r['id'],))
            tr_selected_ids.add(r['id'])

    conn.commit()

    # 3. Bestseller: 6 per category = 30 total (excluding New Launch & Trending)
    bs_per_cat = 6
    excluded_ids = nl_selected_ids.union(tr_selected_ids)
    for cat in target_categories:
        placeholders = ','.join(['?'] * len(excluded_ids)) if excluded_ids else "''"
        if has_inventory:
            query = f"""
                SELECT p.id FROM products p
                LEFT JOIN inventory i ON p.id = i.id
                WHERE LOWER(p.category) = ? 
                  AND (p.disabled IS NULL OR p.disabled = 0) 
                  AND (p.active IS NULL OR p.active = 1)
                  AND (i.status IS NULL OR i.status = 'In Stock' OR i.status = '')
                  AND p.id NOT IN ({placeholders})
                ORDER BY RANDOM()
                LIMIT ?
            """
        else:
            query = f"""
                SELECT id FROM products 
                WHERE LOWER(category) = ? 
                  AND (disabled IS NULL OR disabled = 0) 
                  AND (active IS NULL OR active = 1)
                  AND id NOT IN ({placeholders})
                ORDER BY RANDOM()
                LIMIT ?
            """
        params = [cat] + list(excluded_ids) + [bs_per_cat] if excluded_ids else [cat, bs_per_cat]
        rows = c.execute(query, params).fetchall()
        for r in rows:
            c.execute("UPDATE products SET badge = 'Bestseller' WHERE id = ?", (r['id'],))

    conn.commit()

    # Print summary
    print("\n--- Updated Badge Distribution in Database ---")
    c.execute("SELECT badge, COUNT(*) FROM products WHERE badge != '' GROUP BY badge")
    for r in c.fetchall():
        print(f"Badge: {r[0]} -> {r[1]} products")

    print("\n--- 'New Launch' by Category ---")
    c.execute("SELECT category, COUNT(*) FROM products WHERE badge = 'New Launch' GROUP BY category")
    for r in c.fetchall():
        print(f"  {r[0]}: {r[1]}")

    print("\n--- 'Trending' by Category ---")
    c.execute("SELECT category, COUNT(*) FROM products WHERE badge = 'Trending' GROUP BY category")
    for r in c.fetchall():
        print(f"  {r[0]}: {r[1]}")

    print("\n--- 'Bestseller' by Category ---")
    c.execute("SELECT category, COUNT(*) FROM products WHERE badge = 'Bestseller' GROUP BY category")
    for r in c.fetchall():
        print(f"  {r[0]}: {r[1]}")

    # Synchronize store-data.json if provided and exists
    if store_data_path and os.path.exists(store_data_path):
        try:
            with open(store_data_path, 'r', encoding='utf-8') as f:
                sd = json.load(f)
            sd_prods = sd.get('products', [])
            if not sd_prods:
                # If store-data.json had empty products, populate from DB
                db_rows = c.execute("""
                    SELECT p.*, COALESCE(i.sku, 'CZM-' || p.id) as sku,
                           COALESCE(i.status, 'In Stock') as stockStatus,
                           COALESCE(i.stockQty, 15) as stockQty,
                           COALESCE(i.usdWholesale, p.usdWholesale, 0.0) as usdWholesale
                    FROM products p
                    LEFT JOIN inventory i ON p.id = i.id
                    WHERE (p.disabled IS NULL OR p.disabled = 0) AND (p.active IS NULL OR p.active = 1)
                    ORDER BY p.rowid ASC
                """).fetchall()
                sd_prods = []
                for r in db_rows:
                    d = dict(r)
                    for jcol in ('gallery', 'more_details', 'availableFinishes'):
                        if isinstance(d.get(jcol), str) and d[jcol]:
                            try: d[jcol] = json.loads(d[jcol])
                            except: pass
                    if not d.get('gallery'):
                        d['gallery'] = [d.get('primaryImg')]
                    sd_prods.append(d)
                sd['products'] = sd_prods
            else:
                # Build lookup of new badges
                c.execute("SELECT id, badge FROM products WHERE badge != ''")
                badge_map = {str(r['id']): r['badge'] for r in c.fetchall()}
                for p in sd_prods:
                    pid = str(p.get('id', ''))
                    if pid in badge_map:
                        p['badge'] = badge_map[pid]
                    elif p.get('badge') in ('New Launch', 'Bestseller', 'Trending'):
                        p['badge'] = ''
            
            with open(store_data_path, 'w', encoding='utf-8') as f:
                json.dump(sd, f, ensure_ascii=False)
            print(f"\n✓ Synchronized {len(sd_prods)} products in {store_data_path}")
        except Exception as e:
            print(f"Notice syncing {store_data_path}: {e}")

    conn.close()
    return True

if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.abspath(os.path.join(script_dir, '..'))
    db_file = os.path.join(project_dir, 'pb', 'pb_data', 'data.db')
    sd_file = os.path.join(project_dir, 'data', 'store-data.json')
    
    if len(sys.argv) > 1:
        db_file = sys.argv[1]
    if len(sys.argv) > 2:
        sd_file = sys.argv[2]
        
    balance_badges(db_file, sd_file)
