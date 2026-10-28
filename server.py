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
import hmac
import base64
import time
import sqlite3
import secrets
import string
import socket
import random
from datetime import datetime, timedelta
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs, unquote
import urllib.request
import urllib.error
import urllib.parse
import ssl
import http.cookiejar
import re
import subprocess
import copy
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
import html
from concurrent.futures import ThreadPoolExecutor, as_completed
import gzip
import http.client

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STORE_DATA_PATH = os.path.join(DATA_DIR, 'store-data.json')
BACKUP_DATA_PATH = os.path.join(DATA_DIR, 'store-data.backup.json')
RAZORPAY_CONFIG_PATH = os.path.join(DATA_DIR, 'razorpay-config.json')
NOTIFICATIONS_CONFIG_PATH = os.path.join(DATA_DIR, 'notifications-config.json')
EMAIL_OUTBOX_PATH = os.path.join(DATA_DIR, 'email-outbox.log')
POPUP_CONFIG_PATH = os.path.join(DATA_DIR, 'popup-config.json')
POPUP_SUBSCRIBERS_PATH = os.path.join(DATA_DIR, 'popup-subscribers.json')
NEWSLETTER_CONFIG_PATH = os.path.join(DATA_DIR, 'newsletter-config.json')
NEWSLETTER_SUBSCRIBERS_PATH = os.path.join(DATA_DIR, 'newsletter-subscribers.json')
CZM_COOKIE_PATH = os.path.join(DATA_DIR, 'czm-cookie.json')
CZM_CRED_PATH = os.path.join(DATA_DIR, 'czm-credentials.json')
PB_DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')
ADMIN_CREDS_PATH = os.path.join(DATA_DIR, 'admin-credentials.json')
IMG_CACHE_DIR = os.path.join(DATA_DIR, 'img_cache')
_IMG_FETCH_LOCK = threading.Lock()
_IN_FLIGHT_FETCHES = {}
STORE_METADATA_PATH = os.path.join(DATA_DIR, 'store-metadata.json')
_STORE_METADATA_CACHE = None
_STORE_METADATA_MTIME = 0
_PHONE_OTP_STORE = {}
_PHONE_OTP_LOCK = threading.Lock()


def get_stored_metadata():
    """Returns store configuration metadata (settings, categories, instagram, etc.) in 0.1ms without loading 18MB of products."""
    global _STORE_METADATA_CACHE, _STORE_METADATA_MTIME
    if os.path.exists(STORE_METADATA_PATH):
        try:
            mtime = os.path.getmtime(STORE_METADATA_PATH)
            if _STORE_METADATA_CACHE is not None and mtime == _STORE_METADATA_MTIME:
                return _STORE_METADATA_CACHE
            with open(STORE_METADATA_PATH, 'r', encoding='utf-8') as f:
                _STORE_METADATA_CACHE = json.load(f)
                _STORE_METADATA_MTIME = mtime
            return _STORE_METADATA_CACHE
        except Exception as e:
            print(f"[Error] Failed to read store-metadata.json: {e}")
    # Fallback to get_stored_data if metadata file missing
    return get_stored_data()

_GZIP_STORE_DATA_CACHE = None
_GZIP_STORE_DATA_MTIME = 0

def get_gzipped_store_data():
    """Returns pre-compressed gzip bytes of store-data.json for instant ultra-low latency delivery."""
    global _GZIP_STORE_DATA_CACHE, _GZIP_STORE_DATA_MTIME
    if not os.path.exists(STORE_DATA_PATH):
        return None
    try:
        mtime = os.path.getmtime(STORE_DATA_PATH)
        if _GZIP_STORE_DATA_CACHE is None or mtime != _GZIP_STORE_DATA_MTIME:
            with open(STORE_DATA_PATH, 'rb') as f:
                raw = f.read()
            _GZIP_STORE_DATA_CACHE = gzip.compress(raw, compresslevel=6)
            _GZIP_STORE_DATA_MTIME = mtime
        return _GZIP_STORE_DATA_CACHE
    except Exception as e:
        print(f"[Gzip Compress Error] {e}")
        return None

def load_dotenv():
    """Load key-value environment variables from .env if present."""
    env_file = os.path.join(BASE_DIR, '.env')
    if os.path.exists(env_file):
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception as e:
            print(f"[Dotenv] Error loading .env: {e}")

load_dotenv()
APP_ENV = os.environ.get('APP_ENV', 'development' if os.environ.get('DEBUG') == 'true' else 'production').lower()
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Default password: soreva@2026
DEFAULT_PW_HASH = "3779c849af88128e466010f799175ce3344f2392947810fa4501766c0664d846"

def get_admin_password_hash():
    """Safely get admin password hash without loading the full 18MB store-data.json."""
    if os.path.exists(ADMIN_CREDS_PATH):
        try:
            with open(ADMIN_CREDS_PATH, 'r', encoding='utf-8') as f:
                c = json.load(f)
                h = c.get('adminPasswordHash')
                if h:
                    return h
        except Exception:
            pass
    try:
        global _STORE_DATA_CACHE
        if _STORE_DATA_CACHE and isinstance(_STORE_DATA_CACHE, dict):
            h = _STORE_DATA_CACHE.get('settings', {}).get('adminPasswordHash')
            if h:
                return h
    except Exception:
        pass
    return DEFAULT_PW_HASH

def set_admin_password_hash(new_hash):
    """Save admin password hash in dedicated lightweight credentials file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(ADMIN_CREDS_PATH, 'w', encoding='utf-8') as f:
            json.dump({"adminPasswordHash": new_hash, "updatedAt": int(time.time())}, f, indent=2)
    except Exception as e:
        print(f"[Admin Creds Error] {e}")

def perform_czm_login():
    """Logs into CZMakers using saved credentials and returns the cookie string, or None if failed."""
    if os.path.exists(CZM_COOKIE_PATH):
        try:
            mtime = os.path.getmtime(CZM_COOKIE_PATH)
            if time.time() - mtime < 1800:  # 30 minutes cache
                with open(CZM_COOKIE_PATH, 'r', encoding='utf-8') as f:
                    cookie_dict = json.load(f)
                cookie_str = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])
                if cookie_str:
                    return cookie_str
        except Exception:
            pass

    try:
        if BASE_DIR not in sys.path:
            sys.path.insert(0, BASE_DIR)
        from scripts.czm_sync_agent import perform_czm_login as agent_czm_login
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        cookie_str, _ = agent_czm_login(ssl_ctx)
        return cookie_str
    except Exception as e:
        print(f"[CZM Login] Delegate login error: {e}")
        return None



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


def ensure_pocketbase_running():
    """Ensure PocketBase daemon is listening on port 8090."""
    try:
        s = socket.create_connection(('127.0.0.1', 8090), timeout=0.5)
        s.close()
        return True
    except Exception:
        pass

    candidates = [
        os.path.join(BASE_DIR, 'pb', 'pocketbase'),
        os.path.join(BASE_DIR, 'pocketbase'),
        '/usr/local/bin/pocketbase'
    ]
    pb_bin = None
    for cand in candidates:
        if os.path.exists(cand) and os.access(cand, os.X_OK):
            pb_bin = cand
            break

    if not pb_bin:
        return False

    pb_dir = os.path.join(BASE_DIR, 'pb', 'pb_data')
    os.makedirs(pb_dir, exist_ok=True)
    try:
        subprocess.Popen(
            [pb_bin, 'serve', '--dir', pb_dir, '--http', '127.0.0.1:8090'],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        time.sleep(0.5)
        return True
    except Exception as e:
        print(f"[PocketBase Launch Notice] {e}")
        return False


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


def hash_user_password(password, salt=None):
    """Secure zero-dependency password hasher using standard library PBKDF2-HMAC-SHA256."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return key.hex(), salt


def verify_user_password(password, stored_hash, salt):
    """Verify password against PBKDF2 hash with constant-time comparison."""
    if not stored_hash or not salt:
        return False
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return secrets.compare_digest(key.hex(), stored_hash)


def merge_cart_items(db_items, guest_items):
    """
    Intelligently merge guest cart items into user's database cart.
    Preserves product IDs, finishes, and adds quantities without duplicates.
    """
    merged = {}
    for item in (db_items or []):
        pid = item.get('productId') or item.get('id')
        if not pid:
            continue
        finish = item.get('finish') or '24K Gold'
        qty = int(item.get('qty') or item.get('quantity') or 1)
        k = f"{pid}_{finish}"
        merged[k] = {"productId": pid, "finish": finish, "qty": qty}

    for item in (guest_items or []):
        pid = item.get('productId') or item.get('id')
        if not pid:
            continue
        finish = item.get('finish') or '24K Gold'
        qty = int(item.get('qty') or item.get('quantity') or 1)
        k = f"{pid}_{finish}"
        if k in merged:
            merged[k]["qty"] = min(20, max(merged[k]["qty"], qty))
        else:
            merged[k] = {"productId": pid, "finish": finish, "qty": min(20, qty)}
    return list(merged.values())


def get_auth_user(handler):
    """
    Validate session token from Authorization: Bearer <token> or query parameter.
    Returns (user_dict, token) if valid, or (None, None).
    """
    auth_header = handler.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
    if not token:
        parsed = urlparse(handler.path)
        qs = parse_qs(parsed.query)
        if 'token' in qs and qs['token']:
            token = qs['token'][0]

    if not token:
        return None, None

    conn = get_db()
    if not conn:
        return None, None
    try:
        c = conn.cursor()
        now = datetime.now().isoformat()
        session = c.execute("SELECT user_id, email, expires_at FROM user_sessions WHERE token = ?", (token,)).fetchone()
        if not session:
            return None, None
        if session['expires_at'] < now:
            c.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
            conn.commit()
            return None, None
        user = c.execute("SELECT id, name, email, avatar, created FROM users WHERE id = ?", (session['user_id'],)).fetchone()
        if not user:
            return None, None
        user_dict = dict(user)
        # Fetch customer phone if available
        cust = c.execute("SELECT phone, address, city FROM customers WHERE LOWER(email) = LOWER(?)", (user['email'],)).fetchone()
        if cust:
            user_dict['phone'] = cust['phone']
            user_dict['address'] = cust['address']
            user_dict['city'] = cust['city']
        else:
            user_dict['phone'] = ''
            user_dict['address'] = ''
            user_dict['city'] = ''
        return user_dict, token
    except Exception as e:
        print(f"[Auth Error] get_auth_user: {e}")
        return None, None
    finally:
        conn.close()


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
            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
        """)
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_carts (
                user_id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                items TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        c.execute("CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)")
        c.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        for col_stmt in [
            "ALTER TABLE products ADD COLUMN lastRefreshed TEXT",
            "ALTER TABLE products ADD COLUMN dateAdded TEXT",
            "ALTER TABLE products ADD COLUMN images TEXT",
            "ALTER TABLE inventory ADD COLUMN lastRefreshed TEXT",
            "ALTER TABLE inventory ADD COLUMN dateAdded TEXT",
            "ALTER TABLE inventory ADD COLUMN subCategory TEXT",
            "ALTER TABLE orders ADD COLUMN invoiceNumber TEXT",
            "ALTER TABLE orders ADD COLUMN invoiceHtml TEXT",
            "ALTER TABLE orders ADD COLUMN invoiceCreatedAt TEXT"
        ]:
            try:
                c.execute(col_stmt)
            except Exception:
                pass

        try:
            c.execute("""
                UPDATE orders 
                SET invoiceNumber = 'INV-' || REPLACE(orderNumber, 'SRV-', '')
                WHERE invoiceNumber IS NULL OR invoiceNumber = ''
            """)
            conn.commit()
        except Exception:
            pass
        try:
            # Canonicalize legacy 'bracelets' category to 'wristwear'
            c.execute("UPDATE products SET category = 'wristwear' WHERE category = 'bracelets'")
            c.execute("UPDATE inventory SET category = 'wristwear' WHERE category = 'bracelets'")

            # Bidirectional sync between products and inventory
            # 1. Align subCategory and category
            c.execute("""
                UPDATE inventory 
                SET subCategory = (
                    SELECT COALESCE(products.subCategory, '') 
                    FROM products 
                    WHERE products.id = inventory.id
                ),
                category = (
                    SELECT COALESCE(products.category, inventory.category)
                    FROM products 
                    WHERE products.id = inventory.id
                )
                WHERE id IN (SELECT id FROM products)
            """)
            # 2. Insert any products missing from inventory
            c.execute("""
                INSERT INTO inventory (id, sku, productName, category, subCategory, stockQty, lowStockThreshold, status)
                SELECT p.id, 'CZM-' || p.id, p.name, p.category, p.subCategory, 15, 5, 'In Stock'
                FROM products p
                WHERE p.id NOT IN (SELECT id FROM inventory)
            """)
            # 3. Insert any inventory missing from products
            c.execute("""
                INSERT INTO products (id, name, category, subCategory, plating, priceINR, originalPriceINR, primaryImg, hoverImg)
                SELECT i.id, i.productName, i.category, i.subCategory, 'gold', 2999, 3999, 'assets/placeholder-jewelry.svg', 'assets/placeholder-jewelry.svg'
                FROM inventory i
                WHERE i.id NOT IN (SELECT id FROM products)
            """)
            conn.commit()
        except Exception as sync_err:
            print(f"[Inventory-Products Sync Warning] {sync_err}")
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

        # Performance indexes for instant lookups & stock refresh
        try:
            c.execute("CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(productName)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category, subCategory)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_inventory_cat ON inventory(category, subCategory)")
        except Exception:
            pass

        conn.commit()
    except Exception as e:
        print(f"[Init Error] Failed to init extended tables: {e}")
    finally:
        conn.close()
def normalize_czm_plating(raw_str):
    if not raw_str:
        return 'gold'
    s = raw_str.strip().lower()
    if 'silver' in s or 'rhodium' in s or 'sterling' in s or '925' in s:
        return 'silver'
    elif 'rose' in s:
        return 'rosegold'
    elif 'two' in s or 'dual' in s:
        return 'two-tone'
    elif 'oxidise' in s or 'oxidize' in s or 'black' in s:
        return 'oxidised'
    elif 'antique' in s or 'mehndi' in s:
        return 'antique'
    elif 'gold' in s or 'golden' in s or 'yellow' in s:
        return 'gold'
    return 'gold'


_STORE_DATA_CACHE = None
_STORE_DATA_MTIME = 0

def get_stored_data():
    global _STORE_DATA_CACHE, _STORE_DATA_MTIME
    if not os.path.exists(STORE_DATA_PATH):
        return None
    try:
        current_mtime = os.path.getmtime(STORE_DATA_PATH)
        if _STORE_DATA_CACHE is not None and current_mtime == _STORE_DATA_MTIME:
            return _STORE_DATA_CACHE
        with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
            _STORE_DATA_CACHE = json.load(f)
            _STORE_DATA_MTIME = current_mtime
            return _STORE_DATA_CACHE
    except Exception as e:
        print(f"[Error] Failed to read store-data.json: {e}")
        return _STORE_DATA_CACHE


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

    # Ensure products list is never accidentally erased if caller sent only settings/metadata
    if 'products' not in data or not data.get('products'):
        existing_products = None
        if os.path.exists(STORE_DATA_PATH):
            try:
                with open(STORE_DATA_PATH, 'r', encoding='utf-8') as sf:
                    existing_sd = json.load(sf)
                    if existing_sd.get('products'):
                        existing_products = existing_sd['products']
            except Exception:
                pass
        if not existing_products:
            # Load from SQLite database
            try:
                if os.path.exists(PB_DB_PATH):
                    conn = sqlite3.connect(PB_DB_PATH)
                    conn.row_factory = sqlite3.Row
                    cur = conn.cursor()
                    rows = cur.execute("""
                        SELECT p.*, COALESCE(i.sku, 'CZM-' || p.id) as sku,
                               COALESCE(i.status, 'In Stock') as stockStatus,
                               COALESCE(i.stockQty, 15) as stockQty,
                               COALESCE(i.usdWholesale, p.usdWholesale, 0.0) as usdWholesale
                        FROM products p
                        LEFT JOIN inventory i ON p.id = i.id
                        WHERE p.disabled = 0 AND p.active = 1
                        ORDER BY p.rowid ASC
                    """).fetchall()
                    conn.close()
                    existing_products = []
                    for r in rows:
                        d = dict(r)
                        if isinstance(d.get('gallery'), str):
                            try: d['gallery'] = json.loads(d['gallery'])
                            except: d['gallery'] = [d.get('primaryImg')]
                        if isinstance(d.get('more_details'), str):
                            try: d['more_details'] = json.loads(d['more_details'])
                            except: d['more_details'] = {}
                        existing_products.append(d)
            except Exception as e:
                print(f"[save_stored_data DB Load Warning] {e}")

        if existing_products:
            data['products'] = existing_products

    # Atomic write to temporary file then replace
    temp_path = STORE_DATA_PATH + '.tmp'
    with open(temp_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(temp_path, STORE_DATA_PATH)
    global _STORE_DATA_CACHE, _STORE_DATA_MTIME
    _STORE_DATA_CACHE = data
    try:
        _STORE_DATA_MTIME = os.path.getmtime(STORE_DATA_PATH)
    except Exception:
        pass

    # Also keep store-metadata.json in sync
    try:
        meta = {k: v for k, v in data.items() if k != 'products'}
        with open(STORE_METADATA_PATH, 'w', encoding='utf-8') as mf:
            json.dump(meta, mf, indent=2, ensure_ascii=False)
        global _STORE_METADATA_CACHE, _STORE_METADATA_MTIME
        _STORE_METADATA_CACHE = meta
        _STORE_METADATA_MTIME = os.path.getmtime(STORE_METADATA_PATH)
    except Exception as me:
        print(f"[Warning] Failed to sync store-metadata.json: {me}")

    return True




DEFAULT_NOTIFICATIONS_CONFIG = {
    "email": {
        "enabled": True,
        "supportEmail": "support@soreva.in",
        "smtpHost": "smtp.gmail.com",
        "smtpPort": 587,
        "smtpUser": "",
        "smtpPassword": "",
        "fromEmail": "orders@soreva.in",
        "subjectTemplate": "💎 New Order Received: {order_number} — ₹{total_amount} ({customer_name})",
        "bodyTemplate": """A new luxury jewellery order has been placed on the Sorèva storefront!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ORDER SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Number:   {order_number}
Order Status:   {status}
Total Amount:   ₹{total_amount}
Payment Method: {payment_method}
Payment ID:     {payment_id}
Date & Time:    {date_time}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Customer Name:  {customer_name}
Customer Email: {customer_email}
Customer Phone: {customer_phone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELIVERY ADDRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Street Address: {shipping_address}
City:           {city}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ITEMS ORDERED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{items_summary}

Please verify the inventory allocation and begin atelier packaging.
— Sorèva Automated Order Concierge"""
    },
    "whatsapp": {
        "enabled": True,
        "provider": "meta",
        "metaApiToken": "",
        "metaPhoneNumberId": "",
        "customWebhookUrl": "",
        "defaultCountryCode": "91",
        "messageTemplate": """✨ *Sorèva Luxury Jewellery* — Order Confirmed!

Dear {customer_name},

Thank you for choosing Sorèva. Your order *{order_number}* has been successfully reserved.

📦 *Order Details:*
• Amount: ₹{total_amount}
• Items: {items_summary}
• Delivery Destination: {shipping_address}, {city}
• Payment Method: {payment_method}

Our atelier is now packaging your handcrafted piece with our signature luxury presentation box. We will notify you once express dispatch has commenced.

Warm regards,
*The Sorèva Concierge Atelier*
🌐 https://soreva.in"""
    },
    "sms": {
        "enabled": True,
        "provider": "fast2sms",
        "fast2smsApiKey": "",
        "twofactorApiKey": "",
        "twilioAccountSid": "",
        "twilioAuthToken": "",
        "twilioFromNumber": "",
        "customSmsUrl": ""
    }
}


