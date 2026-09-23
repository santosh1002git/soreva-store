import re

with open('product.html', 'r', encoding='utf-8') as f:
    html = f.read()

target = r'<div class="product-finish-options" id="pdpFinishOptions">'

replacement = r'''<div id="pdpMoreDetailsContainer"></div>
                
                <div class="product-finish-options" id="pdpFinishOptions">'''

html = html.replace(target, replacement)

with open('product.html', 'w', encoding='utf-8') as f:
    f.write(html)
