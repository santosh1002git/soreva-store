import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the extra brace
js = js.replace('    initProductPage(); // Load product page logic after products are populated\n}\n}', '    initProductPage(); // Load product page logic after products are populated\n}')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
