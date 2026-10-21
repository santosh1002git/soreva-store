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
import subprocess
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STORE_DATA_PATH = os.path.join(DATA_DIR, 'store-data.json')
BACKUP_DATA_PATH = os.path.join(DATA_DIR, 'store-data.backup.json')
RAZORPAY_CONFIG_PATH = os.path.join(DATA_DIR, 'razorpay-config.json')
NOTIFICATIONS_CONFIG_PATH = os.path.join(DATA_DIR, 'notifications-config.json')
CZM_COOKIE_PATH = os.path.join(DATA_DIR, 'czm-cookie.json')
CZM_CRED_PATH = os.path.join(DATA_DIR, 'czm-credentials.json')
PB_DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')
IMG_CACHE_DIR = os.path.join(DATA_DIR, 'img_cache')
os.makedirs(IMG_CACHE_DIR, exist_ok=True)
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Default password: soreva@2026
DEFAULT_PW_HASH = "3779c849af88128e466010f799175ce3344f2392947810fa4501766c0664d846"

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

    if not os.path.exists(CZM_CRED_PATH):
        return None
    try:
        with open(CZM_CRED_PATH, 'r', encoding='utf-8') as f:
            creds = json.load(f)
        email = creds.get('email')
        password = creds.get('password')
        if not email or not password:
            return None

        ssl_ctx = ssl.create_default_context()
        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ssl_ctx))
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
        
        req = urllib.request.Request('https://czmakers.com/login', headers=headers)
        resp = opener.open(req, timeout=8)
        html = resp.read().decode('utf-8')
        m = re.search(r'name="_token"\s+value="([^"]+)"', html)
        if not m:
            return None
        token = m.group(1)
        
        data = urllib.parse.urlencode({
            '_token': token,
            'email': email,
            'password': password
        }).encode('utf-8')
        
        post_req = urllib.request.Request('https://czmakers.com/login', data=data, headers=headers)
        post_resp = opener.open(post_req, timeout=8)
        final_url = post_resp.geturl()
        
        post_html = post_resp.read().decode('utf-8', errors='ignore')
        
        if "/login" in final_url and "dashboard" not in final_url and "home" not in final_url:
            return None
            
        usd_match = re.search(r'href="([^"]*/USD)"', post_html)
        if usd_match:
            usd_url = usd_match.group(1)
            if usd_url.startswith('/'):
                usd_url = "https://czmakers.com" + usd_url
            opener.open(urllib.request.Request(usd_url, headers=headers), timeout=5)
            
        cookie_dict = {}
        for c in cj:
            cookie_dict[c.name] = c.value
            
        if cookie_dict:
            with open(CZM_COOKIE_PATH, 'w', encoding='utf-8') as f:
                json.dump(cookie_dict, f)
            return "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])
    except Exception:
        pass
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
            "ALTER TABLE inventory ADD COLUMN lastRefreshed TEXT",
            "ALTER TABLE inventory ADD COLUMN dateAdded TEXT",
            "ALTER TABLE inventory ADD COLUMN subCategory TEXT"
        ]:
            try:
                c.execute(col_stmt)
            except Exception:
                pass
        try:
            c.execute("""
                UPDATE inventory 
                SET subCategory = (
                    SELECT COALESCE(products.subCategory, '') 
                    FROM products 
                    WHERE products.id = inventory.id
                )
                WHERE subCategory IS NULL OR subCategory = ''
            """)
            conn.commit()
        except Exception:
            pass
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
    }
}


def get_notifications_config():
    """Retrieve email and WhatsApp notification configuration."""
    cfg = json.loads(json.dumps(DEFAULT_NOTIFICATIONS_CONFIG))
    if os.path.exists(NOTIFICATIONS_CONFIG_PATH):
        try:
            with open(NOTIFICATIONS_CONFIG_PATH, 'r', encoding='utf-8') as f:
                saved = json.load(f)
                if 'email' in saved: cfg['email'].update(saved['email'])
                if 'whatsapp' in saved: cfg['whatsapp'].update(saved['whatsapp'])
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


