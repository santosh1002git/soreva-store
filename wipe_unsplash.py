import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace all unsplash URLs with a local empty/blank image so they don't load over the network.
html = re.sub(r'https://images\.unsplash\.com/[^\s"\'<>]*', 'assets/logo-black.png?v=clean2026', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
