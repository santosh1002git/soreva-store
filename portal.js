/**
 * Sorèva Luxury Jewellery - Staff Portal & Database Management GUI
 * Directly connected to PocketBase / SQLite Backend & Storefront Synchronizer
 */

// ==========================================================================
// 1. GLOBAL STATE & CONFIGURATION
// ==========================================================================
let currentStaff = null;
let dbProducts = [];
let inventoryItems = [];
let ordersData = [];
let employeesList = [];
let serverInfo = {};

const IMAGE_SPEC_STANDARDS = {
    'prodPrimaryPreview': {
        name: 'Product Primary Catalog Image',
        purpose: 'Main catalog photograph displayed across shop grids, search results, and category showcases.',
        targetWidth: 'Flexible (Any Size)',
        targetHeight: 'Flexible (Any Size)',
        ratioLabel: 'Any Ratio (Adaptive)',
        ratioVal: null,
        format: 'JPG, WebP, PNG',
        maxSizeKb: 2500,
        ruleText: 'Upload whatever size or ratio you have (portrait, square, landscape). Auto-adaptive scaling ensures natural display without cropping or restrictive boxes.'
    },
    'prodHoverPreview': {
        name: 'Product Secondary / Hover Image',
        purpose: 'Alternate perspective or on-model editorial photo revealed smoothly when customer hovers over a product card.',
        targetWidth: 'Flexible (Any Size)',
        targetHeight: 'Flexible (Any Size)',
        ratioLabel: 'Any Ratio (Adaptive)',
        ratioVal: null,
        format: 'JPG, WebP, PNG',
        maxSizeKb: 2500,
        ruleText: 'Upload whatever size or ratio you have. Scales dynamically to match seamlessly.'
    }
};

// ==========================================================================
// 2. INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await fetchServerInfo();
    checkStaffSession();
});

async function fetchServerInfo() {
    try {
        const resp = await fetch('/api/server-info');
        if (resp.ok) {
            serverInfo = await resp.json();
            const lanEl = document.getElementById('topbarLanIp');
            if (lanEl) lanEl.textContent = `Wi-Fi: ${serverInfo.lanIp || '127.0.0.1'}`;
            const lanInput = document.getElementById('shareLanUrlInput');
            if (lanInput) lanInput.value = serverInfo.portalLanUrl || `http://${serverInfo.lanIp}:8000/portal.html`;
            const localInput = document.getElementById('shareLocalUrlInput');
            if (localInput) localInput.value = serverInfo.portalLocalUrl || 'http://localhost:8000/portal.html';
        }
    } catch (err) {
        console.warn("Could not fetch server network info:", err);
    }
}

// ==========================================================================
// 3. AUTHENTICATION & SESSION HANDLING
// ==========================================================================
function checkStaffSession() {
    const saved = sessionStorage.getItem('soreva_staff_session');
    if (saved) {
        try {
            currentStaff = JSON.parse(saved);
            renderAuthenticatedApp();
            return;
        } catch (e) {
            sessionStorage.removeItem('soreva_staff_session');
        }
    }
    showLoginOverlay();
}

async function showLoginOverlay() {
    document.getElementById('portalLoginOverlay').style.display = 'flex';
    document.getElementById('portalApp').style.display = 'none';
    await loadQuickEmployeeSelector();
}

async function loadQuickEmployeeSelector() {
    const container = document.getElementById('quickEmpList');
    if (!container) return;

    try {
        const resp = await fetch('/api/employees');
        if (resp.ok) {
            employeesList = await resp.json();
            renderQuickEmployeeCards(employeesList);
        }
    } catch (err) {
        container.innerHTML = `<div style="color: #ef9a9a; font-size: 0.8rem;">Could not load team list: ${err.message}</div>`;
    }
}

function renderQuickEmployeeCards(employees) {
    const container = document.getElementById('quickEmpList');
    if (!container) return;

    if (!employees || employees.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">No team profiles found.</p>`;
        return;
    }

    container.innerHTML = employees.map(emp => `
        <div class="quick-emp-card" onclick="selectQuickEmployee('${emp.email}', '${emp.pin}')" title="Quick sign in as ${emp.name}">
            <span class="quick-emp-avatar">${emp.avatar || '💎'}</span>
            <div class="quick-emp-info">
                <strong>${emp.name}</strong>
                <span>${emp.role}</span>
            </div>
        </div>
    `).join('');
}

function selectQuickEmployee(email, pin) {
    document.getElementById('loginEmpEmail').value = email;
    document.getElementById('loginEmpPin').value = pin;
    // Auto-focus submit or trigger login
    const form = document.getElementById('portalLoginForm');
    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

async function handleEmployeeLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('loginEmpEmail');
    const pinInput = document.getElementById('loginEmpPin');
    const errBox = document.getElementById('loginErrorMsg');
    const submitBtn = document.getElementById('loginSubmitBtn');

    const email = emailInput.value.trim();
    const pin = pinInput.value.trim();

    if (!email || !pin) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
    errBox.style.display = 'none';

    try {
        const resp = await fetch('/api/employees/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin, password: pin })
        });

        const res = await resp.json();
        if (res.success && res.employee) {
            currentStaff = res.employee;
            sessionStorage.setItem('soreva_staff_session', JSON.stringify(currentStaff));
            showToast(`Welcome, ${currentStaff.name}!`);
            renderAuthenticatedApp();
        } else {
            errBox.textContent = res.error || "Invalid employee email or 4-digit PIN.";
            errBox.style.display = 'block';
        }
    } catch (err) {
        errBox.textContent = "Server communication error: " + err.message;
        errBox.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In to Database`;
    }
}

function handleLogout() {
    sessionStorage.removeItem('soreva_staff_session');
    currentStaff = null;
    showToast("Signed out successfully.");
    showLoginOverlay();
}

function renderAuthenticatedApp() {
    document.getElementById('portalLoginOverlay').style.display = 'none';
    document.getElementById('portalApp').style.display = 'block';

    // Set topbar meta
    document.getElementById('staffName').textContent = currentStaff.name;
    document.getElementById('staffRole').textContent = currentStaff.role;
    document.getElementById('staffAvatar').textContent = currentStaff.avatar || '💎';

    // Apply role-based visibility
    const isOwner = (currentStaff.role || '').toLowerCase().includes('owner') || (currentStaff.role || '').toLowerCase().includes('admin');
    document.querySelectorAll('.owner-only').forEach(el => {
        el.style.display = isOwner ? 'inline-flex' : 'none';
    });

    // Default tab based on role
    const roleLower = (currentStaff.role || '').toLowerCase();
    if (roleLower.includes('inventory')) {
        switchPortalTab('inventory');
    } else if (roleLower.includes('order') || roleLower.includes('fulfillment')) {
        switchPortalTab('orders');
    } else {
        switchPortalTab('catalog');
    }

    // Load initial data
    loadAllPortalData();
}

async function loadAllPortalData() {
    await Promise.all([
        loadCatalogProducts(),
        loadInventoryData(),
        loadOrdersData(),
        loadTeamData()
    ]);
}

// ==========================================
// 4. TAB NAVIGATION CONTROLLER
// ==========================================
function switchPortalTab(tabKey) {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
    });

    document.querySelectorAll('.portal-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    const target = document.getElementById(`tab${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`);
    if (target) {
        target.classList.add('active');
    }

    // Lazy reload on tab switch
    if (tabKey === 'catalog') loadCatalogProducts();
    if (tabKey === 'inventory') loadInventoryData();
    if (tabKey === 'orders') loadOrdersData();
    if (tabKey === 'team') loadTeamData();
    if (tabKey === 'audit') loadAuditHistory();
}

// ==========================================================================
// 5. CATALOG & PRODUCTS (ADD, EDIT, DELETE DIRECT TO SQLITE)
// ==========================================================================
let catalogCurrentPage = 1;
const catalogPageSize = 50;
let filteredCatalogProducts = [];

async function loadCatalogProducts() {
    const tbody = document.getElementById('catalogTableBody');
    if (!tbody) return;

    try {
        const resp = await fetch('/api/db/products');
        if (resp.ok) {
            dbProducts = await resp.json();
            filteredCatalogProducts = [...dbProducts];
            catalogCurrentPage = 1;
            renderCatalogPage();
            updateMetricsRibbon();
        } else {
            throw new Error("Failed to load products from database");
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ef9a9a; padding: 30px;">Error: ${err.message}</td></tr>`;
    }
}

