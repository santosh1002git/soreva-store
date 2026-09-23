import re

with open('product.html', 'r', encoding='utf-8') as f:
    html = f.read()

# I will inject pdpMoreDetailsContainer right after pdpDetailsList
target = r'<ul class="product-details-list" id="pdpDetailsList"></ul>'

replacement = r'''<ul class="product-details-list" id="pdpDetailsList"></ul>
                        <div id="pdpMoreDetailsContainer"></div>'''

html = html.replace(target, replacement)

with open('product.html', 'w', encoding='utf-8') as f:
    f.write(html)
