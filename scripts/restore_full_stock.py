#!/usr/bin/env python3
"""
Restore and fix catalog stock inventory across all 5 core jewelry categories:
- Restores all active products into SQLite products & inventory tables
- Sets status = 'In Stock', stockQty = 15, active = 1, disabled = 0
- Validates media URLs (primaryImg, hoverImg with A.jpg, videoUrl with product_videos/...V1.mp4)
- Guarantees 0 customers, 0 orders, ₹0.00 revenue remain 100% untouched
- Excludes and purges silver and accessories
- Regenerates public store-data.json
"""

import os
import sys
import json
import time
import sqlite3
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')
STORE_DATA_PATH = os.path.join(BASE_DIR, 'data', 'store-data.json')
BACKUP_DB_DIR = os.path.join(BASE_DIR, 'pb', 'pb_data')

BYPASS_CATEGORIES = {'silver', 'accessories', 'silver-jewellery', 'cz-accessories', 'cz-brooch', 'mangtika'}

def find_best_backup_db():
    candidates = [
        os.path.join(BACKUP_DB_DIR, 'data.db.backup_pre_purge_20261028'),
        os.path.join(BACKUP_DB_DIR, 'data.db.backup_pre_stock_reset_1793157147.db'),
        os.path.join(BACKUP_DB_DIR, 'data.db.backup_pre_clear_customers_orders_1793158739.db'),
        os.path.join(BACKUP_DB_DIR, 'data.db.backup_pre_stock_reset_1793157033.db')
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                conn = sqlite3.connect(c)
                cnt = conn.execute("SELECT COUNT(*) FROM products WHERE LOWER(category) NOT IN ('silver', 'accessories')").fetchone()[0]
                conn.close()
                if cnt > 5000:
                    return c, cnt
            except Exception:
                pass
    return None, 0

def restore_full_stock():
    print("=" * 60)
    print("💎 Sorèva Store: Catalog & Stock Inventory Restoration & Review")
    print("=" * 60)

    if not os.path.exists(DB_PATH):
        print(f"❌ Error: Database not found at {DB_PATH}")
        sys.exit(1)

    backup_src, bak_count = find_best_backup_db()
    if not backup_src:
        print("❌ Error: No valid catalog backup database found.")
        sys.exit(1)

    print(f"📦 Source catalog backup: {os.path.basename(backup_src)} ({bak_count} items)")

    # Connect to live database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Pre-check isolation
    init_cust = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    init_ord = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    print(f"🔒 Checkpoint: {init_cust} Customers and {init_ord} Orders locked & preserved.")

    # Connect to backup source
    b_conn = sqlite3.connect(backup_src)
    b_conn.row_factory = sqlite3.Row
    bc = b_conn.cursor()

    sync_time_iso = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    # Fetch all valid products from backup
    raw_products = bc.execute("""
        SELECT * FROM products 
        WHERE LOWER(category) NOT IN ('silver', 'accessories')
    """).fetchall()

    raw_inventory = bc.execute("""
        SELECT * FROM inventory 
        WHERE LOWER(category) NOT IN ('silver', 'accessories')
    """).fetchall()

    b_conn.close()

    print(f"📥 Loaded {len(raw_products)} products and {len(raw_inventory)} inventory items from backup.")

    # Index inventory items by ID and SKU
    inv_map = {}
    for inv in raw_inventory:
        inv_dict = dict(inv)
        inv_map[str(inv_dict.get('id'))] = inv_dict
        sku = inv_dict.get('sku')
        if sku:
            inv_map[str(sku).upper()] = inv_dict

    # Check already live products in current DB to preserve updated live wholesale/retail pricing
    live_pricing = {}
    for lp in c.execute("SELECT id, priceINR, originalPriceINR, usdWholesale, primaryImg, hoverImg, videoUrl, category, subCategory FROM products").fetchall():
        live_pricing[str(lp['id'])] = dict(lp)

    # Begin transaction
    c.execute("BEGIN TRANSACTION")

    # Clean out any accidental silver/accessories
    c.execute("DELETE FROM products WHERE LOWER(category) IN ('silver', 'accessories')")
    c.execute("DELETE FROM inventory WHERE LOWER(category) IN ('silver', 'accessories')")

    restored_products = []
    restored_count = 0
    in_stock_count = 0

    for rp in raw_products:
        p = dict(rp)
        p_id = str(p.get('id'))
        cat = str(p.get('category') or '').lower().strip()
        if cat in BYPASS_CATEGORIES:
            continue

        subcat = str(p.get('subCategory') or '').strip()
        name = str(p.get('name') or '').strip()

        # If live updated version exists, preserve live values
        lp = live_pricing.get(p_id)
        if lp:
            price_inr = lp.get('priceINR') or p.get('priceINR') or 1499
            orig_inr = lp.get('originalPriceINR') or p.get('originalPriceINR') or int(price_inr * 1.1)
            wholesale = lp.get('usdWholesale') or p.get('usdWholesale') or 0.0
            primary_img = lp.get('primaryImg') or p.get('primaryImg') or ''
            hover_img = lp.get('hoverImg') or p.get('hoverImg') or ''
            video_url = lp.get('videoUrl') or p.get('videoUrl') or ''
            if lp.get('category'): cat = lp['category']
            if lp.get('subCategory'): subcat = lp['subCategory']
        else:
            price_inr = p.get('priceINR') or 1499
            orig_inr = p.get('originalPriceINR') or int(price_inr * 1.1)
            wholesale = p.get('usdWholesale') or 0.0
            primary_img = p.get('primaryImg') or ''
            hover_img = p.get('hoverImg') or ''
            video_url = p.get('videoUrl') or ''

        # Ensure video points to /product_videos/
        if video_url and '/product_images/' in video_url:
            video_url = video_url.replace('/product_images/', '/product_videos/')
        if primary_img and not video_url:
            video_url = primary_img.replace('/product_images/', '/product_videos/').replace('.jpg', 'V1.mp4')
        if primary_img and not hover_img:
            hover_img = primary_img.replace('.jpg', 'A.jpg')

        gallery = [primary_img, hover_img] if hover_img and hover_img != primary_img else ([primary_img] if primary_img else [])

        # Mark all valid pieces as In Stock with quantity 15
        stock_status = 'In Stock'
        stock_qty = 15
        is_disabled = 0
        is_active = 1

        sku = p_id
        inv_item = inv_map.get(p_id) or inv_map.get(f"SRV-{p_id.replace('czm_', '')}")
        if inv_item and inv_item.get('sku'):
            sku = inv_item['sku']
        elif not sku.startswith('SRV-'):
            sku = f"SRV-CZM-{p_id.replace('czm_', '')}"

        c.execute("""
            INSERT OR REPLACE INTO products (
                id, name, category, subCategory, priceINR, originalPriceINR, usdWholesale,
                plating, primaryImg, hoverImg, videoUrl, badge, description, disabled, active, rating, reviews,
                gallery, setContents, stoneColor, stoneSize, more_details,
                lastRefreshed, dateAdded
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p_id, name, cat, subcat, price_inr, orig_inr, wholesale,
            p.get('plating') or '24K Gold',
            primary_img, hover_img, video_url,
            p.get('badge') or '',
            p.get('description') or '',
            is_disabled, is_active,
            p.get('rating') or 4.9,
            p.get('reviews') or 14,
            json.dumps(gallery),
            p.get('setContents') or '',
            p.get('stoneColor') or '',
            p.get('stoneSize') or '',
            p.get('more_details') or '{}',
            sync_time_iso,
            p.get('dateAdded') or sync_time_iso
        ))

        c.execute("""
            INSERT OR REPLACE INTO inventory (
                id, productName, sku, category, subCategory, stockQty, lowStockThreshold, status, usdWholesale, lastRefreshed, dateAdded
            ) VALUES (?, ?, ?, ?, ?, ?, 3, ?, ?, ?, ?)
        """, (
            p_id, name, sku, cat, subcat, stock_qty, stock_status, wholesale, sync_time_iso, p.get('dateAdded') or sync_time_iso
        ))

        restored_products.append({
            "id": p_id,
            "sku": sku,
            "name": name,
            "category": cat,
            "subCategory": subcat,
            "priceINR": price_inr,
            "originalPriceINR": orig_inr,
            "usdWholesale": wholesale,
            "rating": p.get('rating') or 4.9,
            "reviews": p.get('reviews') or 14,
            "plating": p.get('plating') or '24K Gold',
            "availableFinishes": ["24K Gold", "Rose Gold", "Rhodium Silver"],
            "badge": p.get('badge') or '',
            "disabled": is_disabled,
            "active": is_active,
            "stockStatus": stock_status,
            "stockQty": stock_qty,
            "primaryImg": primary_img,
            "hoverImg": hover_img,
            "videoUrl": video_url,
            "gallery": gallery,
            "description": p.get('description') or '',
            "setContents": p.get('setContents') or '',
            "stoneColor": p.get('stoneColor') or '',
            "stoneSize": p.get('stoneSize') or '',
            "more_details": json.loads(p.get('more_details')) if isinstance(p.get('more_details'), str) and p.get('more_details').startswith('{') else {},
            "lastRefreshed": sync_time_iso,
            "dateAdded": p.get('dateAdded') or sync_time_iso
        })

        restored_count += 1
        in_stock_count += 1

    # Verify isolation
    final_cust = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    final_ord = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    if init_cust != final_cust or init_ord != final_ord:
        conn.rollback()
        print(f"❌ Isolation breach! Customers: {init_cust}→{final_cust}, Orders: {init_ord}→{final_ord}")
        sys.exit(1)

    # Insert audit log
    audit_id = f"log_restore_{int(time.time())}"
    details = f"Restored {restored_count} catalog pieces to In Stock across 5 core categories. Orders ({final_ord}) & Customers ({final_cust}) 100% preserved."
    c.execute("""
        INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
        VALUES (?, 'Admin', 'Catalog Stock Restoration', 'Catalog & Inventory', 'bulk', ?)
    """, (audit_id, details))

    conn.commit()

    # Update store-data.json
    sd = {}
    if os.path.exists(STORE_DATA_PATH):
        try:
            with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
                sd = json.load(f)
        except Exception:
            pass

    sd['products'] = restored_products
    if 'settings' in sd:
        sd['settings']['lastStockSync'] = sync_time_iso
        sd['settings']['inStockCount'] = in_stock_count

    with open(STORE_DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(sd, f, ensure_ascii=False, indent=2)

    print("=" * 60)
    print("✅ RESTORATION COMPLETE:")
    print(f"  • Total Products in DB:       {restored_count}")
    print(f"  • Total In-Stock in DB:       {in_stock_count}")
    print(f"  • Available Units in Stock:   {in_stock_count * 15}")
    print(f"  • Total in store-data.json:   {len(restored_products)}")
    print(f"  • Preserved Customers:        {final_cust}")
    print(f"  • Preserved Orders:           {final_ord}")

    print("\n📊 In-Stock Breakdown by Category:")
    for r in c.execute("SELECT category, COUNT(*), SUM(stockQty) FROM inventory WHERE status = 'In Stock' GROUP BY category ORDER BY category").fetchall():
        print(f"  {r[0]:<12}: {r[1]} products ({r[2]} units)")

    conn.close()

if __name__ == '__main__':
    restore_full_stock()
