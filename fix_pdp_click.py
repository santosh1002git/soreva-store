with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace onclick="openQuickView('${product.id}')" with window.location.href
old_onclick = '''<div class="product-card" data-id="${product.id}" onclick="openQuickView('${product.id}')">'''
new_onclick = '''<div class="product-card" data-id="${product.id}" onclick="window.location.href='product.html?id=${product.id}'" style="cursor: pointer;">'''

js = js.replace(old_onclick, new_onclick)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('styles.css', 'a', encoding='utf-8') as f:
    f.write("\n.price-original { text-decoration: line-through; opacity: 0.7; }\n")
