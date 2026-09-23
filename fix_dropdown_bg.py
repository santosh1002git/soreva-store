import re

with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace var(--bg-dark) with var(--theme-color-dark)
css = css.replace('var(--bg-dark)', 'var(--theme-color)')
# Note: border should probably be a bit more subtle, but var(--border-color) is fine.
# Wait, let's also fix the dropdown menu item hover color to use a background that contrasts.
# Right now it uses rgba(197,160,89,0.08). That's fine.

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
