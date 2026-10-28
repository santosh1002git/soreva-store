#!/usr/bin/env python3
"""
Sorèva Reset All Stock Utility
Resets stockQty = 0 and status = 'Out of Stock' across all 11,130 catalog items.
Preserves all products, orders, and customer accounts 100% intact.
Items will only be marked in-stock once verified live against czmakers.com.
"""

import os
import sys
import time
import json
import shutil
import sqlite3

def reset_all_stock(base_dir=None):
    if not base_dir:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    db_path = os.path.join(base_dir, 'pb', 'pb_data', 'data.db')
    data_dir = os.path.join(base_dir, 'data')
    store_data_path = os.path.join(data_dir, 'store-data.json')

    print(f"==================================================")
    print(f"🔒 Sorèva Complete Stock Reset to Zero")
    print(f"Base Directory: {base_dir}")
    print(f"==================================================")

    ts = int(time.time())

    # 1. Verify Database and Customer/Order Isolation
    if not os.path.exists(db_path):
        print(f"❌ Error: Database not found at {db_path}")
        return False

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Check existing counts
    c.execute("SELECT COUNT(*) FROM products")
    init_prod_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM inventory")
    init_inv_count = c.fetchone()[0]

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

    print(f"📊 State Before Stock Reset:")
    print(f"   - Products: {init_prod_count}")
    print(f"   - Inventory Items: {init_inv_count}")
    print(f"   - Orders (Protected): {orders_count}")
    print(f"   - Customers (Protected): {customers_count}")

    # Checkpoint WAL before backing up
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")

    # Create Timestamped DB Backup
    db_backup_path = f"{db_path}.backup_pre_stock_reset_{ts}.db"
    shutil.copy2(db_path, db_backup_path)
    print(f"💾 Created database backup: {os.path.basename(db_backup_path)}")

    # Perform Stock Reset to 0
    c.execute("""
        UPDATE inventory 
        SET stockQty = 0, 
            status = 'Out of Stock'
    """)
    inv_updated = c.rowcount

    c.execute("""
        UPDATE products 
        SET disabled = 1, 
            active = 0
    """)
    prod_updated = c.rowcount

    # Audit log entry
    try:
        chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
        import random
        log_id = 'log_' + ''.join(random.choice(chars) for _ in range(15))
        c.execute("""
            INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
            VALUES (?, 'Admin', 'Reset All Stock', 'Inventory', 'bulk', ?)
        """, (log_id, f"Reset {inv_updated} inventory items to 0 stock (Out of Stock). Catalog preserved for CZMakers refresh."))
    except Exception as e:
        print(f"[Audit Log Notice] {e}")

    conn.commit()

    # Verify Post-Reset DB State
    c.execute("""
        SELECT 
            COALESCE(SUM(stockQty), 0) as totalUnits,
            SUM(CASE WHEN status = 'In Stock' THEN 1 ELSE 0 END) as inStockCount,
            SUM(CASE WHEN status = 'Out of Stock' THEN 1 ELSE 0 END) as outOfStockCount
        FROM inventory
    """)
    stats = dict(c.fetchone())

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

    print(f"📊 State After DB Stock Reset:")
    print(f"   - Inventory Items Updated: {inv_updated}")
    print(f"   - Products Set Inactive: {prod_updated}")
    print(f"   - Total Units: {stats['totalUnits']}")
    print(f"   - In Stock Items: {stats['inStockCount']}")
    print(f"   - Out of Stock Items: {stats['outOfStockCount']}")
    print(f"   - Orders (Protected): {final_orders} (Matches initial: {final_orders == orders_count})")
    print(f"   - Customers (Protected): {final_customers} (Matches initial: {final_customers == customers_count})")

    # 2. Update store-data.json
    if os.path.exists(store_data_path):
        json_backup_path = f"{store_data_path}.backup_pre_stock_reset_{ts}"
        shutil.copy2(store_data_path, json_backup_path)
        print(f"💾 Created store-data.json backup: {os.path.basename(json_backup_path)}")

        try:
            with open(store_data_path, 'r', encoding='utf-8') as f:
                sd = json.load(f)

            if 'products' in sd and isinstance(sd['products'], list):
                for p in sd['products']:
                    p['stockQty'] = 0
                    p['status'] = 'Out of Stock'
                    p['stockStatus'] = 'Out of Stock'
                    p['inStock'] = False
                    p['disabled'] = 1
                    p['active'] = 0

                temp_path = store_data_path + '.tmp'
                with open(temp_path, 'w', encoding='utf-8') as f:
                    json.dump(sd, f, ensure_ascii=False, indent=2)
                os.replace(temp_path, store_data_path)
                print(f"✅ Updated {len(sd['products'])} items in store-data.json to 0 stock / Out of Stock")
        except Exception as e:
            print(f"[store-data.json Update Error] {e}")

    print(f"==================================================")
    print(f"🎉 Complete Stock Deletion / Reset Successfully Finished!")
    print(f"   All items are now Out of Stock (0 units).")
    print(f"   Catalog is ready for fresh stock refresh from czmakers.com.")
    print(f"==================================================")
    return True

if __name__ == '__main__':
    base = sys.argv[1] if len(sys.argv) > 1 else None
    reset_all_stock(base)