function changeCatalogPage(delta) {
    catalogCurrentPage += delta;
    renderCatalogPage();
}

function renderCatalogPage() {
    const total = filteredCatalogProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / catalogPageSize));
    if (catalogCurrentPage > totalPages) catalogCurrentPage = totalPages;
    if (catalogCurrentPage < 1) catalogCurrentPage = 1;

    const startIdx = (catalogCurrentPage - 1) * catalogPageSize;
    const pageItems = filteredCatalogProducts.slice(startIdx, startIdx + catalogPageSize);

    renderCatalogTable(pageItems);

    const pageInfo = document.getElementById('catalogPageInfo');
    const pageBadge = document.getElementById('catalogPageBadge');
    const prevBtn = document.getElementById('btnPrevCatalogPage');
    const nextBtn = document.getElementById('btnNextCatalogPage');

    if (pageInfo) {
        if (total === 0) {
            pageInfo.textContent = 'Showing 0 items';
        } else {
            const endIdx = Math.min(startIdx + catalogPageSize, total);
            pageInfo.textContent = `Showing ${startIdx + 1} to ${endIdx.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')} pieces`;
        }
    }
    if (pageBadge) {
        pageBadge.textContent = `Page ${catalogCurrentPage} of ${totalPages.toLocaleString('en-IN')}`;
    }
    if (prevBtn) prevBtn.disabled = catalogCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = catalogCurrentPage >= totalPages;
}

