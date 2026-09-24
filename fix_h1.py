with open('catalog.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
html = re.sub(r'<h1>.*?</h1>', r'<h1 id="pageTitleH1">The Catalog</h1>', html, count=1)

with open('catalog.html', 'w', encoding='utf-8') as f:
    f.write(html)
