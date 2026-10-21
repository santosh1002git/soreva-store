#!/usr/bin/env python3
"""
fresh_import.py - Complete Fresh Catalog Import for Sorèva

Implements the Fresh Import Plan:
  Step 1: Backup & Wipe (products + inventory only; orders/customers/settings preserved)
  Step 2: Crawl ALL category pages (all pagination)
  Step 3: Verify each product's SKU + price on its detail page
  Step 4: Insert with correct pricing (profitMarkup × wholesale INR)
  Step 5: Update store-data.json

CRITICAL ISOLATION RULES:
  - ONLY touches 'products' and 'inventory' tables + data/store-data.json products array.
  - NEVER touches orders, customers, settings, coupons, or any other data.
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
import shutil
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import http.cookiejar
import urllib.parse
from datetime import datetime

# ─── Paths ───────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(SCRIPT_DIR, '..')
DB_PATH = os.path.join(PROJECT_DIR, 'pb', 'pb_data', 'data.db')
STORE_DATA_PATH = os.path.join(PROJECT_DIR, 'data', 'store-data.json')
CZM_COOKIE_PATH = os.path.join(PROJECT_DIR, 'data', 'czm-cookie.json')
CZM_CRED_PATH = os.path.join(PROJECT_DIR, 'data', 'czm-credentials.json')

# ─── Constants ───────────────────────────────────────────────────────
BASE_URL = "https://czmakers.com"
MAX_WORKERS = 6           # Parallel detail-page verification threads
CRAWL_DELAY = 0.3         # Seconds between category page fetches (be polite)
DETAIL_DELAY = 0.15       # Seconds between detail page fetches
PROFIT_MARKUP = 2.2       # Default markup multiplier
PROFIT_FLAT = 0           # Default flat add-on (INR)
MIN_RETAIL_INR = 1499     # Minimum retail price
STRIKETHROUGH_FACTOR = 1.1  # originalPriceINR = priceINR × this

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

CATEGORY_MAP = {
    'necklaces':              ('necklace',    'Necklaces'),
    'choker-necklaces':       ('necklace',    'Choker Necklaces'),
    'traditional-necklaces':  ('necklace',    'Traditional Necklaces'),
    'earrings':               ('earrings',    'Earrings'),
    'jhumka-earrings':        ('earrings',    'Jhumka Earrings'),
    'finger-rings':           ('rings',       'Finger Rings'),
    'pendants':               ('pendants',    'Pendants'),
    'wristwear':              ('bracelets',   'Wristwear'),
    'silver-jewellery':       ('silver',      'Silver Jewellery'),
    'accessories':            ('accessories', 'Accessories'),
}

# ─── SSL context (reusable) ──────────────────────────────────────────
SSL_CTX = ssl.create_default_context()


# ═══════════════════════════════════════════════════════════════════════
#  Authentication
# ═══════════════════════════════════════════════════════════════════════

def perform_czm_login():
    """Login to CZMakers and return cookie string."""
    if not os.path.exists(CZM_CRED_PATH):
        return None
    try:
        with open(CZM_CRED_PATH, 'r', encoding='utf-8') as f:
            creds = json.load(f)
        email = creds.get('email')
        password = creds.get('password')
        if not email or not password:
            return None

        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(cj),
            urllib.request.HTTPSHandler(context=SSL_CTX)
        )

        req = urllib.request.Request('https://czmakers.com/login', headers=HEADERS)
        resp = opener.open(req)
        html = resp.read().decode('utf-8')
        m = re.search(r'name="_token"\s+value="([^"]+)"', html)
        if not m:
            return None
        token = m.group(1)

        data = urllib.parse.urlencode({
            '_token': token, 'email': email, 'password': password
        }).encode('utf-8')
        post_req = urllib.request.Request(
            'https://czmakers.com/login', data=data, headers=HEADERS
        )
        post_resp = opener.open(post_req)

        if "/login" in post_resp.geturl() and "dashboard" not in post_resp.geturl():
            return None

        cookie_dict = {c.name: c.value for c in cj}
        if cookie_dict:
            with open(CZM_COOKIE_PATH, 'w', encoding='utf-8') as f:
                json.dump(cookie_dict, f)
            return "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])
    except Exception as e:
        print(f"  ⚠ Login error: {e}", file=sys.stderr)
    return None


def load_auth_headers():
    """Setup HEADERS with authentication cookie."""
    fresh_cookie = perform_czm_login()
    if fresh_cookie:
        HEADERS['Cookie'] = fresh_cookie
        print("  ✓ Fresh CZMakers login successful.")
    else:
        try:
            if os.path.exists(CZM_COOKIE_PATH):
                with open(CZM_COOKIE_PATH, 'r', encoding='utf-8') as f:
                    cookie_dict = json.load(f)
                cookie_str = "; ".join([f"{k}={v}" for k, v in cookie_dict.items()])
                if cookie_str:
                    HEADERS['Cookie'] = cookie_str
                    print("  ✓ Loaded cached CZMakers cookie.")
        except Exception:
            print("  ⚠ No CZMakers authentication available (using public access).")


# ═══════════════════════════════════════════════════════════════════════
#  Step 1: Backup & Wipe
# ═══════════════════════════════════════════════════════════════════════

def backup_and_wipe(conn):
    """
    Back up current DB state, then wipe products and inventory tables.
    Orders, customers, settings, coupons — ALL preserved.
    """
    c = conn.cursor()

    # Safety: record order + customer counts BEFORE any changes
    ord_count = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    cust_count = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    prod_count = c.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    inv_count = c.execute("SELECT COUNT(*) FROM inventory").fetchone()[0]
    print(f"  📊 Pre-wipe: {prod_count} products, {inv_count} inventory rows")
    print(f"  🔒 Protected: {ord_count} orders, {cust_count} customers")

    # Backup store-data.json
    if os.path.exists(STORE_DATA_PATH):
        ts = int(time.time())
        backup_path = STORE_DATA_PATH.replace('.json', f'.backup.{ts}.json')
        shutil.copy2(STORE_DATA_PATH, backup_path)
        print(f"  💾 Backed up store-data.json → {os.path.basename(backup_path)}")

    # Backup database
    db_backup_path = DB_PATH.replace('.db', f'.backup.{int(time.time())}.db')
    shutil.copy2(DB_PATH, db_backup_path)
    print(f"  💾 Backed up database → {os.path.basename(db_backup_path)}")

    # WIPE products and inventory
    c.execute("DELETE FROM products")
    c.execute("DELETE FROM inventory")
    conn.commit()
    print("  🗑️  Wiped products and inventory tables.")

    # Verify orders/customers untouched
    post_ord = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    post_cust = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    assert post_ord == ord_count, f"CRITICAL: Orders changed! {ord_count} → {post_ord}"
    assert post_cust == cust_count, f"CRITICAL: Customers changed! {cust_count} → {post_cust}"
    print("  ✓ Orders and customers verified intact.")

    return ord_count, cust_count


# ═══════════════════════════════════════════════════════════════════════
#  Step 2: Crawl ALL Category Pages
# ═══════════════════════════════════════════════════════════════════════

def fetch_page(url):
    """Fetch a single URL and return HTML."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=15) as resp:
            if resp.status == 200:
                return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"    ⚠ Fetch error: {url} → {e}", file=sys.stderr)
    return ""