function renderCatalogTable(products) {
    const tbody = document.getElementById('catalogTableBody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">No products in database matching criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => {
        let statusBadge = 'in-stock';
        let dotClass = 'optimal';
        let statusText = p.stockStatus || 'In Stock';
        const isDisabled = p.disabled === 1 || p.stockStatus === 'Disabled';

        if (isDisabled) {
            statusBadge = 'disabled';
            dotClass = 'disabled';
            statusText = 'Disabled (Distributor)';
        } else if (p.stockStatus === 'Low Stock') {
            statusBadge = 'low-stock';
            dotClass = 'caution';
        } else if (p.stockStatus === 'Out of Stock') {
            statusBadge = 'out-of-stock';
            dotClass = 'error';
        }

        const safeImg = p.primaryImg || 'assets/logo-black.png';
        const safeName = (p.name || 'Jewelry Piece').replace(/'/g, "\\'");

        return `
            <tr>
                <td>
                    <img src="${safeImg}" alt="${p.name}" class="table-thumb" 
                         onclick="inspectImageDetails('${safeImg}', 'prodPrimaryPreview', '${safeName}')"
                         title="Click to inspect resolution & details">
                </td>
                <td>
                    <strong style="color: var(--text); display: block; font-size: 0.88rem;">
                        ${p.name}
                        ${p.videoUrl ? `<a href="${p.videoUrl}" target="_blank" title="Preview Distributor Video" style="margin-left: 6px; color: var(--gold-light); font-size: 0.76rem; text-decoration: none; padding: 2px 6px; background: rgba(212,175,55,0.15); border-radius: 4px; border: 1px solid rgba(212,175,55,0.3);"><i class="fa-solid fa-play" style="font-size: 0.7rem;"></i> Video</a>` : ''}
                    </strong>
                    <span style="color: var(--text-muted); font-size: 0.76rem;">${p.subCategory || '-'}</span>
                </td>
                <td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: var(--gold-light); font-size: 0.78rem;">${p.sku || '-'}</code></td>
                <td><span style="text-transform: capitalize;">${p.category}</span></td>
                <td><span style="text-transform: capitalize;">${p.plating}</span></td>
                <td>
                    <strong style="color: var(--gold-light);">₹${p.priceINR ? p.priceINR.toLocaleString('en-IN') : 0}</strong>
                    ${p.originalPriceINR && p.originalPriceINR > p.priceINR ? `<span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.75rem; margin-left: 4px;">₹${p.originalPriceINR.toLocaleString('en-IN')}</span>` : ''}
                </td>
                <td><strong>${p.stockQty || 0}</strong> units</td>
                <td>
                    <span class="badge-status ${statusBadge}">
                        <span class="status-dot ${dotClass}"></span>
                        ${statusText}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px;">
                        ${isDisabled ? `
                            <button class="btn-icon btn-sm" onclick="quickEnableProduct('${p.id}', '${safeName}')" title="Enable & Launch Live on Store" style="color: var(--gold-light); border-color: rgba(212,175,55,0.4);">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon btn-sm" onclick="openEditProductModal('${p.id}')" title="Edit Piece">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button class="btn-icon btn-sm btn-delete" onclick="deleteProduct('${p.id}', '${safeName}')" title="Delete Piece">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterCatalogTable() {
    catalogCurrentPage = 1;
    const search = (document.getElementById('catalogSearchInput').value || '').toLowerCase().trim();
    const category = (document.getElementById('catalogCategoryFilter').value || '').toLowerCase().trim();
    const statusFilter = (document.getElementById('catalogStatusFilter') ? document.getElementById('catalogStatusFilter').value : '').toLowerCase().trim();

    filteredCatalogProducts = dbProducts.filter(p => {
        const matchesSearch = !search || 
            (p.name && p.name.toLowerCase().includes(search)) ||
            (p.sku && p.sku.toLowerCase().includes(search)) ||
            (p.category && p.category.toLowerCase().includes(search)) ||
            (p.subCategory && p.subCategory.toLowerCase().includes(search));
        
        const matchesCat = !category || (p.category && p.category.toLowerCase() === category);

        let matchesStatus = true;
        if (statusFilter === 'disabled') {
            matchesStatus = p.disabled === 1 || p.stockStatus === 'Disabled';
        } else if (statusFilter === 'active') {
            matchesStatus = p.disabled !== 1 && p.stockStatus !== 'Disabled';
        } else if (statusFilter === 'in-stock') {
            matchesStatus = p.stockStatus === 'In Stock';
        } else if (statusFilter === 'out-of-stock') {
            matchesStatus = p.stockStatus === 'Out of Stock';
        }

        return matchesSearch && matchesCat && matchesStatus;
    });

    renderCatalogPage();
}

async function quickEnableProduct(id, name) {
    const qtyStr = prompt(`Set initial inventory stock to enable and launch "${name}" on the live storefront:`, "10");
    if (qtyStr === null) return;
    const qty = parseInt(qtyStr, 10) || 0;

    try {
        const resp = await fetch('/api/db/products/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id,
                disabled: 0,
                active: 1,
                stockStatus: qty > 0 ? 'In Stock' : 'Out of Stock',
                stockQty: qty
            })
        });
        if (resp.ok) {
            alert(`"${name}" has been enabled and published live with ${qty} stock units!`);
            loadCatalogProducts();
            if (typeof loadInventoryData === 'function') loadInventoryData();
        } else {
            const data = await resp.json();
            alert(`Failed to enable product: ${data.error || 'Unknown error'}`);
        }
    } catch (err) {
        alert(`Error enabling product: ${err.message}`);
    }
}

function updateSkuSuggestion() {
    const category = document.getElementById('prodCategory').value;
    const catPrefixMap = {
        'necklace': 'NCK',
        'earrings': 'EAR',
        'ring': 'RNG',
        'bracelet': 'BRC',
        'pendant': 'PND'
    };
    const code = catPrefixMap[category] || category.substring(0, 3).toUpperCase();
    const count = dbProducts.filter(p => p.category === category).length;
    const editSku = document.getElementById('prodEditSku').value;
    
    if (editSku) {
        document.getElementById('prodSkuPreview').value = editSku;
    } else {
        document.getElementById('prodSkuPreview').value = `SRV-${code}-${String(count + 1).padStart(3, '0')}`;
    }
}

let modalEditingProductImages = [];

function normalizeProductImages(prod) {
    if (!prod) return [];
    
    // If product already has structured images array
    if (Array.isArray(prod.images) && prod.images.length > 0) {
        return prod.images.map((img, idx) => ({
            id: img.id || ('img_' + Math.random().toString(36).substr(2, 8)),
            url: typeof img === 'string' ? img : (img.url || ''),
            visible: typeof img === 'object' && img.visible !== undefined ? !!img.visible : true,
            isPrimary: typeof img === 'object' && img.isPrimary !== undefined ? !!img.isPrimary : (idx === 0),
            isHover: typeof img === 'object' && img.isHover !== undefined ? !!img.isHover : (idx === 1)
        })).filter(item => item.url && item.url.trim() !== '');
    }

    const list = [];
    const seen = new Set();

    const addImg = (url, isPrimary = false, isHover = false) => {
        if (!url || typeof url !== 'string') return;
        const clean = url.trim();
        if (!clean || seen.has(clean)) return;
        seen.add(clean);
        list.push({
            id: 'img_' + Math.random().toString(36).substr(2, 8),
            url: clean,
            visible: true,
            isPrimary: isPrimary,
            isHover: isHover
        });
    };

    if (prod.primaryImg) addImg(prod.primaryImg, true, false);
    if (prod.hoverImg) addImg(prod.hoverImg, list.length === 0, list.length > 0);

    if (Array.isArray(prod.gallery)) {
        prod.gallery.forEach(u => addImg(u, false, false));
    }

    if (list.length > 0 && !list.some(i => i.isPrimary)) {
        list[0].isPrimary = true;
    }
    if (list.length > 1 && !list.some(i => i.isHover)) {
        list[1].isHover = true;
    }

    return list;
}

function renderProductImagesManagerGrid(context = 'modal') {
    const list = modalEditingProductImages;
    const gridEl = document.getElementById('modalProductImagesGrid');
    const badgeEl = document.getElementById('modalImagesStatsBadge');

    if (!gridEl) return;

    const total = list.length;
    const visibleCount = list.filter(i => i.visible !== false).length;
    const hiddenCount = total - visibleCount;

    if (badgeEl) {
        badgeEl.innerHTML = `<i class="fa-solid fa-camera"></i> <strong>${total}</strong> Images (${visibleCount} Visible${hiddenCount > 0 ? `, <span style="color:#fca5a5;">${hiddenCount} Hidden</span>` : ''})`;
    }

    if (total === 0) {
        gridEl.innerHTML = `
            <div class="prod-images-empty-state">
                <i class="fa-regular fa-image" style="font-size: 2rem; color: var(--gold); margin-bottom: 8px; display: block;"></i>
                <strong style="color: var(--text); font-size: 0.95rem;">No Images Added Yet</strong>
                <p style="margin: 4px 0 0 0; color: var(--text-muted);">
                    Click <strong>Upload My Own Images</strong> above or drag & drop photos here to add imagery for this piece.
                </p>
            </div>
        `;
        const primInput = document.getElementById('prodPrimaryImg');
        const hovInput = document.getElementById('prodHoverImg');
        if (primInput) primInput.value = '';
        if (hovInput) hovInput.value = '';
        return;
    }

    gridEl.innerHTML = list.map((item, idx) => {
        const isPrim = !!item.isPrimary;
        const isHov = !!item.isHover;
        const isVis = item.visible !== false;

        return `
        <div class="prod-img-card ${isPrim ? 'is-primary' : ''} ${isHov ? 'is-hover' : ''} ${!isVis ? 'is-hidden' : ''}" id="card_portal_${item.id}">
            <div class="img-card-thumb-wrap">
                ${isPrim ? `<div class="card-role-pill pill-primary" title="Primary image shown on catalog cards and initial PDP load"><i class="fa-solid fa-star"></i> Primary</div>` : ''}
                ${isHov && !isPrim ? `<div class="card-role-pill pill-hover" title="Hover perspective image shown when mousing over catalog card"><i class="fa-solid fa-arrows-rotate"></i> Hover Flip</div>` : ''}
                
                <div class="card-status-pill ${isVis ? 'pill-status-visible' : 'pill-status-hidden'}" title="Storefront display status">
                    ${isVis ? '<i class="fa-solid fa-eye"></i> Visible' : '<i class="fa-solid fa-eye-slash"></i> Hidden'}
                </div>

                <img src="${item.url}" alt="Photo ${idx + 1}" 
                     onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';" 
                     onclick="inspectImage('${(item.url || '').replace(/'/g, "\\'")}', 'Product Photo ${idx + 1}')"
                     style="cursor: pointer;" title="Click to inspect resolution details">
            </div>

            <div class="img-card-body">
                <!-- Visibility Toggle Switch -->
                <button type="button" 
                        class="visibility-toggle-btn ${isVis ? 'btn-is-visible' : 'btn-is-hidden'}" 
                        onclick="toggleProductImageVisibility('${item.id}', '${context}')"
                        title="${isVis ? 'Click to hide this image from storefront' : 'Click to display this image in storefront'}">
                    ${isVis ? '<i class="fa-solid fa-eye"></i> Display in Store (ON)' : '<i class="fa-solid fa-eye-slash"></i> Hidden from Store (OFF)'}
                </button>

                <!-- Primary & Hover Selection Buttons -->
                <div class="card-role-buttons">
                    <button type="button" 
                            class="btn-role-action ${isPrim ? 'active-primary' : ''}" 
                            onclick="setProductImagePrimary('${item.id}', '${context}')"
                            title="Set as the main featured photo for catalog and PDP">
                        ${isPrim ? '★ Primary' : 'Make Primary'}
                    </button>
                    <button type="button" 
                            class="btn-role-action ${isHov ? 'active-hover' : ''}" 
                            onclick="setProductImageHover('${item.id}', '${context}')"
                            title="Set as card hover flip photo">
                        ${isHov ? '⟲ Hover' : 'Make Hover'}
                    </button>
                </div>

                <!-- Order and Actions Toolbar -->
                <div class="img-card-actions-row">
                    <div style="display: flex; gap: 4px;">
                        <button type="button" class="card-action-icon-btn" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} onclick="moveProductImageOrder('${item.id}', -1, '${context}')" title="Move Left / Earlier in Gallery">
                            <i class="fa-solid fa-arrow-left"></i>
                        </button>
                        <button type="button" class="card-action-icon-btn" ${idx === list.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} onclick="moveProductImageOrder('${item.id}', 1, '${context}')" title="Move Right / Later in Gallery">
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                    <div style="display: flex; gap: 4px;">
                        <button type="button" class="card-action-icon-btn btn-delete-img" onclick="deleteProductImageItem('${item.id}', '${context}')" title="Delete image from product">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    const primInput = document.getElementById('prodPrimaryImg');
    const hovInput = document.getElementById('prodHoverImg');
    const primItem = list.find(i => i.isPrimary && i.visible !== false) || list.find(i => i.visible !== false) || list[0];
    const hovItem = list.find(i => i.isHover && i.visible !== false) || (list.filter(i => i.visible !== false)[1] || primItem);

    if (primInput) primInput.value = primItem ? primItem.url : '';
    if (hovInput) hovInput.value = hovItem ? hovItem.url : (primItem ? primItem.url : '');
}

function toggleProductImageVisibility(imgId, context) {
    const list = modalEditingProductImages;
    const item = list.find(i => i.id === imgId);
    if (!item) return;

    item.visible = item.visible === false ? true : false;

    if (item.isPrimary && item.visible === false) {
        item.isPrimary = false;
        const nextVisible = list.find(i => i.visible !== false && i.id !== imgId);
        if (nextVisible) nextVisible.isPrimary = true;
    }

    if (item.isHover && item.visible === false) {
        item.isHover = false;
        const nextHover = list.find(i => i.visible !== false && !i.isPrimary);
        if (nextHover) nextHover.isHover = true;
    }

    renderProductImagesManagerGrid(context);
    showToast(item.visible ? "Image is now VISIBLE on store" : "Image is now HIDDEN from store");
}

function setProductImagePrimary(imgId, context) {
    const list = modalEditingProductImages;
    const item = list.find(i => i.id === imgId);
    if (!item) return;

    list.forEach(i => {
        i.isPrimary = (i.id === imgId);
        if (i.id === imgId) {
            i.visible = true;
            if (i.isHover) i.isHover = false;
        }
    });

    renderProductImagesManagerGrid(context);
    showToast("Set as Primary storefront photo");
}

function setProductImageHover(imgId, context) {
    const list = modalEditingProductImages;
    const item = list.find(i => i.id === imgId);
    if (!item) return;

    list.forEach(i => {
        i.isHover = (i.id === imgId);
        if (i.id === imgId) {
            i.visible = true;
            if (i.isPrimary) i.isPrimary = false;
        }
    });

    renderProductImagesManagerGrid(context);
    showToast("Set as Hover photo");
}

function moveProductImageOrder(imgId, direction, context) {
    const list = modalEditingProductImages;
    const idx = list.findIndex(i => i.id === imgId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[newIdx];
    list[newIdx] = temp;

    renderProductImagesManagerGrid(context);
}

function deleteProductImageItem(imgId, context) {
    const list = modalEditingProductImages;
    const idx = list.findIndex(i => i.id === imgId);
    if (idx < 0) return;

    const removed = list.splice(idx, 1)[0];
    if (removed.isPrimary && list.length > 0) {
        const nextVis = list.find(i => i.visible !== false) || list[0];
        if (nextVis) nextVis.isPrimary = true;
    }

    renderProductImagesManagerGrid(context);
    showToast("Image removed from product");
}

async function uploadImageFile(file, section = 'products') {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No file selected"));
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result;
            try {
                showToast("Uploading image to server...");
                const resp = await fetch('/api/admin/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: file.name,
                        section: section,
                        data: base64Data
                    })
                });
                const res = await resp.json();
                if (res.success && res.url) {
                    showToast("Image uploaded and saved to server!");
                    resolve(res.url);
                } else {
                    showToast("Upload failed: " + (res.error || "Unknown error"));
                    reject(new Error(res.error || "Upload failed"));
                }
            } catch (err) {
                showToast("Network upload error: " + err.message);
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function handleModalImageFilesUpload(event, context = 'modal') {
    const files = event.target.files;
    if (!files || !files.length) return;

    const list = modalEditingProductImages;
    showToast(`Uploading ${files.length} image(s) to server...`);

    let uploadedCount = 0;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const url = await uploadImageFile(file, 'products');
            if (url) {
                const isFirst = list.length === 0;
                list.push({
                    id: 'img_' + Math.random().toString(36).substr(2, 8),
                    url: url,
                    visible: true,
                    isPrimary: isFirst,
                    isHover: !isFirst && list.length === 1
                });
                uploadedCount++;
            }
        } catch (err) {
            console.error("Upload error for file", file.name, err);
        }
    }

    event.target.value = '';
    renderProductImagesManagerGrid(context);
    showToast(`Successfully added ${uploadedCount} new product image(s)!`);
}

