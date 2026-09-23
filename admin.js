/* ==========================================================================
   SORÈVA LUXURY JEWELLERY - ADMIN CONTROL ENGINE
   Provides authentication, data synchronization, and complete CRUD operations
   for over 90% of website content.
   ========================================================================== */

let storeData = null;
let currentEditingItem = null;
let inventoryData = [];
let customersData = [];
let ordersData = [];
let databaseInfo = null;

// Default Password SHA-256 (soreva@2026)
const DEFAULT_PASSWORD_HASH = "3779c849af88128e466010f799175ce3344f2392947810fa4501766c0664d846";

// ==========================================
// INITIALIZATION & AUTHENTICATION GATE
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    checkAdminSession();
    initTabNavigation();
});

// Calculate SHA-256 using Browser Web Crypto API
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Session Check
function checkAdminSession() {
    const isAuth = sessionStorage.getItem('soreva_admin_authenticated');
    const loginWrapper = document.getElementById('loginWrapper');
    const adminLayout = document.getElementById('adminLayout');

    if (isAuth === 'true') {
        loginWrapper.style.display = 'none';
        adminLayout.style.display = 'flex';
        loadStoreData();
    } else {
        loginWrapper.style.display = 'flex';
        adminLayout.style.display = 'none';
    }
}

// Handle Login
async function handleAdminLogin(e) {
    e.preventDefault();
    const pwInput = document.getElementById('adminPassword');
    const errorBox = document.getElementById('loginErrorBox');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const password = pwInput.value.trim();

    if (!password) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;
    errorBox.style.display = 'none';

    try {
        const inputHash = await sha256(password);

        // Try server API first
        let authenticated = false;
        try {
            const resp = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passwordHash: inputHash })
            });
            const res = await resp.json();
            if (res.success) {
                authenticated = true;
            }
        } catch (err) {
            // If server offline, verify against local/stored hash
            const cached = localStorage.getItem('soreva_store_data');
            const targetHash = cached ? (JSON.parse(cached).settings?.adminPasswordHash || DEFAULT_PASSWORD_HASH) : DEFAULT_PASSWORD_HASH;
            if (inputHash === targetHash) {
                authenticated = true;
            }
        }

        if (authenticated) {
            sessionStorage.setItem('soreva_admin_authenticated', 'true');
            checkAdminSession();
            showToast("Welcome to Sorèva Admin Suite!");
        } else {
            errorBox.textContent = "Incorrect administrator password. Please try again.";
            errorBox.style.display = 'block';
            pwInput.select();
        }
    } catch (err) {
        errorBox.textContent = `Authentication error: ${err.message}`;
        errorBox.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> <span>Unlock Admin Panel</span>`;
    }
}

// Handle Logout
function handleAdminLogout() {
    if (confirm("Are you sure you want to log out of the admin session?")) {
        sessionStorage.removeItem('soreva_admin_authenticated');
        checkAdminSession();
        showToast("Logged out successfully");
    }
}

// Toggle Password Visibility
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-regular fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fa-regular fa-eye';
    }
}

// ==========================================
// DATA ENGINE (LOAD & SAVE)
// ==========================================
async function loadStoreData() {
    try {
        // Attempt to fetch from server first
        const resp = await fetch('/api/store-data');
        if (resp.ok) {
            storeData = await resp.json();
            try {
                const cacheable = { ...storeData, products: (storeData.products || []).slice(0, 50) };
                localStorage.setItem('soreva_store_data', JSON.stringify(cacheable));
            } catch (e) {}
        } else {
            throw new Error("Server returned non-200");
        }
    } catch (err) {
        console.warn("Falling back to local storage cache:", err);
        const cached = localStorage.getItem('soreva_store_data');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const hasLegacyDummy = parsed && parsed.products && parsed.products.some(p => typeof p.id === 'number' || (p.primaryImg && p.primaryImg.includes('unsplash')));
                if (hasLegacyDummy) {
                    localStorage.removeItem('soreva_store_data');
                } else {
                    storeData = parsed;
                }
            } catch (e) {
                localStorage.removeItem('soreva_store_data');
            }
        }
        if (!storeData) {
            try {
                const staticResp = await fetch('/data/store-data.json');
                storeData = await staticResp.json();
            } catch (e) {
                console.error("Failed to load store-data.json:", e);
            }
        }
    }

    if (storeData) {
        if (storeData.settings) {
            if (!storeData.settings.logoUrl || storeData.settings.logoUrl.includes('soreva.in')) {
                storeData.settings.logoUrl = 'assets/logo-black.png';
            }
            if (!storeData.settings.logoWhiteUrl) {
                storeData.settings.logoWhiteUrl = 'assets/logo-white.png';
            }
        }
        renderAllPanels();
        setSaveStatus(true);
    }
}

async function saveAllStoreData(silent = false) {
    if (!storeData) return;

    setSaveStatus(false, "Saving changes...");

    // 1. Save to LocalStorage immediately for zero-delay client reflection
    localStorage.setItem('soreva_store_data', JSON.stringify(storeData));

    // 2. Persist to server disk
    try {
        const resp = await fetch('/api/store-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storeData)
        });
        if (resp.ok) {
            setSaveStatus(true, "All Changes Saved");
            if (!silent) showToast("Saved successfully to disk & live store!");
        } else {
            throw new Error("Failed to persist to server disk");
        }
    } catch (err) {
        setSaveStatus(true, "Saved to Local Cache");
        if (!silent) showToast("Changes saved locally in browser cache.");
    }

    // Refresh metrics & counts
    updateBadgeCounts();
}

function setSaveStatus(saved, text) {
    const pill = document.getElementById('saveStatusPill');
    if (!pill) return;
    if (saved) {
        pill.className = "save-status-pill";
        pill.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${text || 'All Changes Saved'}</span>`;
    } else {
        pill.className = "save-status-pill";
        pill.style.background = "rgba(197, 160, 89, 0.2)";
        pill.style.borderColor = "var(--gold)";
        pill.style.color = "var(--gold-light)";
        pill.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${text || 'Saving...'}</span>`;
    }
}

// ==========================================
// TAB NAVIGATION
// ==========================================
function initTabNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });

    const titleEl = document.getElementById('currentSectionTitle');
    const titles = {
        overview: "Dashboard Overview",
        orders: "Orders & Sales Fulfillment",
        inventory: "Stock & Inventory Control",
        customers: "Customer Directory & CRM",
        database: "PocketBase & SQLite Database Hub",
        hero: "Hero Slider Looks",
        products: "Product Catalog Management",
        categories: "Category Cards Showcase",
        announcements: "Promotional Announcement Ticker",
        coupons: "Promo Coupons & Discount Codes",
        currencies: "Currency & Exchange Rates",
        spotlight: "Brand Story & Craftsmanship",
        testimonials: "Customer Testimonials",
        instagram: "#SorèvaMoments Social Feed",
        settings: "Boutique Settings & Security"
    };
    if (titleEl && titles[tabName]) {
        titleEl.textContent = titles[tabName];
    }

    // Trigger data refresh on tab switch
    if (tabName === 'orders') fetchOrders();
    if (tabName === 'inventory') fetchInventory();
    if (tabName === 'customers') fetchCustomers();
    if (tabName === 'database') fetchDatabaseInfo();

    // Close mobile sidebar if open
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.remove('open');
}

function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// ==========================================
// MASTER RENDER DISPATCHER
// ==========================================
function renderAllPanels() {
    if (!storeData) return;
    renderOverview();
    renderHeroSlides();
    renderProductsTable();
    renderCategoriesGrid();
    renderAnnouncementsList();
    renderCouponsGrid();
    renderCurrenciesTable();
    renderSpotlightForm();
    renderTestimonialsGrid();
    renderInstagramGrid();
    renderSettingsForm();
    updateBadgeCounts();

    // Fetch live database tables
    fetchInventory();
    fetchCustomers();
    fetchOrders();
    fetchDatabaseInfo();
}

function updateBadgeCounts() {
    if (!storeData) return;
    const heroCount = (storeData.heroSlides || []).length;
    const prodCount = (storeData.products || []).length;
    const catCount = (storeData.categories || []).length;
    const couponCount = (storeData.coupons || []).length;
    const reviewCount = (storeData.testimonials || []).length;

    const setBadge = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
    };

    setBadge('countBadgeHero', heroCount);
    setBadge('countBadgeProducts', prodCount);
    setBadge('countBadgeCategories', catCount);
    setBadge('countBadgeCoupons', couponCount);
    setBadge('countBadgeReviews', reviewCount);

    setBadge('statTotalProducts', prodCount);
    setBadge('statHeroSlides', heroCount);
    setBadge('statCategories', catCount);
    setBadge('statCoupons', couponCount);
    setBadge('productsCountLabel', prodCount);
    setBadge('heroSlidesCountLabel', heroCount);

    if (inventoryData && inventoryData.length) {
        setBadge('countBadgeInventory', inventoryData.length);
        setBadge('inventoryCountHeader', inventoryData.length);
    }
    if (customersData && customersData.length) {
        setBadge('countBadgeCustomers', customersData.length);
        setBadge('customersCountHeader', customersData.length);
        setBadge('statTotalCustomers', customersData.length);
    }
    if (ordersData && ordersData.length) {
        setBadge('countBadgeOrders', ordersData.length);
        setBadge('ordersCountHeader', ordersData.length);
        setBadge('statTotalOrders', ordersData.length);
    }
}

// ==========================================
// 1. OVERVIEW PANEL
// ==========================================
function renderOverview() {
    const settings = storeData.settings || {};
    const shippingInput = document.getElementById('quickShippingInput');
    const launchDiscountInput = document.getElementById('quickLaunchDiscountInput');
    const tickerSpeedInput = document.getElementById('quickTickerSpeedInput');

    if (shippingInput) shippingInput.value = settings.freeShippingThresholdINR || 2499;

    const launchCoupon = (storeData.coupons || []).find(c => c.code === 'LAUNCH15');
    if (launchDiscountInput && launchCoupon) launchDiscountInput.value = launchCoupon.discountPercent;

    if (tickerSpeedInput) tickerSpeedInput.value = (settings.tickerSpeedMs || 4500) / 1000;
}

function updateShippingThreshold(val) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
        storeData.settings.freeShippingThresholdINR = num;
        saveAllStoreData(true);
        showToast(`Free shipping threshold set to ₹${num.toLocaleString('en-IN')}`);
    }
}

function updateLaunchDiscount(val) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 100) {
        const coupon = storeData.coupons.find(c => c.code === 'LAUNCH15');
        if (coupon) {
            coupon.discountPercent = num;
            saveAllStoreData(true);
            showToast(`LAUNCH15 coupon discount updated to ${num}%`);
        }
    }
}

function updateTickerSpeed(val) {
    const sec = parseFloat(val);
    if (!isNaN(sec) && sec >= 1) {
        storeData.settings.tickerSpeedMs = Math.round(sec * 1000);
        saveAllStoreData(true);
        showToast(`Ticker speed set to ${sec}s`);
    }
}

// ==========================================
// 2. HERO SLIDES MANAGER
// ==========================================
function renderHeroSlides() {
    const container = document.getElementById('heroSlidesAdminList');
    if (!container) return;

    const slides = storeData.heroSlides || [];
    if (slides.length === 0) {
        container.innerHTML = `<p style="color: var(--admin-text-muted);">No hero slides found. Click 'Add New Slide' to create one.</p>`;
        return;
    }

    container.innerHTML = slides.map((slide, idx) => `
        <div class="hero-slide-admin-card" data-id="${slide.id}">
            <div class="slide-img-preview" onclick="inspectImageDetails('${(slide.image || '').replace(/'/g, "\\'")}', 'heroPreviewImg', 'Hero Slide: ${(slide.name || 'Banner').replace(/'/g, "\\'")}')" style="cursor: pointer;" title="Click to inspect slide resolution & specs">
                <img src="${slide.image}" alt="${slide.name}">
                <span class="slide-tag-pill">${slide.tag}</span>
            </div>
            <div class="slide-card-body">
                <h4>${slide.headline.replace(/<[^>]*>?/gm, '')}</h4>
                <p>${slide.subtitle}</p>
                <div class="slide-card-meta">
                    <span>${slide.name}</span>
                    <span>₹${slide.priceINR.toLocaleString('en-IN')} • ${slide.finish}</span>
                </div>
                <div class="slide-card-actions">
                    <button class="btn-admin-outline btn-sm" onclick="openHeroSlideModal(${slide.id})">
                        <i class="fa-regular fa-pen-to-square"></i> Edit
                    </button>
                    ${idx > 0 ? `<button class="btn-icon btn-sm" onclick="moveHeroSlide(${idx}, -1)" title="Move Left/Up"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
                    ${idx < slides.length - 1 ? `<button class="btn-icon btn-sm" onclick="moveHeroSlide(${idx}, 1)" title="Move Right/Down"><i class="fa-solid fa-arrow-right"></i></button>` : ''}
                    <button class="btn-icon btn-delete btn-sm" onclick="deleteHeroSlide(${slide.id})" title="Delete Slide" style="margin-left: auto;">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function openHeroSlideModal(id = null) {
    const backdrop = document.getElementById('heroModalBackdrop');
    const title = document.getElementById('heroModalTitle');
    const form = document.getElementById('heroSlideForm');
    const productSelect = document.getElementById('heroPieceProductId');

    // Populate products dropdown
    productSelect.innerHTML = (storeData.products || []).map(p => `
        <option value="${p.id}">${p.name} (₹${p.priceINR})</option>
    `).join('');

    if (id) {
        title.textContent = "Edit Hero Slide";
        const slide = storeData.heroSlides.find(s => s.id === id);
        if (slide) {
            document.getElementById('editHeroSlideId').value = slide.id;
            document.getElementById('heroSlideTag').value = slide.tag;
            document.getElementById('heroHeadlineInput').value = slide.headline;
            document.getElementById('heroSubtitleInput').value = slide.subtitle;
            document.getElementById('heroImageInput').value = slide.image;
            document.getElementById('heroPieceName').value = slide.name;
            document.getElementById('heroPiecePrice').value = slide.priceINR;
            document.getElementById('heroPieceFinish').value = slide.finish;
            document.getElementById('heroPieceProductId').value = slide.productId || (storeData.products[0]?.id || 1);
            previewImg(slide.image, 'heroPreviewImg');
        }
    } else {
        title.textContent = "Add New Hero Slide";
        form.reset();
        document.getElementById('editHeroSlideId').value = "";
        const nextNum = (storeData.heroSlides?.length || 0) + 1;
        document.getElementById('heroSlideTag').value = `0${nextNum} / 0${Math.max(8, nextNum)} • SIGNATURE EDIT`;
        previewImg('', 'heroPreviewImg');
    }

    backdrop.classList.add('active');
}

function closeHeroSlideModal() {
    document.getElementById('heroModalBackdrop').classList.remove('active');
}

function handleSaveHeroSlide(e) {
    e.preventDefault();
    const editId = document.getElementById('editHeroSlideId').value;
    const tag = document.getElementById('heroSlideTag').value.trim();
    const headline = document.getElementById('heroHeadlineInput').value.trim();
    const subtitle = document.getElementById('heroSubtitleInput').value.trim();
    const image = document.getElementById('heroImageInput').value.trim();
    const name = document.getElementById('heroPieceName').value.trim();
    const priceINR = parseInt(document.getElementById('heroPiecePrice').value, 10);
    const finish = document.getElementById('heroPieceFinish').value.trim();
    const productId = parseInt(document.getElementById('heroPieceProductId').value, 10);

    if (editId) {
        const slide = storeData.heroSlides.find(s => s.id === parseInt(editId, 10));
        if (slide) {
            slide.tag = tag;
            slide.headline = headline;
            slide.subtitle = subtitle;
            slide.image = image;
            slide.name = name;
            slide.priceINR = priceINR;
            slide.finish = finish;
            slide.productId = productId;
        }
        showToast("Hero slide updated!");
    } else {
        const newId = storeData.heroSlides.length ? Math.max(...storeData.heroSlides.map(s => s.id)) + 1 : 1;
        storeData.heroSlides.push({
            id: newId,
            tag,
            headline,
            subtitle,
            image,
            name,
            priceINR,
            finish,
            productId,
            ctaText: "Explore Catalog",
            ctaLink: "#products-catalog"
        });
        showToast("New hero slide created!");
    }

    closeHeroSlideModal();
    saveAllStoreData();
    renderHeroSlides();
}

function moveHeroSlide(idx, delta) {
    const slides = storeData.heroSlides;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const temp = slides[idx];
    slides[idx] = slides[targetIdx];
    slides[targetIdx] = temp;
    saveAllStoreData(true);
    renderHeroSlides();
    showToast("Hero slides reordered");
}

function deleteHeroSlide(id) {
    if (confirm("Are you sure you want to delete this hero slide?")) {
        storeData.heroSlides = storeData.heroSlides.filter(s => s.id !== id);
        saveAllStoreData();
        renderHeroSlides();
        showToast("Hero slide deleted");
    }
}

// ==========================================
// 3. PRODUCT CATALOG MANAGER
// ==========================================
let adminCatalogPage = 1;
const adminCatalogPageSize = 50;


function renderProductsTable(filterText = '', filterCat = 'all') {
    const tbody = document.getElementById('productsAdminTbody');
    if (!tbody) return;

    let items = [...(storeData.products || [])];

    if (filterCat !== 'all') {
        items = items.filter(p => p.category === filterCat);
    }
    if (filterText) {
        const q = filterText.toLowerCase();
        items = items.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.subCategory && p.subCategory.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)) || (p.id && String(p.id).toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q)));
    }

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">No products found matching filters.</td></tr>`;
        return;
    }

    
    // Group by category if we are viewing 'all'
    if (filterCat === 'all' && !filterText) {
        items.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / adminCatalogPageSize));
    if (adminCatalogPage > totalPages) adminCatalogPage = totalPages;
    if (adminCatalogPage < 1) adminCatalogPage = 1;

    const startIdx = (adminCatalogPage - 1) * adminCatalogPageSize;
    let pageItems = items.slice(startIdx, startIdx + adminCatalogPageSize);


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
                <img src="${p.primaryImg}" alt="${p.name}" class="table-thumb" onclick="inspectImageDetails('${(p.primaryImg || '').replace(/'/g, "\'")}', 'prodPrimaryPreview', '${(p.name || 'Product').replace(/'/g, "\'")}')" style="cursor: pointer;" title="Click to inspect resolution & image specs">
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
        const res = await fetch('/api/db/products/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast('Badge updated successfully');
            loadStoreData(); // Refresh UI
        } else {
            showToast(data.error || 'Failed to update badge');
        }
    } catch (e) {
        showToast(e.message);
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
        const res = await fetch('/api/db/products/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Product ${newDisabled ? 'disabled' : 'enabled'} successfully`);
            loadStoreData(); // Refresh UI
        } else {
            showToast(data.error || 'Failed to toggle product');
        }
    } catch (e) {
        showToast(e.message);
    }
}


