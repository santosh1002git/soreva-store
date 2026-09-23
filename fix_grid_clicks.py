import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Change image wrapper click from Quick View to product page
js = js.replace('<div class="product-img-wrapper" onclick="openQuickView(\'${product.id}\')">', '<div class="product-img-wrapper" style="cursor: pointer;" onclick="window.location.href=\'product.html?id=${product.id}\'">')

# Change product title to be a link to product page
js = js.replace('<h3 class="product-title">${product.name}</h3>', '<h3 class="product-title" style="cursor: pointer;" onclick="window.location.href=\'product.html?id=${product.id}\'">${product.name}</h3>')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
