#!/usr/bin/env python3
"""
Pre-cache critical product images and generate WebP optimized variants.
Runs with a thread pool to rapidly fetch and compress images.
"""
import os
import sys
import re
import json
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CACHE_DIR = os.path.join(DATA_DIR, 'img_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://indian-jewellery.com/',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'same-origin'
}

def download_and_convert(url):
    fn = os.path.basename(url.split('?')[0])
    if not fn:
        return None
    name_no_ext, ext = os.path.splitext(fn)
    if not ext:
        ext = '.jpg'
        fn = name_no_ext + ext

    jpg_path = os.path.join(CACHE_DIR, fn)
    webp_path = os.path.join(CACHE_DIR, f"{name_no_ext}.webp")

    # If both already exist and have valid size, skip
    if os.path.exists(jpg_path) and os.path.getsize(jpg_path) > 0 and (not HAS_PIL or (os.path.exists(webp_path) and os.path.getsize(webp_path) > 0)):
        return (fn, "cached", os.path.getsize(webp_path if HAS_PIL and os.path.exists(webp_path) else jpg_path))

    # If jpg exists but webp does not:
    if os.path.exists(jpg_path) and os.path.getsize(jpg_path) > 0:
        if HAS_PIL:
            try:
                with Image.open(jpg_path) as im:
                    im = im.convert('RGB')
                    im.save(webp_path, 'WEBP', quality=82, method=6)
                return (fn, "converted", os.path.getsize(webp_path))
            except Exception as e:
                return (fn, f"convert_fail: {e}", 0)
        return (fn, "cached_jpg", os.path.getsize(jpg_path))

    # Download from remote
    remote_url = url
    if not remote_url.startswith('http'):
        remote_url = f"https://indian-jewellery.com/core/thumb_images/product_images/{fn}"

    try:
        req = urllib.request.Request(remote_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            content = resp.read()

        tmp_jpg = f"{jpg_path}.tmp.{os.getpid()}"
        with open(tmp_jpg, 'wb') as f:
            f.write(content)
        os.replace(tmp_jpg, jpg_path)

        if HAS_PIL:
            try:
                with Image.open(jpg_path) as im:
                    im = im.convert('RGB')
                    im.save(webp_path, 'WEBP', quality=82, method=6)
                return (fn, "downloaded+webp", os.path.getsize(webp_path))
            except Exception as e:
                return (fn, f"downloaded_only: {e}", os.path.getsize(jpg_path))
        return (fn, "downloaded_jpg", os.path.getsize(jpg_path))
    except Exception as e:
        return (fn, f"error: {e}", 0)

def main():
    urls_to_cache = set()

    # 1. Fallback placeholder
    urls_to_cache.add("https://indian-jewellery.com/core/thumb_images/product_images/773510AQ10CV91077.jpg")

    # 2. Extract from index.html
    index_path = os.path.join(BASE_DIR, 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r', encoding='utf-8') as f:
            content = f.read()
        matches = re.findall(r'(https://indian-jewellery\.com/core/thumb_images/product_images/[a-zA-Z0-9_\-]+\.jpg)', content)
        for m in matches:
            urls_to_cache.add(m)
        # Also any /api/img/ filenames already in index.html
        api_matches = re.findall(r'/api/img/([a-zA-Z0-9_\-]+\.(?:jpg|png|webp))', content)
        for fn in api_matches:
            urls_to_cache.add(f"https://indian-jewellery.com/core/thumb_images/product_images/{fn}")

    # 3. Extract top 300 products from store-data.json
    store_data_path = os.path.join(DATA_DIR, 'store-data.json')
    if os.path.exists(store_data_path):
        with open(store_data_path, 'r', encoding='utf-8') as f:
            d = json.load(f)
        products = d.get('products', [])
        for p in products[:300]:
            if p.get('primaryImg') and 'http' in p['primaryImg']:
                urls_to_cache.add(p['primaryImg'])
            if p.get('hoverImg') and 'http' in p['hoverImg']:
                urls_to_cache.add(p['hoverImg'])

    print(f"Targeting {len(urls_to_cache)} high-priority images for pre-caching...")

    success_count = 0
    total = len(urls_to_cache)

    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(download_and_convert, url): url for url in urls_to_cache}
        for future in as_completed(futures):
            res = future.result()
            if res:
                fn, status, sz = res
                if "error" not in status:
                    success_count += 1
                if success_count % 25 == 0 or success_count == total:
                    print(f"Progress: {success_count}/{total} images cached ({status})")

    print(f"Pre-caching complete! {success_count}/{total} images ready in {CACHE_DIR}.")

if __name__ == '__main__':
    main()
