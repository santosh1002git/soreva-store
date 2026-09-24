with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the premature call from initApp
js = js.replace("if (typeof initProductPage === 'function') initProductPage();\n    if (typeof loadStoreDataAndInit === 'function') loadStoreDataAndInit();", "if (typeof loadStoreDataAndInit === 'function') loadStoreDataAndInit();")

# Add the call to applyStoreData
import re
js = re.sub(r'(PRODUCTS = data\.products;\s*renderProducts\(\);)', r'\1\n        if (typeof initProductPage === \'function\') initProductPage();', js)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
