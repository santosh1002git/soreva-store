import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add activeSubFilter
js = js.replace("let activeFilter = 'all';", "let activeFilter = 'all';\nlet activeSubFilter = null;")

# 2. Modify renderProducts to include activeSubFilter
render_products_patch = '''function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    // Public storefront: only show active and enabled pieces
    let items = PRODUCTS.filter(p => !p.disabled && p.active !== false && p.active !== 0 && p.stockStatus !== 'Disabled');

    // Filter category
    if (activeFilter !== 'all') {
        items = items.filter(p => {
            if (activeFilter === 'wristwear' || activeFilter === 'bracelets') {
                return p.category === 'wristwear' || p.category === 'bracelets';
            }
            return p.category === activeFilter;
        });
    }

    // Filter subcategory
    if (activeSubFilter) {
        items = items.filter(p => p.subCategory && p.subCategory.toLowerCase() === activeSubFilter.toLowerCase());
    }'''
js = re.sub(r'function renderProducts\(\) \{.*?if \(activeFilter !== \'all\'\) \{.*?\}\n', render_products_patch + '\n', js, flags=re.DOTALL)

# 3. Modify product card HTML for hover effect
card_old = '''const hoverImg = product.hoverImg || product.primaryImg;
            const isWishlisted = wishlist.includes(product.id) || wishlist.includes(product.sku);
            return `
            <div class="product-card" data-id="${product.id}" onclick="openQuickView('${product.id}')">
                <div class="product-thumb-wrap">
                    <img class="product-thumb primary-img" src="${product.primaryImg}" alt="${product.name}" loading="lazy">
                    <img class="product-thumb hover-img" src="${hoverImg}" alt="${product.name}" loading="lazy">'''

card_new = '''const hasHover = product.hoverImg && product.hoverImg !== product.primaryImg;
            const isWishlisted = wishlist.includes(product.id) || wishlist.includes(product.sku);
            return `
            <div class="product-card" data-id="${product.id}" onclick="openQuickView('${product.id}')">
                <div class="product-thumb-wrap ${!hasHover ? 'scale-hover-only' : ''}">
                    <img class="product-thumb primary-img" src="${product.primaryImg}" alt="${product.name}" loading="lazy" onerror="this.src='https://indian-jewellery.com/core/thumb_images/product_images/773510AQ10CV91077.jpg';">
                    ${hasHover ? `<img class="product-thumb hover-img" src="${product.hoverImg}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('scale-hover-only');">` : ''}'''
js = js.replace(card_old, card_new)

# 4. Add URL parsing and Title Updating to applyStoreData or initFilters
# It's best to put it in initFilters or right after PRODUCTS is loaded
parse_logic = '''
function parseUrlAndSetTitle() {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('cat');
    const sub = urlParams.get('sub');
    
    if (cat && cat !== 'all') {
        activeFilter = cat;
    }
    if (sub) {
        activeSubFilter = sub;
    }

    // Set page title
    const pageTitle = document.getElementById('pageTitleH1');
    if (pageTitle) {
        if (sub) {
            pageTitle.textContent = sub;
            document.title = sub + " | Sorèva";
        } else if (cat && cat !== 'all') {
            const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ');
            pageTitle.textContent = formattedCat;
            document.title = formattedCat + " | Sorèva";
        }
    }
}
'''
js = js + '\n' + parse_logic

# Call it inside applyStoreData right before renderProducts
js = js.replace("PRODUCTS = data.products;\n        renderProducts();", "PRODUCTS = data.products;\n        if (typeof parseUrlAndSetTitle === 'function') parseUrlAndSetTitle();\n        renderProducts();")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