function handleImageDropOver(event, el) {
    event.preventDefault();
    event.stopPropagation();
    el.classList.add('drag-active');
}

function handleImageDropLeave(event, el) {
    event.preventDefault();
    event.stopPropagation();
    el.classList.remove('drag-active');
}

async function handleImageDrop(event, el, context = 'modal') {
    event.preventDefault();
    event.stopPropagation();
    el.classList.remove('drag-active');

    const dt = event.dataTransfer;
    const files = dt?.files;
    if (files && files.length > 0) {
        await handleModalImageFilesUpload({ target: { files: files, value: '' } }, context);
    }
}

function handleAddCustomImageUrl(context = 'modal') {
    const input = document.getElementById('modalAddImageUrlInput');
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) {
        showToast("Please enter an image URL");
        return;
    }

    const list = modalEditingProductImages;
    const isFirst = list.length === 0;
    list.push({
        id: 'img_' + Math.random().toString(36).substr(2, 8),
        url: raw,
        visible: true,
        isPrimary: isFirst,
        isHover: !isFirst && list.length === 1
    });

    input.value = '';
    renderProductImagesManagerGrid(context);
    showToast("Added photo URL to piece");
}

const PORTAL_MASTER_CATEGORY_SUBCATEGORIES = {
    'necklace': ['Necklaces', 'Choker Necklaces', 'Traditional Necklaces', 'Bridal Necklaces', 'Classic Necklaces', 'Collar Necklaces', 'Mangalsutra', 'Aurous Collection'],
    'earrings': ['Earrings', 'Jhumka Earrings', 'Big Size Earrings', 'Medium Earrings', 'Small Earrings', 'Tops & Studs'],
    'wristwear': ['Wristwear', 'CZ Bangles', 'CZ Bracelets', 'Bracelets & Rings Combo'],
    'rings': ['Finger Rings', 'CZ Finger Rings'],
    'pendants': ['Pendants', 'CZ Pendant Sets', 'Pendants with Broad Chain', 'Pendants with Medium Chain'],
    'silver': ['Silver Jewellery', 'Sterling Silver', '925 Sterling Silver Earrings', '925 Sterling Finger Rings', '925 Sterling Silver Pendants'],
    'accessories': ['Accessories', 'CZ Accessories', 'CZ Brooches', 'Mangtika']
};

function getPortalDistinctSubCategories(category = 'all') {
    const subcats = new Set();
    const norm = (category || 'all').toLowerCase();
    if (norm === 'all') {
        Object.values(PORTAL_MASTER_CATEGORY_SUBCATEGORIES).forEach(subs => subs.forEach(s => subcats.add(s)));
    } else if (norm === 'wristwear' || norm === 'bracelets') {
        (PORTAL_MASTER_CATEGORY_SUBCATEGORIES['wristwear'] || []).forEach(s => subcats.add(s));
    } else if (PORTAL_MASTER_CATEGORY_SUBCATEGORIES[norm]) {
        PORTAL_MASTER_CATEGORY_SUBCATEGORIES[norm].forEach(s => subcats.add(s));
    }
    (dbProducts || []).forEach(p => {
        const c = (p.category || '').toLowerCase();
        if (norm === 'all' || c === norm || (norm === 'wristwear' && c === 'bracelets')) {
            const sub = (p.subCategory || '').trim();
            if (sub && sub !== '—' && sub !== '-') subcats.add(sub);
        }
    });
    return Array.from(subcats).sort();
}

function populatePortalModalSubCategory(category, currentVal = '') {
    const select = document.getElementById('prodSubCategorySelect');
    const input = document.getElementById('prodSubCategory');
    if (!select) return;

    const cat = category || 'wristwear';
    const cur = (currentVal || '').trim();
    const subs = getPortalDistinctSubCategories(cat);
    let html = '<option value="">— Select Sub-Category —</option>';
    let found = false;

    subs.forEach(s => {
        const isSel = (s.toLowerCase() === cur.toLowerCase());
        if (isSel) found = true;
        html += `<option value="${s.replace(/"/g, '&quot;')}" ${isSel ? 'selected' : ''}>${s.replace(/</g, '&lt;')}</option>`;
    });

    if (cur && !found && cur !== '__custom__' && cur !== '—' && cur !== '-') {
        html += `<option value="${cur.replace(/"/g, '&quot;')}" selected>${cur.replace(/</g, '&lt;')}</option>`;
        found = true;
    }

    html += '<option value="__custom__">✏️ Custom Sub-Category...</option>';
    select.innerHTML = html;

    if (input) {
        if (cur && !found) {
            select.value = '__custom__';
            input.style.display = 'block';
            input.value = cur;
        } else {
            select.value = cur || '';
            input.style.display = 'none';
            input.value = cur || '';
        }
    }
}

function handleModalCategoryChange(newCat) {
    populatePortalModalSubCategory(newCat, '');
}

function handleModalSubCategorySelectChange(val) {
    const input = document.getElementById('prodSubCategory');
    if (!input) return;
    if (val === '__custom__') {
        input.style.display = 'block';
        input.value = '';
        input.focus();
    } else {
        input.style.display = 'none';
        input.value = val;
    }
}

window.handleModalCategoryChange = handleModalCategoryChange;
window.handleModalSubCategorySelectChange = handleModalSubCategorySelectChange;
window.populatePortalModalSubCategory = populatePortalModalSubCategory;

function openAddProductModal() {
    const form = document.getElementById('productForm');
    form.reset();
    document.getElementById('prodEditId').value = "";
    document.getElementById('prodEditSku').value = "";
    document.getElementById('productModalTitle').textContent = "Add Jewelry Piece to Database";
    
    updateSkuSuggestion();
    populatePortalModalSubCategory('wristwear', '');
    modalEditingProductImages = [];
    renderProductImagesManagerGrid('modal');

    document.getElementById('productModalBackdrop').classList.add('active');
}

