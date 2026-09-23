#!/usr/bin/env python3
"""
Sorèva Luxury Jewellery Store - Application & Persistence Server
Handles static file serving and lightweight REST API for Store Data & Admin Authentication.
Zero external dependencies (uses standard library).
"""

import os
import sys
import json
import hashlib
import time
import sqlite3
import secrets
import string
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STORE_DATA_PATH = os.path.join(DATA_DIR, 'store-data.json')
BACKUP_DATA_PATH = os.path.join(DATA_DIR, 'store-data.backup.json')
PB_DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')

# Default password: soreva@2026
DEFAULT_PW_HASH = "3779c849af88128e466010f799175ce3344f2392947810fa4501766c0664d846"


def get_db():
    """Connect to PocketBase's underlying SQLite database."""
    if not os.path.exists(PB_DB_PATH):
        return None
    try:
        conn = sqlite3.connect(PB_DB_PATH, timeout=10)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"[DB Error] SQLite connection failed: {e}")
        return None


def gen_pb_id():
    """Generate 15-char alphanumeric identifier matching PocketBase format."""
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(15))


def get_lan_ip():
    """Detect actual local network IP for local Wi-Fi sharing."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = '127.0.0.1'
    finally:
        s.close()
    return ip


def get_role_permissions(role):
    """Return tailored feature permissions for staff roles."""
    r = (role or '').lower()
    if 'owner' in r or 'admin' in r:
        return {
            "canManageProducts": True,
            "canManageStock": True,
            "canManageOrders": True,
            "canManageTeam": True,
            "canManageSettings": True
        }
    elif 'catalog' in r:
        return {
            "canManageProducts": True,
            "canManageStock": False,
            "canManageOrders": False,
            "canManageTeam": False,
            "canManageSettings": False
        }
    elif 'inventory' in r or 'stock' in r:
        return {
            "canManageProducts": False,
            "canManageStock": True,
            "canManageOrders": False,
            "canManageTeam": False,
            "canManageSettings": False
        }
    elif 'order' in r or 'fulfillment' in r:
        return {
            "canManageProducts": False,
            "canManageStock": False,
            "canManageOrders": True,
            "canManageTeam": False,
            "canManageSettings": False
        }
    return {
        "canManageProducts": False,
        "canManageStock": False,
        "canManageOrders": False,
        "canManageTeam": False,
        "canManageSettings": False
    }


def init_extended_tables():
    """Ensure employees and audit_log tables exist in SQLite."""
    conn = get_db()
    if not conn:
        return
    try:
        c = conn.cursor()
        c.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                pin TEXT NOT NULL,
                role TEXT NOT NULL,
                avatar TEXT,
                active INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                employeeName TEXT NOT NULL,
                action TEXT NOT NULL,
                targetType TEXT NOT NULL,
                targetId TEXT,
                details TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        count = c.execute("SELECT COUNT(*) FROM employees").fetchone()[0]
        if count == 0:
            employees = [
                ('emp_owner_01', 'Sonal Belchada', 'sonal@soreva.in', '2026', 'Owner', '👑', 1),
                ('emp_cat_02', 'Priya Sharma', 'priya@soreva.in', '1001', 'Catalog Specialist', '💎', 1),
                ('emp_inv_03', 'Rahul Verma', 'rahul@soreva.in', '1002', 'Inventory Manager', '📦', 1),
                ('emp_ord_04', 'Ananya Iyer', 'ananya@soreva.in', '1003', 'Orders & Fulfillment', '🚚', 1),
            ]
            c.executemany("""
                INSERT INTO employees (id, name, email, pin, role, avatar, active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, employees)
        audit_count = c.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
        if audit_count == 0:
            c.execute("""
                INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                VALUES ('log_init_01', 'System', 'Database Initialization', 'System', 'all', 'Employee Portal & Database GUI initialized successfully.')
            """)
        conn.commit()
    except Exception as e:
        print(f"[Init Error] Failed to init extended tables: {e}")
    finally:
        conn.close()


def get_stored_data():
    if not os.path.exists(STORE_DATA_PATH):
        return None
    try:
        with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[Error] Failed to read store-data.json: {e}")
        return None


