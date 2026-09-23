import re

for filename in ['index.html', 'catalog.html', 'product.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()

    html = html.replace('<a href="catalog.html" onclick="window.location.href=\'catalog.html?cat=necklace\'">', '<a href="catalog.html?cat=necklace">')
    html = html.replace('<a href="catalog.html" onclick="window.location.href=\'catalog.html?cat=earrings\'">', '<a href="catalog.html?cat=earrings">')
    html = html.replace('<a href="catalog.html" onclick="window.location.href=\'catalog.html?cat=rings\'">', '<a href="catalog.html?cat=rings">')
    html = html.replace('<a href="catalog.html" onclick="window.location.href=\'catalog.html?cat=pendants\'">', '<a href="catalog.html?cat=pendants">')
    html = html.replace('<a href="catalog.html" onclick="window.location.href=\'catalog.html?cat=bracelets\'">', '<a href="catalog.html?cat=bracelets">')
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html)
