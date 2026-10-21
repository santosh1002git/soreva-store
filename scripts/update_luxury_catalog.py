import json
import sqlite3
import os
import shutil
import time
import re
from datetime import datetime

BASE_DIR = '/Users/sonalbelchada/.gemini/antigravity/scratch/soreva-store'
DATA_DIR = os.path.join(BASE_DIR, 'data')
STORE_DATA_PATH = os.path.join(DATA_DIR, 'store-data.json')
PB_DB_PATH = os.path.join(BASE_DIR, 'pb', 'pb_data', 'data.db')

print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting Luxury Italian Product Catalog Transformation...")

# 1. Backups
backup_ts = int(time.time())
json_backup_path = os.path.join(DATA_DIR, f'store-data.backup.{backup_ts}.json')
db_backup_path = os.path.join(BASE_DIR, 'pb', 'pb_data', f'data.backup.{backup_ts}.db')

shutil.copy2(STORE_DATA_PATH, json_backup_path)
print(f"✓ Backed up store-data.json -> {os.path.basename(json_backup_path)}")

if os.path.exists(PB_DB_PATH):
    shutil.copy2(PB_DB_PATH, db_backup_path)
    print(f"✓ Backed up data.db -> {os.path.basename(db_backup_path)}")

# 2. Curated Italian Luxury Nomenclature
COLLECTIONS = [
    'Aurelia', 'Bellissima', 'Celestia', 'Luce Divina', 'Serenità', 'Eternità', 
    'Splendore', 'Primavera', 'Venezia', 'Firenze', 'Milano', 'Verona', 
    'Portofino', 'Ravello', 'Capri', 'Amalfi', 'Bellagio', 'Soraya', 'Tesoro', 
    'Maestosa', 'Regale', 'Amore', 'Nobile', 'Fiorella', 'Cascata', 'Stellina', 
    'Diamantina', 'Lumina', 'Opulenza', 'Gemma', 'Fortuna', 'Sinfonia', 'Incanto', 
    'Preziosa', 'Notturna', 'Raffinata', 'Vittoria', 'Grazia', 'Miracolo', 
    'Imperiale', 'Armonia', 'Brillante', 'Ciel Sereno', 'Sogno d\'Oro', 'Paradiso', 
    'Elisir', 'Magnifica', 'Principessa', 'Eleganza', 'Donatella', 'Valentina', 
    'Gianna', 'Alessandra', 'Bianca', 'Caterina', 'Francesca', 'Ginevra', 
    'Isabella', 'Luciana', 'Marcella', 'Renata', 'Rosalia', 'Silvia', 'Viviana', 
    'Zephyrina', 'Beatrice', 'Chiara', 'Giordana', 'Loredana', 'Giulietta', 
    'Contessa', 'Duchessa', 'Marchesa', 'Sovrana', 'Aurora', 'Solaria', 'Zaffira', 
    'Smeralda', 'Perla Nobile', 'Fiorita', 'Gioia', 'Favola', 'Lussuria', 'Cristallo', 
    'Fiorenza', 'Barocca', 'Rinascimento', 'Fontana', 'Giardino', 'Valenza', 
    'Siena', 'Bergamo', 'Palermo', 'Sorrento', 'Positano', 'Cortina', 'Como', 
    'Ottavia', 'Flavia', 'Camilla', 'Carlotta', 'Costanza', 'Diletta', 'Elena', 
    'Eloisa', 'Federica', 'Gemma di Luce', 'Ilaria', 'Letizia', 'Lavinia', 
    'Maddalena', 'Marianna', 'Matilde', 'Nicoletta', 'Olimpia', 'Paolina', 
    'Rachele', 'Sveva', 'Tiziana', 'Violante', 'Vittoria Reale', 'Altamura',
    'Bellini', 'Caravaggio', 'Clementina', 'Dolcezza', 'Elettra', 'Floriana',
    'Gelsomina', 'Honoria', 'Idalia', 'Leonora', 'Mirella', 'Novella', 'Ornella',
    'Palatina', 'Querida', 'Romana', 'Santina', 'Taverna', 'Umbria', 'Venezia Mia'
]

STYLES = [
    'Pavé', 'Brilliant', 'Cascading', 'Graduated', 'Chandelier', 'Filigree',
    'Riviera', 'Baroque', 'Tiered', 'Scalloped', 'Solitaire', 'Emerald-Cut',
    'Marquise', 'Baguette', 'Cushion-Cut', 'Pear-Cut', 'Floral', 'Cluster',
    'Halo', 'Luminescent', 'Sculpted', 'Opulent', 'Art Deco', 'Heritage',
    'Flawless', 'Royal Crest', 'Radiant', 'Starlight', 'Intricate', 'Prong-Set',
    'Micro-Pavé', 'Geometric', 'Tapered', 'Bezel-Set', 'Dual-Tone', 'Eternity',
    'Illusion-Set', 'Dainty', 'Statement', 'Vintage Lace', 'Deco-Baguette',
    'Marquise Blossom', 'Star-Cut', 'Prong Solitaire', 'Crown-Set'
]