function filterAdminProducts() {
    const text = document.getElementById('productSearchFilter').value;
    const cat = document.getElementById('productCategoryFilter').value;
    renderProductsTable(text, cat);
}

function openProductModal(id = null) {
    const backdrop = document.getElementById('productModalBackdrop');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    if (id) {
        title.textContent = "Edit Jewelry Piece";
        const prod = storeData.products.find(p => String(p.id) === String(id));
        if (prod) {
            document.getElementById('editProductId').value = prod.id;
            document.getElementById('prodName').value = prod.name;
            document.getElementById('prodCategory').value = prod.category;
            document.getElementById('prodSubCategory').value = prod.subCategory || '';
            document.getElementById('prodPlating').value = prod.plating || 'gold';
            document.getElementById('prodPriceINR').value = prod.priceINR;
            document.getElementById('prodOrigPriceINR').value = prod.originalPriceINR || prod.priceINR;
            document.getElementById('prodBadge').value = prod.badge || '';
            document.getElementById('prodFinishes').value = (prod.availableFinishes || []).join(', ');
            document.getElementById('prodPrimaryImg').value = prod.primaryImg;
            document.getElementById('prodHoverImg').value = prod.hoverImg;
            document.getElementById('prodDescription').value = prod.description || '';
            document.getElementById('prodRating').value = prod.rating || 5.0;
            document.getElementById('prodReviews').value = prod.reviews || 25;

            previewImg(prod.primaryImg, 'prodPrimaryPreview');
            previewImg(prod.hoverImg, 'prodHoverPreview');
        }
    } else {
        title.textContent = "Add New Jewelry Piece";
        form.reset();
        document.getElementById('editProductId').value = "";
        previewImg('', 'prodPrimaryPreview');
        previewImg('', 'prodHoverPreview');
    }

    backdrop.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModalBackdrop').classList.remove('active');
}