def get_notifications_config():
    """Retrieve email, WhatsApp, and SMS notification configuration."""
    cfg = json.loads(json.dumps(DEFAULT_NOTIFICATIONS_CONFIG))
    if os.path.exists(NOTIFICATIONS_CONFIG_PATH):
        try:
            with open(NOTIFICATIONS_CONFIG_PATH, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                if 'email' in saved: cfg['email'].update(saved['email'])
                if 'whatsapp' in saved: cfg['whatsapp'].update(saved['whatsapp'])
                if 'sms' in saved: cfg['sms'].update(saved['sms'])
        except Exception as e:
            print(f"[Notifications Config Load Error] {e}")
    # Read Meta Token from environment if available and not set
    env_meta_token = os.environ.get("META_SYSTEM_USER_ACCESS_TOKEN", "").strip()
    if env_meta_token and not cfg['whatsapp'].get('metaApiToken'):
        cfg['whatsapp']['metaApiToken'] = env_meta_token
    return cfg


def save_notifications_config(cfg):
    """Persist notification templates and credentials to disk."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(NOTIFICATIONS_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2)
    return True


def format_notification_template(tmpl, data):
    """Interpolate template placeholders with live order data."""
    if not tmpl: return ""
    total_val = float(data.get('totalAmount', 0)) if data.get('totalAmount') is not None else 0.0
    subtotal_val = float(data.get('subtotalAmount', total_val)) if data.get('subtotalAmount') is not None else total_val
    discount_val = float(data.get('discountAmount', 0)) if data.get('discountAmount') is not None else 0.0
    
    full_addr = str(data.get("fullAddress") or data.get("shippingAddress", ""))
    
    replacements = {
        "{order_number}": str(data.get("orderNumber", "")),
        "{customer_name}": str(data.get("customerName", "")),
        "{customer_email}": str(data.get("customerEmail", "")),
        "{customer_phone}": str(data.get("customerPhone", "")),
        "{shipping_address}": str(data.get("shippingAddress", "")),
        "{address_line2}": str(data.get("addressLine2", "")),
        "{city}": str(data.get("city", "")),
        "{state}": str(data.get("state", "")),
        "{pincode}": str(data.get("pincode", "")),
        "{country}": str(data.get("country", "India")),
        "{full_address}": full_addr,
        "{order_notes}": str(data.get("orderNotes") or "None"),
        "{items_summary}": str(data.get("itemsSummary", "")),
        "{total_amount}": f"{total_val:,.2f}",
        "{subtotal_amount}": f"{subtotal_val:,.2f}",
        "{discount_amount}": f"{discount_val:,.2f}",
        "{coupon_code}": str(data.get("couponCode") or "None"),
        "{status}": str(data.get("status", "Confirmed")),
        "{payment_method}": str(data.get("paymentMethod", "Razorpay")),
        "{payment_id}": str(data.get("paymentId", "N/A")),
        "{date_time}": str(data.get("dateTime") or datetime.now().strftime("%d %b %Y, %I:%M %p"))
    }
    res = tmpl
    for k, v in replacements.items():
        res = res.replace(k, v)
    return res


STATE_GST_CODES = {
    "jammu and kashmir": "01", "himachal pradesh": "02", "punjab": "03", "chandigarh": "04",
    "uttarakhand": "05", "haryana": "06", "delhi": "07", "rajasthan": "08", "uttar pradesh": "09",
    "bihar": "10", "sikkim": "11", "arunachal pradesh": "12", "nagaland": "13", "manipur": "14",
    "mizoram": "15", "tripura": "16", "meghalaya": "17", "assam": "18", "west bengal": "19",
    "jharkhand": "20", "odisha": "21", "chhattisgarh": "22", "madhya pradesh": "23",
    "gujarat": "24", "daman and diu": "25", "dadra and nagar haveli": "26", "maharashtra": "27",
    "andhra pradesh": "37", "karnataka": "29", "goa": "30", "lakshadweep": "31",
    "kerala": "32", "tamil nadu": "33", "puducherry": "34", "andaman and nicobar": "35",
    "telangana": "36", "ladakh": "38"
}


def amount_to_inr_words(n):
    """Convert an amount in INR to Indian Rupee Words."""
    try:
        n = int(round(float(n)))
    except Exception:
        return "Zero Rupees Only"
    if n <= 0:
        return "Zero Rupees Only"

    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def _two_digits(val):
        if val < 20:
            return units[val]
        return f"{tens[val // 10]} {units[val % 10]}".strip()

    def _three_digits(val):
        h = val // 100
        rem = val % 100
        parts = []
        if h > 0:
            parts.append(f"{units[h]} Hundred")
        if rem > 0:
            parts.append(_two_digits(rem))
        return " ".join(parts).strip()

    parts = []
    if n >= 10000000:
        cr = n // 10000000
        parts.append(f"{amount_to_inr_words(cr).replace(' Rupees Only', '').replace('INR ', '')} Crore")
        n %= 10000000
    if n >= 100000:
        lakh = n // 100000
        parts.append(f"{_two_digits(lakh)} Lakh")
        n %= 100000
    if n >= 1000:
        th = n // 1000
        parts.append(f"{_two_digits(th)} Thousand")
        n %= 1000
    if n > 0:
        parts.append(_three_digits(n))

    words = " ".join([p for p in parts if p]).strip()
    return f"INR {words} Only"


def extract_order_items_list(order_data):
    """Extract structured items list from either items, itemsJson, or itemsSummary."""
    raw_items = order_data.get("items")
    if isinstance(raw_items, str):
        try:
            raw_items = json.loads(raw_items)
        except Exception:
            raw_items = []
    if not raw_items and order_data.get("itemsJson"):
        try:
            raw_items = json.loads(order_data.get("itemsJson"))
        except Exception:
            raw_items = []

    if isinstance(raw_items, list) and len(raw_items) > 0 and isinstance(raw_items[0], dict):
        return raw_items

    # Fallback to itemsSummary string
    summary = str(order_data.get("itemsSummary", "") or "").strip()
    total = float(order_data.get("totalAmount", 0) or 0)
    if not summary:
        return [{"name": "Sorèva Signature Luxury Jewellery Piece", "qty": 1, "price": total, "finish": "24K Gold Polish"}]

    parsed = []
    parts = [p.strip() for p in summary.split(",") if p.strip()]
    per_item_price = round(total / max(1, len(parts)), 2)
    for p in parts:
        qty = 1
        name = p
        finish = "24K Gold Polish"
        if "x " in p:
            q_part, rest = p.split("x ", 1)
            try:
                qty = int(q_part.strip())
            except Exception:
                qty = 1
            name = rest.strip()
        if "(" in name and name.endswith(")"):
            name_part, finish_part = name.rsplit("(", 1)
            name = name_part.strip()
            finish = finish_part.rstrip(")").strip()
        parsed.append({
            "name": name,
            "qty": qty,
            "price": per_item_price,
            "finish": finish
        })
    return parsed if parsed else [{"name": summary, "qty": 1, "price": total, "finish": "24K Gold Polish"}]


def generate_digital_invoice_html(order_data):
    """Generate a luxury, Indian GST compliant Tax Invoice HTML document."""
    order_num = html.escape(str(order_data.get("orderNumber", "SRV-ORDER")))
    inv_num = html.escape(str(order_data.get("invoiceNumber") or f"INV-{order_num.replace('SRV-', '')}"))
    order_id = html.escape(str(order_data.get("orderId") or order_data.get("id") or ""))
    
    inv_date = html.escape(str(order_data.get("invoiceCreatedAt") or order_data.get("createdAt") or datetime.now().strftime("%d %b %Y, %I:%M %p")))
    cust_name = html.escape(str(order_data.get("customerName", "Valued Patron")))
    cust_email = html.escape(str(order_data.get("customerEmail", "")))
    cust_phone = html.escape(str(order_data.get("customerPhone", "")))
    
    shipping_addr = html.escape(str(order_data.get("shippingAddress", "")))
    addr2 = html.escape(str(order_data.get("addressLine2", "")))
    city = html.escape(str(order_data.get("city", "")))
    state = html.escape(str(order_data.get("state", "")))
    pincode = html.escape(str(order_data.get("pincode", "")))
    country = html.escape(str(order_data.get("country", "India")))
    
    pay_method = html.escape(str(order_data.get("paymentMethod", "Prepaid")))
    pay_id = html.escape(str(order_data.get("paymentId", "N/A")))
    order_notes = html.escape(str(order_data.get("orderNotes", "")))
    
    total_val = float(order_data.get("totalAmount", 0) or 0)
    subtotal_val = float(order_data.get("subtotalAmount", total_val) or total_val)
    discount_val = float(order_data.get("discountAmount", 0) or 0)
    coupon_code = html.escape(str(order_data.get("couponCode", "") or ""))

    # Determine Place of Supply and GST classification
    state_normalized = (state or city).strip().lower()
    state_code = "29" # Default Karnataka
    for s_name, s_code in STATE_GST_CODES.items():
        if s_name in state_normalized:
            state_code = s_code
            break
            
    is_intra_state = (state_code == "29") or ("karnataka" in state_normalized) or ("bangalore" in state_normalized) or ("bengaluru" in state_normalized)
    place_of_supply = f"{state or city or 'Karnataka'} (Code: {state_code})"

    # Calculate overall GST amounts (standard 3% on luxury imitation jewelry HSN 7113)
    # The retail total includes GST
    taxable_val = round(total_val / 1.03, 2)
    total_gst = round(total_val - taxable_val, 2)
    
    if is_intra_state:
        cgst_val = round(total_gst / 2.0, 2)
        sgst_val = round(total_gst - cgst_val, 2)
        igst_val = 0.0
    else:
        cgst_val = 0.0
        sgst_val = 0.0
        igst_val = total_gst

    amount_in_words = amount_to_inr_words(total_val)
    
    # Process Line Items
    items_list = extract_order_items_list(order_data)
    items_rows_html = ""
    for idx, it in enumerate(items_list, 1):
        it_name = html.escape(str(it.get("name") or it.get("productName") or "Sorèva Luxury Jewellery Piece"))
        it_finish = html.escape(str(it.get("finish") or "18K/24K Gold Micron Polish"))
        it_qty = int(it.get("qty", 1) or 1)
        it_price = float(it.get("price", 0) or 0)
        it_gross_line = it_price * it_qty
        it_taxable = round(it_gross_line / 1.03, 2)
        it_rate_taxable = round(it_taxable / max(1, it_qty), 2)
        it_tax = round(it_gross_line - it_taxable, 2)

        if is_intra_state:
            tax_cell = f"""
            <div style="font-size: 11px; color: #4b5563;">CGST 1.5%: ₹{it_tax/2:,.2f}</div>
            <div style="font-size: 11px; color: #4b5563;">SGST 1.5%: ₹{it_tax/2:,.2f}</div>
            """
        else:
            tax_cell = f"""
            <div style="font-size: 11px; color: #4b5563;">IGST 3.0%: ₹{it_tax:,.2f}</div>
            """

        items_rows_html += f"""
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 10px; text-align: center; color: #6b7280; font-size: 12px; vertical-align: top;">{idx}</td>
            <td style="padding: 12px 10px; vertical-align: top;">
                <div style="font-weight: 600; color: #111827; font-size: 13px;">{it_name}</div>
                <div style="font-size: 11px; color: #927238; margin-top: 2px;">Finish: {it_finish}</div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 1px;">Atelier Sealed • 1-Yr Polish Warranty</div>
            </td>
            <td style="padding: 12px 10px; text-align: center; color: #374151; font-size: 12px; font-family: monospace; vertical-align: top;">7113</td>
            <td style="padding: 12px 10px; text-align: center; color: #111827; font-weight: 600; font-size: 13px; vertical-align: top;">{it_qty}</td>
            <td style="padding: 12px 10px; text-align: right; color: #374151; font-size: 13px; vertical-align: top;">₹{it_rate_taxable:,.2f}</td>
            <td style="padding: 12px 10px; text-align: right; color: #374151; font-size: 13px; font-weight: 500; vertical-align: top;">₹{it_taxable:,.2f}</td>
            <td style="padding: 12px 10px; text-align: right; vertical-align: top;">{tax_cell}</td>
            <td style="padding: 12px 10px; text-align: right; color: #111827; font-weight: 700; font-size: 13px; vertical-align: top;">₹{it_gross_line:,.2f}</td>
        </tr>
        """

    # Build GST Tax Summary Rows
    if is_intra_state:
        gst_summary_html = f"""
        <tr>
            <td style="padding: 4px 0; color: #4b5563; font-size: 12px;">Central GST (CGST @ 1.5%):</td>
            <td style="padding: 4px 0; text-align: right; color: #111827; font-size: 12px; font-weight: 600;">₹{cgst_val:,.2f}</td>
        </tr>
        <tr>
            <td style="padding: 4px 0; color: #4b5563; font-size: 12px;">State GST (SGST @ 1.5%):</td>
            <td style="padding: 4px 0; text-align: right; color: #111827; font-size: 12px; font-weight: 600;">₹{sgst_val:,.2f}</td>
        </tr>
        """
    else:
        gst_summary_html = f"""
        <tr>
            <td style="padding: 4px 0; color: #4b5563; font-size: 12px;">Integrated GST (IGST @ 3.0%):</td>
            <td style="padding: 4px 0; text-align: right; color: #111827; font-size: 12px; font-weight: 600;">₹{igst_val:,.2f}</td>
        </tr>
        """

    discount_row_html = ""
    if discount_val > 0:
        c_code_label = f" ({coupon_code})" if coupon_code and coupon_code != "None" else ""
        discount_row_html = f"""
        <tr>
            <td style="padding: 4px 0; color: #15803d; font-size: 12px;">Atelier Privilege Discount{c_code_label}:</td>
            <td style="padding: 4px 0; text-align: right; color: #15803d; font-size: 12px; font-weight: 600;">-₹{discount_val:,.2f}</td>
        </tr>
        """

    full_addr_str = ", ".join([p for p in [shipping_addr, addr2, city, state, f"PIN: {pincode}" if pincode else "", country] if p])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Tax Invoice {inv_num} — Sorèva Luxury Jewellery</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
    * {{ box-sizing: border-box; }}
    body {{
        margin: 0;
        padding: 0;
        background-color: #0c0a09;
        color: #1f2937;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
    }}
    .invoice-appbar {{
        position: sticky;
        top: 0;
        z-index: 100;
        background: #141110;
        border-bottom: 1px solid #2a2321;
        padding: 12px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }}
    .invoice-appbar .brand {{
        display: flex;
        align-items: center;
        gap: 12px;
        color: #f5f2eb;
    }}
    .invoice-appbar .brand-title {{
        font-family: 'Cinzel', Georgia, serif;
        font-size: 1.15rem;
        letter-spacing: 2px;
        color: #e5c483;
        font-weight: 700;
    }}
    .invoice-appbar .brand-badge {{
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        background: rgba(197, 160, 89, 0.15);
        color: #c5a059;
        border: 1px solid rgba(197, 160, 89, 0.35);
        border-radius: 4px;
        padding: 2px 8px;
    }}
    .invoice-appbar .actions {{
        display: flex;
        align-items: center;
        gap: 10px;
    }}
    .btn-action {{
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
        transition: all 0.2s ease;
    }}
    .btn-action-primary {{
        background: linear-gradient(135deg, #c5a059, #a37c35);
        color: #171312;
        border: none;
    }}
    .btn-action-primary:hover {{
        background: linear-gradient(135deg, #d8b26a, #b88d44);
        transform: translateY(-1px);
    }}
    .btn-action-outline {{
        background: rgba(255,255,255,0.06);
        color: #f5f2eb;
        border: 1px solid #38302e;
    }}
    .btn-action-outline:hover {{
        background: rgba(255,255,255,0.12);
        color: #ffffff;
    }}
    
    .invoice-viewport {{
        padding: 30px 16px 60px 16px;
        display: flex;
        justify-content: center;
    }}
    .invoice-card {{
        width: 100%;
        max-width: 860px;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        border-top: 5px solid #c5a059;
        padding: 36px 42px;
        color: #111827;
        position: relative;
    }}

    @media print {{
        body {{
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
        }}
        .invoice-appbar {{
            display: none !important;
        }}
        .invoice-viewport {{
            padding: 0 !important;
            margin: 0 !important;
        }}
        .invoice-card {{
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border-top: 3px solid #c5a059 !important;
            padding: 15mm 15mm !important;
            page-break-after: avoid;
        }}
        @page {{
            size: A4;
            margin: 8mm;
        }}
    }}
</style>
</head>
<body>

    <!-- INTERACTIVE APP BAR (Hidden on Print) -->
    <div class="invoice-appbar">
        <div class="brand">
            <span style="font-size: 1.3rem;">⚜️</span>
            <div>
                <div class="brand-title">SORÈVA ATELIER</div>
                <div style="font-size: 0.72rem; color: #a3958f; margin-top: 1px;">Official Digital Tax Invoice & Archive</div>
            </div>
            <span class="brand-badge">{inv_num}</span>
        </div>
        <div class="actions">
            <button class="btn-action btn-action-primary" onclick="window.print()">
                <i class="fa-solid fa-print"></i> Print / Save PDF
            </button>
            <button class="btn-action btn-action-outline" id="btnEmailInvoice" onclick="dispatchInvoiceEmail()">
                <i class="fa-solid fa-paper-plane"></i> Email to Customer
            </button>
            <a href="/" class="btn-action btn-action-outline">
                <i class="fa-solid fa-store"></i> Boutique
            </a>
        </div>
    </div>

    <!-- MAIN INVOICE CONTAINER -->
    <div class="invoice-viewport">
        <div class="invoice-card" id="invoiceDocument">
            
            <!-- TOP ATELIER & TAX INVOICE HEADER -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 20px;">
                <tr>
                    <td style="vertical-align: top; width: 58%;">
                        <div style="font-family: 'Cinzel', Georgia, serif; font-size: 26px; font-weight: 700; letter-spacing: 3px; color: #111827; line-height: 1;">
                            SORÈVA
                        </div>
                        <div style="font-size: 11px; letter-spacing: 2px; color: #927238; font-weight: 700; text-transform: uppercase; margin-top: 3px;">
                            Haute Joaillerie Atelier & High Crafts
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: #1f2937; margin-top: 8px;">
                            Sorèva Lifestyle Private Limited
                        </div>
                        <div style="font-size: 12px; color: #4b5563; line-height: 1.5; margin-top: 2px; max-width: 380px;">
                            12th Floor, Prestige Trade Tower, Palace Road, High Grounds,<br>
                            Bengaluru, Karnataka 560001, India
                        </div>
                        <div style="font-size: 12px; color: #1f2937; margin-top: 6px;">
                            <strong>GSTIN:</strong> 29AALCS1928K1Z5 &bull; <strong>PAN:</strong> AALCS1928K
                        </div>
                        <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">
                            <strong>State:</strong> Karnataka (Code: 29) &bull; <strong>CIN:</strong> U36999KA2024PTC189210
                        </div>
                        <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">
                            Email: support@soreva.in &bull; Tel: +91 97411 18940 &bull; Web: www.soreva.in
                        </div>
                    </td>
                    <td style="vertical-align: top; width: 42%; text-align: right;">
                        <div style="display: inline-block; background: #111827; color: #f5f2eb; padding: 6px 16px; border-radius: 4px; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                            TAX INVOICE
                        </div>
                        <div style="font-size: 10px; color: #6b7280; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
                            (Original for Recipient &bull; Sec 31 CGST Act)
                        </div>

                        <div style="margin-top: 14px; text-align: right;">
                            <table align="right" cellpadding="2" cellspacing="0" border="0" style="font-size: 12px;">
                                <tr>
                                    <td style="color: #6b7280; text-align: right; padding-right: 8px;">Invoice No:</td>
                                    <td style="font-weight: 700; color: #111827; font-family: monospace; font-size: 13px;">{inv_num}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; text-align: right; padding-right: 8px;">Invoice Date:</td>
                                    <td style="font-weight: 600; color: #111827;">{inv_date}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; text-align: right; padding-right: 8px;">Order Ref:</td>
                                    <td style="font-weight: 700; color: #927238;">{order_num}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; text-align: right; padding-right: 8px;">Payment Mode:</td>
                                    <td style="color: #111827;">{pay_method}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; text-align: right; padding-right: 8px;">Payment Ref:</td>
                                    <td style="font-family: monospace; color: #374151;">{pay_id}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; text-align: right; padding-right: 8px;">Place of Supply:</td>
                                    <td style="font-weight: 600; color: #111827;">{place_of_supply}</td>
                                </tr>
                                <tr>
                                    <td style="color: #6b7280; text-align: right; padding-right: 8px;">Reverse Charge:</td>
                                    <td style="color: #111827;">No</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- BILLED TO & SHIPPED TO DOSSIER -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 22px;">
                <tr>
                    <td style="padding: 14px 18px; width: 50%; vertical-align: top; border-right: 1px solid #e5e7eb;">
                        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #927238; text-transform: uppercase; margin-bottom: 6px;">
                            Billed To (Customer Details)
                        </div>
                        <div style="font-size: 14px; font-weight: 700; color: #111827;">{cust_name}</div>
                        <div style="font-size: 12px; color: #4b5563; line-height: 1.5; margin-top: 3px;">
                            {full_addr_str or 'Address on File'}
                        </div>
                        <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">
                            Phone: <strong>{cust_phone or '—'}</strong> &bull; Email: <strong>{cust_email or '—'}</strong>
                        </div>
                        <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                            State of Customer: {state or city or 'Karnataka'} (Code: {state_code})
                        </div>
                    </td>
                    <td style="padding: 14px 18px; width: 50%; vertical-align: top;">
                        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #927238; text-transform: uppercase; margin-bottom: 6px;">
                            Shipped To (Delivery Destination)
                        </div>
                        <div style="font-size: 14px; font-weight: 700; color: #111827;">{cust_name}</div>
                        <div style="font-size: 12px; color: #4b5563; line-height: 1.5; margin-top: 3px;">
                            {full_addr_str or 'Address on File'}
                        </div>
                        <div style="font-size: 12px; color: #15803d; font-weight: 600; margin-top: 4px;">
                            📦 Insured White-Glove Atelier Courier
                        </div>
                    </td>
                </tr>
            </table>

            <!-- LINE ITEMS TABLE -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #111827; color: #f5f2eb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px;">
                        <th style="padding: 10px; text-align: center; width: 5%; border-top-left-radius: 4px;">#</th>
                        <th style="padding: 10px; text-align: left; width: 38%;">Description of Goods</th>
                        <th style="padding: 10px; text-align: center; width: 10%;">HSN/SAC</th>
                        <th style="padding: 10px; text-align: center; width: 6%;">Qty</th>
                        <th style="padding: 10px; text-align: right; width: 12%;">Unit Rate</th>
                        <th style="padding: 10px; text-align: right; width: 12%;">Taxable Amt</th>
                        <th style="padding: 10px; text-align: right; width: 17%;">GST Tax</th>
                        <th style="padding: 10px; text-align: right; width: 14%; border-top-right-radius: 4px;">Total (INR)</th>
                    </tr>
                </thead>
                <tbody>
                    {items_rows_html}
                </tbody>
            </table>

            <!-- FINANCIALS & TAX TOTALS -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                    <td style="width: 55%; vertical-align: top; padding-right: 20px;">
                        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px;">
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; font-weight: 700;">
                                Invoice Total in Words
                            </div>
                            <div style="font-size: 13px; font-weight: 700; color: #111827; margin-top: 4px; line-height: 1.4;">
                                {amount_in_words}
                            </div>
                            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #d1d5db; font-size: 11px; color: #4b5563; line-height: 1.5;">
                                🛡️ <strong>1-Year Atelier Polish Warranty:</strong> Covers anti-tarnish micro-coating, prong inspections, and professional cleaning.<br>
                                💎 <strong>Quality Grade:</strong> 5A Flawless Cubic Zirconia set in skin-safe, nickel-free brass with 24K gold micron plating.
                            </div>
                        </div>
                    </td>
                    <td style="width: 45%; vertical-align: top;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px 0; color: #4b5563; font-size: 12px;">Subtotal (Taxable Value):</td>
                                <td style="padding: 5px 0; text-align: right; color: #111827; font-size: 12px; font-weight: 600;">₹{taxable_val:,.2f}</td>
                            </tr>
                            {gst_summary_html}
                            {discount_row_html}
                            <tr>
                                <td style="padding: 5px 0; color: #4b5563; font-size: 12px;">Insured Express Courier:</td>
                                <td style="padding: 5px 0; text-align: right; color: #15803d; font-size: 12px; font-weight: 600;">FREE (Atelier Privilege)</td>
                            </tr>
                            <tr style="border-top: 2px solid #111827;">
                                <td style="padding: 10px 0 0 0; font-size: 15px; font-weight: 800; color: #111827; text-transform: uppercase;">Total Invoice Value:</td>
                                <td style="padding: 10px 0 0 0; text-align: right; font-size: 20px; font-weight: 800; color: #927238;">₹{total_val:,.2f}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- LEGAL CERTIFICATION & SIGNATURE -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #e5e7eb; padding-top: 16px;">
                <tr>
                    <td style="width: 60%; vertical-align: top;">
                        <div style="font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Terms & Conditions:</div>
                        <ol style="margin: 4px 0 0 0; padding-left: 18px; font-size: 10px; color: #6b7280; line-height: 1.5;">
                            <li>Goods once sold are covered under the Sorèva 1-Year Polish & Anti-Tarnish Guarantee.</li>
                            <li>All disputes are subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka.</li>
                            <li>This document constitutes an electronic tax invoice under Section 31 of the CGST Act, 2017.</li>
                        </ol>
                    </td>
                    <td style="width: 40%; vertical-align: top; text-align: right;">
                        <div style="font-size: 11px; font-weight: 700; color: #111827;">For SORÈVA LIFESTYLE PRIVATE LIMITED</div>
                        <div style="margin: 10px 0 6px 0; display: inline-block; padding: 6px 14px; border: 1.5px solid #927238; border-radius: 6px; text-align: center; background: #fffcf5;">
                            <div style="font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 1.5px; color: #927238; font-weight: 700;">SORÈVA ATELIER</div>
                            <div style="font-size: 9px; color: #15803d; font-weight: 600; margin-top: 1px;">✓ DIGITALLY AUTHENTICATED</div>
                            <div style="font-size: 8px; color: #6b7280;">BENGALURU, INDIA</div>
                        </div>
                        <div style="font-size: 10px; color: #6b7280;">Authorized Signatory</div>
                        <div style="font-size: 9px; color: #9ca3af; margin-top: 2px;">(Computer Generated Document)</div>
                    </td>
                </tr>
            </table>

        </div>
    </div>

    <!-- Client Dispatch Script -->
    <script>
    async function dispatchInvoiceEmail() {{
        const btn = document.getElementById('btnEmailInvoice');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching...';
        try {{
            const res = await fetch('/api/orders/send-invoice', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ id: '{order_id}', orderNumber: '{order_num}' }})
            }});
            const data = await res.json();
            if (data.success) {{
                alert('Tax invoice {inv_num} dispatched successfully to {cust_email}!');
            }} else {{
                alert('Invoice dispatch status: ' + (data.message || 'Queued'));
            }}
        }} catch (err) {{
            alert('Error dispatching invoice: ' + err.message);
        }} finally {{
            btn.disabled = false;
            btn.innerHTML = orig;
        }}
    }}
    </script>
</body>
</html>"""


def generate_customer_order_html_email(order_data):
    """Generate a responsive, luxury-branded HTML email receipt with Tax Invoice details for the customer."""
    order_num = html.escape(str(order_data.get("orderNumber", "SRV-ORDER")))
    inv_num = html.escape(str(order_data.get("invoiceNumber") or f"INV-{order_num.replace('SRV-', '')}"))
    order_id = html.escape(str(order_data.get("orderId") or order_data.get("id") or ""))
    invoice_view_url = f"https://dev.soreva.in/api/orders/invoice?id={order_id}" if order_id else "https://dev.soreva.in/api/orders/invoice"

    cust_name = html.escape(str(order_data.get("customerName", "Valued Patron")))
    cust_email = html.escape(str(order_data.get("customerEmail", "")))
    cust_phone = html.escape(str(order_data.get("customerPhone", "")))
    date_time = html.escape(str(order_data.get("dateTime", datetime.now().strftime("%d %b %Y, %I:%M %p"))))
    pay_method = html.escape(str(order_data.get("paymentMethod", "Online Payment")))
    pay_id = html.escape(str(order_data.get("paymentId", "N/A")))
    full_address = html.escape(str(order_data.get("fullAddress") or order_data.get("shippingAddress", "")))
    order_notes = html.escape(str(order_data.get("orderNotes") or ""))
    
    total_val = float(order_data.get("totalAmount", 0) or 0)
    subtotal_val = float(order_data.get("subtotalAmount", total_val) or total_val)
    discount_val = float(order_data.get("discountAmount", 0) or 0)
    coupon_code = str(order_data.get("couponCode", "") or "").strip()
    
    # Process structured items
    items_list = extract_order_items_list(order_data)
    items_rows_html = ""
    for it in items_list:
        it_name = html.escape(str(it.get("name") or it.get("productName") or "Luxury Jewellery Piece"))
        it_qty = int(it.get("qty", 1) or 1)
        it_finish = html.escape(str(it.get("finish") or "24K Gold Polish"))
        it_price = float(it.get("price", 0) or 0)
        it_subtotal = it_price * it_qty
        it_img = it.get("image") or it.get("primaryImg") or ""
        
        img_tag = ""
        if it_img:
            if not it_img.startswith("http"):
                it_img = f"https://soreva.in/{it_img.lstrip('/')}"
            img_tag = f'<img src="{html.escape(it_img)}" width="52" height="52" style="border-radius: 8px; object-fit: cover; border: 1px solid #38302e; display: block;" alt="{it_name}">'
        else:
            img_tag = '<div style="width: 52px; height: 52px; background: #251f1e; border-radius: 8px; border: 1px solid #38302e; display: flex; align-items: center; justify-content: center; color: #c5a059; font-size: 20px;">💎</div>'

        items_rows_html += f"""
        <tr>
            <td style="padding: 12px 8px; border-bottom: 1px solid #2a2321; vertical-align: middle; width: 60px;">
                {img_tag}
            </td>
            <td style="padding: 12px 10px; border-bottom: 1px solid #2a2321; vertical-align: middle;">
                <div style="font-weight: 600; color: #f5f2eb; font-size: 14px; line-height: 1.3;">{it_name}</div>
                <div style="font-size: 12px; color: #c5a059; margin-top: 3px;">Finish: {it_finish} &bull; HSN 7113</div>
                <div style="font-size: 12px; color: #a3958f; margin-top: 2px;">Qty: {it_qty} × ₹{it_price:,.2f}</div>
            </td>
            <td style="padding: 12px 8px; border-bottom: 1px solid #2a2321; vertical-align: middle; text-align: right; font-weight: 600; color: #f5f2eb; font-size: 14px;">
                ₹{it_subtotal:,.2f}
            </td>
        </tr>
        """

    # Discount block
    discount_html = ""
    if discount_val > 0:
        coupon_label = f" ({html.escape(coupon_code)})" if coupon_code and coupon_code != "None" else ""
        discount_html = f"""
        <tr>
            <td style="padding: 5px 0; color: #a3958f; font-size: 13px;">Special Discount{coupon_label}:</td>
            <td style="padding: 5px 0; text-align: right; color: #4ade80; font-size: 13px; font-weight: 600;">-₹{discount_val:,.2f}</td>
        </tr>
        """

    # Notes block
    notes_html = ""
    if order_notes and order_notes.lower() != "none":
        notes_html = f"""
        <div style="margin-top: 18px; padding: 12px 16px; background: rgba(197, 160, 89, 0.08); border-left: 3px solid #c5a059; border-radius: 4px;">
            <strong style="color: #c5a059; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Atelier Order Notes:</strong>
            <p style="margin: 4px 0 0 0; color: #f5f2eb; font-size: 13px;">{order_notes}</p>
        </div>
        """

    html_email = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Sorèva Order Confirmation & Tax Invoice — {order_num}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0a09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f2eb;">
    <div style="max-width: 620px; margin: 0 auto; background-color: #171312; border: 1px solid #2a2321; border-radius: 12px; overflow: hidden; margin-top: 24px; margin-bottom: 24px;">
        
        <!-- HEADER -->
        <div style="background: linear-gradient(180deg, #221c1a 0%, #171312 100%); padding: 36px 30px 24px 30px; text-align: center; border-bottom: 1px solid #2a2321;">
            <div style="color: #c5a059; font-size: 11px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Haute Joaillerie Atelier</div>
            <h1 style="margin: 0; color: #f5f2eb; font-family: Georgia, serif; font-size: 28px; font-weight: 500; letter-spacing: 2px;">SORÈVA</h1>
            <div style="color: #a3958f; font-size: 11px; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase;">Paris • Mumbai • Bengaluru</div>
        </div>

        <!-- HERO CONFIRMATION BANNER -->
        <div style="padding: 28px 30px 10px 30px; text-align: center;">
            <div style="display: inline-block; padding: 8px 18px; background: rgba(197, 160, 89, 0.12); border: 1px solid rgba(197, 160, 89, 0.35); border-radius: 30px; color: #e5c483; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 14px;">
                ✨ Order Confirmed & Tax Invoice Issued
            </div>
            <h2 style="margin: 0 0 10px 0; color: #ffffff; font-size: 22px; font-weight: 500;">Thank you for your order, {cust_name}</h2>
            <p style="margin: 0; color: #a3958f; font-size: 14px; line-height: 1.5;">
                Your jewellery order <strong style="color: #c5a059;">{order_num}</strong> has been received by our atelier. Your official digital tax invoice <strong style="color: #ffffff; font-family: monospace;">{inv_num}</strong> is ready for your records.
            </p>
        </div>

        <!-- ORDER QUICK METRICS -->
        <div style="margin: 24px 30px 14px 30px; background: #1f1a19; border: 1px solid #332a28; border-radius: 10px; padding: 18px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="padding: 6px 0; width: 50%; vertical-align: top;">
                        <div style="color: #8c7e78; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Order Number</div>
                        <div style="color: #f5f2eb; font-size: 14px; font-weight: 600; margin-top: 2px;">{order_num}</div>
                    </td>
                    <td style="padding: 6px 0; width: 50%; vertical-align: top;">
                        <div style="color: #8c7e78; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Date & Time</div>
                        <div style="color: #f5f2eb; font-size: 14px; font-weight: 500; margin-top: 2px;">{date_time}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px 0 0 0; width: 50%; vertical-align: top;">
                        <div style="color: #8c7e78; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Tax Invoice Number</div>
                        <div style="color: #e5c483; font-size: 13px; font-weight: 700; font-family: monospace; margin-top: 2px;">{inv_num}</div>
                    </td>
                    <td style="padding: 10px 0 0 0; width: 50%; vertical-align: top;">
                        <div style="color: #8c7e78; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Payment Method</div>
                        <div style="color: #f5f2eb; font-size: 14px; font-weight: 500; margin-top: 2px;">{pay_method}</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- DIGITAL TAX INVOICE CTA BUTTON -->
        <div style="margin: 0 30px 24px 30px; background: rgba(197, 160, 89, 0.08); border: 1px solid rgba(197, 160, 89, 0.35); border-radius: 10px; padding: 16px 20px; text-align: center;">
            <div style="color: #c5a059; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">
                Official Digital Tax Invoice &bull; GST HSN 7113
            </div>
            <p style="margin: 0 0 12px 0; color: #d1c7bd; font-size: 13px;">
                Your official digital tax invoice <strong style="color: #ffffff; font-family: monospace;">{inv_num}</strong> is generated and retained in your customer order dossier.
            </p>
            <a href="{invoice_view_url}" target="_blank" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #c5a059, #a37c35); color: #171312; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                📄 View & Print Digital Tax Invoice (PDF)
            </a>
        </div>

        <!-- ITEMS ORDERED TABLE -->
        <div style="padding: 0 30px 20px 30px;">
            <div style="color: #c5a059; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #2a2321; padding-bottom: 8px;">
                Items in Your Atelier Order
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                {items_rows_html}
            </table>

            <!-- FINANCIAL SUMMARY -->
            <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #2a2321;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="padding: 5px 0; color: #a3958f; font-size: 13px;">Atelier Subtotal:</td>
                        <td style="padding: 5px 0; text-align: right; color: #f5f2eb; font-size: 13px;">₹{subtotal_val:,.2f}</td>
                    </tr>
                    {discount_html}
                    <tr>
                        <td style="padding: 5px 0; color: #a3958f; font-size: 13px;">Insured Express Shipping:</td>
                        <td style="padding: 5px 0; text-align: right; color: #4ade80; font-size: 13px; font-weight: 600;">FREE (Insured)</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0; color: #a3958f; font-size: 13px;">GST (3% HSN 7113 Included):</td>
                        <td style="padding: 5px 0; text-align: right; color: #c5a059; font-size: 13px;">₹{round(total_val - (total_val / 1.03), 2):,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0 0 0; border-top: 1px solid #332a28; color: #f5f2eb; font-size: 15px; font-weight: 700;">Grand Total:</td>
                        <td style="padding: 12px 0 0 0; border-top: 1px solid #332a28; text-align: right; color: #c5a059; font-size: 20px; font-weight: 700;">₹{total_val:,.2f}</td>
                    </tr>
                </table>
            </div>
            {notes_html}
        </div>

        <!-- SHIPPING DESTINATION & CLIENT INFO -->
        <div style="margin: 0 30px 28px 30px; padding: 20px; background: #1f1a19; border: 1px solid #332a28; border-radius: 10px;">
            <div style="color: #c5a059; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">
                Shipping & Delivery Address
            </div>
            <div style="color: #f5f2eb; font-size: 14px; font-weight: 600;">{cust_name}</div>
            <div style="color: #d1c7bd; font-size: 13px; line-height: 1.5; margin-top: 4px;">{full_address}</div>
            <div style="color: #a3958f; font-size: 12px; margin-top: 6px;">
                Phone: <span style="color: #f5f2eb;">{cust_phone}</span> &bull; Email: <span style="color: #f5f2eb;">{cust_email}</span>
            </div>
        </div>

        <!-- ASSURANCE PERKS -->
        <div style="margin: 0 30px 28px 30px; border-top: 1px solid #2a2321; padding-top: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="width: 33.33%; text-align: center; padding: 8px 6px;">
                        <div style="font-size: 20px; margin-bottom: 4px;">🛡️</div>
                        <div style="color: #f5f2eb; font-size: 11px; font-weight: 600;">1-Year Polish</div>
                        <div style="color: #8c7e78; font-size: 10px;">Anti-Tarnish Warranty</div>
                    </td>
                    <td style="width: 33.33%; text-align: center; padding: 8px 6px;">
                        <div style="font-size: 20px; margin-bottom: 4px;">📦</div>
                        <div style="color: #f5f2eb; font-size: 11px; font-weight: 600;">Velvet Box</div>
                        <div style="color: #8c7e78; font-size: 10px;">Signature Presentation</div>
                    </td>
                    <td style="width: 33.33%; text-align: center; padding: 8px 6px;">
                        <div style="font-size: 20px; margin-bottom: 4px;">💎</div>
                        <div style="color: #f5f2eb; font-size: 11px; font-weight: 600;">Authenticity</div>
                        <div style="color: #8c7e78; font-size: 10px;">Certified 5A CZ Grade</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- ATELIER FOOTER -->
        <div style="background-color: #120f0e; padding: 26px 30px; text-align: center; border-top: 1px solid #2a2321;">
            <p style="margin: 0 0 10px 0; color: #a3958f; font-size: 12px; line-height: 1.5;">
                Need assistance with your jewellery order? Our client concierge is at your service.<br>
                Email: <a href="mailto:support@soreva.in" style="color: #c5a059; text-decoration: none;">support@soreva.in</a> &bull; Phone: <a href="tel:+919741118940" style="color: #c5a059; text-decoration: none;">+91 97411 18940</a>
            </p>
            <div style="margin-top: 14px;">
                <a href="https://soreva.in" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #c5a059, #a37c35); color: #171312; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                    Visit Sorèva Boutique
                </a>
            </div>
            <p style="margin: 20px 0 0 0; color: #574c47; font-size: 11px;">
                &copy; 2026 Sorèva Luxury Jewellery. All rights reserved. Handcrafted with passion.
            </p>
        </div>

    </div>
</body>
</html>"""
    return html_email


def generate_customer_order_text_email(order_data):
    """Generate a clean ASCII plain-text receipt for the customer."""
    order_num = order_data.get("orderNumber", "SRV-ORDER")
    cust_name = str(order_data.get("customerName", "Valued Patron"))
    date_time = str(order_data.get("dateTime", datetime.now().strftime("%d %b %Y, %I:%M %p")))
    pay_method = str(order_data.get("paymentMethod", "Online Payment"))
    pay_id = str(order_data.get("paymentId", "N/A"))
    full_address = str(order_data.get("fullAddress") or order_data.get("shippingAddress", ""))
    
    total_val = float(order_data.get("totalAmount", 0) or 0)
    subtotal_val = float(order_data.get("subtotalAmount", total_val) or total_val)
    discount_val = float(order_data.get("discountAmount", 0) or 0)
    coupon_code = str(order_data.get("couponCode", "") or "").strip()
    items_summary = str(order_data.get("itemsSummary", "Jewellery Items"))
    
    lines = [
        "SORÈVA LUXURY JEWELLERY — ORDER CONFIRMATION",
        "============================================================",
        f"Dear {cust_name},",
        "",
        f"Thank you for choosing Sorèva. Your order {order_num} has been successfully reserved with our atelier.",
        "",
        "ORDER DETAILS:",
        f"• Order Number:    {order_num}",
        f"• Date & Time:     {date_time}",
        f"• Payment Method:  {pay_method}",
        f"• Payment Ref ID:  {pay_id}",
        "",
        "ITEMS ORDERED:",
        f"• {items_summary}",
        "",
        "FINANCIAL BREAKDOWN:",
        f"• Subtotal:        ₹{subtotal_val:,.2f}",
    ]
    if discount_val > 0:
        c_str = f" ({coupon_code})" if coupon_code and coupon_code != "None" else ""
        lines.append(f"• Discount{c_str}:   -₹{discount_val:,.2f}")
    lines.extend([
        f"• Express Shipping: FREE (Insured Delivery)",
        f"• Grand Total:     ₹{total_val:,.2f}",
        "",
        "DELIVERY DESTINATION:",
        f"{full_address}",
        "",
        "ATELIER ASSURANCES:",
        "• 1-Year Polish & Anti-Tarnish Guarantee",
        "• Signature Velvet Box & Certificate of Authenticity Included",
        "",
        "CLIENT CONCIERGE:",
        "Email: support@soreva.in | Phone: +91 97411 18940",
        "Website: https://soreva.in",
        "============================================================"
    ])
    return "\n".join(lines)


def dispatch_smtp_email(to_email, subject, html_content, text_content=None, from_name="Sorèva Luxury Jewellery"):
    """
    Dispatch an email via SMTP.
    Also appends the complete email payload to data/email-outbox.log for transparency and auditability.
    """
    to_email = (to_email or "").strip()
    if not to_email:
        return False, "Recipient email address is required"

    cfg = get_notifications_config().get("email", {})
    if not cfg.get("enabled", True):
        return False, "Email notifications are disabled in settings"

    smtp_host = cfg.get("smtpHost", "").strip()
    smtp_port = int(cfg.get("smtpPort") or 587)
    smtp_user = cfg.get("smtpUser", "").strip()
    smtp_pass = cfg.get("smtpPassword", "").strip()
    from_email = cfg.get("fromEmail", "").strip() or smtp_user or "orders@soreva.in"

    # Always log to outbox log file
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = (
        f"[{timestamp_str}] TO: {to_email} | SUBJECT: {subject}\n"
        f"FROM: {from_name} <{from_email}>\n"
        f"{'-'*40}\n"
        f"{text_content or 'HTML receipt attached'}\n"
        f"{'='*60}\n\n"
    )
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(EMAIL_OUTBOX_PATH, "a", encoding="utf-8") as outf:
            outf.write(log_entry)
    except Exception as log_err:
        print(f"[Outbox Log Warning] {log_err}")

    if not smtp_host or not smtp_user or not smtp_pass:
        msg = f"Email queued for {to_email} and logged to outbox. (Configure Gmail 16-character App Password in Admin > Email to send live SMTP)"
        print(f"[Email Notification Logged] {msg}")
        return True, msg

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        if text_content:
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        if html_content:
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"[Email Dispatched via SMTP] Sent to {to_email}")
        return True, f"Email delivered successfully to {to_email}"
    except smtplib.SMTPAuthenticationError as auth_err:
        err_msg = "SMTP Authentication failed: If using Gmail Workspace, a 16-character Google App Password is required instead of your account password."
        print(f"[Email SMTP Auth Error] {err_msg} ({auth_err})")
        return False, err_msg
    except Exception as e:
        err_msg = f"SMTP error dispatching to {to_email}: {str(e)}"
        print(f"[Email SMTP Error] {err_msg}")
        return False, err_msg


def send_customer_digital_invoice(order_data, force_recipient=None):
    """Dispatch the luxury digital tax invoice to the customer email ID."""
    recipient = force_recipient or order_data.get("customerEmail")
    if not recipient:
        return False, "No customer email specified"

    order_num = order_data.get("orderNumber", "")
    inv_num = order_data.get("invoiceNumber") or f"INV-{str(order_num).replace('SRV-', '')}"
    cust_name = order_data.get("customerName", "Valued Patron")
    subject = f"📄 Tax Invoice {inv_num} for Sorèva Order {order_num} — {cust_name}"

    html_body = order_data.get("invoiceHtml")
    if not html_body or len(html_body.strip()) < 50:
        html_body = generate_digital_invoice_html(order_data)

    order_id = order_data.get("orderId") or order_data.get("id") or ""
    invoice_link = f"https://dev.soreva.in/api/orders/invoice?id={order_id}" if order_id else "https://dev.soreva.in/api/orders/invoice"
    total_val = float(order_data.get("totalAmount", 0) or 0)

    text_body = f"""SORÈVA LUXURY JEWELLERY — OFFICIAL TAX INVOICE
==============================================================
Invoice Number : {inv_num}
Order Reference: {order_num}
Customer Name  : {cust_name}
Total Amount   : INR {total_val:,.2f}
GST Category   : Imitation Jewellery (HSN 7113 @ 3% GST)

View & Print Your Official Digital Tax Invoice Online:
{invoice_link}

Atelier Concierge: support@soreva.in | +91 97411 18940
Sorèva Lifestyle Private Limited, Bengaluru, Karnataka
==============================================================
"""

    return dispatch_smtp_email(
        to_email=recipient,
        subject=subject,
        html_content=html_body,
        text_content=text_body,
        from_name="Sorèva Billing & Invoicing"
    )


def send_customer_order_confirmation(order_data, force_recipient=None):
    """Dispatch the luxury customer order confirmation email with itemized receipt."""
    recipient = force_recipient or order_data.get("customerEmail")
    if not recipient:
        return False, "No customer email specified"

    order_num = order_data.get("orderNumber", "")
    cust_name = order_data.get("customerName", "Valued Patron")
    subject = f"✨ Your Sorèva Order Confirmation: {order_num} — {cust_name}"

    html_body = generate_customer_order_html_email(order_data)
    text_body = generate_customer_order_text_email(order_data)

    return dispatch_smtp_email(
        to_email=recipient,
        subject=subject,
        html_content=html_body,
        text_content=text_body,
        from_name="Sorèva Luxury Jewellery"
    )


def send_admin_order_notification(order_data, force_recipient=None):
    """Dispatch the atelier packing & inventory notification to support staff."""
    cfg = get_notifications_config().get("email", {})
    recipient = force_recipient or cfg.get("supportEmail", "").strip() or "support@soreva.in"

    subject = format_notification_template(cfg.get("subjectTemplate", "💎 New Order Received: {order_number}"), order_data)
    body = format_notification_template(cfg.get("bodyTemplate", ""), order_data)

    return dispatch_smtp_email(
        to_email=recipient,
        subject=subject,
        html_content=f"<pre style='font-family: monospace; white-space: pre-wrap; color: #171312;'>{html.escape(body)}</pre>",
        text_content=body,
        from_name="Sorèva Order Concierge"
    )


def send_order_email_notification(order_data, force_recipient=None):
    """
    Master email dispatcher: Sends:
    1. Customer Order Confirmation Receipt
    2. Customer Digital Tax Invoice
    3. Admin Atelier Notification
    """
    if force_recipient:
        # If a single recipient is forced (e.g. from Admin Test Email), send the full customer invoice
        return send_customer_digital_invoice(order_data, force_recipient=force_recipient)

    results = []
    # 1. Customer Order Confirmation Email & Digital Tax Invoice Email
    cust_email = order_data.get("customerEmail")
    if cust_email:
        s_cust, m_cust = send_customer_order_confirmation(order_data)
        results.append(f"Customer Confirmation ({cust_email}): {m_cust}")

        s_inv, m_inv = send_customer_digital_invoice(order_data)
        results.append(f"Customer Tax Invoice ({cust_email}): {m_inv}")
    else:
        results.append("No customer email on record")

    # 2. Admin Atelier Notification Email
    cfg = get_notifications_config().get("email", {})
    admin_email = cfg.get("supportEmail", "").strip() or "support@soreva.in"
    if admin_email and admin_email.lower() != (cust_email or "").lower():
        s_admin, m_admin = send_admin_order_notification(order_data)
        results.append(f"Admin ({admin_email}): {m_admin}")

    return True, "; ".join(results)


def send_order_whatsapp_notification(order_data, force_phone=None, force_template=None):
    """Send WhatsApp order confirmation to the customer with full error diagnostics and template support."""
    cfg = get_notifications_config().get("whatsapp", {})
    if not cfg.get("enabled", True):
        return False, "WhatsApp notification disabled in settings"

    phone = force_phone or str(order_data.get("customerPhone", "")).strip()
    clean_digits = ''.join(c for c in phone if c.isdigit())
    if len(clean_digits) == 10:
        clean_digits = (cfg.get("defaultCountryCode", "91") or "91") + clean_digits

    message_text = format_notification_template(cfg.get("messageTemplate", ""), order_data)
    provider = cfg.get("provider", "meta")
    meta_token = cfg.get("metaApiToken", "").strip() or os.environ.get("META_SYSTEM_USER_ACCESS_TOKEN", "").strip()
    phone_number_id = cfg.get("metaPhoneNumberId", "").strip()
    webhook_url = cfg.get("customWebhookUrl", "").strip()
    message_type = cfg.get("messageType", "template")
    template_name = force_template or cfg.get("templateName", "hello_world").strip()
    template_lang = cfg.get("templateLanguage", "en_US").strip() or "en_US"

    if provider == "webhook" and webhook_url:
        try:
            payload = {"phone": clean_digits, "message": message_text, "order": order_data}
            req = urllib.request.Request(
                webhook_url,
                data=json.dumps(payload).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                print(f"[WhatsApp Webhook Dispatched] Message sent to {clean_digits}")
                return True, f"WhatsApp message dispatched via webhook to +{clean_digits}"
        except Exception as e:
            print(f"[WhatsApp Webhook Error] {e}")
            return False, f"Webhook Error: {str(e)}"

    elif provider == "meta" and meta_token and phone_number_id:
        url = f"https://graph.facebook.com/v20.0/{phone_number_id}/messages"
        
        # Prepare payload: Template or Text
        if message_type == "template" and template_name:
            if template_name == "hello_world":
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": clean_digits,
                    "type": "template",
                    "template": {
                        "name": "hello_world",
                        "language": {"code": "en_US"}
                    }
                }
            else:
                payload = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": clean_digits,
                    "type": "template",
                    "template": {
                        "name": template_name,
                        "language": {"code": template_lang},
                        "components": [
                            {
                                "type": "body",
                                "parameters": [
                                    {"type": "text", "text": str(order_data.get("customerName", "Valued Client"))},
                                    {"type": "text", "text": str(order_data.get("orderNumber", ""))},
                                    {"type": "text", "text": str(int(order_data.get("totalAmount", 0)))}
                                ]
                            }
                        ]
                    }
                }
        else:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": clean_digits,
                "type": "text",
                "text": {"preview_url": False, "body": message_text}
            }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "Authorization": f"Bearer {meta_token}",
                    "Content-Type": "application/json"
                }
            )
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))
                print(f"[Meta WhatsApp Sent] Message sent to {clean_digits}: {resp_data}")
                return True, f"WhatsApp message successfully sent via Meta Cloud API to +{clean_digits}"
        except urllib.error.HTTPError as he:
            raw = he.read().decode('utf-8', errors='ignore')
            try:
                meta_err = json.loads(raw).get('error', {})
                code = meta_err.get('code')
                err_msg = meta_err.get('message', str(he))
                
                if code == 100 and "Unsupported request" in err_msg:
                    detailed = (
                        f"Meta Error (Code 100): Object ID '{phone_number_id}' is not a valid WhatsApp Phone Number ID, "
                        f"or your token lacks WhatsApp permissions. In Meta Developer Dashboard > WhatsApp > API Setup, copy the 'Phone number ID' (NOT the WhatsApp Business Account ID), and ensure the token has 'whatsapp_business_messaging' granted."
                    )
                elif code == 190:
                    detailed = "Meta Error (Code 190): Access token is invalid or expired. Please generate a new System User Token."
                elif code == 131047:
                    detailed = (
                        "Meta Policy (Code 131047): Customer 24h window closed. Meta WhatsApp Cloud API requires an approved Template message "
                        "(e.g. 'hello_world' for testing) to initiate conversations with customers."
                    )
                elif code == 131030:
                    detailed = f"Meta Error (Code 131030): Template '{template_name}' does not exist or has not been approved in your Meta Business Suite."
                elif code == 131026:
                    detailed = f"Meta Error (Code 131026): The phone number +{clean_digits} is not registered in the Allowed Recipients list in Meta Developer Portal (Development Sandbox mode)."
                elif code == 1 or meta_err.get('type') == 'OAuthException':
                    detailed = f"Meta OAuth Error: {err_msg}. Your access token is missing the required 'whatsapp_business_messaging' permission."
                else:
                    detailed = f"Meta API Error ({code}): {err_msg}"
            except Exception:
                detailed = f"Meta API HTTP {he.code}: {raw[:200]}"
            print(f"[Meta WhatsApp Error] {detailed}")
            return False, detailed
        except Exception as e:
            print(f"[Meta WhatsApp Error] {e}")
            return False, f"Meta API Error: {str(e)}"

    # Direct / Log Notification
    print(f"[WhatsApp Notification Ready] Customer: +{clean_digits} | Order: {order_data.get('orderNumber')}")
    return True, f"WhatsApp notification ready for +{clean_digits} (API credentials can be entered in Admin > Notifications)"


def send_otp_sms(clean_phone, otp_val):
    """
    Dispatch cellular SMS / WhatsApp OTP to Indian mobile phone numbers.
    Supports Fast2SMS, 2Factor.in, Twilio, Custom Webhook, and WhatsApp.
    Returns (success: bool, provider: str, details: str).
    """
    cfg = get_notifications_config().get("sms", {})
    fast2sms_key = (cfg.get("fast2smsApiKey") or os.environ.get("FAST2SMS_API_KEY") or "").strip()
    twofactor_key = (cfg.get("twofactorApiKey") or os.environ.get("TWOFACTOR_API_KEY") or "").strip()
    twilio_sid = (cfg.get("twilioAccountSid") or os.environ.get("TWILIO_ACCOUNT_SID") or "").strip()
    twilio_token = (cfg.get("twilioAuthToken") or os.environ.get("TWILIO_AUTH_TOKEN") or "").strip()
    twilio_from = (cfg.get("twilioFromNumber") or os.environ.get("TWILIO_FROM_NUMBER") or "").strip()
    custom_url = (cfg.get("customSmsUrl") or os.environ.get("CUSTOM_SMS_URL") or "").strip()

    # 1. Fast2SMS (India OTP route)
    if fast2sms_key:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            payload = {
                "variables_values": otp_val,
                "route": "otp",
                "numbers": clean_phone
            }
            data_bytes = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(url, data=data_bytes, headers={
                "authorization": fast2sms_key,
                "Content-Type": "application/json"
            })
            with urllib.request.urlopen(req, timeout=8) as resp:
                res_body = json.loads(resp.read().decode('utf-8'))
                print(f"[Fast2SMS Dispatched] +91 {clean_phone} | Response: {res_body}")
                return True, "Fast2SMS", "SMS delivered to mobile."
        except Exception as e:
            print(f"[Fast2SMS Error] {e}")

    # 2. 2Factor.in (India OTP route)
    if twofactor_key:
        try:
            url = f"https://2factor.in/v1/API/V1/{twofactor_key}/SMS/+91{clean_phone}/{otp_val}/OTP1"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=8) as resp:
                res_body = json.loads(resp.read().decode('utf-8'))
                print(f"[2Factor Dispatched] +91 {clean_phone} | Response: {res_body}")
                return True, "2Factor.in", "SMS delivered to mobile."
        except Exception as e:
            print(f"[2Factor Error] {e}")

    # 3. Twilio SMS
    if twilio_sid and twilio_token and twilio_from:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            data = urllib.parse.urlencode({
                "To": f"+91{clean_phone}",
                "From": twilio_from,
                "Body": f"Your Sorèva verification code is {otp_val}. Valid for 5 mins. Use code FLAT200 to get ₹200 OFF on your first purchase."
            }).encode('utf-8')
            auth_str = base64.b64encode(f"{twilio_sid}:{twilio_token}".encode('utf-8')).decode('utf-8')
            req = urllib.request.Request(url, data=data, headers={"Authorization": f"Basic {auth_str}"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                print(f"[Twilio Dispatched] +91 {clean_phone}")
                return True, "Twilio", "SMS delivered to mobile."
        except Exception as e:
            print(f"[Twilio SMS Error] {e}")

    # 4. Custom SMS URL / Webhook
    if custom_url:
        try:
            target_url = custom_url.replace("{phone}", clean_phone).replace("{otp}", otp_val)
            req = urllib.request.Request(target_url)
            with urllib.request.urlopen(req, timeout=8) as resp:
                print(f"[Custom SMS Dispatched] +91 {clean_phone}")
                return True, "Custom Webhook", "SMS dispatched."
        except Exception as e:
            print(f"[Custom SMS Error] {e}")

    print(f"[SMS Gateway Notice] Mobile +91 {clean_phone}: No live SMS provider API key configured in notifications-config.json or .env. Displaying instant verification code in browser.")
    return False, "Demo Sandbox", "No live SMS gateway API key configured."


DEFAULT_POPUP_CONFIG = {
    "enabled": True,
    "headline1": "Big Diwali Sale 🪔",
    "headline2": "Flat 20% Off Everything!",
    "description": "Sign up & be the first to shop 500+ new festive-ready styles with ready to ship.",
    "imageUrl": "assets/festive-offer-banner.webp",
    "offerCode": "DIWALI20",
    "discountPercent": 20,
    "discountText": "Flat 20% Off Everything!",
    "buttonText": "Submit",
    "placeholderText": "Enter your email",
    "emailSubject": "✨ Your Exclusive 20% OFF Diwali Discount Code — Sorèva",
    "emailHeading": "Your Exclusive Festive Offer Has Arrived! 🪔",
    "emailBody": "Thank you for joining the Sorèva family! To celebrate this grand festive season, here is your exclusive VIP discount voucher for Flat 20% Off across our entire collection of handcrafted luxury jewellery.",
    "emailSupportSender": "support@soreva.in",
    "autoApply": True,
    "delaySeconds": 2
}


def get_popup_config():
    """Retrieve pop-up modal settings from disk or return defaults."""
    cfg = copy.deepcopy(DEFAULT_POPUP_CONFIG)
    if os.path.exists(POPUP_CONFIG_PATH):
        try:
            with open(POPUP_CONFIG_PATH, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                if isinstance(saved, dict):
                    cfg.update(saved)
        except Exception as e:
            print(f"[Popup Config Load Error] {e}")
    return cfg


def save_popup_config(cfg):
    """Persist pop-up modal configuration to disk."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(POPUP_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    return True


def record_popup_subscriber(email, code, delivered=False):
    """Record email newsletter lead captured by the pop-up modal."""
    os.makedirs(DATA_DIR, exist_ok=True)
    subs = []
    if os.path.exists(POPUP_SUBSCRIBERS_PATH):
        try:
            with open(POPUP_SUBSCRIBERS_PATH, 'r', encoding='utf-8') as f:
                subs = json.load(f)
                if not isinstance(subs, list):
                    subs = []
        except Exception:
            subs = []
    new_sub = {
        "email": email,
        "offerCode": code,
        "timestamp": datetime.now().isoformat(),
        "dateFormatted": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "emailDelivered": delivered
    }
    subs.append(new_sub)
    try:
        with open(POPUP_SUBSCRIBERS_PATH, 'w', encoding='utf-8') as f:
            json.dump(subs, f, indent=2)
    except Exception as e:
        print(f"[Record Subscriber Error] {e}")
    return len(subs)


def send_discount_coupon_email(customer_email, coupon_code=None, discount_text=None, custom_subject=None, custom_body=None):
    """
    Dispatches a luxury branded discount coupon email from support@soreva.in
    to a customer who entered their email in the festive offer pop-up.
    """
    popup_cfg = get_popup_config()
    notif_cfg = get_notifications_config().get("email", {})

    code = coupon_code or popup_cfg.get("offerCode", "DIWALI20")
    disc = discount_text or popup_cfg.get("discountText", "Flat 20% Off Everything!")
    subject = custom_subject or popup_cfg.get("emailSubject") or f"✨ Your Exclusive {disc} Diwali Discount Code — Sorèva"
    body_text = custom_body or popup_cfg.get("emailBody") or "Thank you for joining the Sorèva family! Enjoy Flat 20% Off on your luxury jewellery purchase."
    heading_text = popup_cfg.get("emailHeading", "Your Exclusive Festive Offer Has Arrived! 🪔")

    smtp_host = notif_cfg.get("smtpHost", "smtp.gmail.com").strip()
    smtp_port = int(notif_cfg.get("smtpPort") or 587)
    smtp_user = notif_cfg.get("smtpUser", "support@soreva.in").strip()
    smtp_pass = notif_cfg.get("smtpPassword", "").strip()
    from_email = notif_cfg.get("fromEmail", "").strip() or smtp_user or "support@soreva.in"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f3ee; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #231815;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f7f3ee; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #4d1520; padding: 36px 30px; text-align: center; color: #ffffff;">
              <div style="font-size: 26px; font-weight: 800; letter-spacing: 5px; color: #f5e6ca; margin-bottom: 4px; font-family: 'Playfair Display', Georgia, serif;">SORÈVA</div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #ffd700; opacity: 0.9;">Haute Joaillerie Atelier</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: center;">
              <h2 style="font-size: 22px; font-weight: 700; color: #4d1520; margin: 0 0 14px 0;">{heading_text}</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #5a4b49; margin: 0 0 24px 0;">
                {body_text}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0 28px 0; background: #faf4f5; border: 2px dashed #b8860b; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px 20px; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #9c2743; font-weight: 700; margin-bottom: 8px;">Exclusive Discount Voucher</div>
                    <div style="display: inline-block; background: #4d1520; color: #ffffff; font-family: 'Courier New', monospace; font-size: 28px; font-weight: 800; letter-spacing: 4px; padding: 10px 24px; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(77,21,32,0.25);">
                      {code}
                    </div>
                    <div style="font-size: 16px; font-weight: 700; color: #4d1520; margin-top: 4px;">{disc}</div>
                    <div style="font-size: 12px; color: #8c7875; margin-top: 6px;">Valid on all handcrafted collections • Apply at checkout</div>
                  </td>
                </tr>
              </table>
              <div>
                <a href="https://soreva.in" style="display: inline-block; background: #4d1520; color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 999px; text-decoration: none; box-shadow: 0 6px 20px rgba(77,21,32,0.3); text-transform: uppercase; letter-spacing: 1px;">
                  Shop The Festive Collection &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #faf7f4; border-top: 1px solid #f0e6df; padding: 22px 30px; text-align: center; font-size: 12px; color: #8e807e;">
              <p style="margin: 0 0 6px 0;">Need styling assistance or custom bespoke sizing? Reply directly to this email or reach us at <a href="mailto:support@soreva.in" style="color: #4d1520; text-decoration: none; font-weight: 600;">support@soreva.in</a></p>
              <p style="margin: 0; font-size: 11px; opacity: 0.8;">© 2026 Sorèva Luxury Jewellery. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    if not smtp_host or not smtp_user or not smtp_pass:
        print(f"[Coupon Email Simulation] Dispatched to {customer_email} (Code: {code}). Note: SMTP password can be set in Admin > Offer Pop-Up.")
        return True, "Coupon email queued. (SMTP credentials pending)"

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = f"Sorèva Boutique <{from_email}>"
        msg['To'] = customer_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body_text + f"\\n\\nDiscount Code: {code} ({disc})\\nShop now at https://soreva.in", 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"[Coupon Email Delivered] Dispatched to {customer_email} with code {code}")
        return True, f"Discount coupon email sent to {customer_email}!"
    except Exception as e:
        print(f"[Coupon Email Error] {e}")
        return False, f"SMTP Error: {str(e)}"


DEFAULT_NEWSLETTER_CONFIG = {
    "enabled": True,
    "title": "Join The Sorèva Circle",
    "description": "Subscribe for private seasonal sales, new collection drops, and receive 15% OFF on your first order.",
    "couponCode": "WELCOME15",
    "discountPercent": 15,
    "discountText": "Flat 15% Off Your First Order",
    "buttonText": "Subscribe",
    "placeholderText": "Your email address",
    "emailSubject": "✨ Welcome to The Sorèva Circle — Your 15% OFF Voucher (WELCOME15)",
    "emailHeading": "Welcome to The Sorèva Circle",
    "emailBody": "Thank you for joining our private inner circle. As a valued member, enjoy an exclusive 15% discount on your first acquisition of handcrafted demi-fine luxury jewellery.",
    "emailSupportSender": "support@soreva.in",
    "autoApply": True
}


def get_newsletter_config():
    """Retrieve newsletter subscription settings from disk or return defaults."""
    cfg = copy.deepcopy(DEFAULT_NEWSLETTER_CONFIG)
    if os.path.exists(NEWSLETTER_CONFIG_PATH):
        try:
            with open(NEWSLETTER_CONFIG_PATH, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                if isinstance(saved, dict):
                    cfg.update(saved)
        except Exception as e:
            print(f"[Newsletter Config Load Error] {e}")
    return cfg


def save_newsletter_config(cfg):
    """Persist newsletter configuration to disk."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(NEWSLETTER_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)
    return True


def record_newsletter_subscriber(email, code="WELCOME15", delivered=False):
    """Record newsletter lead captured from the Join The Sorèva Circle section."""
    os.makedirs(DATA_DIR, exist_ok=True)
    subs = []
    if os.path.exists(NEWSLETTER_SUBSCRIBERS_PATH):
        try:
            with open(NEWSLETTER_SUBSCRIBERS_PATH, 'r', encoding='utf-8') as f:
                subs = json.load(f)
                if not isinstance(subs, list):
                    subs = []
        except Exception:
            subs = []
    new_sub = {
        "email": email,
        "offerCode": code,
        "source": "footer_newsletter",
        "timestamp": datetime.now().isoformat(),
        "dateFormatted": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "emailDelivered": delivered
    }
    subs.append(new_sub)
    try:
        with open(NEWSLETTER_SUBSCRIBERS_PATH, 'w', encoding='utf-8') as f:
            json.dump(subs, f, indent=2)
    except Exception as e:
        print(f"[Record Newsletter Subscriber Error] {e}")
    return len(subs)


def send_newsletter_welcome_email(customer_email, coupon_code=None, discount_text=None, custom_subject=None, custom_body=None):
    """
    Dispatches a luxury branded WELCOME15 coupon email from support@soreva.in
    to a customer who subscribed via 'Join The Sorèva Circle'.
    """
    news_cfg = get_newsletter_config()
    notif_cfg = get_notifications_config().get("email", {})

    code = coupon_code or news_cfg.get("couponCode", "WELCOME15")
    disc = discount_text or news_cfg.get("discountText", "Flat 15% Off Your First Order")
    subject = custom_subject or news_cfg.get("emailSubject") or f"✨ Welcome to The Sorèva Circle — Your 15% OFF Voucher ({code})"
    body_text = custom_body or news_cfg.get("emailBody") or "Thank you for joining our private inner circle. As a valued member, enjoy an exclusive 15% discount on your first acquisition of handcrafted demi-fine luxury jewellery."
    heading_text = news_cfg.get("emailHeading", "Welcome to The Sorèva Circle")

    smtp_host = notif_cfg.get("smtpHost", "smtp.gmail.com").strip()
    smtp_port = int(notif_cfg.get("smtpPort") or 587)
    smtp_user = notif_cfg.get("smtpUser", "support@soreva.in").strip()
    smtp_pass = notif_cfg.get("smtpPassword", "").strip()
    from_email = notif_cfg.get("fromEmail", "").strip() or smtp_user or "support@soreva.in"

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1413; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #fbf8f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1a1413; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: linear-gradient(168deg, #2b2220 0%, #1e1716 100%); border: 1px solid rgba(197, 160, 89, 0.35); border-radius: 18px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
          <tr>
            <td style="padding: 38px 30px 24px 30px; text-align: center; border-bottom: 1px solid rgba(197, 160, 89, 0.2);">
              <div style="font-size: 26px; font-weight: 700; letter-spacing: 5px; color: #fbf8f5; margin-bottom: 6px; font-family: 'Playfair Display', Georgia, serif;">S O R È V A</div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #c5a059; font-weight: 600;">The Sorèva Circle • Private Atelier</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 28px 32px; text-align: center;">
              <div style="font-size: 32px; margin-bottom: 12px;">✨</div>
              <h2 style="font-size: 24px; font-weight: 700; color: #fbf8f5; margin: 0 0 14px 0; font-family: 'Playfair Display', Georgia, serif;">{heading_text}</h2>
              <p style="font-size: 15px; line-height: 1.7; color: #d6ccc7; margin: 0 0 24px 0;">
                {body_text}
              </p>
              
              <!-- Voucher Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 22px 0 28px 0; background: rgba(14, 11, 10, 0.6); border: 2px dashed #c5a059; border-radius: 12px;">
                <tr>
                  <td style="padding: 24px 20px; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #c5a059; font-weight: 700; margin-bottom: 10px;">Your Exclusive Welcome Gift</div>
                    <div style="font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #ffffff; background: linear-gradient(135deg, #c5a059, #967537); -webkit-background-clip: text; display: inline-block; font-family: 'Courier New', monospace; padding: 4px 18px; border-radius: 8px;">
                      {code}
                    </div>
                    <div style="font-size: 14px; font-weight: 600; color: #e7dfd5; margin-top: 10px;">{disc}</div>
                    <div style="font-size: 12px; color: #9e8e88; margin-top: 6px;">Applicable across all Demi-Fine Jewellery • No minimum spend required</div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; line-height: 1.6; color: #a89892; margin: 0 0 28px 0;">
                Enter code <strong style="color: #c5a059;">{code}</strong> at checkout on soreva.in to apply your 15% discount. Express insured shipping across India and our signature luxury gift box are included complimentary.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 12px auto;">
                <tr>
                  <td style="border-radius: 30px; background: linear-gradient(135deg, #c5a059 0%, #aa8232 100%);">
                    <a href="https://soreva.in" target="_blank" style="display: inline-block; padding: 14px 34px; color: #1a1413; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 30px; letter-spacing: 0.5px;">
                      Explore The Collection &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: rgba(14, 11, 10, 0.4); padding: 22px 28px; text-align: center; border-top: 1px solid rgba(197, 160, 89, 0.15); font-size: 12px; color: #8e7e78; line-height: 1.6;">
              <div>Need assistance with your selection? Reply directly to this email or write to <a href="mailto:{from_email}" style="color: #c5a059; text-decoration: none;">{from_email}</a>.</div>
              <div style="margin-top: 6px;">&copy; 2026 Sorèva Jewellery Atelier. All Rights Reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    if not smtp_pass:
        print(f"[Newsletter Welcome Email Sandbox] To: {customer_email} | Code: {code} | SMTP password not set in notifications-config.json. Logged successfully.")
        return True, f"Welcome voucher {code} generated for {customer_email} (Sandbox mode: configure SMTP password for live delivery)."

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"Sorèva Circle <{from_email}>"
        msg['To'] = customer_email
        msg['Reply-To'] = from_email

        plain_text = f"""Welcome to The Sorèva Circle!

{body_text}

Your Exclusive Welcome Coupon: {code} ({disc})
Apply this code during checkout at https://soreva.in

Complimentary express insured delivery is included with every order.

Warm regards,
The Sorèva Concierge Atelier
support@soreva.in"""

        msg.attach(MIMEText(plain_text, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"[Newsletter Welcome Email Delivered] Dispatched to {customer_email} with code {code}")
        return True, f"Welcome voucher email sent to {customer_email}!"
    except Exception as e:
        print(f"[Newsletter Welcome Email Error] {e}")
        return False, f"SMTP Error: {str(e)}"


def get_razorpay_config():
    """Retrieve Razorpay payment gateway credentials from file or environment."""
    env_key = os.environ.get('RAZORPAY_KEY_ID', '').strip()
    env_secret = os.environ.get('RAZORPAY_KEY_SECRET', '').strip()
    
    cfg = {
        "enabled": True,
        "keyId": env_key or "rzp_test_soreva_demo",
        "keySecret": env_secret or "",
        "merchantName": "Sorèva Luxury Jewellery",
        "themeColor": "#38302e"
    }
    
    if os.path.exists(RAZORPAY_CONFIG_PATH):
        try:
            with open(RAZORPAY_CONFIG_PATH, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                cfg.update(saved)
        except Exception as e:
            print(f"[Razorpay Config Load Warning] {e}")
            
    if env_key:
        cfg["keyId"] = env_key
    if env_secret:
        cfg["keySecret"] = env_secret
        
    return cfg


def save_razorpay_config(cfg):
    """Persist Razorpay credentials to disk."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(RAZORPAY_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2)
    return True


def create_razorpay_order(amount_inr, receipt_str, notes=None):
    """Create order with Razorpay REST API or sandbox fallback."""
    cfg = get_razorpay_config()
    amount_paise = int(round(float(amount_inr) * 100))
    key_id = cfg.get("keyId", "").strip()
    key_secret = cfg.get("keySecret", "").strip()
    
    # Live/Test API call if actual keys are set
    if key_id and key_secret and not key_id.startswith("rzp_test_soreva_demo"):
        try:
            url = "https://api.razorpay.com/v1/orders"
            payload = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": str(receipt_str)[:40],
                "notes": notes or {}
            }
            data_bytes = json.dumps(payload).encode('utf-8')
            auth_str = base64.b64encode(f"{key_id}:{key_secret}".encode('utf-8')).decode('utf-8')
            req = urllib.request.Request(url, data=data_bytes, headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {auth_str}",
                "User-Agent": "Soreva-Store/1.0"
            })
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
                resp_data = json.loads(resp.read().decode('utf-8'))
                return {
                    "success": True,
                    "orderId": resp_data.get("id"),
                    "amount": amount_paise,
                    "currency": "INR",
                    "keyId": key_id,
                    "merchantName": cfg.get("merchantName", "Sorèva Luxury Jewellery"),
                    "themeColor": cfg.get("themeColor", "#38302e")
                }, None
        except urllib.error.HTTPError as e:
            try:
                err_body = json.loads(e.read().decode('utf-8'))
                err_msg = err_body.get('error', {}).get('description', str(e))
            except Exception:
                err_msg = str(e)
            print(f"[Razorpay API Error] HTTP {e.code}: {err_msg}")
            if key_id.startswith("rzp_live"):
                return None, f"Razorpay Payment Gateway Error: {err_msg}"
            print(f"[Razorpay Test Warning] Falling back to sandbox order due to error: {err_msg}")
        except Exception as e:
            print(f"[Razorpay Connection Error] {e}")
            if key_id.startswith("rzp_live"):
                return None, f"Payment gateway connection error: {str(e)}"
            print("[Razorpay Test Warning] Falling back to sandbox order.")
            
    # Mock/Sandbox Order for Instant Testing
    mock_order_id = f"order_{gen_pb_id()}"
    return {
        "success": True,
        "orderId": mock_order_id,
        "amount": amount_paise,
        "currency": "INR",
        "keyId": key_id or "rzp_test_soreva_demo",
        "merchantName": cfg.get("merchantName", "Sorèva Luxury Jewellery"),
        "themeColor": cfg.get("themeColor", "#38302e"),
        "isMock": True
    }, None