function openEditProductModal(id) {
    const prod = dbProducts.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('prodEditId').value = prod.id;
    document.getElementById('prodEditSku').value = prod.sku || "";
    document.getElementById('productModalTitle').textContent = `Edit: ${prod.name}`;

    document.getElementById('prodName').value = prod.name || "";
    document.getElementById('prodCategory').value = prod.category || "wristwear";
    populatePortalModalSubCategory(prod.category || "wristwear", prod.subCategory || "");
    document.getElementById('prodPlating').value = prod.plating || "gold";
    document.getElementById('prodBadge').value = prod.badge || "";
    document.getElementById('prodPriceINR').value = prod.priceINR || "";
    document.getElementById('prodOrigPriceINR').value = prod.originalPriceINR || prod.priceINR || "";
    document.getElementById('prodStockQty').value = prod.stockQty !== undefined ? prod.stockQty : 15;
    document.getElementById('prodThreshold').value = prod.lowStockThreshold || 5;
    document.getElementById('prodSkuPreview').value = prod.sku || "";
    document.getElementById('prodVideoUrl').value = prod.videoUrl || "";
    document.getElementById('prodDescription').value = prod.description || "";

    modalEditingProductImages = normalizeProductImages(prod);
    renderProductImagesManagerGrid('modal');

    document.getElementById('productModalBackdrop').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModalBackdrop').classList.remove('active');
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveProductBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

    const editId = document.getElementById('prodEditId').value;
    const sku = document.getElementById('prodSkuPreview').value;
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value;
    const subCatSelect = document.getElementById('prodSubCategorySelect');
    const subCatInput = document.getElementById('prodSubCategory');
    let subCategory = '';
    if (subCatSelect && subCatSelect.value === '__custom__') {
        subCategory = (subCatInput ? subCatInput.value : '').trim();
    } else if (subCatSelect && subCatSelect.value) {
        subCategory = subCatSelect.value.trim();
    } else if (subCatInput) {
        subCategory = subCatInput.value.trim();
    }
    const plating = document.getElementById('prodPlating').value;
    const badge = document.getElementById('prodBadge').value.trim();
    const priceINR = parseInt(document.getElementById('prodPriceINR').value, 10);
    const originalPriceINR = parseInt(document.getElementById('prodOrigPriceINR').value, 10) || priceINR;
    const stockQty = parseInt(document.getElementById('prodStockQty').value, 10);
    const lowStockThreshold = parseInt(document.getElementById('prodThreshold').value, 10);
    const videoUrl = document.getElementById('prodVideoUrl').value.trim();
    const description = document.getElementById('prodDescription').value.trim();

    const images = modalEditingProductImages;
    const visibleImages = images.filter(img => img.visible !== false);
    const primaryImg = images.find(img => img.isPrimary && img.visible !== false)?.url 
                    || visibleImages[0]?.url 
                    || (images[0]?.url || document.getElementById('prodPrimaryImg').value.trim());
    const hoverImg = images.find(img => img.isHover && img.visible !== false)?.url 
                   || (visibleImages[1]?.url || primaryImg);
    const gallery = visibleImages.length > 0 ? visibleImages.map(img => img.url) : (primaryImg ? [primaryImg] : []);

    if (!primaryImg && images.length === 0) {
        showToast("Please add or upload at least one image for this piece.");
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save to Database`;
        return;
    }

    const payload = {
        id: editId,
        sku,
        name,
        category,
        subCategory,
        plating,
        badge,
        priceINR,
        originalPriceINR,
        stockQty,
        lowStockThreshold,
        primaryImg,
        hoverImg,
        videoUrl,
        description,
        gallery,
        images,
        availableFinishes: ["24K Gold", "Rhodium Silver"],
        employeeName: currentStaff ? currentStaff.name : 'Owner'
    };

    const endpoint = editId ? '/api/db/products/update' : '/api/db/products';

    try {
        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const res = await resp.json();
        if (res.success) {
            closeProductModal();
            showToast(res.message || "Jewelry piece saved to database!");
            await loadCatalogProducts();
            await loadInventoryData();
        } else {
            alert("Error saving piece: " + (res.error || "Unknown server error"));
        }
    } catch (err) {
        alert("Server communication error: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save to Database`;
    }
}