def get_max_page(html):
    """Extract the maximum page number from pagination links."""
    pages = re.findall(r'page=(\d+)', html)
    if pages:
        return max(int(p) for p in pages)
    return 1


def parse_category_page(html, cat_slug):
    """
    Parse a category listing page.
    Returns list of dicts with: pid, slug, sku (data-model), raw_price (data-price),
    title, primary_img, hover_img, category, subCategory
    """
    if not html:
        return []

    cat_default, subcat_default = CATEGORY_MAP.get(
        cat_slug, ('necklace', cat_slug.replace('-', ' ').title())
    )

    blocks = html.split('<div class="f-prod">')[1:]
    products = []

    for b in blocks:
        # PID + slug from product link
        pid_m = re.search(r'https://czmakers\.com/product/(\d+)/([^"\']+)', b)
        if not pid_m:
            continue
        pid, slug = pid_m.groups()

        # SKU from data-model (this is the REAL SKU on the category card)
        data_model_m = re.search(r'data-model=["\']([^"\']+)["\']', b)
        if not data_model_m:
            continue  # Skip products without a clear SKU
        sku = data_model_m.group(1)

        # Price from data-price (INR wholesale)
        data_price_m = re.search(r'data-price=["\']([0-9.]+)["\']', b)
        if not data_price_m:
            continue  # Skip products without a price
        raw_price = float(data_price_m.group(1))
        if raw_price <= 0:
            continue

        # Title
        title_m = re.search(
            r'class=["\']product_titles["\'][^>]*>[\s\S]*?<a[^>]*>([^<]+)</a>', b
        )
        title = (title_m.group(1).strip() if title_m
                 else slug.replace('___', ' | ').replace('_', ' ').strip())
        title = (title.replace('&amp;', '&')
                      .replace('&quot;', '"')
                      .replace('&#039;', "'"))

        # Images
        img_m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', b)
        img_thumb = img_m.group(1) if img_m else ''
        primary_img = img_thumb.replace(
            '/product_medium_images/', '/product_images/'
        ) if img_thumb else ''
        hover_img = primary_img.replace('.jpg', 'A.jpg') if primary_img else ''

        products.append({
            'pid': pid,
            'slug': slug,
            'sku': sku,
            'raw_price_inr': raw_price,
            'title': title,
            'primary_img': primary_img,
            'hover_img': hover_img,
            'category': cat_default,
            'subCategory': subcat_default,
        })

    return products


