import re

with open('admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the API endpoint in quickEditBadge and toggleProductDisable
js = js.replace("fetch('/api/db/products/save'", "fetch('/api/db/products/update'")

with open('admin.js', 'w', encoding='utf-8') as f:
    f.write(js)
