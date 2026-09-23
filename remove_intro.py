import re

for filename in ['catalog.html', 'product.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()

    # Match the entire innovative-atelier-entry section
    html = re.sub(r'<!-- SORÈVA INNOVATIVE ATELIER ENTRY.*?<!-- TOP PROMOTIONAL ANNOUNCEMENT TICKER -->', '<!-- TOP PROMOTIONAL ANNOUNCEMENT TICKER -->', html, flags=re.DOTALL)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html)
