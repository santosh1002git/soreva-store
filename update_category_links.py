import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Update Shop by Category links
html = html.replace('onclick="document.querySelector(\'.cat-nav-link[data-category=necklace]\').click()"', 'onclick="window.location.href=\'catalog.html?cat=necklace\'"')
html = html.replace('onclick="document.querySelector(\'.cat-nav-link[data-category=earrings]\').click()"', 'onclick="window.location.href=\'catalog.html?cat=earrings\'"')
html = html.replace('onclick="document.querySelector(\'.cat-nav-link[data-category=rings]\').click()"', 'onclick="window.location.href=\'catalog.html?cat=rings\'"')
html = html.replace('onclick="document.querySelector(\'.cat-nav-link[data-category=pendants]\').click()"', 'onclick="window.location.href=\'catalog.html?cat=pendants\'"')
html = html.replace('onclick="document.querySelector(\'.cat-nav-link[data-category=wristwear]\').click()"', 'onclick="window.location.href=\'catalog.html?cat=bracelets\'"')

# Update Hero and Spotlight links
html = html.replace('href="#products-catalog"', 'href="catalog.html"')

# Update the header link in index.html specifically
html = html.replace('<a href="#products-catalog" class="nav-link-btn">Shop</a>', '<a href="catalog.html" class="nav-link-btn">Shop</a>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
