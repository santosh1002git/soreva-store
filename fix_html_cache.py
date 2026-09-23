import re

for file in ['index.html', 'catalog.html', 'product.html']:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    html = html.replace('app.js?v=20260922_exact', 'app.js?v=20260923_chatbot')
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

with open('admin.html', 'r', encoding='utf-8') as f:
    admin = f.read()
admin = admin.replace('admin.js', 'admin.js?v=20260923_sync')
with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(admin)

