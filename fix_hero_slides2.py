with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add let HERO_SLIDES = []; at the top
js = "let HERO_SLIDES = [];\n" + js

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
