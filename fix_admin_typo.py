import re

with open('admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace fetchStoreData with loadStoreData
js = js.replace('fetchStoreData(); // Refresh UI', 'loadStoreData(); // Refresh UI')

with open('admin.js', 'w', encoding='utf-8') as f:
    f.write(js)
