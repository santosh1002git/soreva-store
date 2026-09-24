import re
import json

with open('data/store-data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

products = data.get('products', [])
def get_img(idx):
    if idx < len(products):
        return products[idx].get('primaryImg', '')
    return ''

# Map areas to product indices (just picking random beautiful products from the top 50)
images_to_use = [get_img(i) for i in [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90]]

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace all occurrences of assets/logo-black.png?v=clean2026 EXCEPT the actual logo!
# Wait, the actual logo is in:
# <img src="assets/logo-black.png?v=clean2026" alt="Sorèva" class="logo-type-img" id="logoTypeImg">
# <img src="assets/logo-black.png?v=clean2026" alt="Sorèva" class="nav-logo">

# So we can find all <img ... src="assets/logo-black.png?v=clean2026" ...> that do NOT have alt="Sorèva"
def replace_img(match):
    global img_idx
    if 'alt="Sorèva"' in match.group(0):
        return match.group(0)
    
    res = match.group(0).replace('assets/logo-black.png?v=clean2026', images_to_use[img_idx % len(images_to_use)])
    img_idx += 1
    return res

img_idx = 0
html = re.sub(r'<img[^>]*src="assets/logo-black\.png\?v=clean2026"[^>]*>', replace_img, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
