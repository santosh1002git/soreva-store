with open('product.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = '</ul>\n                        </div>\n\n                        <!-- Finishes -->'
replacement = '</ul>\n                        <div id="pdpMoreDetailsContainer"></div>\n                        </div>\n\n                        <!-- Finishes -->'
html = html.replace(target, replacement)

with open('product.html', 'w', encoding='utf-8') as f:
    f.write(html)
