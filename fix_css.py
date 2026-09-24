with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

scale_css = '''
/* Scale image on hover if there is no secondary hover image */
.product-thumb-wrap.scale-hover-only .primary-img {
    transition: transform 0.4s ease;
}
.product-thumb-wrap.scale-hover-only:hover .primary-img {
    transform: scale(1.05);
}
'''
css = css + '\n' + scale_css

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
