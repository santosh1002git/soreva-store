import json

with open('data/store-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])
print(f"Total products: {len(products)}")

items = [p for p in products if not p.get('disabled') and p.get('active') not in (False, 0) and p.get('stockStatus') != 'Disabled']
print(f"Active items: {len(items)}")

activeFilter = 'all'
if activeFilter != 'all':
    items = [p for p in items if p.get('category') == activeFilter]

print(f"After category filter: {len(items)}")
