import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add onerror to hover-img
js = js.replace('<img class="product-thumb hover-img" src="${hoverImg}" alt="${product.name}" loading="lazy">', '<img class="product-thumb hover-img" src="${hoverImg}" alt="${product.name}" loading="lazy" onerror="this.style.display=\'none\';">')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
