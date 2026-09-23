import sqlite3
import re

conn = sqlite3.connect('pb/pb_data/data.db')
c = conn.cursor()

# Get all products and their descriptions
products = c.execute("SELECT id, description FROM products").fetchall()

updated = 0
for pid, desc in products:
    match = re.search(r'Distributor Model:\s*([A-Za-z0-9-]+)', desc)
    if match:
        original_sku = match.group(1)
        c.execute("UPDATE inventory SET sku = ? WHERE id = ?", (original_sku, pid))
        updated += 1

conn.commit()
conn.close()
print(f"Updated {updated} SKUs in inventory table.")
