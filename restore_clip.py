import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Restore logoTypeFrame structure
old_frame = r'<div class="logo-type-frame" id="logoTypeFrame">.*?<span class="logo-type-cursor" id="logoTypeCursor"></span>\s*</div>'
new_frame = '''<div class="logo-type-frame" id="logoTypeFrame">
                <div class="logo-type-inner" id="logoTypeInner">
                    <img src="assets/logo-black.png?v=clean2026" alt="Sorèva" class="logo-type-img" id="logoTypeImg">
                </div>
                <span class="logo-type-cursor" id="logoTypeCursor"></span>
            </div>'''
html = re.sub(old_frame, new_frame, html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()
js = js.replace("const logoInner = document.getElementById('logoRevealCover');", "const logoInner = document.getElementById('logoTypeInner');")
with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove the solid cover CSS
css = re.sub(r'\.logo-reveal-cover \{.*?\}', '', css, flags=re.DOTALL)
css = re.sub(r'\.logo-reveal-cover\.revealed \{.*?\}', '', css, flags=re.DOTALL)

# Fix logo-type-frame
css = re.sub(r'\.logo-type-frame \{.*?\}', '.logo-type-frame {\n    position: relative;\n    width: clamp(280px, 38vw, 440px);\n    aspect-ratio: 767 / 200;\n    overflow: visible;\n}', css, flags=re.DOTALL)

# Fix logo-type-img
css = re.sub(r'\.logo-type-img \{.*?\}', '', css, flags=re.DOTALL)

# Add clip-path css back
clip_css = '''
.logo-type-inner {
    position: absolute;
    inset: 0;
    overflow: hidden;
    -webkit-clip-path: inset(0 100% 0 0);
    clip-path: inset(0 100% 0 0);
    transition: -webkit-clip-path 1.4s cubic-bezier(0.25, 1, 0.5, 1), clip-path 1.4s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: clip-path;
}

.logo-type-inner.revealed {
    -webkit-clip-path: inset(0 0% 0 0);
    clip-path: inset(0 0% 0 0);
}

.logo-type-inner .logo-type-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    user-select: none;
    pointer-events: none;
}
'''
css += clip_css

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
