import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = r'''
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.category;
            activeSubFilter = null; // ALWAYS reset subfilter when switching main categories
            renderProducts();
        });
    });
'''

js = re.sub(r'''\s*document\.querySelectorAll\('\.filter-tab'\)\.forEach\(tab => \{\s*tab\.addEventListener\('click', \(\) => \{\s*document\.querySelectorAll\('\.filter-tab'\)\.forEach\(t => t\.classList\.remove\('active'\)\);\s*tab\.classList\.add\('active'\);\s*activeFilter = tab\.dataset\.category;\s*renderProducts\(\);\s*\}\);\s*\}\);''', replacement, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
