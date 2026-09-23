import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

grouping_logic = r'''
    // Sorting
    const sortSelect = document.getElementById('sortBy');
    let sortVal = 'featured';
    if (sortSelect) {
        sortVal = sortSelect.value;
        if (sortVal === 'price-low') {
            items.sort((a, b) => a.priceINR - b.priceINR);
        } else if (sortVal === 'price-high') {
            items.sort((a, b) => b.priceINR - a.priceINR);
        } else if (sortVal === 'rating') {
            items.sort((a, b) => b.rating - a.rating);
        }
    }
    
    // Sub-category grouping (only if sorting is featured and no specific sub-filter is active)
    let shouldGroup = false;
    if (sortVal === 'featured' && !activeSubFilter) {
        shouldGroup = true;
        items.sort((a, b) => (a.subCategory || 'Other').localeCompare(b.subCategory || 'Other'));
    }

    const totalMatching = items.length;

    if (totalMatching === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fa-solid fa-gem" style="font-size: 2.5rem; color: var(--border-color); margin-bottom: 16px;"></i>
                <h3 style="font-family: var(--font-heading); color: var(--theme-color);">No pieces match your selection</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 6px;">Try adjusting your metal finish or category filter.</p>
            </div>
        `;
        const existingLoadMore = document.getElementById('storeLoadMoreContainer');
        if (existingLoadMore) existingLoadMore.innerHTML = '';
        return;
    }

    const visibleItems = items.slice(0, currentStorePageLimit);

    let currentRenderSub = null;
    let html = '';

    visibleItems.forEach(product => {
        if (shouldGroup && product.subCategory !== currentRenderSub) {
            currentRenderSub = product.subCategory;
            html += `
                <div style="grid-column: 1 / -1; border-bottom: 1px solid var(--border-color); margin: 40px 0 20px; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <h3 style="font-family: var(--font-heading); font-size: 1.8rem; color: var(--theme-color); font-weight: 400;">${currentRenderSub || 'Exclusive Collection'}</h3>
                </div>
            `;
        }

        const isWishlisted = wishlist.includes(String(product.id)) || wishlist.includes(product.id);
        const finishes = (product.availableFinishes && product.availableFinishes.length) ? product.availableFinishes : ["18K Gold", "Rhodium Silver"];
        const primaryFinish = finishes[0];
        const discountPct = (product.originalPriceINR && product.originalPriceINR > product.priceINR) 
            ? Math.round((1 - product.priceINR / product.originalPriceINR) * 100) 
            : 0;
        const hoverImg = product.hoverImg || product.primaryImg;

        html += `
            <div class="product-card" data-id="${product.id}">
                <div class="product-thumb-wrap">
                    <img class="product-thumb primary-img" src="${product.primaryImg}" alt="${product.name}" loading="lazy">
                    <img class="product-thumb hover-img" src="${hoverImg}" alt="${product.name}" loading="lazy" onerror="this.style.display='none';">
                    
                    <div class="product-badges">
                        ${product.badge ? `<span class="product-badge badge-bestseller">${product.badge}</span>` : ''}
                        ${product.launchOffer ? `<span class="product-badge badge-launch">15% OFF</span>` : ''}
                    </div>

                    <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${product.id}')" title="Add to Wishlist">
                        <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <div class="product-quick-actions">
                        <button class="btn-quick-view" onclick="openQuickView('${product.id}')">
                            <i class="fa-regular fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-meta">
                        <span class="product-rating"><i class="fa-solid fa-star"></i> ${product.rating || 5.0}</span>
                        <span class="product-metal">${primaryFinish}</span>
                    </div>
                    <h3 class="product-title" style="cursor: pointer;" onclick="window.location.href='product.html?id=${product.id}'">${product.name}</h3>
                    <div class="product-pricing">
                        <span class="price-current">₹${product.priceINR.toLocaleString('en-IN')}</span>
                        ${discountPct > 0 ? `<span class="price-original">₹${product.originalPriceINR.toLocaleString('en-IN')}</span>` : ''}
                    </div>
                    <button class="btn-add-cart" onclick="addToCart('${product.id}')">Add to Bag</button>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
'''

js = re.sub(r'// Sorting\s+const sortSelect = document\.getElementById\(\'sortBy\'\);.*?grid\.innerHTML = visibleItems\.map\(product => \{.*?</button>\n                </div>\n            </div>\n        `;\n    \}\)\.join\(\'\'\);', grouping_logic, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
