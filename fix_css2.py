import re
with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

bad_css = '''.product-card:hover .product-thumb.primary-img {
    opacity: 0;
}'''

good_css = '''.product-card:hover .product-thumb-wrap:not(.scale-hover-only) .primary-img {
    opacity: 0;
}'''

css = css.replace(bad_css, good_css)

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
