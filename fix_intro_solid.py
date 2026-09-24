import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the current logo-type-frame HTML
old_frame = r'<div class="logo-type-frame" id="logoTypeFrame">.*?<span class="logo-type-cursor" id="logoTypeCursor"></span>'
new_frame = '''<div class="logo-type-frame" id="logoTypeFrame">
                <img src="assets/logo-black.png?v=clean2026" alt="Sorèva" class="logo-type-img" id="logoTypeImg">
                <div class="logo-reveal-cover" id="logoRevealCover"></div>
                <span class="logo-type-cursor" id="logoTypeCursor"></span>'''

html = re.sub(old_frame, new_frame, html, flags=re.DOTALL)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)


with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace the CSS for logo-type-inner etc with the new solid cover approach
css = re.sub(r'\.logo-type-frame \{.*?\}', '.logo-type-frame {\n    position: relative;\n    width: clamp(280px, 38vw, 440px);\n    aspect-ratio: 767 / 200;\n    overflow: hidden;\n}', css, flags=re.DOTALL)

css = re.sub(r'\.logo-type-inner \{.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'\.logo-type-inner\.revealed \{.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'\.logo-type-inner \.logo-type-img \{.*?\}', '', css, flags=re.DOTALL)

# Add the new rules
new_css = '''
.logo-type-img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
}

.logo-reveal-cover {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #fbf8f5;
    z-index: 2;
    transition: transform 1.4s cubic-bezier(0.25, 1, 0.5, 1);
}

.logo-reveal-cover.revealed {
    transform: translateX(100%);
}

.logo-type-cursor {
    position: absolute;
    top: 2%;
    left: 0%;
    width: 3px;
    height: 96%;
    background-color: #c5a059;
    box-shadow: 0 0 12px rgba(197, 160, 89, 0.9), 0 0 4px #c5a059;
    border-radius: 2px;
    z-index: 3;
    transition: left 1.4s cubic-bezier(0.25, 1, 0.5, 1);
}

.logo-type-cursor.revealed {
    left: 100%;
}
'''
css += new_css

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)


with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Update app.js to use logoRevealCover instead of logoInner
js = js.replace("const logoInner = document.getElementById('logoTypeInner');", "const logoInner = document.getElementById('logoRevealCover');")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