function handleSaveProduct(e) {
    e.preventDefault();
    const editId = document.getElementById('editProductId').value;
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value;
    const subCategory = document.getElementById('prodSubCategory').value.trim();
    const plating = document.getElementById('prodPlating').value;
    const priceINR = parseInt(document.getElementById('prodPriceINR').value, 10);
    const originalPriceINR = parseInt(document.getElementById('prodOrigPriceINR').value, 10) || priceINR;
    const badge = document.getElementById('prodBadge').value.trim();
    const finishesRaw = document.getElementById('prodFinishes').value.trim();
    const availableFinishes = finishesRaw ? finishesRaw.split(',').map(s => s.trim()) : ["18K Gold", "Rhodium Silver"];
    const primaryImg = document.getElementById('prodPrimaryImg').value.trim();
    const hoverImg = document.getElementById('prodHoverImg').value.trim();
    const description = document.getElementById('prodDescription').value.trim();
    const rating = parseFloat(document.getElementById('prodRating').value) || 5.0;
    const reviews = parseInt(document.getElementById('prodReviews').value, 10) || 10;

    if (editId) {
        const p = storeData.products.find(item => item.id === parseInt(editId, 10));
        if (p) {
            Object.assign(p, {
                name, category, subCategory, plating, priceINR, originalPriceINR,
                badge, availableFinishes, primaryImg, hoverImg, description,
                rating, reviews, gallery: [primaryImg, hoverImg]
            });
        }
        showToast("Product updated!");
    } else {
        const newId = storeData.products.length ? Math.max(...storeData.products.map(p => p.id)) + 1 : 1;
        storeData.products.push({
            id: newId,
            name, category, subCategory, plating, priceINR, originalPriceINR,
            badge, availableFinishes, primaryImg, hoverImg, description,
            rating, reviews, gallery: [primaryImg, hoverImg], launchOffer: true
        });
        showToast("New jewelry piece added!");
    }

    closeProductModal();
    saveAllStoreData();
    filterAdminProducts();

    // Two-way sync with SQLite database
    try {
        fetch(editId ? '/api/db/products/update' : '/api/db/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editId,
                name, category, subCategory, plating, priceINR, originalPriceINR,
                badge, availableFinishes, primaryImg, hoverImg, description,
                stockQty: 15, lowStockThreshold: 5,
                employeeName: 'Owner'
            })
        });
    } catch (err) {
        console.warn("Could not sync to SQLite:", err);
    }
}

async function deleteProduct(id) {
    if (confirm("Are you sure you want to delete this jewelry piece?")) {
        const prod = storeData.products.find(p => String(p.id) === String(id));
        const name = prod ? prod.name : '';
        storeData.products = storeData.products.filter(p => String(p.id) !== String(id));
        saveAllStoreData();
        filterAdminProducts();
        showToast("Product deleted");

        // Sync delete with SQLite
        try {
            await fetch('/api/db/products/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: prod?.dbId || id, name, employeeName: 'Owner' })
            });
        } catch (e) {
            console.warn("Could not sync delete to SQLite:", e);
        }
    }
}

