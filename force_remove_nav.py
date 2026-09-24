with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

bad_block = """    document.querySelectorAll('.cat-nav-link').forEach(link => {
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
    });"""

if bad_block in js:
    js = js.replace(bad_block, "")
    print("Replaced successfully!")
else:
    print("Block not found. Try regex.")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
