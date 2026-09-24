import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace category cards:
# <div class="category-card" onclick="window.location.href='catalog.html?cat=...'"> ... </div>
# With:
# <a href="catalog.html?cat=..." class="category-card" style="text-decoration: none; color: inherit; display: block;"> ... </a>

def replacer(match):
    url = match.group(1)
    inner = match.group(2)
    # also we should replace the <button> inside with a simple span or just keep it as a div looking like a button,
    # because <button> inside <a> is technically invalid HTML, though it works. We'll change <button to <div class="btn-secondary"
    inner = re.sub(r'<button class="btn-secondary"(.*?)onclick=".*?"(.*?)>(.*?)</button>', r'<div class="btn-secondary"\1\2>\3</div>', inner)
    return f'<a href="{url}" class="category-card" style="text-decoration: none; color: inherit; display: block;">{inner}</a>'

html = re.sub(r'<div class="category-card" onclick="window\.location\.href=\'(.*?)\'">(.*?)</div>\s*</div>', replacer, html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
