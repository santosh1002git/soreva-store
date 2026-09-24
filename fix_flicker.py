import re

css_addition = '''
/* Prevent intro flicker */
html.skip-intro .logo-intro-experience {
    display: none !important;
}
'''

with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

if 'html.skip-intro' not in css:
    with open('styles.css', 'a', encoding='utf-8') as f:
        f.write(css_addition)

script_tag = '''<script>
    if (sessionStorage.getItem('soreva_intro_played') === 'true') {
        document.documentElement.classList.add('skip-intro');
    }
</script>
</head>'''

for filename in ['index.html', 'catalog.html', 'product.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()
    
    if 'skip-intro' not in html:
        html = html.replace('</head>', script_tag)
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html)