// ==========================================
// 4. CATEGORIES MANAGER
// ==========================================
function renderCategoriesGrid() {
    const grid = document.getElementById('categoriesAdminGrid');
    if (!grid) return;

    grid.innerHTML = (storeData.categories || []).map((cat, idx) => `
        <div class="category-admin-card">
            <img src="${cat.image}" alt="${cat.name}">
            <div class="category-card-body">
                <h4>${cat.name}</h4>
                <span>${cat.countLabel}</span>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn-admin-outline btn-sm" onclick="editCategoryPrompt(${idx})">
                        <i class="fa-regular fa-pen-to-square"></i> Edit
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function editCategoryPrompt(idx) {
    const cat = storeData.categories[idx];
    const newName = prompt("Enter Category Name:", cat.name);
    if (!newName) return;
    const newCountLabel = prompt("Enter Subtitle / Count Label:", cat.countLabel);
    const newImage = prompt("Enter Image URL:", cat.image);

    cat.name = newName;
    if (newCountLabel !== null) cat.countLabel = newCountLabel;
    if (newImage) cat.image = newImage;

    saveAllStoreData();
    renderCategoriesGrid();
    showToast("Category updated!");
}

function openCategoryModal() {
    const name = prompt("Enter New Category Name:");
    if (!name) return;
    const countLabel = prompt("Enter Subtitle (e.g. Modern Sets):", "Signature Collection");
    const image = prompt("Enter High-Resolution Image URL:", "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80");
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    storeData.categories.push({
        id: storeData.categories.length + 1,
        name,
        countLabel,
        image,
        slug
    });

    saveAllStoreData();
    renderCategoriesGrid();
    showToast("Category added!");
}

// ==========================================
// 5. ANNOUNCEMENTS TICKER
// ==========================================
function renderAnnouncementsList() {
    const list = document.getElementById('announcementsAdminList');
    if (!list) return;

    list.innerHTML = (storeData.announcements || []).map((notice, idx) => `
        <div class="announcement-item-row">
            <i class="fa-solid fa-bullhorn" style="color: var(--gold);"></i>
            <input type="text" value="${notice.replace(/"/g, '&quot;')}" onchange="updateAnnouncement(${idx}, this.value)">
            <button class="btn-icon btn-delete" onclick="deleteAnnouncement(${idx})" title="Remove">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

function updateAnnouncement(idx, val) {
    storeData.announcements[idx] = val;
    saveAllStoreData(true);
    showToast("Notice updated");
}

function addAnnouncementRow() {
    const notice = prompt("Enter new announcement notice (HTML supported, e.g. <strong>LAUNCH15</strong>):");
    if (notice) {
        storeData.announcements.push(notice);
        saveAllStoreData();
        renderAnnouncementsList();
        showToast("Announcement added");
    }
}

function deleteAnnouncement(idx) {
    storeData.announcements.splice(idx, 1);
    saveAllStoreData();
    renderAnnouncementsList();
    showToast("Announcement deleted");
}

