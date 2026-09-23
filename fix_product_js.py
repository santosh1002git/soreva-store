import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# JS injection for product details and finishes
pdp_injection = r'''
    pdpTitle.textContent = product.name;
    document.getElementById('pdpPrice').textContent = formatPrice(product.priceINR);
    document.getElementById('pdpOriginalPrice').textContent = formatPrice(product.originalPriceINR);
    document.getElementById('pdpDescription').textContent = product.description || '';
    
    // Populate Product Details List (excluding SKU)
    const pdpDetailsList = document.getElementById('pdpDetailsList');
    if (pdpDetailsList) {
        let detailsHtml = '';
        if (product.category) detailsHtml += `<li><strong>Category:</strong> <span style="text-transform: capitalize;">${product.category}</span></li>`;
        if (product.subCategory) detailsHtml += `<li><strong>Sub-Category:</strong> ${product.subCategory}</li>`;
        if (product.plating) {
            let pName = '18K Gold Plated';
            if (product.plating === 'silver') pName = 'Rhodium Silver';
            if (product.plating === 'rosegold') pName = 'Rose Gold Plated';
            detailsHtml += `<li><strong>Primary Finish:</strong> ${pName}</li>`;
        }
        if (product.stockStatus) detailsHtml += `<li><strong>Availability:</strong> ${product.stockStatus === 'In Stock' ? '<span style="color: green;">In Stock</span>' : '<span style="color: red;">' + product.stockStatus + '</span>'}</li>`;
        
        pdpDetailsList.innerHTML = detailsHtml;
    }

    // Populate Finish Options
    const pdpFinishOptions = document.getElementById('pdpFinishOptions');
    if (pdpFinishOptions) {
        const finishes = (product.availableFinishes && product.availableFinishes.length > 0) ? product.availableFinishes : [];
        if (finishes.length === 0 && product.plating) {
            if (product.plating === 'gold') finishes.push('18K Gold');
            if (product.plating === 'silver') finishes.push('Rhodium Silver');
            if (product.plating === 'rosegold') finishes.push('Rose Gold');
        }
        
        if (finishes.length > 0) {
            pdpFinishOptions.innerHTML = finishes.map((f, idx) => {
                let colorHex = '#e6c875'; // gold
                if (f.toLowerCase().includes('silver') || f.toLowerCase().includes('rhodium')) colorHex = '#e0e0e0';
                if (f.toLowerCase().includes('rose')) colorHex = '#e8b8a2';
                
                return `
                    <div style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: 1px solid ${idx===0 ? 'var(--gold-accent)' : 'var(--border-color)'}; border-radius: 20px; font-size: 0.85rem; cursor: pointer;" onclick="Array.from(this.parentNode.children).forEach(c=>c.style.borderColor='var(--border-color)'); this.style.borderColor='var(--gold-accent)';">
                        <div style="width: 12px; height: 12px; border-radius: 50%; background: ${colorHex}; border: 1px solid rgba(0,0,0,0.1);"></div>
                        ${f}
                    </div>
                `;
            }).join('');
        } else {
            pdpFinishOptions.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Standard Finish</span>';
        }
    }
'''

# Replace the simple assignments in app.js
js = re.sub(r'pdpTitle\.textContent = product\.name;.*?document\.getElementById\(\'pdpDescription\'\)\.textContent = product\.description;', pdp_injection, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
