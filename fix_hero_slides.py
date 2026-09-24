with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add let HERO_SLIDES = []; right after let PRODUCTS = [...];
import re
js = re.sub(r'(let PRODUCTS = \[.*?\];)', r'\1\nlet HERO_SLIDES = [];', js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
