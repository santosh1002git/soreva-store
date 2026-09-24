with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

import re

# Remove clip-path stuff
css = re.sub(r'-webkit-clip-path:.*?;', '', css)
css = re.sub(r'clip-path:.*?;', '', css)
css = re.sub(r'will-change: clip-path;', 'will-change: width;', css)
css = re.sub(r'transition: -webkit-clip-path.*?;', 'transition: width 1.4s cubic-bezier(0.25, 1, 0.5, 1);', css)

# Add width animation to .logo-type-inner
css = re.sub(r'\.logo-type-inner \{', r'.logo-type-inner {\n    width: 0%;\n    border-right: 0px solid transparent;', css)

# Update .logo-type-inner.revealed
css = re.sub(r'\.logo-type-inner\.revealed \{', r'.logo-type-inner.revealed {\n    width: 100%;', css)

# Update logo-type-img to not shrink
css = re.sub(r'width: 100%;\n    height: 100%;\n    object-fit: contain;', r'width: clamp(280px, 38vw, 440px);\n    height: 100%;\n    object-fit: contain;\n    object-position: left center;', css)

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
