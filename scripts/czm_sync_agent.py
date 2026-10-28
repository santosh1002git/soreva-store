#!/usr/bin/env python3
"""
czm_sync_agent.py - Automated CZMakers Product Catalog & Stock Co-Worker Agent for Sorèva

CRITICAL ISOLATION RULES:
1. EXCLUSIVE TO PRODUCTS & INVENTORY:
   This co-worker agent strictly operates on 'products' and 'inventory' tables, and 'data/store-data.json'.
2. NEVER SYNC OR TOUCH ORDERS OR CUSTOMERS:
   The 'orders' and 'customers' tables in SQLite/PocketBase belong exclusively to Sorèva.
   Under NO circumstances are customer records or orders imported, updated, wiped, or modified.
3. PRODUCT AVAILABILITY & PRICING:
   - Authenticates using stored credentials (sonal.belchada@gmail.com).
   - Scans every stock across all categories and pagination on czmakers.com.
   - Live availability and wholesale cost is extracted directly from CZMakers product listing cards.
   - Retail price is calculated using the configured profit markup (default 2.2x), minimum retail ₹1,499.
   - Missing/unavailable pieces are cleanly updated to 'Out of Stock' (or deleted if --remove-missing is enabled).
   - Historical orders and customer accounts remain 100% intact and untouched.
"""

import sqlite3
import json
import urllib.request
import urllib.error
import ssl
import time
import os
import sys
import re
import argparse
import http.cookiejar
import urllib.parse
import threading
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# ─── Paths ────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPT_DIR, '..')
DB_PATH = os.path.join(PROJECT_DIR, 'pb', 'pb_data', 'data.db')
STORE_DATA_PATH = os.path.join(PROJECT_DIR, 'data', 'store-data.json')
CZM_COOKIE_PATH = os.path.join(PROJECT_DIR, 'data', 'czm-cookie.json')
CZM_CRED_PATH = os.path.join(PROJECT_DIR, 'data', 'czm-credentials.json')
STATUS_PATH = os.path.join(PROJECT_DIR, 'data', 'czm-sync-status.json')
STOP_FLAG_PATH = os.path.join(PROJECT_DIR, 'data', 'czm-sync-stop.flag')

BASE_URL = "https://czmakers.com"
PAGE_DELAY = 0.75
AVAIL_CHECK_WORKERS = 3
_AUTH_LOCK = threading.Lock()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Upgrade-Insecure-Requests': '1',
}

# ─── Active CZMakers Category Catalog (Excluding Silver & Accessories) ──
ALL_CZM_CATEGORIES = [
    ('necklaces',                     'necklace',    'Necklaces'),
    ('choker-necklaces',              'necklace',    'Choker Necklaces'),
    ('traditional-necklaces',         'necklace',    'Traditional Necklaces'),
    ('bridal-necklaces',              'necklace',    'Bridal Necklaces'),
    ('classic-necklace',              'necklace',    'Classic Necklaces'),
    ('collar-necklace',               'necklace',    'Collar Necklaces'),
    ('mangalsutra',                   'necklace',    'Mangalsutra'),
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
    ('aurous-collection',             'necklace',    'Aurous Collection'),
]

# Strict bypass categories: never crawled, never inserted, purged from DB/inventory
BYPASS_CATEGORIES = {
    'silver', 'accessories', 'silver-jewellery', 'cz-accessories', 
    'cz-brooch', 'mangtika', '925-sterling-silver-earrings', 
    '925-sterling-finger-rings', '925-sterling-silver-pendants'
}


# ─── Global State Logger ──────────────────────────────────────────────
class AgentStatusTracker:
    def __init__(self, mode="full_discovery", user_email="sonal.belchada@gmail.com"):
        self.lock = threading.Lock()
        self.mode = mode
        self.status = "running"
        self.step = "Initializing agent..."
        self.current_category = ""
        self.current_page = 0
        self.total_categories = len(ALL_CZM_CATEGORIES)
        self.user_email = user_email
        self.stats = {
            "authenticatedUser": user_email,
            "scanned": 0,
            "updated": 0,
            "added": 0,
            "inStock": 0,
            "outOfStock": 0,
            "preservedOrders": 0,
            "preservedCustomers": 0,
        }
        self.started_at = datetime.utcnow().isoformat() + "Z"
        self.updated_at = self.started_at
        self.completed_at = None
        self.start_time = time.time()
        self.logs = []
        self._write_status()

    def log(self, message):
        with self.lock:
            timestamp = datetime.now().strftime("%H:%M:%S")
            entry = f"[{timestamp}] {message}"
            print(entry, flush=True)
            self.logs.append(entry)
            if len(self.logs) > 60:
                self.logs = self.logs[-60:]
            self.step = message
            self._write_status()

    def update_progress(self, cat="", page=0, **kwargs):
        with self.lock:
            if cat:
                self.current_category = cat
            if page:
                self.current_page = page
            for k, v in kwargs.items():
                if k in self.stats:
                    self.stats[k] = v
            self._write_status()

    def finish(self, status="completed", message=""):
        with self.lock:
            self.status = status
            self.completed_at = datetime.utcnow().isoformat() + "Z"
            if message:
                timestamp = datetime.now().strftime("%H:%M:%S")
                entry = f"[{timestamp}] {message}"
                print(entry, flush=True)
                self.logs.append(entry)
                if len(self.logs) > 60:
                    self.logs = self.logs[-60:]
                self.step = message
            self._write_status()

    def _write_status(self):
        self.updated_at = datetime.utcnow().isoformat() + "Z"
        data = {
            "status": self.status,
            "mode": self.mode,
            "step": self.step,
            "currentCategory": self.current_category,
            "currentPage": self.current_page,
            "totalCategories": self.total_categories,
            "authenticatedUser": self.user_email,
            "stats": self.stats,
            "startedAt": self.started_at,
            "updatedAt": self.updated_at,
            "completedAt": self.completed_at,
            "durationSeconds": round(time.time() - self.start_time, 1),
            "recentLogs": self.logs[-40:],
        }
        try:
            tmp_path = STATUS_PATH + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            os.replace(tmp_path, STATUS_PATH)
        except Exception:
            pass


def check_stop_requested():
    """Check if the admin requested the co-worker agent to stop."""
    if os.path.exists(STOP_FLAG_PATH):
        try:
            os.remove(STOP_FLAG_PATH)
        except Exception:
            pass
        return True
    return False


# ─── Profit & Pricing Configuration ──────────────────────────────────
def get_profit_config():
    """Retrieve pricing markup & flat fee from store-data.json."""
    try:
        if os.path.exists(STORE_DATA_PATH):
            with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
                store_data = json.load(f)
                settings = store_data.get('settings', {})
                return float(settings.get('profitMarkup', 2.2)), int(settings.get('profitFlat', 0))
    except Exception:
        pass
    return 2.2, 0


def normalize_czm_plating(raw_str):
    """Normalize raw plating string or text to canonical Sorèva finishes."""
    if not raw_str:
        return 'gold'
    s = str(raw_str).strip().lower()
    if any(k in s for k in ['rose gold', 'rosegold', 'pink gold']):
        return 'rosegold'
    if any(k in s for k in ['two tone', 'two-tone', 'dual tone', 'two_tone', 'dual-tone']):
        return 'two-tone'
    if any(k in s for k in ['full silver', 'rhodium', 'silver', '925', 'sterling', 'white gold']):
        return 'silver'
    if any(k in s for k in ['oxidised', 'oxidized', 'black', 'dark silver']):
        return 'oxidised'
    if any(k in s for k in ['antique', 'mehndi', 'mehendi', 'matte gold']):
        return 'antique'
    if any(k in s for k in ['golden', 'yellow gold', 'gold', '24k', '22k', '18k']):
        return 'gold'
    return 'gold'


def calculate_retail_pricing(wholesale_inr, profit_markup=2.2, profit_flat=0):
    """
    Compute luxury retail price and original strikethrough price from CZM wholesale INR.
    - Min retail floor: ₹1,499
    - Retail formula: round to nearest 100 minus 1
    - Original strikethrough: ~1.1x retail, round to nearest 100 minus 1
    """
    wholesale = float(wholesale_inr)
    retail = max(1499, int(round((wholesale * profit_markup + profit_flat) / 100) * 100) - 1)
    orig = int(round(retail * 1.1 / 100) * 100) - 1
    return retail, orig


# ─── CZMakers Authentication ─────────────────────────────────────────
def get_stored_credentials():
    """Load credentials from czm-credentials.json or store-data.json."""
    email = "sonal.belchada@gmail.com"
    password = ""

    if os.path.exists(CZM_CRED_PATH):
        try:
            with open(CZM_CRED_PATH, 'r', encoding='utf-8') as f:
                creds = json.load(f)
                email = creds.get('email', email)
                password = creds.get('password', password)
        except Exception:
            pass

    if not password and os.path.exists(STORE_DATA_PATH):
        try:
            with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
                sd = json.load(f)
                creds = sd.get('settings', {}).get('czmCredentials', {})
                email = creds.get('email', email)
                password = creds.get('password', password)
        except Exception:
            pass

    return email, password


_GLOBAL_OPENER = None
_GLOBAL_CJ = http.cookiejar.CookieJar()


def get_czm_proxies():
    """Detect if local Privoxy/Tor proxy is available on port 8118, or from environment."""
    env_proxy = os.environ.get('CZM_PROXY') or os.environ.get('HTTP_PROXY') or os.environ.get('http_proxy')
    if env_proxy:
        return {'http': env_proxy, 'https': env_proxy}
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        if s.connect_ex(('127.0.0.1', 8118)) == 0:
            s.close()
            return {'http': 'http://127.0.0.1:8118', 'https': 'http://127.0.0.1:8118'}
        s.close()
    except Exception:
        pass
    return {}


