with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

import re
# For .logo-type-inner
css = re.sub(r'clip-path: inset\(0 100% 0 0\);', r'-webkit-clip-path: inset(0 100% 0 0);\n    clip-path: inset(0 100% 0 0);', css)
css = re.sub(r'transition: clip-path', r'transition: -webkit-clip-path 1.4s cubic-bezier(0.25, 1, 0.5, 1), clip-path', css)

# For .logo-type-inner.revealed
if '.logo-type-inner.revealed' not in css:
    css += '\n.logo-type-inner.revealed {\n    -webkit-clip-path: inset(0 0% 0 0);\n    clip-path: inset(0 0% 0 0);\n}\n'
else:
    css = re.sub(r'clip-path: inset\(0 0% 0 0\);', r'-webkit-clip-path: inset(0 0% 0 0);\n    clip-path: inset(0 0% 0 0);', css)

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