// ==========================================
// 6. DISCOUNT COUPONS
// ==========================================
function renderCouponsGrid() {
    const grid = document.getElementById('couponsAdminGrid');
    if (!grid) return;

    grid.innerHTML = (storeData.coupons || []).map((coupon, idx) => `
        <div class="coupon-admin-card">
            <div class="coupon-code-pill">${coupon.code}</div>
            <h4 style="color: var(--gold-light); font-size: 1.25rem; margin-bottom: 4px;">${coupon.discountPercent}% OFF</h4>
            <p style="color: var(--admin-text-muted); font-size: 0.82rem; margin-bottom: 14px;">
                ${coupon.minSpendINR > 0 ? `Min. spend ₹${coupon.minSpendINR.toLocaleString('en-IN')}` : 'No minimum spend required'}
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <label class="checkbox-label" style="font-size: 0.8rem;">
                    <input type="checkbox" ${coupon.active ? 'checked' : ''} onchange="toggleCouponActive(${idx}, this.checked)">
                    <span>${coupon.active ? 'Active' : 'Disabled'}</span>
                </label>
                <button class="btn-icon btn-delete" onclick="deleteCoupon(${idx})" title="Delete">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openCouponModal() {
    document.getElementById('couponForm').reset();
    document.getElementById('couponModalBackdrop').classList.add('active');
}

function closeCouponModal() {
    document.getElementById('couponModalBackdrop').classList.remove('active');
}

function handleSaveCoupon(e) {
    e.preventDefault();
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    const discountPercent = parseInt(document.getElementById('couponPercent').value, 10);
    const minSpendINR = parseInt(document.getElementById('couponMinSpend').value, 10) || 0;
    const active = document.getElementById('couponActiveCheck').checked;

    // Remove if exists
    storeData.coupons = (storeData.coupons || []).filter(c => c.code !== code);
    storeData.coupons.push({ code, discountPercent, minSpendINR, active });

    closeCouponModal();
    saveAllStoreData();
    renderCouponsGrid();
    showToast(`Coupon ${code} created!`);
}

function toggleCouponActive(idx, checked) {
    storeData.coupons[idx].active = checked;
    saveAllStoreData(true);
    showToast(`Coupon ${checked ? 'enabled' : 'disabled'}`);
}

function deleteCoupon(idx) {
    if (confirm("Delete this coupon code?")) {
        storeData.coupons.splice(idx, 1);
        saveAllStoreData();
        renderCouponsGrid();
        showToast("Coupon deleted");
    }
}

// ==========================================
// 7. CURRENCIES & EXCHANGE RATES
// ==========================================
function renderCurrenciesTable() {
    const tbody = document.getElementById('currenciesAdminTbody');
    if (!tbody) return;

    const currencies = storeData.currencies || {};
    tbody.innerHTML = Object.keys(currencies).map(code => {
        const cur = currencies[code];
        const isBase = code === 'INR';
        const sampleConverted = (1000 * cur.rate).toFixed(code === 'INR' ? 0 : 2);

        return `
            <tr>
                <td><strong style="color: var(--gold-light);">${code}</strong></td>
                <td><span style="font-size: 1.1rem; color: var(--gold);">${cur.symbol}</span></td>
                <td>${cur.label}</td>
                <td>
                    ${isBase ? '<span class="status-badge badge-gold">1.00 (Base)</span>' : `
                        <input type="number" step="0.0001" value="${cur.rate}" class="admin-input" style="width: 110px;" onchange="updateCurrencyRate('${code}', this.value)">
                    `}
                </td>
                <td>${cur.symbol}${sampleConverted}</td>
                <td style="text-align: right;">
                    ${isBase ? '-' : `
                        <button class="btn-icon btn-delete" onclick="deleteCurrency('${code}')" title="Delete">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

function updateCurrencyRate(code, val) {
    const rate = parseFloat(val);
    if (!isNaN(rate) && rate > 0) {
        storeData.currencies[code].rate = rate;
        saveAllStoreData(true);
        renderCurrenciesTable();
        showToast(`Rate for ${code} updated to ${rate}`);
    }
}

function openCurrencyModal() {
    const code = prompt("Enter 3-letter Currency Code (e.g. CAD, AUD, SGD):");
    if (!code) return;
    const upper = code.trim().toUpperCase();
    const symbol = prompt(`Enter Symbol for ${upper} (e.g. $, C$, S$):`, '$');
    const rate = parseFloat(prompt(`Enter conversion rate vs 1 INR (e.g. 0.016):`, '0.016'));

    if (upper && symbol && !isNaN(rate)) {
        storeData.currencies[upper] = {
            symbol,
            rate,
            label: `${upper} (${symbol})`
        };
        saveAllStoreData();
        renderCurrenciesTable();
        showToast(`Currency ${upper} added!`);
    }
}

function deleteCurrency(code) {
    if (confirm(`Remove currency ${code}?`)) {
        delete storeData.currencies[code];
        saveAllStoreData();
        renderCurrenciesTable();
        showToast(`Currency ${code} removed`);
    }
}

// ==========================================
// 8. BRAND SPOTLIGHT STORY
// ==========================================
function renderSpotlightForm() {
    const s = storeData.spotlight || {};
    document.getElementById('spotlightTagInput').value = s.tag || '';
    document.getElementById('spotlightTitleInput').value = s.title || '';
    document.getElementById('spotlightDesc1Input').value = s.desc1 || '';
    document.getElementById('spotlightDesc2Input').value = s.desc2 || '';
    document.getElementById('spotlightImgMainInput').value = s.imgMain || '';
    document.getElementById('spotlightImgSubInput').value = s.imgSub || '';
    document.getElementById('spotlightBadgeTitleInput').value = s.badgeTitle || '';
    document.getElementById('spotlightBadgeSubInput').value = s.badgeSub || '';

    previewImg(s.imgMain, 'spotlightPreviewMain');
    previewImg(s.imgSub, 'spotlightPreviewSub');

    // Features
    const featContainer = document.getElementById('spotlightFeaturesAdmin');
    if (featContainer) {
        featContainer.innerHTML = (s.features || []).map((f, idx) => `
            <div style="background: var(--admin-surface-light); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--admin-border);">
                <label style="color: var(--gold); font-size: 0.75rem; font-weight: 700;">PILLAR 0${idx + 1}</label>
                <input type="text" value="${f.title}" class="admin-input" style="margin-bottom: 8px; font-weight: 600;" onchange="storeData.spotlight.features[${idx}].title = this.value">
                <textarea rows="2" class="admin-textarea" onchange="storeData.spotlight.features[${idx}].desc = this.value">${f.desc}</textarea>
            </div>
        `).join('');
    }
}

function saveSpotlightSettings() {
    storeData.spotlight.tag = document.getElementById('spotlightTagInput').value.trim();
    storeData.spotlight.title = document.getElementById('spotlightTitleInput').value.trim();
    storeData.spotlight.desc1 = document.getElementById('spotlightDesc1Input').value.trim();
    storeData.spotlight.desc2 = document.getElementById('spotlightDesc2Input').value.trim();
    storeData.spotlight.imgMain = document.getElementById('spotlightImgMainInput').value.trim();
    storeData.spotlight.imgSub = document.getElementById('spotlightImgSubInput').value.trim();
    storeData.spotlight.badgeTitle = document.getElementById('spotlightBadgeTitleInput').value.trim();
    storeData.spotlight.badgeSub = document.getElementById('spotlightBadgeSubInput').value.trim();

    saveAllStoreData();
    showToast("Brand Story updated!");
}

// ==========================================
// 9. CUSTOMER TESTIMONIALS
// ==========================================
function renderTestimonialsGrid() {
    const grid = document.getElementById('testimonialsAdminGrid');
    if (!grid) return;

    grid.innerHTML = (storeData.testimonials || []).map((t, idx) => `
        <div class="admin-card" style="margin: 0;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <img src="${t.avatar}" alt="${t.name}" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 1px solid var(--gold);">
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem; color: var(--admin-text);">${t.name}</h4>
                    <span style="color: var(--admin-text-muted); font-size: 0.78rem;">${t.city} • ⭐ ${t.rating}/5</span>
                </div>
            </div>
            <p style="color: var(--admin-text-muted); font-size: 0.85rem; font-style: italic; line-height: 1.4; margin-bottom: 14px;">"${t.text}"</p>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn-icon btn-delete" onclick="deleteTestimonial(${t.id})" title="Delete">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openTestimonialModal() {
    document.getElementById('testimonialForm').reset();
    document.getElementById('testimonialModalBackdrop').classList.add('active');
}

function closeTestimonialModal() {
    document.getElementById('testimonialModalBackdrop').classList.remove('active');
}

function handleSaveTestimonial(e) {
    e.preventDefault();
    const name = document.getElementById('reviewName').value.trim();
    const city = document.getElementById('reviewCity').value.trim();
    const rating = parseInt(document.getElementById('reviewRating').value, 10);
    const avatar = document.getElementById('reviewAvatar').value.trim();
    const text = document.getElementById('reviewText').value.trim();

    const newId = storeData.testimonials.length ? Math.max(...storeData.testimonials.map(t => t.id)) + 1 : 1;
    storeData.testimonials.push({
        id: newId,
        name,
        city,
        rating,
        avatar,
        text,
        verified: true
    });

    closeTestimonialModal();
    saveAllStoreData();
    renderTestimonialsGrid();
    showToast("Customer review added!");
}

function deleteTestimonial(id) {
    if (confirm("Delete this review?")) {
        storeData.testimonials = storeData.testimonials.filter(t => t.id !== id);
        saveAllStoreData();
        renderTestimonialsGrid();
        showToast("Review deleted");
    }
}

// ==========================================
// 10. INSTAGRAM GRID
// ==========================================
function renderInstagramGrid() {
    const grid = document.getElementById('instagramAdminGrid');
    if (!grid) return;

    grid.innerHTML = (storeData.instagram || []).map((item, idx) => `
        <div class="insta-edit-card">
            <img src="${item.image}" alt="${item.title}" id="instaPrev_${idx}">
            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 0.72rem;">Image URL</label>
                <input type="text" value="${item.image}" class="admin-input" style="font-size: 0.78rem; padding: 6px;" onchange="updateInstaImg(${idx}, this.value)">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.72rem;">Caption</label>
                <input type="text" value="${item.title}" class="admin-input" style="font-size: 0.78rem; padding: 6px;" onchange="storeData.instagram[${idx}].title = this.value">
            </div>
        </div>
    `).join('');
}

function updateInstaImg(idx, val) {
    storeData.instagram[idx].image = val;
    previewImg(val, `instaPrev_${idx}`);
}

function saveInstagramFeed() {
    saveAllStoreData();
    showToast("Instagram Gallery updated!");
}

// ==========================================
// 11. SETTINGS & SECURITY
// ==========================================
function renderSettingsForm() {
    const s = storeData.settings || {};
    document.getElementById('settingStoreName').value = s.storeName || 'Sorèva';
    document.getElementById('settingTagline').value = s.tagline || '';
    document.getElementById('settingLogoUrl').value = s.logoUrl || 'assets/logo-black.png';
    document.getElementById('settingLogoWhiteUrl').value = s.logoWhiteUrl || 'assets/logo-white.png';
    document.getElementById('settingEmail').value = s.contactEmail || '';
    document.getElementById('settingPhone').value = s.contactPhone || '';
    document.getElementById('settingInstagram').value = s.instagramHandle || '';

    previewImg(s.logoUrl || 'assets/logo-black.png', 'logoPreview');
    previewImg(s.logoWhiteUrl || 'assets/logo-white.png', 'logoWhitePreview');
}

function saveGeneralSettings() {
    storeData.settings.storeName = document.getElementById('settingStoreName').value.trim();
    storeData.settings.tagline = document.getElementById('settingTagline').value.trim();
    storeData.settings.logoUrl = document.getElementById('settingLogoUrl').value.trim();
    storeData.settings.logoWhiteUrl = document.getElementById('settingLogoWhiteUrl').value.trim();
    storeData.settings.contactEmail = document.getElementById('settingEmail').value.trim();
    storeData.settings.contactPhone = document.getElementById('settingPhone').value.trim();
    storeData.settings.instagramHandle = document.getElementById('settingInstagram').value.trim();

    saveAllStoreData();
    showToast("Store settings saved!");
}

// Password Change Handler
async function handleAdminPasswordChange(e) {
    e.preventDefault();
    const currentPw = document.getElementById('currentAdminPw').value;
    const newPw = document.getElementById('newAdminPw').value;
    const confirmPw = document.getElementById('confirmAdminPw').value;
    const msg = document.getElementById('pwChangeMsg');

    if (newPw !== confirmPw) {
        msg.innerHTML = `<span style="color: #ff6b6b;"><i class="fa-solid fa-circle-exclamation"></i> New passwords do not match.</span>`;
        return;
    }

    if (newPw.length < 6) {
        msg.innerHTML = `<span style="color: #ff6b6b;"><i class="fa-solid fa-circle-exclamation"></i> Password must be at least 6 characters.</span>`;
        return;
    }

    try {
        const oldHash = await sha256(currentPw);
        const newHash = await sha256(newPw);

        // Check against current stored hash
        const savedHash = storeData.settings?.adminPasswordHash || DEFAULT_PASSWORD_HASH;
        if (oldHash !== savedHash) {
            msg.innerHTML = `<span style="color: #ff6b6b;"><i class="fa-solid fa-circle-exclamation"></i> Current password is incorrect.</span>`;
            return;
        }

        // Try updating on server
        try {
            await fetch('/api/admin/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: currentPw, newPassword: newPw })
            });
        } catch (err) {}

        storeData.settings.adminPasswordHash = newHash;
        saveAllStoreData(true);

        msg.innerHTML = `<span style="color: #81c784;"><i class="fa-solid fa-circle-check"></i> Admin password updated successfully!</span>`;
        document.getElementById('currentAdminPw').value = '';
        document.getElementById('newAdminPw').value = '';
        document.getElementById('confirmAdminPw').value = '';
        showToast("Password updated successfully!");
    } catch (err) {
        msg.innerHTML = `<span style="color: #ff6b6b;">Error: ${err.message}</span>`;
    }
}

// Backup JSON Download
function downloadStoreBackup() {
    if (!storeData) return;
    const jsonStr = JSON.stringify(storeData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `soreva-store-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Store backup JSON downloaded!");
}

// Import JSON
function handleImportStoreJson(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const imported = JSON.parse(evt.target.result);
            if (imported && imported.products && imported.heroSlides) {
                if (confirm("Replace current store configuration with this backup file?")) {
                    storeData = imported;
                    saveAllStoreData();
                    renderAllPanels();
                    showToast("Backup imported successfully!");
                }
            } else {
                alert("Invalid store backup file structure.");
            }
        } catch (err) {
            alert(`Failed to parse JSON file: ${err.message}`);
        }
    };
    reader.readAsText(file);
}

// Restore Factory Defaults
async function triggerRestoreDefaultData() {
    if (confirm("WARNING: This will reset all store content, products, slides, and settings back to factory default. Continue?")) {
        try {
            const resp = await fetch('/data/store-data.json');
            storeData = await resp.json();
            saveAllStoreData();
            renderAllPanels();
            showToast("Factory defaults restored!");
        } catch (err) {
            alert("Could not load default template: " + err.message);
        }
    }
}

// ==========================================
// IMAGE STANDARDS & SPECIFICATIONS REGISTRY
// ==========================================
const IMAGE_SPEC_STANDARDS = {
    'logoPreview': {
        name: 'Primary Header Logo (Black / Light Header)',
        purpose: 'Top sticky navigation bar on light backgrounds and desktop store pages.',
        targetWidth: 800,
        targetHeight: 200,
        ratioLabel: '4:1 (Wide Strip)',
        ratioVal: 4,
        format: 'PNG with Transparent Background',
        maxSizeKb: 150,
        ruleText: 'Must have transparent background and tight bounding box with minimal padding so it fits the 44px header bar.'
    },
    'logoWhitePreview': {
        name: 'Inverted Header Logo (White / Gold on Dark)',
        purpose: 'Overlaid on dark hero carousel slides, dark mobile drawer, and footer.',
        targetWidth: 800,
        targetHeight: 200,
        ratioLabel: '4:1 (Wide Strip)',
        ratioVal: 4,
        format: 'PNG with Transparent Background',
        maxSizeKb: 150,
        ruleText: 'Crisp white or gold lettering on transparent background for contrast on dark themes.'
    },
    'prodPrimaryPreview': {
        name: 'Product Primary Catalog Image',
        purpose: 'Main catalog photo for shop grids, search results, category showcases, and cart previews.',
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
        ruleText: 'Upload whatever size or ratio you have. Displays naturally without cropping or distortion.'
    },
    'heroPreviewImg': {
        name: 'Hero Slide Cinematic Banner',
        purpose: 'Full-bleed cinematic widescreen banner across the top of the homepage.',
        targetWidth: 1920,
        targetHeight: 1080,
        ratioLabel: '16:9 (Cinematic Widescreen)',
        ratioVal: 16 / 9,
        format: 'JPG or WebP',
        maxSizeKb: 800,
        ruleText: 'High definition widescreen landscape. Keep main visual focus centered or to the right so headline typography stays clear.'
    },
    'spotlightPreviewMain': {
        name: 'Craftsmanship Spotlight Main Image',
        purpose: 'Dominant portrait editorial photo highlighting artisan craft in the homepage Spotlight section.',
        targetWidth: 1000,
        targetHeight: 1200,
        ratioLabel: '5:6 (Editorial Portrait)',
        ratioVal: 5 / 6,
        format: 'JPG or WebP',
        maxSizeKb: 600,
        ruleText: 'High-fashion editorial portrait showing hands crafting jewelry or dramatic close-up jewelry styling.'
    },
    'spotlightPreviewSub': {
        name: 'Craftsmanship Spotlight Sub / Detailing Image',
        purpose: 'Secondary floating macro detail photo showing fine clasps, hallmarks, or gem cuts.',
        targetWidth: 800,
        targetHeight: 800,
        ratioLabel: '1:1 (Square Detail)',
        ratioVal: 1,
        format: 'JPG or WebP',
        maxSizeKb: 400,
        ruleText: 'Extreme macro zoom on gold plating texture or stone setting.'
    }
};

function getDefaultSpec(key, customTitle) {
    return {
        name: customTitle || 'Store Image Asset',
        purpose: 'Media asset used across store banners, grids, or promotional cards.',
        targetWidth: 'Adaptive',
        targetHeight: 'Adaptive',
        ratioLabel: 'Any Ratio (Adaptive)',
        ratioVal: null,
        format: 'JPG, WebP, or PNG',
        maxSizeKb: 2000,
        ruleText: 'Adaptive auto-fit displays any image naturally without cropping.'
    };
}

function analyzeImageHealth(nw, nh, spec) {
    if (!nw || !nh) {
        return {
            status: 'error',
            icon: 'fa-solid fa-circle-xmark',
            title: 'Image Load Error',
            msg: 'Could not read image dimensions. Verify that the URL is public or file was loaded correctly.',
            ratioStr: 'Unknown'
        };
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

    if (spec.ratioVal !== null && spec.ratioVal !== undefined) {
        const ratioDiff = Math.abs(actualRatio - spec.ratioVal) / spec.ratioVal;
        if (ratioDiff > 0.25) {
            status = 'caution';
            icon = 'fa-solid fa-circle-info';
            title = 'Recommended Aspect Ratio Note';
            msg = `Detected aspect ratio is ${ratioStr}. This specific slot generally looks best at ${spec.ratioLabel}, but will still render cleanly.`;
        }
    }

    if (nw < 180 || nh < 180) {
        status = 'caution';
        icon = 'fa-solid fa-triangle-exclamation';
        title = 'Low Resolution Notice';
        msg = `At ${nw} × ${nh} px, this image is small and may appear slightly soft on high-DPI Retina screens.`;
    }

    return { status, icon, title, msg, ratioStr, actualRatio };
}

// ==========================================
// DYNAMIC IMAGE PREVIEWS & INSPECTOR
// ==========================================
function previewImg(url, targetId) {
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
    
    // Wire click to inspect on preview box & image
    if (el.parentElement && el.parentElement.classList.contains('img-preview-box')) {
        el.parentElement.style.cursor = 'pointer';
        el.parentElement.title = 'Click to view complete details & health report';
        el.parentElement.onclick = () => inspectImageDetails(cleanUrl, targetId);
    }
    el.style.cursor = 'pointer';
    el.title = 'Click to view complete details & health report';
    el.onclick = () => inspectImageDetails(cleanUrl, targetId);

    // Dynamic measurement on load
    el.onload = function() {
        const nw = el.naturalWidth || 0;
        const nh = el.naturalHeight || 0;
        const spec = IMAGE_SPEC_STANDARDS[targetId] || getDefaultSpec(targetId);
        const analysis = analyzeImageHealth(nw, nh, spec);

        if (metaContainer) {
            metaContainer.innerHTML = `
                <div class="img-live-meta-badge" onclick="inspectImageDetails('${cleanUrl.replace(/'/g, "\\'")}', '${targetId}')" title="Click to view complete details & health report">
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

function handleFileUpload(event, inputId, previewId) {
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
            previewImg(dataUrl, previewId);
        }
        showToast(`Loaded image "${file.name}" (${(file.size / 1024).toFixed(0)} KB)`);
    };
    reader.readAsDataURL(file);
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
    } else if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        url = el.value.trim();
        key = key || urlOrTargetId;
    }

    if (!url) {
        showToast("Please enter an image URL first to inspect details.");
        return;
    }

    const spec = IMAGE_SPEC_STANDARDS[key] || getDefaultSpec(key, customTitle);

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
    if (slotPurpose) slotPurpose.textContent = `${spec.purpose} Target format: ${spec.format} • Max size: < ${spec.maxSizeKb} KB.`;
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

        if (verdictBox) {
            verdictBox.className = `img-verdict-box ${analysis.status}`;
        }
        if (verdictIcon) {
            verdictIcon.className = analysis.icon;
        }
        if (verdictTitle) verdictTitle.textContent = analysis.title;
        if (verdictMsg) verdictMsg.textContent = analysis.msg;
    };

    imgEl.onerror = function() {
        if (liveRes) liveRes.textContent = "Error loading";
        if (liveRatio) liveRatio.textContent = "Could not decode image";
        if (verdictBox) verdictBox.className = "img-verdict-box error";
        if (verdictIcon) verdictIcon.className = "fa-solid fa-circle-xmark";
        if (verdictTitle) verdictTitle.textContent = "Image Load Failure";
        if (verdictMsg) verdictMsg.textContent = "Browser failed to load or decode image from this URL. Please verify that the link is directly accessible.";
    };

    imgEl.src = url;

    if (modalBackdrop) {
        modalBackdrop.classList.add('active');
    }
}