def get_czm_opener(ssl_ctx=None):
    """Returns a unified urllib opener configured with proxy, cookie jar, and SSL context."""
    global _GLOBAL_OPENER, _GLOBAL_CJ
    if _GLOBAL_OPENER is None:
        if ssl_ctx is None:
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
        proxies = get_czm_proxies()
        handlers = [
            urllib.request.ProxyHandler(proxies),
            urllib.request.HTTPCookieProcessor(_GLOBAL_CJ),
            urllib.request.HTTPSHandler(context=ssl_ctx)
        ]
        _GLOBAL_OPENER = urllib.request.build_opener(*handlers)
    return _GLOBAL_OPENER


def solve_czm_antibot_challenge(html, opener, headers):
    """
    Solves the cPanel / Bluehost anti-bot JavaScript challenge.
    Executes the challenge script in Node.js with the necessary browser globals,
    then submits the verification request to get clearance cookie (wssplashchk).
    Returns the HTML content after verification (which contains the real login form or page).
    """
    if "One moment, please" not in html and "wsidchk" not in html and "a0v" not in html:
        return html

    solver_js = """
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf-8');
const scripts = html.match(/<script>([\\s\\S]*?)<\\/script>/gi) || [];
let challengeCode = '';
for (const s of scripts) {
  const code = s.replace(/<\\/?script>/gi, '');
  if (code.includes('wsidchk') || code.includes('a0v')) {
    challengeCode = code;
    break;
  }
}
let formAction = '', formFields = {}, formMethod = 'GET';
const mockForm = {
  set action(val) { formAction = val; },
  set method(val) { formMethod = val; },
  set id(val) {},
  appendChild(child) { if (child && child.name) formFields[child.name] = child.value || ''; },
  submit() {}
};
const mockDoc = {
  getElementById(id) { return { appendChild() {} }; },
  createElement(tag) { if (tag === 'form') return mockForm; return { name: '', value: '', id: '', appendChild() {} }; },
  addEventListener(evt, fn) { try { fn(); } catch(e){} }
};
const mockWin = {
  document: mockDoc,
  navigator: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    appVersion: '5.0 (Macintosh)',
    language: 'en-US',
    languages: ['en-US', 'en'],
    plugins: { length: 5, 0: { __proto__: Object.prototype } },
    mimeTypes: { length: 5, 0: { __proto__: Object.prototype } }
  },
  addEventListener(evt, fn) { try { fn(); } catch(e){} },
  location: { reload() {} },
  outerHeight: 1080, outerWidth: 1920
};
mockWin.navigator.plugins[0].__proto__ = Object.prototype;
mockWin.navigator.mimeTypes[0].__proto__ = Object.prototype;
global.window = mockWin;
global.document = mockDoc;
global.navigator = mockWin.navigator;
global.PluginArray = { prototype: mockWin.navigator.plugins[0].__proto__ };
global.Plugin = { prototype: mockWin.navigator.plugins[0].__proto__ };
global.MimeTypeArray = { prototype: mockWin.navigator.mimeTypes[0].__proto__ };
global.MimeType = { prototype: mockWin.navigator.mimeTypes[0].__proto__ };
global.setTimeout = function(fn) { try { fn(); } catch(e){} };
global.URLSearchParams = function() {
  this.append = function(k, v) { formFields[k] = v; };
  this.toString = function() { return ''; };
};
global.XMLHttpRequest = function() {
  this.open = function(method, url) { formAction = url; };
  this.send = function() {};
};
try { eval(challengeCode); } catch(e) { console.error('Eval error:', e.message); }
console.log(JSON.stringify({ method: formMethod, action: formAction, fields: formFields }));
"""
    tmp_html = None
    tmp_js = None
    try:
        with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f_html:
            f_html.write(html)
            tmp_html = f_html.name
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f_js:
            f_js.write(solver_js)
            tmp_js = f_js.name

        res = subprocess.run(["node", tmp_js, tmp_html], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        solution = json.loads(res.stdout)
        action = solution.get("action", "")
        fields = solution.get("fields", {})
        if action and fields:
            query_str = urllib.parse.urlencode(fields)
            verify_url = f"{BASE_URL}{action}?{query_str}"
            clean_headers = {k: v for k, v in headers.items() if k.lower() != 'cookie'}
            vreq = urllib.request.Request(verify_url, headers=clean_headers)
            vresp = opener.open(vreq, timeout=25)
            verified_html = vresp.read().decode("utf-8", errors="ignore")
            return verified_html
    except Exception as e:
        print(f"[Anti-Bot Challenge Solver] Error: {e}", flush=True)
    finally:
        for p in (tmp_html, tmp_js):
            if p and os.path.exists(p):
                try: os.remove(p)
                except Exception: pass
    return html


def perform_czm_login(ssl_ctx, retries=2, tracker=None):
    """Login to CZMakers and return (cookie_str, email). Uses clean headers to prevent 419 CSRF mismatch."""
    email, password = get_stored_credentials()
    if not email or not password:
        return None, email

    clean_headers = {k: v for k, v in HEADERS.items() if k.lower() != 'cookie'}
    opener = get_czm_opener(ssl_ctx)

    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(f'{BASE_URL}/login', headers=clean_headers)
            resp = opener.open(req, timeout=25)
            html = resp.read().decode('utf-8', errors='ignore')

            if "One moment, please" in html or "wsidchk" in html:
                if tracker:
                    tracker.log("⚡ Anti-bot challenge detected on CZMakers login. Solving verification...")
                html = solve_czm_antibot_challenge(html, opener, clean_headers)

            m = re.search(r'name="_token"\s+value="([^"]+)"', html)
            if not m:
                if attempt < retries:
                    time.sleep(1.0)
                    continue
                return None, email
            token = m.group(1)

            data = urllib.parse.urlencode({'_token': token, 'email': email, 'password': password}).encode('utf-8')
            post_req = urllib.request.Request(f'{BASE_URL}/login', data=data, headers=clean_headers)
            post_resp = opener.open(post_req, timeout=25)

            if "/login" in post_resp.geturl() and "dashboard" not in post_resp.geturl():
                if attempt < retries:
                    time.sleep(1.0)
                    continue
                return None, email

            # Try to switch session currency to INR
            try:
                curr_req = urllib.request.Request(f'{BASE_URL}/set-session-currency/1/INR', headers=clean_headers)
                opener.open(curr_req, timeout=10)
            except Exception:
                pass

            cookie_dict = {c.name: c.value for c in _GLOBAL_CJ}
            if cookie_dict and any('session' in k.lower() or 'xsrf' in k.lower() or 'splash' in k.lower() for k in cookie_dict.keys()):
                with open(CZM_COOKIE_PATH, 'w', encoding='utf-8') as f:
                    json.dump(cookie_dict, f)
                cookie_str = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])
                HEADERS['Cookie'] = cookie_str
                return cookie_str, email
        except Exception as e:
            if attempt < retries:
                time.sleep(1.5)
            else:
                print(f"[CZM Login Warning] Authentication attempt failed: {e}", flush=True)

    return None, email


def setup_auth_headers(ssl_ctx, tracker=None):
    """Ensure HEADERS has an active CZMakers session cookie."""
    fresh_cookie, email = perform_czm_login(ssl_ctx, tracker=tracker)
    if fresh_cookie:
        HEADERS['Cookie'] = fresh_cookie
        return True, email

    # Only if fresh login failed, try cached cookie as emergency fallback, but test it first!
    if os.path.exists(CZM_COOKIE_PATH):
        try:
            with open(CZM_COOKIE_PATH, 'r', encoding='utf-8') as f:
                cookie_dict = json.load(f)
            cookie_str = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])
            if cookie_str:
                opener = get_czm_opener(ssl_ctx)
                test_req = urllib.request.Request(f'{BASE_URL}/category/necklaces?page=1', headers={
                    'User-Agent': HEADERS.get('User-Agent', ''),
                    'Cookie': cookie_str
                })
                with opener.open(test_req, timeout=15) as test_resp:
                    if "/login" not in test_resp.geturl() and test_resp.status == 200:
                        HEADERS['Cookie'] = cookie_str
                        return True, email
        except Exception:
            pass

    return False, email


# ─── Safety Check: Orders & Customers Isolation ──────────────────────
def verify_customer_order_isolation(conn):
    """
    Hard safety checkpoint: counts customer records and orders.
    Must never change during any product sync operation.
    """
    c = conn.cursor()
    ord_count = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    cust_count = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    return ord_count, cust_count