SILHOUETTES = {
    ('necklace', 'Collar Necklaces'): [
        'Collar Necklace', 'Choker Collier', 'Décolleté Collar', 'Gala Choker',
        'Grandioso Collier', 'Cascade Choker', 'Luxe Collar Necklace', 'Halo Collar'
    ],
    ('necklace', 'Classic Necklaces'): [
        'Riviera Necklace', 'Classic Tennis Necklace', 'Décolleté Pendant Necklace',
        'Solitaire Station Necklace', 'Petite Tennis Necklace', 'Grace Necklace'
    ],
    ('necklace', 'Bridal Necklaces'): [
        'Bridal Parure Collier', 'Wedding Choker Set', 'Grandioso Bridal Necklace',
        'Royal Wedding Collier', 'Majestic Bridal Choker', 'Imperial Gala Necklace'
    ],
    ('necklace', 'Traditional Necklaces'): [
        'Heritage Collar Necklace', 'Antique Choker Set', 'Traditional Parure Collier',
        'Baroque Filigree Necklace', 'Royal Heritage Collar'
    ],
    ('necklace', 'Aurous Collection'): [
        'Golden Radiance Collier', 'Aurous Collar Necklace', '24K Gold Glow Choker',
        'Luminescent Aurous Necklace'
    ],
    ('earrings', 'Big Size Earrings'): [
        'Grand Chandelier Earrings', 'Dramatic Drop Earrings', 'Tiered Gala Danglers',
        'Statement Chandelier Drops', 'Cascading Crystal Earrings'
    ],
    ('earrings', 'Medium Earrings'): [
        'Teardrop Drop Earrings', 'Halo Pear Danglers', 'Cushion Drop Earrings',
        'Sculpted Dangle Earrings', 'Graceful Oval Drops'
    ],
    ('earrings', 'Small Earrings'): [
        'Petite Sparkle Drops', 'Dainty Huggie Earrings', 'Miniature Solitaire Drops',
        'Delicate Crystal Accent Earrings'
    ],
    ('earrings', 'Tops & Studs'): [
        'Round Brilliant Studs', 'Solitaire Crown Studs', 'Marquise Floral Studs',
        'Cushion-Cut Halo Studs', 'Micro-Pavé Button Tops'
    ],
    ('earrings', 'Jhumka Earrings'): [
        'Filigree Bell Jhumkas', 'Dome Chandelier Jhumkas', 'Royal Tiered Jhumkas',
        'Scalloped Heritage Jhumkas'
    ],
    ('earrings', 'Earrings'): [
        'Brilliant Drop Earrings', 'Cascading Gala Danglers', 'Flawless Crystal Drops',
        'Halo Chandelier Earrings'
    ],
    ('silver', '925 Sterling Silver Earrings'): [
        '925 Silver Radiant Drops', '925 Silver Luna Hoops', '925 Silver Pavé Teardrops'
    ],
    ('bracelets', 'CZ Bangles'): [
        'Stacking Pavé Bangle', 'Dual-Row Brilliant Bangle', 'Hinged Kada Bangle',
        'Diamond-Cut Cuff Bangle', 'Polished Pavé Bangle'
    ],
    ('bracelets', 'CZ Bracelets'): [
        'Classic Tennis Bracelet', 'Bolero Sparkle Bracelet', 'Baguette Link Bracelet',
        'Fluid Mesh Tennis Bracelet', 'Prong-Set Sparkle Bracelet'
    ],
    ('bracelets', 'Bracelets Rings Combo'): [
        'Hathphool Bangle & Ring Suite', 'Hand-Harness Crystal Parure', 'Wrist-to-Finger Gala Jewel'
    ],
    ('rings', 'Finger Rings'): [
        'Solitaire Engagement Ring', 'Continuous Eternity Band', 'Halo Cocktail Ring',
        'Wrap Diamond-Cut Ring', 'Three-Stone Statement Ring', 'Blossom Pavé Ring'
    ],
    ('rings', '925 Sterling Silver Rings'): [
        '925 Silver Solitaire Ring', '925 Silver Pavé Band', '925 Silver Minimalist Stack Ring'
    ],
    ('pendants', 'CZ Pendant Sets'): [
        'Teardrop Pendant & Earrings Set', 'Halo Brilliant Pendant Parure', 'Floral Medallion Pendant Suite'
    ],
    ('pendants', 'Pendant With Medium Chain'): [
        'Solitaire Pendant with Italian Chain', 'Floating Crystal Pendant', 'Teardrop Halo Chain Pendant'
    ],
    ('pendants', 'Pendant With Broad Chain'): [
        'Statement Medallion on Venetian Chain', 'Sculpted Pendant on Bold Chain', 'Royal Crest Pendant Necklace'
    ],
    ('pendants', 'CZ Mangalsutra'): [
        'Contemporary CZ Mangalsutra', 'Auspicious Sacred Black Bead Necklace', 'Diamond-Cut Sacred Mangalsutra'
    ],
    ('pendants', '925 Sterling Silver Pendants'): [
        '925 Silver Celestial Pendant', '925 Silver Minimalist Drop Pendant'
    ],
    ('accessories', 'CZ Maang Tikka'): [
        'Forehead Diadem Maang Tikka', 'Chand Nuziale Maang Tikka', 'Cascading Pearl & CZ Tikka'
    ],
    ('accessories', 'CZ Brooch'): [
        'Sculpted Crystal Crest Brooch', 'Floral Pavé Statement Brooch', 'Baroque Royal Brooch'
    ],
    ('accessories', 'CZ Accessories'): [
        'Handcrafted Crystal Hair Ornament', 'Luxe Decorative CZ Accessory'
    ]
}

