import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace the cat-nav-link click listener with a simple active class toggler, or just remove preventDefault
replacement = r'''
    // Category bar clicks (let them navigate via href normally)
    document.querySelectorAll('.cat-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Remove preventDefault so normal navigation happens!
            document.querySelectorAll('.cat-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
'''

js = re.sub(r'\s*// Category bar clicks\s*document\.querySelectorAll\(\'\.cat-nav-link\'\)\.forEach\(link => \{\s*link\.addEventListener\(\'click\', \(e\) => \{\s*e\.preventDefault\(\);\s*document\.querySelectorAll\(\'\.cat-nav-link\'\)\.forEach\(l => l\.classList\.remove\(\'active\'\)\);\s*link\.classList\.add\(\'active\'\);\s*const targetCat = link\.dataset\.category;\s*// Sync with filter tabs\s*activeFilter = targetCat;\s*document\.querySelectorAll\(\'\.filter-tab\'\)\.forEach\(tab => \{\s*tab\.classList\.toggle\(\'active\', tab\.dataset\.category === targetCat\);\s*\}\);\s*// Smooth scroll to products\s*const productsSec = document\.getElementById\(\'products-catalog\'\);\s*if \(productsSec\) \{\s*productsSec\.scrollIntoView\(\{ behavior: \'smooth\' \}\);\s*\}\s*renderProducts\(\);\s*\}\);\s*\}\);', replacement, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
