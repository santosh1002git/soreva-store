import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# We will inject this logic at the end of renderProducts, before it actually modifies the grid innerHTML?
# Actually, right at the top of renderProducts is fine.
injection = r'''
    // Update dynamic catalog title
    const catalogTitle = document.getElementById('catalogTitle');
    const catalogDesc = document.getElementById('catalogDesc');
    
    if (catalogTitle) {
        if (activeSubFilter) {
            catalogTitle.innerHTML = `${activeSubFilter}`;
            if (catalogDesc) catalogDesc.textContent = `Explore our exclusive collection of ${activeSubFilter.toLowerCase()}.`;
        } else if (activeFilter !== 'all') {
            const capitalizedCat = activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);
            catalogTitle.innerHTML = `All <em>${capitalizedCat}</em>`;
            if (catalogDesc) catalogDesc.textContent = `Explore our meticulously handcrafted ${activeFilter} collection.`;
        } else {
            catalogTitle.innerHTML = `The <em>Catalog</em>`;
            if (catalogDesc) catalogDesc.textContent = `Filter and explore our meticulously handcrafted luxury pieces.`;
        }
    }
'''

js = js.replace('function renderProducts() {\n    const grid = document.getElementById(\'productsGrid\');\n    if (!grid) return;', 
               'function renderProducts() {\n    const grid = document.getElementById(\'productsGrid\');\n    if (!grid) return;\n' + injection)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
