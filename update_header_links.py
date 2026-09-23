import re

for filename in ['catalog.html', 'product.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()

    html = html.replace('href="#products-catalog"', 'href="catalog.html"')
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html)