def crawl_all_categories():
    """
    Crawl every page of every category.
    Returns a dict keyed by (pid, sku) to avoid duplicates.
    """
    all_products = {}  # key = (pid, sku) to deduplicate
    total_pages_fetched = 0

    for cat_slug, (cat, subcat) in CATEGORY_MAP.items():
        print(f"\n  📂 Crawling: {cat_slug}")

        # Fetch page 1 to discover pagination
        url = f"{BASE_URL}/category/{cat_slug}?page=1"
        html = fetch_page(url)
        if not html:
            print(f"    ⚠ Could not fetch {cat_slug} page 1, skipping.")
            continue

        max_page = get_max_page(html)
        print(f"    Pages: 1 to {max_page}")

        # Parse page 1
        page_products = parse_category_page(html, cat_slug)
        for p in page_products:
            key = (p['pid'], p['sku'])
            if key not in all_products:
                all_products[key] = p
        total_pages_fetched += 1

        # Fetch remaining pages
        for page_num in range(2, max_page + 1):
            time.sleep(CRAWL_DELAY)
            url = f"{BASE_URL}/category/{cat_slug}?page={page_num}"
            html = fetch_page(url)
            page_products = parse_category_page(html, cat_slug)
            for p in page_products:
                key = (p['pid'], p['sku'])
                if key not in all_products:
                    all_products[key] = p
            total_pages_fetched += 1
            print(f"    Page {page_num}/{max_page}: +{len(page_products)} products")

        print(f"    ✓ {cat_slug} done. Running total: {len(all_products)} unique products")

    print(f"\n  📊 Crawled {total_pages_fetched} pages, found {len(all_products)} unique (PID, SKU) pairs.")
    return all_products


# ═══════════════════════════════════════════════════════════════════════
#  Step 3: Verify on Detail Pages (Parallel)
# ═══════════════════════════════════════════════════════════════════════

def verify_product_on_detail(product):
    """
    Fetch the product detail page and verify the exact SKU is present
    with data-model + data-price. Returns the verified product dict
    with confirmed price, or None if SKU is missing/commented out.
    """
    pid = product['pid']
    sku = product['sku']
    slug = product['slug']

    url = f"{BASE_URL}/product/{pid}/{slug}"
    try:
        time.sleep(DETAIL_DELAY)
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=15) as resp:
            final_url = resp.geturl()
            if "/product/" not in final_url:
                return None  # Redirected away (product removed)

            html = resp.read().decode('utf-8', errors='ignore')

            # Check if exact SKU exists as an ACTIVE data-model attribute
            # Pattern: data-model="SKU" ... data-price="PRICE"
            # We need to find the variant block where data-model matches our SKU
            
            # Strategy: Find all data-model/data-price pairs
            # Look for the pattern near each variant option
            variant_pattern = re.compile(
                r'data-model=["\']' + re.escape(sku) + r'["\']'
                r'[^>]*?data-price=["\']([0-9.]+)["\']',
                re.DOTALL
            )
            match = variant_pattern.search(html)

            if not match:
                # Try reverse order: data-price before data-model
                variant_pattern_rev = re.compile(
                    r'data-price=["\']([0-9.]+)["\']'
                    r'[^>]*?data-model=["\']' + re.escape(sku) + r'["\']',
                    re.DOTALL
                )
                match = variant_pattern_rev.search(html)

            if not match:
                # Last try: look for data-model anywhere with the SKU,
                # then find nearest data-price
                sku_pattern = re.compile(
                    r'data-model=["\']' + re.escape(sku) + r'["\']'
                )
                sku_match = sku_pattern.search(html)
                if sku_match:
                    # Check it's NOT inside an HTML comment
                    # Find the nearest <!-- before this match
                    before = html[:sku_match.start()]
                    last_comment_open = before.rfind('<!--')
                    last_comment_close = before.rfind('-->')
                    if last_comment_open > last_comment_close:
                        # SKU is inside a comment — SKIP
                        return None

                    # Find nearest data-price within 200 chars
                    nearby = html[max(0, sku_match.start()-200):sku_match.end()+200]
                    price_m = re.search(r'data-price=["\']([0-9.]+)["\']', nearby)
                    if price_m:
                        verified_price = float(price_m.group(1))
                        product['verified_price_inr'] = verified_price
                        return product

                return None  # SKU not found on detail page

            verified_price = float(match.group(1))
            product['verified_price_inr'] = verified_price
            return product

    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        # For other errors, use category page price as fallback
        product['verified_price_inr'] = product['raw_price_inr']
        return product
    except Exception:
        # On transient errors, trust the category page price
        product['verified_price_inr'] = product['raw_price_inr']
        return product


