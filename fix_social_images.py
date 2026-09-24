import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the 6 images in social-grid with the 6 known valid images
valid_images = [
    "https://indian-jewellery.com/core/thumb_images/product_images/773510AQ10CV91077.jpg",
    "https://indian-jewellery.com/core/thumb_images/product_images/772822AQ10CV89682.jpg",
    "https://indian-jewellery.com/core/thumb_images/product_images/774356AQ10CV89451.jpg",
    "https://indian-jewellery.com/core/thumb_images/product_images/772844AQ10CV87349.jpg",
    "https://indian-jewellery.com/core/thumb_images/product_images/7710446AQ10SD25527.jpg",
    "https://indian-jewellery.com/core/thumb_images/product_images/7710431AQ10SD25526.jpg"
]

def replacer(match):
    global idx
    new_src = valid_images[idx]
    idx += 1
    return match.group(1) + new_src + match.group(3)

idx = 0
# The pattern to match the images inside social-item
# <img class="social-img" src="..." alt="...">
html = re.sub(r'(<img class="social-img" src=")([^"]+)(" alt="[^"]+">)', replacer, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