# ─── Category Card Parser (Accurate 1:1 Matching) ───────────────────
def parse_category_cards(html, cat_slug, cat_default, subcat_default, profit_markup=2.2, profit_flat=0):
    """
    Parses CZMakers category listing HTML.
    Accurately splits cards by the `product_list` container so that
    data-model, data-price, PID, title, and images are perfectly paired.
    """
    if not html or cat_default.lower() in BYPASS_CATEGORIES or cat_slug.lower() in BYPASS_CATEGORIES:
        return []

    # Split HTML by each product card container
    parts = re.split(r'(?=<div[^>]+class=[\"\'][^\"\']*product_list)', html)
    products = []

    for part in parts:
        if 'data-model=' not in part or 'data-price=' not in part:
            continue

        # Extract SKU from data-model
        dm = re.search(r'data-model=[\"\']([^\"\']+)[\"\']', part)
        if not dm:
            continue
        model_sku = dm.group(1).strip()

        # Extract wholesale INR price from card (or data-price * USD-to-INR conversion)
        dp = re.search(r'data-price=[\"\']([0-9.]+)[\"\']', part)
        try:
            raw_price = float(dp.group(1)) if dp else 0.0
        except ValueError:
            raw_price = 0.0

        # Check if card has explicit INR price display (e.g. ₹ 1,736)
        inr_m = re.search(r'(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)', part, re.I)
        if inr_m:
            try:
                wholesale_inr = float(inr_m.group(1).replace(',', ''))
            except ValueError:
                wholesale_inr = 0.0
        elif raw_price > 0:
            # If raw_price is in USD range (< 200), convert to INR using standard exchange rate (85.0)
            if raw_price < 200:
                wholesale_inr = round(raw_price * 85.0, 2)
            else:
                wholesale_inr = round(raw_price, 2)
        else:
            wholesale_inr = 0.0

        # Check if the card explicitly says Out of Stock, Sold Out, Unavailable or has 0 stock/price
        part_lower = part.lower()
        is_card_oos = bool(re.search(r'\b(out\s*of\s*stock|sold\s*out|unavailable|not\s*in\s*stock|not\s*available|stock\s*:\s*0|qty\s*:\s*0)\b', part_lower))
        if wholesale_inr <= 0:
            is_card_oos = True

        # Extract PID and Slug from product link (supports with or without trailing slug)
        pid_m = re.search(r'product/(\d+)(?:/([^\"\'>\s]+))?', part)
        if not pid_m:
            continue
        pid = pid_m.group(1)
        slug = pid_m.group(2) or ''

        # Extract Title
        title_m = re.search(r'class=[\"\']product_titles[\"\'][^>]*>[\s\S]*?<a[^>]*>([^<]+)</a>', part)
        if title_m:
            title = title_m.group(1).strip()
        elif slug:
            title = slug.replace('___', ' | ').replace('_', ' ').strip()
        else:
            title = f"{subcat_default} - Model {model_sku}"
        title = title.replace('&amp;', '&').replace('&quot;', '"').replace('&#039;', "'")
        title = re.sub(r'[\s_]+', ' ', title).strip()

        # Extract primary image and high-resolution URL
        img_m = re.search(r'<img[^>]+(?:src|data-src)=[\"\']([^\"\']+)[\"\']', part)
        img_thumb = img_m.group(1) if img_m else ''
        primary_img = img_thumb.replace('/product_medium_images/', '/product_images/') if img_thumb else ''
        hover_img = primary_img.replace('.jpg', 'A.jpg') if primary_img else ''
        # High-definition video URL mapping pointing to supplier video repository
        video_url = primary_img.replace('/product_medium_images/', '/product_videos/').replace('/product_images/', '/product_videos/').replace('.jpg', 'V1.mp4') if primary_img else ''
        gallery = [primary_img, hover_img] if hover_img else [primary_img]

        retail_inr, orig_inr = calculate_retail_pricing(wholesale_inr, profit_markup, profit_flat)
        title_lower = title.lower()

        if cat_default == 'silver' or 'silver' in cat_slug.lower() or 'sterling' in cat_slug.lower():
            plating = 'silver'
        elif any(w in title_lower for w in ['rose gold', 'rosegold', 'pink gold']):
            plating = 'rosegold'
        elif any(w in title_lower for w in ['two tone', 'two-tone', 'dual tone']):
            plating = 'two-tone'
        elif any(w in title_lower for w in ['oxidise', 'oxidize']):
            plating = 'oxidised'
        elif any(w in title_lower for w in ['antique', 'mehndi', 'mehendi']):
            plating = 'antique'
        elif any(w in title_lower for w in ['silver', 'rhodium', 'sterling', '925']):
            plating = 'silver'
        else:
            plating = 'gold'

        # Stone Colour detection
        if any(w in title_lower for w in ['ruby', 'red', 'garnet', 'maroon']):
            stone_color = 'Ruby'
        elif any(w in title_lower for w in ['emerald', 'green']):
            stone_color = 'Green'
        elif any(w in title_lower for w in ['sapphire', 'blue']):
            stone_color = 'Blue'
        elif any(w in title_lower for w in ['mint', 'mint green', 'pista']):
            stone_color = 'Mint Green'
        elif any(w in title_lower for w in ['multi', 'rainbow', 'navratna']):
            stone_color = 'Multi Color'
        else:
            stone_color = 'Full White'

        # Stone Size detection
        if 'big' in subcat_default.lower() or 'big' in title_lower:
            stone_size = 'All Big'
        elif 'small' in subcat_default.lower() or 'small' in title_lower:
            stone_size = 'All Small'
        else:
            stone_size = 'Mix'

        # Set Contents detection
        if 'mangtika' in title_lower or subcat_default == 'Mangtika':
            set_contents = 'With Mangtika'
        elif any(w in title_lower for w in ['choker', 'round neck', 'collar']):
            set_contents = 'Full Round Neck'
        elif cat_default == 'necklace' or 'set' in title_lower or 'combo' in title_lower:
            set_contents = 'Necklace & Earrings Only'
        elif cat_default == 'pendants' or 'pendant set' in subcat_default.lower():
            set_contents = 'Pendant Set'
        else:
            set_contents = 'Solo Piece'

        desc = (
            f"Exquisitely crafted from the Sorèva Haute Joaillerie collection, the {title} features "
            f"hand-selected diamond-grade Austrian cubic zirconia crystals micro-set in enduring 24K gold plating with "
            f"anti-tarnish protective sealing. Authenticity Reference: SRV-{model_sku}."
        )

        more_details = {
            "sku": f"SRV-{model_sku}",
            "modelNo": model_sku,
            "czmId": str(pid),
            "category": cat_default,
            "subCategory": subcat_default,
            "plating": plating,
            "stoneColor": stone_color,
            "stoneSize": stone_size,
            "setContents": set_contents,
            "material": "AAA+ Austrian Cubic Zirconia",
            "coating": "Micro-Plated Anti-Tarnish Protective Shield",
            "dispatch": "1-3 Business Days",
            "warranty": "Lifetime Polish & Anti-Tarnish Assurance",
            "origin": "Crafted in India"
        }

        products.append({
            'pid': pid,
            'id': f"czm_{pid}",
            'sku': f"SRV-{model_sku}",
            'modelSku': model_sku,
            'name': title,
            'category': cat_default,
            'subCategory': subcat_default,
            'wholesaleINR': wholesale_inr,
            'priceINR': retail_inr,
            'originalPriceINR': orig_inr,
            'plating': plating,
            'primaryImg': primary_img,
            'hoverImg': hover_img,
            'videoUrl': video_url,
            'gallery': gallery,
            'stoneColor': stone_color,
            'stoneSize': stone_size,
            'setContents': set_contents,
            'more_details': more_details,
            'description': desc,
            'badge': '',
            'isOutOfStock': is_card_oos,
        })

    return products


def fetch_category_page(url, ssl_ctx, retries=2, tracker=None):
    """Fetch a category URL with headers, timeout, retry, and auto-reauth."""
    opener = get_czm_opener(ssl_ctx)
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with opener.open(req, timeout=35) as resp:
                final_url = resp.geturl()
                if "/login" in final_url and "category" not in final_url:
                    if tracker:
                        tracker.log(f"⚠ CZMakers session redirected to login on {url}. Re-authenticating...")
                    with _AUTH_LOCK:
                        setup_auth_headers(ssl_ctx, tracker=tracker)
                    continue
                if resp.status == 200:
                    html = resp.read().decode('utf-8', errors='ignore')
                    if "One moment, please" in html or "wsidchk" in html:
                        if tracker:
                            tracker.log(f"⚡ Anti-bot challenge on category page {url}. Solving...")
                        solve_czm_antibot_challenge(html, opener, HEADERS)
                        retry_resp = opener.open(req, timeout=35)
                        return retry_resp.read().decode('utf-8', errors='ignore')
                    return html
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                if tracker:
                    tracker.log(f"⚠ HTTP {e.code} on {url}. Session expired or restricted. Re-authenticating...")
                with _AUTH_LOCK:
                    setup_auth_headers(ssl_ctx, tracker=tracker)
                time.sleep(1.0)
            else:
                if tracker and attempt == retries:
                    tracker.log(f"⚠ HTTP {e.code} on {url}: {e.reason}")
                if attempt < retries:
                    time.sleep(1.0)
        except urllib.error.URLError as e:
            if tracker and attempt == retries:
                tracker.log(f"⚠ Network error fetching {url}: {e.reason}")
            if attempt < retries:
                time.sleep(1.0)
        except Exception as e:
            if tracker and attempt == retries:
                tracker.log(f"⚠ Request error on {url}: {e}")
            if attempt < retries:
                time.sleep(1.0)
    return ""