def verify_all_products(products_dict, skip_verify=False):
    """
    Verify all products on their detail pages using parallel requests.
    Returns list of verified products.
    """
    products_list = list(products_dict.values())

    if skip_verify:
        print("  ⚡ Skipping detail-page verification (--skip-verify flag)")
        for p in products_list:
            p['verified_price_inr'] = p['raw_price_inr']
        return products_list

    print(f"\n  🔍 Verifying {len(products_list)} products on detail pages...")
    verified = []
    skipped = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(verify_product_on_detail, p): p
            for p in products_list
        }

        done_count = 0
        for future in as_completed(futures):
            done_count += 1
            if done_count % 100 == 0:
                print(f"    Progress: {done_count}/{len(products_list)} "
                      f"({len(verified)} verified, {skipped} skipped)")

            try:
                result = future.result()
                if result:
                    verified.append(result)
                else:
                    skipped += 1
            except Exception:
                errors += 1

    print(f"\n  📊 Verification complete:")
    print(f"    ✓ Verified: {len(verified)}")
    print(f"    ✗ Skipped (missing/commented): {skipped}")
    print(f"    ⚠ Errors: {errors}")

    return verified


# ═══════════════════════════════════════════════════════════════════════
#  Step 4: Insert with Correct Pricing
# ═══════════════════════════════════════════════════════════════════════

def calculate_pricing(wholesale_inr, markup=PROFIT_MARKUP, flat=PROFIT_FLAT):
    """
    Calculate retail and original prices from wholesale INR.
    
    usdWholesale = exact data-price from CZMakers (INR wholesale cost)
    priceINR = usdWholesale × profitMarkup + profitFlat (rounded to nearest ₹100 - 1)
    originalPriceINR = priceINR × 1.1 (rounded to nearest ₹100 - 1, for strikethrough)
    """
    retail_inr = max(
        MIN_RETAIL_INR,
        int(round((wholesale_inr * markup + flat) / 100) * 100) - 1
    )
    orig_inr = int(round(retail_inr * STRIKETHROUGH_FACTOR / 100) * 100) - 1
    return retail_inr, orig_inr


def insert_products(conn, verified_products, markup=PROFIT_MARKUP, flat=PROFIT_FLAT):
    """Insert all verified products into the database."""
    c = conn.cursor()
    inserted = 0
    sku_seen = set()

    for p in verified_products:
        db_id = f"czm_{p['pid']}"
        sku = p['sku']

        # Deduplicate by db_id (same PID may appear in multiple categories)
        if db_id in sku_seen:
            continue
        sku_seen.add(db_id)

        wholesale_inr = p['verified_price_inr']
        retail_inr, orig_inr = calculate_pricing(wholesale_inr, markup, flat)

        plating = ('silver' if any(w in p['title'].lower()
                   for w in ['silver', 'rhodium', 'sterling'])
                   else 'gold')

        description = (
            f"Sculpted with haute joaillerie precision, the {p['title']} features "
            f"diamond-grade Austrian cubic zirconia crystals hand-finished in enduring "
            f"24K gold plating with anti-tarnish protective sealing. "
            f"Authenticity Ref: SRV-{sku}."
        )

        # Video URL (constructed from image pattern)
        video_url = ''
        if p['primary_img']:
            # Try to derive video URL from image URL pattern
            img_basename = p['primary_img'].rsplit('/', 1)[-1] if '/' in p['primary_img'] else ''
            if img_basename:
                video_name = img_basename.replace('.jpg', 'V1.mp4')
                video_url = p['primary_img'].rsplit('/', 1)[0].replace(
                    '/product_images/', '/product_videos/'
                ) + '/' + video_name

        # Gallery JSON
        gallery = [p['primary_img']]
        if p['hover_img']:
            gallery.append(p['hover_img'])

        try:
            c.execute("""
                INSERT OR IGNORE INTO products (
                    id, name, category, subCategory, priceINR, originalPriceINR,
                    usdWholesale, plating, primaryImg, hoverImg, badge,
                    description, disabled, active, rating, reviews,
                    videoUrl, gallery
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 4.9, 14, ?, ?)
            """, (
                db_id, p['title'], p['category'], p['subCategory'],
                retail_inr, orig_inr, wholesale_inr, plating,
                p['primary_img'], p['hover_img'], '',
                description, video_url, json.dumps(gallery)
            ))

            c.execute("""
                INSERT OR IGNORE INTO inventory (
                    id, productName, sku, category, stockQty,
                    lowStockThreshold, status, usdWholesale
                ) VALUES (?, ?, ?, ?, 8, 2, 'In Stock', ?)
            """, (db_id, p['title'], f"SRV-{sku}", p['category'], wholesale_inr))

            inserted += 1
        except Exception as e:
            print(f"    ⚠ Insert error for {db_id}: {e}", file=sys.stderr)

    conn.commit()
    print(f"\n  ✓ Inserted {inserted} products into database.")
    return inserted


