#!/usr/bin/env python3
"""
Soreva High-Speed Image Pre-cacher & WebP Optimizer.
Pre-warms product images into data/img_cache/ so customers experience instant 1ms loads.
Directly reads from SQLite (data.db) to maintain zero memory footprint.
"""

import os
import sys
import re
import time
import argparse
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
PB_DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')
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
    """Downloads an image if missing and generates a fast, optimized WebP counterpart."""
    if not url or not isinstance(url, str):
        return None
    fn = os.path.basename(url.split('?')[0])
    if not fn or fn in ('.', '..'):
        return None

    name_no_ext, ext = os.path.splitext(fn)
    if not ext:
        ext = '.jpg'
        fn = name_no_ext + ext

    jpg_path = os.path.join(CACHE_DIR, fn)
    webp_path = os.path.join(CACHE_DIR, f"{name_no_ext}.webp")

    # Already cached and converted
    if os.path.exists(jpg_path) and os.path.getsize(jpg_path) > 0 and (not HAS_PIL or (os.path.exists(webp_path) and os.path.getsize(webp_path) > 0)):
        return (fn, "cached", os.path.getsize(webp_path if (HAS_PIL and os.path.exists(webp_path)) else jpg_path))

    # JPG exists, but WebP missing
    if os.path.exists(jpg_path) and os.path.getsize(jpg_path) > 0:
        if HAS_PIL:
            try:
                with Image.open(jpg_path) as im:
                    rgb = im.convert('RGB')
                    rgb.save(webp_path, 'WEBP', quality=80, method=3)
                return (fn, "converted_webp", os.path.getsize(webp_path))
            except Exception as e:
                return (fn, f"convert_fail: {e}", os.path.getsize(jpg_path))
        return (fn, "cached_jpg", os.path.getsize(jpg_path))

    # Download from remote origin
    remote_url = url
    if not remote_url.startswith('http'):
        remote_url = f"https://indian-jewellery.com/core/thumb_images/product_images/{fn}"

    try:
        req = urllib.request.Request(remote_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            content = resp.read()

        if len(content) < 100:
            return (fn, "too_small", len(content))

        tmp_jpg = f"{jpg_path}.tmp.{os.getpid()}_{time.time_ns()}"
        with open(tmp_jpg, 'wb') as f:
            f.write(content)
        os.replace(tmp_jpg, jpg_path)

        if HAS_PIL:
            try:
                with Image.open(jpg_path) as im:
                    rgb = im.convert('RGB')
                    rgb.save(webp_path, 'WEBP', quality=80, method=3)
                return (fn, "downloaded+webp", os.path.getsize(webp_path))
            except Exception as e:
                return (fn, f"downloaded_only: {e}", os.path.getsize(jpg_path))

        return (fn, "downloaded_jpg", os.path.getsize(jpg_path))
    except Exception as e:
        return (fn, f"error: {e}", 0)

def collect_urls(mode='priority', category=None):
    """Collects target image URLs based on priority or category filter."""
    urls = set()

    # 1. Critical Static & Hero Images
    for html_file in ['index.html', 'catalog.html', 'product.html']:
        hp = os.path.join(BASE_DIR, html_file)
        if os.path.exists(hp):
            with open(hp, 'r', encoding='utf-8') as f:
                c = f.read()
            for m in re.findall(r'https://indian-jewellery\.com/core/thumb_images/product_images/([a-zA-Z0-9_\-]+\.jpg)', c):
                urls.add(f"https://indian-jewellery.com/core/thumb_images/product_images/{m}")
            for m in re.findall(r'/api/img/([a-zA-Z0-9_\-]+\.(?:jpg|png|webp))', c):
                urls.add(f"https://indian-jewellery.com/core/thumb_images/product_images/{m}")

    # 2. SQLite Product Database Queries
    if os.path.exists(PB_DB_PATH):
        import sqlite3
        con = sqlite3.connect(PB_DB_PATH)
        cur = con.cursor()

        if mode == 'all':
            print("Mode: FULL CATALOG (All 11,000+ items)...")
            cur.execute("SELECT primaryImg, hoverImg FROM products WHERE active = 1 AND (disabled IS NULL OR disabled = 0)")
            for r in cur.fetchall():
                if r[0] and 'http' in r[0]: urls.add(r[0])
                if r[1] and 'http' in r[1]: urls.add(r[1])
        elif category:
            print(f"Mode: CATEGORY '{category}'...")
            cur.execute("SELECT primaryImg, hoverImg FROM products WHERE category = ? AND active = 1", (category,))
            for r in cur.fetchall():
                if r[0] and 'http' in r[0]: urls.add(r[0])
                if r[1] and 'http' in r[1]: urls.add(r[1])
        else:
            # High-Priority Default: Curated Badges + Top 150 of every category
            print("Mode: PRIORITY (Curations, Hero Banners & Top 150 per category)...")
            cur.execute("SELECT primaryImg, hoverImg FROM products WHERE badge IN ('New Launch', 'Trending', 'Bestseller')")
            for r in cur.fetchall():
                if r[0] and 'http' in r[0]: urls.add(r[0])
                if r[1] and 'http' in r[1]: urls.add(r[1])

            cats = ['necklace', 'earrings', 'wristwear', 'rings', 'pendants', 'silver', 'accessories']
            for c in cats:
                cur.execute("SELECT primaryImg, hoverImg FROM products WHERE category = ? AND active = 1 LIMIT 150", (c,))
                for r in cur.fetchall():
                    if r[0] and 'http' in r[0]: urls.add(r[0])
                    if r[1] and 'http' in r[1]: urls.add(r[1])
        con.close()

    return list(urls)

def main():
    parser = argparse.ArgumentParser(description="Soreva High-Speed Image Pre-Cacher")
    parser.add_argument('--all', action='store_true', help='Pre-cache all 11,000+ products in catalog')
    parser.add_argument('--category', type=str, default=None, help='Pre-cache only a specific category')
    parser.add_argument('--workers', type=int, default=16, help='Number of parallel download threads (default: 16)')
    args = parser.parse_args()

    mode = 'all' if args.all else ('category' if args.category else 'priority')
    urls = collect_urls(mode=mode, category=args.category)
    total = len(urls)

    print(f"\n==================================================")
    print(f"  SORÈVA HIGH-SPEED IMAGE CACHE WARMER")
    print(f"  Target: {total} priority product images")
    print(f"  Workers: {args.workers} concurrent threads")
    print(f"  Destination: {CACHE_DIR}")
    print(f"==================================================\n")

    t_start = time.time()
    cached_count = 0
    downloaded_count = 0
    converted_count = 0
    failed_count = 0

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(download_and_convert, u): u for u in urls}
        processed = 0

        for future in as_completed(futures):
            processed += 1
            res = future.result()
            if res:
                fn, status, sz = res
                if status == 'cached':
                    cached_count += 1
                elif status == 'downloaded+webp':
                    downloaded_count += 1
                    converted_count += 1
                elif 'downloaded' in status:
                    downloaded_count += 1
                elif 'converted' in status:
                    converted_count += 1
                else:
                    failed_count += 1

            if processed % 50 == 0 or processed == total:
                elapsed = time.time() - t_start
                rate = processed / elapsed if elapsed > 0 else 0
                eta = (total - processed) / rate if rate > 0 else 0
                print(f"[{processed}/{total}] {processed/total*100:5.1f}% | "
                      f"Cached: {cached_count} | Downloaded: {downloaded_count} | WebP: {converted_count} | "
                      f"Speed: {rate:.1f} img/s | ETA: {eta:.0f}s")

    t_total = time.time() - t_start
    print(f"\n==================================================")
    print(f"✓ Cache Warming Finished in {t_total:.1f}s")
    print(f"  Total processed: {total}")
    print(f"  Already cached:  {cached_count}")
    print(f"  Newly downloaded:{downloaded_count}")
    print(f"  WebP converted:  {converted_count}")
    print(f"  Failed/Missing:  {failed_count}")
    print(f"==================================================\n")

if __name__ == '__main__':
    main()
