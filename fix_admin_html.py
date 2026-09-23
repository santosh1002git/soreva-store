import re

with open('admin.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<th>Badge</th>\n                                    <th>Rating</th>', '<th>Badge</th>\n                                    <th>Status</th>')

with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(html)
