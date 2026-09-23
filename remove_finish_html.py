with open('product.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
# We want to remove the div block with Select Finish
# Let's find it.
block_pattern = r'<div style="margin-bottom: 30px;">\s*<h4[^>]*>Select Finish</h4>\s*<div id="pdpFinishOptions"[^>]*>.*?</div>\s*</div>'
html = re.sub(block_pattern, '', html, flags=re.DOTALL)

with open('product.html', 'w', encoding='utf-8') as f:
    f.write(html)
