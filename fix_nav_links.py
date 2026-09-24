import re
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad_js = '''    // Category Navigation (Navbar)
    document.querySelectorAll('.cat-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.cat-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const targetCat = link.dataset.category;
            
            // Sync with filter tabs
            activeFilter = targetCat;
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.category === targetCat);
            });

            // Smooth scroll to products
            const productsSec = document.getElementById('products-catalog');
            if (productsSec) {
                productsSec.scrollIntoView({ behavior: 'smooth' });
            }
            renderProducts();
        });
    });'''

if bad_js in js:
    js = js.replace(bad_js, "")
else:
    print("Could not find exact JS. Using regex.")
    js = re.sub(r'    // Category Navigation \(Navbar\).*?renderProducts\(\);\n        \}\);\n    \}\);', '', js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
