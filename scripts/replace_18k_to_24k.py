import os
import re
import json
import sqlite3

BASE_DIR = '/Users/sonalbelchada/.gemini/antigravity/scratch/soreva-store'

TEXT_FILES = [
    'index.html',
    'catalog.html',
    'admin.html',
    'portal.html',
    'admin.js',
    'portal.js',
    'server.py',
    'scripts/update_luxury_catalog.py',
    'scripts/fetch_czmakers.py',
    'data/store-data.json',
    'data/czmakers_all_products.json'
]

print("=== Starting 18K -> 24K Gold Replacement ===")

# Function to replace preserving case
def replace_gold(match):
    full = match.group(0)
    # Check case of 18k
    if full.startswith('18K'):
        prefix = '24K'
    elif full.startswith('18k'):
        prefix = '24k'
    else:
        prefix = '24K'
    return prefix + full[3:]

pattern = re.compile(r'18[kK](?=\s*[-_]?\s*(?:gold|yellow|rose|plated|glow|white|finish|micro))|18[kK]\b', re.IGNORECASE)

for rel_path in TEXT_FILES:
    fpath = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(fpath):
        print(f"! Skipping missing file: {rel_path}")
        continue
    
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Specific targeted replacements first
    new_content = content
    # Handle standard variants
    new_content = re.sub(r'18K Gold', '24K Gold', new_content)
    new_content = re.sub(r'18k Gold', '24K Gold', new_content)
    new_content = re.sub(r'18K gold', '24K gold', new_content)
    new_content = re.sub(r'18k gold', '24k gold', new_content)
    new_content = re.sub(r'18K Yellow', '24K Yellow', new_content)
    new_content = re.sub(r'18k Yellow', '24K Yellow', new_content)
    new_content = re.sub(r'18K yellow', '24K yellow', new_content)
    new_content = re.sub(r'18k yellow', '24k yellow', new_content)
    new_content = re.sub(r'18K Rose', '24K Rose', new_content)
    new_content = re.sub(r'18k Rose', '24K Rose', new_content)
    new_content = re.sub(r'18K rose', '24K rose', new_content)
    new_content = re.sub(r'18k rose', '24k rose', new_content)
    new_content = re.sub(r'18K Plated', '24K Plated', new_content)
    new_content = re.sub(r'18k Plated', '24K Plated', new_content)
    
    # Catch any remaining 18K in quotes or tags or names
    new_content = re.sub(r'\b18K\b', '24K', new_content)
    new_content = re.sub(r'\b18k\b', '24k', new_content)
    
    if new_content != content:
        diff_count = len(re.findall(r'24[kK]', new_content)) - len(re.findall(r'24[kK]', content))
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✓ Updated {rel_path} (+{diff_count} 24K replacements)")
    else:
        print(f"- No changes needed in {rel_path}")

# SQLite Database update
DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')
if os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH, timeout=20)
    c = conn.cursor()
    
    # 1. products table
    c.execute("""
        UPDATE products 
        SET description = REPLACE(REPLACE(description, '18K', '24K'), '18k', '24k')
        WHERE description LIKE '%18k%' OR description LIKE '%18K%'
    """)
    prod_desc_rows = c.rowcount
    
    c.execute("""
        UPDATE products 
        SET name = REPLACE(REPLACE(name, '18K', '24K'), '18k', '24k')
        WHERE name LIKE '%18k%' OR name LIKE '%18K%'
    """)
    prod_name_rows = c.rowcount
    
    # 2. inventory table
    c.execute("""
        UPDATE inventory 
        SET productName = REPLACE(REPLACE(productName, '18K', '24K'), '18k', '24k')
        WHERE productName LIKE '%18k%' OR productName LIKE '%18K%'
    """)
    inv_rows = c.rowcount
    
    # 3. orders table
    c.execute("""
        UPDATE orders 
        SET itemsSummary = REPLACE(REPLACE(itemsSummary, '18K', '24K'), '18k', '24k')
        WHERE itemsSummary LIKE '%18k%' OR itemsSummary LIKE '%18K%'
    """)
    order_rows = c.rowcount
    
    conn.commit()
    conn.close()
    print(f"✓ SQLite database updated:")
    print(f"   products.description: {prod_desc_rows} rows")
    print(f"   products.name:        {prod_name_rows} rows")
    print(f"   inventory.productName: {inv_rows} rows")
    print(f"   orders.itemsSummary:   {order_rows} rows")

print("=== Replacement Complete ===")