def save_stored_data(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    # Save a backup copy first
    if os.path.exists(STORE_DATA_PATH):
        try:
            with open(STORE_DATA_PATH, 'r', encoding='utf-8') as src:
                old_content = src.read()
            with open(BACKUP_DATA_PATH, 'w', encoding='utf-8') as dst:
                dst.write(old_content)
        except Exception:
            pass

    # Atomic write to temporary file then replace
    temp_path = STORE_DATA_PATH + '.tmp'
    with open(temp_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(temp_path, STORE_DATA_PATH)
    return True


class SorevaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        # Force fresh 200 response for all assets by stripping conditional cache headers
        if 'If-Modified-Since' in self.headers:
            del self.headers['If-Modified-Since']
        if 'If-None-Match' in self.headers:
            del self.headers['If-None-Match']

        # API: Get Store Data
        if parsed.path == '/api/store-data':
            data = get_stored_data()
            if data is None:
                self._send_json({"error": "Failed to load store data"}, 500)
                return
            self._send_json(data)
            return

        # API: Database Information & Health Metrics
        if parsed.path == '/api/database/info':
            conn = get_db()
            if not conn:
                self._send_json({
                    "status": "error",
                    "connected": False,
                    "error": "SQLite database not found at pb/pb_data/data.db"
                }, 500)
                return

            try:
                c = conn.cursor()
                prod_count = c.execute("SELECT COUNT(*) FROM products").fetchone()[0]
                inv_count = c.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
                cust_count = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
                orders_count = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]

                # Detailed inventory stats
                inv_stats = c.execute("""
                    SELECT 
                        COALESCE(SUM(stockQty), 0) as totalUnits,
                        SUM(CASE WHEN status = 'Low Stock' THEN 1 ELSE 0 END) as lowStockCount,
                        SUM(CASE WHEN status = 'Out of Stock' THEN 1 ELSE 0 END) as outOfStockCount,
                        SUM(CASE WHEN status = 'In Stock' THEN 1 ELSE 0 END) as inStockCount
                    FROM inventory
                """).fetchone()

                # Detailed revenue stats
                rev_stat = c.execute("""
                    SELECT COALESCE(SUM(totalAmount), 0) as totalRev
                    FROM orders
                    WHERE status != 'Cancelled'
                """).fetchone()

                db_size = os.path.getsize(PB_DB_PATH) if os.path.exists(PB_DB_PATH) else 0

                self._send_json({
                    "status": "online",
                    "connected": True,
                    "databaseEngine": "PocketBase v0.40.4 (Embedded SQLite)",
                    "studioUrl": "http://localhost:8090/_/",
                    "credentials": {
                        "username": "admin@soreva.in",
                        "passwordHint": "soreva@2026"
                    },
                    "dbSizeBytes": db_size,
                    "dbSizeFormatted": f"{db_size / 1024:.1f} KB",
                    "counts": {
                        "products": prod_count,
                        "inventory": inv_count,
                        "customers": cust_count,
                        "orders": orders_count,
                        "totalUnits": inv_stats['totalUnits'],
                        "inStock": inv_stats['inStockCount'],
                        "lowStock": inv_stats['lowStockCount'],
                        "outOfStock": inv_stats['outOfStockCount'],
                        "totalRevenue": rev_stat['totalRev']
                    }
                })
            except Exception as e:
                self._send_json({"status": "error", "error": str(e)}, 500)
            finally:
                conn.close()
            return

        # API: Get Inventory Records
        if parsed.path == '/api/inventory':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                rows = c.execute("""
                    SELECT id, sku, productName, category, stockQty, lowStockThreshold, status 
                    FROM inventory 
                    ORDER BY rowid ASC
                """).fetchall()
                items = [dict(r) for r in rows]
                self._send_json(items)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # API: Get Customers Records
        if parsed.path == '/api/customers':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                rows = c.execute("""
                    SELECT id, name, email, phone, address, city, totalOrders, totalSpent 
                    FROM customers 
                    ORDER BY totalSpent DESC
                """).fetchall()
                customers = [dict(r) for r in rows]
                self._send_json(customers)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # API: Get Orders Records
        if parsed.path == '/api/orders':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                rows = c.execute("""
                    SELECT id, orderNumber, customerName, customerEmail, customerPhone, 
                           shippingAddress, city, paymentMethod, itemsSummary, totalAmount, status 
                    FROM orders 
                    ORDER BY rowid DESC
                """).fetchall()
                orders = [dict(r) for r in rows]
                self._send_json(orders)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
        # API: Server Info & Local Wi-Fi Sharing Coordinates
        if parsed.path == '/api/server-info':
            lan_ip = get_lan_ip()
            port = self.server.server_port or 8000
            self._send_json({
                "lanIp": lan_ip,
                "port": port,
                "portalLanUrl": f"http://{lan_ip}:{port}/portal.html",
                "portalLocalUrl": f"http://localhost:{port}/portal.html",
                "adminLanUrl": f"http://{lan_ip}:{port}/admin.html",
                "adminLocalUrl": f"http://localhost:{port}/admin.html",
                "storeLanUrl": f"http://{lan_ip}:{port}/",
                "storeLocalUrl": f"http://localhost:{port}/",
                "pocketbaseUrl": "http://localhost:8090/_/"
            })
            return

        # API: Database Products with Live Joined Inventory
        if parsed.path == '/api/db/products':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                rows = c.execute("""
                    SELECT 
                        p.id, p.name, p.category, p.subCategory, p.plating, 
                        p.priceINR, p.originalPriceINR, p.badge, 
                        p.primaryImg, p.hoverImg, p.videoUrl, p.gallery, p.description, p.rating, p.reviews,
                        COALESCE(p.disabled, 0) as disabled,
                        COALESCE(p.active, 0) as active,
                        COALESCE(p.usdWholesale, 0.0) as usdWholesale,
                        COALESCE(i.sku, 'CZM-' || p.id) as sku,
                        COALESCE(i.stockQty, 0) as stockQty,
                        COALESCE(i.lowStockThreshold, 5) as lowStockThreshold,
                        COALESCE(i.status, CASE WHEN p.disabled = 1 THEN 'Disabled' ELSE 'In Stock' END) as stockStatus,
                        i.id as inventoryId
                    FROM products p
                    LEFT JOIN inventory i ON i.id = p.id
                    ORDER BY p.rowid DESC
                """).fetchall()
                products = [dict(r) for r in rows]
                self._send_json(products)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # API: Get Active Employees & Permissions
        if parsed.path == '/api/employees':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                rows = c.execute("""
                    SELECT id, name, email, pin, role, avatar, active, createdAt
                    FROM employees
                    WHERE active = 1
                    ORDER BY rowid ASC
                """).fetchall()
                employees = []
                for r in rows:
                    item = dict(r)
                    item['permissions'] = get_role_permissions(item.get('role'))
                    employees.append(item)
                self._send_json(employees)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # API: Get Audit Activity History
        if parsed.path == '/api/audit-log':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                rows = c.execute("""
                    SELECT id, employeeName, action, targetType, targetId, details, timestamp
                    FROM audit_log
                    ORDER BY rowid DESC
                    LIMIT 60
                """).fetchall()
                logs = [dict(r) for r in rows]
                self._send_json(logs)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # Default: Serve static files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        content_length = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_length)

        try:
            payload = json.loads(post_body.decode('utf-8')) if post_body else {}
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Invalid JSON payload: {e}"}).encode())
            return

        # API: Admin Login
        if parsed.path == '/api/admin/login':
            password = payload.get('password', '')
            req_hash = payload.get('passwordHash', '')
            if password:
                req_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

            data = get_stored_data() or {}
            saved_hash = data.get('settings', {}).get('adminPasswordHash', DEFAULT_PW_HASH)

            if req_hash == saved_hash:
                token = hashlib.sha256(f"{saved_hash}_{int(time.time() / 86400)}".encode()).hexdigest()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "token": token,
                    "message": "Authentication successful"
                }).encode())
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": False,
                    "error": "Incorrect password"
                }).encode())
            return

        # API: Save Store Data
        if parsed.path == '/api/store-data':
            if not isinstance(payload, dict):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Payload must be a JSON object"}).encode())
                return

            success = save_stored_data(payload)
            if success:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": "Store configuration saved successfully to disk"
                }).encode())
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Failed to save store data"}).encode())
            return

        # API: Change Password
        if parsed.path == '/api/admin/change-password':
            old_pw = payload.get('oldPassword', '')
            new_pw = payload.get('newPassword', '')
            old_hash = hashlib.sha256(old_pw.encode('utf-8')).hexdigest()

            data = get_stored_data() or {}
            saved_hash = data.get('settings', {}).get('adminPasswordHash', DEFAULT_PW_HASH)

            if old_hash != saved_hash:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Current password is incorrect"}).encode())
                return

            if len(new_pw) < 6:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "New password must be at least 6 characters"}).encode())
                return

            new_hash = hashlib.sha256(new_pw.encode('utf-8')).hexdigest()
            if 'settings' not in data:
                data['settings'] = {}
            data['settings']['adminPasswordHash'] = new_hash
            save_stored_data(data)

            self._send_json({"success": True, "message": "Admin password updated successfully"})
            return

        # ----------------------------------------------------
        # API: Update Inventory Item
        # ----------------------------------------------------
        if parsed.path == '/api/inventory/update':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                item_id = payload.get('id', '')
                sku = payload.get('sku', '')
                stock_qty = int(payload.get('stockQty', 0))
                threshold = int(payload.get('lowStockThreshold', 5))

                # Calculate status
                if stock_qty <= 0:
                    status = "Out of Stock"
                elif stock_qty <= threshold:
                    status = "Low Stock"
                else:
                    status = "In Stock"

                c = conn.cursor()
                if item_id:
                    c.execute("""
                        UPDATE inventory 
                        SET stockQty = ?, lowStockThreshold = ?, status = ?
                        WHERE id = ?
                    """, (stock_qty, threshold, status, item_id))
                elif sku:
                    c.execute("""
                        UPDATE inventory 
                        SET stockQty = ?, lowStockThreshold = ?, status = ?
                        WHERE sku = ?
                    """, (stock_qty, threshold, status, sku))
                else:
                    self._send_json({"error": "Item ID or SKU is required"}, 400)
                    conn.close()
                    return

                conn.commit()

                # Fetch updated record
                updated = c.execute("""
                    SELECT id, sku, productName, category, stockQty, lowStockThreshold, status 
                    FROM inventory 
                    WHERE id = ? OR sku = ?
                """, (item_id, sku)).fetchone()

                self._send_json({
                    "success": True,
                    "message": "Inventory updated successfully",
                    "item": dict(updated) if updated else None
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Create / Update Customer
        # ----------------------------------------------------
        if parsed.path == '/api/customers':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                cust_id = payload.get('id') or gen_pb_id()
                name = payload.get('name', '').strip()
                email = payload.get('email', '').strip()
                phone = payload.get('phone', '').strip()
                address = payload.get('address', '').strip()
                city = payload.get('city', '').strip()

                if not name or not email:
                    self._send_json({"error": "Customer name and email are required"}, 400)
                    conn.close()
                    return

                c = conn.cursor()
                existing = c.execute("SELECT id FROM customers WHERE email = ?", (email,)).fetchone()
                if existing:
                    c.execute("""
                        UPDATE customers 
                        SET name = ?, phone = ?, address = ?, city = ?
                        WHERE email = ?
                    """, (name, phone, address, city, email))
                    final_id = existing['id']
                else:
                    c.execute("""
                        INSERT INTO customers (id, name, email, phone, address, city, totalOrders, totalSpent)
                        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
                    """, (cust_id, name, email, phone, address, city))
                    final_id = cust_id

                conn.commit()
                self._send_json({
                    "success": True,
                    "id": final_id,
                    "message": "Customer saved successfully"
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Place Order & Real-Time Checkout
        # ----------------------------------------------------
        if parsed.path == '/api/orders':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                customer_name = payload.get('customerName', '').strip()
                customer_email = payload.get('customerEmail', '').strip()
                customer_phone = payload.get('customerPhone', '').strip()
                shipping_address = payload.get('shippingAddress', '').strip()
                city = payload.get('city', '').strip()
                payment_method = payload.get('paymentMethod', 'UPI / Instant Pay')
                items = payload.get('items', [])
                total_amount = float(payload.get('totalAmount', 0))

                if not customer_name or not customer_email or not items:
                    self._send_json({"error": "Customer name, email, and cart items are required"}, 400)
                    conn.close()
                    return

                c = conn.cursor()

                # 1. Generate Unique Order Number: SRV-2026-XXXX
                count_row = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
                order_seq = 1080 + count_row + 1
                order_num = f"SRV-2026-{order_seq}"
                order_id = gen_pb_id()

                # Build readable summary string
                item_descs = []
                for it in items:
                    qty = it.get('qty', 1)
                    title = it.get('name') or it.get('productName') or 'Jewellery Piece'
                    finish = it.get('finish', '18K Gold')
                    item_descs.append(f"{qty}x {title} ({finish})")
                items_summary = ", ".join(item_descs)

                # 2. Insert into `orders`
                c.execute("""
                    INSERT INTO orders (
                        id, orderNumber, customerName, customerEmail, customerPhone, 
                        shippingAddress, city, paymentMethod, itemsSummary, totalAmount, status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    order_id, order_num, customer_name, customer_email, customer_phone,
                    shipping_address, city, payment_method, items_summary, total_amount, "Processing"
                ))

                # 3. Upsert into `customers`
                cust_row = c.execute("SELECT id, totalOrders, totalSpent FROM customers WHERE email = ?", (customer_email,)).fetchone()
                if cust_row:
                    new_orders = cust_row['totalOrders'] + 1
                    new_spent = cust_row['totalSpent'] + total_amount
                    c.execute("""
                        UPDATE customers 
                        SET totalOrders = ?, totalSpent = ?, name = ?, phone = ?, address = ?, city = ?
                        WHERE email = ?
                    """, (new_orders, new_spent, customer_name, customer_phone, shipping_address, city, customer_email))
                else:
                    new_cust_id = gen_pb_id()
                    c.execute("""
                        INSERT INTO customers (id, name, email, phone, address, city, totalOrders, totalSpent)
                        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                    """, (new_cust_id, customer_name, customer_email, customer_phone, shipping_address, city, total_amount))

                # 4. Inventory Deduction
                inventory_updates = []
                for it in items:
                    prod_name = it.get('name') or it.get('productName')
                    sku = it.get('sku')
                    qty_to_deduct = int(it.get('qty', 1))

                    # Look up by SKU or product name
                    inv_item = None
                    if sku:
                        inv_item = c.execute("SELECT * FROM inventory WHERE sku = ?", (sku,)).fetchone()
                    if not inv_item and prod_name:
                        inv_item = c.execute("SELECT * FROM inventory WHERE productName LIKE ?", (f"%{prod_name}%",)).fetchone()

                    if inv_item:
                        curr_qty = inv_item['stockQty']
                        threshold = inv_item['lowStockThreshold']
                        new_qty = max(0, curr_qty - qty_to_deduct)

                        if new_qty <= 0:
                            new_status = "Out of Stock"
                        elif new_qty <= threshold:
                            new_status = "Low Stock"
                        else:
                            new_status = "In Stock"

                        c.execute("""
                            UPDATE inventory 
                            SET stockQty = ?, status = ?
                            WHERE id = ?
                        """, (new_qty, new_status, inv_item['id']))

                        inventory_updates.append({
                            "sku": inv_item['sku'],
                            "productName": inv_item['productName'],
                            "previousQty": curr_qty,
                            "newQty": new_qty,
                            "status": new_status
                        })

                conn.commit()

                self._send_json({
                    "success": True,
                    "orderNumber": order_num,
                    "orderId": order_id,
                    "status": "Processing",
                    "totalAmount": total_amount,
                    "customerName": customer_name,
                    "customerEmail": customer_email,
                    "itemsSummary": items_summary,
                    "inventoryUpdates": inventory_updates,
                    "message": "Order placed successfully! Inventory deducted and customer profile synced."
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Update Order Status
        # ----------------------------------------------------
        if parsed.path == '/api/orders/status':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                order_id = payload.get('id', '')
                order_num = payload.get('orderNumber', '')
                new_status = payload.get('status', 'Processing')

                valid_statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
                if new_status not in valid_statuses:
                    self._send_json({"error": f"Invalid status. Must be one of {valid_statuses}"}, 400)
                    conn.close()
                    return

                c = conn.cursor()
                if order_id:
                    c.execute("UPDATE orders SET status = ? WHERE id = ?", (new_status, order_id))
                elif order_num:
                    c.execute("UPDATE orders SET status = ? WHERE orderNumber = ?", (new_status, order_num))
                else:
                    self._send_json({"error": "Order ID or Order Number is required"}, 400)
                    conn.close()
                    return

                conn.commit()
                self._send_json({
                    "success": True,
                    "status": new_status,
                    "message": f"Order status updated to {new_status}"
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Employee & Owner Login
        # ----------------------------------------------------
        if parsed.path == '/api/employees/login':
            email = payload.get('email', '').strip().lower()
            pin = payload.get('pin', '').strip()
            password = payload.get('password', '').strip()

            # Check if logging in via Owner Master Password
            if password:
                req_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
                data = get_stored_data() or {}
                saved_hash = data.get('settings', {}).get('adminPasswordHash', DEFAULT_PW_HASH)
                if req_hash == saved_hash:
                    owner_profile = {
                        "id": "emp_owner_master",
                        "name": "Sonal Belchada",
                        "email": "sonal@soreva.in",
                        "role": "Owner",
                        "avatar": "👑",
                        "permissions": get_role_permissions("Owner")
                    }
                    token = hashlib.sha256(f"owner_{int(time.time() / 86400)}".encode()).hexdigest()
                    self._send_json({"success": True, "token": token, "employee": owner_profile})
                    return

            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                emp = c.execute("SELECT * FROM employees WHERE LOWER(email) = ? AND pin = ? AND active = 1", (email, pin)).fetchone()
                if emp:
                    emp_dict = dict(emp)
                    emp_dict['permissions'] = get_role_permissions(emp_dict.get('role'))
                    if 'pin' in emp_dict:
                        del emp_dict['pin']
                    token = hashlib.sha256(f"{emp_dict['id']}_{int(time.time() / 86400)}".encode()).hexdigest()

                    # Audit login
                    c.execute("""
                        INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                        VALUES (?, ?, 'Employee Login', 'Session', ?, ?)
                    """, (f"log_{gen_pb_id()}", emp_dict['name'], emp_dict['id'], f"{emp_dict['name']} ({emp_dict['role']}) signed in."))
                    conn.commit()

                    self._send_json({"success": True, "token": token, "employee": emp_dict})
                else:
                    self._send_json({"success": False, "error": "Invalid email or 4-digit PIN"}, 401)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Create / Update Employee Account
        # ----------------------------------------------------
        if parsed.path == '/api/employees':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                emp_id = payload.get('id') or f"emp_{gen_pb_id()}"
                name = payload.get('name', '').strip()
                email = payload.get('email', '').strip().lower()
                pin = payload.get('pin', '').strip() or '1234'
                role = payload.get('role', 'Catalog Specialist')
                avatar = payload.get('avatar', '💎')
                operator_name = payload.get('operatorName', 'Owner')

                if not name or not email:
                    self._send_json({"error": "Employee name and email are required"}, 400)
                    conn.close()
                    return

                c = conn.cursor()
                existing = c.execute("SELECT id FROM employees WHERE id = ? OR LOWER(email) = ?", (emp_id, email)).fetchone()
                if existing:
                    c.execute("""
                        UPDATE employees 
                        SET name = ?, email = ?, pin = ?, role = ?, avatar = ?, active = 1
                        WHERE id = ?
                    """, (name, email, pin, role, avatar, existing['id']))
                    action = "Update Employee"
                    target_id = existing['id']
                else:
                    c.execute("""
                        INSERT INTO employees (id, name, email, pin, role, avatar, active)
                        VALUES (?, ?, ?, ?, ?, ?, 1)
                    """, (emp_id, name, email, pin, role, avatar))
                    action = "Add Employee"
                    target_id = emp_id

                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, ?, 'Employee', ?, ?)
                """, (f"log_{gen_pb_id()}", operator_name, action, target_id, f"{action}: {name} ({role})"))
                conn.commit()

                self._send_json({"success": True, "id": target_id, "message": f"Employee {name} saved successfully"})
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Deactivate Employee
        # ----------------------------------------------------
        if parsed.path == '/api/employees/delete':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                emp_id = payload.get('id')
                operator_name = payload.get('operatorName', 'Owner')
                c = conn.cursor()
                emp = c.execute("SELECT name, role FROM employees WHERE id = ?", (emp_id,)).fetchone()
                emp_name = emp['name'] if emp else emp_id

                c.execute("UPDATE employees SET active = 0 WHERE id = ?", (emp_id,))
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Deactivate Employee', 'Employee', ?, ?)
                """, (f"log_{gen_pb_id()}", operator_name, emp_id, f"Deactivated team account: {emp_name}"))
                conn.commit()
                self._send_json({"success": True, "message": f"Employee {emp_name} deactivated"})
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Add Product to Database & Sync Storefront
        # ----------------------------------------------------
        if parsed.path == '/api/db/products':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                name = payload.get('name', '').strip()
                category = payload.get('category', 'necklace').lower().strip()
                sub_category = payload.get('subCategory', '').strip()
                plating = payload.get('plating', 'gold').lower().strip()
                price_inr = int(payload.get('priceINR', 0))
                orig_price_inr = int(payload.get('originalPriceINR', 0)) or price_inr
                badge = payload.get('badge', '').strip()
                finishes = payload.get('availableFinishes', ["18K Gold", "Rhodium Silver"])
                primary_img = payload.get('primaryImg', '').strip()
                hover_img = payload.get('hoverImg', '').strip() or primary_img
                description = payload.get('description', '').strip()
                stock_qty = int(payload.get('stockQty', 15))
                low_stock_threshold = int(payload.get('lowStockThreshold', 5))
                rating = float(payload.get('rating', 5.0))
                reviews = int(payload.get('reviews', 12))
                employee_name = payload.get('employeeName', 'Staff')

                if not name or not price_inr or not primary_img:
                    self._send_json({"error": "Product name, price, and primary image are required"}, 400)
                    conn.close()
                    return

                # Stock status calculation
                if stock_qty <= 0:
                    stock_status = "Out of Stock"
                elif stock_qty <= low_stock_threshold:
                    stock_status = "Low Stock"
                else:
                    stock_status = "In Stock"

                c = conn.cursor()
                prod_id = gen_pb_id()
                inv_id = gen_pb_id()

                # Generate unique SKU
                cat_prefix_map = {
                    'necklace': 'NCK',
                    'earrings': 'EAR',
                    'ring': 'RNG',
                    'bracelet': 'BRC',
                    'pendant': 'PND'
                }
                cat_code = cat_prefix_map.get(category, category[:3].upper())
                count_existing = c.execute("SELECT COUNT(*) FROM inventory WHERE category = ?", (category,)).fetchone()[0]
                sku = payload.get('sku', '').strip() or f"SRV-{cat_code}-{count_existing + 1:03d}"

                # 1. Insert into SQLite products
                c.execute("""
                    INSERT INTO products (
                        id, name, category, subCategory, plating, 
                        priceINR, originalPriceINR, badge, 
                        primaryImg, hoverImg, description, rating, reviews
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    prod_id, name, category, sub_category, plating,
                    price_inr, orig_price_inr, badge,
                    primary_img, hover_img, description, rating, reviews
                ))

                # 2. Insert into SQLite inventory
                c.execute("""
                    INSERT INTO inventory (
                        id, sku, productName, category, stockQty, lowStockThreshold, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    inv_id, sku, name, category, stock_qty, low_stock_threshold, stock_status
                ))

                # 3. Insert into audit_log
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Add Product', 'Product', ?, ?)
                """, (
                    f"log_{gen_pb_id()}", employee_name, prod_id,
                    f"Added '{name}' (SKU: {sku}, ₹{price_inr:,}, Stock: {stock_qty})"
                ))

                conn.commit()

                # 4. Sync with store-data.json so public website immediately reflects it
                sd = get_stored_data() or {}
                if 'products' not in sd:
                    sd['products'] = []
                next_int_id = max([p.get('id', 0) for p in sd['products']] + [0]) + 1
                new_sd_prod = {
                    "id": next_int_id,
                    "dbId": prod_id,
                    "sku": sku,
                    "name": name,
                    "category": category,
                    "subCategory": sub_category,
                    "plating": plating,
                    "priceINR": price_inr,
                    "originalPriceINR": orig_price_inr,
                    "badge": badge,
                    "availableFinishes": finishes,
                    "primaryImg": primary_img,
                    "hoverImg": hover_img,
                    "description": description,
                    "rating": rating,
                    "reviews": reviews,
                    "gallery": [primary_img, hover_img]
                }
                sd['products'].append(new_sd_prod)
                save_stored_data(sd)

                self._send_json({
                    "success": True,
                    "message": f"Jewelry piece '{name}' added to database successfully!",
                    "product": {
                        "id": prod_id,
                        "intId": next_int_id,
                        "sku": sku,
                        "name": name,
                        "category": category,
                        "priceINR": price_inr,
                        "stockQty": stock_qty,
                        "stockStatus": stock_status
                    }
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Update Product in Database & Sync Storefront
        # ----------------------------------------------------
        
        
        if parsed.path == '/api/chat':
            user_msg = payload.get('message', '').strip()
            
            # Use Groq API if key is present in environment (e.g. Vercel)
            import os, urllib.request, urllib.error
            groq_key = os.environ.get('GROQ_API_KEY')
            
            if groq_key:
                try:
                    req = urllib.request.Request('https://api.groq.com/openai/v1/chat/completions', headers={
                        'Authorization': f'Bearer {groq_key}',
                        'Content-Type': 'application/json'
                    }, data=json.dumps({
                        "model": "llama3-8b-8192",
                        "messages": [
                            {"role": "system", "content": "You are the Sorèva AI Concierge. You are a polite, luxurious jewelry assistant for the Sorèva brand. Keep your answers extremely concise (1-2 sentences max). Answer questions about necklaces, earrings, rings, and jewelry styling."},
                            {"role": "user", "content": user_msg}
                        ]
                    }).encode('utf-8'))
                    resp = urllib.request.urlopen(req, timeout=10)
                    data = json.loads(resp.read().decode('utf-8'))
                    reply = data['choices'][0]['message']['content']
                except Exception as e:
                    reply = f"Sorry, I am experiencing temporary network interference with my AI brain. ({e})"
            else:
                # Simulated fallback for local testing without API key
                msg_lower = user_msg.lower()
                reply = "I am the Sorèva AI Concierge powered by Llama 3! I am currently running in simulated mode. To fully activate my real brain on Vercel, simply add your GROQ_API_KEY to your Vercel Environment Variables!"
                
                if 'necklace' in msg_lower:
                    reply = "We have a beautiful collection of Bridal and Classic necklaces! They feature AAA+ Cubic Zirconia."
                elif 'stock' in msg_lower or 'available' in msg_lower:
                    reply = "I can check live inventory for you! Please provide the SKU."
                elif 'price' in msg_lower or 'cost' in msg_lower:
                    reply = "Our pieces range from accessible luxury to premium bridal sets. You can sort by price on our catalog!"

            self._send_json({"reply": reply})
            return
            
        if parsed.path == '/api/admin/sync-catalog':

            # Run the agent in the background
            import subprocess
            import os
            script_path = os.path.join(DATA_DIR, '..', 'scripts', 'czm_sync_agent.py')
            subprocess.Popen([sys.executable, script_path])
            
            self._send_json({"success": True, "message": "Agent launched. Syncing catalog in the background. Please check back in a few minutes."})
            return
            
        if parsed.path == '/api/db/products/update':

            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                prod_id = payload.get('id', '')
                name = payload.get('name', '').strip()
                category = payload.get('category', 'necklace').lower().strip()
                sub_category = payload.get('subCategory', '').strip()
                plating = payload.get('plating', 'gold').lower().strip()
                price_inr = int(payload.get('priceINR', 0))
                orig_price_inr = int(payload.get('originalPriceINR', 0)) or price_inr
                badge = payload.get('badge', '').strip()
                finishes = payload.get('availableFinishes', ["18K Gold", "Rhodium Silver"])
                primary_img = payload.get('primaryImg', '').strip()
                hover_img = payload.get('hoverImg', '').strip() or primary_img
                video_url = payload.get('videoUrl', '').strip()
                description = payload.get('description', '').strip()
                stock_qty = int(payload.get('stockQty', 15))
                low_stock_threshold = int(payload.get('lowStockThreshold', 5))
                employee_name = payload.get('employeeName', 'Staff')

                if not prod_id or not name:
                    self._send_json({"error": "Product ID and name are required"}, 400)
                    conn.close()
                    return

                # Stock status calculation
                if stock_qty <= 0:
                    stock_status = "Out of Stock"
                elif stock_qty <= low_stock_threshold:
                    stock_status = "Low Stock"
                else:
                    stock_status = "In Stock"

                c = conn.cursor()
                orig_row = c.execute("SELECT name FROM products WHERE id = ?", (prod_id,)).fetchone()
                orig_name = orig_row['name'] if orig_row else name

                # 1. Update SQLite products
                c.execute("""
                    UPDATE products 
                    SET name = ?, category = ?, subCategory = ?, plating = ?,
                        priceINR = ?, originalPriceINR = ?, badge = ?,
                        primaryImg = ?, hoverImg = ?, videoUrl = ?, description = ?
                    WHERE id = ?
                """, (
                    name, category, sub_category, plating,
                    price_inr, orig_price_inr, badge,
                    primary_img, hover_img, video_url, description, prod_id
                ))

                disabled_val = payload.get('disabled')
                if disabled_val is not None:
                    act_val = int(payload.get('active', 1 if int(disabled_val) == 0 else 0))
                    c.execute("UPDATE products SET disabled = ?, active = ? WHERE id = ?", (int(disabled_val), act_val, prod_id))

                # 2. Update SQLite inventory
                c.execute("""
                    UPDATE inventory
                    SET productName = ?, category = ?, stockQty = ?, lowStockThreshold = ?, status = ?
                    WHERE id = ? OR sku = ? OR productName = ? OR sku LIKE ('%' || ? || '%')
                """, (name, category, stock_qty, low_stock_threshold, stock_status, prod_id, payload.get('sku', ''), orig_name, prod_id))

                # 3. Insert audit log
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Update Product', 'Product', ?, ?)
                """, (
                    f"log_{gen_pb_id()}", employee_name, prod_id,
                    f"Updated '{name}' (Price: ₹{price_inr:,}, Stock: {stock_qty}, Status: {stock_status})"
                ))

                conn.commit()

                # 4. Update in store-data.json
                sd = get_stored_data() or {}
                if 'products' not in sd:
                    sd['products'] = []
                found = False
                for p in sd['products']:
                    if p.get('dbId') == prod_id or p.get('id') == prod_id or p.get('name') == orig_name:
                        found = True
                        p.update({
                            "name": name,
                            "category": category,
                            "subCategory": sub_category,
                            "plating": plating,
                            "priceINR": price_inr,
                            "originalPriceINR": orig_price_inr,
                            "badge": badge,
                            "availableFinishes": finishes,
                            "primaryImg": primary_img,
                            "hoverImg": hover_img,
                            "description": description,
                            "disabled": bool(disabled_val) if disabled_val is not None else p.get('disabled', False),
                            "active": bool(payload.get('active', True if disabled_val == 0 else p.get('active', True))),
                            "stockStatus": stock_status,
                            "stockQty": stock_qty,
                            "gallery": [primary_img, hover_img]
                        })
                        break

                # If enabled piece was not yet in store-data.json, add it
                if not found and (disabled_val == 0 or payload.get('active') == 1):
                    sd['products'].append({
                        "id": prod_id,
                        "dbId": prod_id,
                        "sku": payload.get('sku', f"CZM-{prod_id}"),
                        "name": name,
                        "category": category,
                        "subCategory": sub_category,
                        "priceINR": price_inr,
                        "originalPriceINR": orig_price_inr,
                        "rating": 4.8,
                        "reviews": 12,
                        "plating": plating,
                        "availableFinishes": finishes,
                        "badge": badge,
                        "launchOffer": False,
                        "disabled": False,
                        "active": True,
                        "stockStatus": stock_status,
                        "stockQty": stock_qty,
                        "primaryImg": primary_img,
                        "hoverImg": hover_img,
                        "gallery": [primary_img, hover_img],
                        "description": description
                    })

                save_stored_data(sd)

                self._send_json({"success": True, "message": f"Product '{name}' updated successfully"})
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Delete Product from Database & Sync Storefront
        # ----------------------------------------------------
        if parsed.path == '/api/db/products/delete':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                prod_id = payload.get('id', '')
                employee_name = payload.get('employeeName', 'Staff')

                c = conn.cursor()
                orig_row = c.execute("SELECT name FROM products WHERE id = ?", (prod_id,)).fetchone()
                prod_name = orig_row['name'] if orig_row else prod_id

                c.execute("DELETE FROM products WHERE id = ?", (prod_id,))
                c.execute("DELETE FROM inventory WHERE productName = ?", (prod_name,))

                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Delete Product', 'Product', ?, ?)
                """, (f"log_{gen_pb_id()}", employee_name, prod_id, f"Deleted piece '{prod_name}' from database."))

                conn.commit()

                # Delete from store-data.json
                sd = get_stored_data() or {}
                if 'products' in sd:
                    sd['products'] = [p for p in sd['products'] if p.get('dbId') != prod_id and p.get('name') != prod_name]
                    save_stored_data(sd)

                self._send_json({"success": True, "message": f"Product '{prod_name}' removed from database"})
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        self._send_json({"error": "Endpoint not found"}, 404)


class DualStackServer(HTTPServer):
    address_family = socket.AF_INET6
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()


def run_server(port=8000):
    init_extended_tables()
    lan_ip = get_lan_ip()
    try:
        httpd = DualStackServer(('::', port), SorevaHandler)
    except Exception as e:
        print(f"[DualStack Notice] Fallback to IPv4: {e}")
        httpd = HTTPServer(('0.0.0.0', port), SorevaHandler)

    print(f"==================================================")
    print(f"  💎 Sorèva Storefront & Database GUI Server running")
    print(f"  🌐 Store URL:    http://127.0.0.1:{port}/")
    print(f"  👥 Employee GUI: http://localhost:{port}/portal.html")
    print(f"  📡 Wi-Fi Share:  http://{lan_ip}:{port}/portal.html")
    print(f"  🔒 Master Admin: http://localhost:{port}/admin.html")
    print(f"  📦 PocketBase:   http://localhost:8090/_/")
    print(f"==================================================")
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down.")
        httpd.server_close()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