DESC_INTROS = [
    "Sculpted with quintessential Italian haute joaillerie finesse",
    "Inspired by the radiant glamour of Milanese high fashion ateliers",
    "Embodying the timeless romantic elegance of Venetian craftsmanship",
    "Masterfully handcrafted with exquisite Florentine jewellery artistry",
    "A captivating showcase of modern Italian luxury and radiant sparkle",
    "Designed to capture the luminous splendour of the Amalfi coast",
    "Artfully conceived in the grand tradition of Roman demi-fine luxury",
    "A breathtaking statement piece exuding sophisticated Italian glamour",
    "Drawing inspiration from the historic architectural grandeur of Rome",
    "Infused with the enchanting romance and luminous allure of Lake Como"
]

DESC_CRAFTS = [
    "brilliant-cut AAA+ Austrian cubic zirconia crystals with diamond-grade optical fire",
    "hand-selected AAA+ cubic zirconia crystals precision-cut with 57 refractive facets",
    "hand-set AAA+ cubic zirconia stones delivering peerless clarity and luminescence",
    "master-cut AAA+ Austrian crystals that rival the fire of flawless mined solitaires",
    "high-dispersion AAA+ cubic zirconia crystals set with seamless pave precision",
    "dazzling multi-faceted cubic zirconia stones sculpted for optimal light refraction"
]

DESC_FINISH = [
    "sealed in our proprietary triple anti-tarnish micro-plating for an enduring high-mirror glow",
    "protected with a hypoallergenic anti-tarnish e-coating to preserve its immaculate luster",
    "finished with a multi-layered anti-oxidation barrier for radiant durability and skin-friendly comfort",
    "treated with our signature nano-sealed anti-tarnish guard for lasting shine through all celebrations"
]

DESC_OCCASIONS = [
    "Perfect for lavish weddings, black-tie galas, and unforgettable evening celebrations.",
    "A sublime companion for celebratory soirees, festive gatherings, and red-carpet moments.",
    "Effortlessly elevates festive attire and evening couture with an air of regal poise.",
    "Designed for the discerning woman who appreciates refined luxury and effortless grace.",
    "An exquisite gift of enduring sentiment, perfect for milestone anniversaries and celebrations.",
    "Flawlessly transitions from sophisticated daylight occasions to enchanting candlelit dinners."
]

def generate_italian_name(p, index, used_names):
    cat = (p.get('category') or 'necklace').lower()
    subcat = p.get('subCategory', '')
    silhouettes = SILHOUETTES.get((cat, subcat))
    if not silhouettes:
        silhouettes = [f"{cat.title()} Piece", f"{cat.title()} Design", f"{cat.title()} Accent"]
    
    n_coll = len(COLLECTIONS)
    n_styl = len(STYLES)
    n_silh = len(silhouettes)
    
    c_idx = (index * 7) % n_coll
    s_idx = (index * 13) % n_styl
    sil_idx = (index * 19) % n_silh
    
    coll = COLLECTIONS[c_idx]
    style = STYLES[s_idx]
    sil = silhouettes[sil_idx]
    
    candidate = f"{coll} {style} {sil}"
    
    k = 1
    while candidate in used_names:
        c_idx = (c_idx + 1) % n_coll
        s_idx = (s_idx + 2) % n_styl
        sil_idx = (sil_idx + 1) % n_silh
        coll = COLLECTIONS[c_idx]
        style = STYLES[s_idx]
        sil = silhouettes[sil_idx]
        candidate = f"{coll} {style} {sil}"
        k += 1
        if k > 500:
            candidate = f"{coll} {style} {sil} No. {k}"
            break
            
    used_names.add(candidate)
    return candidate