# ═══════════════════════════════════════════════════════════════════════
#  Step 5: Update Store Data JSON
# ═══════════════════════════════════════════════════════════════════════

def update_store_data(conn):
    """
    Rebuild the products array in store-data.json from the database.
    Preserves all non-product data (settings, etc.).
    """
    c = conn.cursor()
    rows = c.execute("""
        SELECT id, name, category, subCategory, priceINR, originalPriceINR,
               usdWholesale, plating, primaryImg, hoverImg, badge,
               description, disabled, active, rating, reviews,
               videoUrl, gallery
        FROM products
        ORDER BY category, name
    """).fetchall()

    # Load existing store-data to preserve settings
    store_data = {}
    if os.path.exists(STORE_DATA_PATH):
        try:
            with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
                store_data = json.load(f)
        except Exception:
            pass

    # Build products array
    products_array = []
    for row in rows:
        (db_id, name, category, sub_cat, price_inr, orig_inr,
         usd_wholesale, plating, primary_img, hover_img, badge,
         description, disabled, active, rating, reviews,
         video_url, gallery_json) = row

        try:
            gallery = json.loads(gallery_json) if gallery_json else [primary_img]
        except Exception:
            gallery = [primary_img]
        if hover_img and hover_img not in gallery:
            gallery.append(hover_img)

        # Get inventory info
        inv = c.execute(
            "SELECT sku, stockQty, status FROM inventory WHERE id = ?", (db_id,)
        ).fetchone()
        sku = inv[0] if inv else f"SRV-{db_id}"
        stock_qty = inv[1] if inv else 8
        stock_status = inv[2] if inv else "In Stock"

        products_array.append({
            "id": db_id,
            "sku": sku,
            "name": name,
            "category": category,
            "subCategory": sub_cat,
            "priceINR": price_inr,
            "originalPriceINR": orig_inr,
            "usdWholesale": usd_wholesale,
            "rating": rating,
            "reviews": reviews,
            "plating": plating,
            "availableFinishes": ["24K Gold", "Rose Gold", "Rhodium Silver"],
            "badge": badge,
            "disabled": disabled,
            "active": active,
            "stockStatus": stock_status,
            "stockQty": stock_qty,
            "primaryImg": primary_img,
            "hoverImg": hover_img,
            "gallery": gallery,
            "videoUrl": video_url or "",
            "description": description,
        })

    store_data['products'] = products_array

    with open(STORE_DATA_PATH, 'w', encoding='utf-8') as f:
        json.dump(store_data, f, ensure_ascii=False, indent=2)

    print(f"  ✓ Wrote {len(products_array)} products to store-data.json")
    return len(products_array)


# ═══════════════════════════════════════════════════════════════════════
#  Main Orchestrator
# ═══════════════════════════════════════════════════════════════════════

