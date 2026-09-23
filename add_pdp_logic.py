import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

pdp_logic = r'''
function initProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('id');
    if (!pid) return;

    const pdpTitle = document.getElementById('pdpTitle');
    if (!pdpTitle) return; // not on product.html

    const product = PRODUCTS.find(p => p.id === pid);
    if (!product) {
        pdpTitle.textContent = "Product Not Found";
        return;
    }

    document.getElementById('pdpMainImg').src = product.primaryImg;
    document.getElementById('pdpCatLink').textContent = product.category;
    document.getElementById('pdpCatLink').href = `catalog.html?cat=${product.category}`;
    document.getElementById('pdpSubCat').textContent = product.subCategory || product.category;
    pdpTitle.textContent = product.name;
    document.getElementById('pdpPrice').textContent = formatPrice(product.priceINR);
    document.getElementById('pdpOriginalPrice').textContent = formatPrice(product.originalPriceINR);
    document.getElementById('pdpDescription').textContent = product.description;
    
    // Gallery
    const thumbsContainer = document.getElementById('pdpThumbs');
    if (product.gallery && product.gallery.length > 0) {
        thumbsContainer.innerHTML = product.gallery.map((img, idx) => `
            <img src="${img}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid ${idx===0 ? 'var(--gold-accent)' : 'transparent'};" 
                 onclick="document.getElementById('pdpMainImg').src='${img}'; Array.from(this.parentNode.children).forEach(c=>c.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';">
        `).join('');
    } else {
        thumbsContainer.style.display = 'none';
    }

    // Finishes
    const finishes = product.availableFinishes || [product.plating];
    const finishContainer = document.getElementById('pdpFinishOptions');
    finishContainer.innerHTML = finishes.map((f, idx) => `
        <button style="padding: 10px 20px; background: ${idx===0 ? 'rgba(197,160,89,0.15)' : 'transparent'}; border: 1px solid ${idx===0 ? 'var(--gold-accent)' : 'var(--border-color)'}; color: ${idx===0 ? 'var(--gold-accent)' : 'var(--text-light)'}; border-radius: 6px; cursor: pointer; text-transform: capitalize;" onclick="Array.from(this.parentNode.children).forEach(c=>{c.style.borderColor='var(--border-color)'; c.style.color='var(--text-light)'; c.style.background='transparent'}); this.style.borderColor='var(--gold-accent)'; this.style.color='var(--gold-accent)'; this.style.background='rgba(197,160,89,0.15)'; window.selectedPdpFinish='${f}';">
            ${f}
        </button>
    `).join('');
    window.selectedPdpFinish = finishes[0];

    // Add to Bag
    document.getElementById('pdpAddToCartBtn').onclick = () => {
        const qty = parseInt(document.getElementById('pdpQty').value) || 1;
        addToCart(product.id, window.selectedPdpFinish, qty);
    };
}
'''

init_app_pattern = r'function initApp\(\) \{'
js = re.sub(init_app_pattern, pdp_logic + '\n' + 'function initApp() {', js, count=1)

# Also call initProductPage() inside initApp()
js = js.replace('loadStoreDataAndInit();', 'loadStoreDataAndInit();\n    initProductPage();')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
