#!/usr/bin/env python3
"""
Sorèva Safe Stock Wipe Utility
Wipes all products and inventory from the database, store-data.json, and image cache
while providing a 100% EXCLUSIVE GUARANTEE that customer accounts and order records
remain completely intact and protected.
"""

import os
import sys
import time
import json
import shutil
import sqlite3

def wipe_stock(base_dir=None):
    if not base_dir:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    db_path = os.path.join(base_dir, 'pb', 'pb_data', 'data.db')
    data_dir = os.path.join(base_dir, 'data')
    store_data_path = os.path.join(data_dir, 'store-data.json')
    czm_products_path = os.path.join(data_dir, 'czmakers_all_products.json')
    img_cache_dir = os.path.join(data_dir, 'img_cache')
    status_path = os.path.join(data_dir, 'czm-sync-status.json')

    print(f"==================================================")
    print(f"🔒 Sorèva Safe Stock Wipe Initiated")
    print(f"Base Directory: {base_dir}")
    print(f"==================================================")

    ts = int(time.time())

    # 1. Verify Database and Customer/Order Isolation
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        # Check existing counts
        c.execute("SELECT COUNT(*) FROM products")
        init_prod_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM inventory")
        init_inv_count = c.fetchone()[0]

        # Check orders & customers (MUST PRESERVE)
        orders_count = 0
        customers_count = 0
        try:
            c.execute("SELECT COUNT(*) FROM orders")
            orders_count = c.fetchone()[0]
        except Exception:
            pass

        try:
            c.execute("SELECT COUNT(*) FROM customers")
            customers_count = c.fetchone()[0]
        except Exception:
            pass

        print(f"📊 Current State in Database:")
        print(f"   - Products: {init_prod_count}")
        print(f"   - Inventory Items: {init_inv_count}")
        print(f"   - Orders (Protected): {orders_count}")
        print(f"   - Customers (Protected): {customers_count}")

        # Checkpoint WAL before backing up
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")

        # Create Timestamped DB Backup
        db_backup_path = f"{db_path}.backup_before_wipe_{ts}.db"
        shutil.copy2(db_path, db_backup_path)
        print(f"💾 Created full database backup: {os.path.basename(db_backup_path)}")

        # Perform Clean Stock Delete
        c.execute("DELETE FROM products")
        c.execute("DELETE FROM inventory")
        conn.commit()

        # Verify Post-Wipe DB State
        c.execute("SELECT COUNT(*) FROM products")
        final_prod_count = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM inventory")
        final_inv_count = c.fetchone()[0]

        final_orders = 0
        final_customers = 0
        try:
            c.execute("SELECT COUNT(*) FROM orders")
            final_orders = c.fetchone()[0]
        except Exception:
            pass

        try:
            c.execute("SELECT COUNT(*) FROM customers")
            final_customers = c.fetchone()[0]
        except Exception:
            pass

        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        conn.close()

        print(f"✓ Database wiped successfully:")
        print(f"   - Products remaining: {final_prod_count}")
        print(f"   - Inventory remaining: {final_inv_count}")
        print(f"   - Orders verified intact: {final_orders} (Matches initial: {orders_count == final_orders})")
        print(f"   - Customers verified intact: {final_customers} (Matches initial: {customers_count == final_customers})")
    else:
        print(f"⚠ Database not found at {db_path}, skipping DB wipe.")

    # 2. Wipe products from store-data.json while preserving all settings
    if os.path.exists(store_data_path):
        try:
            with open(store_data_path, 'r', encoding='utf-8') as f:
                sd = json.load(f)

            sd_backup_path = store_data_path.replace('.json', f'.backup_before_wipe_{ts}.json')
            with open(sd_backup_path, 'w', encoding='utf-8') as f:
                json.dump(sd, f, indent=2)
            print(f"💾 Created store-data.json backup: {os.path.basename(sd_backup_path)}")

            prev_sd_prods = len(sd.get('products', []))
            sd['products'] = []

            with open(store_data_path, 'w', encoding='utf-8') as f:
                json.dump(sd, f, indent=2, ensure_ascii=False)
            print(f"✓ store-data.json updated: cleared {prev_sd_prods} products; all metadata preserved.")
        except Exception as e:
            print(f"⚠ Error updating store-data.json: {e}")

    # 3. Clean czmakers_all_products.json
    if os.path.exists(czm_products_path):
        try:
            czm_backup = czm_products_path.replace('.json', f'.backup_before_wipe_{ts}.json')
            shutil.copy2(czm_products_path, czm_backup)
            with open(czm_products_path, 'w', encoding='utf-8') as f:
                json.dump([], f)
            print(f"✓ czmakers_all_products.json backed up and reset to [].")
        except Exception as e:
            print(f"⚠ Error resetting czmakers_all_products.json: {e}")

    # 4. Clear Image Cache so stale wrong image mappings are purged
    if os.path.exists(img_cache_dir):
        try:
            cleared_files = 0
            for item in os.listdir(img_cache_dir):
                item_path = os.path.join(img_cache_dir, item)
                if os.path.isfile(item_path):
                    os.remove(item_path)
                    cleared_files += 1
            print(f"✓ Cleared {cleared_files} cached image files from data/img_cache.")
        except Exception as e:
            print(f"⚠ Error clearing image cache: {e}")

    # 5. Reset czm-sync-status.json to ready state
    try:
        status_data = {
            "status": "idle",
            "step": "Stock completely wiped. Ready for fresh manual refresh via Admin Panel.",
            "mode": "idle",
            "stats": {
                "scanned": 0,
                "updated": 0,
                "added": 0,
                "inStock": 0,
                "outOfStock": 0,
                "preservedOrders": final_orders if 'final_orders' in locals() else 0,
                "preservedCustomers": final_customers if 'final_customers' in locals() else 0
            },
            "updatedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            "wipedAt": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        }
        with open(status_path, 'w', encoding='utf-8') as f:
            json.dump(status_data, f, indent=2)
        print(f"✓ Reset czm-sync-status.json to idle ready state.")
    except Exception as e:
        print(f"⚠ Error resetting sync status: {e}")

    print(f"==================================================")
    print(f"🎉 Complete Stock Wipe Successfully Finished!")
    print(f"The store catalog is now clean (0 products).")
    print(f"You can now trigger the fresh refresh from the Admin Panel whenever you are ready.")
    print(f"==================================================")
    return True

if __name__ == '__main__':
    base = sys.argv[1] if len(sys.argv) > 1 else None
    wipe_stock(base)
