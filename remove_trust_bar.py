import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# The old trust-bar starts with <section class="trust-bar" and ends before <section class="categories-section">
# Let's remove it using regex
html = re.sub(r'<!-- TRUST BADGES / VALUE PROPOSITIONS -->.*?<section class="trust-bar" aria-label="Customer Guarantees">.*?</section>', '', html, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