async function deleteProduct(id, name) {
    if (!confirm(`Are you sure you want to permanently delete '${name}' from the database?\n\nThis will remove the product and its warehouse inventory SKU.`)) {
        return;
    }

    try {
        const resp = await fetch('/api/db/products/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                employeeName: currentStaff ? currentStaff.name : 'Owner'
            })
        });

        const res = await resp.json();
        if (res.success) {
            showToast(res.message || "Product deleted from database");
            await loadCatalogProducts();
            await loadInventoryData();
        } else {
            alert("Delete failed: " + (res.error || "Unknown server error"));
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

// ==========================================================================
// 6. LIVE INVENTORY & WAREHOUSE MANAGEMENT
// ==========================================================================
let inventoryCurrentPage = 1;
const inventoryPageSize = 50;
let filteredInventoryItems = [];

async function loadInventoryData() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    try {
        const resp = await fetch('/api/inventory');
        if (resp.ok) {
            inventoryItems = await resp.json();
            filteredInventoryItems = [...inventoryItems];
            inventoryCurrentPage = 1;
            renderInventoryPage();
            updateMetricsRibbon();
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef9a9a; padding: 20px;">Could not load stock: ${err.message}</td></tr>`;
    }
}

function changeInventoryPage(delta) {
    inventoryCurrentPage += delta;
    renderInventoryPage();
}

function renderInventoryPage() {
    const total = filteredInventoryItems.length;
    const totalPages = Math.max(1, Math.ceil(total / inventoryPageSize));
    if (inventoryCurrentPage > totalPages) inventoryCurrentPage = totalPages;
    if (inventoryCurrentPage < 1) inventoryCurrentPage = 1;

    const startIdx = (inventoryCurrentPage - 1) * inventoryPageSize;
    const pageItems = filteredInventoryItems.slice(startIdx, startIdx + inventoryPageSize);

    renderInventoryTable(pageItems);

    const pageInfo = document.getElementById('inventoryPageInfo');
    const pageBadge = document.getElementById('inventoryPageBadge');
    const prevBtn = document.getElementById('btnPrevInvPage');
    const nextBtn = document.getElementById('btnNextInvPage');

    if (pageInfo) {
        if (total === 0) {
            pageInfo.textContent = 'Showing 0 items';
        } else {
            const endIdx = Math.min(startIdx + inventoryPageSize, total);
            pageInfo.textContent = `Showing ${startIdx + 1} to ${endIdx.toLocaleString('en-IN')} of ${total.toLocaleString('en-IN')} stock records`;
        }
    }
    if (pageBadge) {
        pageBadge.textContent = `Page ${inventoryCurrentPage} of ${totalPages.toLocaleString('en-IN')}`;
    }
    if (prevBtn) prevBtn.disabled = inventoryCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = inventoryCurrentPage >= totalPages;
}

function renderInventoryTable(items) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No inventory records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(it => {
        let badgeClass = 'in-stock';
        if (it.status === 'Disabled') badgeClass = 'disabled';
        else if (it.status === 'Low Stock') badgeClass = 'low-stock';
        else if (it.status === 'Out of Stock') badgeClass = 'out-of-stock';

        return `
            <tr>
                <td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: var(--gold-light); font-weight: 600;">${it.sku}</code></td>
                <td><strong style="color: var(--text);">${it.productName}</strong></td>
                <td><span style="text-transform: capitalize;">${it.category}</span></td>
                <td style="text-align: center;">
                    <div class="stock-stepper">
                        <button type="button" onclick="quickAdjustStock('${it.id}', '${it.sku}', -1)">-</button>
                        <input type="number" id="qtyInput_${it.id}" value="${it.stockQty}" onchange="directUpdateStock('${it.id}', '${it.sku}', this.value)">
                        <button type="button" onclick="quickAdjustStock('${it.id}', '${it.sku}', 1)">+</button>
                    </div>
                </td>
                <td style="text-align: center;">
                    <input type="number" value="${it.lowStockThreshold || 5}" 
                           style="width: 60px; text-align: center; background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: 4px; color: var(--text); padding: 4px;"
                           onchange="directUpdateThreshold('${it.id}', '${it.sku}', this.value)">
                </td>
                <td>
                    <span class="badge-status ${badgeClass}">${it.status}</span>
                </td>
                <td style="text-align: right;">
                    <button class="btn-portal-outline btn-sm" onclick="quickRestockPrompt('${it.id}', '${it.sku}', '${it.productName.replace(/'/g, "\\'")}')">
                        <i class="fa-solid fa-boxes-packing"></i> Restock
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterInventoryTable() {
    inventoryCurrentPage = 1;
    const q = (document.getElementById('inventorySearchInput').value || '').toLowerCase().trim();
    const statusFilter = (document.getElementById('inventoryStatusFilter') ? document.getElementById('inventoryStatusFilter').value : '').toLowerCase().trim();

    filteredInventoryItems = inventoryItems.filter(it => {
        const matchesQuery = !q || 
            (it.sku && it.sku.toLowerCase().includes(q)) ||
            (it.productName && it.productName.toLowerCase().includes(q)) ||
            (it.category && it.category.toLowerCase().includes(q));

        let matchesStatus = true;
        if (statusFilter === 'disabled') {
            matchesStatus = it.status === 'Disabled';
        } else if (statusFilter === 'active') {
            matchesStatus = it.status !== 'Disabled';
        } else if (statusFilter === 'in-stock') {
            matchesStatus = it.status === 'In Stock';
        } else if (statusFilter === 'low-stock') {
            matchesStatus = it.status === 'Low Stock';
        } else if (statusFilter === 'out-of-stock') {
            matchesStatus = it.status === 'Out of Stock';
        }

        return matchesQuery && matchesStatus;
    });

    renderInventoryPage();
}

async function quickAdjustStock(id, sku, delta) {
    const input = document.getElementById(`qtyInput_${id}`);
    const currentVal = parseInt(input.value, 10) || 0;
    const newVal = Math.max(0, currentVal + delta);
    input.value = newVal;

    await directUpdateStock(id, sku, newVal);
}

async function directUpdateStock(id, sku, newQty) {
    try {
        const resp = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                sku,
                stockQty: parseInt(newQty, 10)
            })
        });
        const res = await resp.json();
        if (res.success) {
            showToast(`SKU ${sku} stock updated to ${newQty}!`);
            await loadInventoryData();
            await loadCatalogProducts();
        }
    } catch (err) {
        showToast("Error updating stock: " + err.message);
    }
}

async function directUpdateThreshold(id, sku, newThreshold) {
    const item = inventoryItems.find(i => i.id === id);
    const currQty = item ? item.stockQty : 10;
    try {
        const resp = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                sku,
                stockQty: currQty,
                lowStockThreshold: parseInt(newThreshold, 10)
            })
        });
        const res = await resp.json();
        if (res.success) {
            showToast(`Threshold updated for ${sku}`);
            await loadInventoryData();
        }
    } catch (err) {
        showToast("Error updating threshold");
    }
}

function quickRestockPrompt(id, sku, name) {
    const addUnits = prompt(`How many units are you adding to '${name}' (${sku})?`, "10");
    if (addUnits === null) return;
    const num = parseInt(addUnits, 10);
    if (!isNaN(num) && num > 0) {
        quickAdjustStock(id, sku, num);
    }
}

// ==========================================================================
// 7. ORDERS & CUSTOMER FULFILLMENT
// ==========================================================================
async function loadOrdersData() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    try {
        const resp = await fetch('/api/orders');
        if (resp.ok) {
            ordersData = await resp.json();
            renderOrdersTable(ordersData);
            updateMetricsRibbon();
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef9a9a; padding: 20px;">Could not load orders: ${err.message}</td></tr>`;
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No customer orders found in database.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(ord => {
        let badgeColor = '#ff9800';
        if (ord.status === 'Shipped') badgeColor = '#29b6f6';
        if (ord.status === 'Delivered') badgeColor = '#4caf50';
        if (ord.status === 'Cancelled') badgeColor = '#ef5350';

        return `
            <tr>
                <td>
                    <strong style="color: var(--gold-light); font-family: monospace; display: block;">${ord.orderNumber}</strong>
                    <a href="/api/orders/invoice?id=${ord.id}" target="_blank" style="font-size: 0.72rem; color: #e5c483; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; margin-top: 3px;" title="Open Digital Tax Invoice">
                        <i class="fa-solid fa-file-invoice"></i> ${ord.invoiceNumber || 'INV-' + (ord.orderNumber || '').replace('SRV-', '')}
                    </a>
                </td>
                <td>
                    <strong style="color: var(--text); display: block;">${ord.customerName}</strong>
                    <span style="font-size: 0.76rem; color: var(--text-muted);">${ord.customerEmail} • ${ord.customerPhone || ''}</span>
                </td>
                <td>
                    <span>${ord.city || '-'}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">${ord.shippingAddress || ''}</span>
                </td>
                <td><span style="font-size: 0.8rem; color: rgba(251,248,245,0.85);">${ord.itemsSummary || '-'}</span></td>
                <td><strong style="color: var(--gold-light);">₹${(ord.totalAmount || 0).toLocaleString('en-IN')}</strong></td>
                <td><span style="font-size: 0.76rem; color: var(--text-muted);">${ord.paymentMethod || 'UPI'}</span></td>
                <td>
                    <span class="badge-status" style="border: 1px solid ${badgeColor}; color: ${badgeColor}; background: rgba(0,0,0,0.25);">
                        ${ord.status}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; align-items: center; justify-content: flex-end;">
                        <a href="/api/orders/invoice?id=${ord.id}" target="_blank" class="btn-portal-outline" style="padding: 4px 8px; font-size: 0.74rem; text-decoration: none; color: var(--gold-light); border-color: rgba(197,160,89,0.35); display: inline-flex; align-items: center; gap: 4px;" title="View & Print Official Digital Tax Invoice">
                            <i class="fa-solid fa-file-invoice-dollar"></i> Invoice
                        </a>
                        <select class="portal-select" style="padding: 4px 8px; font-size: 0.76rem; width: 110px;" 
                                onchange="updateOrderStatus('${ord.id}', '${ord.orderNumber}', this.value)">
                            <option value="Pending" ${ord.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Processing" ${ord.status === 'Processing' ? 'selected' : ''}>Processing</option>
                            <option value="Shipped" ${ord.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Delivered" ${ord.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="Cancelled" ${ord.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterOrdersTable() {
    const status = document.getElementById('orderStatusFilter').value;
    if (!status) {
        renderOrdersTable(ordersData);
    } else {
        renderOrdersTable(ordersData.filter(o => o.status === status));
    }
}

async function updateOrderStatus(orderId, orderNum, newStatus) {
    try {
        const resp = await fetch('/api/orders/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: orderId, orderNumber: orderNum, status: newStatus })
        });
        const res = await resp.json();
        if (res.success) {
            showToast(`Order ${orderNum} status set to "${newStatus}"!`);
            await loadOrdersData();
        }
    } catch (err) {
        showToast("Error updating order status: " + err.message);
    }
}

// ==========================================================================
// 8. TEAM & STAFF ACCOUNTS MANAGEMENT (OWNER ONLY)
// ==========================================================================
async function loadTeamData() {
    const tbody = document.getElementById('teamTableBody');
    if (!tbody) return;

    try {
        const resp = await fetch('/api/employees');
        if (resp.ok) {
            employeesList = await resp.json();
            renderTeamTable(employeesList);
            renderQuickEmployeeCards(employeesList);
            renderShareCredentialsTable(employeesList);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef9a9a;">Could not load team accounts.</td></tr>`;
    }
}

function renderTeamTable(employees) {
    const tbody = document.getElementById('teamTableBody');
    if (!tbody) return;

    tbody.innerHTML = employees.map(emp => {
        const caps = [];
        if (emp.permissions?.canManageProducts) caps.push("Catalog (Add/Edit)");
        if (emp.permissions?.canManageStock) caps.push("Stock Control");
        if (emp.permissions?.canManageOrders) caps.push("Orders & Delivery");
        if (emp.permissions?.canManageTeam) caps.push("Team Manager");

        return `
            <tr>
                <td style="font-size: 1.4rem;">${emp.avatar || '💎'}</td>
                <td><strong style="color: var(--text);">${emp.name}</strong></td>
                <td><code>${emp.email}</code></td>
                <td><span style="color: var(--gold-light); font-weight: 600;">${emp.role}</span></td>
                <td><code style="background: rgba(197, 160, 89, 0.15); color: var(--gold-light); padding: 2px 8px; border-radius: 4px; letter-spacing: 2px; font-weight: bold;">${emp.pin || '****'}</code></td>
                <td><span style="font-size: 0.78rem; color: var(--text-muted);">${caps.join(' • ') || 'Read Only'}</span></td>
                <td style="text-align: right;">
                    ${emp.role !== 'Owner' ? `
                        <button class="btn-icon btn-sm btn-delete" onclick="deactivateEmployee('${emp.id}', '${emp.name.replace(/'/g, "\\'")}')" title="Deactivate staff account">
                            <i class="fa-solid fa-user-xmark"></i>
                        </button>
                    ` : '<span style="color: var(--gold); font-size: 0.75rem;">👑 Owner</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

function openAddEmployeeModal() {
    document.getElementById('employeeForm').reset();
    document.getElementById('empEditId').value = "";
    document.getElementById('employeeModalBackdrop').classList.add('active');
}

function closeEmployeeModal() {
    document.getElementById('employeeModalBackdrop').classList.remove('active');
}

function updateRoleAvatar() {
    const role = document.getElementById('empRole').value;
    const pinInput = document.getElementById('empPin');
    if (!pinInput.value) {
        // Suggest pin
        pinInput.value = String(1000 + Math.floor(Math.random() * 900));
    }
}

async function handleSaveEmployee(e) {
    e.preventDefault();
    const name = document.getElementById('empName').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    const role = document.getElementById('empRole').value;
    const pin = document.getElementById('empPin').value.trim();

    const avatarMap = {
        'Owner': '👑',
        'Catalog Specialist': '💎',
        'Inventory Manager': '📦',
        'Orders & Fulfillment': '🚚'
    };

    try {
        const resp = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                email,
                role,
                pin,
                avatar: avatarMap[role] || '💎',
                operatorName: currentStaff ? currentStaff.name : 'Owner'
            })
        });

        const res = await resp.json();
        if (res.success) {
            closeEmployeeModal();
            showToast(`Team member '${name}' registered successfully!`);
            await loadTeamData();
        } else {
            alert("Error: " + (res.error || "Could not save employee"));
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

async function deactivateEmployee(id, name) {
    if (!confirm(`Deactivate staff account for '${name}'?\n\nThey will no longer be able to log into the database GUI.`)) {
        return;
    }

    try {
        const resp = await fetch('/api/employees/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                operatorName: currentStaff ? currentStaff.name : 'Owner'
            })
        });
        const res = await resp.json();
        if (res.success) {
            showToast(`Account for ${name} deactivated`);
            await loadTeamData();
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

// ==========================================================================
// 9. AUDIT TRAIL / ACTIVITY HISTORY
// ==========================================================================
async function loadAuditHistory() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    try {
        const resp = await fetch('/api/audit-log');
        if (resp.ok) {
            const logs = await resp.json();
            renderAuditTable(logs);
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef9a9a;">Could not load history.</td></tr>`;
    }
}

function renderAuditTable(logs) {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">No activity recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(l => `
        <tr>
            <td style="color: var(--text-muted); font-size: 0.78rem; font-family: monospace;">${l.timestamp || '-'}</td>
            <td><strong style="color: var(--gold-light);">${l.employeeName}</strong></td>
            <td><span class="badge-status in-stock">${l.action}</span></td>
            <td><code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${l.targetType}</code></td>
            <td style="font-size: 0.8rem; color: rgba(251,248,245,0.85);">${l.details}</td>
        </tr>
    `).join('');
}

// ==========================================================================
// 10. LOCAL WI-FI SHARING MODAL CONTROLLER
// ==========================================================================
function openShareModal() {
    renderShareCredentialsTable(employeesList);
    document.getElementById('shareModalBackdrop').classList.add('active');
}

function closeShareModal() {
    document.getElementById('shareModalBackdrop').classList.remove('active');
}

function copyShareUrl(inputId) {
    const el = document.getElementById(inputId);
    if (!el || !el.value) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(el.value).then(() => {
            showToast("Sharing URL copied to clipboard!");
        }).catch(() => {
            el.select();
            document.execCommand('copy');
            showToast("URL copied!");
        });
    } else {
        el.select();
        document.execCommand('copy');
        showToast("URL copied!");
    }
}

function renderShareCredentialsTable(employees) {
    const container = document.getElementById('shareCredentialsTable');
    if (!container) return;

    if (!employees || employees.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted);">Loading team accounts...</p>`;
        return;
    }

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
                <tr style="border-bottom: 1px solid var(--border-subtle); color: var(--gold-light);">
                    <th style="padding: 6px;">Staff Member</th>
                    <th style="padding: 6px;">Role</th>
                    <th style="padding: 6px;">Email</th>
                    <th style="padding: 6px; text-align: right;">4-Digit PIN</th>
                </tr>
            </thead>
            <tbody>
                ${employees.map(e => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                        <td style="padding: 6px;">${e.avatar || '💎'} ${e.name}</td>
                        <td style="padding: 6px; color: var(--text-muted);">${e.role}</td>
                        <td style="padding: 6px;"><code>${e.email}</code></td>
                        <td style="padding: 6px; text-align: right;"><code style="background: rgba(197, 160, 89, 0.15); color: var(--gold-light); font-weight: bold; padding: 2px 6px; border-radius: 4px;">${e.pin}</code></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ==========================================================================
// 11. IMAGE DETAILS & RESOLUTION INSPECTOR (PORTAL VERSION)
// ==========================================================================
function previewPortalImg(url, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const metaContainer = document.getElementById(`meta_${targetId}`);
    const cleanUrl = (url || '').trim();

    if (!cleanUrl) {
        el.src = '';
        el.style.display = 'none';
        if (metaContainer) metaContainer.innerHTML = '';
        return;
    }

    el.style.display = 'block';
    el.style.cursor = 'pointer';
    el.title = 'Click to inspect full resolution & health check';
    el.onclick = () => inspectImageDetails(cleanUrl, targetId);

    el.onload = function() {
        const nw = el.naturalWidth || 0;
        const nh = el.naturalHeight || 0;
        const spec = IMAGE_SPEC_STANDARDS[targetId] || { targetWidth: 1000, targetHeight: 1000, ratioLabel: '1:1 (Square)', ratioVal: 1 };
        const analysis = analyzeImageHealth(nw, nh, spec);

        if (metaContainer) {
            metaContainer.innerHTML = `
                <div class="img-live-meta-badge" onclick="inspectImageDetails('${cleanUrl.replace(/'/g, "\\'")}', '${targetId}')" title="Click to view detailed health report">
                    <span class="status-dot ${analysis.status}"></span>
                    <span>Live: <strong>${nw} × ${nh} px</strong> (${analysis.ratioStr})</span>
                    <span style="margin-left: auto; color: var(--gold-light); font-weight: 500;">Details & Health <i class="fa-solid fa-arrow-right" style="font-size: 0.65rem;"></i></span>
                </div>
            `;
        }
    };

    el.onerror = function() {
        if (metaContainer) {
            metaContainer.innerHTML = `
                <div class="img-live-meta-badge" style="border-color: rgba(244,67,54,0.4);">
                    <span class="status-dot error"></span>
                    <span style="color: #ef9a9a;">Could not load image from this URL</span>
                </div>
            `;
        }
    };

    el.src = cleanUrl;
}

function handlePortalFileUpload(event, inputId, previewId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const inputEl = document.getElementById(inputId);
        if (inputEl) {
            inputEl.value = dataUrl;
        }
        if (previewId) {
            previewPortalImg(dataUrl, previewId);
        }
        showToast(`Loaded image "${file.name}" (${(file.size / 1024).toFixed(0)} KB)`);
    };
    reader.readAsDataURL(file);
}

function analyzeImageHealth(nw, nh, spec) {
    if (!nw || !nh) {
        return { status: 'error', icon: 'fa-solid fa-circle-xmark', title: 'Load Error', msg: 'Could not decode image.', ratioStr: 'Unknown' };
    }

    const actualRatio = nw / nh;
    let ratioStr = `${nw}:${nh}`;
    if (Math.abs(actualRatio - 1) < 0.04) ratioStr = '1:1 (Square)';
    else if (Math.abs(actualRatio - (16 / 9)) < 0.06) ratioStr = '16:9 (Landscape)';
    else if (Math.abs(actualRatio - 4) < 0.2) ratioStr = '4:1 (Wide Strip)';
    else if (Math.abs(actualRatio - (5 / 6)) < 0.06) ratioStr = '5:6 (Portrait)';
    else if (Math.abs(actualRatio - (4 / 3)) < 0.05) ratioStr = '4:3 (Standard)';
    else if (Math.abs(actualRatio - (3 / 4)) < 0.05) ratioStr = '3:4 (Portrait)';
    else if (Math.abs(actualRatio - (2 / 3)) < 0.05) ratioStr = '2:3 (Tall Portrait)';
    else if (Math.abs(actualRatio - (9 / 16)) < 0.06) ratioStr = '9:16 (Vertical)';
    else ratioStr = `${actualRatio.toFixed(2)}:1`;

    let status = 'optimal';
    let icon = 'fa-solid fa-circle-check';
    let title = 'Adaptive Proportions: Perfect Fit';
    let msg = `This image displays at its natural size (${nw} × ${nh} px, ${ratioStr}) without cropping, stretching, or restrictive box constraints.`;

    if (nw < 180 || nh < 180) {
        status = 'caution';
        icon = 'fa-solid fa-triangle-exclamation';
        title = 'Low Resolution Notice';
        msg = `At ${nw} × ${nh} px, this image is small and may appear slightly soft on high-DPI Retina screens.`;
    }

    return { status, icon, title, msg, ratioStr, actualRatio };
}

function inspectImageDetails(urlOrTargetId, slotKey, customTitle) {
    let url = '';
    let key = slotKey || '';

    const el = document.getElementById(urlOrTargetId);
    if (el && el.tagName === 'IMG') {
        url = el.src;
        key = key || urlOrTargetId;
    } else if (typeof urlOrTargetId === 'string' && (urlOrTargetId.startsWith('http') || urlOrTargetId.startsWith('assets/') || urlOrTargetId.startsWith('/') || urlOrTargetId.startsWith('data:'))) {
        url = urlOrTargetId;
    } else if (el && el.tagName === 'INPUT') {
        url = el.value.trim();
        key = key || urlOrTargetId;
    }

    if (!url) {
        showToast("Please enter an image URL first to inspect details.");
        return;
    }

    const spec = IMAGE_SPEC_STANDARDS[key] || {
        name: customTitle || 'Jewelry Product Photo',
        purpose: 'Catalog photo for shop grid cards, cart items, and quick view modals.',
        targetWidth: 'Flexible',
        targetHeight: 'Flexible',
        ratioLabel: 'Any Ratio (Adaptive)',
        ratioVal: null,
        format: 'JPG, WebP, PNG',
        maxSizeKb: 2500
    };

    const modalBackdrop = document.getElementById('imageInspectorModalBackdrop');
    const modalTitle = document.getElementById('inspectorModalTitle');
    const imgEl = document.getElementById('inspectorImageEl');
    const slotName = document.getElementById('inspectorSlotName');
    const slotPurpose = document.getElementById('inspectorSlotPurpose');
    const liveRes = document.getElementById('inspectorLiveRes');
    const liveRatio = document.getElementById('inspectorLiveRatio');
    const targetRes = document.getElementById('inspectorTargetRes');
    const targetRatio = document.getElementById('inspectorTargetRatio');
    const verdictBox = document.getElementById('inspectorVerdictBox');
    const verdictIcon = document.getElementById('inspectorVerdictIcon');
    const verdictTitle = document.getElementById('inspectorVerdictTitle');
    const verdictMsg = document.getElementById('inspectorVerdictMsg');
    const urlInput = document.getElementById('inspectorUrlInput');
    const openLink = document.getElementById('inspectorOpenLink');

    if (modalTitle) modalTitle.textContent = customTitle ? `Inspector: ${customTitle}` : "Image Details & Resolution Inspector";
    if (slotName) slotName.textContent = spec.name;
    if (slotPurpose) slotPurpose.textContent = `${spec.purpose} Format: ${spec.format} • Max size: < ${spec.maxSizeKb} KB.`;
    if (targetRes) targetRes.textContent = `${spec.targetWidth} × ${spec.targetHeight} px`;
    if (targetRatio) targetRatio.textContent = `Target: ${spec.ratioLabel}`;
    if (urlInput) urlInput.value = url;
    if (openLink) openLink.href = url;

    if (liveRes) liveRes.textContent = "Detecting...";
    if (liveRatio) liveRatio.textContent = "Measuring dimensions...";

    imgEl.onload = function() {
        const nw = imgEl.naturalWidth || 0;
        const nh = imgEl.naturalHeight || 0;
        const analysis = analyzeImageHealth(nw, nh, spec);

        if (liveRes) liveRes.textContent = `${nw} × ${nh} px`;
        if (liveRatio) liveRatio.textContent = `Ratio: ${analysis.ratioStr}`;

        if (verdictBox) verdictBox.className = `img-verdict-box ${analysis.status}`;
        if (verdictIcon) verdictIcon.className = analysis.icon;
        if (verdictTitle) verdictTitle.textContent = analysis.title;
        if (verdictMsg) verdictMsg.textContent = analysis.msg;
    };

    imgEl.onerror = function() {
        if (liveRes) liveRes.textContent = "Error loading";
        if (liveRatio) liveRatio.textContent = "Could not decode image";
        if (verdictBox) verdictBox.className = "img-verdict-box error";
        if (verdictIcon) verdictIcon.className = "fa-solid fa-circle-xmark";
        if (verdictTitle) verdictTitle.textContent = "Image Load Failure";
        if (verdictMsg) verdictMsg.textContent = "Browser failed to load or decode image from this URL.";
    };

    imgEl.src = url;

    if (modalBackdrop) modalBackdrop.classList.add('active');
}

function closeImageInspector() {
    const backdrop = document.getElementById('imageInspectorModalBackdrop');
    if (backdrop) backdrop.classList.remove('active');
}

function copyInspectorUrl() {
    const input = document.getElementById('inspectorUrlInput');
    if (!input || !input.value) return;
    navigator.clipboard.writeText(input.value).then(() => {
        showToast("Image URL copied to clipboard!");
    }).catch(() => {
        input.select();
        document.execCommand('copy');
        showToast("Image URL copied!");
    });
}

// ==========================================================================
// 12. METRICS RIBBON CALCULATOR
// ==========================================================================
function updateMetricsRibbon() {
    const prodCountEl = document.getElementById('kpiProdCount');
    const totalUnitsEl = document.getElementById('kpiTotalUnits');
    const lowStockEl = document.getElementById('kpiLowStock');
    const pendingOrdersEl = document.getElementById('kpiPendingOrders');

    if (prodCountEl) prodCountEl.textContent = `${dbProducts.length} Pieces`;

    const totalUnits = inventoryItems.reduce((acc, it) => acc + (parseInt(it.stockQty, 10) || 0), 0);
    if (totalUnitsEl) totalUnitsEl.textContent = `${totalUnits.toLocaleString('en-IN')} Units`;

    const lowStockCount = inventoryItems.filter(it => it.status === 'Low Stock' || it.status === 'Out of Stock').length;
    if (lowStockEl) lowStockEl.textContent = `${lowStockCount} Items`;

    const pendingOrdersCount = ordersData.filter(o => o.status === 'Pending' || o.status === 'Processing').length;
    if (pendingOrdersEl) pendingOrdersEl.textContent = `${pendingOrdersCount} Orders`;
}

// ==========================================================================
// 13. TOAST NOTIFICATIONS HELPER
// ==========================================================================
function showToast(msg) {
    const container = document.getElementById('portalToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-sparkles"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}
