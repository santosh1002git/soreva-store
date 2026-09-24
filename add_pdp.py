with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

pdp_logic = '''
// ==========================================
// Product Details Page (PDP)
// ==========================================
function initProductPage() {
    // Only run if we are on the product page
    const pdpMainImg = document.getElementById('pdpMainImg');
    if (!pdpMainImg) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        // Handle missing ID gracefully
        document.getElementById('pdpTitle').textContent = "Product Not Found";
        return;
    }

    const product = PRODUCTS.find(p => p.id === productId || p.sku === productId);
    if (!product) {
        document.getElementById('pdpTitle').textContent = "Product Not Found";
        return;
    }

    // Populate Data
    document.title = product.name + " | Sorèva";
    pdpMainImg.src = product.primaryImg;
    
    const catLink = document.getElementById('pdpCatLink');
    if (catLink) {
        catLink.textContent = product.category.charAt(0).toUpperCase() + product.category.slice(1);
        catLink.href = `catalog.html?cat=${product.category}`;
    }
    
    const subCat = document.getElementById('pdpSubCat');
    if (subCat) subCat.textContent = product.subCategory;
    
    document.getElementById('pdpTitle').textContent = product.name;
    
    const rating = document.getElementById('pdpRating');
    if (rating) rating.textContent = product.rating || 4.8;
    
    const price = document.getElementById('pdpPrice');
    if (price) price.textContent = formatPrice(product.priceINR);
    
    const origPrice = document.getElementById('pdpOriginalPrice');
    if (origPrice) {
        if (product.originalPriceINR > product.priceINR) {
            origPrice.textContent = formatPrice(product.originalPriceINR);
            origPrice.style.display = 'inline';
        } else {
            origPrice.style.display = 'none';
        }
    }

    const desc = document.getElementById('pdpDescription');
    if (desc) desc.innerHTML = product.description || "Continuous fire of handset round brilliant stones. Flexible, feather-light, and flawlessly secure.";

    // Render accordions
    const moreDetails = document.getElementById('pdpMoreDetailsContainer');
    if (moreDetails) {
        moreDetails.innerHTML = `
            <div style="border-top: 1px solid var(--border-color); margin-top: 20px;">
                <details style="padding: 16px 0; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                    <summary style="font-weight: 600; color: var(--text-dark); display: flex; justify-content: space-between; align-items: center; list-style: none;">
                        <span>Product Specifications</span>
                        <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </summary>
                    <div style="padding-top: 16px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
                        • Primary Material: Brass & Copper Alloy<br>
                        • Plating: ${product.finish || '18K Gold'}<br>
                        • Stones: AAA+ Austrian Cubic Zirconia<br>
                        • Fastening: Adjustable<br>
                        • Hypoallergenic & Nickel-Free
                    </div>
                </details>
                <details style="padding: 16px 0; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                    <summary style="font-weight: 600; color: var(--text-dark); display: flex; justify-content: space-between; align-items: center; list-style: none;">
                        <span>Shipping & Returns</span>
                        <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </summary>
                    <div style="padding-top: 16px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
                        • Free insured shipping across India.<br>
                        • Express delivery within 2-4 business days.<br>
                        • 14-day hassle-free return policy.
                    </div>
                </details>
                <details style="padding: 16px 0; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                    <summary style="font-weight: 600; color: var(--text-dark); display: flex; justify-content: space-between; align-items: center; list-style: none;">
                        <span>Care Instructions</span>
                        <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </summary>
                    <div style="padding-top: 16px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
                        Store in the provided Sorèva pouch. Avoid direct contact with perfumes, sanitizers, and water to maintain the brilliance of the CZ crystals and plating.
                    </div>
                </details>
            </div>
            <style>
                details > summary::-webkit-details-marker { display: none; }
                details[open] summary i { transform: rotate(180deg); }
                details summary i { transition: transform 0.3s ease; }
            </style>
        `;
    }

    // Add to Bag Button
    const addBtn = document.getElementById('pdpAddToCartBtn');
    if (addBtn) {
        addBtn.onclick = () => {
            const qty = parseInt(document.getElementById('pdpQty').value) || 1;
            // Existing add to cart logic (assuming toggleCart or direct push)
            const existing = cart.find(c => c.id === product.id);
            if (existing) {
                existing.quantity += qty;
            } else {
                cart.push({...product, quantity: qty, selectedFinish: product.finish || '18K Gold Plated'});
            }
            saveCart();
            updateCartUI();
            
            // Show cart drawer
            const drawer = document.getElementById('cartDrawer');
            const backdrop = document.getElementById('cartDrawerBackdrop');
            if (drawer && backdrop) {
                drawer.classList.add('open');
                backdrop.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
        };
    }
}
'''

# Add it before initApp()
js = js.replace('function initApp() {', pdp_logic + '\nfunction initApp() {')

# Call it in initApp()
js = js.replace('if (typeof loadStoreDataAndInit === \'function\') loadStoreDataAndInit();', 'if (typeof initProductPage === \'function\') initProductPage();\n    if (typeof loadStoreDataAndInit === \'function\') loadStoreDataAndInit();')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