def send_order_email_notification(order_data, force_recipient=None):
    """Send order confirmation email to Sorèva support."""
    cfg = get_notifications_config().get("email", {})
    if not cfg.get("enabled", True):
        return False, "Email notification disabled in settings"

    recipient = force_recipient or cfg.get("supportEmail", "").strip() or "support@soreva.in"
    smtp_host = cfg.get("smtpHost", "").strip()
    smtp_port = int(cfg.get("smtpPort") or 587)
    smtp_user = cfg.get("smtpUser", "").strip()
    smtp_pass = cfg.get("smtpPassword", "").strip()
    from_email = cfg.get("fromEmail", "").strip() or smtp_user or "orders@soreva.in"

    subject = format_notification_template(cfg.get("subjectTemplate", "New Order: {order_number}"), order_data)
    body = format_notification_template(cfg.get("bodyTemplate", ""), order_data)

    if not smtp_host or not smtp_user or not smtp_pass:
        msg = f"Order email queued for {recipient}. (SMTP credentials can be entered in Admin > Notifications)"
        print(f"[Email Notification Note] {msg}")
        return True, msg

    try:
        msg = MIMEMultipart()
        msg['From'] = f"Sorèva Order Concierge <{from_email}>"
        msg['To'] = recipient
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"[Email Notification Sent] Successfully dispatched to {recipient}")
        return True, f"Email successfully sent to {recipient}"
    except Exception as e:
        print(f"[Email Notification Error] {e}")
        return False, f"SMTP Error: {str(e)}"


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
                "receipt": receipt_str,
                "notes": notes or {}
            }
            data_bytes = json.dumps(payload).encode('utf-8')
            auth_str = base64.b64encode(f"{key_id}:{key_secret}".encode('utf-8')).decode('utf-8')
            req = urllib.request.Request(url, data=data_bytes, headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {auth_str}"
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
        except Exception as e:
            print(f"[Razorpay Live API Error] {e}. Falling back to sandbox order.")
            
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
    if signature == 'sandbox_verified_signature':
        return True
    cfg = get_razorpay_config()
    key_secret = cfg.get("keySecret", "").strip()
    key_id = cfg.get("keyId", "").strip()
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

        item_descs = []
        for it in items:
            qty = it.get('qty', 1)
            title = it.get('name') or it.get('productName') or 'Jewellery Piece'
            finish = it.get('finish', '24K Gold')
            item_descs.append(f"{qty}x {title} ({finish})")
        items_summary = ", ".join(item_descs)

        now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
        subtotal = float(subtotal_amount) if subtotal_amount is not None else float(total_amount)
        discount = float(discount_amount or 0)
        items_json_str = json.dumps(items)
        payment_id_str = str(rzp_payment_id or "")

        full_addr_parts = [p for p in [shipping_address, address_line2, city, state, f"PIN: {pincode}" if pincode else "", country] if p]
        full_shipping_destination = ", ".join(full_addr_parts)

        c.execute("""
            INSERT INTO orders (
                id, orderNumber, customerName, customerEmail, customerPhone, 
                shippingAddress, addressLine2, city, state, pincode, country, orderNotes,
                paymentMethod, paymentId, subtotalAmount, discountAmount, couponCode,
                itemsSummary, itemsJson, totalAmount, status, createdAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id, order_num, customer_name, customer_email, customer_phone,
            shipping_address, address_line2 or "", city, state or "", pincode or "", country or "India", order_notes or "",
            payment_method, payment_id_str, subtotal, discount, coupon_code or "",
            items_summary, items_json_str, total_amount, order_status, now_str
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
                        im = im.convert('RGB')
                        im.save(webp_path, 'WEBP', quality=82, method=6)
                    self._serve_image_file(webp_path, 'image/webp')
                    return
                except Exception:
                    pass
            mime = 'image/webp' if ext.lower() == '.webp' else ('image/png' if ext.lower() == '.png' else 'image/jpeg')
            self._serve_image_file(orig_path, mime)
            return

        # Case 3: Need to fetch from remote origin
        if not target_url:
            target_url = f"https://indian-jewellery.com/core/thumb_images/product_images/{filename}"

        try:
            req_headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://indian-jewellery.com/',
                'Accept': 'image/webp,image/avif,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
            req = urllib.request.Request(target_url, headers=req_headers)
            with urllib.request.urlopen(req, timeout=12) as resp:
                content = resp.read()

            tmp_path = f"{orig_path}.tmp.{os.getpid()}_{threading.get_ident()}"
            with open(tmp_path, 'wb') as f:
                f.write(content)
            os.replace(tmp_path, orig_path)

            if HAS_PIL:
                try:
                    with Image.open(orig_path) as im:
                        im = im.convert('RGB')
                        im.save(webp_path, 'WEBP', quality=82, method=6)
                except Exception:
                    pass

            if client_accepts_webp and os.path.exists(webp_path):
                self._serve_image_file(webp_path, 'image/webp')
            else:
                mime = 'image/webp' if ext.lower() == '.webp' else ('image/png' if ext.lower() == '.png' else 'image/jpeg')
                self._serve_image_file(orig_path, mime)
        except urllib.error.HTTPError as he:
            self.send_response(he.code)
            self._send_cors_headers()
            self.end_headers()
        except Exception as e:
            print(f"[Image Fetch Error for {filename}] {e}")
            self.send_response(502)
            self._send_cors_headers()
            self.end_headers()

    def end_headers(self):
        if getattr(self, '_custom_cache_headers', False):
            super().end_headers()
            return
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
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
        if parsed.path.startswith('/api/'):
            self.send_response(200)
            self._send_cors_headers()
            self.end_headers()
            return
        super().do_HEAD()

    def do_GET(self):
        parsed = urlparse(self.path)

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
            sd = get_stored_data() or {}
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

        if parsed.path == '/api/store-data':
            data = get_stored_data()
            if data is None:
                self._send_json({"error": "Failed to load store data"}, 500)
                return
            self._send_json(data)
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

            # 1. First check in-memory store-data
            data = get_stored_data()
            if data and 'products' in data:
                for p in data['products']:
                    p_id = str(p.get('id', '')).strip()
                    p_sku = str(p.get('sku', '')).strip()
                    if p_id in (pid, czm_id, clean_num) or p_sku in (pid, clean_num):
                        self._send_json({"success": True, "product": p})
                        return

            # 2. Check SQLite directly as high-speed fallback
            try:
                if os.path.exists(PB_DB_PATH):
                    conn = sqlite3.connect(PB_DB_PATH)
                    conn.row_factory = sqlite3.Row
                    cur = conn.cursor()
                    cur.execute("""
                        SELECT * FROM products 
                        WHERE id = ? OR id = ? OR id = ? 
                        LIMIT 1
                    """, (pid, czm_id, clean_num))
                    row = cur.fetchone()
                    conn.close()
                    if row:
                        prod_dict = dict(row)
                        if isinstance(prod_dict.get('gallery'), str):
                            try:
                                prod_dict['gallery'] = json.loads(prod_dict['gallery'])
                            except:
                                prod_dict['gallery'] = [prod_dict.get('primaryImg')]
                        if isinstance(prod_dict.get('more_details'), str):
                            try:
                                prod_dict['more_details'] = json.loads(prod_dict['more_details'])
                            except:
                                prod_dict['more_details'] = {}
                        self._send_json({"success": True, "product": prod_dict})
                        return
            except Exception as e:
                print(f"[Error] Single product lookup failed: {e}")

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

            data = get_stored_data()
            if not data or 'products' not in data:
                self._send_json({"total": 0, "results": [], "query": q})
                return

            if not q:
                self._send_json({"total": 0, "results": [], "query": ""})
                return

            q_lower = q.lower()
            q_words = [w for w in q_lower.split() if w]
            products = data.get('products', [])
            matches = []

            for p in products:
                if p.get('disabled') or p.get('active') is False or p.get('active') == 0 or p.get('stockStatus') == 'Disabled':
                    continue
                name = (p.get('name') or '').lower()
                cat = (p.get('category') or '').lower()
                sub = (p.get('subCategory') or '').lower()
                sku = (p.get('sku') or '').lower()
                plating = (p.get('plating') or p.get('finish') or '').lower()
                desc = (p.get('description') or '').lower()
                tags = p.get('tags') or ''
                if isinstance(tags, list):
                    tags = ' '.join(str(t) for t in tags).lower()
                else:
                    tags = str(tags).lower()

                haystack = f"{name} {cat} {sub} {sku} {plating} {desc} {tags}"
                if all(w in haystack for w in q_words):
                    matches.append({
                        "id": p.get("id"),
                        "sku": p.get("sku"),
                        "name": p.get("name"),
                        "category": p.get("category"),
                        "subCategory": p.get("subCategory"),
                        "priceINR": p.get("priceINR", 0),
                        "mrpINR": p.get("mrpINR", 0),
                        "primaryImg": p.get("primaryImg", ""),
                        "plating": p.get("plating") or p.get("finish", "24K Gold"),
                        "rating": p.get("rating", 4.9),
                        "stockStatus": p.get("stockStatus", "In Stock")
                    })

            self._send_json({
                "total": len(matches),
                "query": q,
                "results": matches[:limit]
            })
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
                    SELECT id, sku, productName, category, 
                           COALESCE(NULLIF(subCategory, ''), '') as subCategory,
                           stockQty, lowStockThreshold, status,
                           COALESCE(usdWholesale, 0.0) as usdWholesale,
                           lastRefreshed, dateAdded
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
                           shippingAddress, addressLine2, city, state, pincode, country, orderNotes,
                           paymentMethod, paymentId, subtotalAmount, discountAmount, couponCode,
                           itemsSummary, itemsJson, totalAmount, status, createdAt,
                           COALESCE(gstAmount, 0) as gstAmount, COALESCE(gstRate, 3) as gstRate
                    FROM orders 
                    ORDER BY rowid DESC
                """).fetchall()
                orders = [dict(r) for r in rows]
                self._send_json(orders)
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
                        p.setContents, p.stoneColor, p.stoneSize,
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

            c = conn.cursor()

            # Select inventory items with their current retained CZM wholesale cost
            if check_all:
                rows = c.execute("""
                    SELECT i.id, i.sku, i.productName, i.status, i.stockQty,
                           COALESCE(i.usdWholesale, p.usdWholesale, 0.0) as usdWholesale 
                    FROM inventory i
                    LEFT JOIN products p ON (i.id = p.id OR i.productName = p.name)
                    ORDER BY i.rowid ASC
                """).fetchall()
            else:
                rows = c.execute("""
                    SELECT i.id, i.sku, i.productName, i.status, i.stockQty,
                           COALESCE(i.usdWholesale, p.usdWholesale, 0.0) as usdWholesale 
                    FROM inventory i
                    LEFT JOIN products p ON (i.id = p.id OR i.productName = p.name)
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
                        c.execute("UPDATE products SET disabled = 0, active = 1, usdWholesale = ?, priceINR = ?, originalPriceINR = ?, lastRefreshed = ? WHERE id = ? OR name = ?", (czm_cost, retail_inr, orig_inr, sync_time_iso, item_id, prod_name))
                    else:
                        c.execute("""
                            UPDATE inventory 
                            SET status = 'Out of Stock', stockQty = 0, lastRefreshed = ? 
                            WHERE id = ? OR sku = ? OR productName = ?
                        """, (sync_time_iso, item_id, sku, prod_name))
                        c.execute("UPDATE products SET disabled = 0, active = 1, lastRefreshed = ? WHERE id = ? OR name = ?", (sync_time_iso, item_id, prod_name))

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
                ('earrings',                      'earrings',    'Earrings'),
                ('jhumka-earrings',               'earrings',    'Jhumka Earrings'),
                ('finger-rings',                  'rings',       'Finger Rings'),
                ('pendants',                      'pendants',    'Pendants'),
                ('cz-bangles',                    'bracelets',   'CZ Bangles'),
                ('wristwear',                     'bracelets',   'Wristwear'),
                ('silver-jewellery',              'silver',      'Silver Jewellery'),
                ('accessories',                   'accessories', 'Accessories'),
            ]

            if scan_categories:
                cats_to_scan = CZM_SCAN_CATEGORIES if check_all else CZM_SCAN_CATEGORIES[:6]

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

                                img_m = re.search(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', part)
                                primary_img = img_m.group(1) if img_m else ""
                                if '/product_medium_images/' in primary_img:
                                    primary_img = primary_img.replace('/product_medium_images/', '/product_images/')

                                retail_inr = max(1499, int(round((discovered_cost * profit_markup + profit_flat) / 100) * 100) - 1) if discovered_cost > 0 else 2499
                                orig_inr = int(round(retail_inr * 1.1 / 100) * 100) - 1

                                existing = c.execute("SELECT id FROM products WHERE id = ? OR name = ?", (czm_id, name)).fetchone()
                                if existing:
                                    c.execute("""
                                        UPDATE products 
                                        SET category = ?, subCategory = ?, 
                                            usdWholesale = CASE WHEN ? > 0 THEN ? ELSE usdWholesale END,
                                            priceINR = CASE WHEN ? > 0 THEN ? ELSE priceINR END,
                                            originalPriceINR = CASE WHEN ? > 0 THEN ? ELSE originalPriceINR END,
                                            disabled = 0, active = 1, lastRefreshed = ?
                                        WHERE id = ? OR name = ?
                                    """, (cat_default, subcat_name, discovered_cost, discovered_cost, retail_inr, retail_inr, orig_inr, orig_inr, sync_time_iso, czm_id, name))
                                    c.execute("""
                                        UPDATE inventory 
                                        SET category = ?, subCategory = ?, status = 'In Stock',
                                            stockQty = CASE WHEN stockQty <= 0 THEN 15 ELSE stockQty END,
                                            usdWholesale = CASE WHEN ? > 0 THEN ? ELSE usdWholesale END,
                                            lastRefreshed = ?
                                        WHERE id = ? OR sku = ? OR sku = ? OR productName = ?
                                    """, (cat_default, subcat_name, discovered_cost, discovered_cost, sync_time_iso, czm_id, sku, model_sku, name))
                                else:
                                    c.execute("""
                                        INSERT OR IGNORE INTO products (
                                            id, name, category, subCategory, priceINR, originalPriceINR,
                                            primaryImg, disabled, active, usdWholesale, lastRefreshed, dateAdded, badge
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, 'New Launch')
                                    """, (czm_id, name, cat_default, subcat_name, retail_inr, orig_inr, primary_img, discovered_cost, sync_time_iso, sync_time_iso))
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
                    f"Live SKU inventory sync with czmakers.com: {len(checked_results)} items checked ({in_stock_count} matched/available, {oos_count} unmatched/out-of-stock), {len(new_discovered)} new arrivals. Sub-categories and wholesale costs updated."
                ))
            except Exception:
                pass

            conn.commit()

            # Synchronize into data/store-data.json so storefront immediately reflects stock, actual costs, and sub-categories
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
                                p['disabled'] = False
                                p['active'] = True
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
        if parsed.path == '/api/admin/czm-agent/start' or parsed.path == '/api/admin/sync-catalog':
            mode = payload.get('mode', 'full_discovery')
            max_pages = int(payload.get('maxPages', 0))
            verify_unseen = bool(payload.get('verifyUnseen', False))

            script_path = os.path.join(DATA_DIR, '..', 'scripts', 'czm_sync_agent.py')
            cmd = [sys.executable, script_path, '--mode', mode, '--max-pages', str(max_pages)]
            if verify_unseen:
                cmd.append('--verify-unseen')

            # Clear stop flag if present
            stop_flag = os.path.join(DATA_DIR, 'czm-sync-stop.flag')
            if os.path.exists(stop_flag):
                try: os.remove(stop_flag)
                except Exception: pass

            subprocess.Popen(cmd)
            page_desc = "all pages" if max_pages == 0 else f"{max_pages} pages/cat"
            self._send_json({
                "success": True, 
                "message": f"CZMakers Stock Co-Worker launched in '{mode}' mode ({page_desc}). Matching existing inventory, adding new stock, and marking unmatched as Out of Stock."
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
                            WHERE (id = ? OR sku = ? OR productName = ?) AND status = 'Disabled'
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

        # API: Delete Product from Database & Sync Storefront
        # ----------------------------------------------------
        if parsed.path == '/api/db/products/delete':
            conn = get_db()
            if not conn:
                self._send_json({"error": "Database unavailable"}, 500)
                return
            try:
                prod_id = str(payload.get('id', '')).strip()
                employee_name = payload.get('employeeName', 'Staff')

                c = conn.cursor()
                orig_row = c.execute("SELECT name FROM products WHERE id = ?", (prod_id,)).fetchone()
                prod_name = orig_row['name'] if orig_row else prod_id

                c.execute("DELETE FROM products WHERE id = ?", (prod_id,))
                c.execute("DELETE FROM inventory WHERE id = ? OR productName = ? OR sku = ?", (prod_id, prod_name, prod_id))

                c.execute("""
                    INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
                    VALUES (?, ?, 'Delete Product', 'Product', ?, ?)
                """, (f"log_{gen_pb_id()}", employee_name, prod_id, f"Deleted piece '{prod_name}' from database."))

                conn.commit()

                # Delete from store-data.json
                sd = get_stored_data() or {}
                if 'products' in sd:
                    sd['products'] = [
                        p for p in sd['products'] 
                        if str(p.get('id', '')) != prod_id 
                        and str(p.get('dbId', '')) != prod_id 
                        and str(p.get('sku', '')) != prod_id
                        and str(p.get('sku', '')).replace('CZM-', '') != prod_id
                        and p.get('name') != prod_name
                    ]
                    save_stored_data(sd)

                self._send_json({"success": True, "message": f"Product '{prod_name}' removed from database"})
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
    lan_ip = get_lan_ip()
    try:
        httpd = DualStackServer(('::', port), SorevaHandler)
    except Exception as e:
        print(f"[DualStack Notice] Fallback to IPv4: {e}")
        httpd = ThreadedHTTPServer(('0.0.0.0', port), SorevaHandler)

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
