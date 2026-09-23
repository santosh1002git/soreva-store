import re

with open('admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace renderProductsTable with category grouping and new buttons
table_logic = r'''
function renderProductsTable(filterText = '', filterCat = 'all') {
    const tbody = document.getElementById('productsAdminTbody');
    if (!tbody) return;

    let items = [...(storeData.products || [])];

    if (filterCat !== 'all') {
        items = items.filter(p => p.category === filterCat);
    }
    if (filterText) {
        const q = filterText.toLowerCase();
        items = items.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.subCategory && p.subCategory.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.id && String(p.id).toLowerCase().includes(q)));
    }

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">No products found matching filters.</td></tr>`;
        return;
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / adminCatalogPageSize));
    if (adminCatalogPage > totalPages) adminCatalogPage = totalPages;
    if (adminCatalogPage < 1) adminCatalogPage = 1;

    const startIdx = (adminCatalogPage - 1) * adminCatalogPageSize;
    let pageItems = items.slice(startIdx, startIdx + adminCatalogPageSize);
    
    // Group by category if we are viewing 'all'
    if (filterCat === 'all' && !filterText) {
        pageItems.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    }

    let currentRenderCategory = null;
    let html = '';

    pageItems.forEach(p => {
        if (filterCat === 'all' && !filterText && p.category !== currentRenderCategory) {
            currentRenderCategory = p.category;
            html += `<tr><td colspan="9" style="background: rgba(197, 160, 89, 0.1); color: var(--gold); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 12px 16px;">${currentRenderCategory || 'Uncategorized'}</td></tr>`;
        }
        
        const opacity = p.disabled || p.active === false || p.active === 0 ? '0.5' : '1';
        
        html += `
        <tr style="opacity: ${opacity};">
            <td>
                <img src="${p.primaryImg}" alt="${p.name}" class="table-thumb" onclick="inspectImageDetails('${(p.primaryImg || '').replace(/'/g, "\\'")}', 'prodPrimaryPreview', '${(p.name || 'Product').replace(/'/g, "\\'")}')" style="cursor: pointer;" title="Click to inspect resolution & image specs">
            </td>
            <td>
                <strong style="color: var(--admin-text); display: block;">${p.name}</strong>
                <span style="color: var(--admin-text-muted); font-size: 0.8rem;">SKU: ${p.sku || p.id} • ${p.subCategory || ''}</span>
            </td>
            <td><span class="status-code">${p.category}</span></td>
            <td><strong style="color: var(--gold-light);">₹${(p.priceINR || 0).toLocaleString('en-IN')}</strong></td>
            <td><span style="text-decoration: line-through; color: var(--admin-text-muted);">₹${((p.originalPriceINR || p.priceINR) || 0).toLocaleString('en-IN')}</span></td>
            <td><span style="text-transform: capitalize;">${p.plating}</span></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    ${p.badge ? `<span class="status-badge badge-gold">${p.badge}</span>` : '<span style="color: var(--admin-text-muted);">-</span>'}
                    <button class="btn-icon" onclick="quickEditBadge('${p.id}')" title="Change/Remove Badge" style="font-size:0.7rem; padding:4px;"><i class="fa-solid fa-tag"></i></button>
                </div>
            </td>
            <td>
                ${(p.disabled || p.active === false || p.active === 0) ? '<span class="status-badge" style="background:#555;color:#fff;">Disabled</span>' : '<span class="status-badge badge-green">Active</span>'}
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="toggleProductDisable('${p.id}')" title="${(p.disabled || p.active === false || p.active === 0) ? 'Enable Product' : 'Disable Product'}">
                        <i class="fa-solid ${(p.disabled || p.active === false || p.active === 0) ? 'fa-eye' : 'fa-eye-slash'}"></i>
                    </button>
                    <button class="btn-icon" onclick="openProductModal('${p.id}')" title="Edit Piece">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteProduct('${p.id}')" title="Delete Piece">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Quick action to change or remove badge
async function quickEditBadge(id) {
    const product = storeData.products.find(p => p.id === id);
    if (!product) return;
    
    const newBadge = prompt("Enter new badge (leave empty to remove):", product.badge || "");
    if (newBadge === null) return; // cancelled
    
    const payload = {
        ...product,
        badge: newBadge.trim()
    };
    
    try {
        const res = await fetch('/api/db/products/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showNotification('Badge updated successfully', 'success');
            fetchStoreData(); // Refresh UI
        } else {
            showNotification(data.error || 'Failed to update badge', 'error');
        }
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

// Quick action to disable/enable product
async function toggleProductDisable(id) {
    const product = storeData.products.find(p => p.id === id);
    if (!product) return;
    
    const currentDisabled = product.disabled || product.active === false || product.active === 0;
    const newDisabled = currentDisabled ? 0 : 1;
    
    const payload = {
        ...product,
        disabled: newDisabled,
        active: currentDisabled ? 1 : 0
    };
    
    try {
        const res = await fetch('/api/db/products/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showNotification(`Product ${newDisabled ? 'disabled' : 'enabled'} successfully`, 'success');
            fetchStoreData(); // Refresh UI
        } else {
            showNotification(data.error || 'Failed to toggle product', 'error');
        }
    } catch (e) {
        showNotification(e.message, 'error');
    }
}
'''

js = re.sub(r'function renderProductsTable.*?}\s*function filterAdminProducts\(\) \{', table_logic + '\n\nfunction filterAdminProducts() {', js, flags=re.DOTALL)

with open('admin.js', 'w', encoding='utf-8') as f:
    f.write(js)