function inspectDirectImage(url, slotKey, customTitle) {
    inspectImageDetails(url, slotKey, customTitle);
}

function closeImageInspector() {
    const backdrop = document.getElementById('imageInspectorModalBackdrop');
    if (backdrop) backdrop.classList.remove('active');
}

function openImageGuidelinesModal() {
    const backdrop = document.getElementById('imageSpecsModalBackdrop');
    if (backdrop) backdrop.classList.add('active');
}

function closeImageGuidelinesModal() {
    const backdrop = document.getElementById('imageSpecsModalBackdrop');
    if (backdrop) backdrop.classList.remove('active');
}

function copyInspectorUrl() {
    const input = document.getElementById('inspectorUrlInput');
    if (!input || !input.value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => {
            showToast("Image URL copied to clipboard!");
        }).catch(() => {
            input.select();
            document.execCommand('copy');
            showToast("Image URL copied!");
        });
    } else {
        input.select();
        document.execCommand('copy');
        showToast("Image URL copied!");
    }
}

// ==========================================
// UTILITY HELPERS
// ==========================================

function showToast(msg) {
    const container = document.getElementById('adminToastContainer');
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

// ==========================================================================
// 12. POCKETBASE DATABASE & REAL-TIME INVENTORY MANAGEMENT
// ==========================================================================

// --- INVENTORY CONTROLLERS ---
async function fetchInventory() {
    try {
        const resp = await fetch('/api/inventory');
        if (resp.ok) {
            inventoryData = await resp.json();
            renderInventory();
            updateBadgeCounts();
        }
    } catch (err) {
        console.warn("Could not fetch inventory:", err);
    }
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody || !inventoryData) return;

    // Calculate metrics
    let totalUnits = 0;
    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;

    inventoryData.forEach(item => {
        const qty = Number(item.stockQty) || 0;
        const thresh = Number(item.lowStockThreshold) || 5;
        totalUnits += qty;
        if (qty <= 0) outStock++;
        else if (qty <= thresh) lowStock++;
        else inStock++;
    });

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setVal('invSummaryTotalUnits', totalUnits);
    setVal('invSummaryInStock', inStock);
    setVal('invSummaryLowStock', lowStock);
    setVal('invSummaryOutOfStock', outStock);
    setVal('statTotalInventory', totalUnits);

    tbody.innerHTML = inventoryData.map(item => {
        const qty = Number(item.stockQty) || 0;
        const thresh = Number(item.lowStockThreshold) || 5;

        let statusClass = 'in-stock';
        let statusIcon = 'fa-check';
        let statusText = 'In Stock';

        if (qty <= 0) {
            statusClass = 'out-of-stock';
            statusIcon = 'fa-xmark';
            statusText = 'Out of Stock';
        } else if (qty <= thresh) {
            statusClass = 'low-stock';
            statusIcon = 'fa-triangle-exclamation';
            statusText = 'Low Stock';
        }

        const safeProdName = (item.productName || '').replace(/'/g, "\\'");

        return `
            <tr>
                <td>
                    <strong style="color: var(--admin-text);">${item.productName}</strong>
                </td>
                <td>
                    <code style="background: var(--admin-surface-light); padding: 2px 6px; border-radius: 4px; color: var(--gold-light); font-size: 0.8rem;">${item.sku}</code>
                </td>
                <td>
                    <span style="text-transform: capitalize; color: var(--admin-text-muted);">${item.category}</span>
                </td>
                <td>
                    <div class="stock-stepper">
                        <button type="button" class="btn-stock-step" onclick="adjustStock('${item.id}', '${item.sku}', -1)" title="Decrement stock by 1">
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <span class="stock-num-display" id="stock-val-${item.id}">${qty}</span>
                        <button type="button" class="btn-stock-step" onclick="adjustStock('${item.id}', '${item.sku}', 1)" title="Increment stock by 1">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <span style="color: var(--admin-text-muted); font-size: 0.85rem;">≤ ${thresh} units</span>
                </td>
                <td>
                    <span class="stock-pill ${statusClass}">
                        <i class="fa-solid ${statusIcon}"></i> ${statusText}
                    </span>
                </td>
                <td style="text-align: right;">
                    <button class="btn-admin-outline btn-sm" onclick="openStockModal('${item.id}', '${item.sku}', '${encodeURIComponent(item.productName)}', ${qty}, ${thresh})">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function adjustStock(id, sku, delta) {
    const item = inventoryData.find(i => i.id === id || i.sku === sku);
    if (!item) return;

    const newQty = Math.max(0, (Number(item.stockQty) || 0) + delta);
    item.stockQty = newQty;
    renderInventory();

    try {
        const resp = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: item.id,
                sku: item.sku,
                stockQty: newQty,
                lowStockThreshold: item.lowStockThreshold
            })
        });
        const res = await resp.json();
        if (res.success && res.item) {
            item.stockQty = res.item.stockQty;
            item.status = res.item.status;
            renderInventory();
            showToast(`${item.productName}: Stock updated to ${newQty} units`);
        }
    } catch (err) {
        showToast("Error updating stock: " + err.message);
    }
}

function openStockModal(id, sku, encName, qty, threshold) {
    document.getElementById('editStockId').value = id;
    document.getElementById('editStockSku').value = sku;
    document.getElementById('editStockProdName').value = decodeURIComponent(encName);
    document.getElementById('editStockQty').value = qty;
    document.getElementById('editStockThreshold').value = threshold;
    document.getElementById('stockModalBackdrop').style.display = 'flex';
}

function closeStockModal() {
    document.getElementById('stockModalBackdrop').style.display = 'none';
}

async function handleSaveStock(e) {
    e.preventDefault();
    const id = document.getElementById('editStockId').value;
    const sku = document.getElementById('editStockSku').value;
    const stockQty = parseInt(document.getElementById('editStockQty').value, 10);
    const lowStockThreshold = parseInt(document.getElementById('editStockThreshold').value, 10);

    try {
        const resp = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, sku, stockQty, lowStockThreshold })
        });
        const res = await resp.json();
        if (res.success) {
            closeStockModal();
            showToast("Inventory stock updated successfully!");
            fetchInventory();
        } else {
            alert("Error: " + (res.error || "Could not update stock"));
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

// --- CUSTOMER CRM CONTROLLERS ---
async function fetchCustomers() {
    try {
        const resp = await fetch('/api/customers');
        if (resp.ok) {
            customersData = await resp.json();
            renderCustomers();
            updateBadgeCounts();
        }
    } catch (err) {
        console.warn("Could not fetch customers:", err);
    }
}

function renderCustomers() {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody || !customersData) return;

    tbody.innerHTML = customersData.map(c => {
        const initials = (c.name || 'C').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const spent = Number(c.totalSpent) || 0;
        const orders = Number(c.totalOrders) || 0;

        let tierBadge = `<span class="vip-pill"><i class="fa-solid fa-crown"></i> VIP PATRON</span>`;
        if (spent < 5000 && orders <= 1) {
            tierBadge = `<span class="status-badge badge-green">PATRON</span>`;
        } else if (spent < 10000) {
            tierBadge = `<span class="status-badge badge-gold">LOYAL CLIENT</span>`;
        }

        return `
            <tr>
                <td>
                    <div class="customer-name-box">
                        <div class="customer-avatar">${initials}</div>
                        <div>
                            <strong style="color: var(--admin-text);">${c.name}</strong>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.88rem;">${c.email}</div>
                    <div style="font-size: 0.78rem; color: var(--admin-text-muted);">${c.phone || '—'}</div>
                </td>
                <td>
                    <strong style="color: var(--gold-light);">${c.city || 'India'}</strong>
                    <div style="font-size: 0.78rem; color: var(--admin-text-muted); max-width: 220px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${c.address || '—'}
                    </div>
                </td>
                <td>
                    <strong style="font-size: 0.95rem;">${orders}</strong>
                </td>
                <td>
                    <strong style="color: var(--gold-light); font-size: 0.95rem;">₹${spent.toLocaleString('en-IN')}</strong>
                </td>
                <td>
                    ${tierBadge}
                </td>
                <td style="text-align: right;">
                    <button class="btn-admin-outline btn-sm" onclick="openCustomerModal('${c.id}')" title="Edit client profile">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openCustomerModal(id = null) {
    const title = document.getElementById('customerModalTitle');
    const idInput = document.getElementById('editCustId');
    const nameInput = document.getElementById('custName');
    const emailInput = document.getElementById('custEmail');
    const phoneInput = document.getElementById('custPhone');
    const addressInput = document.getElementById('custAddress');
    const cityInput = document.getElementById('custCity');

    if (id) {
        const c = customersData.find(item => item.id === id);
        if (c) {
            title.textContent = "Edit Patron Profile";
            idInput.value = c.id;
            nameInput.value = c.name || '';
            emailInput.value = c.email || '';
            phoneInput.value = c.phone || '';
            addressInput.value = c.address || '';
            cityInput.value = c.city || '';
        }
    } else {
        title.textContent = "Add New Patron Profile";
        idInput.value = '';
        nameInput.value = '';
        emailInput.value = '';
        phoneInput.value = '';
        addressInput.value = '';
        cityInput.value = '';
    }

    document.getElementById('customerModalBackdrop').style.display = 'flex';
}

function closeCustomerModal() {
    document.getElementById('customerModalBackdrop').style.display = 'none';
}

async function handleSaveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('editCustId').value;
    const name = document.getElementById('custName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const city = document.getElementById('custCity').value.trim();

    try {
        const resp = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, email, phone, address, city })
        });
        const res = await resp.json();
        if (res.success) {
            closeCustomerModal();
            showToast("Customer profile saved successfully!");
            fetchCustomers();
        } else {
            alert("Error: " + (res.error || "Failed to save customer"));
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

// --- ORDER MANAGEMENT CONTROLLERS ---
async function fetchOrders() {
    try {
        const resp = await fetch('/api/orders');
        if (resp.ok) {
            ordersData = await resp.json();
            renderOrders();
            updateBadgeCounts();
        }
    } catch (err) {
        console.warn("Could not fetch orders:", err);
    }
}

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody || !ordersData) return;

    // Calculate revenue
    let totalRev = 0;
    ordersData.forEach(o => {
        if (o.status !== 'Cancelled') {
            totalRev += (Number(o.totalAmount) || 0);
        }
    });

    const revEl = document.getElementById('statTotalRevenue');
    if (revEl) revEl.textContent = `₹${totalRev.toLocaleString('en-IN')}`;

    tbody.innerHTML = ordersData.map(o => {
        const status = o.status || 'Processing';
        const stLower = status.toLowerCase();

        return `
            <tr>
                <td>
                    <strong style="color: var(--gold-light); font-family: var(--font-heading); font-size: 0.95rem;">${o.orderNumber}</strong>
                </td>
                <td>
                    <div><strong style="color: var(--admin-text);">${o.customerName}</strong></div>
                    <div style="font-size: 0.78rem; color: var(--admin-text-muted);">${o.customerEmail}</div>
                </td>
                <td>
                    <div style="max-width: 280px; font-size: 0.85rem; line-height: 1.4; color: var(--admin-text);">${o.itemsSummary}</div>
                </td>
                <td>
                    <strong style="color: var(--gold); font-size: 0.95rem;">₹${Number(o.totalAmount || 0).toLocaleString('en-IN')}</strong>
                </td>
                <td>
                    <span style="font-size: 0.82rem; color: var(--admin-text-muted);">${o.paymentMethod || 'UPI'}</span>
                </td>
                <td>
                    <span class="order-status-badge ${stLower}">
                        <i class="fa-solid fa-circle-dot"></i> ${status}
                    </span>
                </td>
                <td style="text-align: right;">
                    <button class="btn-admin-primary btn-sm" onclick="openOrderModal('${o.id}')">
                        <i class="fa-solid fa-receipt"></i> Inspect
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openOrderModal(orderId) {
    const o = ordersData.find(item => item.id === orderId);
    if (!o) return;

    document.getElementById('inspectOrderId').value = o.id;
    document.getElementById('inspectOrderNum').textContent = o.orderNumber;
    
    const badge = document.getElementById('inspectOrderStatusBadge');
    badge.className = `order-status-badge ${(o.status || 'processing').toLowerCase()}`;
    badge.textContent = o.status || 'Processing';

    document.getElementById('inspectCustName').textContent = o.customerName;
    document.getElementById('inspectCustEmail').textContent = o.customerEmail;
    document.getElementById('inspectCustPhone').textContent = o.customerPhone || 'N/A';
    document.getElementById('inspectCustAddr').textContent = o.shippingAddress || 'Address on file';
    document.getElementById('inspectCustCity').textContent = o.city || 'India';
    document.getElementById('inspectPaymentMode').textContent = o.paymentMethod || 'UPI / Instant Pay';
    document.getElementById('inspectTotalAmt').textContent = `₹${Number(o.totalAmount || 0).toLocaleString('en-IN')}`;

    // Items list
    const itemsContainer = document.getElementById('inspectItemsList');
    itemsContainer.innerHTML = (o.itemsSummary || '').split(', ').map(it => `
        <div style="padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.08); display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-gem" style="color: var(--gold); font-size: 0.75rem;"></i>
            <span>${it}</span>
        </div>
    `).join('');

    // Status select
    const sel = document.getElementById('inspectStatusSelect');
    sel.value = o.status || 'Processing';

    document.getElementById('orderModalBackdrop').style.display = 'flex';
}

function closeOrderModal() {
    document.getElementById('orderModalBackdrop').style.display = 'none';
}

async function saveOrderStatusFromModal() {
    const id = document.getElementById('inspectOrderId').value;
    const newStatus = document.getElementById('inspectStatusSelect').value;

    try {
        const resp = await fetch('/api/orders/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });
        const res = await resp.json();
        if (res.success) {
            closeOrderModal();
            showToast(`Order status updated to "${newStatus}"!`);
            fetchOrders();
        } else {
            alert("Error: " + (res.error || "Failed to update order status"));
        }
    } catch (err) {
        alert("Server error: " + err.message);
    }
}

// --- DATABASE HUB CONTROLLER ---
async function fetchDatabaseInfo() {
    try {
        const resp = await fetch('/api/database/info');
        if (resp.ok) {
            databaseInfo = await resp.json();
            renderDatabaseHub(databaseInfo);
        }
    } catch (err) {
        console.warn("Could not fetch database info:", err);
    }
}

function renderDatabaseHub(info) {
    if (!info || !info.counts) return;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setVal('dbProdCount', `${info.counts.products} Records`);
    setVal('dbInvCount', `${info.counts.inventory} Records (${info.counts.totalUnits} units)`);
    setVal('dbCustCount', `${info.counts.customers} Records`);
    setVal('dbOrdCount', `${info.counts.orders} Records`);
    setVal('dbSizeLabel', info.dbSizeFormatted || '72.0 KB');
}

async function launchSyncAgent() {
    showToast("Launching Sync Agent in the background...");
    try {
        const res = await fetch('/api/admin/sync-catalog', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast(data.message);
        } else {
            showToast("Failed to launch agent: " + data.error);
        }
    } catch (e) {
        showToast("Error launching agent: " + e.message);
    }
}
