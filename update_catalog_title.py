import re

with open('catalog.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<h2 class="section-title">The <em>Catalog</em></h2>', '<h2 class="section-title" id="catalogTitle">The <em>Catalog</em></h2>')
html = html.replace('<p class="section-desc">Filter and explore our meticulously handcrafted luxury pieces.</p>', '<p class="section-desc" id="catalogDesc">Filter and explore our meticulously handcrafted luxury pieces.</p>')

with open('catalog.html', 'w', encoding='utf-8') as f:
    f.write(html)
