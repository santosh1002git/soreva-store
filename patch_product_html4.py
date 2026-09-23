with open('product.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = '</ul>\n                        </div>'
replacement = '</ul>\n                        </div>\n                        <div id="pdpMoreDetailsContainer"></div>'
html = html.replace(target, replacement)

with open('product.html', 'w', encoding='utf-8') as f:
    f.write(html)
