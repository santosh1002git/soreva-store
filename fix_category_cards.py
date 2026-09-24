import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# For each category-card, remove the onclick and wrap the whole card in an anchor tag!
# Actually, it's easier to keep the card as a div and just add a button at the bottom of category-info.

def add_button(match):
    url = match.group(1)
    # find the end of category-info
    return match.group(0)

# Let's just use simple replacement for each known card
cats = [
    ('necklace', 'Necklaces', 'Chokers & Collars (4,890+)'),
    ('earrings', 'Earrings', 'Drops, Jhumkas & Studs (2,510+)'),
    ('rings', 'Finger Rings', 'Solitaires & Bands (1,360+)'),
    ('pendants', 'Pendants', 'Halo & Solitaire Sets (800+)'),
    ('bracelets', 'Wristwear', 'Tennis & Bangles (1,710+)')
]

for cat_id, title, desc in cats:
    # We will search for the card and replace it
    # But since the HTML might have changed slightly (like counts), let's use regex
    pattern = r'<div class="category-card" onclick="window\.location\.href=\'catalog\.html\?cat=' + cat_id + r'\'">(.*?)</div>\s*</div>'
    
    # We'll inject a button right before the closing div of category-info
    # Let's do a more robust string replacement
    pass

# Easiest way: just inject a button into .category-info
new_html = re.sub(
    r'(<div class="category-card" onclick="window\.location\.href=\'(.*?)\'">.*?<div class="category-info">.*?</span>)',
    r'\1\n                            <button class="btn-secondary" style="margin-top: 15px; width: 100%; padding: 8px 0; font-size: 0.85rem;" onclick="window.location.href=\'\2\'; event.stopPropagation();">Explore Category</button>',
    html,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)
