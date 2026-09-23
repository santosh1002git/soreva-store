import re

with open('admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Update search to include description (which holds the SKU/Distributor Model)
search_logic = r"items = items.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.subCategory && p.subCategory.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.id && String(p.id).toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q)));"

js = re.sub(r'items = items\.filter\(p => \(p\.name && p\.name\.toLowerCase\(\)\.includes\(q\)\).*?\);', search_logic, js)

with open('admin.js', 'w', encoding='utf-8') as f:
    f.write(js)