def generate_brief_description(name, cat, subcat, plating, sku, model_code, index):
    sub_lower = (subcat or '').lower()
    plat_lower = (plating or '').lower()
    
    if 'silver' in plat_lower or '925' in sub_lower:
        metal = "platinum-rhodium finished 925 sterling silver"
    elif 'rose' in plat_lower:
        metal = "warm 24K rose gold"
    else:
        metal = "radiant 24K yellow gold"

    is_plural = any(name.endswith(s) for s in ['Earrings', 'Studs', 'Bangles', 'Drops', 'Jhumkas', 'Tops', 'Danglers', 'Hoops'])
    verb = "feature" if is_plural else "features"

    intro = DESC_INTROS[(index * 3) % len(DESC_INTROS)]
    craft = DESC_CRAFTS[(index * 5) % len(DESC_CRAFTS)]
    finish = DESC_FINISH[(index * 7) % len(DESC_FINISH)]
    occasion = DESC_OCCASIONS[(index * 11) % len(DESC_OCCASIONS)]
    
    desc = f"{intro}, the {name} {verb} {craft}. Hand-finished in {metal} and {finish}. {occasion}"
    if model_code:
        desc += f" Authenticity Ref: {model_code}."
    return desc

# 3. Read store-data.json
with open(STORE_DATA_PATH, 'r', encoding='utf-8') as f:
    store_data = json.load(f)

products = store_data.get('products', [])
print(f"✓ Read {len(products)} products from store-data.json")

used_names = set()
product_map = {} # id -> (name, description)

for idx, p in enumerate(products):
    old_name = p.get('name', '')
    old_desc = p.get('description', '')
    
    # Extract model number if present
    m = re.search(r'Model:\s*([A-Za-z0-9_-]+)', old_desc)
    model_num = m.group(1) if m else p.get('sku', '').replace('CZM-', '')
    model_code = f"SRV-{model_num}" if model_num else f"SRV-{p.get('id', '')}"
    
    new_name = generate_italian_name(p, idx, used_names)
    new_desc = generate_brief_description(
        name=new_name,
        cat=p.get('category'),
        subcat=p.get('subCategory'),
        plating=p.get('plating'),
        sku=p.get('sku'),
        model_code=model_code,
        index=idx
    )
    
    p['name'] = new_name
    p['description'] = new_desc
    product_map[p.get('id')] = (new_name, new_desc, old_name)

print(f"✓ Generated {len(used_names)} unique Italian luxury names and descriptions")

# Update heroSlides to match product names
if 'heroSlides' in store_data:
    for slide in store_data['heroSlides']:
        pid = slide.get('productId')
        if pid and pid in product_map:
            slide['name'] = product_map[pid][0]
    print(f"✓ Synchronized {len(store_data['heroSlides'])} hero slides with new product names")

# Atomic save store-data.json
temp_json = STORE_DATA_PATH + '.tmp'
with open(temp_json, 'w', encoding='utf-8') as f:
    json.dump(store_data, f, indent=2, ensure_ascii=False)
os.replace(temp_json, STORE_DATA_PATH)
print("✓ Saved updated store-data.json successfully")

# 4. Update SQLite database (pb/pb_data/data.db)
if os.path.exists(PB_DB_PATH):
    conn = sqlite3.connect(PB_DB_PATH, timeout=20)
    c = conn.cursor()
    
    prod_updates = 0
    inv_updates = 0
    
    for pid, (new_name, new_desc, old_name) in product_map.items():
        c.execute("UPDATE products SET name = ?, description = ? WHERE id = ?", (new_name, new_desc, pid))
        prod_updates += c.rowcount
        
        c.execute("UPDATE inventory SET productName = ? WHERE id = ?", (new_name, pid))
        inv_updates += c.rowcount
        
    conn.commit()
    conn.close()
    print(f"✓ SQLite database updated: {prod_updates} products, {inv_updates} inventory records")

print(f"[{datetime.now().strftime('%H:%M:%S')}] Catalog Transformation Complete!")
