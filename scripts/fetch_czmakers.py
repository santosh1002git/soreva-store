import urllib.request
import re
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://czmakers.com"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

CATEGORY_MAP = {
    # Necklaces
    'necklaces': ('necklace', 'Necklaces'),
    'choker-necklaces': ('necklace', 'Choker Necklaces'),
    'traditional-necklaces': ('necklace', 'Traditional Necklaces'),
    'collar-necklace': ('necklace', 'Collar Necklaces'),
    'classic-necklace': ('necklace', 'Classic Necklaces'),
    'bridal-necklaces': ('necklace', 'Bridal Necklaces'),
    'aurous-collection': ('necklace', 'Aurous Collection'),
    # Earrings
    'earrings': ('earrings', 'Earrings'),
    'big-size-earrings': ('earrings', 'Big Size Earrings'),
    'tops-&-studs': ('earrings', 'Tops & Studs'),
    'medium-earrings': ('earrings', 'Medium Earrings'),
    'small-earrings': ('earrings', 'Small Earrings'),
    'jhumka-earrings': ('earrings', 'Jhumka Earrings'),
    # Finger Rings
    'finger-rings': ('rings', 'Finger Rings'),
    'cz-finger-rings': ('rings', 'CZ Finger Rings'),
    '925-sterling-finger-rings': ('rings', '925 Sterling Silver Rings'),
    # Pendants
    'pendants': ('pendants', 'Pendants'),
    'cz-pendant-set': ('pendants', 'CZ Pendant Sets'),
    'pendant-with-broad-chain': ('pendants', 'Pendant With Broad Chain'),
    'pendant-with-medium-chain': ('pendants', 'Pendant With Medium Chain'),
    'mangalsutra': ('pendants', 'CZ Mangalsutra'),
    '925-sterling-silver-pendants': ('pendants', '925 Sterling Silver Pendants'),
    # Wristwear
    'wristwear': ('bracelets', 'Wristwear'),
    'cz-braclets': ('bracelets', 'CZ Bracelets'),
    'cz-bangles': ('bracelets', 'CZ Bangles'),
    'bracelets-rings-combo': ('bracelets', 'Bracelets Rings Combo'),
    # Silver Jewellery
    'silver-jewellery': ('silver', 'Silver Jewellery'),
    '925-sterling-silver-earrings': ('silver', '925 Sterling Silver Earrings'),
    # Accessories
    'accessories': ('accessories', 'Accessories'),
    'cz-accessories': ('accessories', 'CZ Accessories'),
    'cz-brooch': ('accessories', 'CZ Brooch'),
    'mangtika': ('accessories', 'CZ Maang Tikka'),
}

def fetch_page(cat_slug, page):
    url = f"{BASE_URL}/category/{cat_slug}?page={page}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"[{cat_slug} p{page}] Error: {e}", file=sys.stderr)
    return None

