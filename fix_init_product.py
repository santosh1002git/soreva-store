import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add to applyStoreData
js = js.replace('        renderSocialFeed(data.instagram);\n    }', '        renderSocialFeed(data.instagram);\n    }\n    initProductPage(); // Load product page logic after products are populated\n}')

# Remove from initApp
js = js.replace('    loadStoreDataAndInit();\n    initProductPage();\n}', '    loadStoreDataAndInit();\n}')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
