#!/usr/bin/env python3
"""
clear_customers_orders.py - Safely clears customer accounts, customer orders, and resets total revenue.
Leaves catalog designs, inventory, employees, and admin credentials 100% intact.
All newly incoming registrations, orders, and revenue will be freshly recorded and preserved during future stock refreshes.
"""

import sqlite3
import shutil
import time
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPT_DIR, '..')
DB_PATH = os.path.join(PROJECT_DIR, 'pb', 'pb_data', 'data.db')

def clear_customers_orders():
    if not os.path.exists(DB_PATH):
        print(f"[Error] Database not found at: {DB_PATH}")
        sys.exit(1)

    # 1. Create a safe backup before wiping
    ts = int(time.time())
    backup_path = f"{DB_PATH}.backup_pre_clear_customers_orders_{ts}.db"
    shutil.copy2(DB_PATH, backup_path)
    print(f"🔒 Created pre-clear backup: {os.path.basename(backup_path)}")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 2. Count before clearing
    pre_orders = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    pre_cust = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    pre_rev = c.execute("SELECT COALESCE(SUM(totalAmount), 0) FROM orders WHERE status != 'Cancelled'").fetchone()[0]

    print(f"📊 Current State:")
    print(f"   • Customers: {pre_cust}")
    print(f"   • Orders: {pre_orders}")
    print(f"   • Total Revenue: ₹{pre_rev:,.2f}")

    # 3. Clear orders and customers tables
    c.execute("DELETE FROM orders")
    c.execute("DELETE FROM customers")

    # 4. Clear non-admin test users from users table, preserve admins/owners
    c.execute("DELETE FROM users WHERE LOWER(email) NOT IN ('admin@soreva.in', 'sonal@soreva.in', 'santosh.1002@gmail.com')")
    c.execute("DELETE FROM user_sessions WHERE user_id NOT IN (SELECT id FROM users)")
    c.execute("DELETE FROM user_carts")

    # 5. Record audit log
    c.execute("""
        INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
        VALUES (?, 'Admin', 'Clear Customers and Orders', 'StoreData', 'customers_orders', ?)
    """, (
        f"log_clear_cust_ord_{ts}",
        f"Cleared {pre_cust} customer accounts and {pre_orders} orders (₹{pre_rev:,.2f} revenue) by Admin request. Ready for live customer registrations and orders."
    ))

    conn.commit()

    # 6. Verify clean state
    post_orders = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    post_cust = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    post_rev = c.execute("SELECT COALESCE(SUM(totalAmount), 0) FROM orders WHERE status != 'Cancelled'").fetchone()[0]
    retained_users = c.execute("SELECT email FROM users").fetchall()
    retained_employees = c.execute("SELECT name, email, role FROM employees").fetchall()
    conn.close()

    print("\n✅ Verification After Clearing:")
    print(f"   • Customers: {post_cust}")
    print(f"   • Orders: {post_orders}")
    print(f"   • Total Revenue: ₹{post_rev:,.2f}")
    print(f"   • Retained Admin Users: {[u[0] for u in retained_users]}")
    print(f"   • Retained Staff & Employees: {len(retained_employees)}")
    print("\n✨ Complete! All customer accounts, orders, and total revenue have been reset to 0.")
    print("✨ Once live registrations and orders start coming in, they will be cleanly tracked and preserved across all future refreshes.")

if __name__ == '__main__':
    clear_customers_orders()
