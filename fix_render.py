import re
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

correct_render = '''
    const totalMatching = items.length;

    // Smooth Pagination
    const pageSize = 48;
    const page = window.currentPage || 1;
    const paginatedItems = items.slice(0, page * pageSize);

    if (totalMatching === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fa-solid fa-gem" style="font-size: 2.5rem; color: var(--border-color); margin-bottom: 20px;"></i>
                <h3 style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--text-dark);">No Pieces Found</h3>
                <p style="color: var(--text-light); max-width: 400px; margin: 0 auto;">Try adjusting your filters or search terms to explore our atelier's creations.</p>
            </div>
        `;
    } else {
        grid.innerHTML = paginatedItems.map(product => {
            const hoverImg = product.hoverImg || product.primaryImg;
            const isWishlisted = wishlist.includes(product.id) || wishlist.includes(product.sku);
            return `
            <div class="product-card" data-id="${product.id}" onclick="openQuickView('${product.id}')">
                <div class="product-thumb-wrap">
                    <img class="product-thumb primary-img" src="${product.primaryImg}" alt="${product.name}" loading="lazy">
                    <img class="product-thumb hover-img" src="${hoverImg}" alt="${product.name}" loading="lazy">
                    
                    <div class="product-badges">
                        ${product.badge ? `<span class="product-badge badge-bestseller">${product.badge}</span>` : ''}
                        ${product.launchOffer ? `<span class="product-badge badge-launch">15% OFF</span>` : ''}
                    </div>

                    <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')" title="Add to Wishlist">
                        <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <div class="product-quick-actions">
                        <button class="btn-quick-view" onclick="event.stopPropagation(); openQuickView('${product.id}')">
                            <i class="fa-regular fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>

                <div class="product-details">
                    <span class="product-category-sub">${product.subCategory || product.category}</span>
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-price-row">
                        <span class="price-current">${formatPrice(product.priceINR)}</span>
                        ${product.originalPriceINR > product.priceINR ? `<span class="price-original">${formatPrice(product.originalPriceINR)}</span>` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        // Add Load More button
        if (totalMatching > page * pageSize) {
            grid.innerHTML += `
                <div style="grid-column: 1/-1; text-align: center; margin-top: 40px;">
                    <button onclick="window.currentPage = (window.currentPage || 1) + 1; renderProducts();" 
                            style="padding: 14px 40px; background: var(--gold-accent); color: var(--text-dark); border: none; font-family: var(--font-heading); font-weight: 700; font-size: 1.1rem; cursor: pointer; border-radius: 4px; box-shadow: 0 4px 14px rgba(197,160,89,0.3); transition: transform 0.2s ease;">
                        Load More Pieces (${totalMatching - page * pageSize} remaining)
                    </button>
                </div>
            `;
        }
    }

    // Update product count
    const countEl = document.getElementById('productCount');
    if (countEl) {
        countEl.textContent = `Showing ${paginatedItems.length} of ${totalMatching} Pieces`;
    }
}
'''

js = re.sub(r'const totalMatching = items\.length;.*?\}\s*\}', correct_render, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
