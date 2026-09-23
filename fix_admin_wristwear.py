import re

with open('admin.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Change value="wristwear" to value="bracelets"
html = html.replace('<option value="wristwear">Wristwear</option>', '<option value="bracelets">Wristwear</option>')

with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(html)