def parse_products_from_html(html, cat_slug):
    if not html:
        return []
    
    cat_default, subcat_default = CATEGORY_MAP.get(cat_slug, ('necklace', cat_slug.replace('-', ' ').title()))
    blocks = html.split('<div class="f-prod">')[1:]
    extracted = []
    
    for b in blocks:
        pid_m = re.search(r'https://czmakers\.com/product/(\d+)/([^\"\']+)', b)
        if not pid_m:
            continue
        pid, slug = pid_m.groups()
        
        # Title
        title_m = re.search(r'class=[\"\']product_titles[\"\'][^>]*>[\s\S]*?<a[^>]*>([^<]+)</a>', b)
        title = title_m.group(1).strip() if title_m else slug.replace('___', ' | ').replace('_', ' ').strip()
        title = title.replace('&amp;', '&').replace('&quot;', '"').replace('&#039;', "'")
        
        # Product code / model
        code_m = re.search(r'Code:\s*([A-Za-z0-9]+)', b)
        data_model_m = re.search(r'data-model=[\"\']([^\"\']+)[\"\']', b)
        code = code_m.group(1) if code_m else (data_model_m.group(1) if data_model_m else pid)
        
        # Images
        img_m = re.search(r'<img[^>]+src=[\"\']([^\"\']+)[\"\']', b)
        img_thumb = img_m.group(1) if img_m else ''
        primary_img = img_thumb.replace('/product_medium_images/', '/product_images/') if img_thumb else ''
        hover_img = primary_img.replace('.jpg', 'A.jpg') if primary_img else ''
        
        # Video
        video_m = re.search(r'data-path=[\"\']([^\"\']+\.mp4)[\"\']', b)
        video = video_m.group(1) if video_m else ''
        
        # Price
        data_price_m = re.search(r'data-price=[\"\']([0-9\.]+)[\"\']', b)
        usd_price = float(data_price_m.group(1)) if data_price_m and float(data_price_m.group(1)) > 0 else 25.0
        # Calculate sensible retail INR (USD * 85 * 2.2 multiplier, rounded to 99)
        est_retail_inr = int(round((usd_price * 85 * 2.2) / 100) * 100) - 1
        if est_retail_inr < 1499:
            est_retail_inr = 1499
        est_orig_inr = int(round(est_retail_inr * 1.3 / 100) * 100) - 1
        
        # Determine plating
        title_lower = title.lower()
        if 'silver' in title_lower or 'rhodium' in title_lower or 'sterling' in title_lower:
            plating = 'silver'
        elif 'rose' in title_lower:
            plating = 'rose-gold'
        else:
            plating = 'gold'
            
        extracted.append({
            'distributorId': pid,
            'sku': f"CZM-{pid}",
            'code': code,
            'name': title,
            'category': cat_default,
            'subCategory': subcat_default,
            'priceINR': est_retail_inr,
            'originalPriceINR': est_orig_inr,
            'usdWholesale': usd_price,
            'badge': 'Distributor Exclusive',
            'plating': plating,
            'availableFinishes': ['24K Gold', 'Rhodium Silver', 'Rose Gold'],
            'primaryImg': primary_img or img_thumb,
            'hoverImg': hover_img or primary_img or img_thumb,
            'videoUrl': video,
            'gallery': [img for img in [primary_img, hover_img] if img],
            'description': f"Exquisitely handcrafted CZ designer piece from CZ Makers distributor catalog. Features premium AAA+ cubic zirconia crystals in an anti-tarnish micro-plated finish. Distributor Model: {code}.",
            'rating': 4.8,
            'reviews': 16,
            'disabled': 1,
            'active': 0,
            'stockStatus': 'Disabled',
            'stockQty': 0,
            'sourceUrl': f"https://czmakers.com/product/{pid}/{slug}"
        })
    return extracted

def crawl_category(cat_slug):
    cat_products = []
    seen_in_cat = set()
    page = 1
    max_pages = 25
    
    print(f"--> Starting category '{cat_slug}'...")
    while page <= max_pages:
        html = fetch_page(cat_slug, page)
        if not html:
            break
        items = parse_products_from_html(html, cat_slug)
        if not items:
            break
        
        new_items = []
        for it in items:
            if it['distributorId'] not in seen_in_cat:
                seen_in_cat.add(it['distributorId'])
                new_items.append(it)
                
        if not new_items:
            print(f"[{cat_slug}] No new items on page {page} (saw {len(seen_in_cat)} total). Reached end.")
            break
            
        cat_products.extend(new_items)
        print(f"[{cat_slug}] Page {page}: +{len(new_items)} items (Running total: {len(cat_products)})")
        
        if len(items) < 80:
            print(f"[{cat_slug}] Last page had {len(items)} items (< 80). Done.")
            break
            
        page += 1
        time.sleep(0.15)
        
    return cat_products

def main():
    print("=" * 60)
    print("CZ MAKERS DISTRIBUTOR CATALOG HARVESTER")
    print(f"Total categories configured: {len(CATEGORY_MAP)}")
    print("=" * 60)
    
    all_products_by_id = {}
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=6) as executor:
        future_to_cat = {executor.submit(crawl_category, cat): cat for cat in CATEGORY_MAP.keys()}
        for future in as_completed(future_to_cat):
            cat = future_to_cat[future]
            try:
                prods = future.result()
                for p in prods:
                    pid = p['distributorId']
                    if pid not in all_products_by_id:
                        all_products_by_id[pid] = p
                print(f"[COMPLETED] {cat}: {len(prods)} products extracted. Total unique so far: {len(all_products_by_id)}")
            except Exception as e:
                print(f"[FAILED] {cat}: {e}", file=sys.stderr)
                
    elapsed = round(time.time() - start_time, 2)
    print("=" * 60)
    print(f"CRAWL COMPLETE in {elapsed}s! Total unique CZ Makers products: {len(all_products_by_id)}")
    print("=" * 60)
    
    output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'czmakers_all_products.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(list(all_products_by_id.values()), f, indent=2, ensure_ascii=False)
    print(f"Saved catalog to: {output_path}")

if __name__ == '__main__':
    main()