# ─── FIFO New Launch Policy Enforcement ──────────────────────────────
def enforce_new_launch_fifo(conn, sd_products, new_launch_capacity=30, newly_added_ids=None):
    """
    Enforce balanced multi-category First-In-First-Out (FIFO) policy for 'New Launch' collection:
    1. Ensures New Launch showcases a diverse mix of products across all main jewellery categories
       (Necklaces, Earrings, Rings, Wristwear/Bracelets, Pendants, Silver, Accessories).
    2. Newly discovered products added during catalog stock refresh are prioritized and distributed
       proportionately across their respective categories rather than letting a single category dominate.
    3. If newly discovered pieces don't fill all slots or if certain categories lack new arrivals,
       remaining slots are backfilled from the newest active in-stock pieces in each category.
    4. Selected pieces are interleaved in round-robin order across categories so that customers
       browsing New Launch experience a varied, alternating showcase (e.g. Necklace -> Earrings -> Ring -> Wristwear...).
    5. Clears 'New Launch' badge for any Out of Stock, disabled, or demoted pieces.
    6. Synchronizes changes across SQLite products table and in-memory/store-data products.
    """
    c = conn.cursor()
    sync_time_iso = datetime.utcnow().isoformat() + "Z"

    # 1. Clear badge for any Out of Stock or disabled products
    c.execute("""
        UPDATE products 
        SET badge = '' 
        WHERE (LOWER(badge) LIKE '%new%' OR LOWER(badge) LIKE '%launch%') 
          AND (disabled = 1 OR active = 0)
    """)

    # 2. Discover all active categories in canonical aesthetic order
    preferred_order = ['necklace', 'earrings', 'rings', 'wristwear', 'pendants']
    cat_rows = c.execute("""
        SELECT DISTINCT category 
        FROM products 
        WHERE disabled = 0 AND active = 1 AND category IS NOT NULL AND category != ''
        ORDER BY category ASC
    """).fetchall()
    active_cats = [r[0] for r in cat_rows if r[0].lower() not in BYPASS_CATEGORIES]

    ordered_cats = [cat for cat in preferred_order if cat in active_cats] + [cat for cat in active_cats if cat not in preferred_order]
    if not ordered_cats:
        ordered_cats = active_cats or ['necklace']

    # 3. Map newly added IDs to their categories
    newly_added_set = set(str(nid).strip() for nid in (newly_added_ids or []))
    new_by_cat = {cat: [] for cat in ordered_cats}
    if newly_added_set:
        placeholders_new = ','.join('?' for _ in newly_added_set)
        new_prod_rows = c.execute(f"""
            SELECT id, category 
            FROM products 
            WHERE id IN ({placeholders_new}) AND disabled = 0 AND active = 1
            ORDER BY rowid DESC
        """, list(newly_added_set)).fetchall()
        for pid, pcat in new_prod_rows:
            if pcat in new_by_cat:
                new_by_cat[pcat].append(pid)
            elif ordered_cats:
                new_by_cat[ordered_cats[0]].append(pid)

    # 4. Existing active products currently tagged New Launch
    existing_nl_rows = c.execute("""
        SELECT id, category 
        FROM products 
        WHERE (LOWER(badge) LIKE '%new%' OR LOWER(badge) LIKE '%launch%')
          AND disabled = 0 AND active = 1
        ORDER BY 
            CASE WHEN dateAdded IS NOT NULL AND dateAdded != '' THEN dateAdded ELSE lastRefreshed END DESC,
            rowid DESC
    """).fetchall()
    existing_nl_by_cat = {cat: [] for cat in ordered_cats}
    for pid, pcat in existing_nl_rows:
        if pid not in newly_added_set:
            if pcat in existing_nl_by_cat:
                existing_nl_by_cat[pcat].append(pid)

    # 5. Build candidate pool for each category (new arrivals first, then existing New Launch, then in-stock backfill)
    cat_pools = {}
    needed_per_cat = max(1, (new_launch_capacity // len(ordered_cats)) + 2)

    for cat in ordered_cats:
        pool = []
        seen_in_pool = set()

        for pid in new_by_cat[cat]:
            if pid not in seen_in_pool:
                seen_in_pool.add(pid)
                pool.append(pid)

        for pid in existing_nl_by_cat[cat]:
            if pid not in seen_in_pool:
                seen_in_pool.add(pid)
                pool.append(pid)

        if len(pool) < needed_per_cat:
            limit_needed = (needed_per_cat - len(pool)) * 3
            backfill_rows = c.execute("""
                SELECT id 
                FROM products 
                WHERE category = ? AND disabled = 0 AND active = 1
                ORDER BY 
                    CASE WHEN dateAdded IS NOT NULL AND dateAdded != '' THEN dateAdded ELSE lastRefreshed END DESC,
                    rowid DESC
                LIMIT ?
            """, (cat, limit_needed)).fetchall()
            for (bf_id,) in backfill_rows:
                if bf_id not in seen_in_pool:
                    seen_in_pool.add(bf_id)
                    pool.append(bf_id)
                    if len(pool) >= needed_per_cat * 2:
                        break

        cat_pools[cat] = pool

    # 6. Target quota per category
    num_cats = len(ordered_cats)
    base_quota = new_launch_capacity // num_cats
    extra = new_launch_capacity % num_cats
    category_quotas = {cat: base_quota + (1 if i < extra else 0) for i, cat in enumerate(ordered_cats)}

    # 7. Round-Robin Selection and Interleaving across categories
    retained_ids = []
    retained_set = set()
    max_rounds = max(category_quotas.values()) if category_quotas else 5

    for round_idx in range(max_rounds):
        for cat in ordered_cats:
            if len(retained_ids) >= new_launch_capacity:
                break
            if round_idx < category_quotas.get(cat, 0):
                pool = cat_pools.get(cat, [])
                if round_idx < len(pool):
                    cand_id = pool[round_idx]
                    if cand_id not in retained_set:
                        retained_set.add(cand_id)
                        retained_ids.append(cand_id)

    # If any slots remain unfilled, fill remaining slots round-robin from spare items
    if len(retained_ids) < new_launch_capacity:
        round_idx = max_rounds
        while len(retained_ids) < new_launch_capacity:
            added_any = False
            for cat in ordered_cats:
                if len(retained_ids) >= new_launch_capacity:
                    break
                pool = cat_pools.get(cat, [])
                if round_idx < len(pool):
                    cand_id = pool[round_idx]
                    if cand_id not in retained_set:
                        retained_set.add(cand_id)
                        retained_ids.append(cand_id)
                        added_any = True
            round_idx += 1
            if not added_any:
                break

    # 8. Identify demoted IDs (pieces that had New Launch badge previously, but were rotated out)
    all_prev_nl_rows = c.execute("""
        SELECT id FROM products 
        WHERE (LOWER(badge) LIKE '%new%' OR LOWER(badge) LIKE '%launch%')
    """).fetchall()
    demoted_ids = [r[0] for r in all_prev_nl_rows if r[0] not in retained_set]

    # 9. Update SQLite database with balanced New Launch pieces and timestamps
    if retained_ids:
        placeholders_ret = ','.join('?' for _ in retained_ids)
        c.execute(f"""
            UPDATE products 
            SET badge = 'New Launch',
                dateAdded = CASE WHEN dateAdded IS NULL OR dateAdded = '' THEN ? ELSE dateAdded END
            WHERE id IN ({placeholders_ret})
        """, [sync_time_iso] + retained_ids)

    if demoted_ids:
        placeholders_dem = ','.join('?' for _ in demoted_ids)
        c.execute(f"UPDATE products SET badge = '' WHERE id IN ({placeholders_dem})", demoted_ids)

    conn.commit()

    # 10. Synchronize in-memory/store-data products dictionary
    if sd_products:
        for item in sd_products:
            pid = str(item.get('id', '')).strip()
            if pid in retained_set:
                item['badge'] = 'New Launch'
            elif pid in demoted_ids:
                item['badge'] = ''
            elif item.get('stockStatus') == 'Out of Stock' or item.get('disabled') == 1 or item.get('active') == 0:
                if item.get('badge') and ('new' in item['badge'].lower() or 'launch' in item['badge'].lower()):
                    item['badge'] = ''

    return len(retained_ids), len(demoted_ids)



# ─── Main Co-Worker Agent Execution ──────────────────────────────────
def run_czm_coworker_agent(mode="full_discovery", max_pages=0, remove_missing=False, verify_unseen=False, wipe_products=False, mark_unmatched_oos=True, category="all"):
    """
    Main entry point for the CZMakers Co-Worker Agent.
    - Matches existing stock by ID and SKU, updating prices and marking In Stock while preserving inventory.
    - If mode is 'complete_refresh' or wipe_products is True, deletes all products & inventory and performs a fresh reload.
    - If category is provided, refreshes only the specified category without touching others.
    - Categorizes, sub-categorizes, and applies pricing markup across CZMakers categories.
    - Marks items whose data is not matching as per CZMakers website as Out of Stock (inventory preserved, never deleted).
    """
    email, _ = get_stored_credentials()
    tracker = AgentStatusTracker(mode=mode, user_email=email)
    tracker.log("🤖 CZMakers Stock & Price Refresh Co-Worker Agent initializing...")
    tracker.log("🔒 CRITICAL SAFEGUARD: Customer records and orders are strictly isolated & preserved.")

    target_cat = str(category or 'all').strip().lower()
    cat_aliases = {
        'bracelets': 'wristwear', 'bracelet': 'wristwear', 'bangles': 'wristwear', 'bangle': 'wristwear',
        'wristwear': 'wristwear', 'necklaces': 'necklace', 'necklace': 'necklace', 'earrings': 'earrings',
        'earring': 'earrings', 'rings': 'rings', 'ring': 'rings', 'finger-rings': 'rings',
        'pendants': 'pendants', 'pendant': 'pendants',
    }
    canonical_cat = cat_aliases.get(target_cat, target_cat)
    if target_cat in BYPASS_CATEGORIES or canonical_cat in BYPASS_CATEGORIES:
        tracker.log(f"🚫 Category '{category}' is BYPASSED (removed from Sorèva store & inventory). No sync performed.")
        tracker.finish(status="completed", message=f"Category '{category}' is removed and bypassed from Sorèva store & inventory.")
        return

    ssl_ctx = ssl.create_default_context()
    auth_ok, logged_in_email = setup_auth_headers(ssl_ctx, tracker=tracker)
    if auth_ok:
        tracker.log(f"🔑 Successfully authenticated as: {logged_in_email} on czmakers.com")
        tracker.stats["authenticatedUser"] = logged_in_email
    else:
        tracker.finish(
            status="failed",
            message=f"❌ Authentication Failed: Could not log in to czmakers.com as {email}. Existing store catalog and orders are 100% preserved."
        )
        return

    # Pricing setup
    profit_markup, profit_flat = get_profit_config()
    tracker.log(f"📊 Pricing Formula: Wholesale INR × {profit_markup} Markup + ₹{profit_flat} Flat (Minimum Retail: ₹1,499)")

    # Connect DB
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Pre-run safety check
    init_ord_count, init_cust_count = verify_customer_order_isolation(conn)
    tracker.stats["preservedOrders"] = init_ord_count
    tracker.stats["preservedCustomers"] = init_cust_count
    tracker.log(f"🔒 Checkpoint verified: {init_ord_count} Orders and {init_cust_count} Customers locked & protected.")

    # ── Hard purge & safeguard: Silver & Accessories removed from store & inventory ──
    c.execute("DELETE FROM products WHERE LOWER(category) IN ('silver', 'accessories')")
    c.execute("DELETE FROM inventory WHERE LOWER(category) IN ('silver', 'accessories')")
    conn.commit()

    # Backup files
    ts = int(time.time())
    if os.path.exists(STORE_DATA_PATH):
        try:
            with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
                sd_backup = json.load(f)
            backup_file = STORE_DATA_PATH.replace('.json', f'.backup.{ts}.json')
            with open(backup_file, 'w', encoding='utf-8') as f:
                json.dump(sd_backup, f)
            tracker.log(f"💾 Backed up store-data.json → {os.path.basename(backup_file)}")
        except Exception as e:
            tracker.log(f"⚠ Backup notice: {e}")

    # Load existing products from DB (index by ID, raw PID, and SKU from more_details)
    existing_db_products = {}
    existing_by_sku = {}
    for r in c.execute("SELECT id, name, category, subCategory, priceINR, originalPriceINR, usdWholesale, disabled, active, more_details FROM products WHERE LOWER(category) NOT IN ('silver', 'accessories')").fetchall():
        r_dict = dict(r)
        db_id = str(r['id'])
        existing_db_products[db_id] = r_dict
        if db_id.startswith('czm_'):
            existing_db_products[db_id[4:]] = r_dict
        md_raw = r_dict.get('more_details')
        if md_raw:
            try:
                md = json.loads(md_raw) if isinstance(md_raw, str) else md_raw
                if isinstance(md, dict):
                    m_sku = str(md.get('sku') or '').strip().upper()
                    m_no = str(md.get('modelNo') or '').strip().upper()
                    m_czm = str(md.get('czmId') or '').strip()
                    if m_sku:
                        existing_by_sku[m_sku] = db_id
                        if m_sku.startswith('SRV-'): existing_by_sku[m_sku[4:]] = db_id
                        if m_sku.startswith('CZM-'): existing_by_sku[m_sku[4:]] = db_id
                    if m_no:
                        existing_by_sku[m_no] = db_id
                        existing_by_sku[f"SRV-{m_no}"] = db_id
                    if m_czm:
                        existing_db_products[m_czm] = r_dict
                        existing_db_products[f"czm_{m_czm}"] = r_dict
            except Exception:
                pass

    # Index by SKU and ID from inventory table
    inventory_by_id = {}
    for r in c.execute("SELECT id, sku, productName, category, status, stockQty, usdWholesale FROM inventory WHERE LOWER(category) NOT IN ('silver', 'accessories')").fetchall():
        r_dict = dict(r)
        db_id = str(r['id'])
        inventory_by_id[db_id] = r_dict
        if db_id.startswith('czm_'):
            inventory_by_id[db_id[4:]] = r_dict
        raw_sku = str(r['sku'] or '').strip().upper()
        if raw_sku:
            existing_by_sku[raw_sku] = db_id
            if raw_sku.startswith('SRV-'):
                existing_by_sku[raw_sku[4:]] = db_id
            if raw_sku.startswith('CZM-'):
                existing_by_sku[raw_sku[4:]] = db_id

    # Load store-data.json for synchronized storefront matching
    sd = {}
    sd_products = []
    sd_by_id = {}
    sd_by_sku = {}
    if os.path.exists(STORE_DATA_PATH):
        try:
            with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
                sd = json.load(f)
            sd_products = [p for p in sd.get('products', []) if str(p.get('category', '')).lower() not in BYPASS_CATEGORIES]
            for item in sd_products:
                item_id = str(item.get('id', '')).strip()
                if item_id:
                    sd_by_id[item_id] = item
                    if item_id.startswith('czm_'):
                        sd_by_id[item_id[4:]] = item
                item_sku = str(item.get('sku', '')).strip().upper()
                if item_sku:
                    sd_by_sku[item_sku] = item
                    if item_sku.startswith('SRV-'):
                        sd_by_sku[item_sku[4:]] = item
                    if item_sku.startswith('CZM-'):
                        sd_by_sku[item_sku[4:]] = item
        except Exception as e:
            tracker.log(f"⚠ store-data.json load notice: {e}")

    initial_catalog_size = len(existing_db_products)
    tracker.log(f"📦 Current catalog size in Sorèva store: {initial_catalog_size} pieces.")

    if mode == "complete_refresh" or wipe_products:
        tracker.log("⚠️ Complete Stock Refresh Mode: Discovering all fresh stock from CZMakers first; catalog will be replaced only after successful verification.")

    # Resolve target category filter (Supports main category families and individual subcategory slugs)
    target_cat = str(category or 'all').strip().lower()
    cat_aliases = {
        'bracelets': 'wristwear',
        'bracelet': 'wristwear',
        'bangles': 'wristwear',
        'bangle': 'wristwear',
        'wristwear': 'wristwear',
        'necklaces': 'necklace',
        'necklace': 'necklace',
        'earrings': 'earrings',
        'earring': 'earrings',
        'rings': 'rings',
        'ring': 'rings',
        'finger-rings': 'rings',
        'pendants': 'pendants',
        'pendant': 'pendants',
    }
    canonical_cat = cat_aliases.get(target_cat, target_cat)

    if target_cat in BYPASS_CATEGORIES or canonical_cat in BYPASS_CATEGORIES:
        tracker.log(f"🚫 Category '{category}' is BYPASSED (removed from Sorèva store & inventory). No sync performed.")
        tracker.finish(status="completed", message=f"Category '{category}' is removed and bypassed from Sorèva store.")
        return

    if canonical_cat and canonical_cat not in ('all', ''):
        # 1. Match entire category family (e.g. necklace, earrings, rings, wristwear, pendants)
        cat_matches = [c for c in ALL_CZM_CATEGORIES if c[1].lower() == canonical_cat]
        # 2. If not a main family, match specific CZMakers subcategory slug or title
        if not cat_matches:
            cat_matches = [
                c for c in ALL_CZM_CATEGORIES
                if c[0].lower() == target_cat
                or target_cat in c[0].lower()
                or c[2].lower() == target_cat
                or target_cat in c[2].lower()
            ]

        if cat_matches:
            category_list = cat_matches
            cat_display_name = category_list[0][2] if len(category_list) == 1 else canonical_cat.title()
            tracker.log(f"🎯 Category-Specific Refresh: Targeting {len(category_list)} CZMakers subcategories for '{cat_display_name}'.")
        else:
            tracker.log(f"⚠ Category '{category}' not found in catalog mapping; scanning all categories.")
            category_list = ALL_CZM_CATEGORIES
    elif mode == "refresh_stock" and max_pages > 0 and max_pages <= 3:
        # Quick refresh of top 10 categories
        category_list = ALL_CZM_CATEGORIES[:10]
    else:
        # Full scan: all categories, up to max_pages or reasonable safety ceiling (25 pages = 2,000 items/cat)
        category_list = ALL_CZM_CATEGORIES

    effective_max_pages = max_pages if max_pages > 0 else 25

    tracker.total_categories = len(category_list)
    tracker.log(f"🚀 Scanning each and every stock across {len(category_list)} CZMakers categories (max {effective_max_pages} pages/cat)...")

    seen_czm_pids = set()
    discovered_products = {}  # key = czm_id
    total_scanned_count = 0
    categories_done = 0
    crawl_lock = threading.Lock()
    fully_exhausted_categories = set()

    def crawl_category_worker(cat_info, cat_idx):
        nonlocal categories_done, total_scanned_count
        cat_slug, cat_default, cat_name = cat_info

        if check_stop_requested():
            return

        tracker.update_progress(cat=cat_name, page=1)
        tracker.log(f"[{cat_idx}/{len(category_list)}] 📂 Scanning category: {cat_name} ({cat_slug})...")

        cat_seen_pids = set()
        empty_page_count = 0
        cat_exhausted = False
        cat_items = []

        for page in range(1, effective_max_pages + 1):
            if check_stop_requested():
                break

            tracker.update_progress(cat=cat_name, page=page)
            url = f"{BASE_URL}/category/{cat_slug}?page={page}"
            html = fetch_category_page(url, ssl_ctx, tracker=tracker)

            if not html:
                empty_page_count += 1
                if empty_page_count >= 2:
                    cat_exhausted = True
                    break
                continue

            items = parse_category_cards(html, cat_slug, cat_default, cat_name, profit_markup, profit_flat)
            if not items:
                cat_exhausted = True
                break

            new_in_page = 0
            for item in items:
                pid = item['pid']
                if pid not in cat_seen_pids:
                    cat_seen_pids.add(pid)
                    new_in_page += 1
                    cat_items.append(item)

            if new_in_page == 0:
                cat_exhausted = True
                break

            time.sleep(PAGE_DELAY)

        with crawl_lock:
            categories_done += 1
            for item in cat_items:
                seen_czm_pids.add(item['pid'])
                discovered_products[item['id']] = item
            total_scanned_count = len(discovered_products)
            tracker.stats["scanned"] = total_scanned_count
            if cat_exhausted or (max_pages == 0):
                fully_exhausted_categories.add(cat_default)
            tracker.log(f"  ✓ {cat_name}: Found {len(cat_seen_pids)} pieces with verified wholesale pricing. ({categories_done}/{len(category_list)} categories done)")

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(crawl_category_worker, cat, idx) for idx, cat in enumerate(category_list, 1)]
        for f in as_completed(futures):
            if check_stop_requested():
                executor.shutdown(wait=False, cancel_futures=True)
                tracker.finish(status="stopped", message="🛑 Agent stopped by user request.")
                conn.close()
                return
            try:
                f.result()
            except Exception as e:
                tracker.log(f"⚠ Category worker error: {e}")

    tracker.log(f"\n✨ Total live CZMakers pieces discovered across all categories: {len(discovered_products)}")

    # ─── CRITICAL ZERO-DATA-LOSS SAFETY CHECK ──────────────────────────
    if len(discovered_products) == 0:
        tracker.finish(
            status="failed",
            message=f"❌ Sync Aborted: 0 products could be pulled from czmakers.com (website unreachable, blocked, or credentials expired). Existing catalog ({initial_catalog_size} pieces) protected and 100% preserved."
        )
        conn.close()
        return

    # ─── ATOMIC WIPE & FRESH RELOAD (ONLY AFTER SUCCESSFUL DISCOVERY) ──
    if mode == "complete_refresh" or wipe_products:
        if target_cat and target_cat not in ('all', ''):
            scanned_cat_names = {c[1].lower() for c in category_list} | {c[0].lower() for c in category_list}
            tracker.log(f"⚠️ CATEGORY REFRESH: Replacing catalog pieces for '{category}' with {len(discovered_products)} freshly discovered pieces...")
            placeholders_cat = ','.join('?' for _ in scanned_cat_names)
            c.execute(f"DELETE FROM products WHERE LOWER(category) IN ({placeholders_cat})", list(scanned_cat_names))
            c.execute(f"DELETE FROM inventory WHERE LOWER(category) IN ({placeholders_cat})", list(scanned_cat_names))
            conn.commit()
            existing_db_products = {k: v for k, v in existing_db_products.items() if v.get('category', '').lower() not in scanned_cat_names}
            sd_products = [p for p in sd_products if str(p.get('category', '')).lower() not in scanned_cat_names]
            sd_by_id = {k: v for k, v in sd_by_id.items() if str(v.get('category', '')).lower() not in scanned_cat_names}
            sd_by_sku = {k: v for k, v in sd_by_sku.items() if str(v.get('category', '')).lower() not in scanned_cat_names}
        else:
            tracker.log(f"⚠️ COMPLETE STOCK REFRESH: Replacing catalog with {len(discovered_products)} freshly discovered pieces from CZMakers...")
            c.execute("DELETE FROM products")
            c.execute("DELETE FROM inventory")
            conn.commit()
            existing_db_products.clear()
            existing_by_sku.clear()
            inventory_by_id.clear()
            sd_products = []
            sd_by_id.clear()
            sd_by_sku.clear()
            if 'products' in sd:
                sd['products'] = []
            initial_catalog_size = 0

    # ─── STEP 2: Match Existing Stock & Add New Stock ─────────────────
    tracker.log("⚙️ Synchronizing inventory: updating matched stock, adding new arrivals...")

    matched_existing_ids = set()
    sync_time_iso = datetime.utcnow().isoformat() + "Z"
    updated_price_count = 0
    new_added_count = 0
    out_of_stock_count = 0
    new_added_ids = []

    for czm_id, p in discovered_products.items():
        if p.get('category', '').lower() in BYPASS_CATEGORIES or p.get('subCategory', '').lower() in BYPASS_CATEGORIES:
            continue
        raw_pid = str(p['pid']).strip()
        model_sku = str(p.get('modelSku') or '').strip().upper()
        srv_sku = str(p.get('sku') or '').strip().upper()

        # Find match by ID or SKU across products, inventory, and store-data
        matched_id = None
        if czm_id in existing_db_products:
            matched_id = czm_id
        elif raw_pid in existing_db_products:
            matched_id = raw_pid
        elif srv_sku and srv_sku in existing_by_sku:
            matched_id = existing_by_sku[srv_sku]
        elif model_sku and model_sku in existing_by_sku:
            matched_id = existing_by_sku[model_sku]
        elif czm_id in inventory_by_id:
            matched_id = czm_id
        elif raw_pid in inventory_by_id:
            matched_id = raw_pid
        elif czm_id in sd_by_id:
            matched_id = czm_id
        elif srv_sku and srv_sku in sd_by_sku:
            matched_id = str(sd_by_sku[srv_sku].get('id'))
        elif model_sku and model_sku in sd_by_sku:
            matched_id = str(sd_by_sku[model_sku].get('id'))

        if matched_id:
            matched_existing_ids.add(matched_id)

            if p.get('isOutOfStock'):
                # CZMakers card explicitly marked Out of Stock / Sold Out or invalid price
                c.execute("""
                    UPDATE products 
                    SET disabled = 1, active = 0, usdWholesale = ?, priceINR = ?, originalPriceINR = ?,
                        category = CASE WHEN ? != '' THEN ? ELSE category END,
                        subCategory = CASE WHEN ? != '' THEN ? ELSE subCategory END,
                        lastRefreshed = ?
                    WHERE id = ?
                """, (p['wholesaleINR'], p['priceINR'], p['originalPriceINR'], p['category'], p['category'], p['subCategory'], p['subCategory'], sync_time_iso, matched_id))

                c.execute("""
                    UPDATE inventory 
                    SET status = 'Out of Stock', 
                        stockQty = 0, 
                        usdWholesale = ?,
                        category = CASE WHEN ? != '' THEN ? ELSE category END,
                        subCategory = CASE WHEN ? != '' THEN ? ELSE subCategory END,
                        lastRefreshed = ?
                    WHERE id = ? OR sku = ? OR sku = ?
                """, (p['wholesaleINR'], p['category'], p['category'], p['subCategory'], p['subCategory'], sync_time_iso, matched_id, p['sku'], p['modelSku']))

                sd_item = sd_by_id.get(matched_id) or sd_by_sku.get(srv_sku) or sd_by_sku.get(model_sku)
                if sd_item:
                    sd_item['priceINR'] = p['priceINR']
                    sd_item['originalPriceINR'] = p['originalPriceINR']
                    sd_item['usdWholesale'] = p['wholesaleINR']
                    if p.get('category'): sd_item['category'] = p['category']
                    if p.get('subCategory'): sd_item['subCategory'] = p['subCategory']
                    sd_item['disabled'] = 1
                    sd_item['active'] = 0
                    sd_item['stockStatus'] = 'Out of Stock'
                    sd_item['stockQty'] = 0
                    if sd_item.get('badge') == 'New Launch':
                        sd_item['badge'] = ''
                    sd_item['lastRefreshed'] = sync_time_iso
                out_of_stock_count += 1
            else:
                # MATCHED & LIVE: Existing product in inventory. Full refresh of details, images, video, pricing, and category
                c.execute("""
                    UPDATE products 
                    SET name = ?,
                        category = CASE WHEN ? != '' THEN ? ELSE category END,
                        subCategory = CASE WHEN ? != '' THEN ? ELSE subCategory END,
                        priceINR = ?,
                        originalPriceINR = ?,
                        usdWholesale = ?,
                        plating = ?,
                        primaryImg = ?,
                        hoverImg = ?,
                        videoUrl = ?,
                        gallery = ?,
                        description = ?,
                        setContents = ?,
                        stoneColor = ?,
                        stoneSize = ?,
                        more_details = ?,
                        disabled = 0,
                        active = 1,
                        lastRefreshed = ?
                    WHERE id = ?
                """, (
                    p['name'],
                    p['category'], p['category'],
                    p['subCategory'], p['subCategory'],
                    p['priceINR'], p['originalPriceINR'], p['wholesaleINR'],
                    p['plating'],
                    p['primaryImg'], p['hoverImg'], p['videoUrl'],
                    json.dumps(p['gallery']),
                    p['description'],
                    p['setContents'], p['stoneColor'], p['stoneSize'],
                    json.dumps(p['more_details']),
                    sync_time_iso,
                    matched_id
                ))

                c.execute("""
                    UPDATE inventory 
                    SET productName = ?,
                        status = 'In Stock', 
                        stockQty = CASE WHEN stockQty <= 0 THEN 15 ELSE stockQty END, 
                        usdWholesale = ?,
                        category = CASE WHEN ? != '' THEN ? ELSE category END,
                        subCategory = CASE WHEN ? != '' THEN ? ELSE subCategory END,
                        lastRefreshed = ?
                    WHERE id = ? OR sku = ? OR sku = ?
                """, (p['name'], p['wholesaleINR'], p['category'], p['category'], p['subCategory'], p['subCategory'], sync_time_iso, matched_id, p['sku'], p['modelSku']))

                sd_item = sd_by_id.get(matched_id) or sd_by_sku.get(srv_sku) or sd_by_sku.get(model_sku)
                if sd_item:
                    sd_item['name'] = p['name']
                    sd_item['priceINR'] = p['priceINR']
                    sd_item['originalPriceINR'] = p['originalPriceINR']
                    sd_item['usdWholesale'] = p['wholesaleINR']
                    if p.get('category'):
                        sd_item['category'] = p['category']
                    if p.get('subCategory'):
                        sd_item['subCategory'] = p['subCategory']
                    sd_item['plating'] = p['plating']
                    sd_item['primaryImg'] = p['primaryImg']
                    sd_item['hoverImg'] = p['hoverImg']
                    sd_item['videoUrl'] = p['videoUrl']
                    sd_item['gallery'] = p['gallery']
                    sd_item['description'] = p['description']
                    sd_item['setContents'] = p['setContents']
                    sd_item['stoneColor'] = p['stoneColor']
                    sd_item['stoneSize'] = p['stoneSize']
                    sd_item['more_details'] = p['more_details']
                    sd_item['disabled'] = 0
                    sd_item['active'] = 1
                    sd_item['stockStatus'] = 'In Stock'
                    sd_item['lastRefreshed'] = sync_time_iso
                    if not sd_item.get('dateAdded'):
                        sd_item['dateAdded'] = sync_time_iso
                    if int(sd_item.get('stockQty') or 0) <= 0:
                        sd_item['stockQty'] = 15

                updated_price_count += 1
        elif not p.get('isOutOfStock'):
            # UNMATCHED & LIVE: Newly discovered stock on CZMakers. Insert all fields fresh!
            c.execute("""
                INSERT OR IGNORE INTO products (
                    id, name, category, subCategory, priceINR, originalPriceINR, usdWholesale,
                    plating, primaryImg, hoverImg, videoUrl, badge, description, disabled, active, rating, reviews,
                    gallery, setContents, stoneColor, stoneSize, more_details,
                    lastRefreshed, dateAdded
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New Launch', ?, 0, 1, 4.9, 14, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p['id'], p['name'], p['category'], p['subCategory'], p['priceINR'], p['originalPriceINR'],
                p['wholesaleINR'], p['plating'], p['primaryImg'], p['hoverImg'], p['videoUrl'],
                p['description'], json.dumps(p['gallery']),
                p['setContents'], p['stoneColor'], p['stoneSize'],
                json.dumps(p['more_details']),
                sync_time_iso, sync_time_iso
            ))

            c.execute("""
                INSERT OR IGNORE INTO inventory (
                    id, productName, sku, category, subCategory, stockQty, lowStockThreshold, status, usdWholesale, lastRefreshed, dateAdded
                ) VALUES (?, ?, ?, ?, ?, 15, 3, 'In Stock', ?, ?, ?)
            """, (p['id'], p['name'], p['sku'], p['category'], p['subCategory'], p['wholesaleINR'], sync_time_iso, sync_time_iso))

            new_item = {
                "id": p['id'],
                "sku": p['sku'],
                "name": p['name'],
                "category": p['category'],
                "subCategory": p['subCategory'],
                "priceINR": p['priceINR'],
                "originalPriceINR": p['originalPriceINR'],
                "usdWholesale": p['wholesaleINR'],
                "rating": 4.9,
                "reviews": 14,
                "plating": p['plating'],
                "availableFinishes": ["24K Gold", "Rose Gold", "Rhodium Silver"],
                "badge": "New Launch",
                "disabled": 0,
                "active": 1,
                "stockStatus": "In Stock",
                "stockQty": 15,
                "primaryImg": p['primaryImg'],
                "hoverImg": p['hoverImg'],
                "videoUrl": p['videoUrl'],
                "gallery": p['gallery'],
                "description": p['description'],
                "setContents": p['setContents'],
                "stoneColor": p['stoneColor'],
                "stoneSize": p['stoneSize'],
                "more_details": p['more_details'],
                "lastRefreshed": sync_time_iso,
                "dateAdded": sync_time_iso
            }
            sd_products.append(new_item)
            sd_by_id[p['id']] = new_item
            if srv_sku:
                sd_by_sku[srv_sku] = new_item
            existing_db_products[p['id']] = new_item
            existing_db_products[raw_pid] = new_item
            inventory_by_id[p['id']] = new_item
            inventory_by_id[raw_pid] = new_item
            sd_by_id[p['id']] = new_item
            sd_by_id[raw_pid] = new_item
            matched_existing_ids.add(p['id'])
            matched_existing_ids.add(raw_pid)
            if srv_sku:
                existing_by_sku[srv_sku] = p['id']
                sd_by_sku[srv_sku] = new_item
                if srv_sku.startswith('SRV-'):
                    existing_by_sku[srv_sku[4:]] = p['id']
                    sd_by_sku[srv_sku[4:]] = new_item
            if model_sku:
                existing_by_sku[model_sku] = p['id']
                existing_by_sku[f"SRV-{model_sku}"] = p['id']
                sd_by_sku[model_sku] = new_item
                sd_by_sku[f"SRV-{model_sku}"] = new_item
            new_added_count += 1
            new_added_ids.append(p['id'])
        else:
            # UNMATCHED & Out of Stock on CZMakers: insert as disabled / Out of Stock
            c.execute("""
                INSERT OR IGNORE INTO products (
                    id, name, category, subCategory, priceINR, originalPriceINR, usdWholesale,
                    plating, primaryImg, hoverImg, videoUrl, badge, description, disabled, active, rating, reviews,
                    gallery, setContents, stoneColor, stoneSize, more_details,
                    lastRefreshed, dateAdded
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 1, 0, 4.9, 14, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p['id'], p['name'], p['category'], p['subCategory'], p['priceINR'], p['originalPriceINR'],
                p['wholesaleINR'], p['plating'], p['primaryImg'], p['hoverImg'], p['videoUrl'],
                p['description'], json.dumps(p['gallery']),
                p['setContents'], p['stoneColor'], p['stoneSize'],
                json.dumps(p['more_details']),
                sync_time_iso, sync_time_iso
            ))

            c.execute("""
                INSERT OR IGNORE INTO inventory (
                    id, productName, sku, category, subCategory, stockQty, lowStockThreshold, status, usdWholesale, lastRefreshed, dateAdded
                ) VALUES (?, ?, ?, ?, ?, 0, 3, 'Out of Stock', ?, ?, ?)
            """, (p['id'], p['name'], p['sku'], p['category'], p['subCategory'], p['wholesaleINR'], sync_time_iso, sync_time_iso))

            new_item = {
                "id": p['id'],
                "sku": p['sku'],
                "name": p['name'],
                "category": p['category'],
                "subCategory": p['subCategory'],
                "priceINR": p['priceINR'],
                "originalPriceINR": p['originalPriceINR'],
                "usdWholesale": p['wholesaleINR'],
                "rating": 4.9,
                "reviews": 14,
                "plating": p['plating'],
                "availableFinishes": ["24K Gold", "Rose Gold", "Rhodium Silver"],
                "badge": "",
                "disabled": 1,
                "active": 0,
                "stockStatus": "Out of Stock",
                "stockQty": 0,
                "primaryImg": p['primaryImg'],
                "hoverImg": p['hoverImg'],
                "videoUrl": p['videoUrl'],
                "gallery": p['gallery'],
                "description": p['description'],
                "setContents": p['setContents'],
                "stoneColor": p['stoneColor'],
                "stoneSize": p['stoneSize'],
                "more_details": p['more_details'],
                "lastRefreshed": sync_time_iso,
                "dateAdded": sync_time_iso
            }
            sd_products.append(new_item)
            sd_by_id[p['id']] = new_item
            sd_by_id[raw_pid] = new_item
            existing_db_products[p['id']] = new_item
            existing_db_products[raw_pid] = new_item
            inventory_by_id[p['id']] = new_item
            inventory_by_id[raw_pid] = new_item
            matched_existing_ids.add(p['id'])
            matched_existing_ids.add(raw_pid)
            if srv_sku:
                sd_by_sku[srv_sku] = new_item
                existing_by_sku[srv_sku] = p['id']
                if srv_sku.startswith('SRV-'):
                    existing_by_sku[srv_sku[4:]] = p['id']
                    sd_by_sku[srv_sku[4:]] = new_item
            if model_sku:
                sd_by_sku[model_sku] = new_item
                sd_by_sku[f"SRV-{model_sku}"] = new_item
                existing_by_sku[model_sku] = p['id']
                existing_by_sku[f"SRV-{model_sku}"] = p['id']
            out_of_stock_count += 1
            new_added_ids.append(p['id'])

    conn.commit()
    tracker.stats["updated"] = updated_price_count
    tracker.stats["added"] = new_added_count
    tracker.log(f"✓ Stock matched & synced: {updated_price_count} existing pieces refreshed, {new_added_count} new stock arrivals added.")

    # ─── STEP 3: Handle Unmatched Stock (Mark as Out of Stock) ──────────
    tracker.log("🔍 Identifying stock not matching CZMakers live website data...")
    all_existing_ids = set(existing_db_products.keys()) | set(inventory_by_id.keys()) | set(sd_by_id.keys())

    # If a specific category was scanned, only evaluate existing products in that category!
    if target_cat and target_cat not in ('all', ''):
        scanned_cat_defs = {c[1].lower() for c in category_list} | {c[0].lower() for c in category_list}
        unmatched_db_ids = [
            db_id for db_id in all_existing_ids
            if db_id not in matched_existing_ids
            and (
                existing_db_products.get(db_id, {}).get('category', '').lower() in scanned_cat_defs
                or inventory_by_id.get(db_id, {}).get('category', '').lower() in scanned_cat_defs
                or str(sd_by_id.get(db_id, {}).get('category', '')).lower() in scanned_cat_defs
            )
        ]
        tracker.log(f"  Filtering evaluation to {len(unmatched_db_ids)} pieces in category '{category}'...")
    else:
        unmatched_db_ids = [
            db_id for db_id in all_existing_ids
            if db_id not in matched_existing_ids
        ]

    missing_to_mark = []
    if unmatched_db_ids:
        tracker.log(f"  Evaluating {len(unmatched_db_ids)} pieces whose data was not matched as per CZMakers website in current run...")
        if verify_unseen:
            tracker.log(f"  Verifying availability directly on https://czmakers.com for {len(unmatched_db_ids)} unmatched pieces...")
            opener = get_czm_opener(ssl_ctx)
            def check_single_avail(db_id):
                pid = db_id.replace('czm_', '')
                url = f"{BASE_URL}/product/{pid}/slug"
                try:
                    with opener.open(urllib.request.Request(url, headers=HEADERS), timeout=10) as resp:
                        final_url = resp.geturl()
                        if "/product/" not in final_url or final_url.rstrip("/") == BASE_URL:
                            return db_id, False
                        h = resp.read().decode('utf-8', errors='ignore').lower()
                        if "product not found" in h or "no product found" in h or "out of stock" in h or "sold out" in h:
                            return db_id, False
                        if "add to cart" not in h and "add-to-cart" not in h:
                            return db_id, False
                        return db_id, True
                except Exception:
                    return db_id, False

            with ThreadPoolExecutor(max_workers=AVAIL_CHECK_WORKERS) as executor:
                futures = {executor.submit(check_single_avail, db_id): db_id for db_id in unmatched_db_ids}
                for f in as_completed(futures):
                    try:
                        db_id, is_live = f.result()
                        if not is_live:
                            missing_to_mark.append(db_id)
                    except Exception:
                        pass
        else:
            if mark_unmatched_oos or mode in ["full_discovery", "complete_refresh", "refresh_stock"]:
                # Default stock refresh behavior: mark any piece not matching CZMakers website data as Out of Stock
                missing_to_mark = unmatched_db_ids
            else:
                # Partial scan: only mark out of stock for categories that were fully exhausted
                missing_to_mark = [
                    db_id for db_id in unmatched_db_ids
                    if existing_db_products.get(db_id, {}).get('category') in fully_exhausted_categories
                ]

    if missing_to_mark:
        tracker.log(f"🔴 Marking {len(missing_to_mark)} non-matching pieces as Out of Stock (inventory preserved, never deleted)...")
        batch_size = 500
        for i in range(0, len(missing_to_mark), batch_size):
            batch = missing_to_mark[i:i + batch_size]
            placeholders = ','.join('?' for _ in batch)
            c.execute(f"UPDATE products SET disabled = 1, active = 0, lastRefreshed = ? WHERE id IN ({placeholders})", [sync_time_iso] + batch)
            c.execute(f"UPDATE products SET badge = '' WHERE badge = 'New Launch' AND id IN ({placeholders})", batch)
            c.execute(f"UPDATE inventory SET status = 'Out of Stock', stockQty = 0, lastRefreshed = ? WHERE id IN ({placeholders})", [sync_time_iso] + batch)
        conn.commit()

        missing_set = set(missing_to_mark)
        for item in sd_products:
            if str(item.get('id')) in missing_set:
                item['stockStatus'] = 'Out of Stock'
                item['stockQty'] = 0
                item['disabled'] = 1
                item['active'] = 0
                item['lastRefreshed'] = sync_time_iso
                if item.get('badge') == 'New Launch':
                    item['badge'] = ''

        out_of_stock_count += len(missing_to_mark)
        tracker.log(f"🔴 Successfully marked {len(missing_to_mark)} non-matching pieces as Out of Stock.")

    tracker.stats["outOfStock"] = out_of_stock_count

    # ─── STEP 3.5: Enforce First-In-First-Out (FIFO) New Launch Policy ─
    tracker.log("✨ Applying First-In-First-Out (FIFO) policy for 'New Launch' collection...")
    new_launch_capacity = int(sd.get('settings', {}).get('newLaunchCapacity', 30))
    retained_nl, demoted_nl = enforce_new_launch_fifo(
        conn=conn,
        sd_products=sd_products,
        new_launch_capacity=new_launch_capacity,
        newly_added_ids=new_added_ids
    )
    tracker.log(
        f"✨ New Launch FIFO rotation complete: {retained_nl} pieces active in 'New Launch', "
        f"{demoted_nl} older pieces rotated to normal category (Capacity: {new_launch_capacity})."
    )

    # ─── STEP 4: Save store-data.json ─────────────────────────────────
    tracker.log("🔄 Saving updated store-data.json (public storefront)...")
    if os.path.exists(STORE_DATA_PATH):
        existing_sd_count = len(sd.get('products', []))
        if len(sd_products) == 0 and existing_sd_count > 0:
            tracker.log(f"🛑 SAFETY HALT: Refusing to overwrite store-data.json with 0 products when {existing_sd_count} products exist! Catalog preserved.")
        else:
            try:
                sd_products = [p for p in sd_products if str(p.get('category', '')).lower() not in BYPASS_CATEGORIES]
                sd['products'] = sd_products
                if 'categories' in sd and isinstance(sd['categories'], list):
                    sd['categories'] = [c for c in sd['categories'] if (c.get('slug') if isinstance(c, dict) else str(c)).lower() not in BYPASS_CATEGORIES]
                if 'settings' in sd:
                    sd['settings']['lastStockSync'] = datetime.utcnow().isoformat() + "Z"

                with open(STORE_DATA_PATH, 'w', encoding='utf-8') as f:
                    json.dump(sd, f, ensure_ascii=False, indent=2)

                tracker.log(f"✓ store-data.json successfully updated with {len(sd_products)} total products.")
            except Exception as e:
                tracker.log(f"⚠ store-data.json save error: {e}")

    # ─── STEP 5: Final Isolation Verification & Audit Log ──────────────
    final_ord_count, final_cust_count = verify_customer_order_isolation(conn)
    if init_ord_count != final_ord_count or init_cust_count != final_cust_count:
        conn.rollback()
        raise SystemExit(
            f"CRITICAL FAULT: Isolation breached! Orders: {init_ord_count}→{final_ord_count}, Customers: {init_cust_count}→{final_cust_count}."
        )

    # Calculate active in-stock total
    in_stock_final = c.execute("SELECT COUNT(*) FROM products WHERE disabled = 0 AND active = 1").fetchone()[0]
    tracker.stats["inStock"] = in_stock_final

    # Record audit log entry
    audit_id = f"log_sync_{int(time.time())}"
    details = (
        f"Co-Worker Sync ({mode}) as {logged_in_email}: {total_scanned_count} pieces scanned, "
        f"{updated_price_count} prices/stocks updated, {new_added_count} new arrivals added, "
        f"{out_of_stock_count} marked OOS. Orders ({final_ord_count}) & Customers ({final_cust_count}) 100% preserved."
    )
    c.execute("""
        INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
        VALUES (?, 'Stock Co-Worker Agent', 'CZMakers Sync', 'Catalog & Inventory', 'czmakers.com', ?)
    """, (audit_id, details))
    conn.commit()
    conn.close()

    tracker.finish(
        status="completed",
        message=f"🎉 Co-Worker Sync Completed Successfully as {logged_in_email}! {new_added_count} new arrivals, {updated_price_count} updated. Orders & Customers 100% preserved."
    )


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Sorèva CZMakers Stock & Price Refresh Co-Worker Agent")
    parser.add_argument('--mode', choices=['refresh_stock', 'full_discovery', 'complete_refresh'], default='full_discovery',
                        help="Operation mode: 'full_discovery' (scans every stock across all categories), 'refresh_stock' (fast refresh), 'complete_refresh' (deletes all products and does a full fresh load)")
    parser.add_argument('--max-pages', type=int, default=0,
                        help="Maximum pages to scan per category (0 = UNLIMITED, scans every page until category ends)")
    parser.add_argument('--remove-missing', action='store_true',
                        help="Permanently delete products that are 404 on CZMakers instead of marking Out of Stock")
    parser.add_argument('--verify-unseen', action='store_true',
                        help="Directly verify HTTP 200/404 for pieces not seen during category crawl")
    parser.add_argument('--wipe-products', action='store_true',
                        help="Delete all products before loading fresh catalog")
    parser.add_argument('--mark-unmatched-oos', dest='mark_unmatched_oos', action='store_true', default=True,
                        help="Mark all unmatched/non-matching CZMakers products as Out of Stock")
    parser.add_argument('--no-mark-unmatched-oos', dest='mark_unmatched_oos', action='store_false',
                        help="Do not mark unmatched products as Out of Stock")
    parser.add_argument('--category', type=str, default='all',
                        help="Specific category or collection to refresh (e.g. 'necklaces', 'earrings', 'rings', 'bracelets', 'pendants', 'silver', 'accessories', or specific slug like 'choker-necklaces')")
    args = parser.parse_args()

    run_czm_coworker_agent(
        mode=args.mode,
        max_pages=args.max_pages,
        remove_missing=args.remove_missing,
        verify_unseen=args.verify_unseen,
        wipe_products=args.wipe_products,
        mark_unmatched_oos=args.mark_unmatched_oos,
        category=args.category
    )