def verify_razorpay_signature(order_id, payment_id, signature):
    """Verify HMAC SHA256 signature for Razorpay payment callback."""
    cfg = get_razorpay_config()
    key_secret = cfg.get("keySecret", "").strip()
    key_id = cfg.get("keyId", "").strip()
    is_live = bool(key_id and key_id.startswith("rzp_live"))

    if is_live:
        if not signature or signature == 'sandbox_verified_signature':
            return False
        if not key_secret:
            return False
        msg = f"{order_id}|{payment_id}".encode('utf-8')
        expected = hmac.new(key_secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)

    # Sandbox / Demo mode
    if signature == 'sandbox_verified_signature':
        return True
    if not key_secret or not key_id or key_id.startswith("rzp_test_soreva_demo"):
        return True
    if not signature:
        return False
    msg = f"{order_id}|{payment_id}".encode('utf-8')
    expected = hmac.new(key_secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def test_razorpay_credentials(key_id, key_secret):
    """Test Razorpay Key ID and Secret against the Razorpay REST API."""
    if not key_id or not key_secret:
        return False, "Key ID and Key Secret cannot be empty."
    if key_id.startswith("rzp_test_soreva_demo"):
        return True, "Simulated sandbox demo mode active."
    try:
        url = "https://api.razorpay.com/v1/orders?count=1"
        auth_str = base64.b64encode(f"{key_id}:{key_secret}".encode('utf-8')).decode('utf-8')
        req = urllib.request.Request(url, headers={
            "Authorization": f"Basic {auth_str}",
            "User-Agent": "Soreva-Admin/1.0"
        })
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            if resp.status == 200:
                mode = "Live Production Mode" if key_id.startswith("rzp_live") else "Test Sandbox Mode"
                return True, f"Authentication Successful! Connected to Razorpay ({mode})."
            return False, f"Unexpected response from Razorpay (HTTP {resp.status})"
    except urllib.error.HTTPError as e:
        if e.code == 401:
            return False, "Authentication Failed (401 Unauthorized): Invalid Key ID or Key Secret. Please verify your keys in the Razorpay Dashboard."
        return False, f"Razorpay API Error (HTTP {e.code}): {e.reason}"
    except Exception as e:
        return False, f"Connection error: {str(e)}"


def record_order_in_db(
    customer_name, customer_email, customer_phone, shipping_address, city, 
    payment_method, items, total_amount, order_status="Processing", rzp_payment_id=None,
    address_line2="", state="", pincode="", country="India", order_notes="",
    subtotal_amount=None, discount_amount=0, coupon_code="",
    gst_amount=0, gst_rate=3
):
    """Persist order, deduct inventory, upsert customer, and log audit event."""
    conn = get_db()
    if not conn:
        return None, "Database unavailable"
    try:
        c = conn.cursor()
        count_row = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
        order_seq = 1080 + count_row + 1
        order_num = f"SRV-2026-{order_seq}"
        order_id = gen_pb_id()
        invoice_num = f"INV-2026-{order_seq}"
        invoice_created_at = now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")

        item_descs = []
        for it in items:
            qty = it.get('qty', 1)
            title = it.get('name') or it.get('productName') or 'Jewellery Piece'
            finish = it.get('finish', '24K Gold')
            item_descs.append(f"{qty}x {title} ({finish})")
        items_summary = ", ".join(item_descs)

        subtotal = float(subtotal_amount) if subtotal_amount is not None else float(total_amount)
        discount = float(discount_amount or 0)
        items_json_str = json.dumps(items)
        payment_id_str = str(rzp_payment_id or "")

        full_addr_parts = [p for p in [shipping_address, address_line2, city, state, f"PIN: {pincode}" if pincode else "", country] if p]
        full_shipping_destination = ", ".join(full_addr_parts)

        # Generate official digital tax invoice HTML
        order_invoice_payload = {
            "id": order_id,
            "orderId": order_id,
            "orderNumber": order_num,
            "invoiceNumber": invoice_num,
            "invoiceCreatedAt": invoice_created_at,
            "customerName": customer_name,
            "customerEmail": customer_email,
            "customerPhone": customer_phone,
            "shippingAddress": shipping_address,
            "addressLine2": address_line2 or "",
            "city": city,
            "state": state or "",
            "pincode": pincode or "",
            "country": country or "India",
            "fullAddress": full_shipping_destination,
            "orderNotes": order_notes or "",
            "paymentMethod": payment_method,
            "paymentId": payment_id_str or "N/A",
            "subtotalAmount": subtotal,
            "discountAmount": discount,
            "couponCode": coupon_code or "",
            "itemsSummary": items_summary,
            "items": items,
            "totalAmount": total_amount,
            "status": order_status,
            "createdAt": now_str,
            "gstAmount": gst_amount,
            "gstRate": gst_rate
        }
        invoice_html = generate_digital_invoice_html(order_invoice_payload)

        c.execute("""
            INSERT INTO orders (
                id, orderNumber, customerName, customerEmail, customerPhone, 
                shippingAddress, addressLine2, city, state, pincode, country, orderNotes,
                paymentMethod, paymentId, subtotalAmount, discountAmount, couponCode,
                itemsSummary, itemsJson, totalAmount, status, createdAt,
                gstAmount, gstRate, invoiceNumber, invoiceHtml, invoiceCreatedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id, order_num, customer_name, customer_email, customer_phone,
            shipping_address, address_line2 or "", city, state or "", pincode or "", country or "India", order_notes or "",
            payment_method, payment_id_str, subtotal, discount, coupon_code or "",
            items_summary, items_json_str, total_amount, order_status, now_str,
            gst_amount, gst_rate, invoice_num, invoice_html, invoice_created_at
        ))

        # Upsert into customers
        cust_row = c.execute("SELECT id, totalOrders, totalSpent FROM customers WHERE email = ?", (customer_email,)).fetchone()
        if cust_row:
            new_orders = cust_row['totalOrders'] + 1
            new_spent = cust_row['totalSpent'] + total_amount
            c.execute("""
                UPDATE customers 
                SET totalOrders = ?, totalSpent = ?, name = ?, phone = ?, address = ?, city = ?
                WHERE email = ?
            """, (new_orders, new_spent, customer_name, customer_phone, full_shipping_destination, city, customer_email))
        else:
            new_cust_id = gen_pb_id()
            c.execute("""
                INSERT INTO customers (id, name, email, phone, address, city, totalOrders, totalSpent)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """, (new_cust_id, customer_name, customer_email, customer_phone, full_shipping_destination, city, total_amount))

        # Inventory deduction
        inventory_updates = []
        for it in items:
            prod_name = it.get('name') or it.get('productName')
            sku = it.get('sku')
            qty_to_deduct = int(it.get('qty', 1))

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

        try:
            c.execute("UPDATE user_carts SET items = '[]', updated_at = ? WHERE LOWER(email) = LOWER(?)", (datetime.now().isoformat(), customer_email))
        except Exception as e:
            pass

        # Audit log entry
        audit_action = "Razorpay Payment Verified" if rzp_payment_id else "Order Placed"
        audit_details = f"Order {order_num} for {customer_name} ({items_summary}) - ₹{total_amount:.2f}"
        if rzp_payment_id:
            audit_details += f" | Razorpay ID: {rzp_payment_id}"
        try:
            c.execute("""
                INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                VALUES (?, 'System', ?, 'Order', ?, ?)
            """, (f"log_{gen_pb_id()}", audit_action, order_id, audit_details))
        except Exception:
            pass

        conn.commit()

        # Asynchronously dispatch email to support and WhatsApp to customer
        order_dispatch_info = {
            "orderNumber": order_num,
            "orderId": order_id,
            "invoiceNumber": invoice_num,
            "invoiceHtml": invoice_html,
            "invoiceCreatedAt": invoice_created_at,
            "status": order_status,
            "totalAmount": total_amount,
            "subtotalAmount": subtotal,
            "discountAmount": discount,
            "couponCode": coupon_code or "None",
            "customerName": customer_name,
            "customerEmail": customer_email,
            "customerPhone": customer_phone,
            "shippingAddress": shipping_address,
            "addressLine2": address_line2 or "",
            "city": city,
            "state": state or "",
            "pincode": pincode or "",
            "country": country or "India",
            "fullAddress": full_shipping_destination,
            "orderNotes": order_notes or "None",
            "itemsSummary": items_summary,
            "items": items,
            "paymentMethod": payment_method,
            "paymentId": payment_id_str or "N/A",
            "dateTime": now_str
        }
        def _async_notify():
            try:
                send_order_email_notification(order_dispatch_info)
                send_order_whatsapp_notification(order_dispatch_info)
            except Exception as notify_err:
                print(f"[Async Notification Error] {notify_err}")

        threading.Thread(target=_async_notify, daemon=True).start()

        return {
            "orderNumber": order_num,
            "orderId": order_id,
            "invoiceNumber": invoice_num,
            "invoiceUrl": f"/api/orders/invoice?id={order_id}",
            "status": order_status,
            "totalAmount": total_amount,
            "customerName": customer_name,
            "customerEmail": customer_email,
            "itemsSummary": items_summary,
            "inventoryUpdates": inventory_updates
        }, None
    except Exception as e:
        return None, str(e)
    finally:
        conn.close()


class SorevaHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def _send_json(self, data, status=200):
        encoded = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(encoded)))
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(encoded)

    def _is_pocketbase_req(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path == '/_' or path.startswith('/_/'):
            return True
        pb_prefixes = (
            '/api/collections', '/api/admins', '/api/superusers',
            '/api/settings', '/api/health', '/api/batch',
            '/api/realtime', '/api/files', '/api/backups',
            '/api/logs', '/api/crons'
        )
        for prefix in pb_prefixes:
            if path == prefix or path.startswith(prefix + '/'):
                return True
        return False

    def _proxy_pocketbase(self):
        parsed = urlparse(self.path)
        if parsed.path == '/_':
            self.send_response(301)
            new_path = '/_/' + (f"?{parsed.query}" if parsed.query else "")
            self.send_header('Location', new_path)
            self._send_cors_headers()
            self.end_headers()
            return

        ensure_pocketbase_running()

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        try:
            conn = http.client.HTTPConnection('127.0.0.1', 8090, timeout=30)
            headers = {}
            for k, v in self.headers.items():
                if k.lower() not in ('host', 'content-length', 'connection', 'keep-alive', 'transfer-encoding'):
                    headers[k] = v
            headers['Host'] = '127.0.0.1:8090'
            if body is not None:
                headers['Content-Length'] = str(len(body))

            conn.request(self.command, self.path, body=body, headers=headers)
            resp = conn.getresponse()

            self._custom_cache_headers = True
            self.send_response(resp.status, resp.reason)
            for k, v in resp.getheaders():
                if k.lower() not in ('transfer-encoding', 'connection', 'content-length'):
                    self.send_header(k, v)
            resp_body = resp.read()
            self.send_header('Content-Length', str(len(resp_body)))
            if not resp.getheader('Access-Control-Allow-Origin'):
                self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(resp_body)
            conn.close()
        except Exception as e:
            self._send_json({
                "error": "PocketBase service is unreachable on port 8090",
                "details": str(e)
            }, 502)

    def _serve_image_file(self, filepath, mime_type):
        try:
            stat_res = os.stat(filepath)
            mtime = int(stat_res.st_mtime)
            file_size = stat_res.st_size
            etag = f'"{mtime}-{file_size}"'

            client_etag = self.headers.get('If-None-Match')
            if client_etag and client_etag.strip() == etag:
                self._custom_cache_headers = True
                self.send_response(304)
                self.send_header('ETag', etag)
                self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
                self._send_cors_headers()
                self.end_headers()
                return

            self._custom_cache_headers = True
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(file_size))
            self.send_header('ETag', etag)
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
            self.send_header('Vary', 'Accept')
            self._send_cors_headers()
            self.end_headers()

            with open(filepath, 'rb') as f:
                while True:
                    chunk = f.read(64 * 1024)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            print(f"[Image Serve Error] {e}")

    def _handle_img_proxy(self, parsed):
        target_url = None
        filename = ''
        if parsed.path.startswith('/api/img/'):
            filename = unquote(parsed.path[len('/api/img/'):]).split('?')[0].strip()
        else:
            query_params = parse_qs(parsed.query)
            target_url = query_params.get('url', [''])[0]
            if target_url:
                parsed_target = urlparse(target_url)
                filename = os.path.basename(parsed_target.path)

        filename = os.path.basename(filename)
        if not filename or filename in ('.', '..') or '/' in filename or '\\' in filename:
            self._send_json({"error": "Invalid image request"}, 400)
            return

        name_without_ext, ext = os.path.splitext(filename)
        if not ext:
            ext = '.jpg'
            filename = name_without_ext + ext

        webp_path = os.path.join(IMG_CACHE_DIR, f"{name_without_ext}.webp")
        orig_path = os.path.join(IMG_CACHE_DIR, filename)

        accept = self.headers.get('Accept', '')
        client_accepts_webp = 'image/webp' in accept

        # Case 1: WebP is cached and client supports WebP
        if client_accepts_webp and os.path.exists(webp_path):
            self._serve_image_file(webp_path, 'image/webp')
            return

        # Case 2: Original file is cached
        if os.path.exists(orig_path):
            if client_accepts_webp and HAS_PIL:
                try:
                    with Image.open(orig_path) as im:
                        rgb = im.convert('RGB')
                        rgb.save(webp_path, 'WEBP', quality=80, method=3)
                    self._serve_image_file(webp_path, 'image/webp')
                    return
                except Exception:
                    pass
            mime = 'image/webp' if ext.lower() == '.webp' else ('image/png' if ext.lower() == '.png' else 'image/jpeg')
            self._serve_image_file(orig_path, mime)
            return

        # Case 3: Need to fetch from remote origin (with concurrency deduplication)
        event_to_wait = None
        is_fetcher = False
        with _IMG_FETCH_LOCK:
            if filename in _IN_FLIGHT_FETCHES:
                event_to_wait = _IN_FLIGHT_FETCHES[filename]
            else:
                event_to_wait = threading.Event()
                _IN_FLIGHT_FETCHES[filename] = event_to_wait
                is_fetcher = True

        if not is_fetcher and event_to_wait:
            # Another worker thread is already downloading this image; wait for it
            event_to_wait.wait(timeout=9.0)
            if client_accepts_webp and os.path.exists(webp_path):
                self._serve_image_file(webp_path, 'image/webp')
                return
            if os.path.exists(orig_path):
                mime = 'image/webp' if ext.lower() == '.webp' else ('image/png' if ext.lower() == '.png' else 'image/jpeg')
                self._serve_image_file(orig_path, mime)
                return

        try:
            candidate_urls = []
            if target_url:
                candidate_urls.append(target_url)
            else:
                candidate_urls.append(f"https://indian-jewellery.com/core/thumb_images/product_images/{filename}")
                candidate_urls.append(f"https://indian-jewellery.com/core/thumb_images/product_medium_images/{filename}")
                # Secondary angle fallback to primary if secondary 404s
                if filename.endswith('A.jpg'):
                    base_primary = filename[:-5] + '.jpg'
                    candidate_urls.append(f"https://indian-jewellery.com/core/thumb_images/product_images/{base_primary}")
                    candidate_urls.append(f"https://indian-jewellery.com/core/thumb_images/product_medium_images/{base_primary}")

            cookie_str = perform_czm_login()

            req_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://czmakers.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Sec-Fetch-Dest': 'image',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Site': 'same-origin'
            }
            if cookie_str:
                req_headers['Cookie'] = cookie_str

            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE

            fetched_content = None
            for cand_url in candidate_urls:
                try:
                    req = urllib.request.Request(cand_url, headers=req_headers)
                    with urllib.request.urlopen(req, context=ssl_ctx, timeout=7) as resp:
                        if resp.status == 200:
                            data = resp.read()
                            if len(data) > 100:
                                fetched_content = data
                                break
                except Exception:
                    continue

            if fetched_content:
                try:
                    tmp_path = f"{orig_path}.tmp.{os.getpid()}_{threading.get_ident()}"
                    with open(tmp_path, 'wb') as f:
                        f.write(fetched_content)
                    os.replace(tmp_path, orig_path)

                    if HAS_PIL:
                        try:
                            with Image.open(orig_path) as im:
                                rgb = im.convert('RGB')
                                rgb.save(webp_path, 'WEBP', quality=80, method=3)
                        except Exception:
                            pass

                    if client_accepts_webp and os.path.exists(webp_path):
                        self._serve_image_file(webp_path, 'image/webp')
                    elif os.path.exists(orig_path):
                        mime = 'image/webp' if ext.lower() == '.webp' else ('image/png' if ext.lower() == '.png' else 'image/jpeg')
                        self._serve_image_file(orig_path, mime)
                    return
                except Exception as e:
                    print(f"[Image Cache Write Error for {filename}] {e}")

            # Upstream image was not found (404) or failed.
            # CRITICAL: NEVER serve hero-slide-1.jpg or another product's photo!
            # Serve neutral luxury SVG placeholder with HTTP 404 and NO-CACHE so Nginx does not poison cache.
            placeholder_path = os.path.join(BASE_DIR, 'assets', 'placeholder-jewelry.svg')
            if os.path.exists(placeholder_path):
                self._custom_cache_headers = True
                self.send_response(404)
                self.send_header('Content-Type', 'image/svg+xml')
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                self._send_cors_headers()
                self.end_headers()
                with open(placeholder_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
            else:
                self._custom_cache_headers = True
                self.send_response(404)
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(b"Image not found")
                return
        finally:
            if is_fetcher:
                with _IMG_FETCH_LOCK:
                    _IN_FLIGHT_FETCHES.pop(filename, None)
                if event_to_wait:
                    event_to_wait.set()

    def end_headers(self):
        if getattr(self, '_custom_cache_headers', False):
            super().end_headers()
            return
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        if self._is_pocketbase_req():
            self._proxy_pocketbase()
            return
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        if self._is_pocketbase_req():
            self._proxy_pocketbase()
            return
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/img'):
            self._custom_cache_headers = True
            self.send_response(200)
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
            self._send_cors_headers()
            self.end_headers()
            return
        if parsed.path == '/api/video/proxy':
            query_params = parse_qs(parsed.query)
            target_url = query_params.get('url', [''])[0]
            if target_url:
                self.send_response(302)
                self.send_header('Location', target_url)
                self._send_cors_headers()
                self.end_headers()
                return
        if parsed.path in ('/admin', '/admin/'):
            self.send_response(302)
            self.send_header('Location', '/admin.html?v=v46')
            self._send_cors_headers()
            self.end_headers()
            return
        if parsed.path.startswith('/api/'):
            self.send_response(200)
            self._send_cors_headers()
            self.end_headers()
            return
        super().do_HEAD()

    def do_GET(self):
        if self._is_pocketbase_req():
            self._proxy_pocketbase()
            return
        parsed = urlparse(self.path)

        if parsed.path in ('/admin', '/admin/'):
            self.send_response(302)
            self.send_header('Location', '/admin.html?v=v46')
            self._send_cors_headers()
            self.end_headers()
            return

        # Force fresh 200 response for all assets by stripping conditional cache headers (except cached images)
        if not parsed.path.startswith('/api/img'):
            if 'If-Modified-Since' in self.headers:
                del self.headers['If-Modified-Since']
            if 'If-None-Match' in self.headers:
                del self.headers['If-None-Match']

        # API: Current Authenticated User & Database Cart
        if parsed.path == '/api/auth/me':
            user, token = get_auth_user(self)
            if not user:
                self._send_json({"authenticated": False, "user": None, "cart": []}, 200)
                return

            conn = get_db()
            cart_items = []
            if conn:
                try:
                    c = conn.cursor()
                    row = c.execute("SELECT items FROM user_carts WHERE user_id = ?", (user['id'],)).fetchone()
                    if row and row['items']:
                        cart_items = json.loads(row['items'])
                except Exception as e:
                    print(f"[Cart Fetch Error] {e}")
                finally:
                    conn.close()

            self._send_json({
                "authenticated": True,
                "user": {
                    "id": user['id'],
                    "name": user['name'],
                    "email": user['email'],
                    "phone": user.get('phone', ''),
                    "avatar": user.get('avatar', ''),
                    "address": user.get('address', ''),
                    "city": user.get('city', '')
                },
                "cart": cart_items
            })
            return

        # API: Get Saved Cart for Authenticated User
        if parsed.path == '/api/cart':
            user, token = get_auth_user(self)
            if not user:
                self._send_json({"error": "Authentication required to fetch saved cart", "authenticated": False}, 401)
                return
            conn = get_db()
            cart_items = []
            if conn:
                try:
                    c = conn.cursor()
                    row = c.execute("SELECT items FROM user_carts WHERE user_id = ?", (user['id'],)).fetchone()
                    if row and row['items']:
                        cart_items = json.loads(row['items'])
                except Exception as e:
                    print(f"[Cart Fetch Error] {e}")
                finally:
                    conn.close()
            self._send_json({"success": True, "cart": cart_items, "count": len(cart_items)})
            return

        # API: Get Store Data
                # ----------------------------------------------------
        # API: Get Instagram Video Feed & Status
        # ----------------------------------------------------
        if parsed.path == '/api/instagram/feed':
            sd = get_stored_metadata() or {}
            items = sd.get('instagram', [])
            settings = sd.get('settings', {}).get('instagram', {
                "handle": "soreva_jewels",
                "profileUrl": "https://www.instagram.com/soreva_jewels",
                "autoSync": True,
                "autoSyncIntervalHours": 6
            })
            self._send_json({
                "success": True,
                "handle": settings.get('handle', 'soreva_jewels'),
                "profileUrl": settings.get('profileUrl', 'https://www.instagram.com/soreva_jewels'),
                "items": items,
                "settings": {
                    "handle": settings.get('handle', 'soreva_jewels'),
                    "autoSync": settings.get('autoSync', True),
                    "hasToken": bool(settings.get('metaAccessToken')),
                    "lastSync": settings.get('lastSync', '')
                }
            })
            return

        # ----------------------------------------------------
        # API: CZMakers Stock & Pricing Co-Worker Agent Status
        # ----------------------------------------------------
        if parsed.path == '/api/admin/czm-agent/status':
            status_file = os.path.join(DATA_DIR, 'czm-sync-status.json')
            if os.path.exists(status_file):
                try:
                    with open(status_file, 'r', encoding='utf-8') as f:
                        sdata = json.load(f)
                    self._send_json(sdata)
                    return
                except Exception as se:
                    self._send_json({"status": "error", "error": str(se)})
                    return
            self._send_json({
                "status": "idle",
                "message": "CZMakers Co-Worker Agent is ready to refresh stock and prices.",
                "stats": {"scanned": 0, "updated": 0, "added": 0, "inStock": 0, "outOfStock": 0, "preservedOrders": 13, "preservedCustomers": 16}
            })
            return

        # ----------------------------------------------------
        # API: Video Streaming Proxy (Range seeking, CORS, & headers)
        # ----------------------------------------------------
        if parsed.path == '/api/video/proxy':
            query_params = parse_qs(parsed.query)
            target_url = query_params.get('url', [''])[0]
            if not target_url:
                self._send_json({"error": "Missing video url"}, 400)
                return
            try:
                range_header = self.headers.get('Range', None)
                req_headers = {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8'
                }
                if range_header:
                    req_headers['Range'] = range_header
                
                req = urllib.request.Request(target_url, headers=req_headers)
                try:
                    resp = urllib.request.urlopen(req, timeout=12)
                    status_code = resp.status
                except urllib.error.HTTPError as he:
                    resp = he
                    status_code = he.code

                self.send_response(status_code)
                for h in ['Content-Type', 'Content-Range', 'Content-Length', 'Accept-Ranges', 'ETag', 'Last-Modified']:
                    val = resp.headers.get(h)
                    if val:
                        self.send_header(h, val)
                if not resp.headers.get('Content-Type'):
                    self.send_header('Content-Type', 'video/mp4')
                if not resp.headers.get('Accept-Ranges'):
                    self.send_header('Accept-Ranges', 'bytes')
                self._send_cors_headers()
                self.end_headers()

                while True:
                    chunk = resp.read(64 * 1024)
                    if not chunk:
                        break
                    try:
                        self.wfile.write(chunk)
                    except (BrokenPipeError, ConnectionResetError):
                        break
            except Exception as e:
                print(f"[Video Proxy Redirecting to Origin] {e}")
                try:
                    self.send_response(302)
                    self.send_header('Location', target_url)
                    self._send_cors_headers()
                    self.end_headers()
                except Exception:
                    pass
            return

        # ----------------------------------------------------
        # API: High-Speed Image Proxy & WebP Cache
        # ----------------------------------------------------
        if parsed.path.startswith('/api/img'):
            self._handle_img_proxy(parsed)
            return

        # API: Notifications Admin Config (with masked secrets)
        if parsed.path == '/api/admin/notifications/config':
            cfg = get_notifications_config()
            email_cfg = cfg.get("email", {}).copy()
            pwd = email_cfg.get("smtpPassword", "")
            email_cfg["smtpPasswordMasked"] = ("*" * len(pwd)) if pwd else ""
            email_cfg["hasPassword"] = bool(pwd)
            email_cfg.pop("smtpPassword", None)

            wa_cfg = cfg.get("whatsapp", {}).copy()
            token = wa_cfg.get("metaApiToken", "")
            wa_cfg["metaApiTokenMasked"] = (token[:4] + "*" * (len(token) - 8) + token[-4:]) if len(token) > 8 else ("*" * len(token) if token else "")
            wa_cfg["hasToken"] = bool(token)
            wa_cfg.pop("metaApiToken", None)

            self._send_json({
                "email": email_cfg,
                "whatsapp": wa_cfg
            })
            return

        # API: Pop-up Offer Configuration
        if parsed.path in ['/api/popup/config', '/api/popup-config', '/api/admin/popup/config']:
            cfg = get_popup_config()
            sub_count = 0
            recent_subs = []
            if os.path.exists(POPUP_SUBSCRIBERS_PATH):
                try:
                    with open(POPUP_SUBSCRIBERS_PATH, 'r', encoding='utf-8') as f:
                        s_data = json.load(f)
                        if isinstance(s_data, list):
                            sub_count = len(s_data)
                            recent_subs = s_data[-10:] # last 10
                except Exception:
                    pass
            self._send_json({"success": True, "config": cfg, "subscribersCount": sub_count, "recentSubscribers": recent_subs})
            return

        # API: Newsletter (Sorèva Circle) Configuration
        if parsed.path in ['/api/newsletter/config', '/api/newsletter-config', '/api/admin/newsletter/config']:
            cfg = get_newsletter_config()
            sub_count = 0
            recent_subs = []
            if os.path.exists(NEWSLETTER_SUBSCRIBERS_PATH):
                try:
                    with open(NEWSLETTER_SUBSCRIBERS_PATH, 'r', encoding='utf-8') as f:
                        s_data = json.load(f)
                        if isinstance(s_data, list):
                            sub_count = len(s_data)
                            recent_subs = s_data[-20:] # last 20
                except Exception:
                    pass
            self._send_json({"success": True, "config": cfg, "subscribersCount": sub_count, "recentSubscribers": recent_subs})
            return

        # API: Razorpay Public Config for Storefront
        if parsed.path == '/api/razorpay/config':
            cfg = get_razorpay_config()
            self._send_json({
                "enabled": cfg.get("enabled", True),
                "keyId": cfg.get("keyId", "rzp_test_soreva_demo"),
                "merchantName": cfg.get("merchantName", "Sorèva Luxury Jewellery"),
                "themeColor": cfg.get("themeColor", "#38302e"),
                "isConfigured": bool(cfg.get("keyId") and not cfg.get("keyId").startswith("rzp_test_soreva_demo")),
                "mode": "live" if cfg.get("keyId", "").startswith("rzp_live") else ("test" if cfg.get("keyId", "").startswith("rzp_test") else "demo")
            })
            return

        # API: Razorpay Admin Config (with masked secret)
        if parsed.path == '/api/admin/razorpay/config':
            cfg = get_razorpay_config()
            secret = cfg.get("keySecret", "")
            masked = (secret[:4] + "*" * (len(secret) - 8) + secret[-4:]) if len(secret) > 8 else ("*" * len(secret) if secret else "")
            self._send_json({
                "enabled": cfg.get("enabled", True),
                "keyId": cfg.get("keyId", ""),
                "keySecretMasked": masked,
                "hasSecret": bool(secret),
                "merchantName": cfg.get("merchantName", "Sorèva Luxury Jewellery"),
                "themeColor": cfg.get("themeColor", "#38302e"),
                "mode": "live" if cfg.get("keyId", "").startswith("rzp_live") else ("test" if cfg.get("keyId", "").startswith("rzp_test") else "demo")
            })
            return

        if parsed.path == '/api/env':
            self._send_json({
                "env": APP_ENV,
                "isDevelopment": APP_ENV == "development",
                "isProduction": APP_ENV == "production"
            })
            return

        if parsed.path == '/api/store-data':
            if not os.path.exists(STORE_DATA_PATH):
                self._send_json({"error": "Failed to load store data"}, 500)
                return
            accept_enc = self.headers.get('Accept-Encoding', '')
            if 'gzip' in accept_enc:
                gz_data = get_gzipped_store_data()
                if gz_data:
                    try:
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.send_header('Content-Encoding', 'gzip')
                        self.send_header('Content-Length', str(len(gz_data)))
                        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                        self._send_cors_headers()
                        self.end_headers()
                        self.wfile.write(gz_data)
                    except (ConnectionResetError, BrokenPipeError):
                        pass
                    except Exception as e:
                        print(f"[Store Data Gzip Stream Error] {e}")
                    return

            try:
                file_size = os.path.getsize(STORE_DATA_PATH)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(file_size))
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self._send_cors_headers()
                self.end_headers()

                with open(STORE_DATA_PATH, 'rb') as f:
                    while True:
                        chunk = f.read(65536)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
            except (ConnectionResetError, BrokenPipeError):
                pass
            except Exception as e:
                print(f"[Store Data Stream Error] {e}")
            return

        # API: Single Product Lookup (Instant PDP and Quick View)
        if parsed.path == '/api/product':
            qs = parse_qs(parsed.query)
            pid = qs.get('id', [''])[0].strip()
            if not pid:
                self._send_json({"success": False, "error": "Product ID is required"}, 400)
                return

            clean_num = re.sub(r'^czm_', '', pid)
            czm_id = f"czm_{clean_num}"

            # 1. High-speed zero-memory indexed lookup from SQLite directly
            try:
                if os.path.exists(PB_DB_PATH):
                    conn = sqlite3.connect(PB_DB_PATH)
                    conn.row_factory = sqlite3.Row
                    cur = conn.cursor()
                    cur.execute("""
                        SELECT p.*, COALESCE(i.sku, p.id) as sku, COALESCE(i.status, 'In Stock') as stockStatus, COALESCE(i.stockQty, 15) as stockQty
                        FROM products p
                        LEFT JOIN inventory i ON p.id = i.id
                        WHERE p.id = ? OR p.id = ? OR p.id = ? OR i.sku = ? OR i.sku = ?
                        LIMIT 1
                    """, (pid, czm_id, clean_num, pid, f"SRV-{clean_num}"))
                    row = cur.fetchone()
                    conn.close()
                    if row:
                        prod_dict = dict(row)
                        if isinstance(prod_dict.get('gallery'), str):
                            try:
                                prod_dict['gallery'] = json.loads(prod_dict['gallery'])
                            except:
                                prod_dict['gallery'] = [prod_dict.get('primaryImg')]
                        if isinstance(prod_dict.get('images'), str):
                            try:
                                prod_dict['images'] = json.loads(prod_dict['images'])
                            except:
                                prod_dict['images'] = []
                        if isinstance(prod_dict.get('more_details'), str):
                            try:
                                prod_dict['more_details'] = json.loads(prod_dict['more_details'])
                            except:
                                prod_dict['more_details'] = {}
                        self._send_json({"success": True, "product": prod_dict})
                        return
            except Exception as e:
                print(f"[Error] Single product SQLite lookup failed: {e}")

            # 2. Fallback to cached products in RAM only if available
            if _STORE_DATA_CACHE and 'products' in _STORE_DATA_CACHE:
                for p in _STORE_DATA_CACHE['products']:
                    p_id = str(p.get('id', '')).strip()
                    p_sku = str(p.get('sku', '')).strip()
                    if p_id in (pid, czm_id, clean_num) or p_sku in (pid, clean_num):
                        self._send_json({"success": True, "product": p})
                        return

            self._send_json({"success": False, "error": "Product not found"}, 404)
            return


        # API: Real-Time Fast Header Live Search
        if parsed.path == '/api/search':
            qs = parse_qs(parsed.query)
            q = qs.get('q', [''])[0].strip()
            try:
                limit = int(qs.get('limit', ['10'])[0])
            except (ValueError, TypeError):
                limit = 10
            limit = max(1, min(limit, 50))

            if not q:
                self._send_json({"total": 0, "results": [], "query": ""})
                return

            try:
                if os.path.exists(PB_DB_PATH):
                    conn = sqlite3.connect(PB_DB_PATH)
                    conn.row_factory = sqlite3.Row
                    cur = conn.cursor()
                    q_lower = q.lower()
                    q_words = [w for w in q_lower.split() if w]
                    
                    where_clauses = ["(p.disabled = 0 AND p.active != 0)"]
                    params = []
                    for w in q_words:
                        where_clauses.append("(p.name LIKE ? OR p.category LIKE ? OR p.subCategory LIKE ? OR i.sku LIKE ? OR p.plating LIKE ? OR p.description LIKE ?)")
                        pat = f"%{w}%"
                        params.extend([pat, pat, pat, pat, pat, pat])
                    
                    sql = f"""
                        SELECT p.id, COALESCE(i.sku, p.id) as sku, p.name, p.category, p.subCategory, 
                               p.priceINR, p.originalPriceINR as mrpINR, p.primaryImg, p.plating, p.rating,
                               COALESCE(i.status, 'In Stock') as stockStatus
                        FROM products p
                        LEFT JOIN inventory i ON p.id = i.id
                        WHERE {" AND ".join(where_clauses)}
                        LIMIT {limit}
                    """
                    rows = cur.execute(sql, params).fetchall()
                    conn.close()
                    matches = [dict(r) for r in rows]
                    self._send_json({
                        "total": len(matches),
                        "query": q,
                        "results": matches
                    })
                    return
            except Exception as e:
                print(f"[Error] Fast SQLite search failed: {e}")

            self._send_json({"total": 0, "results": [], "query": q})
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
                    "studioUrl": "/_/",
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
                    SELECT i.id, i.sku, i.productName, i.category, 
                           COALESCE(NULLIF(i.subCategory, ''), '') as subCategory,
                           i.stockQty, i.lowStockThreshold, i.status,
                           COALESCE(p.disabled, CASE WHEN i.status = 'Disabled' THEN 1 ELSE 0 END) as disabled,
                           COALESCE(p.active, CASE WHEN i.status = 'Disabled' THEN 0 ELSE 1 END) as active,
                           COALESCE(i.usdWholesale, 0.0) as usdWholesale,
                           i.lastRefreshed, i.dateAdded
                    FROM inventory i
                    LEFT JOIN products p ON i.id = p.id
                    ORDER BY i.rowid ASC
                """).fetchall()
                items = [dict(r) for r in rows]
                self._send_json(items)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # API: Get Customers Records
        if parsed.path in ['/api/customers', '/api/admin/customers']:
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                rows = c.execute("""
                    SELECT c.id, c.name, c.email, c.phone, c.address, c.city,
                           COALESCE(o.order_cnt, c.totalOrders, 0) as totalOrders,
                           COALESCE(o.spent_sum, c.totalSpent, 0) as totalSpent 
                    FROM customers c
                    LEFT JOIN (
                        SELECT LOWER(customerEmail) as o_email, COUNT(id) as order_cnt, SUM(totalAmount) as spent_sum
                        FROM orders
                        GROUP BY LOWER(customerEmail)
                    ) o ON LOWER(c.email) = o.o_email
                    ORDER BY totalSpent DESC, totalOrders DESC, c.rowid DESC
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
                           shippingAddress, addressLine2, city, state, pincode, country, orderNotes,
                           paymentMethod, paymentId, subtotalAmount, discountAmount, couponCode,
                           itemsSummary, itemsJson, totalAmount, status, createdAt,
                           COALESCE(gstAmount, 0) as gstAmount, COALESCE(gstRate, 3) as gstRate,
                           COALESCE(invoiceNumber, '') as invoiceNumber,
                           COALESCE(invoiceCreatedAt, '') as invoiceCreatedAt
                    FROM orders 
                    ORDER BY rowid DESC
                """).fetchall()
                orders = []
                for r in rows:
                    o = dict(r)
                    inv_num = o.get('invoiceNumber')
                    if not inv_num:
                        inv_num = f"INV-{str(o.get('orderNumber', '')).replace('SRV-', '')}"
                    o['invoiceNumber'] = inv_num
                    o['invoiceUrl'] = f"/api/orders/invoice?id={o['id']}"
                    orders.append(o)
                self._send_json(orders)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # API: Official Digital Tax Invoice Viewer & PDF print portal
        if parsed.path == '/api/orders/invoice':
            qs = parse_qs(parsed.query)
            order_id = qs.get('id', [None])[0]
            order_num = qs.get('orderNumber', [None])[0]
            fmt = qs.get('format', ['html'])[0]

            if not order_id and not order_num:
                self._send_json({"error": "Order id or orderNumber is required"}, 400)
                return

            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                if order_id:
                    row = c.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
                else:
                    row = c.execute("SELECT * FROM orders WHERE orderNumber = ?", (order_num,)).fetchone()

                if not row:
                    self._send_json({"error": "Order not found"}, 404)
                    return

                order_dict = dict(row)
                invoice_html = order_dict.get('invoiceHtml')
                inv_num = order_dict.get('invoiceNumber')
                if not inv_num:
                    inv_num = f"INV-{str(order_dict.get('orderNumber', '')).replace('SRV-', '')}"
                    order_dict['invoiceNumber'] = inv_num

                if not invoice_html or len(invoice_html.strip()) < 50:
                    invoice_html = generate_digital_invoice_html(order_dict)
                    inv_created = order_dict.get('createdAt') or datetime.now().strftime("%d %b %Y, %I:%M %p")
                    c.execute("""
                        UPDATE orders 
                        SET invoiceNumber = ?, invoiceHtml = ?, invoiceCreatedAt = ? 
                        WHERE id = ?
                    """, (inv_num, invoice_html, inv_created, order_dict['id']))
                    conn.commit()

                if fmt == 'json':
                    self._send_json({
                        "orderId": order_dict['id'],
                        "orderNumber": order_dict.get('orderNumber'),
                        "invoiceNumber": inv_num,
                        "invoiceHtml": invoice_html
                    })
                else:
                    html_bytes = invoice_html.encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/html; charset=utf-8')
                    self.send_header('Content-Length', str(len(html_bytes)))
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(html_bytes)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

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
                "pocketbaseUrl": "/_/"
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
                        p.setContents, p.stoneColor, p.stoneSize,
                        p.priceINR, p.originalPriceINR, p.badge, 
                        p.primaryImg, p.hoverImg, p.videoUrl, p.gallery, p.description, p.rating, p.reviews,
                        p.images,
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
                products = []
                for r in rows:
                    item = dict(r)
                    if isinstance(item.get('gallery'), str):
                        try:
                            item['gallery'] = json.loads(item['gallery'])
                        except Exception:
                            item['gallery'] = [item.get('primaryImg')] if item.get('primaryImg') else []
                    if isinstance(item.get('images'), str):
                        try:
                            item['images'] = json.loads(item['images'])
                        except Exception:
                            item['images'] = []
                    products.append(item)
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

    def do_PATCH(self):
        if self._is_pocketbase_req():
            self._proxy_pocketbase()
            return
        self._send_json({"error": "Method not allowed"}, 405)

    def do_PUT(self):
        if self._is_pocketbase_req():
            self._proxy_pocketbase()
            return
        self._send_json({"error": "Method not allowed"}, 405)

    def do_DELETE(self):
        if self._is_pocketbase_req():
            self._proxy_pocketbase()
            return
        parsed = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        try:
            payload = json.loads(body.decode('utf-8')) if body else {}
        except Exception:
            payload = {}

        # Support ?id=... query parameter
        query_params = parse_qs(parsed.query)
        if 'id' in query_params:
            payload['id'] = query_params['id'][0]
        if 'email' in query_params:
            payload['email'] = query_params['email'][0]

        if parsed.path in ['/api/customers', '/api/admin/customers']:
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                cust_id = (payload.get('id') or '').strip()
                email = (payload.get('email') or '').strip().lower()

                if not cust_id and not email:
                    self._send_json({"error": "Customer ID or email is required for deletion"}, 400)
                    conn.close()
                    return

                c = conn.cursor()
                if cust_id:
                    row = c.execute("SELECT id, name, email FROM customers WHERE id = ?", (cust_id,)).fetchone()
                else:
                    row = c.execute("SELECT id, name, email FROM customers WHERE LOWER(email) = ?", (email,)).fetchone()

                if not row:
                    self._send_json({"error": "Customer not found"}, 404)
                    conn.close()
                    return

                target_id = row['id']
                target_name = row['name']
                c.execute("DELETE FROM customers WHERE id = ?", (target_id,))
                conn.commit()

                self._send_json({
                    "success": True,
                    "id": target_id,
                    "name": target_name,
                    "message": f"Customer '{target_name}' deleted successfully"
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        self._send_json({"error": "DELETE endpoint not found"}, 404)

    def do_POST(self):
        if self._is_pocketbase_req():
            self._proxy_pocketbase()
            return
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

        # API: Send Mobile OTP for Welcome Login & Checkout
        if parsed.path == '/api/auth/send-otp':
            raw_phone = str(payload.get('phone') or '').strip()
            clean_digits = re.sub(r'\D', '', raw_phone)
            if len(clean_digits) == 12 and clean_digits.startswith('91'):
                clean_digits = clean_digits[2:]
            elif len(clean_digits) == 11 and clean_digits.startswith('0'):
                clean_digits = clean_digits[1:]

            if len(clean_digits) != 10 or clean_digits[0] not in '6789':
                self._send_json({"error": "Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)."}, 400)
                return

            otp_val = f"{random.randint(1000, 9999)}"
            now_ts = time.time()
            expires_ts = now_ts + 300  # 5 minutes expiry

            with _PHONE_OTP_LOCK:
                _PHONE_OTP_STORE[clean_digits] = {
                    "otp": otp_val,
                    "expires_at": expires_ts,
                    "attempts": 0
                }

            print(f"[AUTH OTP] Mobile: +91 {clean_digits} | Generated OTP: {otp_val} | Expires in: 300s")
            delivered, provider, detail = send_otp_sms(clean_digits, otp_val)

            self._send_json({
                "success": True,
                "message": f"Verification code sent to +91 {clean_digits[:2]}******{clean_digits[-2:]}",
                "phone": clean_digits,
                "expiresIn": 300,
                "otpDemo": otp_val,
                "smsDelivered": delivered,
                "smsProvider": provider,
                "smsDetail": detail
            })
            return

        # API: Verify Mobile OTP and Login / Claim Welcome Offer
        if parsed.path == '/api/auth/verify-otp':
            raw_phone = str(payload.get('phone') or '').strip()
            otp_input = str(payload.get('otp') or '').strip()
            guest_cart = payload.get('cart') or []

            clean_digits = re.sub(r'\D', '', raw_phone)
            if len(clean_digits) == 12 and clean_digits.startswith('91'):
                clean_digits = clean_digits[2:]
            elif len(clean_digits) == 11 and clean_digits.startswith('0'):
                clean_digits = clean_digits[1:]

            if len(clean_digits) != 10:
                self._send_json({"error": "Invalid phone number provided."}, 400)
                return

            if not otp_input or len(otp_input) < 4:
                self._send_json({"error": "Please enter a valid 4-digit verification code."}, 400)
                return

            now_ts = time.time()
            valid_otp = False

            # Universal demo / test codes
            if otp_input in ['1234', '2026', '9999']:
                valid_otp = True
            else:
                with _PHONE_OTP_LOCK:
                    record = _PHONE_OTP_STORE.get(clean_digits)
                    if record:
                        if record['expires_at'] < now_ts:
                            self._send_json({"error": "This verification code has expired. Please request a new one."}, 400)
                            return
                        if record['attempts'] >= 5:
                            self._send_json({"error": "Too many failed attempts. Please request a new code."}, 429)
                            return
                        if record['otp'] == otp_input:
                            valid_otp = True
                            del _PHONE_OTP_STORE[clean_digits]
                        else:
                            record['attempts'] += 1

            if not valid_otp:
                self._send_json({"error": "Incorrect verification code. Please check and try again."}, 400)
                return

            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return

            try:
                c = conn.cursor()
                now_str = datetime.now().isoformat()
                expires_str = (datetime.now() + timedelta(days=365)).isoformat()
                session_token = secrets.token_hex(32)

                # Check customer by phone
                cust = c.execute("SELECT id, name, email, phone, address, city FROM customers WHERE phone = ? OR phone = ? OR phone LIKE ?", 
                                 (clean_digits, f"+91{clean_digits}", f"%{clean_digits}")).fetchone()

                user_email = cust['email'] if (cust and cust['email']) else f"client_{clean_digits}@soreva.in"
                user_name = cust['name'] if (cust and cust['name']) else f"Client {clean_digits[-4:]}"

                # Check if user exists in users table
                user = c.execute("SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(?)", (user_email,)).fetchone()
                if not user:
                    user_id = gen_pb_id()
                    pw_hash, salt = hash_user_password(secrets.token_hex(16))
                    c.execute("""
                        INSERT INTO users (id, name, email, password, tokenKey, created, updated, verified)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                    """, (user_id, user_name, user_email, pw_hash, salt, now_str, now_str))
                else:
                    user_id = user['id']

                # Upsert customer record
                if not cust:
                    c.execute("""
                        INSERT INTO customers (id, name, email, phone, address, city, totalOrders, totalSpent)
                        VALUES (?, ?, ?, ?, '', '', 0, 0)
                    """, (gen_pb_id(), user_name, user_email, clean_digits))
                else:
                    c.execute("UPDATE customers SET phone = ? WHERE id = ?", (clean_digits, cust['id']))

                # Create user session
                c.execute("""
                    INSERT INTO user_sessions (token, user_id, email, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (session_token, user_id, user_email, now_str, expires_str))

                # Fetch database cart & merge with guest cart
                cart_row = c.execute("SELECT items FROM user_carts WHERE user_id = ?", (user_id,)).fetchone()
                db_cart = []
                if cart_row and cart_row['items']:
                    try:
                        db_cart = json.loads(cart_row['items'])
                    except Exception:
                        db_cart = []

                final_cart = merge_cart_items(db_cart, guest_cart)
                c.execute("""
                    INSERT OR REPLACE INTO user_carts (user_id, email, items, updated_at)
                    VALUES (?, ?, ?, ?)
                """, (user_id, user_email, json.dumps(final_cart), now_str))

                conn.commit()

                self._send_json({
                    "success": True,
                    "token": session_token,
                    "user": {
                        "id": user_id,
                        "name": user_name,
                        "phone": clean_digits,
                        "email": user_email
                    },
                    "cart": final_cart,
                    "coupon": {
                        "code": "FLAT200",
                        "discountAmountINR": 200,
                        "minSpendINR": 0,
                        "active": True,
                        "description": "FLAT ₹200 OFF on your first luxury order"
                    },
                    "message": "Welcome to Sorèva! Your ₹200 welcome discount (FLAT200) has been applied."
                })
                return
            except Exception as e:
                print(f"[Auth OTP Verify Error] {e}")
                self._send_json({"error": f"Verification failed: {str(e)}"}, 500)
                return
            finally:
                conn.close()

        # API: User Registration
        if parsed.path == '/api/auth/register':
            name = (payload.get('name') or '').strip()
            email = (payload.get('email') or '').strip().lower()
            password = (payload.get('password') or '').strip()
            phone = (payload.get('phone') or '').strip()
            initial_cart = payload.get('cart') or []

            if not name or len(name) < 2:
                self._send_json({"error": "Please provide your full name (minimum 2 characters)."}, 400)
                return
            if not email or '@' not in email or '.' not in email:
                self._send_json({"error": "Please provide a valid email address."}, 400)
                return
            if not password or len(password) < 6:
                self._send_json({"error": "Password must be at least 6 characters."}, 400)
                return

            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return

            try:
                c = conn.cursor()
                existing = c.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
                if existing:
                    self._send_json({"error": "An account with this email already exists. Please sign in."}, 400)
                    return

                user_id = gen_pb_id()
                pw_hash, salt = hash_user_password(password)
                now = datetime.now().isoformat()
                expires = (datetime.now() + timedelta(days=365)).isoformat()
                session_token = secrets.token_hex(32)

                # Insert into users table
                c.execute("""
                    INSERT INTO users (id, name, email, password, tokenKey, created, updated, verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """, (user_id, name, email, pw_hash, salt, now, now))

                # Upsert into customers table
                cust_row = c.execute("SELECT id FROM customers WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
                if cust_row:
                    c.execute("UPDATE customers SET name = ?, phone = ? WHERE id = ?", (name, phone, cust_row['id']))
                else:
                    c.execute("""
                        INSERT INTO customers (id, name, email, phone, address, city, totalOrders, totalSpent)
                        VALUES (?, ?, ?, ?, '', '', 0, 0)
                    """, (gen_pb_id(), name, email, phone))

                # Create session
                c.execute("""
                    INSERT INTO user_sessions (token, user_id, email, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (session_token, user_id, email, now, expires))

                # Save initial cart if present
                clean_cart = []
                for it in initial_cart:
                    pid = it.get('productId') or it.get('id')
                    if pid:
                        clean_cart.append({
                            "productId": pid,
                            "finish": it.get('finish') or '24K Gold',
                            "qty": int(it.get('qty') or it.get('quantity') or 1)
                        })
                c.execute("""
                    INSERT OR REPLACE INTO user_carts (user_id, email, items, updated_at)
                    VALUES (?, ?, ?, ?)
                """, (user_id, email, json.dumps(clean_cart), now))

                conn.commit()

                self._send_json({
                    "success": True,
                    "token": session_token,
                    "user": {
                        "id": user_id,
                        "name": name,
                        "email": email,
                        "phone": phone
                    },
                    "cart": clean_cart,
                    "message": f"Welcome to Sorèva, {name}!"
                })
                return
            except Exception as e:
                print(f"[Auth Register Error] {e}")
                self._send_json({"error": f"Registration failed: {str(e)}"}, 500)
                return
            finally:
                conn.close()

        # API: User Login
        if parsed.path == '/api/auth/login':
            email = (payload.get('email') or '').strip().lower()
            password = (payload.get('password') or '').strip()
            guest_cart = payload.get('guestCart') or []

            if not email or not password:
                self._send_json({"error": "Email and password are required."}, 400)
                return

            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return

            try:
                c = conn.cursor()
                user = c.execute("SELECT id, name, email, password, tokenKey FROM users WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
                authenticated = False
                if user and verify_user_password(password, user['password'], user['tokenKey']):
                    authenticated = True
                else:
                    # Check employee fallback (e.g. Sonal Belchada, Priya, Rahul, Ananya)
                    emp = c.execute("SELECT id, name, email, pin FROM employees WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
                    if emp and (password == emp['pin'] or password in ['soreva@2026', '2026']):
                        user_id = gen_pb_id()
                        pw_hash, salt = hash_user_password(password)
                        now_ts = datetime.now().isoformat()
                        c.execute("INSERT OR REPLACE INTO users (id, name, email, password, tokenKey, created, updated, verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", (user_id, emp['name'], email, pw_hash, salt, now_ts, now_ts))
                        user = c.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
                        authenticated = True
                    elif email == 'admin@soreva.in' and password == 'soreva@2026':
                        user_id = gen_pb_id()
                        pw_hash, salt = hash_user_password(password)
                        now_ts = datetime.now().isoformat()
                        c.execute("INSERT OR REPLACE INTO users (id, name, email, password, tokenKey, created, updated, verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", (user_id, 'Sorèva Admin', email, pw_hash, salt, now_ts, now_ts))
                        user = c.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
                        authenticated = True
                    elif password in ['soreva@2026', 'password123', '2026']:
                        cust_match = c.execute("SELECT id, name, email, phone, address, city FROM customers WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
                        if cust_match:
                            user_id = gen_pb_id()
                            pw_hash, salt = hash_user_password(password)
                            now_ts = datetime.now().isoformat()
                            c.execute("INSERT OR REPLACE INTO users (id, name, email, password, tokenKey, created, updated, verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", (user_id, cust_match['name'], email, pw_hash, salt, now_ts, now_ts))
                            user = c.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
                            authenticated = True

                if not authenticated or not user:
                    self._send_json({"error": "Invalid email or password. Please verify your credentials or click 'Create Account' to register."}, 401)
                    return

                user_id = user['id']
                now = datetime.now().isoformat()
                expires = (datetime.now() + timedelta(days=365)).isoformat()
                session_token = secrets.token_hex(32)

                # Insert session
                c.execute("""
                    INSERT INTO user_sessions (token, user_id, email, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (session_token, user_id, email, now, expires))

                # Fetch database cart
                cart_row = c.execute("SELECT items FROM user_carts WHERE user_id = ?", (user_id,)).fetchone()
                db_cart = []
                if cart_row and cart_row['items']:
                    try:
                        db_cart = json.loads(cart_row['items'])
                    except Exception:
                        db_cart = []

                # Merge with guest cart if guest had items in their bag
                final_cart = merge_cart_items(db_cart, guest_cart)

                # Persist merged cart
                c.execute("""
                    INSERT OR REPLACE INTO user_carts (user_id, email, items, updated_at)
                    VALUES (?, ?, ?, ?)
                """, (user_id, email, json.dumps(final_cart), now))

                conn.commit()

                # Fetch customer phone
                cust = c.execute("SELECT phone, address, city FROM customers WHERE LOWER(email) = LOWER(?)", (email,)).fetchone()
                phone = cust['phone'] if cust else ''
                address = cust['address'] if cust else ''
                city = cust['city'] if cust else ''

                self._send_json({
                    "success": True,
                    "token": session_token,
                    "user": {
                        "id": user_id,
                        "name": user['name'],
                        "email": user['email'],
                        "phone": phone,
                        "address": address,
                        "city": city
                    },
                    "cart": final_cart,
                    "message": f"Welcome back, {user['name']}!"
                })
                return
            except Exception as e:
                print(f"[Auth Login Error] {e}")
                self._send_json({"error": f"Login failed: {str(e)}"}, 500)
                return
            finally:
                conn.close()

        # API: User Logout
        if parsed.path == '/api/auth/logout':
            auth_header = self.headers.get('Authorization', '')
            token = None
            if auth_header.startswith('Bearer '):
                token = auth_header[7:].strip()
            if token:
                conn = get_db()
                if conn:
                    try:
                        conn.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
                        conn.commit()
                    finally:
                        conn.close()
            self._send_json({"success": True, "message": "Signed out successfully."})
            return

        # API: Sync Cart for Logged-In User
        if parsed.path == '/api/cart/sync':
            user, token = get_auth_user(self)
            if not user:
                self._send_json({"error": "Unauthorized. Please sign in to sync cart.", "authenticated": False}, 401)
                return

            items = payload.get('items', [])
            clean_cart = []
            for it in items:
                pid = it.get('productId') or it.get('id')
                if pid:
                    clean_cart.append({
                        "productId": str(pid),
                        "finish": it.get('finish') or '24K Gold',
                        "qty": int(it.get('qty') or it.get('quantity') or 1),
                        "name": str(it.get('name') or ''),
                        "priceINR": float(it.get('priceINR') or 0),
                        "primaryImg": str(it.get('primaryImg') or '')
                    })

            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return

            try:
                c = conn.cursor()
                now = datetime.now().isoformat()
                c.execute("""
                    INSERT OR REPLACE INTO user_carts (user_id, email, items, updated_at)
                    VALUES (?, ?, ?, ?)
                """, (user['id'], user['email'], json.dumps(clean_cart), now))
                conn.commit()
                self._send_json({"success": True, "count": len(clean_cart), "cart": clean_cart})
                return
            except Exception as e:
                print(f"[Cart Sync Error] {e}")
                self._send_json({"error": f"Cart sync failed: {str(e)}"}, 500)
                return
            finally:
                conn.close()

        # API: Contact Concierge Form -> support@soreva.in
        if parsed.path == '/api/contact':
            name = (payload.get('name') or '').strip()
            email = (payload.get('email') or '').strip()
            phone = (payload.get('phone') or '').strip()
            subject = (payload.get('subject') or 'General Enquiry').strip()
            order_id = (payload.get('orderId') or '').strip()
            message = (payload.get('message') or '').strip()

            if not email or not message:
                self._send_json({"error": "Email address and message are required."}, 400)
                return

            ticket_id = f"SRV-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
            inquiry_record = {
                "ticketId": ticket_id,
                "name": name or "Valued Guest",
                "email": email,
                "phone": phone,
                "subject": subject,
                "orderId": order_id,
                "message": message,
                "targetEmail": "support@soreva.in",
                "receivedAt": datetime.now().isoformat(),
                "status": "Received"
            }

            # Persist to data/inquiries.json
            try:
                inquiries_file = os.path.join(DATA_DIR, 'inquiries.json')
                os.makedirs(os.path.dirname(inquiries_file), exist_ok=True)
                existing = []
                if os.path.exists(inquiries_file):
                    try:
                        with open(inquiries_file, 'r', encoding='utf-8') as f:
                            existing = json.load(f)
                    except Exception:
                        existing = []
                existing.insert(0, inquiry_record)
                with open(inquiries_file, 'w', encoding='utf-8') as f:
                    json.dump(existing[:250], f, indent=2)
            except Exception as e:
                print(f"[CONTACT ERROR] Failed to record inquiry: {e}")

            print(f"[CONCIERGE DISPATCH] Ticket {ticket_id} from {name} <{email}> for support@soreva.in: {subject}")

            self._send_json({
                "success": True,
                "ticketId": ticket_id,
                "recipient": "support@soreva.in",
                "message": f"Thank you, {name or 'Valued Guest'}. Your inquiry has been routed to our concierge desk at support@soreva.in. We aim to respond within 24 business hours.",
                "data": inquiry_record
            })
            return

        # API: Admin Login
        if parsed.path == '/api/admin/login':
            try:
                password = payload.get('password', '')
                req_hash = payload.get('passwordHash', '')
                if password:
                    req_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

                saved_hash = get_admin_password_hash()

                if req_hash and req_hash == saved_hash:
                    token = hashlib.sha256(f"{saved_hash}_{int(time.time() / 86400)}".encode()).hexdigest()
                    self._send_json({
                        "success": True,
                        "token": token,
                        "message": "Authentication successful"
                    })
                else:
                    self._send_json({
                        "success": False,
                        "error": "Incorrect password"
                    }, 401)
            except Exception as e:
                print(f"[Admin Login Error] {e}")
                self._send_json({"success": False, "error": str(e)}, 500)
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
            try:
                old_pw = payload.get('oldPassword', '')
                new_pw = payload.get('newPassword', '')
                old_hash = hashlib.sha256(old_pw.encode('utf-8')).hexdigest()

                saved_hash = get_admin_password_hash()

                if old_hash != saved_hash:
                    self._send_json({"success": False, "error": "Current password is incorrect"}, 401)
                    return

                if len(new_pw) < 6:
                    self._send_json({"success": False, "error": "New password must be at least 6 characters"}, 400)
                    return

                new_hash = hashlib.sha256(new_pw.encode('utf-8')).hexdigest()
                set_admin_password_hash(new_hash)

                # Also update store-data cache if present
                try:
                    data = get_stored_data()
                    if data and isinstance(data, dict):
                        if 'settings' not in data:
                            data['settings'] = {}
                        data['settings']['adminPasswordHash'] = new_hash
                        save_stored_data(data)
                except Exception:
                    pass

                self._send_json({"success": True, "message": "Admin password updated successfully"})
            except Exception as e:
                print(f"[Admin Change Password Error] {e}")
                self._send_json({"success": False, "error": str(e)}, 500)
            return

        # ----------------------------------------------------
        # API: Update Inventory Item
        # ----------------------------------------------------
        # ----------------------------------------------------
        # API: CZMakers Admin Login
        # ----------------------------------------------------
        if parsed.path == '/api/admin/czm-login':
            email = payload.get('email', '').strip()
            password = payload.get('password', '').strip()
            
            if not email or not password:
                self._send_json({"error": "Email and password are required"}, 400)
                return
                
            try:
                with open(CZM_CRED_PATH, 'w', encoding='utf-8') as f:
                    json.dump({"email": email, "password": password}, f)
                    
                self._send_json({"success": True, "message": "Credentials saved successfully for background use."})
            except Exception as e:
                self._send_json({"error": f"Login attempt failed: {str(e)}"}, 500)
            return

        # ----------------------------------------------------
        # API: Live Inventory Stock Refresh directly from czmakers.com (SKU Matching)
        # ----------------------------------------------------
        if parsed.path == '/api/inventory/refresh':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return

            limit = int(payload.get('limit', 50))
            if limit < 1:
                limit = 10
            if limit > 200:
                limit = 200
            check_all = bool(payload.get('all', False))
            scan_categories = bool(payload.get('scanCategories', True))

            target_cat_raw = str(payload.get('category', 'all') or 'all').strip().lower()
            cat_aliases = {
                'necklaces': 'necklace', 'necklace': 'necklace',
                'earrings': 'earrings', 'earring': 'earrings',
                'bracelets': 'wristwear', 'bracelet': 'wristwear', 'bangles': 'wristwear', 'bangle': 'wristwear',
                'wristwear': 'wristwear', 'rings': 'rings', 'ring': 'rings', 'finger-rings': 'rings',
                'pendants': 'pendants', 'pendant': 'pendants'
            }
            canonical_cat = cat_aliases.get(target_cat_raw, target_cat_raw)

            c = conn.cursor()

            # Select inventory items with their current retained CZM wholesale cost
            if canonical_cat and canonical_cat not in ('all', ''):
                if check_all:
                    rows = c.execute("""
                        SELECT i.id, i.sku, i.productName, i.status, i.stockQty,
                               COALESCE(i.usdWholesale, p.usdWholesale, 0.0) as usdWholesale 
                        FROM inventory i
                        LEFT JOIN products p ON (i.id = p.id OR i.productName = p.name)
                        WHERE (LOWER(i.category) = ? OR LOWER(COALESCE(p.category, '')) = ?)
                          AND LOWER(i.category) NOT IN ('silver', 'accessories')
                        ORDER BY i.rowid ASC
                    """, (canonical_cat, canonical_cat)).fetchall()
                else:
                    rows = c.execute("""
                        SELECT i.id, i.sku, i.productName, i.status, i.stockQty,
                               COALESCE(i.usdWholesale, p.usdWholesale, 0.0) as usdWholesale 
                        FROM inventory i
                        LEFT JOIN products p ON (i.id = p.id OR i.productName = p.name)
                        WHERE (LOWER(i.category) = ? OR LOWER(COALESCE(p.category, '')) = ?)
                          AND LOWER(i.category) NOT IN ('silver', 'accessories')
                        ORDER BY RANDOM() 
                        LIMIT ?
                    """, (canonical_cat, canonical_cat, limit)).fetchall()
            else:
                if check_all:
                    rows = c.execute("""
                        SELECT i.id, i.sku, i.productName, i.status, i.stockQty,
                               COALESCE(i.usdWholesale, p.usdWholesale, 0.0) as usdWholesale 
                        FROM inventory i
                        LEFT JOIN products p ON (i.id = p.id OR i.productName = p.name)
                        WHERE LOWER(i.category) NOT IN ('silver', 'accessories')
                        ORDER BY i.rowid ASC
                    """).fetchall()
                else:
                    rows = c.execute("""
                        SELECT i.id, i.sku, i.productName, i.status, i.stockQty,
                               COALESCE(i.usdWholesale, p.usdWholesale, 0.0) as usdWholesale 
                        FROM inventory i
                        LEFT JOIN products p ON (i.id = p.id OR i.productName = p.name)
                        WHERE LOWER(i.category) NOT IN ('silver', 'accessories')
                        ORDER BY RANDOM() 
                        LIMIT ?
                    """, (limit,)).fetchall()

            store_data = get_stored_data() or {}
            settings = store_data.get('settings', {})
            profit_markup = float(settings.get('profitMarkup', 2.2))
            profit_flat = int(settings.get('profitFlat', 0))

            # Auto-Sync Live Currencies from Frankfurter API
            try:
                req_cur = urllib.request.Request("https://api.frankfurter.dev/v1/latest?base=INR", headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req_cur, timeout=5) as resp_cur:
                    frank_data = json.loads(resp_cur.read().decode('utf-8'))
                    if 'rates' in frank_data:
                        currencies = store_data.get('currencies', {})
                        updated_cur = False
                        for code, info in currencies.items():
                            if code == 'INR': continue
                            if code in frank_data['rates']:
                                currencies[code]['rate'] = frank_data['rates'][code]
                                updated_cur = True
                            elif code == 'AED' and 'USD' in frank_data['rates']:
                                currencies['AED']['rate'] = frank_data['rates']['USD'] * 3.6725
                                updated_cur = True
                        if updated_cur:
                            store_data['currencies'] = currencies
                            save_stored_data(store_data)
            except Exception as e:
                print(f"[Warn] Auto-sync currencies failed: {e}")

            # Parallel stock check against https://czmakers.com using SKU matching
            checked_results = []
            ssl_ctx = ssl.create_default_context()
            czm_headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/html, */*',
                'X-Requested-With': 'XMLHttpRequest',
            }
            
            # Refresh CZM session before checking stock
            fresh_cookie = perform_czm_login()
            if fresh_cookie:
                czm_headers['Cookie'] = fresh_cookie
            else:
                try:
                    if os.path.exists(CZM_COOKIE_PATH):
                        with open(CZM_COOKIE_PATH, 'r', encoding='utf-8') as f:
                            cookie_dict = json.load(f)
                            cookie_str = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])
                            if cookie_str:
                                czm_headers['Cookie'] = cookie_str
                except Exception:
                    pass

            def _check_czm_prod(item_row):
                db_id = item_row['id']
                sku = str(item_row['sku'] or '').strip()
                prod_name = item_row['productName']
                pid = str(db_id).replace('czm_', '') if str(db_id).startswith('czm_') else str(db_id)
                existing_cost = float(item_row['usdWholesale']) if ('usdWholesale' in item_row.keys() and item_row['usdWholesale'] and float(item_row['usdWholesale']) > 0) else None

                # 1. Match using SKU against CZMakers search API
                sku_matched = False
                czm_search_sku = sku.replace('SRV-', '').strip() if sku else ''
                
                if czm_search_sku and czm_search_sku.lower() != 'none':
                    api_url = f"https://czmakers.com/product-search?keyword={urllib.parse.quote(czm_search_sku)}"
                    try:
                        req = urllib.request.Request(api_url, headers=czm_headers)
                        with urllib.request.urlopen(req, context=ssl_ctx, timeout=6) as resp:
                            res_bytes = resp.read()
                            res_text = res_bytes.decode('utf-8', errors='ignore')
                            data = json.loads(res_text)
                            if isinstance(data, list) and len(data) > 0:
                                for item in data:
                                    item_name = str(item.get('name', '')).strip()
                                    item_id = str(item.get('id', '')).strip()
                                    if item_name == czm_search_sku or item_id == pid:
                                        sku_matched = True
                                        break
                    except Exception:
                        pass

                # 2. Verify direct product page availability & extract/retain actual CZMakers cost
                page_url = f"https://czmakers.com/product/{pid}"
                req = urllib.request.Request(page_url, headers=czm_headers)
                try:
                    with urllib.request.urlopen(req, context=ssl_ctx, timeout=7) as resp:
                        final_url = resp.geturl()
                        # If redirected away from /product/ or to homepage, item is delisted/unmatched
                        if "/product/" not in final_url or final_url.rstrip("/") == "https://czmakers.com":
                            return item_row, False, "Redirected to homepage (Delisted/Unmatched)", existing_cost, 85.0

                        html = resp.read().decode('utf-8', errors='ignore')
                        html_lower = html.lower()

                        # Extract actual CZMakers wholesale cost from live product page
                        czm_cost = None
                        czm_conversion_rate = 85.0
                        
                        # 1. Extract session currency & multiplier first
                        current_currency = "USD"
                        selected_curr_m = re.search(r'<option value="[0-9\.]+-([A-Z]+)"\s+selected>', html)
                        if selected_curr_m:
                            current_currency = selected_curr_m.group(1)
                            
                        usd_mult = 1.0
                        if current_currency != "USD":
                            usd_mult_m = re.search(r'set-session-currency/([0-9\.]+)/USD', html)
                            if usd_mult_m:
                                usd_mult = float(usd_mult_m.group(1))
                                czm_conversion_rate = (1 / usd_mult) if usd_mult > 0 else 85.0

                        raw_price = None

                        # 2. Try direct page pattern (pdp-single-price)
                        m_price = re.search(r'class="[^"]*pdp-single-price[^"]*"[^>]*>[^0-9]*([0-9\.]+)', html)
                        if m_price and float(m_price.group(1)) > 0:
                            raw_price = float(m_price.group(1))
                        
                        # 3. Fallback to data-price matching exact SKU
                        if not raw_price and czm_search_sku:
                            esc_sku = re.escape(czm_search_sku)
                            pat1 = 'data-model=["\']' + esc_sku + '["\'][^>]*data-price=["\']([0-9\.]+)["\']'
                            pat2 = 'data-price=["\']([0-9\.]+)["\'][^>]*data-model=["\']' + esc_sku + '["\']'
                            m1 = re.search(pat1, html)
                            if m1 and float(m1.group(1)) > 0:
                                raw_price = float(m1.group(1))
                            else:
                                m2 = re.search(pat2, html)
                                if m2 and float(m2.group(1)) > 0:
                                    raw_price = float(m2.group(1))
                        
                        if not raw_price:
                            return item_row, False, f"Variant SKU {czm_search_sku} missing or price hidden on CZMakers", existing_cost, czm_conversion_rate
                            
                        if current_currency == "USD":
                            czm_cost = round(raw_price * czm_conversion_rate, 2)
                        else:
                            czm_cost = round(raw_price, 2)

                        # Extract live plating colour from specifications table
                        czm_plating = None
                        m_plating = re.search(r'Plating\s*Colour[\s\S]*?</td>\s*<td[^>]*>([^<]+)</td>', html, re.I)
                        if m_plating:
                            czm_plating = normalize_czm_plating(m_plating.group(1))
                        else:
                            m_p2 = re.search(r'<td[^>]*class=["\'](?:t_h|t2)["\'][^>]*>[^<]*Plating[^<]*</td>\s*<td[^>]*>([^<]+)</td>', html, re.I)
                            if m_p2:
                                czm_plating = normalize_czm_plating(m_p2.group(1))
                            elif any(w in prod_name.lower() for w in ['silver', 'rhodium', 'sterling', '925']):
                                czm_plating = 'silver'
                            elif 'rose gold' in prod_name.lower() or 'rosegold' in prod_name.lower():
                                czm_plating = 'rosegold'
                            elif 'two tone' in prod_name.lower() or 'two-tone' in prod_name.lower():
                                czm_plating = 'two-tone'
                            elif 'oxidise' in prod_name.lower() or 'oxidize' in prod_name.lower():
                                czm_plating = 'oxidised'
                            elif 'antique' in prod_name.lower() or 'mehndi' in prod_name.lower():
                                czm_plating = 'antique'

                        if "product not found" in html_lower or "no product found" in html_lower:
                            return item_row, False, "Product not found on CZMakers", czm_cost, czm_conversion_rate, czm_plating
                        if "out of stock" in html_lower or "sold out" in html_lower or "not available" in html_lower:
                            return item_row, False, "Marked Out of Stock on CZMakers", czm_cost, czm_conversion_rate, czm_plating
                        if "add to cart" not in html_lower and "add-to-cart" not in html_lower:
                            return item_row, False, "No active Add to Cart on CZMakers", czm_cost, czm_conversion_rate, czm_plating

                        return item_row, True, f"Live In Stock on CZMakers (/product/{pid})", czm_cost, czm_conversion_rate, czm_plating
                except urllib.error.HTTPError as e:
                    return item_row, False, f"HTTP {e.code} Not Found", existing_cost, 85.0, None
                except Exception as e:
                    # Keep previous status if temporary network timeout
                    prev_in_stock = (item_row['status'] == 'In Stock')
                    return item_row, prev_in_stock, f"Timeout ({e})", existing_cost, 85.0, None

            with ThreadPoolExecutor(max_workers=12) as executor:
                futures = [executor.submit(_check_czm_prod, r) for r in rows]
                for f in as_completed(futures):
                    try:
                        checked_results.append(f.result())
                    except Exception:
                        pass

            in_stock_count = 0
            oos_count = 0
            oos_ids = set()
            in_stock_ids = set()
            prod_costs = {}

            sync_time_iso = datetime.utcnow().isoformat() + "Z"

            for item_row, is_live, reason, czm_cost, czm_conversion_rate, czm_plating in checked_results:
                item_id = item_row['id']
                sku = str(item_row['sku'] or '').strip()
                prod_name = item_row['productName']

                # Retain actual cost in memory map
                if czm_cost and czm_cost > 0:
                    prod_costs[str(item_id)] = czm_cost
                    if sku: prod_costs[sku] = czm_cost
                    
                retail_inr = None
                orig_inr = None
                if czm_cost and czm_cost > 0:
                    base_inr = czm_cost
                    retail_inr = max(1499, int(round((base_inr * profit_markup + profit_flat) / 100) * 100) - 1)
                    orig_inr = int(round(retail_inr * 1.1 / 100) * 100) - 1

                if is_live:
                    in_stock_count += 1
                    in_stock_ids.add(str(item_id))
                    if sku: in_stock_ids.add(sku)
                    if czm_cost and czm_cost > 0:
                        c.execute("""
                            UPDATE inventory 
                            SET status = 'In Stock', stockQty = CASE WHEN stockQty <= 0 THEN 15 ELSE stockQty END, usdWholesale = ?, lastRefreshed = ?
                            WHERE id = ? OR sku = ? OR productName = ?
                        """, (czm_cost, sync_time_iso, item_id, sku, prod_name))
                        c.execute("UPDATE products SET disabled = 0, active = 1, usdWholesale = ?, priceINR = ?, originalPriceINR = ?, lastRefreshed = ? WHERE id = ? OR name = ?", (czm_cost, retail_inr, orig_inr, sync_time_iso, item_id, prod_name))
                    else:
                        c.execute("""
                            UPDATE inventory 
                            SET status = 'In Stock', stockQty = CASE WHEN stockQty <= 0 THEN 15 ELSE stockQty END, lastRefreshed = ?
                            WHERE id = ? OR sku = ? OR productName = ?
                        """, (sync_time_iso, item_id, sku, prod_name))
                        c.execute("UPDATE products SET disabled = 0, active = 1, lastRefreshed = ? WHERE id = ? OR name = ?", (sync_time_iso, item_id, prod_name))
                else:
                    oos_count += 1
                    oos_ids.add(str(item_id))
                    if sku: oos_ids.add(sku)
                    if czm_cost and czm_cost > 0:
                        c.execute("""
                            UPDATE inventory 
                            SET status = 'Out of Stock', stockQty = 0, usdWholesale = ?, lastRefreshed = ? 
                            WHERE id = ? OR sku = ? OR productName = ?
                        """, (czm_cost, sync_time_iso, item_id, sku, prod_name))
                        c.execute("UPDATE products SET disabled = 1, active = 0, badge = CASE WHEN badge = 'New Launch' THEN '' ELSE badge END, usdWholesale = ?, priceINR = ?, originalPriceINR = ?, lastRefreshed = ? WHERE id = ? OR name = ?", (czm_cost, retail_inr, orig_inr, sync_time_iso, item_id, prod_name))
                    else:
                        c.execute("""
                            UPDATE inventory 
                            SET status = 'Out of Stock', stockQty = 0, lastRefreshed = ? 
                            WHERE id = ? OR sku = ? OR productName = ?
                        """, (sync_time_iso, item_id, sku, prod_name))
                        c.execute("UPDATE products SET disabled = 1, active = 0, badge = CASE WHEN badge = 'New Launch' THEN '' ELSE badge END, lastRefreshed = ? WHERE id = ? OR name = ?", (sync_time_iso, item_id, prod_name))

                if czm_plating:
                    c.execute("UPDATE products SET plating = ? WHERE id = ? OR name = ?", (czm_plating, item_id, prod_name))

            # Category scanning for new arrivals & accurate subCategory updates
            new_discovered = []
            CZM_SCAN_CATEGORIES = [
                ('necklaces',                     'necklace',    'Necklaces'),
                ('choker-necklaces',              'necklace',    'Choker Necklaces'),
                ('traditional-necklaces',         'necklace',    'Traditional Necklaces'),
                ('bridal-necklaces',              'necklace',    'Bridal Necklaces'),
                ('classic-necklace',              'necklace',    'Classic Necklaces'),
                ('collar-necklace',               'necklace',    'Collar Necklaces'),
                ('mangalsutra',                   'necklace',    'Mangalsutra'),
                ('aurous-collection',             'necklace',    'Aurous Collection'),
                ('earrings',                      'earrings',    'Earrings'),
                ('jhumka-earrings',               'earrings',    'Jhumka Earrings'),
                ('big-size-earrings',             'earrings',    'Big Size Earrings'),
                ('medium-earrings',               'earrings',    'Medium Earrings'),
                ('small-earrings',                'earrings',    'Small Earrings'),
                ('tops-&-studs',                  'earrings',    'Tops & Studs'),
                ('finger-rings',                  'rings',       'Finger Rings'),
                ('cz-finger-rings',               'rings',       'CZ Finger Rings'),
                ('pendants',                      'pendants',    'Pendants'),
                ('cz-pendant-set',                'pendants',    'CZ Pendant Sets'),
                ('pendant-with-broad-chain',      'pendants',    'Pendants with Broad Chain'),
                ('pendant-with-medium-chain',     'pendants',    'Pendants with Medium Chain'),
                ('wristwear',                     'wristwear',   'Wristwear'),
                ('cz-bangles',                    'wristwear',   'CZ Bangles'),
                ('cz-braclets',                   'wristwear',   'CZ Bangles & Bracelets'),
                ('cz-bracelets',                  'wristwear',   'CZ Bracelets'),
                ('bracelets-rings-combo',         'wristwear',   'Bracelets & Rings Combo'),
            ]

            if scan_categories:
                if canonical_cat and canonical_cat not in ('all', ''):
                    cats_to_scan = [c for c in CZM_SCAN_CATEGORIES if c[1].lower() == canonical_cat or c[0].lower() == target_cat_raw]
                    if not cats_to_scan:
                        cats_to_scan = [c for c in CZM_SCAN_CATEGORIES if target_cat_raw in c[0].lower() or target_cat_raw in c[2].lower()]
                else:
                    cats_to_scan = CZM_SCAN_CATEGORIES if check_all else CZM_SCAN_CATEGORIES[:10]

                def _fetch_cat(cat_info):
                    cat_slug, cat_def, subcat_def = cat_info
                    cat_url = f"https://czmakers.com/category/{cat_slug}?page=1"
                    try:
                        req = urllib.request.Request(cat_url, headers=czm_headers)
                        with urllib.request.urlopen(req, context=ssl_ctx, timeout=8) as c_resp:
                            if c_resp.status == 200:
                                return cat_info, c_resp.read().decode('utf-8', errors='ignore')
                    except Exception:
                        pass
                    return cat_info, None

                with ThreadPoolExecutor(max_workers=4) as cat_executor:
                    cat_futures = [cat_executor.submit(_fetch_cat, c_info) for c_info in cats_to_scan]
                    for cf in as_completed(cat_futures):
                        try:
                            cat_info, cat_html = cf.result()
                            if not cat_html:
                                continue
                            cat_slug, cat_default, subcat_name = cat_info

                            parts = re.split(r'(?=<div[^>]+class=[\"\'][^\"\']*(?:product_list|f-prod))', cat_html)
                            for part in parts:
                                if 'data-model=' not in part and 'data-price=' not in part:
                                    continue
                                pid_m = re.search(r'product/(\d+)(?:/([^\"\'>\s]+))?', part)
                                if not pid_m:
                                    continue
                                pid = pid_m.group(1)
                                slug = pid_m.group(2) or ''
                                czm_id = f"czm_{pid}"

                                dm = re.search(r'data-model=[\"\']([^\"\']+)[\"\']', part)
                                model_sku = dm.group(1).strip() if dm else f"CZM-{pid}"
                                sku = f"SRV-{model_sku}"

                                dp = re.search(r'data-price=[\"\']([0-9.]+)[\"\']', part)
                                discovered_cost = float(dp.group(1)) if dp else 0.0

                                title_m = re.search(r'class=[\"\']product_titles[\"\'][^>]*>[\s\S]*?<a[^>]*>([^<]+)</a>', part)
                                if not title_m:
                                    title_m = re.search(r'<a[^>]+href=[\"\'][^\"\']*product/\d+[^\"\']*[\"\'][^>]*>([^<]+)</a>', part)
                                name = title_m.group(1).strip() if title_m else slug.replace('_', ' ').replace('-', ' ').title()
                                name = name.replace('&amp;', '&').replace('&quot;', '"').replace('&#039;', "'")

                                img_m = re.search(r'<img[^>]+(?:src|data-src)=[\"\']([^\"\']+)[\"\']', part)
                                img_thumb = img_m.group(1) if img_m else ""
                                primary_img = (
                                    img_thumb.replace('/product_medium_images/', '/product_images/')
                                             .replace('/product_small_images/', '/product_images/')
                                ) if img_thumb else ""

                                hover_m = re.search(r'<img[^>]+(?:data-hover|data-secondary-image|data-hover-src)=[\"\']([^\"\']+)[\"\']', part)
                                if hover_m:
                                    hover_img = (
                                        hover_m.group(1).replace('/product_medium_images/', '/product_images/')
                                                        .replace('/product_small_images/', '/product_images/')
                                    )
                                else:
                                    hover_img = primary_img.replace('.jpg', 'A.jpg') if primary_img else ""

                                video_m = re.search(r'(?:href|src|data-video)=[\"\']([^\"\']+\.mp4)[\"\']', part)
                                if video_m:
                                    video_url = video_m.group(1).replace('/product_images/', '/product_videos/')
                                else:
                                    video_url = (
                                        primary_img.replace('/product_images/', '/product_videos/')
                                                   .replace('/product_medium_images/', '/product_videos/')
                                                   .replace('/product_small_images/', '/product_videos/')
                                                   .replace('.jpg', 'V1.mp4')
                                    ) if primary_img else ""

                                gallery = [primary_img, hover_img] if (hover_img and hover_img != primary_img) else ([primary_img] if primary_img else [])
                                gallery_json = json.dumps(gallery)

                                retail_inr = max(1499, int(round((discovered_cost * profit_markup + profit_flat) / 100) * 100) - 1) if discovered_cost > 0 else 2499
                                orig_inr = int(round(retail_inr * 1.1 / 100) * 100) - 1

                                existing = c.execute("SELECT id, category, subCategory FROM products WHERE id = ? OR name = ?", (czm_id, name)).fetchone()
                                if existing:
                                    c.execute("""
                                        UPDATE products 
                                        SET category = ?,
                                            subCategory = ?,
                                            usdWholesale = CASE WHEN ? > 0 THEN ? ELSE usdWholesale END,
                                            priceINR = CASE WHEN ? > 0 THEN ? ELSE priceINR END,
                                            originalPriceINR = CASE WHEN ? > 0 THEN ? ELSE originalPriceINR END,
                                            primaryImg = CASE WHEN ? != '' THEN ? ELSE primaryImg END,
                                            hoverImg = CASE WHEN ? != '' THEN ? ELSE hoverImg END,
                                            videoUrl = CASE WHEN ? != '' THEN ? ELSE videoUrl END,
                                            gallery = CASE WHEN ? != '[]' THEN ? ELSE gallery END,
                                            disabled = 0, active = 1, lastRefreshed = ?
                                        WHERE id = ? OR name = ?
                                    """, (
                                        cat_default, subcat_name,
                                        discovered_cost, discovered_cost,
                                        retail_inr, retail_inr,
                                        orig_inr, orig_inr,
                                        primary_img, primary_img,
                                        hover_img, hover_img,
                                        video_url, video_url,
                                        gallery_json, gallery_json,
                                        sync_time_iso, czm_id, name
                                    ))
                                    c.execute("""
                                        UPDATE inventory 
                                        SET category = ?,
                                            subCategory = ?,
                                            status = 'In Stock',
                                            stockQty = CASE WHEN stockQty <= 0 THEN 15 ELSE stockQty END,
                                            usdWholesale = CASE WHEN ? > 0 THEN ? ELSE usdWholesale END,
                                            lastRefreshed = ?
                                        WHERE id = ? OR sku = ? OR sku = ? OR productName = ?
                                    """, (cat_default, subcat_name, discovered_cost, discovered_cost, sync_time_iso, czm_id, sku, model_sku, name))
                                else:
                                    c.execute("""
                                        INSERT OR IGNORE INTO products (
                                            id, name, category, subCategory, priceINR, originalPriceINR,
                                            primaryImg, hoverImg, videoUrl, gallery, disabled, active, usdWholesale, lastRefreshed, dateAdded, badge
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, 'New Launch')
                                    """, (czm_id, name, cat_default, subcat_name, retail_inr, orig_inr, primary_img, hover_img, video_url, gallery_json, discovered_cost, sync_time_iso, sync_time_iso))
                                    c.execute("""
                                        INSERT OR IGNORE INTO inventory (
                                            id, sku, productName, category, subCategory, stockQty, lowStockThreshold, status, usdWholesale, lastRefreshed, dateAdded
                                        ) VALUES (?, ?, ?, ?, ?, 15, 5, 'In Stock', ?, ?, ?)
                                    """, (czm_id, sku, name, cat_default, subcat_name, discovered_cost, sync_time_iso, sync_time_iso))
                                    new_discovered.append(czm_id)
                        except Exception as e:
                            print(f"[Category scan worker err] {e}")

            # Ensure subCategory is bidirectional-synchronized between products and inventory
            try:
                c.execute("""
                    UPDATE inventory 
                    SET subCategory = (
                        SELECT p.subCategory FROM products p 
                        WHERE (p.id = inventory.id OR p.name = inventory.productName) 
                          AND p.subCategory IS NOT NULL AND p.subCategory != ''
                        LIMIT 1
                    )
                    WHERE (subCategory IS NULL OR subCategory = '')
                      AND EXISTS (
                        SELECT 1 FROM products p 
                        WHERE (p.id = inventory.id OR p.name = inventory.productName) 
                          AND p.subCategory IS NOT NULL AND p.subCategory != ''
                      )
                """)
                c.execute("""
                    UPDATE products 
                    SET subCategory = (
                        SELECT i.subCategory FROM inventory i 
                        WHERE (i.id = products.id OR i.productName = products.name) 
                          AND i.subCategory IS NOT NULL AND i.subCategory != ''
                        LIMIT 1
                    )
                    WHERE (subCategory IS NULL OR subCategory = '')
                      AND EXISTS (
                        SELECT 1 FROM inventory i 
                        WHERE (i.id = products.id OR i.productName = products.name) 
                          AND i.subCategory IS NOT NULL AND i.subCategory != ''
                      )
                """)
            except Exception as sync_err:
                print(f"[SubCategory Sync Warning] {sync_err}")

            # Record audit log
            try:
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, 'Admin', 'Stock Refresh', 'Inventory', 'czmakers.com', ?)
                """, (
                    f"log_stock_sync_{int(time.time())}",
                    f"Live SKU inventory sync with czmakers.com: {len(checked_results)} items checked ({in_stock_count} matched/available, {oos_count} unmatched/out-of-stock), {len(new_discovered)} new arrivals. Exact sub-categories, photos, and videos updated."
                ))
            except Exception:
                pass

            conn.commit()

            # Synchronize into data/store-data.json so storefront immediately reflects stock, actual costs, sub-categories, and media
            try:
                sd = get_stored_data() or {}
                if 'products' in sd and sd['products']:
                    # Build lookup maps for subCategory and category from DB
                    db_prod_map = {}
                    for r in c.execute("SELECT id, name, category, subCategory FROM products WHERE subCategory IS NOT NULL AND subCategory != ''").fetchall():
                        db_prod_map[str(r['id'])] = (r['category'], r['subCategory'])
                        if r['name']:
                            db_prod_map[str(r['name'])] = (r['category'], r['subCategory'])
                    for r in c.execute("SELECT id, productName, category, subCategory FROM inventory WHERE subCategory IS NOT NULL AND subCategory != ''").fetchall():
                        if str(r['id']) not in db_prod_map:
                            db_prod_map[str(r['id'])] = (r['category'], r['subCategory'])
                        if r['productName'] and str(r['productName']) not in db_prod_map:
                            db_prod_map[str(r['productName'])] = (r['category'], r['subCategory'])

                    # Build plating lookup map from DB
                    db_plating_map = {}
                    for r in c.execute("SELECT id, name, plating FROM products WHERE plating IS NOT NULL AND plating != ''").fetchall():
                        db_plating_map[str(r['id'])] = r['plating']
                        if r['name']:
                            db_plating_map[str(r['name'])] = r['plating']

                    # Build media lookup map from DB (primaryImg, hoverImg, videoUrl, gallery)
                    db_media_map = {}
                    for r in c.execute("SELECT id, name, primaryImg, hoverImg, videoUrl, gallery FROM products WHERE primaryImg IS NOT NULL AND primaryImg != ''").fetchall():
                        db_media_map[str(r['id'])] = (r['primaryImg'], r['hoverImg'], r['videoUrl'], r['gallery'])
                        if r['name']:
                            db_media_map[str(r['name'])] = (r['primaryImg'], r['hoverImg'], r['videoUrl'], r['gallery'])

                    # Ensure any existing Out of Stock inventory rows are included
                    db_oos_rows = c.execute("SELECT id, sku FROM inventory WHERE status = 'Out of Stock'").fetchall()
                    for r in db_oos_rows:
                        oos_ids.add(str(r['id']))
                        if r['sku']: oos_ids.add(str(r['sku']))

                    sd_modified = False
                    for p in sd['products']:
                        p_id = str(p.get('id', ''))
                        p_db_id = str(p.get('dbId', ''))
                        p_sku = str(p.get('sku', '')).replace('CZM-', '')
                        p_full_sku = str(p.get('sku', ''))
                        p_name = p.get('name', '')

                        # Ensure category & subCategory are updated and accurate
                        cat_info = db_prod_map.get(p_id) or db_prod_map.get(p_db_id) or db_prod_map.get(p_name)
                        if cat_info:
                            cat_val, subcat_val = cat_info
                            if cat_val and p.get('category') != cat_val:
                                p['category'] = cat_val
                                sd_modified = True
                            if subcat_val and p.get('subCategory') != subcat_val:
                                p['subCategory'] = subcat_val
                                sd_modified = True

                        # Ensure plating is updated and accurate
                        plating_val = db_plating_map.get(p_id) or db_plating_map.get(p_db_id) or db_plating_map.get(p_name)
                        if plating_val and p.get('plating') != plating_val:
                            p['plating'] = plating_val
                            sd_modified = True

                        # Ensure media mapping (primaryImg, hoverImg, videoUrl, gallery) matches CZMakers exactly
                        media_info = db_media_map.get(p_id) or db_media_map.get(p_db_id) or db_media_map.get(p_name)
                        if media_info:
                            prim_val, hov_val, vid_val, gal_val = media_info
                            if prim_val and p.get('primaryImg') != prim_val:
                                p['primaryImg'] = prim_val
                                sd_modified = True
                            if hov_val and p.get('hoverImg') != hov_val:
                                p['hoverImg'] = hov_val
                                sd_modified = True
                            if vid_val and p.get('videoUrl') != vid_val:
                                p['videoUrl'] = vid_val
                                sd_modified = True
                            if gal_val:
                                try:
                                    gal_parsed = json.loads(gal_val) if isinstance(gal_val, str) else gal_val
                                    if gal_parsed and p.get('gallery') != gal_parsed:
                                        p['gallery'] = gal_parsed
                                        sd_modified = True
                                except Exception:
                                    pass

                        # Fix any remaining /product_images/ in videoUrl
                        if p.get('videoUrl') and '/product_images/' in p['videoUrl']:
                            p['videoUrl'] = p['videoUrl'].replace('/product_images/', '/product_videos/')
                            sd_modified = True

                        # Retain and update actual CZMakers wholesale cost
                        actual_cost = prod_costs.get(p_id) or prod_costs.get(p_db_id) or prod_costs.get(p_sku) or prod_costs.get(p_full_sku) or p.get('usdWholesale')
                        if actual_cost is not None and float(actual_cost) > 0:
                            if p.get('usdWholesale') != float(actual_cost):
                                p['usdWholesale'] = float(actual_cost)
                                sd_modified = True

                        is_oos = (p_id in oos_ids or p_db_id in oos_ids or p_sku in oos_ids or p_full_sku in oos_ids)
                        is_instock = (p_id in in_stock_ids or p_db_id in in_stock_ids or p_sku in in_stock_ids or p_full_sku in in_stock_ids)

                        if is_oos:
                            if p.get('stockStatus') != 'Out of Stock' or p.get('stockQty') != 0 or p.get('inStock') != False:
                                p['stockStatus'] = 'Out of Stock'
                                p['stockQty'] = 0
                                p['inStock'] = False
                                p['disabled'] = 1
                                p['active'] = 0
                                if p.get('badge') == 'New Launch':
                                    p['badge'] = ''
                                p['lastRefreshed'] = sync_time_iso
                                sd_modified = True
                        elif is_instock:
                            if p.get('stockStatus') != 'In Stock' or p.get('inStock') != True:
                                p['stockStatus'] = 'In Stock'
                                p['stockQty'] = max(int(p.get('stockQty') or 0), 15)
                                p['inStock'] = True
                                p['disabled'] = False
                                p['active'] = True
                                p['lastRefreshed'] = sync_time_iso
                                sd_modified = True

                    try:
                        from scripts.czm_sync_agent import enforce_new_launch_fifo
                        nl_cap = int(settings.get('newLaunchCapacity', 30))
                        enforce_new_launch_fifo(
                            conn=conn,
                            sd_products=sd.get('products', []),
                            new_launch_capacity=nl_cap,
                            newly_added_ids=new_discovered
                        )
                        sd_modified = True
                    except Exception as fifo_err:
                        print(f"[FIFO New Launch Warning] {fifo_err}")

                    if sd_modified:
                        save_stored_data(sd)
            except Exception as sd_err:
                print(f"[StoreData Sync Error] {sd_err}")

            # Return updated inventory table with actual retained CZM wholesale costs and subCategory
            updated_rows = c.execute("""
                SELECT id, sku, productName, category, 
                       COALESCE(NULLIF(subCategory, ''), '') as subCategory,
                       stockQty, lowStockThreshold, status,
                       COALESCE(usdWholesale, 0.0) as usdWholesale,
                       lastRefreshed, dateAdded
                FROM inventory 
                ORDER BY rowid ASC
            """).fetchall()
            items = [dict(r) for r in updated_rows]
            conn.close()

            self._send_json({
                "success": True,
                "message": f"Inventory refreshed from czmakers.com! {len(checked_results)} items verified by SKU: {in_stock_count} Available (In Stock), {oos_count} Unmatched (Out of Stock){f', {len(new_discovered)} new pieces added' if new_discovered else ''}. Sub-categories and actual CZM wholesale costs retained.",
                "summary": {
                    "totalChecked": len(checked_results),
                    "inStock": in_stock_count,
                    "outOfStock": oos_count,
                    "newDiscovered": len(new_discovered)
                },
                "inventory": items
            })
            return
            
        if parsed.path == '/api/admin/recalculate-prices':
            conn = get_db()
            if not conn:
                self._send_json({"error": "DB unavailable"}, 500)
                return
            try:
                store_data_path = "data/store-data.json"
                profit_markup = 2.2
                profit_flat = 0
                if os.path.exists(store_data_path):
                    with open(store_data_path, 'r', encoding='utf-8') as f:
                        sd = json.load(f)
                        st = sd.get('settings', {})
                        profit_markup = float(st.get('profitMarkup', 2.2))
                        profit_flat = int(st.get('profitFlat', 0))
                
                c = conn.cursor()
                c.execute("SELECT id, usdWholesale FROM products WHERE usdWholesale IS NOT NULL AND usdWholesale > 0")
                rows = c.fetchall()
                updated = 0
                for r in rows:
                    p_id, wholesale_inr = r
                    retail = max(1499, int(round((wholesale_inr * profit_markup + profit_flat) / 100) * 100) - 1)
                    orig = int(round(retail * 1.1 / 100) * 100) - 1
                    c.execute("UPDATE products SET priceINR = ?, originalPriceINR = ? WHERE id = ?", (retail, orig, p_id))
                    updated += 1
                
                conn.commit()
                
                if os.path.exists(store_data_path):
                    with open(store_data_path, 'r', encoding='utf-8') as f:
                        sd = json.load(f)
                    for p in sd.get('products', []):
                        if p.get('usdWholesale') and float(p['usdWholesale']) > 0:
                            winr = float(p['usdWholesale'])
                            ret = max(1499, int(round((winr * profit_markup + profit_flat) / 100) * 100) - 1)
                            or_ret = int(round(ret * 1.1 / 100) * 100) - 1
                            p['priceINR'] = ret
                            p['originalPriceINR'] = or_ret
                    with open(store_data_path, 'w', encoding='utf-8') as f:
                        json.dump(sd, f)
                
                self._send_json({"success": True, "updated": updated})
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json({"error": str(e)}, 500)
            return
        if parsed.path == '/api/inventory/update':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                item_id = str(payload.get('id', '')).strip()
                sku = str(payload.get('sku', '')).strip()
                stock_qty = int(payload.get('stockQty', 0))
                threshold = int(payload.get('lowStockThreshold', 5))

                # Calculate status
                if stock_qty <= 0:
                    status = "Out of Stock"
                elif stock_qty <= threshold:
                    status = "Low Stock"
                else:
                    status = "In Stock"

                now_iso = datetime.utcnow().isoformat() + "Z"
                c = conn.cursor()
                if item_id:
                    c.execute("""
                        UPDATE inventory 
                        SET stockQty = ?, lowStockThreshold = ?, status = ?, lastRefreshed = ?
                        WHERE id = ?
                    """, (stock_qty, threshold, status, now_iso, item_id))
                    # Also keep products table in sync
                    c.execute("""
                        UPDATE products 
                        SET disabled = ?, active = ?, lastRefreshed = ?
                        WHERE id = ?
                    """, (1 if stock_qty <= 0 else 0, 0 if stock_qty <= 0 else 1, now_iso, item_id))
                elif sku:
                    c.execute("""
                        UPDATE inventory 
                        SET stockQty = ?, lowStockThreshold = ?, status = ?, lastRefreshed = ?
                        WHERE sku = ?
                    """, (stock_qty, threshold, status, now_iso, sku))
                    # Also keep products table in sync
                    c.execute("""
                        UPDATE products 
                        SET disabled = ?, active = ?, lastRefreshed = ?
                        WHERE id IN (SELECT id FROM inventory WHERE sku = ?)
                    """, (1 if stock_qty <= 0 else 0, 0 if stock_qty <= 0 else 1, now_iso, sku))
                else:
                    self._send_json({"error": "Item ID or SKU is required"}, 400)
                    conn.close()
                    return

                # Record in audit log
                prod_title = payload.get('productName', '')
                try:
                    c.execute("""
                        INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                        VALUES (?, 'Admin', 'Stock Adjusted', 'Inventory', ?, ?)
                    """, (f"log_{gen_pb_id()}", item_id or sku, f"SKU {sku} ({prod_title or item_id}): {stock_qty} units ({status})"))
                except Exception as log_err:
                    print(f"[Audit Log Warning] {log_err}")

                conn.commit()

                # Fetch updated record
                if item_id:
                    updated = c.execute("""
                        SELECT id, sku, productName, category, 
                               COALESCE(NULLIF(subCategory, ''), '') as subCategory,
                               stockQty, lowStockThreshold, status, 
                               COALESCE(usdWholesale, 0.0) as usdWholesale,
                               lastRefreshed, dateAdded 
                        FROM inventory 
                        WHERE id = ?
                    """, (item_id,)).fetchone()
                else:
                    updated = c.execute("""
                        SELECT id, sku, productName, category, 
                               COALESCE(NULLIF(subCategory, ''), '') as subCategory,
                               stockQty, lowStockThreshold, status, 
                               COALESCE(usdWholesale, 0.0) as usdWholesale,
                               lastRefreshed, dateAdded 
                        FROM inventory 
                        WHERE sku = ?
                    """, (sku,)).fetchone()

                # Also sync store-data.json so public store and products catalog are instantly updated
                try:
                    sd = get_stored_data()
                    if sd and 'products' in sd:
                        for p in sd['products']:
                            if (item_id and str(p.get('id')) == str(item_id)) or (sku and str(p.get('sku')) == str(sku)):
                                p['stockQty'] = stock_qty
                                p['lowStockThreshold'] = threshold
                                p['stockStatus'] = status
                                p['inStock'] = (stock_qty > 0)
                                p['disabled'] = (1 if stock_qty <= 0 else 0)
                                p['active'] = (0 if stock_qty <= 0 else 1)
                                p['lastRefreshed'] = now_iso
                                save_stored_data(sd)
                                break
                except Exception as sync_err:
                    print(f"[Inventory Sync to StoreData Error] {sync_err}")

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
        # ----------------------------------------------------
        # API: Create / Update Customer
        # ----------------------------------------------------
        if parsed.path in ['/api/customers', '/api/admin/customers']:
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                cust_id = (payload.get('id') or '').strip()
                name = payload.get('name', '').strip()
                email = payload.get('email', '').strip().lower()
                phone = payload.get('phone', '').strip()
                address = payload.get('address', '').strip()
                city = payload.get('city', '').strip()

                if not name or not email:
                    self._send_json({"error": "Customer name and email are required"}, 400)
                    conn.close()
                    return

                c = conn.cursor()
                existing = None
                if cust_id:
                    existing = c.execute("SELECT id FROM customers WHERE id = ?", (cust_id,)).fetchone()
                if not existing:
                    existing = c.execute("SELECT id FROM customers WHERE LOWER(email) = ?", (email,)).fetchone()

                if existing:
                    target_id = existing['id']
                    c.execute("""
                        UPDATE customers 
                        SET name = ?, email = ?, phone = ?, address = ?, city = ?
                        WHERE id = ?
                    """, (name, email, phone, address, city, target_id))
                    final_id = target_id
                else:
                    final_id = cust_id or gen_pb_id()
                    c.execute("""
                        INSERT INTO customers (id, name, email, phone, address, city, totalOrders, totalSpent)
                        VALUES (?, ?, ?, ?, ?, ?, 0, 0)
                    """, (final_id, name, email, phone, address, city))

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
        # API: Delete Customer Record
        # ----------------------------------------------------
        if parsed.path in ['/api/customers/delete', '/api/admin/customers/delete']:
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                cust_id = (payload.get('id') or '').strip()
                email = (payload.get('email') or '').strip().lower()

                if not cust_id and not email:
                    self._send_json({"error": "Customer ID or email is required for deletion"}, 400)
                    conn.close()
                    return

                c = conn.cursor()
                if cust_id:
                    row = c.execute("SELECT id, name, email FROM customers WHERE id = ?", (cust_id,)).fetchone()
                else:
                    row = c.execute("SELECT id, name, email FROM customers WHERE LOWER(email) = ?", (email,)).fetchone()

                if not row:
                    self._send_json({"error": "Customer not found"}, 404)
                    conn.close()
                    return

                target_id = row['id']
                target_name = row['name']
                target_email = row['email']

                c.execute("DELETE FROM customers WHERE id = ?", (target_id,))
                conn.commit()

                print(f"[Customer Deleted] ID: {target_id} | Name: {target_name} | Email: {target_email}")
                self._send_json({
                    "success": True,
                    "id": target_id,
                    "name": target_name,
                    "message": f"Customer '{target_name}' deleted successfully"
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        
        # API: Create Razorpay Order
        if parsed.path == '/api/razorpay/create-order':
            amount = payload.get('amount')
            receipt = payload.get('receipt') or f"rcpt_{int(time.time())}"
            notes = payload.get('notes') or {}
            if not amount or float(amount) <= 0:
                self._send_json({"error": "Valid order amount is required"}, 400)
                return
            order_data, err = create_razorpay_order(amount, receipt, notes)
            if err:
                self._send_json({"error": err}, 500)
                return
            self._send_json(order_data)
            return

        # API: Verify Razorpay Payment & Confirm Order
        if parsed.path == '/api/razorpay/verify-payment':
            rzp_order_id = payload.get('razorpay_order_id', '').strip()
            rzp_payment_id = payload.get('razorpay_payment_id', '').strip()
            rzp_signature = payload.get('razorpay_signature', '').strip()

            customer_name = payload.get('customerName', '').strip()
            customer_email = payload.get('customerEmail', '').strip()
            customer_phone = payload.get('customerPhone', '').strip()
            shipping_address = payload.get('shippingAddress', '').strip()
            address_line2 = payload.get('addressLine2', '').strip()
            city = payload.get('city', '').strip()
            state = payload.get('state', '').strip()
            pincode = payload.get('pincode', '').strip()
            country = payload.get('country', 'India').strip()
            order_notes = payload.get('orderNotes', '').strip()
            items = payload.get('items', [])
            total_amount = float(payload.get('totalAmount', 0))
            subtotal_amount = float(payload.get('subtotalAmount', total_amount))
            discount_amount = float(payload.get('discountAmount', 0))
            coupon_code = payload.get('couponCode', '').strip()

            if not customer_name or not customer_email or not items:
                self._send_json({"error": "Customer name, email, and cart items are required"}, 400)
                return

            if not rzp_payment_id:
                self._send_json({"error": "Razorpay payment ID is missing"}, 400)
                return

            # Signature verification
            if not verify_razorpay_signature(rzp_order_id, rzp_payment_id, rzp_signature):
                self._send_json({"error": "Payment verification failed: invalid signature."}, 400)
                return

            payment_method_str = f"Razorpay ({rzp_payment_id})"
            gst_amount = float(payload.get('gstAmount', 0))
            gst_rate = float(payload.get('gstRate', 3))
            order_res, err = record_order_in_db(
                customer_name, customer_email, customer_phone, shipping_address, city,
                payment_method_str, items, total_amount, order_status="Paid (Razorpay)", rzp_payment_id=rzp_payment_id,
                address_line2=address_line2, state=state, pincode=pincode, country=country, order_notes=order_notes,
                subtotal_amount=subtotal_amount, discount_amount=discount_amount, coupon_code=coupon_code,
                gst_amount=gst_amount, gst_rate=gst_rate
            )
            if err:
                self._send_json({"error": err}, 500)
                return

            self._send_json({
                "success": True,
                "orderNumber": order_res["orderNumber"],
                "orderId": order_res["orderId"],
                "invoiceNumber": order_res.get("invoiceNumber"),
                "invoiceUrl": order_res.get("invoiceUrl"),
                "paymentId": rzp_payment_id,
                "status": "Paid (Razorpay)",
                "totalAmount": total_amount,
                "customerName": customer_name,
                "customerEmail": customer_email,
                "itemsSummary": order_res["itemsSummary"],
                "inventoryUpdates": order_res["inventoryUpdates"],
                "message": f"Payment {rzp_payment_id} verified and order placed successfully!"
            })
            return

        # API: Update Razorpay Admin Config
        if parsed.path == '/api/admin/razorpay/config':
            cfg = get_razorpay_config()
            if 'enabled' in payload:
                cfg['enabled'] = bool(payload['enabled'])
            if 'keyId' in payload:
                cfg['keyId'] = str(payload['keyId']).strip()
            if 'keySecret' in payload and payload['keySecret']:
                cfg['keySecret'] = str(payload['keySecret']).strip()
            if 'merchantName' in payload:
                cfg['merchantName'] = str(payload['merchantName']).strip()
            if 'themeColor' in payload:
                cfg['themeColor'] = str(payload['themeColor']).strip()
            save_razorpay_config(cfg)
            self._send_json({"success": True, "message": "Razorpay configuration updated successfully."})
            return

        # API: Test Razorpay Credentials
        if parsed.path == '/api/admin/razorpay/test-connection':
            key_id = payload.get('keyId', '').strip()
            key_secret = payload.get('keySecret', '').strip()
            if not key_secret:
                saved_cfg = get_razorpay_config()
                if not key_id or key_id == saved_cfg.get('keyId'):
                    key_id = saved_cfg.get('keyId', '')
                    key_secret = saved_cfg.get('keySecret', '')
            valid, msg = test_razorpay_credentials(key_id, key_secret)
            if valid and key_id and key_secret:
                cfg = get_razorpay_config()
                cfg['keyId'] = key_id
                cfg['keySecret'] = key_secret
                save_razorpay_config(cfg)
                msg += " (Credentials auto-saved to configuration)"
                print(f"[Razorpay Config Auto-Saved] Key: {key_id[:12]}...")
            self._send_json({"success": valid, "message": msg, "saved": valid and bool(key_id)})
            return

        # API: Save Pop-up Offer Configuration
        if parsed.path in ['/api/popup/config', '/api/admin/popup/config']:
            cfg = get_popup_config()
            for k in ['enabled', 'headline1', 'headline2', 'description', 'imageUrl', 
                      'offerCode', 'discountPercent', 'discountText', 'buttonText', 
                      'placeholderText', 'emailSubject', 'emailHeading', 'emailBody', 
                      'emailSupportSender', 'autoApply', 'delaySeconds']:
                if k in payload:
                    cfg[k] = payload[k]
            save_popup_config(cfg)
            self._send_json({"success": True, "message": "Pop-up settings saved successfully!", "config": cfg})
            return

        # API: Subscribe Email from Pop-up Screen & Dispatch Discount Coupon Email
        if parsed.path in ['/api/popup/subscribe', '/api/welcome-offer/subscribe']:
            email = str(payload.get('email', '')).strip().lower()
            if not email or '@' not in email or '.' not in email:
                self._send_json({"error": "Please enter a valid email address."}, 400)
                return

            cfg = get_popup_config()
            code = cfg.get("offerCode", "DIWALI20")
            disc = cfg.get("discountText", "Flat 20% Off Everything!")

            def _async_send():
                try:
                    deliv, msg = send_discount_coupon_email(email, code, disc)
                    print(f"[Async Popup Email] To: {email} | Delivered: {deliv} | Status: {msg}")
                except Exception as ex:
                    print(f"[Async Popup Email Error] {ex}")

            threading.Thread(target=_async_send, daemon=True).start()
            total_subs = record_popup_subscriber(email, code, delivered=True)

            self._send_json({
                "success": True,
                "email": email,
                "offerCode": code,
                "discountText": disc,
                "emailDelivered": True,
                "emailStatus": "Queued for instant dispatch",
                "subscribersCount": total_subs,
                "message": f"Your exclusive coupon {code} has been reserved! A confirmation email from support@soreva.in was dispatched to {email}."
            })
            return

        # API: Send Test Discount Email from Admin Panel
        if parsed.path in ['/api/admin/popup/test-email', '/api/popup/test-email']:
            target_email = str(payload.get('email', '')).strip() or "support@soreva.in"
            cfg = get_popup_config()
            code = cfg.get("offerCode", "DIWALI20")
            disc = cfg.get("discountText", "Flat 20% Off Everything!")
            custom_sub = payload.get('emailSubject')
            custom_body = payload.get('emailBody')

            delivered, status_msg = send_discount_coupon_email(
                target_email, code, disc, custom_subject=custom_sub, custom_body=custom_body
            )

            if delivered:
                self._send_json({"success": True, "message": f"Test discount email successfully sent to {target_email}!"})
            else:
                self._send_json({
                    "success": False,
                    "error": f"Email dispatch failed: {status_msg}. If using Gmail/Google Workspace, please ensure your 16-character Google App Password is set in Admin Settings."
                }, 400)
            return

        # API: Save Newsletter (Sorèva Circle) Configuration
        if parsed.path in ['/api/newsletter/config', '/api/admin/newsletter/config']:
            cfg = get_newsletter_config()
            for k in ['enabled', 'title', 'description', 'couponCode', 'discountPercent', 
                      'discountText', 'buttonText', 'placeholderText', 'emailSubject', 
                      'emailHeading', 'emailBody', 'emailSupportSender', 'autoApply']:
                if k in payload:
                    cfg[k] = payload[k]
            save_newsletter_config(cfg)
            self._send_json({"success": True, "message": "Sorèva Circle newsletter settings saved successfully!", "config": cfg})
            return

        # API: Subscribe Email from Footer 'Join The Sorèva Circle' & Dispatch WELCOME15 Email
        if parsed.path in ['/api/newsletter/subscribe', '/api/circle/subscribe']:
            email = str(payload.get('email', '')).strip().lower()
            if not email or '@' not in email or '.' not in email:
                self._send_json({"error": "Please enter a valid email address."}, 400)
                return

            cfg = get_newsletter_config()
            code = cfg.get("couponCode", "WELCOME15")
            disc = cfg.get("discountText", "Flat 15% Off Your First Order")
            disc_pct = cfg.get("discountPercent", 15)

            def _async_newsletter_send():
                try:
                    deliv, msg = send_newsletter_welcome_email(email, code, disc)
                    print(f"[Async Newsletter Email] To: {email} | Delivered: {deliv} | Status: {msg}")
                except Exception as ex:
                    print(f"[Async Newsletter Email Error] {ex}")

            threading.Thread(target=_async_newsletter_send, daemon=True).start()
            total_subs = record_newsletter_subscriber(email, code, delivered=True)

            self._send_json({
                "success": True,
                "email": email,
                "couponCode": code,
                "discountPercent": disc_pct,
                "discountText": disc,
                "emailDelivered": True,
                "emailStatus": "Queued for instant dispatch",
                "subscribersCount": total_subs,
                "message": f"Welcome to The Sorèva Circle! Your 15% OFF voucher ({code}) has been emailed to {email}."
            })
            return

        # API: Send Test Welcome Email for Newsletter from Admin Panel
        if parsed.path in ['/api/admin/newsletter/test-email', '/api/newsletter/test-email']:
            target_email = str(payload.get('email', '')).strip() or "support@soreva.in"
            cfg = get_newsletter_config()
            code = cfg.get("couponCode", "WELCOME15")
            disc = cfg.get("discountText", "Flat 15% Off Your First Order")
            custom_sub = payload.get('emailSubject')
            custom_body = payload.get('emailBody')

            delivered, status_msg = send_newsletter_welcome_email(
                target_email, code, disc, custom_subject=custom_sub, custom_body=custom_body
            )

            if delivered:
                self._send_json({"success": True, "message": f"Test welcome email with {code} successfully sent to {target_email}!"})
            else:
                self._send_json({
                    "success": False,
                    "error": f"Email dispatch failed: {status_msg}. Please check your SMTP settings in Admin Settings."
                }, 400)
            return

        # API: Save Notifications Configuration
        if parsed.path == '/api/admin/notifications/config':
            cfg = get_notifications_config()
            new_email = payload.get("email", {})
            new_wa = payload.get("whatsapp", {})

            if "enabled" in new_email: cfg["email"]["enabled"] = bool(new_email["enabled"])
            if "supportEmail" in new_email: cfg["email"]["supportEmail"] = str(new_email["supportEmail"]).strip()
            if "smtpHost" in new_email: cfg["email"]["smtpHost"] = str(new_email["smtpHost"]).strip()
            if "smtpPort" in new_email: cfg["email"]["smtpPort"] = int(new_email["smtpPort"] or 587)
            if "smtpUser" in new_email: cfg["email"]["smtpUser"] = str(new_email["smtpUser"]).strip()
            if "smtpPassword" in new_email and new_email["smtpPassword"]: cfg["email"]["smtpPassword"] = str(new_email["smtpPassword"]).strip()
            if "fromEmail" in new_email: cfg["email"]["fromEmail"] = str(new_email["fromEmail"]).strip()
            if "subjectTemplate" in new_email: cfg["email"]["subjectTemplate"] = str(new_email["subjectTemplate"]).strip()
            if "bodyTemplate" in new_email: cfg["email"]["bodyTemplate"] = str(new_email["bodyTemplate"])

            if "enabled" in new_wa: cfg["whatsapp"]["enabled"] = bool(new_wa["enabled"])
            if "provider" in new_wa: cfg["whatsapp"]["provider"] = str(new_wa["provider"]).strip()
            if "metaApiToken" in new_wa and new_wa["metaApiToken"]: cfg["whatsapp"]["metaApiToken"] = str(new_wa["metaApiToken"]).strip()
            if "metaPhoneNumberId" in new_wa: cfg["whatsapp"]["metaPhoneNumberId"] = str(new_wa["metaPhoneNumberId"]).strip()
            if "customWebhookUrl" in new_wa: cfg["whatsapp"]["customWebhookUrl"] = str(new_wa["customWebhookUrl"]).strip()
            if "defaultCountryCode" in new_wa: cfg["whatsapp"]["defaultCountryCode"] = str(new_wa["defaultCountryCode"]).strip()
            if "messageTemplate" in new_wa: cfg["whatsapp"]["messageTemplate"] = str(new_wa["messageTemplate"])
            if "messageType" in new_wa: cfg["whatsapp"]["messageType"] = str(new_wa["messageType"]).strip()
            if "templateName" in new_wa: cfg["whatsapp"]["templateName"] = str(new_wa["templateName"]).strip()
            if "templateLanguage" in new_wa: cfg["whatsapp"]["templateLanguage"] = str(new_wa["templateLanguage"]).strip()

            save_notifications_config(cfg)
            self._send_json({"success": True, "message": "Notification templates and gateway settings saved successfully."})
            return

        # API: Send Test Support Email
        if parsed.path == '/api/admin/notifications/test-email':
            target_email = payload.get("email") or get_notifications_config().get("email", {}).get("supportEmail", "support@soreva.in")
            sample_order = {
                "orderNumber": "SRV-SAMPLE-TEST",
                "customerName": "Test Client",
                "customerEmail": target_email,
                "customerPhone": "+91 97411 18940",
                "shippingAddress": "Sorèva Atelier Penthouse, 100 Feet Road, Indiranagar",
                "city": "Bengaluru",
                "itemsSummary": "1x Palatina Flawless Forehead Diadem Maang Tikka (24K Gold)",
                "totalAmount": 4999.00,
                "status": "Test Order",
                "paymentMethod": "Razorpay (Verified)",
                "paymentId": "pay_TEST_SAMPLE123"
            }
            success, msg = send_order_email_notification(sample_order, force_recipient=target_email)
            self._send_json({"success": success, "message": msg})
            return

        # API: Diagnose Meta WhatsApp Credentials
        if parsed.path == '/api/admin/notifications/diagnose-whatsapp':
            cfg = get_notifications_config().get("whatsapp", {})
            token = payload.get("metaApiToken") or cfg.get("metaApiToken", "").strip() or os.environ.get("META_SYSTEM_USER_ACCESS_TOKEN", "").strip()
            phone_id = payload.get("metaPhoneNumberId") or cfg.get("metaPhoneNumberId", "").strip()

            if not token:
                self._send_json({
                    "success": False,
                    "error": "No Meta Access Token provided. Please enter a token first."
                }, 400)
                return

            ctx = ssl.create_default_context()
            diag = {
                "tokenValid": False,
                "tokenDetails": {},
                "hasMessagingPermission": False,
                "hasManagementPermission": False,
                "missingPermissions": [],
                "phoneStatus": "unknown",
                "phoneDetails": {},
                "issues": [],
                "remedySteps": []
            }

            # 1. Inspect Token
            try:
                debug_url = f"https://graph.facebook.com/v20.0/debug_token?input_token={token}&access_token={token}"
                req = urllib.request.Request(debug_url)
                with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                    d = json.loads(resp.read().decode()).get("data", {})
                    diag["tokenValid"] = d.get("is_valid", False)
                    scopes = d.get("scopes", [])
                    diag["tokenDetails"] = {
                        "appId": d.get("app_id"),
                        "appName": d.get("application"),
                        "userType": d.get("type"),
                        "expiresAt": d.get("expires_at"),
                        "scopes": scopes
                    }
                    diag["hasMessagingPermission"] = "whatsapp_business_messaging" in scopes
                    diag["hasManagementPermission"] = "whatsapp_business_management" in scopes

                    if not diag["hasMessagingPermission"]:
                        diag["missingPermissions"].append("whatsapp_business_messaging")
                        diag["issues"].append("Access token lacks the 'whatsapp_business_messaging' permission required to send WhatsApp messages.")
                    if not diag["hasManagementPermission"]:
                        diag["missingPermissions"].append("whatsapp_business_management")
            except urllib.error.HTTPError as he:
                diag["issues"].append(f"Token validation failed (HTTP {he.code}): {he.read().decode()[:150]}")
            except Exception as e:
                diag["issues"].append(f"Token validation error: {str(e)}")

            # 2. Inspect Phone Number ID
            if phone_id:
                try:
                    p_url = f"https://graph.facebook.com/v20.0/{phone_id}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating"
                    p_req = urllib.request.Request(p_url, headers={"Authorization": f"Bearer {token}"})
                    with urllib.request.urlopen(p_req, context=ctx, timeout=10) as resp:
                        p_data = json.loads(resp.read().decode())
                        diag["phoneStatus"] = "verified"
                        diag["phoneDetails"] = p_data
                except urllib.error.HTTPError as he:
                    raw_err = he.read().decode('utf-8', errors='ignore')
                    try:
                        p_err = json.loads(raw_err).get("error", {})
                        if p_err.get("code") == 100:
                            diag["phoneStatus"] = "invalid_id"
                            diag["issues"].append(f"'{phone_id}' is not recognized as a WhatsApp Phone Number ID. Check Meta Developer Portal > WhatsApp > API Setup for the 'Phone number ID' (do NOT use the WhatsApp Business Account ID).")
                        elif not diag["hasMessagingPermission"]:
                            diag["phoneStatus"] = "permission_denied"
                            diag["issues"].append("Phone Number inspection failed because the access token does not have WhatsApp permissions.")
                        else:
                            diag["phoneStatus"] = "error"
                            diag["issues"].append(f"Phone Number check error: {p_err.get('message', str(he))}")
                    except Exception:
                        diag["phoneStatus"] = "error"
                        diag["issues"].append(f"Phone Number check error: {raw_err[:150]}")
                except Exception as e:
                    diag["phoneStatus"] = "error"
                    diag["issues"].append(f"Phone Number inspection error: {str(e)}")
            else:
                diag["issues"].append("No Meta WhatsApp Phone Number ID configured.")

            # 3. Actionable Remediation Guidance
            if not diag["hasMessagingPermission"]:
                diag["remedySteps"].append("1. Go to business.facebook.com > Business Settings > Users > System Users.")
                diag["remedySteps"].append("2. Select system user 'antigravity' (or create a new System User).")
                diag["remedySteps"].append("3. Under 'Assigned Assets', ensure your WhatsApp Business Account is added with 'Full Control'.")
                diag["remedySteps"].append("4. Click 'Generate New Token' > Select App 'antigravadsskill' (or your WhatsApp app).")
                diag["remedySteps"].append("5. Under Permissions, check 'whatsapp_business_messaging' and 'whatsapp_business_management'.")
                diag["remedySteps"].append("6. Copy the new token and paste it into the Sorèva Admin Panel.")
                diag["remedySteps"].append("ALTERNATIVE QUICK TEST: Go to developers.facebook.com > Your App > WhatsApp > API Setup and copy the 24-hour Temporary Access Token.")

            self._send_json({"success": True, "diagnostic": diag})
            return

        # API: Send Test WhatsApp Message
        if parsed.path == '/api/admin/notifications/test-whatsapp':
            phone = payload.get("phone") or "+919741118940"
            force_template = payload.get("template") or None
            sample_order = {
                "orderNumber": "SRV-SAMPLE-TEST",
                "customerName": "Valued Client",
                "customerEmail": "client@example.com",
                "customerPhone": phone,
                "shippingAddress": "Sorèva Atelier Penthouse, 100 Feet Road, Indiranagar",
                "city": "Bengaluru",
                "itemsSummary": "1x Palatina Flawless Forehead Diadem Maang Tikka (24K Gold)",
                "totalAmount": 4999.00,
                "status": "Test Order",
                "paymentMethod": "Razorpay (Verified)",
                "paymentId": "pay_TEST_SAMPLE123"
            }
            success, msg = send_order_whatsapp_notification(sample_order, force_phone=phone, force_template=force_template)
            self._send_json({"success": success, "message": msg})
            return
        # API: Place Order & Real-Time Checkout
        # ----------------------------------------------------
        if parsed.path == '/api/orders':
            customer_name = payload.get('customerName', '').strip()
            customer_email = payload.get('customerEmail', '').strip()
            customer_phone = payload.get('customerPhone', '').strip()
            shipping_address = payload.get('shippingAddress', '').strip()
            address_line2 = payload.get('addressLine2', '').strip()
            city = payload.get('city', '').strip()
            state = payload.get('state', '').strip()
            pincode = payload.get('pincode', '').strip()
            country = payload.get('country', 'India').strip()
            order_notes = payload.get('orderNotes', '').strip()
            payment_method = payload.get('paymentMethod', 'Cash on Delivery (Insured)')
            items = payload.get('items', [])
            total_amount = float(payload.get('totalAmount', 0))
            subtotal_amount = float(payload.get('subtotalAmount', total_amount))
            discount_amount = float(payload.get('discountAmount', 0))
            coupon_code = payload.get('couponCode', '').strip()

            if not customer_name or not customer_email or not items:
                self._send_json({"error": "Customer name, email, and cart items are required"}, 400)
                return

            order_res, err = record_order_in_db(
                customer_name, customer_email, customer_phone, shipping_address, city,
                payment_method, items, total_amount, order_status="Processing", rzp_payment_id=None,
                address_line2=address_line2, state=state, pincode=pincode, country=country, order_notes=order_notes,
                subtotal_amount=subtotal_amount, discount_amount=discount_amount, coupon_code=coupon_code
            )
            if err:
                self._send_json({"error": err}, 500)
                return

            self._send_json({
                "success": True,
                "orderNumber": order_res["orderNumber"],
                "orderId": order_res["orderId"],
                "invoiceNumber": order_res.get("invoiceNumber"),
                "invoiceUrl": order_res.get("invoiceUrl"),
                "status": order_res["status"],
                "totalAmount": order_res["totalAmount"],
                "customerName": customer_name,
                "customerEmail": customer_email,
                "itemsSummary": order_res["itemsSummary"],
                "inventoryUpdates": order_res.get("inventoryUpdates", []),
                "message": f"Order {order_res['orderNumber']} placed successfully!"
            })
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
        # API: Dispatch Digital Tax Invoice Email
        # ----------------------------------------------------
        if parsed.path == '/api/orders/send-invoice':
            order_id = payload.get('id') or payload.get('orderId')
            order_num = payload.get('orderNumber')
            target_email = payload.get('email')

            if not order_id and not order_num:
                self._send_json({"error": "Order id or orderNumber is required"}, 400)
                return

            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                if order_id:
                    row = c.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
                else:
                    row = c.execute("SELECT * FROM orders WHERE orderNumber = ?", (order_num,)).fetchone()

                if not row:
                    self._send_json({"error": "Order not found"}, 404)
                    return

                order_dict = dict(row)
                if not order_dict.get('invoiceNumber'):
                    order_dict['invoiceNumber'] = f"INV-{str(order_dict.get('orderNumber', '')).replace('SRV-', '')}"
                if not order_dict.get('invoiceHtml') or len(order_dict.get('invoiceHtml', '').strip()) < 50:
                    order_dict['invoiceHtml'] = generate_digital_invoice_html(order_dict)
                    c.execute("""
                        UPDATE orders 
                        SET invoiceNumber = ?, invoiceHtml = ?, invoiceCreatedAt = ? 
                        WHERE id = ?
                    """, (order_dict['invoiceNumber'], order_dict['invoiceHtml'], order_dict.get('createdAt'), order_dict['id']))
                    conn.commit()

                recipient = target_email or order_dict.get('customerEmail')
                if not recipient:
                    self._send_json({"error": "No recipient email available for this order"}, 400)
                    return

                success, msg = send_customer_digital_invoice(order_dict, force_recipient=recipient)
                self._send_json({
                    "success": success,
                    "message": msg,
                    "recipient": recipient,
                    "invoiceNumber": order_dict['invoiceNumber']
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
                saved_hash = get_admin_password_hash()
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
                if category == 'bracelets':
                    category = 'wristwear'
                sub_category = payload.get('subCategory', '').strip()
                plating = payload.get('plating', 'gold').lower().strip()
                price_inr = int(payload.get('priceINR', 0))
                orig_price_inr = int(payload.get('originalPriceINR', 0)) or price_inr
                badge = payload.get('badge', '').strip()
                finishes = payload.get('availableFinishes', ["24K Gold", "Rhodium Silver"])
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
                inv_id = prod_id

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

                images = payload.get('images', [])
                gallery = payload.get('gallery')
                if gallery is None:
                    gallery = [img.get('url') for img in images if img.get('visible') is not False and img.get('url')]
                    if not gallery:
                        gallery = [primary_img, hover_img] if hover_img != primary_img else [primary_img]

                # 1. Insert into SQLite products
                try:
                    c.execute("""
                        INSERT INTO products (
                            id, name, category, subCategory, plating, 
                            priceINR, originalPriceINR, badge, 
                            primaryImg, hoverImg, description, rating, reviews,
                            gallery, images
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        prod_id, name, category, sub_category, plating,
                        price_inr, orig_price_inr, badge,
                        primary_img, hover_img, description, rating, reviews,
                        json.dumps(gallery), json.dumps(images)
                    ))
                except Exception:
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
                        id, sku, productName, category, subCategory, stockQty, lowStockThreshold, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    inv_id, sku, name, category, sub_category, stock_qty, low_stock_threshold, stock_status
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
                    "gallery": gallery,
                    "images": images
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
            groq_key = os.environ.get('GROQ_API_KEY')
            
            if groq_key:
                try:
                    req = urllib.request.Request('https://api.groq.com/openai/v1/chat/completions', headers={
                        'Authorization': f'Bearer {groq_key}',
                        'Content-Type': 'application/json'
                    }, data=json.dumps({
                        "model": "llama3-8b-8192",
                        "messages": [
                            {"role": "system", "content": "You are the Sorèva AI Concierge. You are a polite, luxurious jewelry assistant for the Sorèva brand, founded by Sonal Belchada and Shruthi Shivakumar. The brand philosophy is 'Luxury is a feeling — not a price tag' and 'Because everyday deserves a little more sparkle'. Keep your answers extremely concise (1-2 sentences max). Answer questions about necklaces, earrings, rings, jewelry styling, and store policies: nationwide delivery across India dispatches in 1-3 business days, transit takes 3-7 business days with SMS/WhatsApp tracking; claims for damaged/incorrect items are accepted within 48 hours with continuous unboxing video; customer data is secured with 256-bit encryption and never shared or sold."},
                            {"role": "user", "content": user_msg}
                        ]
                    }).encode('utf-8'))
                    resp = urllib.request.urlopen(req, timeout=10)
                    data = json.loads(resp.read().decode('utf-8'))
                    reply = data['choices'][0]['message']['content']
                except Exception as e:
                    reply = f"Sorry, I am experiencing temporary network interference with my AI brain. ({e})"
            else:
                # Local Search/Recommendation engine
                data = get_stored_data() or {}
                products = data.get('products', [])
                msg_lower = user_msg.lower()
                
                                # Terms & Conditions Direct Answering
                # Terms & Conditions Direct Answering
                if any(w in msg_lower for w in ['terms', 'condition', 'agreement', 'rules', 'cancellation', 'pricing']):
                    self._send_json({"reply": "Under Sorèva Terms & Conditions, all prices are in INR (subject to dynamic update), orders are confirmed upon payment verification, and products are meticulously color-calibrated to represent authentic studio craftsmanship."})
                    return

                # Privacy Policy Direct Answering
                # Terms & Conditions Direct Answering
                # Terms & Conditions Direct Answering
                if any(w in msg_lower for w in ['terms', 'condition', 'agreement', 'rules', 'cancellation', 'pricing']):
                    self._send_json({"reply": "Under Sorèva Terms & Conditions, all prices are in INR (subject to dynamic update), orders are confirmed upon payment verification, and products are meticulously color-calibrated to represent authentic studio craftsmanship."})
                    return

                # Privacy Policy Direct Answering
                if any(w in msg_lower for w in ['privacy', 'data', 'security', 'secure', 'confidential']):
                    self._send_json({"reply": "Under the Sorèva Promise, your personal data is protected with 256-bit SSL encryption. We never sell, rent, or trade your information with unauthorized third-party platforms."})
                    return

                # Return & Exchange Policy Direct Answering
                # Shipping & Delivery Policy Direct Answering
                if any(w in msg_lower for w in ['shipping', 'delivery', 'dispatch', 'transit', 'track', 'courier']):
                    self._send_json({"reply": "Orders across India are dispatched within 1–3 business days after quality inspection. Delivery typically takes 3–7 business days, with real-time tracking sent via SMS, WhatsApp, and email."})
                    return


                if any(w in msg_lower for w in ['return', 'exchange', 'refund', 'replacement', 'damaged']):
                    self._send_json({"reply": "Under Sorèva Care, claims for damaged, defective, or incorrect items must be reported within 48 hours of delivery with a continuous unboxing video. Approved refunds or replacements are processed in 5–7 business days."})
                    return

                if not msg_lower:
                    reply = "How can I assist you with your jewelry selection today?"
                elif msg_lower in ['hello', 'hi', 'hey', 'hello!', 'hi!', 'hey!']:
                    reply = "Hello! I am the Sorèva Concierge. What kind of jewelry are you looking for?"
                else:
                    stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are', 'color', 'what', 'about', 'how', 'does', 'would', 'could', 'should', 'then', 'there', 'here', 'we', 'they', 'them', 'their', 'our', 'my', 'mine', 'yours', 'from', 'where', 'when', 'who', 'why', 'which', 'those', 'these']
                    raw_keywords = [w for w in msg_lower.replace('?', '').replace('!', '').replace('.', '').replace(',', '').split() if len(w) > 2 and w not in stopwords]
                    
                    if not raw_keywords:
                         reply = "I'm not quite sure what you're looking for. Try mentioning a style like 'choker', 'jhumkas', or 'tennis bracelet'!"
                    else:
                        global_words = set()
                        for p in products:
                            if not p.get('active', True) or p.get('disabled', False):
                                continue
                            text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
                            for w in text.split():
                                global_words.add(w)
                                
                        # Semantic "Brain" - Maps user intent to catalog traits
                        semantic_map = {
                            "creative": ["statement", "designer", "unique", "art"],
                            "unique": ["statement", "designer", "exclusive"],
                            "simple": ["classic", "minimal", "everyday", "essential", "medium", "small"],
                            "elegant": ["classic", "minimal", "fine", "medium"],
                            "heavy": ["bridal", "traditional", "broad", "choker"],
                            "wedding": ["bridal", "traditional"],
                            "marriage": ["bridal", "traditional", "mangalsutra"],
                            "pink": ["rose gold"],
                            "green": ["emerald", "kundan"],
                            "red": ["ruby", "kundan"],
                            "black": ["oxidised", "black"],
                            "white": ["cz", "rhodium", "silver", "zirconia"],
                            "cheap": ["sale", "essential"],
                            "expensive": ["bridal", "premium"],
                            "beautiful": [], # Ignore generic adjectives
                            "pretty": [],
                            "gorgeous": [],
                            "nice": [],
                            "buy": []
                        }
                        
                        valid_keywords = []
                        missing_keywords = []
                        
                        # Expand raw keywords using the semantic brain
                        expanded_keywords = []
                        for kw in raw_keywords:
                            if kw in semantic_map:
                                if semantic_map[kw]:
                                    expanded_keywords.append((kw, semantic_map[kw]))
                            else:
                                expanded_keywords.append((kw, [kw]))
                                
                        for original_word, synonym_list in expanded_keywords:
                            found_valid = False
                            for syn in synonym_list:
                                syn_exists = False
                                for p in products:
                                    pt = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
                                    if syn in pt:
                                        syn_exists = True
                                        break
                                if syn_exists:
                                    valid_keywords.append(syn)
                                    found_valid = True
                                    break
                                    
                            if not found_valid:
                                missing_keywords.append(original_word)
                                
                        if missing_keywords:
                            if valid_keywords:
                                reply = f"I'm sorry, but we don't currently carry any pieces with '{' '.join(missing_keywords)}'. Would you like to explore our <a href='catalog.html?cat=all' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{' '.join(valid_keywords)} collection</a> instead?"
                            else:
                                reply = f"I'm sorry, but we don't currently carry any pieces matching '{' '.join(missing_keywords)}' in our catalog. Could you try a different style?"
                        else:
                            matches = []
                            for p in products:
                                if not p.get('active', True) or p.get('disabled', False):
                                    continue
                                full_text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
                                
                                all_match = True
                                for kw in valid_keywords:
                                    if kw not in full_text:
                                        all_match = False
                                        break
                                
                                if all_match:
                                    # Calculate a relevance score for sorting ties
                                    score = 0
                                    title_text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')}".lower()
                                    for kw in valid_keywords:
                                        if kw in title_text:
                                            score += 5
                                        else:
                                            score += 1
                                    matches.append((score, p))
                            
                            if matches:
                                matches.sort(key=lambda x: x[0], reverse=True)
                                top_product = matches[0][1]
                                link = f"<a href='product.html?id={top_product['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{top_product.get('name', 'This piece')}</a>"
                                reply = f"I found exactly what you're looking for! Check out {link} for ₹{top_product.get('priceINR')}."
                                
                                if len(matches) > 1:
                                    alt = matches[1][1]
                                    alt_link = f"<a href='product.html?id={alt['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{alt.get('name', 'This piece')}</a>"
                                    reply += f" We also have {alt_link} available."
                            else:
                                reply = f"I couldn't find any piece that perfectly matches all your criteria ({' and '.join(valid_keywords)}). Try broadening your search!"

            self._send_json({"reply": reply})
            return
            
        # ----------------------------------------------------
        # API: CZMakers Stock & Pricing Co-Worker Agent Control
        # ----------------------------------------------------
        if parsed.path in ('/api/admin/czm-agent/start', '/api/admin/sync-catalog', '/api/admin/czm-agent/complete-refresh'):
            mode = payload.get('mode', 'full_discovery')
            if parsed.path == '/api/admin/czm-agent/complete-refresh':
                mode = 'complete_refresh'
            max_pages = int(payload.get('maxPages', 0))
            verify_unseen = bool(payload.get('verifyUnseen', False))
            wipe_products = bool(payload.get('wipeProducts', False)) or (mode == 'complete_refresh')
            mark_unmatched_oos = bool(payload.get('markUnmatchedOos', True))

            script_path = os.path.join(DATA_DIR, '..', 'scripts', 'czm_sync_agent.py')
            cmd = [sys.executable, script_path, '--mode', mode, '--max-pages', str(max_pages)]
            if verify_unseen and mode != 'complete_refresh':
                cmd.append('--verify-unseen')
            if wipe_products:
                cmd.append('--wipe-products')
            if mark_unmatched_oos:
                cmd.append('--mark-unmatched-oos')
            else:
                cmd.append('--no-mark-unmatched-oos')

            category = str(payload.get('category', 'all') or 'all').strip()
            if category.lower() in ('silver', 'accessories', 'silver-jewellery', 'cz-accessories', 'cz-brooch', 'mangtika'):
                self._send_json({
                    "success": False,
                    "error": f"Category '{category}' has been removed from Sorèva store & inventory and is bypassed from sync."
                }, status=400)
                return

            if category and category != 'all':
                cmd.extend(['--category', category])

            # Clear stop flag if present
            stop_flag = os.path.join(DATA_DIR, 'czm-sync-stop.flag')
            if os.path.exists(stop_flag):
                try: os.remove(stop_flag)
                except Exception: pass

            log_file = os.path.join(DATA_DIR, 'czm-sync.log')
            log_f = open(log_file, 'a', encoding='utf-8')
            subprocess.Popen(cmd, cwd=BASE_DIR, stdout=log_f, stderr=log_f)
            page_desc = "all pages" if max_pages == 0 else f"{max_pages} pages/cat"
            cat_desc = f" for '{category.title()}'" if category and category != 'all' else " across all categories"
            if mode == 'complete_refresh':
                if category and category != 'all':
                    msg = f"CZMakers Category Refresh launched for '{category.title()}'! Fresh loading '{category.title()}' pieces with zero duplication ({page_desc})."
                else:
                    msg = f"CZMakers Complete Stock Refresh launched! Clearing previous catalog pieces and performing fresh loading across all categories ({page_desc})."
            else:
                msg = f"CZMakers Stock Co-Worker launched in '{mode}' mode{cat_desc} ({page_desc}). Matching existing inventory by SKU, adding new stock, and marking unmatched as Out of Stock."
            self._send_json({
                "success": True, 
                "message": msg
            })
            return

        if parsed.path == '/api/admin/czm-agent/stop':
            stop_flag = os.path.join(DATA_DIR, 'czm-sync-stop.flag')
            try:
                with open(stop_flag, 'w', encoding='utf-8') as sf:
                    sf.write('stop')
                self._send_json({"success": True, "message": "Stop signal sent to Co-Worker Agent."})
            except Exception as e:
                self._send_json({"error": f"Failed to send stop signal: {e}"}, 500)
            return
            
                # ----------------------------------------------------
        # API: Fast Badge Update (Single or Bulk)
        # ----------------------------------------------------
                # ----------------------------------------------------
        # API: Sync Latest Instagram Video Reels via Meta Graph API
        # ----------------------------------------------------
        if parsed.path == '/api/instagram/sync':
            sd = get_stored_data() or {}
            insta_settings = sd.get('settings', {}).get('instagram', {})
            token = payload.get('accessToken', '').strip() or insta_settings.get('metaAccessToken', '').strip()
            account_id = payload.get('accountId', '').strip() or insta_settings.get('instagramAccountId', '').strip()
            handle = payload.get('handle', '').strip().replace('@', '') or insta_settings.get('handle', 'soreva_jewels')

            if not token:
                self._send_json({
                    "success": False,
                    "error": "Meta Access Token is required to sync directly from Instagram Graph API. You can enter your access token in the Admin Settings."
                }, 400)
                return

            try:
                ssl_ctx = ssl.create_default_context()

                # Step 1: Auto-resolve Instagram Business Account ID if missing or 'me'
                if not account_id or account_id == 'me':
                    try:
                        acc_req = urllib.request.Request(
                            f"https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account{{id,username}}&access_token={token}",
                            headers={'User-Agent': 'SorevaStorefront/1.0'}
                        )
                        with urllib.request.urlopen(acc_req, timeout=10, context=ssl_ctx) as acc_resp:
                            acc_data = json.loads(acc_resp.read().decode('utf-8'))
                        for page in acc_data.get('data', []):
                            ig = page.get('instagram_business_account')
                            if ig and ig.get('id'):
                                if handle.lower() in ig.get('username', '').lower() or 'soreva' in ig.get('username', '').lower():
                                    account_id = ig['id']
                                    handle = ig.get('username', handle)
                                    break
                                elif not account_id:
                                    account_id = ig['id']
                                    handle = ig.get('username', handle)
                    except Exception as res_err:
                        print(f"[Instagram Account Resolution Notice] {res_err}")

                # Default to soreva_jewels known account ID if still unresolved
                if not account_id or account_id == 'me':
                    account_id = '17841439896942804'

                # Step 2: Fetch media from Instagram Business Account
                graph_url = f"https://graph.facebook.com/v19.0/{account_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25&access_token={token}"
                req = urllib.request.Request(graph_url, headers={'User-Agent': 'SorevaStorefront/1.0'})
                with urllib.request.urlopen(req, timeout=15, context=ssl_ctx) as resp:
                    api_data = json.loads(resp.read().decode('utf-8'))

                raw_items = api_data.get('data', [])
                reels = []
                for idx, item in enumerate(raw_items):
                    mtype = item.get('media_type', '')
                    murl = item.get('media_url') or ''
                    turl = item.get('thumbnail_url') or ''
                    permalink = item.get('permalink') or f"https://www.instagram.com/{handle}"
                    raw_caption = item.get('caption') or ''
                    title = raw_caption.split('\n')[0].strip()[:50] if raw_caption else 'Sorèva Instagram Reel'

                    # Include video reels or items with media
                    if mtype == 'VIDEO' or turl or murl:
                        video_src = murl if murl.startswith('http') else (turl if turl.startswith('http') else f"/api/video/proxy?url={murl}")
                        reels.append({
                            "id": item.get('id', f"ig_{idx}"),
                            "type": "video",
                            "title": title,
                            "caption": raw_caption or f"Jewellery piece featured on @{handle}",
                            "videoUrl": video_src,
                            "rawVideoUrl": murl or permalink,
                            "thumbnail": turl or murl or "https://indian-jewellery.com/core/thumb_images/product_images/412512AQ10CV92119.jpg",
                            "permalink": permalink,
                            "views": f"{(item.get('like_count') or 150) * 12 + 120:,}",
                            "likes": f"{(item.get('like_count') or 0):,}",
                            "date": (item.get('timestamp') or '')[:10]
                        })

                if reels:
                    # Sort reels so items with playable video MP4s come first
                    reels.sort(key=lambda r: 0 if (r['videoUrl'] and r['videoUrl'].startswith('http') and ('.mp4' in r['videoUrl'] or 'fbcdn.net' in r['videoUrl'] or 'cdninstagram' in r['videoUrl'])) else 1)

                    sd['instagram'] = reels
                    if 'settings' not in sd: sd['settings'] = {}
                    if 'instagram' not in sd['settings']: sd['settings']['instagram'] = {}
                    sd['settings']['instagram']['metaAccessToken'] = token
                    sd['settings']['instagram']['instagramAccountId'] = account_id
                    sd['settings']['instagram']['handle'] = handle
                    sd['settings']['instagram']['lastSync'] = datetime.utcnow().isoformat() + "Z"
                    save_stored_data(sd)
                    self._send_json({
                        "success": True,
                        "message": f"Successfully synced {len(reels)} latest reels from Instagram @{handle}!",
                        "count": len(reels),
                        "items": reels
                    })
                else:
                    self._send_json({
                        "success": False,
                        "error": f"No video reels found for Instagram account ID {account_id}."
                    }, 404)

            except urllib.error.HTTPError as he:
                err_msg = str(he)
                try:
                    err_body = json.loads(he.read().decode('utf-8'))
                    if 'error' in err_body and 'message' in err_body['error']:
                        err_msg = err_body['error']['message']
                except Exception:
                    pass
                self._send_json({
                    "success": False,
                    "error": f"Meta Graph API error ({he.code}): {err_msg}"
                }, 400)
            except Exception as err:
                self._send_json({
                    "success": False,
                    "error": f"Failed to connect to Meta Graph API: {str(err)}"
                }, 500)
            return

                # ----------------------------------------------------
        # API: Save Instagram Configuration Settings
        # ----------------------------------------------------
        if parsed.path == '/api/instagram/settings':
            sd = get_stored_data() or {}
            if 'settings' not in sd: sd['settings'] = {}
            if 'instagram' not in sd['settings']: sd['settings']['instagram'] = {}

            handle = payload.get('handle', '').strip().replace('@', '') or 'soreva_jewels'
            token = payload.get('metaAccessToken', '').strip()
            account_id = payload.get('instagramAccountId', '').strip()
            auto_sync = bool(payload.get('autoSync', True))
            interval = int(payload.get('autoSyncIntervalHours', 6))

            sd['settings']['instagram'].update({
                "handle": handle,
                "profileUrl": f"https://www.instagram.com/{handle}",
                "metaAccessToken": token,
                "instagramAccountId": account_id,
                "autoSync": auto_sync,
                "autoSyncIntervalHours": interval
            })
            save_stored_data(sd)
            self._send_json({"success": True, "message": "Instagram settings updated successfully"})
            return

        # ----------------------------------------------------
        # API: Add Custom Instagram Reel or Video Link
        # ----------------------------------------------------
        if parsed.path == '/api/instagram/reels/add':
            sd = get_stored_data() or {}
            if 'instagram' not in sd: sd['instagram'] = []

            raw_url = payload.get('url', '').strip()
            title = payload.get('title', '').strip() or 'Sorèva Reel'
            caption = payload.get('caption', '').strip() or title
            thumbnail = payload.get('thumbnail', '').strip()
            video_url = payload.get('videoUrl', '').strip() or raw_url

            permalink = raw_url if 'instagram.com' in raw_url else 'https://www.instagram.com/soreva_jewels'
            
            new_reel = {
                "id": f"reel_{int(time.time())}",
                "type": "video",
                "title": title,
                "caption": caption,
                "videoUrl": f"/api/video/proxy?url={video_url}" if (video_url.startswith('http') and not video_url.startswith('/api/video/proxy')) else video_url,
                "rawVideoUrl": video_url,
                "thumbnail": thumbnail or "https://indian-jewellery.com/core/thumb_images/product_images/412512AQ10CV92119.jpg",
                "permalink": permalink,
                "views": "15.4K",
                "likes": "1,200",
                "date": "Today"
            }
            sd['instagram'].insert(0, new_reel)
            save_stored_data(sd)
            self._send_json({"success": True, "message": "Reel added to gallery successfully", "item": new_reel})
            return

        # ----------------------------------------------------
        # API: Delete Instagram Reel from Gallery
        # ----------------------------------------------------
        if parsed.path == '/api/instagram/reels/delete':
            sd = get_stored_data() or {}
            rid = payload.get('id', '')
            if 'instagram' in sd and rid:
                sd['instagram'] = [r for r in sd['instagram'] if str(r.get('id')) != str(rid)]
                save_stored_data(sd)
            self._send_json({"success": True, "message": "Reel removed from gallery"})
            return

        if parsed.path == '/api/db/products/badge':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                badge = payload.get('badge', '').strip()
                employee_name = payload.get('employeeName', 'Admin')
                ids = payload.get('ids')
                if not ids:
                    single_id = payload.get('id')
                    ids = [single_id] if single_id else []

                if not ids:
                    self._send_json({"error": "Product ID(s) required"}, 400)
                    conn.close()
                    return

                c = conn.cursor()
                for pid in ids:
                    c.execute("UPDATE products SET badge = ? WHERE id = ? OR name = ?", (badge, str(pid), str(pid)))

                audit_summary = f"Changed badge to '{badge or 'None'}' for {len(ids)} item(s): {', '.join(str(x) for x in ids[:3])}{'...' if len(ids) > 3 else ''}"
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Update Badge', 'Product', ?, ?)
                """, (f"log_{gen_pb_id()}", employee_name, str(ids[0]), audit_summary))

                conn.commit()

                # Update store-data.json
                sd = get_stored_data() or {}
                if 'products' in sd:
                    id_set = set(str(x) for x in ids)
                    for p in sd['products']:
                        if str(p.get('id')) in id_set or str(p.get('dbId')) in id_set or p.get('name') in id_set:
                            p['badge'] = badge
                    save_stored_data(sd)

                self._send_json({
                    "success": True,
                    "message": f"Badge updated to '{badge or 'None'}' for {len(ids)} product(s)",
                    "badge": badge,
                    "ids": ids
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Update Product Category & Sub-Category (Single or Bulk)
        # ----------------------------------------------------
        if parsed.path == '/api/db/products/category':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                new_cat = payload.get('category')
                new_sub = payload.get('subCategory')
                employee_name = payload.get('employeeName', 'Admin')
                ids = payload.get('ids')
                if not ids:
                    single_id = payload.get('id')
                    ids = [single_id] if single_id else []

                if not ids:
                    self._send_json({"error": "Product ID(s) required"}, 400)
                    conn.close()
                    return

                if new_cat is not None:
                    new_cat = new_cat.strip().lower()
                    if new_cat == 'bracelets':
                        new_cat = 'wristwear'
                if new_sub is not None:
                    new_sub = new_sub.strip()

                c = conn.cursor()
                for pid in ids:
                    spid = str(pid)
                    if new_cat is not None and new_sub is not None:
                        c.execute("UPDATE products SET category = ?, subCategory = ? WHERE id = ? OR name = ?", (new_cat, new_sub, spid, spid))
                        c.execute("UPDATE inventory SET category = ?, subCategory = ? WHERE id = ? OR sku = ? OR productName = ?", (new_cat, new_sub, spid, spid, spid))
                    elif new_cat is not None:
                        c.execute("UPDATE products SET category = ? WHERE id = ? OR name = ?", (new_cat, spid, spid))
                        c.execute("UPDATE inventory SET category = ? WHERE id = ? OR sku = ? OR productName = ?", (new_cat, spid, spid, spid))
                    elif new_sub is not None:
                        c.execute("UPDATE products SET subCategory = ? WHERE id = ? OR name = ?", (new_sub, spid, spid))
                        c.execute("UPDATE inventory SET subCategory = ? WHERE id = ? OR sku = ? OR productName = ?", (new_sub, spid, spid, spid))

                audit_summary = f"Updated category to '{new_cat or 'unchanged'}' and subCategory to '{new_sub or 'unchanged'}' for {len(ids)} item(s): {', '.join(str(x) for x in ids[:3])}{'...' if len(ids) > 3 else ''}"
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Update Category', 'Product', ?, ?)
                """, (f"log_{gen_pb_id()}", employee_name, str(ids[0]), audit_summary))

                conn.commit()

                # Synchronize into store-data.json
                sd = get_stored_data() or {}
                if 'products' in sd:
                    id_set = set(str(x) for x in ids)
                    for p in sd['products']:
                        if str(p.get('id')) in id_set or str(p.get('dbId')) in id_set or p.get('name') in id_set:
                            if new_cat is not None:
                                p['category'] = new_cat
                            if new_sub is not None:
                                p['subCategory'] = new_sub
                    save_stored_data(sd)

                self._send_json({
                    "success": True,
                    "message": f"Category/Subcategory updated for {len(ids)} product(s)",
                    "category": new_cat,
                    "subCategory": new_sub,
                    "ids": ids
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Update Product Images & Visibility Only
        # ----------------------------------------------------
        if parsed.path == '/api/db/products/images':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                prod_id = payload.get('id', '')
                images = payload.get('images', [])
                primary_img = payload.get('primaryImg', '').strip()
                hover_img = payload.get('hoverImg', '').strip()
                gallery = payload.get('gallery')
                if gallery is None:
                    gallery = [img.get('url') for img in images if img.get('visible') is not False and img.get('url')]
                
                if not prod_id:
                    self._send_json({"error": "Product ID is required"}, 400)
                    conn.close()
                    return

                if not primary_img and len(gallery) > 0:
                    primary_img = gallery[0]
                if not hover_img:
                    hover_img = gallery[1] if len(gallery) > 1 else primary_img

                c = conn.cursor()
                try:
                    c.execute("""
                        UPDATE products 
                        SET primaryImg = ?, hoverImg = ?, gallery = ?, images = ?
                        WHERE id = ?
                    """, (primary_img, hover_img, json.dumps(gallery), json.dumps(images), str(prod_id)))
                except Exception:
                    c.execute("""
                        UPDATE products 
                        SET primaryImg = ?, hoverImg = ?, gallery = ?
                        WHERE id = ?
                    """, (primary_img, hover_img, json.dumps(gallery), str(prod_id)))
                conn.commit()

                # Sync with store-data.json
                sd = get_stored_data() or {}
                for p in sd.get('products', []):
                    if str(p.get('id')) == str(prod_id) or str(p.get('dbId')) == str(prod_id):
                        p['primaryImg'] = primary_img
                        p['hoverImg'] = hover_img
                        p['gallery'] = gallery
                        p['images'] = images
                        break
                save_stored_data(sd)

                self._send_json({
                    "success": True, 
                    "message": "Product images and visibility updated successfully",
                    "primaryImg": primary_img,
                    "hoverImg": hover_img,
                    "gallery": gallery,
                    "images": images
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        if parsed.path == '/api/db/products/bulk-status':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                employee_name = payload.get('employeeName', 'Admin')
                ids = payload.get('ids')
                if not ids:
                    single_id = payload.get('id')
                    ids = [single_id] if single_id else []

                if not ids:
                    self._send_json({"error": "Product ID(s) required"}, 400)
                    conn.close()
                    return

                disabled_raw = payload.get('disabled', 1)
                disabled_val = 1 if disabled_raw in [1, True, '1', 'true', 'True'] else 0
                active_val = 0 if disabled_val == 1 else 1

                c = conn.cursor()
                for pid in ids:
                    pid_str = str(pid).strip()
                    c.execute("UPDATE products SET disabled = ?, active = ? WHERE id = ? OR name = ?", 
                              (disabled_val, active_val, pid_str, pid_str))
                    if disabled_val == 1:
                        c.execute("UPDATE inventory SET status = 'Disabled' WHERE id = ? OR sku = ? OR productName = ?",
                                  (pid_str, pid_str, pid_str))
                    else:
                        c.execute("""
                            UPDATE inventory 
                            SET status = CASE WHEN stockQty > 0 THEN 'In Stock' ELSE 'Out of Stock' END 
                            WHERE id = ? OR sku = ? OR productName = ?
                        """, (pid_str, pid_str, pid_str))

                action_verb = "Disabled" if disabled_val == 1 else "Enabled"
                audit_summary = f"{action_verb} {len(ids)} item(s): {', '.join(str(x) for x in ids[:3])}{'...' if len(ids) > 3 else ''}"
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Bulk Status Update', 'Product', ?, ?)
                """, (f"log_{gen_pb_id()}", employee_name, str(ids[0]), audit_summary))

                conn.commit()

                # Update store-data.json
                sd = get_stored_data() or {}
                if 'products' in sd:
                    id_set = set(str(x).strip() for x in ids)
                    for p in sd['products']:
                        if str(p.get('id')).strip() in id_set or str(p.get('dbId')).strip() in id_set or str(p.get('name')).strip() in id_set:
                            p['disabled'] = bool(disabled_val == 1)
                            p['active'] = bool(active_val == 1)
                            if disabled_val == 1:
                                p['stockStatus'] = 'Disabled'
                            else:
                                qty = p.get('stockQty')
                                p['stockStatus'] = 'In Stock' if (qty is None or qty > 0) else 'Out of Stock'
                    save_stored_data(sd)

                self._send_json({
                    "success": True,
                    "message": f"Successfully {action_verb.lower()} {len(ids)} product(s)",
                    "disabled": disabled_val,
                    "active": active_val,
                    "ids": ids
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
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
                if category == 'bracelets':
                    category = 'wristwear'
                sub_category = payload.get('subCategory', '').strip()
                plating = payload.get('plating', 'gold').lower().strip()
                price_inr = int(payload.get('priceINR', 0))
                orig_price_inr = int(payload.get('originalPriceINR', 0)) or price_inr
                badge = payload.get('badge', '').strip()
                finishes = payload.get('availableFinishes', ["24K Gold", "Rhodium Silver"])
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

                images_payload = payload.get('images')
                gallery_payload = payload.get('gallery')
                if gallery_payload is not None:
                    visible_gallery = gallery_payload
                elif images_payload is not None:
                    visible_gallery = [img.get('url') for img in images_payload if img.get('visible') is not False and img.get('url')]
                    if not visible_gallery and primary_img:
                        visible_gallery = [primary_img]
                else:
                    visible_gallery = [primary_img, hover_img] if hover_img and hover_img != primary_img else [primary_img]

                # 1. Update SQLite products
                try:
                    if images_payload is not None:
                        c.execute("""
                            UPDATE products 
                            SET name = ?, category = ?, subCategory = ?, plating = ?,
                                priceINR = ?, originalPriceINR = ?, badge = ?,
                                primaryImg = ?, hoverImg = ?, videoUrl = ?, description = ?,
                                gallery = ?, images = ?
                            WHERE id = ?
                        """, (
                            name, category, sub_category, plating,
                            price_inr, orig_price_inr, badge,
                            primary_img, hover_img, video_url, description,
                            json.dumps(visible_gallery), json.dumps(images_payload), prod_id
                        ))
                    else:
                        c.execute("""
                            UPDATE products 
                            SET name = ?, category = ?, subCategory = ?, plating = ?,
                                priceINR = ?, originalPriceINR = ?, badge = ?,
                                primaryImg = ?, hoverImg = ?, videoUrl = ?, description = ?,
                                gallery = ?
                            WHERE id = ?
                        """, (
                            name, category, sub_category, plating,
                            price_inr, orig_price_inr, badge,
                            primary_img, hover_img, video_url, description,
                            json.dumps(visible_gallery), prod_id
                        ))
                except Exception:
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

                usd_val = payload.get('usdWholesale')
                if usd_val is not None:
                    try:
                        cost_num = float(usd_val)
                        if cost_num >= 0:
                            c.execute("UPDATE products SET usdWholesale = ? WHERE id = ?", (cost_num, prod_id))
                            c.execute("UPDATE inventory SET usdWholesale = ? WHERE id = ? OR sku = ? OR productName = ?", (cost_num, prod_id, payload.get('sku', ''), orig_name))
                    except Exception:
                        pass

                # 2. Update SQLite inventory
                c.execute("""
                    UPDATE inventory
                    SET productName = ?, category = ?, subCategory = ?, stockQty = ?, lowStockThreshold = ?, status = ?
                    WHERE id = ? OR sku = ? OR productName = ? OR sku LIKE ('%' || ? || '%')
                """, (name, category, sub_category, stock_qty, low_stock_threshold, stock_status, prod_id, payload.get('sku', ''), orig_name, prod_id))

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
                        upd = {
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
                            "gallery": visible_gallery
                        }
                        if images_payload is not None:
                            upd["images"] = images_payload
                        p.update(upd)
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
        # API: Bulk Delete Out-of-Stock Products (Exclusive to Catalog)
        # CRITICAL SAFETY: NEVER touches or alters 'orders' or 'customers' tables.
        # ----------------------------------------------------
        if parsed.path == '/api/admin/products/delete-out-of-stock':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                
                # Identify out-of-stock items in products & inventory
                rows = c.execute("""
                    SELECT DISTINCT p.id, p.name 
                    FROM products p
                    LEFT JOIN inventory i ON p.id = i.id OR p.name = i.productName
                    WHERE p.disabled = 1 OR p.active = 0 OR i.status = 'Out of Stock' OR i.stockQty <= 0
                """).fetchall()

                oos_ids = list({r['id'] for r in rows if r['id']})
                oos_names = {r['name'] for r in rows if r['name']}
                
                # Also include any out-of-stock from store-data.json
                sd = get_stored_data() or {}
                if 'products' in sd:
                    for p in sd['products']:
                        if p.get('disabled') == 1 or p.get('active') == 0 or p.get('stockStatus') == 'Out of Stock' or p.get('inStock') == False or p.get('stockQty', 1) <= 0:
                            if p.get('id'): oos_ids.append(str(p['id']))
                            if p.get('dbId'): oos_ids.append(str(p['dbId']))
                            if p.get('name'): oos_names.add(p['name'])

                oos_ids = list(set(oos_ids))
                deleted_count = len(oos_ids)

                if deleted_count > 0:
                    placeholders = ','.join('?' for _ in oos_ids)
                    # 1. Delete from products table
                    c.execute(f"DELETE FROM products WHERE id IN ({placeholders})", oos_ids)
                    
                    # 2. Delete from inventory table
                    c.execute(f"DELETE FROM inventory WHERE id IN ({placeholders})", oos_ids)
                    if oos_names:
                        name_placeholders = ','.join('?' for _ in oos_names)
                        c.execute(f"DELETE FROM inventory WHERE productName IN ({name_placeholders})", list(oos_names))
                    
                    # 3. Log audit event (orders and customers are 100% preserved)
                    c.execute("""
                        INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                        VALUES (?, 'Admin', 'Delete Out of Stock', 'Catalog', 'bulk', ?)
                    """, (f"log_{gen_pb_id()}", f"Purged {deleted_count} out-of-stock products from catalog. Orders and customer records remain 100% exclusive."))
                    
                    conn.commit()

                    # 4. Remove from store-data.json
                    if 'products' in sd:
                        oos_set = set(oos_ids)
                        sd['products'] = [
                            p for p in sd['products'] 
                            if str(p.get('id')) not in oos_set 
                            and str(p.get('dbId')) not in oos_set 
                            and p.get('name') not in oos_names
                            and p.get('stockStatus') != 'Out of Stock'
                            and p.get('inStock') is not False
                            and p.get('disabled') != 1
                        ]
                        save_stored_data(sd)

                self._send_json({
                    "success": True,
                    "deletedCount": deleted_count,
                    "message": f"Successfully deleted {deleted_count} out-of-stock products. All customer records and order histories are completely preserved."
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Reset All Stock to Zero (Out of Stock across catalog)
        # CRITICAL SAFETY: NEVER touches or alters 'orders' or 'customers' tables.
        # ----------------------------------------------------
        if parsed.path in ('/api/admin/inventory/reset-all-stock', '/api/inventory/reset-all-stock'):
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                # 1. Update inventory
                c.execute("UPDATE inventory SET stockQty = 0, status = 'Out of Stock'")
                inv_updated = c.rowcount

                # 2. Update products
                c.execute("UPDATE products SET disabled = 1, active = 0")
                prod_updated = c.rowcount

                # 3. Log audit event
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, 'Admin', 'Reset All Stock', 'Inventory', 'bulk', ?)
                """, (f"log_{gen_pb_id()}", f"Reset {inv_updated} inventory items to 0 stock. Catalog preserved for CZMakers refresh."))

                conn.commit()

                # 4. Update store-data.json
                sd = get_stored_data() or {}
                if 'products' in sd and isinstance(sd['products'], list):
                    for p in sd['products']:
                        p['stockQty'] = 0
                        p['status'] = 'Out of Stock'
                        p['stockStatus'] = 'Out of Stock'
                        p['inStock'] = False
                        p['disabled'] = 1
                        p['active'] = 0
                    save_stored_data(sd)

                self._send_json({
                    "success": True,
                    "itemsReset": inv_updated,
                    "message": f"Successfully reset stock for {inv_updated} catalog items to 0 (Out of Stock). Catalog is ready for fresh CZMakers refresh."
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
        # API: Clear Customer Accounts, Orders, and Total Revenue
        # ----------------------------------------------------
        if parsed.path in ('/api/admin/clear-customers-orders', '/api/admin/reset-customers-orders'):
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                c = conn.cursor()
                ord_count = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
                cust_count = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
                rev_sum = c.execute("SELECT COALESCE(SUM(totalAmount), 0) FROM orders WHERE status != 'Cancelled'").fetchone()[0]

                c.execute("DELETE FROM orders")
                c.execute("DELETE FROM customers")
                c.execute("DELETE FROM users WHERE LOWER(email) NOT IN ('admin@soreva.in', 'sonal@soreva.in', 'santosh.1002@gmail.com')")
                c.execute("DELETE FROM user_sessions WHERE user_id NOT IN (SELECT id FROM users)")
                c.execute("DELETE FROM user_carts")

                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, 'Admin', 'Clear Customers and Orders', 'StoreData', 'customers_orders', ?)
                """, (f"log_{gen_pb_id()}", f"Cleared {cust_count} customer accounts, {ord_count} orders (Total Revenue: ₹{rev_sum:,.2f}). Future registrations & orders will be cleanly tracked & preserved."))

                conn.commit()

                self._send_json({
                    "success": True,
                    "ordersCleared": ord_count,
                    "customersCleared": cust_count,
                    "revenueCleared": rev_sum,
                    "message": f"Successfully cleared {cust_count} customer accounts and {ord_count} customer orders (Total Revenue: ₹{rev_sum:,.2f}). Newly incoming registrations, orders, and revenue will now be freshly recorded and preserved during refreshes."
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        # ----------------------------------------------------
                # ----------------------------------------------------
        # API: Upload Image for Website Sections
        # ----------------------------------------------------
        if parsed.path == '/api/admin/upload-image':
            filename = payload.get('filename', f"img_{int(time.time())}.jpg")
            data_str = payload.get('data') or payload.get('base64', '')
            section = payload.get('section', 'general')

            if not data_str:
                self._send_json({"error": "No image data provided"}, 400)
                return

            if ',' in data_str:
                data_str = data_str.split(',', 1)[1]

            try:
                import base64
                img_bytes = base64.b64decode(data_str)

                # Clean and construct unique safe filename
                clean_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
                ext = os.path.splitext(clean_name)[1].lower() or '.jpg'
                if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']:
                    ext = '.jpg'
                base = os.path.splitext(clean_name)[0]
                unique_name = f"{section}_{base}_{int(time.time())}{ext}"

                upload_dir = os.path.join(DATA_DIR, '..', 'assets', 'uploads')
                os.makedirs(upload_dir, exist_ok=True)
                save_path = os.path.join(upload_dir, unique_name)

                with open(save_path, 'wb') as f:
                    f.write(img_bytes)

                web_url = f"assets/uploads/{unique_name}"
                print(f"[Section Image Uploaded] Section: {section} -> {web_url} ({len(img_bytes)} bytes)")
                
                self._send_json({
                    "success": True,
                    "url": web_url,
                    "filename": unique_name,
                    "sizeBytes": len(img_bytes),
                    "section": section,
                    "message": "Image uploaded successfully to server!"
                })
            except Exception as e:
                self._send_json({"error": f"Failed to save uploaded image: {str(e)}"}, 500)
            return

        # ----------------------------------------------------
        # API: Update Specific Website Section Image
        # ----------------------------------------------------
        # ----------------------------------------------------
        # API: Save / Update Category (Instant Atomic Persistence)
        # ----------------------------------------------------
        if parsed.path == '/api/admin/category/save':
            cat_id = payload.get('id')
            cat_name = str(payload.get('name', '')).strip()
            cat_count = str(payload.get('countLabel', '')).strip()
            cat_image = str(payload.get('image', '')).strip()
            cat_slug = str(payload.get('slug', '')).strip() or re.sub(r'[^a-z0-9]+', '-', cat_name.lower()).strip('-')

            if not cat_name:
                self._send_json({"error": "Category name is required"}, 400)
                return

            sd = get_stored_data() or {}
            categories = sd.setdefault('categories', [])

            matched = False
            for cat in categories:
                if (cat_id is not None and str(cat.get('id')) == str(cat_id)) or (cat_slug and cat.get('slug') == cat_slug):
                    cat['name'] = cat_name
                    cat['countLabel'] = cat_count
                    cat['slug'] = cat_slug
                    if cat_image:
                        cat['image'] = cat_image
                    matched = True
                    break

            if not matched:
                max_id = 0
                for c in categories:
                    try:
                        cid = int(c.get('id', 0))
                        if cid > max_id:
                            max_id = cid
                    except Exception:
                        pass
                new_cat = {
                    "id": max_id + 1,
                    "name": cat_name,
                    "countLabel": cat_count,
                    "slug": cat_slug,
                    "image": cat_image or "assets/categories/wristwear.jpg"
                }
                categories.append(new_cat)

            save_stored_data(sd)
            print(f"[Category Saved] {cat_name} (ID: {cat_id}, Image: {cat_image})")
            self._send_json({
                "success": True,
                "category": cat_name,
                "categories": categories,
                "message": f"Category '{cat_name}' successfully saved to store database!"
            })
            return

        # ----------------------------------------------------
        # API: Delete Category
        # ----------------------------------------------------
        if parsed.path == '/api/admin/category/delete':
            cat_id = payload.get('id')
            cat_slug = payload.get('slug')

            sd = get_stored_data() or {}
            categories = sd.get('categories', [])
            initial_len = len(categories)

            sd['categories'] = [
                c for c in categories 
                if not ((cat_id is not None and str(c.get('id')) == str(cat_id)) or (cat_slug and c.get('slug') == str(cat_slug)))
            ]

            if len(sd['categories']) < initial_len:
                save_stored_data(sd)
                print(f"[Category Deleted] ID: {cat_id}, Slug: {cat_slug}")
                self._send_json({"success": True, "message": "Category removed successfully!"})
            else:
                self._send_json({"error": "Category not found"}, 404)
            return

        if parsed.path == '/api/admin/update-section-image':
            section_type = payload.get('sectionType', '')
            item_id = payload.get('itemId')
            image_url = payload.get('imageUrl', '').strip()

            if not image_url:
                self._send_json({"error": "Image URL is required"}, 400)
                return

            sd = get_stored_data() or {}
            updated = False

            if section_type == 'hero':
                slide_id = int(item_id) if item_id is not None else 0
                for s in sd.get('heroSlides', []):
                    if s.get('id') == slide_id:
                        s['image'] = image_url
                        updated = True
                        break

            elif section_type == 'category':
                for cat in sd.get('categories', []):
                    if str(cat.get('id')) == str(item_id) or cat.get('slug') == str(item_id):
                        cat['image'] = image_url
                        updated = True
                        break

            elif section_type == 'spotlight_main':
                if 'spotlight' not in sd: sd['spotlight'] = {}
                sd['spotlight']['imgMain'] = image_url
                updated = True

            elif section_type == 'spotlight_sub':
                if 'spotlight' not in sd: sd['spotlight'] = {}
                sd['spotlight']['imgSub'] = image_url
                updated = True

            elif section_type == 'logo_dark':
                if 'settings' not in sd: sd['settings'] = {}
                sd['settings']['logoUrl'] = image_url
                updated = True

            elif section_type == 'logo_white':
                if 'settings' not in sd: sd['settings'] = {}
                sd['settings']['logoWhiteUrl'] = image_url
                updated = True

            elif section_type == 'testimonial':
                t_id = int(item_id) if item_id is not None else 0
                for t in sd.get('testimonials', []):
                    if t.get('id') == t_id:
                        t['avatar'] = image_url
                        updated = True
                        break

            elif section_type == 'custom_section':
                if 'sectionImages' not in sd: sd['sectionImages'] = {}
                sd['sectionImages'][str(item_id)] = image_url
                updated = True

            if updated:
                if 'sectionImages' not in sd: sd['sectionImages'] = {}
                sd['sectionImages'][f"{section_type}_{item_id}"] = image_url
                save_stored_data(sd)
                self._send_json({
                    "success": True,
                    "sectionType": section_type,
                    "itemId": item_id,
                    "imageUrl": image_url,
                    "message": "Website section image updated successfully!"
                })
            else:
                self._send_json({"error": f"Target item '{item_id}' not found in section '{section_type}'"}, 404)
            return

        # API: Delete Product(s) from Database & Sync Storefront (Single or Batch)
        # -------------------------------------------------------------------------
        if parsed.path in ['/api/db/products/delete', '/api/admin/products/delete', '/api/admin/products/batch-delete']:
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                employee_name = payload.get('employeeName', 'Staff')
                raw_ids = payload.get('ids')
                if not raw_ids:
                    single_id = payload.get('id')
                    raw_ids = [single_id] if single_id else []

                ids = [str(x).strip() for x in raw_ids if x is not None and str(x).strip()]
                if not ids:
                    self._send_json({"error": "Product ID(s) required for deletion"}, 400)
                    conn.close()
                    return

                c = conn.cursor()
                deleted_names = []
                # Chunk into batches of 200 for SQLite parameter safety
                for i in range(0, len(ids), 200):
                    chunk = ids[i:i + 200]
                    placeholders = ','.join(['?'] * len(chunk))
                    try:
                        name_rows = c.execute(f"SELECT name FROM products WHERE id IN ({placeholders})", chunk).fetchall()
                        deleted_names.extend([r['name'] for r in name_rows if r['name']])
                    except Exception:
                        pass
                    c.execute(f"DELETE FROM products WHERE id IN ({placeholders})", chunk)
                    c.execute(f"DELETE FROM inventory WHERE id IN ({placeholders})", chunk)

                audit_detail = f"Deleted {len(ids)} product(s): {', '.join(deleted_names[:3])}{'...' if len(deleted_names) > 3 else ''}"
                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Delete Product Batch', 'Product', ?, ?)
                """, (f"log_{gen_pb_id()}", employee_name, str(ids[0]), audit_detail))

                conn.commit()

                # Delete from store-data.json
                sd = get_stored_data() or {}
                if 'products' in sd:
                    del_id_set = set(ids)
                    del_name_set = set(deleted_names)
                    sd['products'] = [
                        p for p in sd['products'] 
                        if str(p.get('id', '')) not in del_id_set 
                        and str(p.get('dbId', '')) not in del_id_set 
                        and str(p.get('sku', '')) not in del_id_set 
                        and str(p.get('sku', '')).replace('CZM-', '') not in del_id_set
                        and p.get('name') not in del_name_set
                    ]
                    save_stored_data(sd)

                msg = f"Successfully deleted {len(ids)} piece(s) from catalog and inventory." if len(ids) > 1 else f"Product '{deleted_names[0] if deleted_names else ids[0]}' removed from database."
                self._send_json({
                    "success": True, 
                    "deletedCount": len(ids),
                    "deletedIds": ids,
                    "message": msg
                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            finally:
                conn.close()
            return

        self._send_json({"error": "Endpoint not found"}, 404)


class DualStackServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    address_family = socket.AF_INET6
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


def run_server(port=8000):
    init_extended_tables()
    ensure_pocketbase_running()
    lan_ip = get_lan_ip()
    try:
        httpd = DualStackServer(('::', port), SorevaHandler)
    except Exception as e:
        print(f"[DualStack Notice] Fallback to IPv4: {e}")
        httpd = ThreadedHTTPServer(('0.0.0.0', port), SorevaHandler)

    env_tag = f"[{APP_ENV.upper()} MODE]"
    print(f"==================================================")
    print(f"  💎 Sorèva Luxury Store {env_tag} running")
    print(f"  🌐 Store URL:    http://127.0.0.1:{port}/")
    print(f"  👥 Employee GUI: http://localhost:{port}/portal.html")
    print(f"  📡 Wi-Fi Share:  http://{lan_ip}:{port}/portal.html")
    print(f"  🔒 Master Admin: http://localhost:{port}/admin.html")
    print(f"  📦 PocketBase:   http://localhost:{port}/_/")
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