def run_fresh_import(skip_verify=False, dry_run=False):
    """Execute the complete fresh import pipeline."""
    start_time = time.time()

    print("=" * 70)
    print("💎 SORÈVA — Complete Fresh Catalog Import")
    print("=" * 70)
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Mode: {'DRY RUN (no DB changes)' if dry_run else 'LIVE IMPORT'}")
    print(f"  Verify: {'Skip (trust category pages)' if skip_verify else 'Full detail-page verification'}")
    print()

    # ─── Authentication ───
    print("🔑 Step 0: Authentication")
    load_auth_headers()
    print()

    # ─── Load pricing config ───
    markup = PROFIT_MARKUP
    flat = PROFIT_FLAT
    try:
        with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
            sd = json.load(f)
            settings = sd.get('settings', {})
            if 'profitMarkup' in settings:
                markup = float(settings['profitMarkup'])
            if 'profitFlat' in settings:
                flat = int(settings['profitFlat'])
    except Exception:
        pass
    print(f"💰 Pricing: markup={markup}x, flat=+₹{flat}, min=₹{MIN_RETAIL_INR}")
    print()

    # ─── Step 2: Crawl all categories ───
    print("🕷️  Step 2: Crawling ALL CZMakers category pages...")
    all_products = crawl_all_categories()

    if not all_products:
        print("❌ No products found! Aborting to prevent data loss.")
        return

    print(f"\n  Total discovered: {len(all_products)} unique products")

    # ─── Step 3: Verify on detail pages ───
    print("\n🔍 Step 3: Verifying products on detail pages...")
    verified = verify_all_products(all_products, skip_verify=skip_verify)

    if not verified:
        print("❌ No products passed verification! Aborting.")
        return

    if dry_run:
        print(f"\n🏁 DRY RUN COMPLETE")
        print(f"  Would import: {len(verified)} verified products")
        # Show price summary
        prices = [p['verified_price_inr'] for p in verified]
        print(f"  Price range: ₹{min(prices):.0f} – ₹{max(prices):.0f} (wholesale INR)")
        retail_prices = [calculate_pricing(p, markup, flat)[0] for p in prices]
        print(f"  Retail range: ₹{min(retail_prices)} – ₹{max(retail_prices)}")

        # Category breakdown
        cats = {}
        for p in verified:
            cats[p['subCategory']] = cats.get(p['subCategory'], 0) + 1
        print(f"\n  Category breakdown:")
        for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
            print(f"    {cat}: {count}")
        return

    # ─── Step 1: Backup & Wipe (done AFTER crawl succeeds, so we don't wipe on failure) ───
    print("\n💾 Step 1: Backup & Wipe")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    init_ord_count, init_cust_count = backup_and_wipe(conn)

    # ─── Step 4: Insert products ───
    print("\n📦 Step 4: Inserting products with correct pricing...")
    inserted = insert_products(conn, verified, markup, flat)

    # ─── Step 5: Update store-data.json ───
    print("\n📄 Step 5: Updating store-data.json...")
    json_count = update_store_data(conn)

    # ─── Final isolation verification ───
    c = conn.cursor()
    final_ord = c.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    final_cust = c.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    assert final_ord == init_ord_count, \
        f"CRITICAL: Orders changed from {init_ord_count} to {final_ord}!"
    assert final_cust == init_cust_count, \
        f"CRITICAL: Customers changed from {init_cust_count} to {final_cust}!"

    # Audit log
    try:
        c.execute("""
            INSERT INTO audit_log (id, employeeName, action, targetType, targetId, details)
            VALUES (?, 'Fresh Import Agent', 'Complete Re-Import', 'Catalog', 'czmakers.com', ?)
        """, (
            f"log_fresh_{int(time.time())}",
            f"Fresh import: {inserted} products imported. "
            f"Orders ({final_ord}) and Customers ({final_cust}) 100% preserved."
        ))
        conn.commit()
    except Exception:
        pass

    conn.close()

    elapsed = time.time() - start_time
    print()
    print("=" * 70)
    print("✅ FRESH IMPORT COMPLETE!")
    print("=" * 70)
    print(f"  📦 Products imported: {inserted}")
    print(f"  📄 Products in store-data.json: {json_count}")
    print(f"  🔒 Orders preserved: {final_ord}")
    print(f"  🔒 Customers preserved: {final_cust}")
    print(f"  ⏱️  Total time: {elapsed:.1f}s")
    print("=" * 70)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description="Sorèva Complete Fresh Catalog Import from CZMakers"
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help="Crawl and verify but DON'T wipe or write to DB"
    )
    parser.add_argument(
        '--skip-verify', action='store_true',
        help="Skip detail-page verification (trust category page prices)"
    )
    args = parser.parse_args()

    run_fresh_import(skip_verify=args.skip_verify, dry_run=args.dry_run)
