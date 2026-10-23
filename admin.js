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

function getOptimizedImgUrl(url) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();
    if (url.startsWith('/api/img/') || url.startsWith('assets/') || url.startsWith('/assets/')) return url;
    if (url.includes('/api/img/')) {
        return url.substring(url.indexOf('/api/img/'));
    }
    if (url.includes('indian-jewellery.com/core/thumb_images/product_images/')) {
        const fn = url.split('/').pop().split('?')[0];
        if (fn) return `/api/img/${fn}`;
    }
    if (url.includes('indian-jewellery.com')) {
        const fn = url.split('/').pop().split('?')[0];
        if (fn && /\.(jpg|jpeg|png|webp)$/i.test(fn)) {
            return `/api/img/${fn}`;
        }
    }
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
        return `/api/img?url=${encodeURIComponent(url)}`;
    }
    return url;
}
window.getOptimizedImgUrl = getOptimizedImgUrl;

// ==========================================
// INITIALIZATION & AUTHENTICATION GATE
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    checkAdminSession();
    initTabNavigation();
});

// Pure JavaScript SHA-256 implementation (works in any context, including HTTP / non-secure IPs)
function sha256Sync(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';

    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;

    const hash = [];
    const k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return;
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength) | 0;

    for (j = 0; j < words[lengthProperty];) {
        const w = words.slice(j, j += 16);
        const oldHash = hash.slice(0);

        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            const i2 = i + j;
            const w15 = w[i - 15], w2 = w[i - 2];

            const a = hash[0], e = hash[4];
            const temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0
                );
            const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j >= 0; j--) {
            const b = (hash[i] >> (8 * j)) & 255;
            result += (b < 16 ? '0' : '') + b.toString(16);
        }
    }
    return result;
}

// Calculate SHA-256 (handles both Web Crypto API in HTTPS and pure JS fallback for HTTP/IP contexts)
async function sha256(message) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
        try {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            // Fall back to pure JS if Web Crypto digest throws
        }
    }
    return sha256Sync(message);
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
        let inputHash = '';
        try {
            if (typeof sha256 === 'function') {
                inputHash = await sha256(password);
            } else if (typeof sha256Sync === 'function') {
                inputHash = sha256Sync(password);
            }
        } catch (hashErr) {
            console.warn('[SHA-256 Fallback Notice]', hashErr);
            if (typeof sha256Sync === 'function') {
                inputHash = sha256Sync(password);
            }
        }

        // Try server API first
        let authenticated = false;
        try {
            const resp = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    password: password, 
                    passwordHash: inputHash 
                })
            });
            if (resp.ok) {
                const res = await resp.json();
                if (res.success) {
                    authenticated = true;
                }
            }
        } catch (err) {
            console.warn('[Admin Server API Notice]', err);
        }

        // Client-side hash verification fallback if offline or backend error
        if (!authenticated && inputHash) {
            const cached = localStorage.getItem('soreva_store_data');
            let targetHash = DEFAULT_PASSWORD_HASH;
            if (cached) {
                try {
                    const parsedData = JSON.parse(cached);
                    if (parsedData && parsedData.settings && parsedData.settings.adminPasswordHash) {
                        targetHash = parsedData.settings.adminPasswordHash;
                    }
                } catch (e) {}
            }
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
        errorBox.textContent = `Authentication error: ${err.message || 'Verification failed'}`;
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

function flushAllFormsToStoreData() {
    if (!storeData) return;
    if (!storeData.settings) storeData.settings = {};

    // 1. Overview Quick Inputs
    const quickShipping = document.getElementById('quickShippingInput');
    if (quickShipping && quickShipping.value !== '') {
        const num = parseInt(quickShipping.value, 10);
        if (!isNaN(num) && num >= 0) storeData.settings.freeShippingThresholdINR = num;
    }

    const quickDiscount = document.getElementById('quickLaunchDiscountInput');
    if (quickDiscount && quickDiscount.value !== '') {
        const num = parseInt(quickDiscount.value, 10);
        if (!isNaN(num) && num > 0 && num <= 100) {
            const coupon = (storeData.coupons || []).find(c => c.code === 'LAUNCH15');
            if (coupon) coupon.discountPercent = num;
        }
    }

    const quickSpeed = document.getElementById('quickTickerSpeedInput');
    if (quickSpeed && quickSpeed.value !== '') {
        const sec = parseFloat(quickSpeed.value);
        if (!isNaN(sec) && sec >= 1) storeData.settings.tickerSpeedMs = Math.round(sec * 1000);
    }

    // 2. Boutique Settings Panel (panel-settings)
    const storeName = document.getElementById('settingStoreName');
    if (storeName && storeName.value !== undefined) storeData.settings.storeName = storeName.value.trim();
    const tagline = document.getElementById('settingTagline');
    if (tagline && tagline.value !== undefined) storeData.settings.tagline = tagline.value.trim();
    const logoUrl = document.getElementById('settingLogoUrl');
    if (logoUrl && logoUrl.value !== undefined) storeData.settings.logoUrl = logoUrl.value.trim();
    const logoWhiteUrl = document.getElementById('settingLogoWhiteUrl');
    if (logoWhiteUrl && logoWhiteUrl.value !== undefined) storeData.settings.logoWhiteUrl = logoWhiteUrl.value.trim();
    const email = document.getElementById('settingEmail');
    if (email && email.value !== undefined) storeData.settings.contactEmail = email.value.trim();
    const phone = document.getElementById('settingPhone');
    if (phone && phone.value !== undefined) storeData.settings.contactPhone = phone.value.trim();
    const insta = document.getElementById('settingInstagram');
    if (insta && insta.value !== undefined) storeData.settings.instagramHandle = insta.value.trim();
    const gstRate = document.getElementById('settingGstRate');
    if (gstRate && gstRate.value !== '') storeData.settings.gstRate = parseFloat(gstRate.value) || 3;
    const gstEnabled = document.getElementById('settingGstEnabled');
    if (gstEnabled) storeData.settings.gstEnabled = gstEnabled.checked;
    const profitMarkup = document.getElementById('settingProfitMarkup');
    if (profitMarkup && profitMarkup.value !== '') storeData.settings.profitMarkup = parseFloat(profitMarkup.value) || 2.2;
    const profitFlat = document.getElementById('settingProfitFlat');
    if (profitFlat && profitFlat.value !== '') storeData.settings.profitFlat = parseFloat(profitFlat.value) || 0;

    // 3. Spotlight / Brand Story Form (panel-spotlight)
    if (!storeData.spotlight) storeData.spotlight = {};
    const spotTag = document.getElementById('spotlightTagInput');
    if (spotTag && spotTag.value !== undefined) storeData.spotlight.tag = spotTag.value.trim();
    const spotTitle = document.getElementById('spotlightTitleInput');
    if (spotTitle && spotTitle.value !== undefined) storeData.spotlight.title = spotTitle.value.trim();
    const spotDesc1 = document.getElementById('spotlightDesc1Input');
    if (spotDesc1 && spotDesc1.value !== undefined) storeData.spotlight.desc1 = spotDesc1.value.trim();
    const spotDesc2 = document.getElementById('spotlightDesc2Input');
    if (spotDesc2 && spotDesc2.value !== undefined) storeData.spotlight.desc2 = spotDesc2.value.trim();
    const spotImgMain = document.getElementById('spotlightImgMainInput');
    if (spotImgMain && spotImgMain.value !== undefined) storeData.spotlight.imgMain = spotImgMain.value.trim();
    const spotImgSub = document.getElementById('spotlightImgSubInput');
    if (spotImgSub && spotImgSub.value !== undefined) storeData.spotlight.imgSub = spotImgSub.value.trim();
    const spotBadgeTitle = document.getElementById('spotlightBadgeTitleInput');
    if (spotBadgeTitle && spotBadgeTitle.value !== undefined) storeData.spotlight.badgeTitle = spotBadgeTitle.value.trim();
    const spotBadgeSub = document.getElementById('spotlightBadgeSubInput');
    if (spotBadgeSub && spotBadgeSub.value !== undefined) storeData.spotlight.badgeSub = spotBadgeSub.value.trim();
}
window.flushAllFormsToStoreData = flushAllFormsToStoreData;

async function saveAllStoreData(silent = false) {
    if (!storeData) {
        try {
            const resp = await fetch('/data/store-data.json');
            storeData = await resp.json();
        } catch (e) {
            showToast("Failed to initialize store configuration.");
            return;
        }
    }

    // 1. Visual feedback on Save All button immediately
    const btn = document.querySelector('.btn-save-all');
    const origHtml = btn ? btn.innerHTML : '<i class="fa-solid fa-floppy-disk"></i> <span>Save All</span>';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving...</span>';
    }

    setSaveStatus(false, "Saving changes...");

    // 2. Flush all active DOM form inputs across all panels into storeData
    try {
        flushAllFormsToStoreData();
    } catch (flushErr) {
        console.warn("[SaveAll] Form flush warning:", flushErr);
    }

    // 3. Save to LocalStorage safely (guard against quota exceeded)
    try {
        localStorage.setItem('soreva_store_data', JSON.stringify(storeData));
    } catch (lsErr) {
        console.warn("[SaveAll] LocalStorage quota reached or disabled:", lsErr);
    }

    let saveErrors = [];

    // 4. Persist storeData to server disk (/api/store-data)
    try {
        const resp = await fetch('/api/store-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(storeData)
        });
        if (!resp.ok) {
            const errJson = await resp.json().catch(() => ({}));
            throw new Error(errJson.error || `HTTP ${resp.status}`);
        }
    } catch (err) {
        console.error("[SaveAll] /api/store-data failed:", err);
        saveErrors.push("Store config: " + err.message);
    }

    // 5. Also persist any active specialized panel settings if user was editing them
    try {
        const activeTabEl = document.querySelector('.tab-panel.active');
        const activeTabId = activeTabEl ? activeTabEl.id : '';

        if (activeTabId === 'panel-welcome-popup' && typeof savePopupOfferSettings === 'function') {
            await savePopupOfferSettings();
        } else if (activeTabId === 'panel-newsletter' && typeof saveNewsletterSettings === 'function') {
            await saveNewsletterSettings();
        } else if (activeTabId === 'panel-notifications' && typeof saveNotificationSettings === 'function') {
            await saveNotificationSettings();
        } else if (activeTabId === 'panel-payments' && typeof saveRazorpaySettings === 'function') {
            await saveRazorpaySettings(false);
        } else if (activeTabId === 'panel-instagram' && typeof saveInstagramSettings === 'function') {
            await saveInstagramSettings();
        }
    } catch (specialErr) {
        console.warn("[SaveAll] Secondary panel save warning:", specialErr);
    }

    // 6. Visual feedback on completion
    if (saveErrors.length === 0) {
        setSaveStatus(true, "All Changes Saved");
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #4ade80;"></i> <span>Saved!</span>';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = origHtml;
            }, 1800);
        }
        if (!silent) {
            showToast("✨ All boutique changes saved to disk & live store!");
        }
    } else {
        setSaveStatus(true, "Saved with Warnings");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
        if (!silent) {
            showToast("Warning saving to server: " + saveErrors.join(', '));
        }
    }

    // 7. Refresh metrics & counts
    if (typeof updateBadgeCounts === 'function') {
        updateBadgeCounts();
    }
}
window.saveAllStoreData = saveAllStoreData;

function setSaveStatus(saved, text) {
    const pill = document.getElementById('saveStatusPill');
    if (!pill) return;
    if (saved) {
        pill.className = "save-status-pill";
        pill.style.background = "";
        pill.style.borderColor = "";
        pill.style.color = "";
        pill.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${text || 'All Changes Saved'}</span>`;
    } else {
        pill.className = "save-status-pill";
        pill.style.background = "rgba(197, 160, 89, 0.2)";
        pill.style.borderColor = "var(--gold)";
        pill.style.color = "var(--gold-light)";
        pill.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>${text || 'Saving...'}</span>`;
    }
}
window.setSaveStatus = setSaveStatus;

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
        'welcome-popup': "Festive Offer Pop-Up & Client Email",
        newsletter: "Sorèva Circle Newsletter & Welcome Offer",
        currencies: "Currency & Exchange Rates",
        spotlight: "Brand Story & Craftsmanship",
        testimonials: "Customer Testimonials",
        instagram: "#SorèvaMoments Social Feed",
        payments: "Razorpay Payment Gateway",
        notifications: "Automated Order Notifications (Email & WhatsApp)",
        settings: "Boutique Settings & Security"
    };
    if (titleEl && titles[tabName]) {
        titleEl.textContent = titles[tabName];
    }

    // Trigger data refresh on tab switch
    if (tabName === 'orders') fetchOrders();
    if (tabName === 'inventory') fetchInventory();
    if (tabName === 'products') {
        if (typeof fetchInventory === 'function') fetchInventory();
        renderProductsTable();
        updateBadgeCounts();
    }
    if (tabName === 'customers') fetchCustomers();
    if (tabName === 'database') fetchDatabaseInfo();
    if (tabName === 'instagram') { renderInstagramGrid(); loadInstagramSettingsForm(); }
    if (tabName === 'settings' || tabName === 'payments') loadRazorpaySettings();
    if (tabName === 'notifications') loadNotificationSettings();
    if (tabName === 'welcome-popup') loadPopupOfferSettings();
    if (tabName === 'newsletter') loadNewsletterSettings();
    
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
    if (typeof updateProductSubCategoryOptions === 'function') updateProductSubCategoryOptions();
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
    if (typeof loadRazorpaySettings === 'function') loadRazorpaySettings();
    if (typeof loadNotificationSettings === 'function') loadNotificationSettings();
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
        if (el) el.textContent = (typeof count === 'number') ? count.toLocaleString('en-IN') : count;
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

    const allProds = storeData.products || [];
    const oosCount = allProds.filter(p => 
        p.disabled == 1 || p.active === false || p.active === 0 || p.stockStatus === 'Out of Stock' || (p.stockQty !== undefined && p.stockQty <= 0)
    ).length;
    const inStockCount = Math.max(0, allProds.length - oosCount);
    setBadge('oosProductBadge', oosCount);
    setBadge('invSummaryOutOfStock', oosCount);
    setBadge('inStockProductCount', inStockCount);
    setBadge('inStockProductBadge', inStockCount);
    setBadge('invSummaryInStock', inStockCount);

    if (inventoryData && inventoryData.length) {
        setBadge('countBadgeInventory', inventoryData.length);
        setBadge('inventoryCountHeader', inventoryData.length);
        const totalUnits = inventoryData.reduce((acc, i) => acc + (Number(i.stockQty) || 0), 0);
        setBadge('statTotalInventory', totalUnits);
    } else {
        setBadge('countBadgeInventory', prodCount);
        setBadge('inventoryCountHeader', prodCount);
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

    container.innerHTML = slides.map((slide, idx) => {
        const targetUrl = slide.linkUrl || slide.ctaLink || (slide.productId ? `product.html?id=${slide.productId}` : '');
        return `
        <div class="hero-slide-admin-card" data-id="${slide.id}">
            <div class="slide-img-preview" onclick="inspectImageDetails('${(slide.image || '').replace(/'/g, "\\'")}', 'heroPreviewImg', 'Hero Slide: ${(slide.name || 'Banner').replace(/'/g, "\\'")}')" style="cursor: pointer;" title="Click to inspect slide resolution & specs">
                <img src="${slide.image}" alt="${slide.name || 'Hero slide'}" onerror="this.onerror=null; this.src='assets/hero/hero-slide-${(idx % 8) + 1}.jpg';">
                <span class="slide-tag-pill">${slide.tag || `Look 0${idx + 1}`}</span>
            </div>
            <div class="slide-card-body">
                <h4>${(slide.headline || '').replace(/<[^>]*>?/gm, '')}</h4>
                <p>${slide.subtitle || ''}</p>
                <div class="slide-card-meta">
                    <span>${slide.name || 'Featured Look'}</span>
                    <span style="color: var(--gold-light); font-weight: 500;">${slide.finish || 'Signature Look'}</span>
                </div>
                <div class="slide-card-link" style="margin-top: 8px; padding: 6px 10px; background: rgba(197, 160, 89, 0.08); border: 1px dashed rgba(197, 160, 89, 0.25); border-radius: var(--radius-sm); font-size: 0.78rem; display: flex; align-items: center; gap: 6px; word-break: break-all;">
                    <i class="fa-solid fa-arrow-up-right-from-square" style="color: var(--gold); font-size: 0.75rem;"></i>
                    <span style="color: var(--admin-text-muted);">Jump:</span>
                    <a href="${targetUrl || '#'}" target="_blank" onclick="event.stopPropagation();" style="color: var(--gold); text-decoration: underline;">
                        ${targetUrl || 'None set (click to edit)'}
                    </a>
                </div>
                <div class="slide-card-actions" style="margin-top: 14px;">
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
        `;
    }).join('');
}

function openHeroSlideModal(id = null) {
    const backdrop = document.getElementById('heroModalBackdrop');
    const title = document.getElementById('heroModalTitle');
    const form = document.getElementById('heroSlideForm');
    const productSelect = document.getElementById('heroPieceProductId');

    // Populate products dropdown
    productSelect.innerHTML = `<option value="">-- Custom Link / None --</option>` + (storeData.products || []).slice(0, 150).map(p => `
        <option value="${p.id}">${p.name} (${p.category || 'Jewellery'})</option>
    `).join('');

    if (id) {
        title.textContent = "Edit Hero Slide";
        const slide = storeData.heroSlides.find(s => s.id === id);
        if (slide) {
            document.getElementById('editHeroSlideId').value = slide.id;
            document.getElementById('heroSlideTag').value = slide.tag || '';
            document.getElementById('heroHeadlineInput').value = slide.headline || '';
            document.getElementById('heroSubtitleInput').value = slide.subtitle || '';
            document.getElementById('heroImageInput').value = slide.image || '';
            document.getElementById('heroSlideLinkUrl').value = slide.linkUrl || slide.ctaLink || (slide.productId ? `product.html?id=${slide.productId}` : '');
            document.getElementById('heroPieceName').value = slide.name || '';
            document.getElementById('heroPieceFinish').value = slide.finish || '';
            document.getElementById('heroPieceProductId').value = slide.productId || '';
            document.getElementById('heroCtaText').value = slide.ctaText || 'Explore Collection';
            previewImg(slide.image, 'heroPreviewImg');
        }
    } else {
        title.textContent = "Add New Hero Slide";
        form.reset();
        document.getElementById('editHeroSlideId').value = "";
        const nextNum = (storeData.heroSlides?.length || 0) + 1;
        document.getElementById('heroSlideTag').value = `0${nextNum} / 0${Math.max(8, nextNum)} • SIGNATURE EDIT`;
        document.getElementById('heroSlideLinkUrl').value = "catalog.html";
        document.getElementById('heroCtaText').value = "Explore Collection";
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
    const linkUrl = document.getElementById('heroSlideLinkUrl').value.trim();
    const name = document.getElementById('heroPieceName').value.trim();
    const finish = document.getElementById('heroPieceFinish').value.trim();
    const productId = document.getElementById('heroPieceProductId').value.trim();
    const ctaText = (document.getElementById('heroCtaText')?.value || '').trim() || 'Explore Collection';

    if (editId) {
        const slide = storeData.heroSlides.find(s => s.id === parseInt(editId, 10));
        if (slide) {
            slide.tag = tag;
            slide.headline = headline;
            slide.subtitle = subtitle;
            slide.image = image;
            slide.linkUrl = linkUrl;
            slide.ctaLink = linkUrl;
            slide.ctaText = ctaText;
            slide.name = name;
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
            linkUrl,
            ctaLink: linkUrl,
            ctaText,
            name,
            finish,
            productId
        });
        showToast("New hero slide created!");
    }

    closeHeroSlideModal();
    saveAllStoreData();
    renderHeroSlides();
}

function fillHeroLinkWithProduct() {
    const sel = document.getElementById('heroPieceProductId');
    if (!sel || !sel.value) {
        showToast("Please select a Linked Product first");
        return;
    }
    const linkInput = document.getElementById('heroSlideLinkUrl');
    if (linkInput) {
        linkInput.value = `product.html?id=${encodeURIComponent(sel.value)}`;
        showToast("Applied linked product URL!");
    }
}

function onHeroProductSelect(productId) {
    if (!productId) return;
    const linkInput = document.getElementById('heroSlideLinkUrl');
    if (linkInput && (!linkInput.value || linkInput.value === 'catalog.html' || linkInput.value.startsWith('product.html?id='))) {
        linkInput.value = `product.html?id=${encodeURIComponent(productId)}`;
    }
}
window.fillHeroLinkWithProduct = fillHeroLinkWithProduct;
window.onHeroProductSelect = onHeroProductSelect;

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
let adminSelectedProductIds = new Set();
let adminCurrentFilteredProducts = [];

// Date format helper for stock refreshes & new product additions
function formatRefreshDate(isoStr) {
    if (!isoStr) return '<span style="color: var(--admin-muted); font-size: 0.8rem;">—</span>';
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return `<span style="color: var(--admin-muted); font-size: 0.8rem;">${isoStr}</span>`;
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strHours = String(hours).padStart(2, '0');
        return `<span title="${isoStr}" style="white-space: nowrap;">${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}</span>`;
    } catch (e) {
        return `<span style="color: var(--admin-muted); font-size: 0.8rem;">${isoStr}</span>`;
    }
}

function isRecentlyAdded(item) {
    if (!item) return false;
    // An item is newly added if it has a dateAdded property differing from baseline
    if (item.dateAdded && item.dateAdded !== '2026-10-06T01:48:39Z') {
        return true;
    }
    return false;
}

// ==========================================
// CANONICAL MASTER CATEGORIES & SUBCATEGORIES
// Matching CZMakers and Sorèva store taxonomy
// ==========================================
const MASTER_CATEGORY_SUBCATEGORIES = {
    'necklace': [
        'Necklaces', 'Choker Necklaces', 'Traditional Necklaces', 'Bridal Necklaces',
        'Classic Necklaces', 'Collar Necklaces', 'Mangalsutra', 'Aurous Collection'
    ],
    'earrings': [
        'Earrings', 'Jhumka Earrings', 'Big Size Earrings', 'Medium Earrings',
        'Small Earrings', 'Tops & Studs'
    ],
    'wristwear': [
        'Wristwear', 'CZ Bangles', 'CZ Bracelets', 'Bracelets & Rings Combo'
    ],
    'rings': [
        'Finger Rings', 'CZ Finger Rings'
    ],
    'pendants': [
        'Pendants', 'CZ Pendant Sets', 'Pendants with Broad Chain', 'Pendants with Medium Chain'
    ],
    'silver': [
        'Silver Jewellery', 'Sterling Silver', '925 Sterling Silver Earrings',
        '925 Sterling Finger Rings', '925 Sterling Silver Pendants'
    ],
    'accessories': [
        'Accessories', 'CZ Accessories', 'CZ Brooches', 'Mangtika'
    ]
};

// ==========================================
// SUB-CATEGORY EXTRACTION & SELECT POPULATION
// ==========================================
function getDistinctSubCategories(category = 'all', source = 'products') {
    const list = source === 'inventory' ? (inventoryData || []) : (storeData?.products || []);
    const subcats = new Set();
    const normCategory = (category || 'all').toLowerCase();

    // 1. Seed with canonical master subcategories so filters & datalists are always fully populated
    if (normCategory === 'all') {
        Object.values(MASTER_CATEGORY_SUBCATEGORIES).forEach(subs => subs.forEach(s => subcats.add(s)));
    } else if (normCategory === 'wristwear' || normCategory === 'bracelets') {
        (MASTER_CATEGORY_SUBCATEGORIES['wristwear'] || []).forEach(s => subcats.add(s));
    } else if (MASTER_CATEGORY_SUBCATEGORIES[normCategory]) {
        MASTER_CATEGORY_SUBCATEGORIES[normCategory].forEach(s => subcats.add(s));
    }
    
    // 2. Also union with any distinct subcategories present in live inventory/products
    list.forEach(item => {
        const itemCat = (item.category || '').toLowerCase();
        let match = false;
        if (category === 'all') {
            match = true;
        } else if (category === 'wristwear' || category === 'bracelets') {
            match = (itemCat === 'wristwear' || itemCat === 'bracelets');
        } else if (category === 'silver') {
            const sub = (item.subCategory || item.sub_category || '').toLowerCase();
            match = (itemCat === 'silver' || sub.includes('silver'));
        } else if (category === 'necklace') {
            match = itemCat.includes('neck');
        } else if (category === 'earrings') {
            match = itemCat.includes('ear');
        } else if (category === 'rings') {
            match = itemCat.includes('ring');
        } else if (category === 'pendants') {
            match = itemCat.includes('pendant');
        } else if (category === 'accessories') {
            match = itemCat.includes('access');
        } else {
            match = itemCat === category.toLowerCase();
        }

        if (match) {
            const sub = (item.subCategory || item.sub_category || '').trim();
            if (sub && sub !== '—' && sub !== '-') {
                subcats.add(sub);
            }
        }
    });

    return Array.from(subcats).sort((a, b) => a.localeCompare(b));
}

function updateProductSubCategoryOptions(selectedVal = null) {
    const catSelect = document.getElementById('productCategoryFilter');
    const subSelect = document.getElementById('productSubCategoryFilter');
    if (!subSelect) return;
    
    const cat = catSelect ? catSelect.value : 'all';
    const currentVal = selectedVal || subSelect.value || 'all';
    const subcats = getDistinctSubCategories(cat, 'products');

    let html = '<option value="all">All Sub-Categories</option>';
    subcats.forEach(sub => {
        const isSel = (sub === currentVal) ? 'selected' : '';
        html += `<option value="${sub.replace(/"/g, '&quot;')}" ${isSel}>${sub.replace(/</g, '&lt;')}</option>`;
    });

    subSelect.innerHTML = html;
    if (subcats.includes(currentVal)) {
        subSelect.value = currentVal;
    } else {
        subSelect.value = 'all';
    }

    updateSubCategoryDatalist();
}

function updateSubCategoryDatalist(catOverride = null) {
    const datalist = document.getElementById('subCategoryDatalist');
    if (!datalist) return;
    const catSelect = document.getElementById('prodCategory');
    const cat = catOverride || (catSelect ? catSelect.value : 'all');
    const allSubs = getDistinctSubCategories(cat || 'all', 'products');
    datalist.innerHTML = allSubs.map(s => `<option value="${s.replace(/"/g, '&quot;')}">`).join('');
}

function onProductCategoryChange() {
    updateProductSubCategoryOptions();
    filterAdminProducts();
}

function updateInventorySubCategoryOptions(selectedVal = null) {
    const catSelect = document.getElementById('inventoryCategoryFilter');
    const subSelect = document.getElementById('inventorySubCategoryFilter');
    if (!subSelect) return;

    const cat = catSelect ? catSelect.value : 'all';
    const currentVal = selectedVal || subSelect.value || 'all';
    const subcats = getDistinctSubCategories(cat, 'inventory');

    let html = '<option value="all">All Sub-Categories</option>';
    subcats.forEach(sub => {
        const isSel = (sub === currentVal) ? 'selected' : '';
        html += `<option value="${sub.replace(/"/g, '&quot;')}" ${isSel}>${sub.replace(/</g, '&lt;')}</option>`;
    });

    subSelect.innerHTML = html;
    if (subcats.includes(currentVal)) {
        subSelect.value = currentVal;
    } else {
        subSelect.value = 'all';
    }
}

function onInventoryCategoryChange() {
    updateInventorySubCategoryOptions();
    handleInventoryFilter(true);
}

function formatAdminPlatingBadge(plating) {
    const pl = (plating || 'gold').toLowerCase();
    if (pl === 'silver' || pl.includes('silver') || pl.includes('rhodium')) {
        return '<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; white-space: nowrap;"><i class="fa-solid fa-gem" style="margin-right:3px;"></i>Rhodium Silver</span>';
    }
    if (pl === 'rosegold' || pl.includes('rose')) {
        return '<span class="badge" style="background: rgba(244, 114, 182, 0.15); color: #f472b6; border: 1px solid rgba(244, 114, 182, 0.3); font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; white-space: nowrap;"><i class="fa-solid fa-sparkles" style="margin-right:3px;"></i>Rose Gold</span>';
    }
    if (pl === 'two-tone' || pl.includes('tone')) {
        return '<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; white-space: nowrap;"><i class="fa-solid fa-circle-half-stroke" style="margin-right:3px;"></i>Two-Tone</span>';
    }
    if (pl === 'oxidised' || pl.includes('oxidi')) {
        return '<span class="badge" style="background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.35); font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; white-space: nowrap;"><i class="fa-solid fa-moon" style="margin-right:3px;"></i>Oxidised</span>';
    }
    if (pl === 'antique' || pl.includes('antique') || pl.includes('mehndi')) {
        return '<span class="badge" style="background: rgba(217, 119, 6, 0.15); color: #fbbf24; border: 1px solid rgba(217, 119, 6, 0.3); font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; white-space: nowrap;"><i class="fa-solid fa-sun" style="margin-right:3px;"></i>Antique Mehndi</span>';
    }
    return '<span class="badge" style="background: rgba(234, 179, 8, 0.15); color: #facc15; border: 1px solid rgba(234, 179, 8, 0.3); font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; white-space: nowrap;"><i class="fa-solid fa-coins" style="margin-right:3px;"></i>24K Gold</span>';
}

function filterAdminProducts() {
    const text = document.getElementById('productSearchFilter') ? document.getElementById('productSearchFilter').value : '';
    const cat = document.getElementById('productCategoryFilter') ? document.getElementById('productCategoryFilter').value : 'all';
    const subCat = document.getElementById('productSubCategoryFilter') ? document.getElementById('productSubCategoryFilter').value : 'all';
    const plating = document.getElementById('productPlatingFilter') ? document.getElementById('productPlatingFilter').value : 'all';
    const badge = document.getElementById('productBadgeFilter') ? document.getElementById('productBadgeFilter').value : 'all';
    const stock = document.getElementById('productStockFilter') ? document.getElementById('productStockFilter').value : 'all';
    const sort = document.getElementById('productSortFilter') ? document.getElementById('productSortFilter').value : 'default';
    const imageFilter = document.getElementById('productImageFilter') ? document.getElementById('productImageFilter').value : 'all';
    adminCatalogPage = 1;
    renderProductsTable(text, cat, badge, stock, sort, subCat, plating, imageFilter);
}

function renderProductsTable(filterText = '', filterCat = 'all', filterBadge = 'all', filterStock = 'all', filterSort = 'default', filterSubCat = 'all', filterPlating = 'all', filterImages = 'all') {
    const tbody = document.getElementById('productsAdminTbody');
    if (!tbody) return;

    if (filterBadge === 'all' && document.getElementById('productBadgeFilter')) {
        filterBadge = document.getElementById('productBadgeFilter').value || 'all';
    }
    if (filterCat === 'all' && document.getElementById('productCategoryFilter')) {
        filterCat = document.getElementById('productCategoryFilter').value || 'all';
    }
    if (filterSubCat === 'all' && document.getElementById('productSubCategoryFilter')) {
        filterSubCat = document.getElementById('productSubCategoryFilter').value || 'all';
    }
    if (filterPlating === 'all' && document.getElementById('productPlatingFilter')) {
        filterPlating = document.getElementById('productPlatingFilter').value || 'all';
    }
    if (!filterText && document.getElementById('productSearchFilter')) {
        filterText = document.getElementById('productSearchFilter').value || '';
    }
    if (filterSort === 'default' && document.getElementById('productSortFilter')) {
        filterSort = document.getElementById('productSortFilter').value || 'default';
    }
    if (filterImages === 'all' && document.getElementById('productImageFilter')) {
        filterImages = document.getElementById('productImageFilter').value || 'all';
    }

    let items = [...(storeData?.products || [])];

    if (filterStock === 'all' && document.getElementById('productStockFilter')) {
        filterStock = document.getElementById('productStockFilter').value || 'all';
    }

    if (filterStock === 'out_of_stock') {
        items = items.filter(p => p.disabled == 1 || p.active === false || p.active === 0 || p.stockStatus === 'Out of Stock' || (p.stockQty !== undefined && p.stockQty <= 0));
    } else if (filterStock === 'in_stock') {
        items = items.filter(p => !(p.disabled == 1 || p.active === false || p.active === 0 || p.stockStatus === 'Out of Stock' || (p.stockQty !== undefined && p.stockQty <= 0)));
    }

    if (filterCat !== 'all') {
        if (filterCat === 'wristwear' || filterCat === 'bracelets') {
            items = items.filter(p => p.category === 'wristwear' || p.category === 'bracelets');
        } else if (filterCat === 'silver') {
            items = items.filter(p => p.category === 'silver' || (p.subCategory && p.subCategory.toLowerCase().includes('silver')));
        } else {
            items = items.filter(p => p.category === filterCat);
        }
    }
    if (filterSubCat !== 'all') {
        items = items.filter(p => {
            const sub = (p.subCategory || p.sub_category || '').toLowerCase();
            return sub === filterSubCat.toLowerCase();
        });
    }
    if (filterPlating && filterPlating !== 'all') {
        items = items.filter(p => {
            const pl = (p.plating || 'gold').toLowerCase();
            if (filterPlating === 'gold') return pl.includes('gold') && !pl.includes('rose') && !pl.includes('white');
            if (filterPlating === 'silver') return pl.includes('silver') || pl.includes('rhodium');
            if (filterPlating === 'rosegold') return pl.includes('rose');
            if (filterPlating === 'two-tone') return pl.includes('two') || pl.includes('tone') || pl.includes('dual');
            if (filterPlating === 'oxidised') return pl.includes('oxidi') || pl.includes('black');
            if (filterPlating === 'antique') return pl.includes('antique') || pl.includes('mehndi');
            return pl === filterPlating.toLowerCase();
        });
    }
    if (filterBadge !== 'all') {
        if (filterBadge === 'none') {
            items = items.filter(p => !p.badge || !p.badge.trim());
        } else {
            items = items.filter(p => (p.badge || '').trim().toLowerCase() === filterBadge.toLowerCase());
        }
    }
    if (filterImages && filterImages !== 'all') {
        items = items.filter(p => {
            const imgs = normalizeProductImages(p);
            if (filterImages === 'has_hidden') return imgs.some(i => i.visible === false);
            if (filterImages === 'multiple') return imgs.length > 1;
            if (filterImages === 'single') return imgs.length === 1;
            return true;
        });
    }
    if (filterText) {
        const q = filterText.toLowerCase();
        items = items.filter(p => 
            (p.name && p.name.toLowerCase().includes(q)) || 
            (p.subCategory && p.subCategory.toLowerCase().includes(q)) || 
            (p.sku && p.sku.toLowerCase().includes(q)) || 
            (p.id && String(p.id).toLowerCase().includes(q)) || 
            (p.description && p.description.toLowerCase().includes(q))
        );
    }

    const countLabel = document.getElementById('productsCountLabel');
    if (countLabel) countLabel.textContent = items.length.toLocaleString('en-IN');

    if (items.length === 0) {
        adminCurrentFilteredProducts = [];
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">No products found matching filters.</td></tr>`;
        renderTablePagination(0, 1);
        updateBulkBar();
        return;
    }

    // Sort items
    if (filterSort === 'recently_refreshed') {
        items.sort((a, b) => {
            const timeA = a.lastRefreshed ? new Date(a.lastRefreshed).getTime() : 0;
            const timeB = b.lastRefreshed ? new Date(b.lastRefreshed).getTime() : 0;
            return timeB - timeA;
        });
    } else if (filterSort === 'newest_added') {
        items.sort((a, b) => {
            const timeA = a.dateAdded ? new Date(a.dateAdded).getTime() : (a.lastRefreshed ? new Date(a.lastRefreshed).getTime() : 0);
            const timeB = b.dateAdded ? new Date(b.dateAdded).getTime() : (b.lastRefreshed ? new Date(b.lastRefreshed).getTime() : 0);
            return timeB - timeA;
        });
    } else if (filterSort === 'price_asc') {
        items.sort((a, b) => (Number(a.priceINR) || 0) - (Number(b.priceINR) || 0));
    } else if (filterSort === 'price_desc') {
        items.sort((a, b) => (Number(b.priceINR) || 0) - (Number(a.priceINR) || 0));
    } else {
        // Group by category if we are viewing 'all' and default sort
        if (filterCat === 'all' && !filterText && filterBadge === 'all' && filterSubCat === 'all') {
            items.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        }
    }

    adminCurrentFilteredProducts = items;
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / adminCatalogPageSize));
    if (adminCatalogPage > totalPages) adminCatalogPage = totalPages;
    if (adminCatalogPage < 1) adminCatalogPage = 1;

    const startIdx = (adminCatalogPage - 1) * adminCatalogPageSize;
    let pageItems = items.slice(startIdx, startIdx + adminCatalogPageSize);

    let currentRenderCategory = null;
    let html = '';

    pageItems.forEach(p => {
        if (filterCat === 'all' && !filterText && filterBadge === 'all' && filterSubCat === 'all' && p.category !== currentRenderCategory) {
            currentRenderCategory = p.category;
            html += `<tr><td colspan="11" style="background: rgba(197, 160, 89, 0.1); color: var(--gold); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding: 12px 16px;">${currentRenderCategory || 'Uncategorized'}</td></tr>`;
        }
        
        const isOutOfStock = (p.disabled == 1 || p.active === false || p.active === 0 || p.stockStatus === 'Out of Stock' || (p.stockQty !== undefined && p.stockQty <= 0));
        const opacity = isOutOfStock ? '0.55' : '1';
        const isSelected = adminSelectedProductIds.has(String(p.id));
        const badgeVal = (p.badge || '').trim();
        const knownBadges = ['Sorèva Exclusive', 'Trending', 'New Launch', 'Bestseller'];
        const isCustom = badgeVal && !knownBadges.includes(badgeVal);

        const prodImgs = normalizeProductImages(p);
        const totalImgs = prodImgs.length;
        const visibleImgs = prodImgs.filter(i => i.visible !== false).length;
        const hiddenImgs = totalImgs - visibleImgs;
        const optPrimary = getOptimizedImgUrl(p.primaryImg || (prodImgs[0]?.url || ''));
        
        html += `
        <tr style="opacity: ${opacity};" id="row_prod_${p.id}">
            <td style="text-align: center;">
                <input type="checkbox" class="prod-row-checkbox" value="${p.id}" ${isSelected ? 'checked' : ''} onchange="handleProductRowSelect('${p.id}', this.checked)">
            </td>
            <td>
                <div class="prod-table-media-cell" onclick="openProductImagesQuickModal('${p.id}')" title="Click to manage photos, set visibility ON/OFF, or upload">
                    <div class="prod-table-thumbs-preview">
                        <img src="${optPrimary}" alt="${(p.name || '').replace(/"/g, '&quot;')}" class="table-thumb" onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
                        ${prodImgs.slice(1, 3).map(img => `
                            <img src="${getOptimizedImgUrl(img.url)}" class="table-mini-thumb ${img.visible === false ? 'is-off' : ''}" title="${img.visible === false ? 'Hidden from storefront' : 'Visible on storefront'}" onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
                        `).join('')}
                        ${totalImgs > 3 ? `<span class="table-thumb-more">+${totalImgs - 3}</span>` : ''}
                    </div>
                    <button type="button" class="btn-manage-media-pill ${hiddenImgs > 0 ? 'has-hidden' : ''}" onclick="event.stopPropagation(); openProductImagesQuickModal('${p.id}')" title="Click to manage images: toggle ON/OFF, set Primary/Hover, upload custom photos">
                        <i class="fa-solid fa-photo-film"></i>
                        <span>${visibleImgs}/${totalImgs} Visible</span>
                        ${hiddenImgs > 0 ? `<span class="badge-hidden-alert">${hiddenImgs} Off</span>` : ''}
                    </button>
                </div>
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <strong style="color: var(--admin-text);">${(p.name || '').replace(/</g, '&lt;')}</strong>
                    ${isRecentlyAdded(p) ? '<span class="badge" style="background: rgba(245,158,11,0.18); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; font-weight: 600;"><i class="fa-solid fa-sparkles"></i> New Added</span>' : ''}
                </div>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 3px; flex-wrap: wrap;">
                    <span style="color: var(--admin-text-muted); font-size: 0.78rem;">SKU: ${p.sku || p.id} • ${(p.subCategory || '').replace(/</g, '&lt;')}</span>
                    ${p.lastRefreshed ? `<span style="font-size: 0.74rem; color: #a1a1aa; background: rgba(255,255,255,0.04); padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);" title="Last stock refresh timestamp"><i class="fa-regular fa-clock" style="color: var(--gold); margin-right: 3px;"></i>Refreshed: ${formatRefreshDate(p.lastRefreshed)}</span>` : ''}
                </div>
            </td>
            <td><span class="status-code">${p.category}</span></td>
            <td>
                <span class="subcat-badge" style="display: inline-block; font-size: 0.78rem; font-weight: 500; color: #fef08a; background: rgba(197, 160, 89, 0.12); border: 1px solid rgba(197, 160, 89, 0.28); border-radius: 4px; padding: 2px 8px; white-space: nowrap;">
                    ${(p.subCategory || p.sub_category || '—').replace(/</g, '&lt;')}
                </span>
            </td>
            <td>
                <strong style="color: var(--gold-light);">₹${(p.priceINR || 0).toLocaleString('en-IN')}</strong>
                <div style="font-size: 0.74rem; color: #10b981; font-weight: 600; margin-top: 3px;" title="Retained CZMakers actual wholesale cost">
                    <i class="fa-solid fa-tag"></i> CZM Cost: ₹${p.usdWholesale ? Number(p.usdWholesale).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '—'}
                </div>
            </td>
            <td><span style="text-decoration: line-through; color: var(--admin-text-muted);">₹${((p.originalPriceINR || p.priceINR) || 0).toLocaleString('en-IN')}</span></td>
            <td>${formatAdminPlatingBadge(p.plating)}</td>
            <td>
                <div class="admin-badge-cell">
                    <select class="admin-badge-select" data-id="${p.id}" data-badge="${badgeVal.replace(/"/g, '&quot;')}" onchange="changeProductBadge('${p.id}', this.value)">
                        <option value="Sorèva Exclusive" ${badgeVal === 'Sorèva Exclusive' ? 'selected' : ''}>💎 Sorèva Exclusive</option>
                        <option value="Trending" ${badgeVal === 'Trending' ? 'selected' : ''}>🔥 Trending</option>
                        <option value="New Launch" ${badgeVal === 'New Launch' ? 'selected' : ''}>✨ New Launch</option>
                        <option value="Bestseller" ${badgeVal === 'Bestseller' ? 'selected' : ''}>👑 Bestseller</option>
                        <option value="" ${!badgeVal ? 'selected' : ''}>— None (No Badge) —</option>
                        ${isCustom ? `<option value="${badgeVal.replace(/"/g, '&quot;')}" selected>✏️ ${badgeVal.replace(/</g, '&lt;')}</option>` : ''}
                    </select>
                    <button class="btn-icon" onclick="quickEditBadgeCustom('${p.id}')" title="Custom badge text" style="font-size:0.7rem; padding:4px;"><i class="fa-solid fa-pen"></i></button>
                </div>
            </td>
            <td>
                ${isOutOfStock ? '<span class="status-badge" style="background:rgba(239,68,68,0.18);color:#f87171;border:1px solid rgba(239,68,68,0.4);"><i class="fa-solid fa-ban"></i> Out of Stock</span>' : '<span class="status-badge badge-green"><i class="fa-solid fa-check"></i> In Stock</span>'}
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="openProductImagesQuickModal('${p.id}')" title="Manage Images & Visibility (Upload, Show/Hide)" style="color: var(--gold-light); background: rgba(197, 160, 89, 0.16); border: 1px solid rgba(197, 160, 89, 0.4);">
                        <i class="fa-solid fa-photo-film"></i>
                    </button>
                    <button class="btn-icon" onclick="toggleProductDisable('${p.id}')" title="${isOutOfStock ? 'Enable Product' : 'Disable Product'}">
                        <i class="fa-solid ${isOutOfStock ? 'fa-eye' : 'fa-eye-slash'}"></i>
                    </button>
                    <button class="btn-icon" onclick="openProductModal('${p.id}')" title="Edit Piece">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteProduct('${p.id}')" title="Delete Piece" style="${isOutOfStock ? 'color:#f87171;' : ''}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    });

    tbody.innerHTML = html;
    renderTablePagination(total, totalPages);
    updateBulkBar();
}

// Table Pagination Logic
function renderTablePagination(total, totalPages) {
    const container = document.getElementById('adminProductsPagination');
    if (!container) return;
    if (total === 0) {
        container.innerHTML = '';
        return;
    }

    const start = (adminCatalogPage - 1) * adminCatalogPageSize + 1;
    const end = Math.min(total, adminCatalogPage * adminCatalogPageSize);

    container.innerHTML = `
        <div>Showing <strong>${start}–${end}</strong> of <strong>${total.toLocaleString('en-IN')}</strong> pieces</div>
        <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="admin-page-btn" ${adminCatalogPage <= 1 ? 'disabled' : ''} onclick="goToAdminProductsPage(1)" title="First Page">
                <i class="fa-solid fa-angles-left"></i>
            </button>
            <button type="button" class="admin-page-btn" ${adminCatalogPage <= 1 ? 'disabled' : ''} onclick="goToAdminProductsPage(${adminCatalogPage - 1})" title="Previous Page">
                <i class="fa-solid fa-angle-left"></i> Prev
            </button>
            <span style="font-weight: 600; padding: 0 6px;">Page ${adminCatalogPage} of ${totalPages}</span>
            <button type="button" class="admin-page-btn" ${adminCatalogPage >= totalPages ? 'disabled' : ''} onclick="goToAdminProductsPage(${adminCatalogPage + 1})" title="Next Page">
                Next <i class="fa-solid fa-angle-right"></i>
            </button>
            <button type="button" class="admin-page-btn" ${adminCatalogPage >= totalPages ? 'disabled' : ''} onclick="goToAdminProductsPage(${totalPages})" title="Last Page">
                <i class="fa-solid fa-angles-right"></i>
            </button>
        </div>
    `;
}

function goToAdminProductsPage(page) {
    adminCatalogPage = page;
    const text = document.getElementById('productSearchFilter') ? document.getElementById('productSearchFilter').value : '';
    const cat = document.getElementById('productCategoryFilter') ? document.getElementById('productCategoryFilter').value : 'all';
    const subCat = document.getElementById('productSubCategoryFilter') ? document.getElementById('productSubCategoryFilter').value : 'all';
    const badge = document.getElementById('productBadgeFilter') ? document.getElementById('productBadgeFilter').value : 'all';
    const stock = document.getElementById('productStockFilter') ? document.getElementById('productStockFilter').value : 'all';
    const sort = document.getElementById('productSortFilter') ? document.getElementById('productSortFilter').value : 'default';
    renderProductsTable(text, cat, badge, stock, sort, subCat);
    const tbl = document.getElementById('productsAdminTable');
    if (tbl) tbl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Instant Badge Update
async function changeProductBadge(id, newBadge) {
    const badge = (newBadge || '').trim();
    try {
        const res = await fetch('/api/db/products/badge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, badge, employeeName: 'Admin' })
        });
        const data = await res.json();
        if (data.success) {
            const prod = (storeData.products || []).find(p => String(p.id) === String(id) || String(p.dbId) === String(id));
            if (prod) prod.badge = badge;

            try {
                const cached = localStorage.getItem('soreva_store_data');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    const cp = (parsed.products || []).find(p => String(p.id) === String(id) || String(p.dbId) === String(id));
                    if (cp) cp.badge = badge;
                    localStorage.setItem('soreva_store_data', JSON.stringify(parsed));
                }
            } catch (e) {}

            const sel = document.querySelector(`.admin-badge-select[data-id="${id}"]`);
            if (sel) {
                sel.setAttribute('data-badge', badge);
                sel.value = badge;
            }

            showToast(badge ? `Product marked as "${badge}"` : 'Product badge removed');
        } else {
            showToast(data.error || 'Failed to update badge');
        }
    } catch (e) {
        showToast('Error: ' + e.message);
    }
}

// Custom Badge Prompt
async function quickEditBadgeCustom(id) {
    const product = (storeData.products || []).find(p => String(p.id) === String(id));
    if (!product) return;
    const current = product.badge || '';
    const newBadge = prompt("Enter badge label for this piece (e.g. Sorèva Exclusive, Trending, New Launch, Bestseller, or custom text):", current);
    if (newBadge === null) return;
    await changeProductBadge(id, newBadge.trim());
    filterAdminProducts();
}

// Bulk Selection and Update Logic
function handleProductRowSelect(id, checked) {
    if (checked) {
        adminSelectedProductIds.add(String(id));
    } else {
        adminSelectedProductIds.delete(String(id));
    }
    updateBulkBar();
}

function toggleSelectAllProds(checked) {
    const checkboxes = document.querySelectorAll('.prod-row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) {
            adminSelectedProductIds.add(String(cb.value));
        } else {
            adminSelectedProductIds.delete(String(cb.value));
        }
    });
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('adminBulkBadgeBar');
    const countEl = document.getElementById('bulkSelectedCount');
    const selectAllCb = document.getElementById('selectAllProdsCheckbox');
    const count = adminSelectedProductIds.size;
    if (countEl) countEl.textContent = count.toLocaleString('en-IN');
    if (bar) {
        bar.style.display = count > 0 ? 'flex' : 'none';
    }
    if (selectAllCb) {
        const checkboxes = document.querySelectorAll('.prod-row-checkbox');
        selectAllCb.checked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    }
    const wrap = document.getElementById('bulkSelectAllFilteredWrap');
    const totalSpan = document.getElementById('bulkFilteredTotalSpan');
    if (wrap && totalSpan && adminCurrentFilteredProducts) {
        const totalMatching = adminCurrentFilteredProducts.length;
        if (count > 0 && count < totalMatching) {
            wrap.style.display = 'inline';
            totalSpan.textContent = totalMatching.toLocaleString('en-IN');
        } else {
            wrap.style.display = 'none';
        }
    }
}

function selectAllFilteredProducts() {
    if (!adminCurrentFilteredProducts || adminCurrentFilteredProducts.length === 0) return;
    adminCurrentFilteredProducts.forEach(p => {
        if (p.id) adminSelectedProductIds.add(String(p.id));
    });
    const checkboxes = document.querySelectorAll('.prod-row-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    const selectAllCb = document.getElementById('selectAllProdsCheckbox');
    if (selectAllCb) selectAllCb.checked = true;
    updateBulkBar();
}

function deselectAllProducts() {
    adminSelectedProductIds.clear();
    const checkboxes = document.querySelectorAll('.prod-row-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    const selectAllCb = document.getElementById('selectAllProdsCheckbox');
    if (selectAllCb) selectAllCb.checked = false;
    updateBulkBar();
}

// Bulk Status Action: Disable or Enable Selected Products
async function applyBulkDisable(disabled = 1) {
    const ids = Array.from(adminSelectedProductIds);
    if (ids.length === 0) {
        showToast('Please select at least one product first');
        return;
    }

    const actionWord = disabled === 1 ? 'disable' : 'enable';
    const actionPast = disabled === 1 ? 'disabled' : 'enabled';
    const confirmPrompt = `Are you sure you want to ${actionWord} ${ids.length} selected product(s)?\n\n${disabled === 1 ? 'Disabled pieces will be hidden from the storefront catalog.' : 'Enabled pieces will be visible to customers on the storefront.'}`;
    if (!confirm(confirmPrompt)) {
        return;
    }

    const btnDisable = document.getElementById('btnBulkDisable');
    const btnEnable = document.getElementById('btnBulkEnable');
    if (btnDisable) btnDisable.disabled = true;
    if (btnEnable) btnEnable.disabled = true;

    try {
        const res = await fetch('/api/db/products/bulk-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ids,
                disabled: disabled,
                active: disabled === 1 ? 0 : 1,
                employeeName: 'Admin'
            })
        });
        const data = await res.json();
        if (data.success) {
            const idSet = new Set(ids.map(String));
            (storeData.products || []).forEach(p => {
                if (idSet.has(String(p.id)) || idSet.has(String(p.dbId))) {
                    p.disabled = (disabled === 1);
                    p.active = (disabled === 0);
                    if (disabled === 1) {
                        p.stockStatus = 'Disabled';
                    } else {
                        const qty = p.stockQty;
                        p.stockStatus = (qty === undefined || qty > 0) ? 'In Stock' : 'Out of Stock';
                    }
                }
            });

            try {
                const cached = localStorage.getItem('soreva_store_data');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    (parsed.products || []).forEach(p => {
                        if (idSet.has(String(p.id)) || idSet.has(String(p.dbId))) {
                            p.disabled = (disabled === 1);
                            p.active = (disabled === 0);
                            if (disabled === 1) {
                                p.stockStatus = 'Disabled';
                            } else {
                                const qty = p.stockQty;
                                p.stockStatus = (qty === undefined || qty > 0) ? 'In Stock' : 'Out of Stock';
                            }
                        }
                    });
                    localStorage.setItem('soreva_store_data', JSON.stringify(parsed));
                }
            } catch (e) {}

            showToast(data.message || `Successfully ${actionPast} ${ids.length} product(s)`);
            deselectAllProducts();
            updateBadgeCounts();
            filterAdminProducts();
        } else {
            showToast(data.error || `Failed to ${actionWord} products`);
        }
    } catch (e) {
        showToast('Error: ' + e.message);
    } finally {
        if (btnDisable) btnDisable.disabled = false;
        if (btnEnable) btnEnable.disabled = false;
    }
}

async function applyBulkBadgeChange() {
    const ids = Array.from(adminSelectedProductIds);
    if (ids.length === 0) return;
    const sel = document.getElementById('bulkBadgeSelect');
    const newBadge = sel ? sel.value.trim() : '';

    try {
        const res = await fetch('/api/db/products/badge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, badge: newBadge, employeeName: 'Admin' })
        });
        const data = await res.json();
        if (data.success) {
            const idSet = new Set(ids.map(String));
            (storeData.products || []).forEach(p => {
                if (idSet.has(String(p.id)) || idSet.has(String(p.dbId))) {
                    p.badge = newBadge;
                }
            });
            try {
                const cached = localStorage.getItem('soreva_store_data');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    (parsed.products || []).forEach(p => {
                        if (idSet.has(String(p.id)) || idSet.has(String(p.dbId))) {
                            p.badge = newBadge;
                        }
                    });
                    localStorage.setItem('soreva_store_data', JSON.stringify(parsed));
                }
            } catch (e) {}

            showToast(data.message || `Updated badge for ${ids.length} piece(s)`);
            deselectAllProducts();
            updateBadgeCounts();
            filterAdminProducts();
        } else {
            showToast(data.error || 'Failed to update badges');
        }
    } catch (e) {
        showToast('Error: ' + e.message);
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
            loadStoreData();
        } else {
            showToast(data.error || 'Failed to toggle product');
        }
    } catch (e) {
        showToast(e.message);
    }
}


function handleModalBadgeSelectChange(val) {
    const input = document.getElementById('prodBadge');
    if (!input) return;
    if (val === '__custom__') {
        input.style.display = 'block';
        input.focus();
    } else {
        input.style.display = 'none';
        input.value = val;
    }
}

// ==========================================
// PRODUCT IMAGES & VISIBILITY MANAGER LOGIC
// ==========================================
let modalEditingProductImages = [];
let quickEditingProductImages = [];
let quickCurrentProductId = null;

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

    // Ensure at least one is primary if list has items
    if (list.length > 0 && !list.some(i => i.isPrimary)) {
        list[0].isPrimary = true;
    }
    // Ensure hover is set if list has 2+ items
    if (list.length > 1 && !list.some(i => i.isHover)) {
        list[1].isHover = true;
    }

    return list;
}

function renderProductImagesManagerGrid(context = 'modal') {
    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
    const gridEl = document.getElementById(context === 'modal' ? 'modalProductImagesGrid' : 'quickProductImagesGrid');
    const badgeEl = document.getElementById(context === 'modal' ? 'modalImagesStatsBadge' : 'quickImagesSummaryStats');

    if (!gridEl) return;

    const total = list.length;
    const visibleCount = list.filter(i => i.visible !== false).length;
    const hiddenCount = total - visibleCount;

    if (badgeEl) {
        if (context === 'modal') {
            badgeEl.innerHTML = `<i class="fa-solid fa-camera"></i> <strong>${total}</strong> Images (${visibleCount} Visible${hiddenCount > 0 ? `, <span style="color:#fca5a5;">${hiddenCount} Hidden</span>` : ''})`;
        } else {
            badgeEl.innerHTML = `Showing <strong>${total}</strong> photos: <span style="color: #6ee7b7; font-weight: 600;">${visibleCount} Visible in Store</span>${hiddenCount > 0 ? ` • <span style="color: #fca5a5; font-weight: 600;">${hiddenCount} Hidden from Customers</span>` : ''}`;
        }
    }

    // Check wholesale angle button visibility
    const detectBtn = document.getElementById(context === 'modal' ? 'btnDetectSupplierAnglesModal' : 'btnDetectSupplierAnglesQuick');
    if (detectBtn) {
        const prodId = context === 'modal' ? document.getElementById('editProductId').value : quickCurrentProductId;
        const prod = storeData?.products?.find(p => String(p.id) === String(prodId));
        const hasCzmPattern = (prod?.sku && /^\d+/.test(prod.sku)) || (prod?.primaryImg && prod.primaryImg.includes('indian-jewellery.com'));
        detectBtn.style.display = hasCzmPattern ? 'inline-flex' : 'none';
    }

    if (total === 0) {
        gridEl.innerHTML = `
            <div class="prod-images-empty-state">
                <i class="fa-regular fa-image" style="font-size: 2rem; color: var(--gold); margin-bottom: 8px; display: block;"></i>
                <strong style="color: var(--admin-text); font-size: 0.95rem;">No Images Added Yet</strong>
                <p style="margin: 4px 0 0 0; color: var(--admin-text-muted);">
                    Click <strong>Upload My Own Images</strong> above or drag & drop photos here to add imagery for this piece.
                </p>
            </div>
        `;
        if (context === 'modal') {
            const primInput = document.getElementById('prodPrimaryImg');
            const hovInput = document.getElementById('prodHoverImg');
            if (primInput) primInput.value = '';
            if (hovInput) hovInput.value = '';
        }
        return;
    }

    gridEl.innerHTML = list.map((item, idx) => {
        const isPrim = !!item.isPrimary;
        const isHov = !!item.isHover;
        const isVis = item.visible !== false;
        const optUrl = getOptimizedImgUrl(item.url);

        return `
        <div class="prod-img-card ${isPrim ? 'is-primary' : ''} ${isHov ? 'is-hover' : ''} ${!isVis ? 'is-hidden' : ''}" id="card_${context}_${item.id}">
            <div class="img-card-thumb-wrap">
                ${isPrim ? `<div class="card-role-pill pill-primary" title="Primary image shown on catalog cards and initial PDP load"><i class="fa-solid fa-star"></i> Primary</div>` : ''}
                ${isHov && !isPrim ? `<div class="card-role-pill pill-hover" title="Hover perspective image shown when mousing over catalog card"><i class="fa-solid fa-arrows-rotate"></i> Hover Flip</div>` : ''}
                
                <div class="card-status-pill ${isVis ? 'pill-status-visible' : 'pill-status-hidden'}" title="Storefront display status">
                    ${isVis ? '<i class="fa-solid fa-eye"></i> Visible' : '<i class="fa-solid fa-eye-slash"></i> Hidden'}
                </div>

                <img src="${optUrl}" alt="Photo ${idx + 1}" 
                     onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';" 
                     onclick="inspectImageDetails('${(item.url || '').replace(/'/g, "\\'")}', 'prodPrimaryPreview', 'Product Photo ${idx + 1}')"
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
                        <button type="button" class="card-action-icon-btn" onclick="inspectImageDetails('${(item.url || '').replace(/'/g, "\\'")}', 'prodPrimaryPreview', 'Image Specs')" title="Inspect Specs & Resolution">
                            <i class="fa-solid fa-expand"></i>
                        </button>
                        <button type="button" class="card-action-icon-btn btn-delete-img" onclick="deleteProductImageItem('${item.id}', '${context}')" title="Delete image from product">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Sync form hidden inputs if in Product Modal
    if (context === 'modal') {
        const primInput = document.getElementById('prodPrimaryImg');
        const hovInput = document.getElementById('prodHoverImg');
        const primItem = list.find(i => i.isPrimary && i.visible !== false) || list.find(i => i.visible !== false) || list[0];
        const hovItem = list.find(i => i.isHover && i.visible !== false) || (list.filter(i => i.visible !== false)[1] || primItem);

        if (primInput) primInput.value = primItem ? primItem.url : '';
        if (hovInput) hovInput.value = hovItem ? hovItem.url : (primItem ? primItem.url : '');
    }
}

function toggleProductImageVisibility(imgId, context) {
    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
    const item = list.find(i => i.id === imgId);
    if (!item) return;

    item.visible = item.visible === false ? true : false;

    // If we hid the primary image, pick the next available visible image as primary
    if (item.isPrimary && item.visible === false) {
        item.isPrimary = false;
        const nextVisible = list.find(i => i.visible !== false && i.id !== imgId);
        if (nextVisible) {
            nextVisible.isPrimary = true;
        }
    }

    // If we hid the hover image, clear or reassign
    if (item.isHover && item.visible === false) {
        item.isHover = false;
        const nextHover = list.find(i => i.visible !== false && !i.isPrimary);
        if (nextHover) {
            nextHover.isHover = true;
        }
    }

    renderProductImagesManagerGrid(context);
    showToast(item.visible ? "Image is now VISIBLE on store" : "Image is now HIDDEN from store");
}

function setProductImagePrimary(imgId, context) {
    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
    const item = list.find(i => i.id === imgId);
    if (!item) return;

    list.forEach(i => {
        i.isPrimary = (i.id === imgId);
        if (i.id === imgId) {
            i.visible = true; // Auto-enable visibility
            if (i.isHover) i.isHover = false;
        }
    });

    renderProductImagesManagerGrid(context);
    showToast("Set as Primary storefront photo");
}

function setProductImageHover(imgId, context) {
    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
    const item = list.find(i => i.id === imgId);
    if (!item) return;

    list.forEach(i => {
        i.isHover = (i.id === imgId);
        if (i.id === imgId) {
            i.visible = true; // Auto-enable visibility
            if (i.isPrimary) i.isPrimary = false;
        }
    });

    renderProductImagesManagerGrid(context);
    showToast("Set as Catalog Hover Flip photo");
}

function moveProductImageOrder(imgId, direction, context) {
    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
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
    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
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

async function handleModalImageFilesUpload(event, context) {
    const files = event.target.files;
    if (!files || !files.length) return;

    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
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

async function handleImageDrop(event, el, context) {
    event.preventDefault();
    event.stopPropagation();
    el.classList.remove('drag-active');

    const dt = event.dataTransfer;
    const files = dt?.files;
    if (files && files.length > 0) {
        await handleModalImageFilesUpload({ target: { files: files, value: '' } }, context);
    }
}

function handleAddCustomImageUrl(context) {
    const input = document.getElementById(context === 'modal' ? 'modalAddImageUrlInput' : 'quickAddImageUrlInput');
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) {
        showToast("Please enter an image URL");
        return;
    }

    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
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
    showToast("Image URL added to piece!");
}

async function handleScanSupplierAngles(context) {
    const prodId = context === 'modal' ? document.getElementById('editProductId').value : quickCurrentProductId;
    const prod = storeData?.products?.find(p => String(p.id) === String(prodId));
    if (!prod || !prod.primaryImg) {
        showToast("No base image to scan candidate angles for");
        return;
    }

    const basePrimary = prod.primaryImg;
    const match = basePrimary.match(/^(.*?)(([A-Za-z0-9]+?)(\.[a-zA-Z0-9]+))$/);
    if (!match) {
        showToast("Could not determine base wholesale image pattern");
        return;
    }

    showToast("Checking supplier angles repository...");
    const list = context === 'modal' ? modalEditingProductImages : quickEditingProductImages;
    const existingUrls = new Set(list.map(i => i.url));

    const candidates = ['A', 'B', 'C', 'D'];
    let addedAngles = 0;

    for (const suffix of candidates) {
        let candidateUrl = '';
        if (basePrimary.endsWith('.jpg') || basePrimary.endsWith('.jpeg') || basePrimary.endsWith('.png') || basePrimary.endsWith('.webp')) {
            const ext = basePrimary.substring(basePrimary.lastIndexOf('.'));
            const stem = basePrimary.substring(0, basePrimary.lastIndexOf('.')).replace(/[A-Z]$/, '');
            candidateUrl = `${stem}${suffix}${ext}`;
        }

        if (candidateUrl && !existingUrls.has(candidateUrl)) {
            try {
                const testUrl = getOptimizedImgUrl(candidateUrl);
                const resp = await fetch(testUrl, { method: 'HEAD' });
                if (resp.ok) {
                    list.push({
                        id: 'img_' + Math.random().toString(36).substr(2, 8),
                        url: candidateUrl,
                        visible: true,
                        isPrimary: false,
                        isHover: (list.length === 1)
                    });
                    existingUrls.add(candidateUrl);
                    addedAngles++;
                }
            } catch (e) {}
        }
    }

    renderProductImagesManagerGrid(context);
    if (addedAngles > 0) {
        showToast(`Found and added ${addedAngles} alternate angle(s) from wholesale repository!`);
    } else {
        showToast("No additional alternate angles found. You can upload your own photos!");
    }
}

// ----------------------------------------------------
// QUICK PRODUCT IMAGES MODAL OPEN & SAVE
// ----------------------------------------------------
function openProductImagesQuickModal(productId) {
    const prod = storeData?.products?.find(p => String(p.id) === String(productId));
    if (!prod) {
        showToast("Product not found");
        return;
    }

    quickCurrentProductId = productId;
    const idField = document.getElementById('quickImagesProductId');
    if (idField) idField.value = productId;

    // Populate header preview
    const headerEl = document.getElementById('quickImagesProductHeader');
    if (headerEl) {
        headerEl.innerHTML = `
            <img src="${getOptimizedImgUrl(prod.primaryImg)}" alt="${(prod.name || '').replace(/"/g, '&quot;')}" class="quick-img-prod-thumb" onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <h4 style="margin: 0; color: var(--gold-light); font-size: 1.05rem;">${(prod.name || 'Jewelry Piece').replace(/</g, '&lt;')}</h4>
                    <span class="subcat-badge" style="font-size: 0.72rem; padding: 1px 6px;">${prod.category || 'Jewelry'}</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--admin-text-muted); margin-top: 3px;">
                    SKU: <strong>${prod.sku || prod.id}</strong> • Selling Price: <strong style="color: var(--gold);">₹${(prod.priceINR || 0).toLocaleString('en-IN')}</strong>
                </div>
            </div>
        `;
    }

    quickEditingProductImages = normalizeProductImages(prod);
    renderProductImagesManagerGrid('quick');

    const backdrop = document.getElementById('productImagesModalBackdrop');
    if (backdrop) backdrop.classList.add('active');
}

function closeProductImagesQuickModal() {
    const backdrop = document.getElementById('productImagesModalBackdrop');
    if (backdrop) backdrop.classList.remove('active');
}

async function saveQuickProductImages() {
    if (!quickCurrentProductId) return;
    const prod = storeData?.products?.find(p => String(p.id) === String(quickCurrentProductId));
    if (!prod) return;

    const list = quickEditingProductImages;
    const visibleList = list.filter(i => i.visible !== false);

    const primaryImg = list.find(i => i.isPrimary && i.visible !== false)?.url || visibleList[0]?.url || prod.primaryImg;
    const hoverImg = list.find(i => i.isHover && i.visible !== false)?.url || (visibleList[1]?.url || primaryImg);
    const gallery = visibleList.length > 0 ? visibleList.map(i => i.url) : [primaryImg, hoverImg].filter(Boolean);

    // Update in-memory product
    prod.images = list;
    prod.gallery = gallery;
    prod.primaryImg = primaryImg;
    prod.hoverImg = hoverImg;

    saveAllStoreData(true);
    filterAdminProducts();
    closeProductImagesQuickModal();

    showToast("Product images & visibility saved!");

    try {
        await fetch('/api/db/products/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: prod.dbId || prod.id,
                images: list,
                primaryImg: primaryImg,
                hoverImg: hoverImg,
                gallery: gallery
            })
        });
    } catch (e) {
        console.warn("Could not sync images to database:", e);
    }
}

window.openProductImagesQuickModal = openProductImagesQuickModal;
window.closeProductImagesQuickModal = closeProductImagesQuickModal;
window.saveQuickProductImages = saveQuickProductImages;
window.toggleProductImageVisibility = toggleProductImageVisibility;
window.setProductImagePrimary = setProductImagePrimary;
window.setProductImageHover = setProductImageHover;
window.moveProductImageOrder = moveProductImageOrder;
window.deleteProductImageItem = deleteProductImageItem;
window.handleModalImageFilesUpload = handleModalImageFilesUpload;
window.handleImageDropOver = handleImageDropOver;
window.handleImageDropLeave = handleImageDropLeave;
window.handleImageDrop = handleImageDrop;
window.handleAddCustomImageUrl = handleAddCustomImageUrl;
window.handleScanSupplierAngles = handleScanSupplierAngles;

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
            updateSubCategoryDatalist(prod.category);
            document.getElementById('prodSubCategory').value = prod.subCategory || '';
            document.getElementById('prodPlating').value = prod.plating || 'gold';
            document.getElementById('prodPriceINR').value = prod.priceINR;
            document.getElementById('prodOrigPriceINR').value = prod.originalPriceINR || prod.priceINR;
            const wholesaleInp = document.getElementById('prodUsdWholesale');
            if (wholesaleInp) wholesaleInp.value = prod.usdWholesale ? Number(prod.usdWholesale).toFixed(2) : '';
            const skuInp = document.getElementById('prodSku');
            if (skuInp) skuInp.value = prod.sku || '';
            const badgeVal = prod.badge || '';
            const knownBadges = ['Sorèva Exclusive', 'Trending', 'New Launch', 'Bestseller', ''];
            const badgeSelect = document.getElementById('prodBadgeSelect');
            const badgeInput = document.getElementById('prodBadge');
            if (badgeSelect && badgeInput) {
                if (knownBadges.includes(badgeVal)) {
                    badgeSelect.value = badgeVal;
                    badgeInput.value = badgeVal;
                    badgeInput.style.display = 'none';
                } else {
                    badgeSelect.value = '__custom__';
                    badgeInput.value = badgeVal;
                    badgeInput.style.display = 'block';
                }
            } else if (badgeInput) {
                badgeInput.value = badgeVal;
            }
            document.getElementById('prodFinishes').value = (prod.availableFinishes || []).join(', ');
            document.getElementById('prodDescription').value = prod.description || '';
            document.getElementById('prodRating').value = prod.rating || 5.0;
            document.getElementById('prodReviews').value = prod.reviews || 25;

            // Load & render product images manager
            modalEditingProductImages = normalizeProductImages(prod);
            renderProductImagesManagerGrid('modal');
        }
    } else {
        title.textContent = "Add New Jewelry Piece";
        form.reset();
        document.getElementById('editProductId').value = "";
        const prodCatEl = document.getElementById('prodCategory');
        updateSubCategoryDatalist(prodCatEl ? prodCatEl.value : 'all');
        const wholesaleReset = document.getElementById('prodUsdWholesale');
        if (wholesaleReset) wholesaleReset.value = '';
        const skuReset = document.getElementById('prodSku');
        if (skuReset) skuReset.value = '';
        const badgeSelect = document.getElementById('prodBadgeSelect');
        const badgeInput = document.getElementById('prodBadge');
        if (badgeSelect) badgeSelect.value = 'Sorèva Exclusive';
        if (badgeInput) {
            badgeInput.value = 'Sorèva Exclusive';
            badgeInput.style.display = 'none';
        }
        modalEditingProductImages = [];
        renderProductImagesManagerGrid('modal');
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
    const availableFinishes = finishesRaw ? finishesRaw.split(',').map(s => s.trim()) : ["24K Gold", "Rhodium Silver"];
    const description = document.getElementById('prodDescription').value.trim();
    const rating = parseFloat(document.getElementById('prodRating').value) || 5.0;
    const reviews = parseInt(document.getElementById('prodReviews').value, 10) || 10;

    const images = modalEditingProductImages;
    const visibleImages = images.filter(img => img.visible !== false);
    const primaryImg = images.find(img => img.isPrimary && img.visible !== false)?.url 
                    || visibleImages[0]?.url 
                    || (images[0]?.url || document.getElementById('prodPrimaryImg').value.trim());
    const hoverImg = images.find(img => img.isHover && img.visible !== false)?.url 
                   || (visibleImages[1]?.url || primaryImg);
    const gallery = visibleImages.length > 0 ? visibleImages.map(img => img.url) : (primaryImg ? [primaryImg] : []);

    if (!primaryImg && images.length === 0) {
        showToast("Please add or upload at least one image for this jewelry piece.");
        return;
    }

    const usdWholesaleVal = document.getElementById('prodUsdWholesale') ? parseFloat(document.getElementById('prodUsdWholesale').value) : null;
    const skuVal = document.getElementById('prodSku') ? document.getElementById('prodSku').value.trim() : '';

    if (editId) {
        const p = storeData.products.find(item => item.id === parseInt(editId, 10) || String(item.id) === String(editId));
        if (p) {
            Object.assign(p, {
                name, category, subCategory, plating, priceINR, originalPriceINR,
                badge, availableFinishes, primaryImg, hoverImg, description,
                rating, reviews, gallery, images
            });
            if (usdWholesaleVal !== null && !isNaN(usdWholesaleVal)) p.usdWholesale = usdWholesaleVal;
            if (skuVal) p.sku = skuVal;
        }
        showToast("Product updated!");
    } else {
        const newId = storeData.products.length ? Math.max(...storeData.products.map(p => typeof p.id === 'number' ? p.id : 0)) + 1 : 1;
        storeData.products.push({
            id: newId,
            name, category, subCategory, plating, priceINR, originalPriceINR,
            badge, availableFinishes, primaryImg, hoverImg, description,
            rating, reviews, gallery, images, launchOffer: true
        });
        showToast("New jewelry piece added!");
    }

    closeProductModal();
    saveAllStoreData();
    filterAdminProducts();
    if (typeof fetchInventory === 'function') fetchInventory();

    // Two-way sync with SQLite database
    try {
        fetch(editId ? '/api/db/products/update' : '/api/db/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: editId,
                name, category, subCategory, plating, priceINR, originalPriceINR,
                badge, availableFinishes, primaryImg, hoverImg, description,
                gallery, images,
                stockQty: 15, lowStockThreshold: 5,
                usdWholesale: (typeof usdWholesaleVal !== 'undefined' && usdWholesaleVal !== null && !isNaN(usdWholesaleVal)) ? usdWholesaleVal : 0.0,
                sku: skuVal || '',
                employeeName: 'Owner'
            })
        });
    } catch (err) {
        console.warn("Could not sync to SQLite:", err);
    }
}

async function deleteProduct(id) {
    if (confirm("Are you sure you want to permanently delete this jewelry piece?\n\nNOTE: Customer accounts and order histories will remain 100% exclusive and intact.")) {
        const prod = storeData.products.find(p => String(p.id) === String(id));
        const name = prod ? prod.name : '';
        storeData.products = storeData.products.filter(p => String(p.id) !== String(id));
        if (Array.isArray(inventoryData)) {
            inventoryData = inventoryData.filter(i => String(i.id) !== String(id) && (!prod || !prod.sku || String(i.sku) !== String(prod.sku)));
        }
        saveAllStoreData();
        filterAdminProducts();
        if (typeof fetchInventory === 'function') fetchInventory();
        updateBadgeCounts();
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
            <img src="${cat.image}" alt="${cat.name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80'">
            <div class="category-card-body">
                <h4>${cat.name}</h4>
                <span>${cat.countLabel}</span>
                <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn-admin-outline btn-sm" onclick="openCategoryEditModal(${idx})" title="Edit category details and image">
                        <i class="fa-regular fa-pen-to-square"></i> Edit
                    </button>
                    <button class="btn-icon btn-delete btn-sm" onclick="deleteCategoryItem(${idx})" title="Delete Category" style="color: #ff6b6b; border: 1px solid rgba(255, 107, 107, 0.3); border-radius: 4px; padding: 4px 8px;">
                        <i class="fa-solid fa-trash-can"></i>
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

async function autoSyncCurrencies() {
    showToast("Syncing live rates from Frankfurter API...", "info");
    try {
        const resp = await fetch("https://api.frankfurter.dev/v1/latest?base=INR");
        if (!resp.ok) throw new Error("API response not OK");
        const data = await resp.json();
        
        if (!data.rates) throw new Error("No rates returned");
        
        let updatedCount = 0;
        const currencies = storeData.currencies || {};
        
        for (const code of Object.keys(currencies)) {
            if (code === 'INR') continue;
            
            if (data.rates[code]) {
                currencies[code].rate = data.rates[code];
                updatedCount++;
            } else if (code === 'AED' && data.rates['USD']) {
                // AED is pegged to USD (1 USD = 3.6725 AED)
                currencies['AED'].rate = data.rates['USD'] * 3.6725;
                updatedCount++;
            }
        }
        
        if (updatedCount > 0) {
            saveAllStoreData(true);
            renderCurrenciesTable();
            showToast(`Successfully synced ${updatedCount} exchange rates!`);
        } else {
            showToast("No matching currencies found to sync.");
        }
    } catch (err) {
        console.error("Currency sync failed:", err);
        showToast("Failed to sync live rates. Check console.");
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
// 10. INSTAGRAM REELS & VIDEO GALLERY MANAGER
// ==========================================
function renderInstagramGrid() {
    const grid = document.getElementById('instagramAdminGrid');
    if (!grid) return;

    loadInstagramSettingsForm();

    const countLabel = document.getElementById('reelsCountLabel');
    if (countLabel) countLabel.textContent = (storeData.instagram || []).length;

    if (!storeData.instagram || storeData.instagram.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 36px; color: var(--admin-text-muted);">No reels added yet. Paste a link above or sync from Instagram.</div>`;
        return;
    }

    grid.innerHTML = (storeData.instagram || []).map((item, idx) => {
        const videoSrc = item.videoUrl || item.rawVideoUrl || '';
        const posterSrc = item.thumbnail || '';
        const permalink = item.permalink || 'https://www.instagram.com/soreva_jewels';
        const title = item.title || 'Sorèva Reel';
        const caption = item.caption || title;

        return `
        <div class="insta-edit-card" id="insta_card_${item.id || idx}">
            <video src="${videoSrc}" poster="${posterSrc}" controls preload="metadata" style="width: 100%; aspect-ratio: 9/16; max-height: 200px; object-fit: cover; border-radius: 6px; background: #000; margin-bottom: 8px;"></video>
            
            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 0.72rem; color: var(--admin-text-muted);">Reel Title / Product</label>
                <input type="text" value="${(title || '').replace(/"/g, '&quot;')}" class="admin-input" style="font-size: 0.8rem; padding: 6px;" onchange="storeData.instagram[${idx}].title = this.value">
            </div>

            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 0.72rem; color: var(--admin-text-muted);">Caption</label>
                <textarea class="admin-textarea" rows="2" style="font-size: 0.78rem; padding: 6px;" onchange="storeData.instagram[${idx}].caption = this.value">${(caption || '').replace(/</g, '&lt;')}</textarea>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px solid var(--admin-border); margin-top: 6px;">
                <a href="${permalink}" target="_blank" rel="noopener" style="font-size: 0.74rem; color: var(--gold-light); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-brands fa-instagram"></i> View on IG
                </a>
                <button type="button" class="btn-icon btn-delete" onclick="deleteReelFromGallery('${item.id || idx}')" title="Delete Reel" style="height: 28px; width: 28px; font-size: 0.78rem;">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

function loadInstagramSettingsForm() {
    const s = storeData.settings?.instagram || {};
    const handleInput = document.getElementById('instaSettingHandle');
    const tokenInput = document.getElementById('instaSettingToken');
    const accountInput = document.getElementById('instaSettingAccountId');
    const autoSyncInput = document.getElementById('instaSettingAutoSync');
    const statusPill = document.getElementById('instaConnStatus');
    const lastSyncLabel = document.getElementById('instaLastSyncLabel');

    if (handleInput) handleInput.value = s.handle || 'soreva_jewels';
    if (tokenInput && s.metaAccessToken) tokenInput.value = s.metaAccessToken;
    if (accountInput) accountInput.value = s.instagramAccountId || '';
    if (autoSyncInput) autoSyncInput.checked = s.autoSync !== false;

    if (statusPill) {
        if (s.metaAccessToken) {
            statusPill.className = 'insta-status-pill connected';
            statusPill.innerHTML = '<i class="fa-solid fa-circle-check"></i> Meta API Connected';
        } else {
            statusPill.className = 'insta-status-pill ready';
            statusPill.innerHTML = '<i class="fa-solid fa-circle-check"></i> Gallery Live Active';
        }
    }

    if (lastSyncLabel && s.lastSync) {
        lastSyncLabel.textContent = `Last synced: ${new Date(s.lastSync).toLocaleString('en-IN')}`;
    }
}

async function saveInstagramSettings() {
    const handle = document.getElementById('instaSettingHandle')?.value.trim() || 'soreva_jewels';
    const metaAccessToken = document.getElementById('instaSettingToken')?.value.trim() || '';
    const instagramAccountId = document.getElementById('instaSettingAccountId')?.value.trim() || '';
    const autoSync = document.getElementById('instaSettingAutoSync')?.checked ?? true;

    if (!storeData.settings) storeData.settings = {};
    storeData.settings.instagram = {
        handle,
        profileUrl: `https://www.instagram.com/${handle}`,
        metaAccessToken,
        instagramAccountId,
        autoSync,
        autoSyncIntervalHours: 6
    };

    saveAllStoreData();

    try {
        const res = await fetch('/api/instagram/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ handle, metaAccessToken, instagramAccountId, autoSync })
        });
        const data = await res.json();
        if (data.success) {
            showToast("Instagram credentials saved!");
            loadInstagramSettingsForm();
        } else {
            showToast(data.error || "Failed to save settings");
        }
    } catch (e) {
        showToast("Settings saved locally");
    }
}

async function syncInstagramFeed() {
    const btn = document.getElementById('btnSyncInsta');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to Meta...';
    }

    const token = document.getElementById('instaSettingToken')?.value.trim();
    const accountId = document.getElementById('instaSettingAccountId')?.value.trim();
    const handle = document.getElementById('instaSettingHandle')?.value.trim() || 'soreva_jewels';

    try {
        const res = await fetch('/api/instagram/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: token, accountId, handle })
        });
        const data = await res.json();
        if (data.success && data.items) {
            storeData.instagram = data.items;
            saveAllStoreData();
            renderInstagramGrid();
            showToast(data.message || `Synced ${data.items.length} reels from Instagram!`);
        } else {
            alert("Instagram Sync Notice:\n\n" + (data.error || "Could not sync from Meta API. Make sure your Meta Access Token is valid."));
        }
    } catch (e) {
        alert("Sync error: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

async function addNewReelToGallery() {
    const urlInput = document.getElementById('newReelUrl');
    const titleInput = document.getElementById('newReelTitle');
    const captionInput = document.getElementById('newReelCaption');

    const url = urlInput ? urlInput.value.trim() : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const caption = captionInput ? captionInput.value.trim() : '';

    if (!url) {
        alert("Please enter an Instagram reel URL or video link.");
        return;
    }

    try {
        const res = await fetch('/api/instagram/reels/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, title, caption })
        });
        const data = await res.json();
        if (data.success && data.item) {
            if (!storeData.instagram) storeData.instagram = [];
            storeData.instagram.unshift(data.item);
            saveAllStoreData();
            renderInstagramGrid();
            if (urlInput) urlInput.value = '';
            if (titleInput) titleInput.value = '';
            if (captionInput) captionInput.value = '';
            showToast("New reel added to gallery!");
        } else {
            showToast(data.error || "Failed to add reel");
        }
    } catch (e) {
        showToast("Error: " + e.message);
    }
}

async function deleteReelFromGallery(id) {
    if (!confirm("Are you sure you want to remove this reel from your social gallery?")) return;

    try {
        await fetch('/api/instagram/reels/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        storeData.instagram = (storeData.instagram || []).filter(r => String(r.id) !== String(id));
        saveAllStoreData();
        renderInstagramGrid();
        showToast("Reel removed from gallery");
    } catch (e) {
        showToast("Error removing reel");
    }
}

function saveInstagramFeed() {
    saveAllStoreData();
    showToast("Instagram Gallery changes saved!");
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
    const gstRateEl = document.getElementById('settingGstRate');
    if (gstRateEl) gstRateEl.value = (s.gstRate !== undefined) ? s.gstRate : 3;
    const gstEnabledEl = document.getElementById('settingGstEnabled');
    if (gstEnabledEl) gstEnabledEl.checked = (s.gstEnabled !== undefined) ? Boolean(s.gstEnabled) : true;
    
    const profitMarkupEl = document.getElementById('settingProfitMarkup');
    const profitFlatEl = document.getElementById('settingProfitFlat');
    if (profitMarkupEl) profitMarkupEl.value = (s.profitMarkup !== undefined) ? s.profitMarkup : 2.2;
    if (profitFlatEl) profitFlatEl.value = (s.profitFlat !== undefined) ? s.profitFlat : 0;

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
    const gstRateEl = document.getElementById('settingGstRate');
    const gstEnabledEl = document.getElementById('settingGstEnabled');
    storeData.settings.gstRate = gstRateEl ? (parseFloat(gstRateEl.value) || 0) : 3;
    storeData.settings.gstEnabled = gstEnabledEl ? gstEnabledEl.checked : true;
    
    const profitMarkupEl = document.getElementById('settingProfitMarkup');
    const profitFlatEl = document.getElementById('settingProfitFlat');
    storeData.settings.profitMarkup = profitMarkupEl ? (parseFloat(profitMarkupEl.value) || 2.2) : 2.2;
    storeData.settings.profitFlat = profitFlatEl ? (parseFloat(profitFlatEl.value) || 0) : 0;

    saveAllStoreData();
    showToast("Store settings saved!");
}

async function recalculateCatalogPrices() {
    if (!confirm("This will instantly recalculate retail prices for ALL products based on your saved Profit Markup config. Proceed?")) return;
    
    // Auto-save the latest inputs first
    saveGeneralSettings();
    // Wait briefly for the save to hit the disk
    await new Promise(r => setTimeout(r, 500));
    
    const btn = document.querySelector('button[onclick="recalculateCatalogPrices()"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Calculating...';
    
    try {
        const resp = await fetch('/api/admin/recalculate-prices', { method: 'POST' });
        const res = await resp.json();
        if (res.success) {
            showToast(`Success! Recalculated prices for ${res.updated} products.`);
            // Optionally reload page to reflect new prices in inventory table
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast(res.error || "Failed to recalculate prices", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error. Try again.", "error");
    } finally {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-calculator"></i> Apply to Entire Catalog Now';
    }
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

    el.src = getOptimizedImgUrl(cleanUrl);
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
// ==========================================
// 8. STOCK & INVENTORY CONTROLLERS (High-Performance Paginated Engine)
// ==========================================
inventoryData = [];
let currentInventoryPage = 1;
let inventoryPageSize = 50;
let inventoryFilteredItems = [];
let adminSelectedInventoryIds = new Set();

async function fetchInventory() {
    try {
        const resp = await fetch('/api/inventory');
        if (resp.ok) {
            inventoryData = await resp.json();

            // Sync live inventory data into storeData.products in memory
            if (storeData && Array.isArray(storeData.products)) {
                const invMap = new Map();
                inventoryData.forEach(item => {
                    if (item.id) invMap.set(String(item.id), item);
                    if (item.sku) invMap.set(String(item.sku), item);
                });
                storeData.products.forEach(p => {
                    const match = invMap.get(String(p.id)) || (p.sku && invMap.get(String(p.sku)));
                    if (match) {
                        p.stockQty = Number(match.stockQty) || 0;
                        p.lowStockThreshold = Number(match.lowStockThreshold) || 5;
                        p.stockStatus = match.status || (p.stockQty <= 0 ? 'Out of Stock' : 'In Stock');
                        p.disabled = (match.disabled !== undefined ? match.disabled : (p.stockQty <= 0 ? 1 : 0));
                        p.active = (match.active !== undefined ? match.active : (p.stockQty <= 0 ? 0 : 1));
                    }
                });
            }

            if (typeof updateInventorySubCategoryOptions === 'function') {
                updateInventorySubCategoryOptions();
            }
            handleInventoryFilter(false);
            updateBadgeCounts();
        }
    } catch (err) {
        console.warn("Could not fetch inventory:", err);
    }
}

function handleInventoryFilter(resetPage = false) {
    if (resetPage) currentInventoryPage = 1;

    const search = (document.getElementById('inventorySearchInput')?.value || '').toLowerCase().trim();
    const cat = document.getElementById('inventoryCategoryFilter')?.value || 'all';
    const subCat = document.getElementById('inventorySubCategoryFilter')?.value || 'all';
    const status = document.getElementById('inventoryStatusFilter')?.value || 'all';
    const pageSizeEl = document.getElementById('inventoryPageSize');
    if (pageSizeEl) {
        inventoryPageSize = parseInt(pageSizeEl.value, 10) || 50;
    }

    // Filter items efficiently
    inventoryFilteredItems = (inventoryData || []).filter(item => {
        // Search filter
        if (search) {
            const name = (item.productName || '').toLowerCase();
            const sku = (item.sku || '').toLowerCase();
            const id = String(item.id || '').toLowerCase();
            const sub = (item.subCategory || '').toLowerCase();
            if (!name.includes(search) && !sku.includes(search) && !id.includes(search) && !sub.includes(search)) {
                return false;
            }
        }

        // Category filter
        if (cat !== 'all') {
            const itemCat = (item.category || '').toLowerCase();
            if (cat === 'necklace' && !itemCat.includes('neck')) return false;
            else if (cat === 'wristwear' && !itemCat.includes('wrist') && !itemCat.includes('bracelet')) return false;
            else if (cat === 'earrings' && !itemCat.includes('ear')) return false;
            else if (cat === 'rings' && !itemCat.includes('ring')) return false;
            else if (cat === 'pendants' && !itemCat.includes('pendant')) return false;
            else if (cat === 'silver' && !itemCat.includes('silver')) return false;
            else if (cat === 'accessories' && !itemCat.includes('access')) return false;
            else if (!itemCat.includes(cat)) return false;
        }

        // Subcategory filter
        if (subCat !== 'all') {
            const itemSub = (item.subCategory || '').toLowerCase();
            if (itemSub !== subCat.toLowerCase()) return false;
        }

        // Status filter
        const qty = Number(item.stockQty) || 0;
        const thresh = Number(item.lowStockThreshold) || 5;
        const isDisabled = (item.disabled == 1 || item.status === 'Disabled' || item.active === 0);

        if (status === 'hidden') {
            if (!isDisabled) return false;
        } else if (status === 'visible') {
            if (isDisabled) return false;
        } else if (status === 'in_stock') {
            if (qty <= thresh || isDisabled) return false;
        } else if (status === 'low_stock') {
            if (qty <= 0 || qty > thresh || isDisabled) return false;
        } else if (status === 'out_of_stock') {
            if (qty > 0 || isDisabled) return false;
        }

        return true;
    });

    // Sort items
    const sortVal = document.getElementById('inventorySortFilter')?.value || 'default';
    if (sortVal === 'recently_refreshed') {
        inventoryFilteredItems.sort((a, b) => {
            const timeA = a.lastRefreshed ? new Date(a.lastRefreshed).getTime() : 0;
            const timeB = b.lastRefreshed ? new Date(b.lastRefreshed).getTime() : 0;
            return timeB - timeA;
        });
    } else if (sortVal === 'newest_added') {
        inventoryFilteredItems.sort((a, b) => {
            const timeA = a.dateAdded ? new Date(a.dateAdded).getTime() : (a.lastRefreshed ? new Date(a.lastRefreshed).getTime() : 0);
            const timeB = b.dateAdded ? new Date(b.dateAdded).getTime() : (b.lastRefreshed ? new Date(b.lastRefreshed).getTime() : 0);
            return timeB - timeA;
        });
    } else if (sortVal === 'stock_desc') {
        inventoryFilteredItems.sort((a, b) => (Number(b.stockQty) || 0) - (Number(a.stockQty) || 0));
    } else if (sortVal === 'stock_asc') {
        inventoryFilteredItems.sort((a, b) => (Number(a.stockQty) || 0) - (Number(b.stockQty) || 0));
    }

    renderInventoryMetrics();
    renderInventoryTable();
}

function filterInventoryByStatus(statusVal) {
    const sel = document.getElementById('inventoryStatusFilter');
    if (sel) {
        sel.value = statusVal;
        handleInventoryFilter(true);
    }
}

function renderInventoryMetrics() {
    let totalUnits = 0;
    let inStock = 0;
    let lowStock = 0;
    let outStock = 0;
    let hiddenCount = 0;

    (inventoryData || []).forEach(item => {
        const qty = Number(item.stockQty) || 0;
        const thresh = Number(item.lowStockThreshold) || 5;
        const isDisabled = (item.disabled == 1 || item.status === 'Disabled' || item.active === 0);
        totalUnits += qty;
        if (isDisabled) {
            hiddenCount++;
        } else if (qty <= 0) {
            outStock++;
        } else if (qty <= thresh) {
            lowStock++;
        } else {
            inStock++;
        }
    });

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val.toLocaleString(); };
    setVal('invSummaryTotalUnits', totalUnits);
    setVal('invSummaryInStock', inStock);
    setVal('invSummaryLowStock', lowStock);
    setVal('invSummaryOutOfStock', outStock);
    setVal('invSummaryHidden', hiddenCount);
    setVal('statTotalInventory', totalUnits);

    const countHeader = document.getElementById('inventoryCountHeader');
    if (countHeader) {
        const total = (inventoryData || []).length;
        const filtered = (inventoryFilteredItems || []).length;
        if (filtered < total) {
            countHeader.textContent = `${filtered.toLocaleString()} filtered of ${total.toLocaleString()}`;
        } else {
            countHeader.textContent = `${total.toLocaleString()}`;
        }
    }
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const totalFiltered = inventoryFilteredItems.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / inventoryPageSize));

    if (currentInventoryPage > totalPages) currentInventoryPage = totalPages;
    if (currentInventoryPage < 1) currentInventoryPage = 1;

    const startIndex = (currentInventoryPage - 1) * inventoryPageSize;
    const endIndex = Math.min(startIndex + inventoryPageSize, totalFiltered);
    const pageItems = inventoryFilteredItems.slice(startIndex, endIndex);

    // Update pagination controls
    const setElem = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setElem('invPageStart', totalFiltered > 0 ? (startIndex + 1).toLocaleString() : '0');
    setElem('invPageEnd', endIndex.toLocaleString());
    setElem('invTotalFiltered', totalFiltered.toLocaleString());
    setElem('invCurrentPage', currentInventoryPage);
    setElem('invTotalPages', totalPages);

    const prevBtn = document.getElementById('btnInvPrevPage');
    const nextBtn = document.getElementById('btnInvNextPage');
    if (prevBtn) prevBtn.disabled = (currentInventoryPage <= 1);
    if (nextBtn) nextBtn.disabled = (currentInventoryPage >= totalPages);

    if (pageItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 48px 20px; color: var(--admin-muted);">
                    <i class="fa-solid fa-boxes-stacked" style="font-size: 2.2rem; margin-bottom: 12px; display: block; color: var(--gold-light); opacity: 0.5;"></i>
                    <strong style="display: block; font-size: 1rem; color: var(--admin-text); margin-bottom: 4px;">No matching inventory pieces found</strong>
                    <span style="font-size: 0.85rem;">Try adjusting your search query, category selection, or availability filter.</span>
                </td>
            </tr>
        `;
        updateInventoryBulkBar();
        return;
    }

    tbody.innerHTML = pageItems.map(item => {
        const qty = Number(item.stockQty) || 0;
        const thresh = Number(item.lowStockThreshold) || 5;
        const isSelected = adminSelectedInventoryIds.has(String(item.id));
        const isDisabled = (item.disabled == 1 || item.status === 'Disabled' || item.active === 0);

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

        const safeName = (item.productName || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        return `
            <tr style="${isSelected ? 'background: rgba(197, 160, 89, 0.08);' : ''}">
                <td style="text-align: center;">
                    <input type="checkbox" class="inv-row-checkbox" value="${item.id}" ${isSelected ? 'checked' : ''} onchange="handleInventoryRowSelect('${item.id}', this.checked)" style="cursor: pointer; width: 16px; height: 16px;">
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <strong style="color: var(--admin-text); font-size: 0.92rem;">${item.productName}</strong>
                        ${isRecentlyAdded(item) ? '<span class="badge" style="background: rgba(245,158,11,0.18); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4); font-size: 0.68rem; padding: 1px 6px; border-radius: 4px; font-weight: 600;"><i class="fa-solid fa-sparkles"></i> New Added</span>' : ''}
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; margin-top: 3px; flex-wrap: wrap;">
                        <span style="font-size: 0.76rem; color: var(--admin-muted);">ID: ${item.id}</span>
                        ${item.usdWholesale ? `<span style="font-size: 0.74rem; color: #10b981; font-weight: 600;" title="Retained CZM wholesale cost"><i class="fa-solid fa-tag"></i> CZM Cost: ₹${Number(item.usdWholesale).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>` : ''}
                    </div>
                </td>
                <td>
                    <code style="background: var(--admin-surface-light); padding: 3px 8px; border-radius: 4px; color: var(--gold-light); font-size: 0.82rem; font-family: monospace;">${item.sku || 'N/A'}</code>
                </td>
                <td>
                    <span style="text-transform: capitalize; color: var(--admin-text-muted); font-size: 0.85rem;">${item.category || 'General'}</span>
                </td>
                <td>
                    <span class="subcat-badge" style="display: inline-block; font-size: 0.78rem; font-weight: 500; color: #fef08a; background: rgba(197, 160, 89, 0.12); border: 1px solid rgba(197, 160, 89, 0.28); border-radius: 4px; padding: 2px 8px; white-space: nowrap;">
                        ${(item.subCategory || '—').replace(/</g, '&lt;')}
                    </span>
                </td>
                <td>
                    <div class="stock-stepper">
                        <button type="button" class="btn-stock-step" onclick="adjustStock('${item.id}', '${item.sku}', -1)" title="Decrement stock by 1" ${qty <= 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                            <i class="fa-solid fa-minus"></i>
                        </button>
                        <span class="stock-num-display" id="stock-val-${item.id}" style="${qty <= 0 ? 'color:#ef9a9a;' : (qty <= thresh ? 'color:#ffb74d;' : '')}">${qty}</span>
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
                <td>
                    ${isDisabled ? `
                        <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.35); font-size: 0.74rem; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="Hidden from customer storefront catalog">
                            <i class="fa-solid fa-eye-slash"></i> Hidden
                        </span>
                    ` : `
                        <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.35); font-size: 0.74rem; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="Visible to customers on storefront catalog">
                            <i class="fa-solid fa-eye"></i> Live
                        </span>
                    `}
                </td>
                <td>
                    <div style="font-size: 0.82rem; color: #e4e4e7; white-space: nowrap; display: flex; align-items: center; gap: 5px;">
                        <i class="fa-regular fa-clock" style="color: var(--gold); font-size: 0.85rem;"></i>
                        <span>${formatRefreshDate(item.lastRefreshed)}</span>
                    </div>
                    ${item.dateAdded ? `<div style="font-size: 0.72rem; color: var(--admin-muted); margin-top: 2px;" title="Date first imported/added">Added: ${formatRefreshDate(item.dateAdded)}</div>` : ''}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
                        ${isDisabled ? `
                            <button type="button" class="btn-admin-outline btn-sm" onclick="toggleSingleInventoryVisibility('${item.id}', false)" title="Enable visibility (Show on website storefront)" style="color: #6ee7b7; border-color: rgba(16,185,129,0.3); padding: 5px 9px;">
                                <i class="fa-solid fa-eye"></i> Show
                            </button>
                        ` : `
                            <button type="button" class="btn-admin-outline btn-sm" onclick="toggleSingleInventoryVisibility('${item.id}', true)" title="Disable visibility (Hide from website storefront)" style="color: #fca5a5; border-color: rgba(239,68,68,0.3); padding: 5px 9px;">
                                <i class="fa-solid fa-eye-slash"></i> Hide
                            </button>
                        `}
                        <button type="button" class="btn-admin-outline btn-sm" onclick="openStockModal('${item.id}')" title="Adjust piece stock quantity and alert threshold" style="padding: 5px 9px;">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button type="button" class="btn-admin-outline btn-sm" onclick="confirmDeleteSingleInventoryProduct('${item.id}', '${safeName}')" title="Permanently delete product from catalog and inventory" style="color: #ef4444; border-color: rgba(239,68,68,0.3); padding: 5px 9px;">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateInventoryBulkBar();
}

// Bulk Selection and Update Logic for Inventory
function handleInventoryRowSelect(id, checked) {
    if (checked) {
        adminSelectedInventoryIds.add(String(id));
    } else {
        adminSelectedInventoryIds.delete(String(id));
    }
    updateInventoryBulkBar();
}

function toggleSelectAllInventory(checked) {
    const checkboxes = document.querySelectorAll('.inv-row-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) {
            adminSelectedInventoryIds.add(String(cb.value));
        } else {
            adminSelectedInventoryIds.delete(String(cb.value));
        }
    });
    updateInventoryBulkBar();
}

function updateInventoryBulkBar() {
    const bar = document.getElementById('adminBulkInventoryBar');
    const countEl = document.getElementById('invBulkSelectedCount');
    const badgeEl = document.getElementById('invBulkDeleteBadge');
    const selectAllCb = document.getElementById('selectAllInventoryCheckbox');
    const count = adminSelectedInventoryIds.size;
    
    if (countEl) countEl.textContent = count.toLocaleString('en-IN');
    if (badgeEl) badgeEl.textContent = count.toLocaleString('en-IN');
    if (bar) bar.style.display = count > 0 ? 'flex' : 'none';

    if (selectAllCb) {
        const checkboxes = document.querySelectorAll('.inv-row-checkbox');
        selectAllCb.checked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    }

    const wrap = document.getElementById('invBulkSelectAllFilteredWrap');
    const totalSpan = document.getElementById('invBulkFilteredTotalSpan');
    if (wrap && totalSpan && inventoryFilteredItems) {
        const totalMatching = inventoryFilteredItems.length;
        if (count > 0 && count < totalMatching) {
            wrap.style.display = 'inline';
            totalSpan.textContent = totalMatching.toLocaleString('en-IN');
        } else {
            wrap.style.display = 'none';
        }
    }
}

function selectAllFilteredInventory() {
    if (!inventoryFilteredItems || inventoryFilteredItems.length === 0) return;
    inventoryFilteredItems.forEach(item => {
        if (item.id) adminSelectedInventoryIds.add(String(item.id));
    });
    const checkboxes = document.querySelectorAll('.inv-row-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    const selectAllCb = document.getElementById('selectAllInventoryCheckbox');
    if (selectAllCb) selectAllCb.checked = true;
    updateInventoryBulkBar();
}

function deselectAllInventory() {
    adminSelectedInventoryIds.clear();
    const checkboxes = document.querySelectorAll('.inv-row-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    const selectAllCb = document.getElementById('selectAllInventoryCheckbox');
    if (selectAllCb) selectAllCb.checked = false;
    updateInventoryBulkBar();
}

// Single Item Visibility Toggle
async function toggleSingleInventoryVisibility(id, disable) {
    const item = (inventoryData || []).find(i => String(i.id) === String(id));
    const name = item ? item.productName : id;
    const actionVerb = disable ? 'disabled (hidden from storefront)' : 'enabled (live on storefront)';

    try {
        const res = await fetch('/api/db/products/bulk-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ids: [String(id)],
                disabled: disable ? 1 : 0,
                active: disable ? 0 : 1,
                employeeName: 'Admin'
            })
        });
        const data = await res.json();
        if (data.success) {
            if (item) {
                item.disabled = disable ? 1 : 0;
                item.active = disable ? 0 : 1;
                if (disable) {
                    item.status = 'Disabled';
                } else {
                    const qty = Number(item.stockQty) || 0;
                    item.status = qty > 0 ? 'In Stock' : 'Out of Stock';
                }
            }
            if (window.storeData && Array.isArray(window.storeData.products)) {
                const sp = window.storeData.products.find(p => String(p.id) === String(id) || String(p.dbId) === String(id));
                if (sp) {
                    sp.disabled = disable;
                    sp.active = !disable;
                    sp.stockStatus = disable ? 'Disabled' : ((sp.stockQty || 0) > 0 ? 'In Stock' : 'Out of Stock');
                }
            }
            showToast(`Product "${name}" is now ${actionVerb}`);
            handleInventoryFilter(false);
        } else {
            showToast('Error updating visibility: ' + (data.error || 'Server error'), 'error');
        }
    } catch (err) {
        showToast('Failed to update visibility: ' + err.message, 'error');
    }
}

// Bulk Inventory Visibility Toggle
async function applyBulkInventoryVisibility(disabled = 1) {
    const ids = Array.from(adminSelectedInventoryIds);
    if (ids.length === 0) {
        showToast('Please select at least one inventory item first');
        return;
    }

    const actionWord = disabled === 1 ? 'disable visibility for (hide on website)' : 'enable visibility for (show on website)';
    const confirmPrompt = `Are you sure you want to ${actionWord} ${ids.length} selected product(s)?\n\n${disabled === 1 ? 'Hidden pieces will not appear in the customer storefront catalog or search.' : 'Enabled pieces will be visible to customers on the storefront.'}`;
    if (!confirm(confirmPrompt)) return;

    const btnDisable = document.getElementById('btnBulkInvDisable');
    const btnEnable = document.getElementById('btnBulkInvEnable');
    if (btnDisable) btnDisable.disabled = true;
    if (btnEnable) btnEnable.disabled = true;

    try {
        const res = await fetch('/api/db/products/bulk-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ids,
                disabled: disabled,
                active: disabled === 1 ? 0 : 1,
                employeeName: 'Admin'
            })
        });
        const data = await res.json();
        if (data.success) {
            const idSet = new Set(ids.map(String));
            (inventoryData || []).forEach(item => {
                if (idSet.has(String(item.id))) {
                    item.disabled = disabled;
                    item.active = (disabled === 0 ? 1 : 0);
                    if (disabled === 1) {
                        item.status = 'Disabled';
                    } else {
                        const qty = Number(item.stockQty) || 0;
                        item.status = qty > 0 ? 'In Stock' : 'Out of Stock';
                    }
                }
            });
            if (window.storeData && Array.isArray(window.storeData.products)) {
                window.storeData.products.forEach(p => {
                    if (idSet.has(String(p.id)) || idSet.has(String(p.dbId))) {
                        p.disabled = (disabled === 1);
                        p.active = (disabled === 0);
                        p.stockStatus = (disabled === 1 ? 'Disabled' : ((p.stockQty || 0) > 0 ? 'In Stock' : 'Out of Stock'));
                    }
                });
            }
            deselectAllInventory();
            showToast(data.message || `Updated visibility for ${ids.length} product(s)`);
            handleInventoryFilter(false);
        } else {
            showToast('Error: ' + (data.error || 'Server error'), 'error');
        }
    } catch (err) {
        showToast('Failed to update inventory visibility: ' + err.message, 'error');
    } finally {
        if (btnDisable) btnDisable.disabled = false;
        if (btnEnable) btnEnable.disabled = false;
    }
}

// Single Item Product Deletion from Inventory
async function confirmDeleteSingleInventoryProduct(id, name) {
    const confirmed = confirm(
        `Are you sure you want to permanently delete "${name}" (ID: ${id})?\n\n` +
        `This will permanently remove the piece from the store catalog and inventory database.\n\n` +
        `🛡️ EXCLUSIVE DATA GUARANTEE:\nAll customer accounts and past order records will remain 100% preserved.`
    );
    if (!confirmed) return;

    try {
        const resp = await fetch('/api/db/products/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: String(id), employeeName: 'Admin' })
        });
        const res = await resp.json();
        if (res.success) {
            showToast(res.message || `Deleted "${name}"`);
            inventoryData = (inventoryData || []).filter(i => String(i.id) !== String(id));
            adminSelectedInventoryIds.delete(String(id));
            if (window.storeData && Array.isArray(window.storeData.products)) {
                window.storeData.products = window.storeData.products.filter(p => String(p.id) !== String(id) && String(p.dbId) !== String(id));
            }
            updateInventoryBulkBar();
            handleInventoryFilter(false);
        } else {
            showToast('Delete error: ' + (res.error || 'Server error'), 'error');
        }
    } catch (err) {
        showToast('Failed to delete product: ' + err.message, 'error');
    }
}

// Batch Product Deletion from Inventory
async function confirmDeleteBatchInventoryProducts() {
    const ids = Array.from(adminSelectedInventoryIds);
    if (ids.length === 0) {
        showToast('Please select at least one product first');
        return;
    }

    const confirmed = confirm(
        `⚠️ PERMANENT DELETION WARNING:\n\n` +
        `Are you sure you want to permanently delete all ${ids.length} selected product(s) from the website catalog and inventory?\n\n` +
        `🛡️ EXCLUSIVE DATA GUARANTEE:\n` +
        `All customer accounts and past order records will remain 100% preserved.`
    );
    if (!confirmed) return;

    const btn = document.getElementById('btnBulkInvDelete');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    }

    try {
        const resp = await fetch('/api/db/products/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: ids, employeeName: 'Admin' })
        });
        const res = await resp.json();
        if (res.success) {
            showToast(res.message || `Deleted ${ids.length} pieces from catalog and inventory.`);
            const idSet = new Set(ids.map(String));
            inventoryData = (inventoryData || []).filter(i => !idSet.has(String(i.id)));
            if (window.storeData && Array.isArray(window.storeData.products)) {
                window.storeData.products = window.storeData.products.filter(p => !idSet.has(String(p.id)) && !idSet.has(String(p.dbId)));
            }
            deselectAllInventory();
            handleInventoryFilter(false);
        } else {
            showToast('Delete error: ' + (res.error || 'Server error'), 'error');
        }
    } catch (err) {
        showToast('Failed to delete selected products: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete Selected (<span id="invBulkDeleteBadge">0</span>)';
        }
    }
}

// Window attachments for inline triggers
window.handleInventoryRowSelect = handleInventoryRowSelect;
window.toggleSelectAllInventory = toggleSelectAllInventory;
window.updateInventoryBulkBar = updateInventoryBulkBar;
window.selectAllFilteredInventory = selectAllFilteredInventory;
window.deselectAllInventory = deselectAllInventory;
window.toggleSingleInventoryVisibility = toggleSingleInventoryVisibility;
window.applyBulkInventoryVisibility = applyBulkInventoryVisibility;
window.confirmDeleteSingleInventoryProduct = confirmDeleteSingleInventoryProduct;
window.confirmDeleteBatchInventoryProducts = confirmDeleteBatchInventoryProducts;

function changeInventoryPage(delta) {
    const totalPages = Math.max(1, Math.ceil(inventoryFilteredItems.length / inventoryPageSize));
    const newPage = currentInventoryPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentInventoryPage = newPage;
        renderInventoryTable();
        // Smooth scroll to top of table
        const tbl = document.getElementById('inventoryTable'); if (tbl && typeof tbl.scrollIntoView === 'function') tbl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

async function adjustStock(id, sku, delta) {
    const item = (inventoryData || []).find(i => String(i.id) === String(id) || (sku && String(i.sku) === String(sku)));
    if (!item) return;

    const oldQty = Number(item.stockQty) || 0;
    const newQty = Math.max(0, oldQty + delta);
    if (newQty === oldQty) return;

    item.stockQty = newQty;
    const thresh = Number(item.lowStockThreshold) || 5;
    if (newQty <= 0) item.status = "Out of Stock";
    else if (newQty <= thresh) item.status = "Low Stock";
    else item.status = "In Stock";

    // Fast local UI update
    renderInventoryMetrics();
    renderInventoryTable();

    try {
        const resp = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: item.id,
                sku: item.sku,
                productName: item.productName,
                stockQty: newQty,
                lowStockThreshold: thresh
            })
        });
        const res = await resp.json();
        if (res.success) {
            if (res.item) {
                item.stockQty = res.item.stockQty;
                item.status = res.item.status;
                if (res.item.lastRefreshed) item.lastRefreshed = res.item.lastRefreshed;
            }
            // Also sync in storeData.products if present
            const prod = (storeData.products || []).find(p => String(p.id) === String(id) || (sku && String(p.sku) === String(sku)));
            if (prod) {
                prod.stockQty = newQty;
                prod.stockStatus = item.status;
                prod.disabled = (newQty <= 0 ? 1 : 0);
                prod.active = (newQty <= 0 ? 0 : 1);
                if (res.item && res.item.lastRefreshed) prod.lastRefreshed = res.item.lastRefreshed;
            }
            renderInventoryMetrics();
            renderInventoryTable();
            updateBadgeCounts();
            showToast(`${item.productName}: Stock adjusted to ${newQty} units`);
        } else {
            throw new Error(res.error || "Update failed");
        }
    } catch (err) {
        item.stockQty = oldQty; // rollback
        if (oldQty <= 0) item.status = "Out of Stock";
        else if (oldQty <= thresh) item.status = "Low Stock";
        else item.status = "In Stock";
        renderInventoryMetrics();
        renderInventoryTable();
        showToast("Error updating stock: " + err.message);
    }
}

function openStockModal(id, sku, encName, qty, threshold) {
    let item = (inventoryData || []).find(i => String(i.id) === String(id));
    if (!item && sku) {
        item = (inventoryData || []).find(i => String(i.sku) === String(sku));
    }

    const prodId = item ? item.id : id;
    const prodSku = item ? (item.sku || '') : (sku || '');
    let prodName = item ? (item.productName || '') : '';
    if (!prodName && encName) {
        try { prodName = decodeURIComponent(encName); } catch (e) { prodName = encName; }
    }
    const stockQty = item ? (Number(item.stockQty) || 0) : (Number(qty) || 0);
    const stockThreshold = item ? (Number(item.lowStockThreshold) || 5) : (Number(threshold) || 5);

    const idEl = document.getElementById('editStockId');
    if (idEl) idEl.value = prodId;
    const skuEl = document.getElementById('editStockSku');
    if (skuEl) skuEl.value = prodSku;
    const nameEl = document.getElementById('editStockProdName');
    if (nameEl) nameEl.value = prodName;
    const skuDisplay = document.getElementById('editStockSkuDisplay');
    if (skuDisplay) skuDisplay.value = prodSku || 'N/A';
    const catEl = document.getElementById('editStockCategory');
    if (catEl) catEl.value = item ? (item.category || '') : '';
    const subCatEl = document.getElementById('editStockSubCategory');
    if (subCatEl) subCatEl.value = item ? (item.subCategory || '—') : '—';
    const qtyEl = document.getElementById('editStockQty');
    if (qtyEl) qtyEl.value = stockQty;
    const threshEl = document.getElementById('editStockThreshold');
    if (threshEl) threshEl.value = stockThreshold;

    updateModalStockPreview();

    const backdrop = document.getElementById('stockModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('active');
    }
}

function closeStockModal() {
    const backdrop = document.getElementById('stockModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('active');
    }
}

function updateModalStockPreview() {
    const qty = parseInt(document.getElementById('editStockQty')?.value, 10) || 0;
    const thresh = parseInt(document.getElementById('editStockThreshold')?.value, 10) || 5;
    const badge = document.getElementById('modalStockStatusBadge');
    if (!badge) return;

    if (qty <= 0) {
        badge.className = 'stock-pill out-of-stock';
        badge.innerHTML = '<i class="fa-solid fa-xmark"></i> Out of Stock';
    } else if (qty <= thresh) {
        badge.className = 'stock-pill low-stock';
        badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Low Stock Alert';
    } else {
        badge.className = 'stock-pill in-stock';
        badge.innerHTML = '<i class="fa-solid fa-check"></i> In Stock';
    }
}

function modalStockQuickAdd(amt) {
    const qtyInp = document.getElementById('editStockQty');
    if (qtyInp) {
        const current = parseInt(qtyInp.value, 10) || 0;
        qtyInp.value = Math.max(0, current + amt);
        updateModalStockPreview();
    }
}

function modalStockQuickSet(val) {
    const qtyInp = document.getElementById('editStockQty');
    if (qtyInp) {
        qtyInp.value = val;
        updateModalStockPreview();
    }
}

async function handleSaveStock(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const id = document.getElementById('editStockId').value;
    const sku = document.getElementById('editStockSku').value;
    const prodName = document.getElementById('editStockProdName').value;
    const stockQty = parseInt(document.getElementById('editStockQty').value, 10);
    const lowStockThreshold = parseInt(document.getElementById('editStockThreshold').value, 10);

    if (isNaN(stockQty) || stockQty < 0) {
        showToast("Please enter a valid stock quantity (≥ 0)");
        return;
    }
    if (isNaN(lowStockThreshold) || lowStockThreshold < 1) {
        showToast("Please enter a valid low stock alert threshold (≥ 1)");
        return;
    }

    try {
        const resp = await fetch('/api/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, sku, productName: prodName, stockQty, lowStockThreshold })
        });
        const res = await resp.json();
        if (res.success) {
            closeStockModal();
            showToast("Inventory stock updated successfully!");

            // Update local object immediately
            const item = (inventoryData || []).find(i => String(i.id) === String(id) || (sku && String(i.sku) === String(sku)));
            if (item) {
                item.stockQty = stockQty;
                item.lowStockThreshold = lowStockThreshold;
                if (res.item && res.item.lastRefreshed) {
                    item.lastRefreshed = res.item.lastRefreshed;
                } else {
                    item.lastRefreshed = new Date().toISOString();
                }
                if (stockQty <= 0) item.status = "Out of Stock";
                else if (stockQty <= lowStockThreshold) item.status = "Low Stock";
                else item.status = "In Stock";
            }
            // Also sync storeData.products
            const prod = (storeData.products || []).find(p => String(p.id) === String(id) || (sku && String(p.sku) === String(sku)));
            if (prod) {
                prod.stockQty = stockQty;
                prod.lowStockThreshold = lowStockThreshold;
                prod.stockStatus = (stockQty <= 0 ? 'Out of Stock' : (stockQty <= lowStockThreshold ? 'Low Stock' : 'In Stock'));
                prod.disabled = (stockQty <= 0 ? 1 : 0);
                prod.active = (stockQty <= 0 ? 0 : 1);
                if (res.item && res.item.lastRefreshed) prod.lastRefreshed = res.item.lastRefreshed;
            }
            renderInventoryMetrics();
            renderInventoryTable();
            updateBadgeCounts();
        } else {
            showToast("Error: " + (res.error || "Could not update stock"));
        }
    } catch (err) {
        showToast("Server error: " + err.message);
    }
}

// ==========================================
// 4. CUSTOMER DIRECTORY & CRM CONTROLLERS
// ==========================================
let customerSearchQuery = '';

async function fetchCustomers(isManual = false) {
    try {
        const resp = await fetch('/api/customers');
        if (resp.ok) {
            customersData = await resp.json();
            renderCustomers();
            updateBadgeCounts();
            if (isManual) {
                showToast(`Customer directory refreshed (${customersData.length} patrons)`);
            }
        } else {
            console.warn("Server returned error for customers:", resp.status);
            if (isManual) showToast("Could not refresh customer directory.");
        }
    } catch (err) {
        console.warn("Could not fetch customers:", err);
        if (isManual) showToast("Network error fetching customers.");
    }
}
window.fetchCustomers = fetchCustomers;

function filterCustomers() {
    const input = document.getElementById('customerSearchInput');
    customerSearchQuery = input ? input.value.trim().toLowerCase() : '';
    renderCustomers();
}
window.filterCustomers = filterCustomers;

function renderCustomers() {
    const tbody = document.getElementById('customersTableBody');
    const headerCount = document.getElementById('customersCountHeader');
    if (!tbody) return;

    if (!Array.isArray(customersData)) {
        customersData = [];
    }

    if (headerCount) {
        headerCount.textContent = customersData.length;
    }

    // Filter by search query if any
    let displayList = customersData;
    if (customerSearchQuery) {
        displayList = customersData.filter(c => {
            const name = (c.name || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            const phone = (c.phone || '').toLowerCase();
            const city = (c.city || '').toLowerCase();
            const address = (c.address || '').toLowerCase();
            return name.includes(customerSearchQuery) ||
                   email.includes(customerSearchQuery) ||
                   phone.includes(customerSearchQuery) ||
                   city.includes(customerSearchQuery) ||
                   address.includes(customerSearchQuery);
        });
    }

    if (displayList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 48px 16px; color: var(--admin-text-muted);">
                    <div style="font-size: 2.2rem; opacity: 0.4; margin-bottom: 10px;">
                        <i class="fa-solid fa-users-slash"></i>
                    </div>
                    <strong style="color: var(--admin-text); font-size: 1rem; display: block; margin-bottom: 4px;">
                        ${customerSearchQuery ? 'No patrons matching search criteria' : 'No patrons in directory yet'}
                    </strong>
                    <span style="font-size: 0.85rem;">
                        ${customerSearchQuery ? 'Try searching by a different name, email, or city.' : 'Click "+ Add Customer" above to create your first client profile.'}
                    </span>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = displayList.map(c => {
        const safeName = (c.name || '').trim();
        let initials = 'C';
        if (safeName) {
            const parts = safeName.split(/\s+/).filter(Boolean);
            initials = parts.slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'C';
        }

        const spent = Number(c.totalSpent) || 0;
        const orders = Number(c.totalOrders) || 0;

        let tierBadge = `<span class="vip-pill"><i class="fa-solid fa-crown"></i> VIP PATRON</span>`;
        if (spent < 5000 && orders <= 1) {
            tierBadge = `<span class="status-badge badge-green">PATRON</span>`;
        } else if (spent < 15000 && orders < 3) {
            tierBadge = `<span class="status-badge badge-gold">LOYAL CLIENT</span>`;
        }

        const safeId = c.id || '';
        const safeEmail = c.email || '';
        const safePhone = c.phone || '';
        const safeCity = c.city || 'India';
        const safeAddress = c.address || '—';

        // Escaped for inline attributes
        const escNameAttr = safeName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escEmailAttr = safeEmail.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escIdAttr = safeId.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        return `
            <tr>
                <td>
                    <div class="customer-name-box">
                        <div class="customer-avatar">${initials}</div>
                        <div>
                            <strong style="color: var(--admin-text);">${safeName || 'Unnamed Patron'}</strong>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-size: 0.88rem;">
                        <a href="mailto:${encodeURI(safeEmail)}" style="color: var(--admin-text); text-decoration: none;">${safeEmail || '—'}</a>
                    </div>
                    <div style="font-size: 0.78rem; color: var(--admin-text-muted);">
                        ${safePhone ? `<a href="tel:${safePhone.replace(/\s+/g, '')}" style="color: var(--admin-text-muted); text-decoration: none;">${safePhone}</a>` : '—'}
                    </div>
                </td>
                <td>
                    <strong style="color: var(--gold-light);">${safeCity}</strong>
                    <div style="font-size: 0.78rem; color: var(--admin-text-muted); max-width: 220px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${safeAddress}">
                        ${safeAddress}
                    </div>
                </td>
                <td>
                    <strong style="font-size: 0.95rem; color: var(--admin-text);">${orders}</strong>
                </td>
                <td>
                    <strong style="color: var(--gold-light); font-size: 0.95rem;">₹${spent.toLocaleString('en-IN')}</strong>
                </td>
                <td>
                    ${tierBadge}
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px; align-items: center; justify-content: flex-end;">
                        <button class="btn-admin-outline btn-sm" onclick="openCustomerModal('${escIdAttr}')" title="Edit patron profile">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-admin-outline btn-sm" onclick="promptDeleteCustomer('${escIdAttr}', '${escNameAttr}', '${escEmailAttr}')" title="Delete patron profile" style="color: #f43f5e; border-color: rgba(244,63,94,0.35);">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}
window.renderCustomers = renderCustomers;

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
            if (idInput) idInput.value = c.id;
            if (nameInput) nameInput.value = c.name || '';
            if (emailInput) emailInput.value = c.email || '';
            if (phoneInput) phoneInput.value = c.phone || '';
            if (addressInput) addressInput.value = c.address || '';
            if (cityInput) cityInput.value = c.city || '';
        }
    } else {
        title.textContent = "Add New Patron Profile";
        if (idInput) idInput.value = '';
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (addressInput) addressInput.value = '';
        if (cityInput) cityInput.value = '';
    }

    const backdrop = document.getElementById('customerModalBackdrop');
    if (backdrop) {
        backdrop.style.display = 'flex';
        backdrop.classList.add('active');
    }
}
window.openCustomerModal = openCustomerModal;

function closeCustomerModal() {
    const backdrop = document.getElementById('customerModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.style.display = 'none';
    }
}
window.closeCustomerModal = closeCustomerModal;

async function handleSaveCustomer(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById('editCustId')?.value || '';
    const name = document.getElementById('custName')?.value.trim() || '';
    const email = document.getElementById('custEmail')?.value.trim() || '';
    const phone = document.getElementById('custPhone')?.value.trim() || '';
    const address = document.getElementById('custAddress')?.value.trim() || '';
    const city = document.getElementById('custCity')?.value.trim() || '';

    if (!name || !email) {
        showToast("Full Name and Email Address are required.");
        return;
    }

    try {
        const resp = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, email, phone, address, city })
        });
        const res = await resp.json();
        if (resp.ok && res.success) {
            closeCustomerModal();
            showToast("Customer profile saved successfully!");
            await fetchCustomers();
        } else {
            showToast("Error: " + (res.error || "Failed to save customer profile"));
        }
    } catch (err) {
        showToast("Server error saving customer: " + err.message);
    }
}
window.handleSaveCustomer = handleSaveCustomer;

// --- DELETE PATRON DIALOG & CONTROLLER ---
function promptDeleteCustomer(id, name, email) {
    const modal = document.getElementById('deleteCustomerModalBackdrop');
    const idInput = document.getElementById('deleteCustIdInput');
    const nameText = document.getElementById('deleteCustNameText');
    const emailText = document.getElementById('deleteCustEmailText');

    if (idInput) idInput.value = id || '';
    if (nameText) nameText.textContent = name || 'this patron';
    if (emailText) emailText.textContent = email || '';

    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}
window.promptDeleteCustomer = promptDeleteCustomer;

function closeDeleteCustomerModal() {
    const modal = document.getElementById('deleteCustomerModalBackdrop');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}
window.closeDeleteCustomerModal = closeDeleteCustomerModal;

async function confirmDeleteCustomer() {
    const idInput = document.getElementById('deleteCustIdInput');
    const id = idInput ? idInput.value.trim() : '';
    const btn = document.getElementById('confirmDeleteCustBtn');

    if (!id) {
        showToast("Error: No customer selected for deletion.");
        closeDeleteCustomerModal();
        return;
    }

    const origBtnHtml = btn ? btn.innerHTML : 'Delete';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    }

    try {
        const resp = await fetch('/api/customers/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const res = await resp.json();

        if (resp.ok && res.success) {
            closeDeleteCustomerModal();
            showToast(`Patron '${res.name || 'Customer'}' permanently removed from CRM.`);
            await fetchCustomers();
        } else {
            showToast("Deletion failed: " + (res.error || "Unknown server error"));
        }
    } catch (err) {
        showToast("Server error deleting customer: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origBtnHtml;
        }
    }
}
window.confirmDeleteCustomer = confirmDeleteCustomer;

function exportCustomersCSV() {
    if (!customersData || customersData.length === 0) {
        showToast("No customer records to export.");
        return;
    }

    const headers = ["ID", "Name", "Email", "Phone", "City", "Shipping Address", "Total Orders", "Lifetime Spend (INR)"];
    const rows = customersData.map(c => [
        `"${(c.id || '').replace(/"/g, '""')}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.city || '').replace(/"/g, '""')}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        Number(c.totalOrders) || 0,
        Number(c.totalSpent) || 0
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soreva_patron_crm_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${customersData.length} patrons to CSV`);
}
window.exportCustomersCSV = exportCustomersCSV;

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

        const phone = (o.customerPhone || '').trim();
        const rawDigits = phone.replace(/\D/g, '');
        const cleanWaDigits = (rawDigits.length === 10 ? '91' + rawDigits : rawDigits);
        const waMsg = encodeURIComponent(`Hello ${o.customerName}, this is Sorèva Atelier Concierge regarding your order ${o.orderNumber} (₹${Number(o.totalAmount || 0).toLocaleString('en-IN')}). We are preparing your luxury jewellery package. Please let us know if you need any assistance!`);
        const waLink = cleanWaDigits ? `https://wa.me/${cleanWaDigits}?text=${waMsg}` : '#';

        const destCity = o.city || 'India';
        const destRegion = [o.state, o.pincode ? ('PIN: ' + o.pincode) : ''].filter(Boolean).join(', ');
        const destFullSnippet = [o.shippingAddress, o.addressLine2].filter(Boolean).join(', ');

        return `
            <tr>
                <td>
                    <strong style="color: var(--gold-light); font-family: var(--font-heading); font-size: 0.95rem; display: block;">${o.orderNumber}</strong>
                    <span style="font-size: 0.74rem; color: var(--admin-muted); display: block; margin-top: 2px;">${o.createdAt || 'Recent'}</span>
                </td>
                <td>
                    <div><strong style="color: var(--admin-text);">${o.customerName}</strong></div>
                    <div style="font-size: 0.78rem; color: var(--admin-text-muted);">${o.customerEmail}</div>
                    ${phone ? `<div style="font-size: 0.76rem; color: #81c784; margin-top: 3px; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-brands fa-whatsapp"></i> ${phone}
                    </div>` : ''}
                </td>
                <td>
                    <div style="font-size: 0.88rem; font-weight: 600; color: #fff;">${destCity}${destRegion ? ` <span style="font-size: 0.78rem; font-weight: 400; color: var(--gold-light); font-family: monospace;">(${destRegion})</span>` : ''}</div>
                    <div style="font-size: 0.76rem; color: var(--admin-text-muted); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;" title="${destFullSnippet || o.shippingAddress}">
                        <i class="fa-solid fa-location-dot" style="font-size: 0.7rem; color: var(--gold);"></i> ${destFullSnippet || o.shippingAddress || 'Address on file'}
                    </div>
                </td>
                <td>
                    <div style="max-width: 240px; font-size: 0.84rem; line-height: 1.4; color: var(--admin-text);">${o.itemsSummary}</div>
                </td>
                <td>
                    <strong style="color: var(--gold); font-size: 0.95rem; display: block;">₹${Number(o.totalAmount || 0).toLocaleString('en-IN')}</strong>
                    <span style="font-size: 0.76rem; color: var(--admin-text-muted); display: block; margin-top: 2px;">${o.paymentMethod || 'Razorpay'}</span>
                </td>
                <td>
                    <span class="order-status-badge ${stLower}">
                        <i class="fa-solid fa-circle-dot"></i> ${status}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                        <button class="btn-admin-primary btn-sm" onclick="openOrderModal('${o.id}')" title="Inspect Order Details">
                            <i class="fa-solid fa-receipt"></i> Inspect
                        </button>
                        ${cleanWaDigits ? `
                        <a href="${waLink}" target="_blank" rel="noopener" class="btn-admin-outline btn-sm" style="color: #25D366; border-color: rgba(37,211,102,0.35); text-decoration: none; padding: 6px 10px; display: inline-flex; align-items: center; gap: 4px;" title="Open WhatsApp Chat with ${o.customerName}">
                            <i class="fa-brands fa-whatsapp"></i> Chat
                        </a>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

let currentModalOrder = null;

function openOrderModal(orderId) {
    const o = ordersData.find(item => item.id === orderId);
    if (!o) return;
    currentModalOrder = o;

    // Order Tracking & Meta
    const elId = document.getElementById('inspectOrderId');
    if (elId) elId.value = o.id;

    const elNum = document.getElementById('inspectOrderNum');
    if (elNum) elNum.textContent = o.orderNumber;

    const elDate = document.getElementById('inspectOrderDate');
    if (elDate) elDate.textContent = o.createdAt ? `Placed: ${o.createdAt}` : 'Recent Placement';
    
    const badge = document.getElementById('inspectOrderStatusBadge');
    if (badge) {
        badge.className = `order-status-badge ${(o.status || 'processing').toLowerCase()}`;
        badge.textContent = o.status || 'Processing';
    }

    // Client Profile
    const elCustName = document.getElementById('inspectCustName');
    if (elCustName) elCustName.textContent = o.customerName || 'Valued Client';

    const elCustEmail = document.getElementById('inspectCustEmail');
    if (elCustEmail) elCustEmail.textContent = o.customerEmail || 'N/A';

    const elCustEmailLink = document.getElementById('inspectCustEmailLink');
    if (elCustEmailLink && o.customerEmail) elCustEmailLink.href = `mailto:${o.customerEmail}`;

    const phone = (o.customerPhone || '').trim();
    const rawDigits = phone.replace(/\D/g, '');
    const cleanWaDigits = (rawDigits.length === 10 ? '91' + rawDigits : rawDigits);

    const elCustPhone = document.getElementById('inspectCustPhone');
    if (elCustPhone) elCustPhone.textContent = phone || 'N/A';

    const waLink = document.getElementById('inspectCustWaLink');
    if (waLink) {
        if (cleanWaDigits) {
            const waMsg = encodeURIComponent(`Hello ${o.customerName}, this is Sorèva Atelier Concierge regarding your order ${o.orderNumber} (₹${Number(o.totalAmount || 0).toLocaleString('en-IN')}). We are preparing your luxury jewellery package. Please let us know if you need any assistance!`);
            waLink.href = `https://wa.me/${cleanWaDigits}?text=${waMsg}`;
            waLink.style.display = 'inline-flex';
        } else {
            waLink.style.display = 'none';
        }
    }

    // Complete Shipping & Delivery Address Dossier
    const elCustAddr = document.getElementById('inspectCustAddr');
    if (elCustAddr) elCustAddr.textContent = o.shippingAddress || 'Address on file';

    const elCustAddr2 = document.getElementById('inspectCustAddr2');
    if (elCustAddr2) elCustAddr2.textContent = o.addressLine2 || '—';

    const cityStatePin = [o.city, o.state, o.pincode ? (`PIN: ${o.pincode}`) : ''].filter(Boolean).join(', ') || 'India';
    const elCustCityStatePin = document.getElementById('inspectCustCityStatePin');
    if (elCustCityStatePin) elCustCityStatePin.textContent = cityStatePin;

    const elCustCountry = document.getElementById('inspectCustCountry');
    if (elCustCountry) elCustCountry.textContent = o.country || 'India';

    // Google Maps Navigation Shortcut
    const mapsBtn = document.getElementById('inspectMapsBtn');
    if (mapsBtn) {
        const fullAddrQuery = [o.shippingAddress, o.addressLine2, o.city, o.state, o.pincode, o.country || 'India'].filter(Boolean).join(', ');
        mapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddrQuery)}`;
    }

    // Atelier Packaging & Order Notes
    const notesWrap = document.getElementById('inspectNotesWrap');
    const notesEl = document.getElementById('inspectCustNotes');
    if (notesWrap && notesEl) {
        if (o.orderNotes && o.orderNotes.trim() && o.orderNotes !== 'None') {
            notesEl.textContent = `"${o.orderNotes.trim()}"`;
            notesWrap.style.display = 'block';
        } else {
            notesWrap.style.display = 'none';
        }
    }

    // Financials & Payment Breakdown
    const elPayMode = document.getElementById('inspectPaymentMode');
    if (elPayMode) elPayMode.textContent = o.paymentMethod || 'Razorpay';

    const elPayId = document.getElementById('inspectPaymentId');
    if (elPayId) elPayId.textContent = o.paymentId || (o.paymentMethod && o.paymentMethod.includes('(') ? o.paymentMethod.split('(')[1].replace(')', '') : 'N/A');

    const subtotal = Number(o.subtotalAmount || o.totalAmount || 0);
    const discount = Number(o.discountAmount || 0);
    const total = Number(o.totalAmount || 0);

    const elSub = document.getElementById('inspectSubtotal');
    if (elSub) elSub.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

        const gstWrap = document.getElementById('inspectGstRowWrap');
    const gstEl = document.getElementById('inspectGstRow');
    const gstAmt = Number(o.gstAmount || 0);
    if (gstWrap && gstEl) {
        if (gstAmt > 0) {
            gstEl.textContent = `+₹${gstAmt.toLocaleString('en-IN')}${o.gstRate ? ` (${o.gstRate}%)` : ''}`;
            gstWrap.style.display = 'flex';
        } else {
            gstWrap.style.display = 'none';
        }
    }

    const discWrap = document.getElementById('inspectDiscountRowWrap');
    const discEl = document.getElementById('inspectDiscountRow');
    if (discWrap && discEl) {
        if (discount > 0) {
            discEl.textContent = `-₹${discount.toLocaleString('en-IN')}${o.couponCode ? ` (Code: ${o.couponCode})` : ''}`;
            discWrap.style.display = 'block';
        } else {
            discWrap.style.display = 'none';
        }
    }

    const elTotal = document.getElementById('inspectTotalAmt');
    if (elTotal) elTotal.textContent = `₹${total.toLocaleString('en-IN')}`;

    // Itemized Manifest Table
    const itemsContainer = document.getElementById('inspectItemsList');
    if (itemsContainer) {
        let itemsArr = [];
        if (o.itemsJson) {
            try {
                itemsArr = (typeof o.itemsJson === 'string') ? JSON.parse(o.itemsJson) : o.itemsJson;
            } catch (e) {
                itemsArr = [];
            }
        }

        if (Array.isArray(itemsArr) && itemsArr.length > 0) {
            itemsContainer.innerHTML = itemsArr.map(it => {
                const qty = it.qty || 1;
                const unitPrice = Number(it.price || 0);
                const lineTotal = unitPrice * qty;
                const name = it.name || it.productName || 'Sorèva Luxury Jewellery Piece';
                const finish = it.finish ? `<span style="background: rgba(197,160,89,0.15); color: var(--gold-light); font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">${it.finish}</span>` : '';

                return `
                    <div style="padding: 10px 0; border-bottom: 1px dashed rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; border-radius: 6px; background: rgba(197,160,89,0.15); display: flex; align-items: center; justify-content: center; color: var(--gold);">
                                <i class="fa-solid fa-gem" style="font-size: 0.85rem;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600; color: #fff;">${name} ${finish}</div>
                                <div style="font-size: 0.78rem; color: var(--admin-muted);">Qty: ${qty} × ₹${unitPrice.toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                        <strong style="color: var(--gold-light); font-size: 0.95rem;">₹${lineTotal.toLocaleString('en-IN')}</strong>
                    </div>
                `;
            }).join('');
        } else {
            // Fallback to text itemsSummary
            itemsContainer.innerHTML = (o.itemsSummary || '').split(', ').map(it => `
                <div style="padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,0.08); display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-gem" style="color: var(--gold); font-size: 0.75rem;"></i>
                    <span style="color: #fff;">${it}</span>
                </div>
            `).join('');
        }
    }

    // Status select
    const sel = document.getElementById('inspectStatusSelect');
    if (sel) sel.value = o.status || 'Processing';

    const backdrop = document.getElementById('orderModalBackdrop');
    if (backdrop) backdrop.style.display = 'flex';
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
    showToast("Connecting to https://czmakers.com to sync catalog & inventory...", "info");
    const syncBtn = document.querySelector('button[onclick="launchSyncAgent()"]');
    const origHtml = syncBtn ? syncBtn.innerHTML : '';
    if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing CZM Catalog...`;
    }

    try {
        const res = await fetch('/api/inventory/refresh', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 40, scanCategories: true })
        });
        const data = await res.json();
        if (data.success) {
            if (Array.isArray(data.inventory)) inventoryData = data.inventory;
            handleInventoryFilter(false);
            updateBadgeCounts();
            showToast(data.message || "✓ Catalog and stock successfully synced from czmakers.com!");
            if (typeof loadStoreData === 'function') loadStoreData();
        } else {
            showToast("Failed to sync catalog: " + (data.error || "Unknown error"));
        }
    } catch (e) {
        showToast("Error syncing catalog: " + e.message);
    } finally {
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = origHtml || `<i class="fa-solid fa-rotate"></i> Sync CZM Catalog`;
        }
    }
}


// ==========================================
// RAZORPAY PAYMENT GATEWAY SETTINGS
// ==========================================
async function loadRazorpaySettings(showFeedback = false) {
    try {
        const resp = await fetch('/api/admin/razorpay/config');
        if (!resp.ok) return;
        const cfg = await resp.json();

        // Dedicated panel elements
        const dedChk = document.getElementById('rzpDedicatedEnabled');
        const dedKeyInp = document.getElementById('rzpDedicatedKeyId');
        const dedSecInp = document.getElementById('rzpDedicatedKeySecret');
        const dedMerchInp = document.getElementById('rzpDedicatedMerchantName');
        const dedColorInp = document.getElementById('rzpDedicatedThemeColor');
        const dedColorHex = document.getElementById('rzpDedicatedThemeColorHex');
        const dedBadge = document.getElementById('rzpDedicatedStatusBadge');
        const dedCardMode = document.getElementById('rzpCardModeLabel');
        const testRadio = document.getElementById('rzpRadioTest');
        const liveRadio = document.getElementById('rzpRadioLive');

        // Settings panel legacy elements
        const chk = document.getElementById('rzpEnabledCheckbox');
        const keyInp = document.getElementById('rzpKeyIdInput');
        const secInp = document.getElementById('rzpKeySecretInput');
        const merchInp = document.getElementById('rzpMerchantNameInput');
        const badge = document.getElementById('rzpStatusBadge');

        const isEnabled = !!cfg.enabled;
        const keyId = cfg.keyId || '';
        const merchantName = cfg.merchantName || 'Sorèva Luxury Jewellery';
        const themeColor = cfg.themeColor || '#38302e';
        const isLive = keyId.startsWith('rzp_live');
        const isTest = keyId.startsWith('rzp_test') && !keyId.startsWith('rzp_test_soreva_demo');

        if (dedChk) dedChk.checked = isEnabled;
        if (chk) chk.checked = isEnabled;

        if (dedKeyInp) dedKeyInp.value = keyId;
        if (keyInp) keyInp.value = keyId;

        if (dedSecInp && cfg.hasSecret && !dedSecInp.value) {
            dedSecInp.placeholder = cfg.keySecretMasked || '•••••••••••••••• (Saved)';
        }
        if (secInp && cfg.hasSecret && !secInp.value) {
            secInp.placeholder = cfg.keySecretMasked || '•••••••••••••••• (Saved)';
        }

        if (dedMerchInp) dedMerchInp.value = merchantName;
        if (merchInp) merchInp.value = merchantName;

        if (dedColorInp) dedColorInp.value = themeColor;
        if (dedColorHex) dedColorHex.value = themeColor;

        if (testRadio && liveRadio) {
            if (isLive) {
                liveRadio.checked = true;
                selectRzpMode('live', false);
            } else {
                testRadio.checked = true;
                selectRzpMode('test', false);
            }
        }

        const updateStatusText = (el) => {
            if (!el) return;
            if (!isEnabled) {
                el.innerHTML = '<i class="fa-solid fa-ban"></i> Gateway Disabled';
                el.style.background = 'rgba(255,255,255,0.1)';
                el.style.color = '#aaa';
            } else if (isLive) {
                el.innerHTML = '<i class="fa-solid fa-circle-check"></i> 🟢 Live Production Active';
                el.style.background = 'rgba(46,125,50,0.25)';
                el.style.color = '#81c784';
            } else if (isTest) {
                el.innerHTML = '<i class="fa-solid fa-flask"></i> 🟡 Test Mode Active';
                el.style.background = 'rgba(255,152,0,0.25)';
                el.style.color = '#ffb74d';
            } else {
                el.innerHTML = '<i class="fa-solid fa-vial"></i> ⚪ Sandbox Demo Mode';
                el.style.background = 'rgba(197,160,89,0.25)';
                el.style.color = '#c5a059';
            }
        };

        updateStatusText(dedBadge);
        updateStatusText(badge);

        if (dedCardMode) {
            dedCardMode.textContent = !isEnabled ? 'Disabled' : (isLive ? 'Live Production' : (isTest ? 'Test Mode' : 'Sandbox Demo'));
            dedCardMode.style.color = !isEnabled ? '#aaa' : (isLive ? '#81c784' : '#ffb74d');
        }

        if (showFeedback) showToast("Razorpay gateway status refreshed!");
    } catch (err) {
        console.warn("Could not load Razorpay settings:", err);
    }
}

async function saveRazorpaySettings(showFeedback = true) {
    const dedChk = document.getElementById('rzpDedicatedEnabled');
    const chk = document.getElementById('rzpEnabledCheckbox');
    const enabled = dedChk ? dedChk.checked : (chk ? chk.checked : true);

    const dedKey = document.getElementById('rzpDedicatedKeyId');
    const keyInp = document.getElementById('rzpKeyIdInput');
    const keyId = (dedKey && dedKey.value.trim() !== '') ? dedKey.value.trim() : (keyInp ? keyInp.value.trim() : '');

    const dedSec = document.getElementById('rzpDedicatedKeySecret');
    const secInp = document.getElementById('rzpKeySecretInput');
    const keySecret = (dedSec && dedSec.value.trim() !== '') ? dedSec.value.trim() : (secInp ? secInp.value.trim() : '');

    const dedMerch = document.getElementById('rzpDedicatedMerchantName');
    const merchInp = document.getElementById('rzpMerchantNameInput');
    const merchantName = (dedMerch && dedMerch.value.trim() !== '') ? dedMerch.value.trim() : (merchInp ? merchInp.value.trim() : 'Sorèva Luxury Jewellery');

    const dedColor = document.getElementById('rzpDedicatedThemeColor');
    const themeColor = dedColor ? dedColor.value : '#38302e';

    const payload = {
        enabled: enabled,
        keyId: keyId,
        merchantName: merchantName,
        themeColor: themeColor
    };
    if (keySecret) {
        payload.keySecret = keySecret;
    }

    try {
        const resp = await fetch('/api/admin/razorpay/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const res = await resp.json();
        if (res.success) {
            showToast("Razorpay configuration saved successfully!");
            if (dedSec) dedSec.value = '';
            if (secInp) secInp.value = '';
            loadRazorpaySettings();
        } else {
            showToast("Error saving settings: " + (res.error || "Unknown error"), true);
        }
    } catch (err) {
        showToast("Network error: " + err.message, true);
    }
}

async function testRazorpayConnection() {
    const btn = document.getElementById('btnTestRzp');
    const resultBox = document.getElementById('rzpTestResultBox');
    const origHtml = btn ? btn.innerHTML : '';

    const dedKey = document.getElementById('rzpDedicatedKeyId');
    const dedSec = document.getElementById('rzpDedicatedKeySecret');
    const keyId = dedKey ? dedKey.value.trim() : '';
    const keySecret = dedSec ? dedSec.value.trim() : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to Razorpay...';
    }
    if (resultBox) {
        resultBox.style.display = 'none';
    }

    try {
        const resp = await fetch('/api/admin/razorpay/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyId, keySecret })
        });
        const res = await resp.json();
        if (resultBox) {
            resultBox.style.display = 'flex';
            if (res.success) {
                resultBox.style.background = 'rgba(46,125,50,0.18)';
                resultBox.style.border = '1px solid #81c784';
                resultBox.style.color = '#81c784';
                resultBox.innerHTML = `<i class="fa-solid fa-circle-check" style="font-size: 1.2rem; flex-shrink: 0;"></i> <div><strong>Connection Successful:</strong> ${res.message}</div>`;
                showToast("Razorpay credentials verified!");
            } else {
                resultBox.style.background = 'rgba(198,40,40,0.18)';
                resultBox.style.border = '1px solid #e57373';
                resultBox.style.color = '#ef9a9a';
                resultBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 1.2rem; flex-shrink: 0;"></i> <div><strong>Connection Failed:</strong> ${res.message}</div>`;
                showToast("Verification failed: Check Key ID & Secret", true);
            }
        }
    } catch (err) {
        if (resultBox) {
            resultBox.style.display = 'flex';
            resultBox.style.background = 'rgba(198,40,40,0.18)';
            resultBox.style.border = '1px solid #e57373';
            resultBox.style.color = '#ef9a9a';
            resultBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <div><strong>Error:</strong> ${err.message}</div>`;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}

function selectRzpMode(mode, notify = true) {
    const lblTest = document.getElementById('lblModeTest');
    const lblLive = document.getElementById('lblModeLive');
    const radioTest = document.getElementById('rzpRadioTest');
    const radioLive = document.getElementById('rzpRadioLive');
    const keyInp = document.getElementById('rzpDedicatedKeyId');

    if (mode === 'live') {
        if (lblLive) {
            lblLive.style.background = 'rgba(46,125,50,0.12)';
            lblLive.style.border = '1px solid #81c784';
        }
        if (lblTest) {
            lblTest.style.background = 'rgba(255,255,255,0.02)';
            lblTest.style.border = '1px solid var(--admin-border)';
        }
        if (radioLive) radioLive.checked = true;
        if (notify && keyInp && keyInp.value.startsWith('rzp_test')) {
            showToast("Switched to Live Mode: Please enter your rzp_live_... Key ID & Secret.");
        }
    } else {
        if (lblTest) {
            lblTest.style.background = 'rgba(255,152,0,0.08)';
            lblTest.style.border = '1px solid #ffb74d';
        }
        if (lblLive) {
            lblLive.style.background = 'rgba(255,255,255,0.02)';
            lblLive.style.border = '1px solid var(--admin-border)';
        }
        if (radioTest) radioTest.checked = true;
    }
}

function toggleSecretVisibility(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === 'password') {
        inp.type = 'text';
        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        inp.type = 'password';
        btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
}

window.loadRazorpaySettings = loadRazorpaySettings;
window.saveRazorpaySettings = saveRazorpaySettings;
window.testRazorpayConnection = testRazorpayConnection;
window.selectRzpMode = selectRzpMode;
window.toggleSecretVisibility = toggleSecretVisibility;


// ==========================================
// NOTIFICATIONS & MESSAGING CONCIERGE CONTROLLERS
// (Email alerts to support@soreva.in & WhatsApp to customers)
// ==========================================

let activeNotificationsConfig = null;

async function loadNotificationSettings(isRefresh = false) {
    try {
        const resp = await fetch('/api/admin/notifications/config');
        if (!resp.ok) throw new Error('Failed to fetch notifications settings');
        const data = await resp.json();
        activeNotificationsConfig = data;

        const email = data.email || {};
        const wa = data.whatsapp || {};

        // Email Form Fields
        const chkEmail = document.getElementById('notifEmailEnabled');
        if (chkEmail) chkEmail.checked = email.enabled !== false;

        const elSupportEmail = document.getElementById('notifSupportEmail');
        if (elSupportEmail) elSupportEmail.value = email.supportEmail || 'support@soreva.in';

        const elFromEmail = document.getElementById('notifFromEmail');
        if (elFromEmail) elFromEmail.value = email.fromEmail || 'orders@soreva.in';

        const elSmtpHost = document.getElementById('notifSmtpHost');
        if (elSmtpHost) elSmtpHost.value = email.smtpHost || 'smtp.gmail.com';

        const elSmtpPort = document.getElementById('notifSmtpPort');
        if (elSmtpPort) elSmtpPort.value = email.smtpPort || 587;

        const elSmtpUser = document.getElementById('notifSmtpUser');
        if (elSmtpUser) elSmtpUser.value = email.smtpUser || '';

        const elSmtpPass = document.getElementById('notifSmtpPassword');
        if (elSmtpPass) {
            elSmtpPass.value = '';
            elSmtpPass.placeholder = email.hasPassword ? '•••••••••••• (Password configured — leave blank to keep)' : 'Enter SMTP password or Gmail App Password';
        }

        const elEmailSubj = document.getElementById('notifEmailSubject');
        if (elEmailSubj) elEmailSubj.value = email.subjectTemplate || '💎 New Order Received: {order_number} — ₹{total_amount} ({customer_name})';

        const elEmailBody = document.getElementById('notifEmailBody');
        if (elEmailBody) elEmailBody.value = email.bodyTemplate || '';

        // WhatsApp Form Fields
        const chkWa = document.getElementById('notifWaEnabled');
        if (chkWa) chkWa.checked = wa.enabled !== false;

        const elWaProv = document.getElementById('notifWaProvider');
        if (elWaProv) elWaProv.value = wa.provider || 'meta';

        const elWaCountry = document.getElementById('notifWaCountry');
        if (elWaCountry) elWaCountry.value = wa.defaultCountryCode || '91';

        const elWaPhoneId = document.getElementById('notifWaPhoneId');
        if (elWaPhoneId) elWaPhoneId.value = wa.metaPhoneNumberId || '';

        const elWaToken = document.getElementById('notifWaToken');
        if (elWaToken) {
            elWaToken.value = '';
            elWaToken.placeholder = wa.hasToken ? '•••••••••••• (Token configured — leave blank to keep)' : 'Paste Meta System User Access Token (EAAB...)';
        }

        const elWaWebhook = document.getElementById('notifWaWebhook');
        if (elWaWebhook) elWaWebhook.value = wa.customWebhookUrl || '';

        const elWaTmpl = document.getElementById('notifWaTemplate');
        if (elWaTmpl) elWaTmpl.value = wa.messageTemplate || '';

        toggleWaProviderFields();

        if (isRefresh && typeof showToast === 'function') {
            showToast('Notification settings & templates reloaded from server.');
        }
    } catch (err) {
        console.error('Error loading notification settings:', err);
        if (typeof showToast === 'function') {
            showToast('Failed to load notification settings', 'error');
        }
    }
}

function toggleWaProviderFields() {
    const provSelect = document.getElementById('notifWaProvider');
    if (!provSelect) return;
    const prov = provSelect.value;

    const metaBox = document.getElementById('metaProviderFields');
    const webhookBox = document.getElementById('webhookProviderFields');

    if (metaBox) metaBox.style.display = (prov === 'meta') ? 'block' : 'none';
    if (webhookBox) webhookBox.style.display = (prov === 'webhook') ? 'block' : 'none';
}

function copyVariableTag(tag) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tag).then(() => {
            if (typeof showToast === 'function') showToast(`Copied ${tag} to clipboard!`);
        }).catch(() => {
            prompt('Copy variable placeholder:', tag);
        });
    } else {
        prompt('Copy variable placeholder:', tag);
    }
}

function togglePasswordVisibility(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    if (inp.type === 'password') {
        inp.type = 'text';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        inp.type = 'password';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
}

async function saveNotificationSettings() {
    const chkEmail = document.getElementById('notifEmailEnabled');
    const elSupportEmail = document.getElementById('notifSupportEmail');
    const elFromEmail = document.getElementById('notifFromEmail');
    const elSmtpHost = document.getElementById('notifSmtpHost');
    const elSmtpPort = document.getElementById('notifSmtpPort');
    const elSmtpUser = document.getElementById('notifSmtpUser');
    const elSmtpPass = document.getElementById('notifSmtpPassword');
    const elEmailSubj = document.getElementById('notifEmailSubject');
    const elEmailBody = document.getElementById('notifEmailBody');

    const chkWa = document.getElementById('notifWaEnabled');
    const elWaProv = document.getElementById('notifWaProvider');
    const elWaCountry = document.getElementById('notifWaCountry');
    const elWaPhoneId = document.getElementById('notifWaPhoneId');
    const elWaToken = document.getElementById('notifWaToken');
    const elWaWebhook = document.getElementById('notifWaWebhook');
    const elWaTmpl = document.getElementById('notifWaTemplate');

    const payload = {
        email: {
            enabled: chkEmail ? chkEmail.checked : true,
            supportEmail: elSupportEmail ? elSupportEmail.value.trim() : 'support@soreva.in',
            fromEmail: elFromEmail ? elFromEmail.value.trim() : 'orders@soreva.in',
            smtpHost: elSmtpHost ? elSmtpHost.value.trim() : 'smtp.gmail.com',
            smtpPort: elSmtpPort ? parseInt(elSmtpPort.value) || 587 : 587,
            smtpUser: elSmtpUser ? elSmtpUser.value.trim() : '',
            subjectTemplate: elEmailSubj ? elEmailSubj.value.trim() : '',
            bodyTemplate: elEmailBody ? elEmailBody.value : ''
        },
        whatsapp: {
            enabled: chkWa ? chkWa.checked : true,
            provider: elWaProv ? elWaProv.value : 'meta',
            defaultCountryCode: elWaCountry ? elWaCountry.value.trim() : '91',
            metaPhoneNumberId: elWaPhoneId ? elWaPhoneId.value.trim() : '',
            customWebhookUrl: elWaWebhook ? elWaWebhook.value.trim() : '',
            messageTemplate: elWaTmpl ? elWaTmpl.value : ''
        }
    };

    if (elSmtpPass && elSmtpPass.value.trim()) {
        payload.email.smtpPassword = elSmtpPass.value.trim();
    }
    if (elWaToken && elWaToken.value.trim()) {
        payload.whatsapp.metaApiToken = elWaToken.value.trim();
    }

    try {
        const resp = await fetch('/api/admin/notifications/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const res = await resp.json();
        if (res.success) {
            const fb = document.getElementById('notifSaveFeedback');
            if (fb) {
                fb.style.display = 'inline';
                fb.style.color = '#81c784';
                fb.textContent = '✓ Saved successfully!';
                setTimeout(() => { fb.style.display = 'none'; }, 4000);
            }
            if (typeof showToast === 'function') {
                showToast('Notification settings & message templates saved!');
            }
            loadNotificationSettings(false);
        } else {
            throw new Error(res.message || 'Failed to save');
        }
    } catch (err) {
        console.error('Save notification error:', err);
        if (typeof showToast === 'function') {
            showToast('Failed to save settings: ' + err.message, 'error');
        }
    }
}

async function sendTestSupportEmail() {
    const btn = document.getElementById('btnTestEmail');
    const statusBox = document.getElementById('testEmailStatus');
    const targetInput = document.getElementById('testEmailTarget');
    const targetEmail = targetInput ? targetInput.value.trim() : 'support@soreva.in';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    }
    if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(59, 130, 246, 0.15)';
        statusBox.style.color = '#93c5fd';
        statusBox.style.border = '1px solid rgba(59, 130, 246, 0.3)';
        statusBox.textContent = `Connecting to SMTP host and dispatching test ticket to ${targetEmail}...`;
    }

    try {
        const resp = await fetch('/api/admin/notifications/test-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail })
        });
        const res = await resp.json();
        if (statusBox) {
            if (res.success) {
                statusBox.style.background = 'rgba(37, 211, 102, 0.15)';
                statusBox.style.color = '#81c784';
                statusBox.style.border = '1px solid rgba(37, 211, 102, 0.3)';
                statusBox.innerHTML = `<strong>✓ Email Dispatched:</strong> ${res.message}`;
            } else {
                statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
                statusBox.style.color = '#fca5a5';
                statusBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                statusBox.innerHTML = `<strong>✗ Dispatch Notice:</strong> ${res.message}`;
            }
        }
        if (typeof showToast === 'function') {
            showToast(res.message);
        }
    } catch (err) {
        if (statusBox) {
            statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
            statusBox.style.color = '#fca5a5';
            statusBox.textContent = 'Network error sending test email: ' + err.message;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Test';
        }
    }
}

async function sendTestCustomerWhatsApp() {
    const btn = document.getElementById('btnTestWa');
    const statusBox = document.getElementById('testWaStatus');
    const targetInput = document.getElementById('testWaTargetPhone');
    const phone = targetInput ? targetInput.value.trim() : '9741118940';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching...';
    }
    if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.style.background = 'rgba(37, 211, 102, 0.12)';
        statusBox.style.color = '#81c784';
        statusBox.style.border = '1px solid rgba(37, 211, 102, 0.3)';
        statusBox.textContent = `Connecting to WhatsApp gateway for +91 ${phone}...`;
    }

    try {
        const resp = await fetch('/api/admin/notifications/test-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        });
        const res = await resp.json();
        if (statusBox) {
            if (res.success) {
                statusBox.style.background = 'rgba(37, 211, 102, 0.15)';
                statusBox.style.color = '#81c784';
                statusBox.style.border = '1px solid rgba(37, 211, 102, 0.3)';
                statusBox.innerHTML = `<strong>✓ WhatsApp Ready:</strong> ${res.message}`;
            } else {
                statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
                statusBox.style.color = '#fca5a5';
                statusBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                statusBox.innerHTML = `<strong>✗ Gateway Notice:</strong> ${res.message}`;
            }
        }
        if (typeof showToast === 'function') {
            showToast(res.message);
        }
    } catch (err) {
        if (statusBox) {
            statusBox.style.background = 'rgba(239, 68, 68, 0.15)';
            statusBox.style.color = '#fca5a5';
            statusBox.textContent = 'Error sending test WhatsApp: ' + err.message;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Send Test';
        }
    }
}

window.loadNotificationSettings = loadNotificationSettings;
window.saveNotificationSettings = saveNotificationSettings;
window.sendTestSupportEmail = sendTestSupportEmail;
window.sendTestCustomerWhatsApp = sendTestCustomerWhatsApp;
window.toggleWaProviderFields = toggleWaProviderFields;
window.copyVariableTag = copyVariableTag;
window.togglePasswordVisibility = togglePasswordVisibility;

// ==========================================================================
// FESTIVE OFFER POP-UP & DISCOUNT EMAIL ADMIN ENGINE
// ==========================================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}

let activePopupConfig = null;

async function loadPopupOfferSettings(isRefresh = false) {
    try {
        const resp = await fetch('/api/admin/popup/config');
        if (!resp.ok) throw new Error('Failed to fetch pop-up settings');
        const data = await resp.json();
        const cfg = data.config || {};
        activePopupConfig = cfg;

        const chkEnabled = document.getElementById('popupConfigEnabled');
        if (chkEnabled) chkEnabled.checked = cfg.enabled !== false;

        const inpDelay = document.getElementById('popupConfigDelay');
        if (inpDelay) inpDelay.value = cfg.delaySeconds !== undefined ? cfg.delaySeconds : 2;

        const inpOffer = document.getElementById('popupConfigOfferCode');
        if (inpOffer) inpOffer.value = cfg.offerCode || 'DIWALI20';

        const inpH1 = document.getElementById('popupConfigHeadline1');
        if (inpH1) inpH1.value = cfg.headline1 || 'Big Diwali Sale 🪔';

        const inpH2 = document.getElementById('popupConfigHeadline2');
        if (inpH2) inpH2.value = cfg.headline2 || 'Flat 20% Off Everything!';

        const inpDesc = document.getElementById('popupConfigDesc');
        if (inpDesc) inpDesc.value = cfg.description || 'Sign up & be the first to shop 500+ new festive-ready styles with ready to ship.';

        const inpDisc = document.getElementById('popupConfigDiscountText');
        if (inpDisc) inpDisc.value = cfg.discountText || 'Flat 20% Off Everything!';

        const inpImg = document.getElementById('popupConfigImageUrl');
        if (inpImg) inpImg.value = cfg.imageUrl || 'assets/festive-offer-banner.webp';

        const inpSubj = document.getElementById('popupEmailSubject');
        if (inpSubj) inpSubj.value = cfg.emailSubject || '✨ Your Exclusive 20% OFF Diwali Discount Code — Sorèva';

        const inpHd = document.getElementById('popupEmailHeading');
        if (inpHd) inpHd.value = cfg.emailHeading || 'Your Exclusive Festive Offer Has Arrived! 🪔';

        const inpBody = document.getElementById('popupEmailBody');
        if (inpBody) inpBody.value = cfg.emailBody || 'Thank you for joining the Sorèva family! To celebrate this grand festive season, here is your exclusive VIP discount voucher for Flat 20% Off across our entire collection of handcrafted luxury jewellery.';

        const badge = document.getElementById('popupSubscribersBadge');
        if (badge) badge.textContent = `${data.subscribersCount || 0} Leads`;

        const subList = document.getElementById('popupSubscribersList');
        if (subList) {
            const subs = data.recentSubscribers || [];
            if (subs.length === 0) {
                subList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted);">No subscribers yet. Leads will appear here automatically.</div>';
            } else {
                subList.innerHTML = subs.slice().reverse().map(s => `
                    <div style="padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; color: #fff;">${escapeHtml(s.email)}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${s.dateFormatted || s.timestamp || ''}</div>
                        </div>
                        <span style="font-size: 0.72rem; background: rgba(197,160,89,0.2); color: var(--gold-light); padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                            ${escapeHtml(s.offerCode || 'DIWALI20')}
                        </span>
                    </div>
                `).join('');
            }
        }

        updatePopupPreview();

        if (isRefresh && typeof showToast === 'function') {
            showToast('Pop-up offer settings refreshed!');
        }
    } catch (err) {
        console.error('[loadPopupOfferSettings Error]', err);
        if (typeof showToast === 'function') showToast('Failed to load pop-up settings: ' + err.message);
    }
}

function updatePopupPreview() {
    const h1 = document.getElementById('popupConfigHeadline1')?.value || 'Big Diwali Sale 🪔';
    const h2 = document.getElementById('popupConfigHeadline2')?.value || 'Flat 20% Off Everything!';
    const desc = document.getElementById('popupConfigDesc')?.value || 'Sign up & be the first to shop 500+ new festive-ready styles with ready to ship.';
    const imgUrl = document.getElementById('popupConfigImageUrl')?.value || 'assets/festive-offer-banner.webp';
    const enabled = document.getElementById('popupConfigEnabled')?.checked;

    const prevCard = document.getElementById('adminPopupPreviewCard');
    if (prevCard) {
        prevCard.style.opacity = enabled ? '1' : '0.4';
    }

    const prevH1 = document.getElementById('previewHeadline1');
    if (prevH1) prevH1.textContent = h1;

    const prevH2 = document.getElementById('previewHeadline2');
    if (prevH2) {
        if (h2.includes('<strong>') || h2.includes('<b>')) {
            prevH2.innerHTML = h2;
        } else {
            prevH2.innerHTML = h2.replace(/(20% Off Everything!|[0-9]+% Off[^<]*)/gi, '<strong style="font-weight: 800;">$1</strong>');
        }
    }

    const prevImg = document.getElementById('previewImage');
    if (prevImg) prevImg.src = imgUrl;

    const prevDesc = document.getElementById('previewDesc');
    if (prevDesc) prevDesc.textContent = desc;
}

async function savePopupOfferSettings() {
    const enabled = document.getElementById('popupConfigEnabled')?.checked ?? true;
    const delaySeconds = parseFloat(document.getElementById('popupConfigDelay')?.value || '2');
    const offerCode = (document.getElementById('popupConfigOfferCode')?.value || 'DIWALI20').trim().toUpperCase();
    const headline1 = (document.getElementById('popupConfigHeadline1')?.value || '').trim();
    const headline2 = (document.getElementById('popupConfigHeadline2')?.value || '').trim();
    const description = (document.getElementById('popupConfigDesc')?.value || '').trim();
    const discountText = (document.getElementById('popupConfigDiscountText')?.value || '').trim();
    const imageUrl = (document.getElementById('popupConfigImageUrl')?.value || '').trim();
    const emailSubject = (document.getElementById('popupEmailSubject')?.value || '').trim();
    const emailHeading = (document.getElementById('popupEmailHeading')?.value || '').trim();
    const emailBody = (document.getElementById('popupEmailBody')?.value || '').trim();

    const payload = {
        enabled,
        delaySeconds,
        offerCode,
        headline1,
        headline2,
        description,
        discountText,
        imageUrl,
        emailSubject,
        emailHeading,
        emailBody
    };

    try {
        const resp = await fetch('/api/admin/popup/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
            activePopupConfig = data.config;
            if (typeof showToast === 'function') {
                showToast('✨ Pop-Up Offer & Email settings saved successfully!');
            }
        } else {
            throw new Error(data.error || 'Save failed');
        }
    } catch (err) {
        console.error('[savePopupOfferSettings Error]', err);
        if (typeof showToast === 'function') {
            showToast('Error saving pop-up settings: ' + err.message);
        }
    }
}

async function handlePopupImageFile(fileInput) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const statusEl = document.getElementById('popupImageUploadStatus');
    if (statusEl) {
        statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading banner image...';
        statusEl.style.color = 'var(--gold-light)';
    }

    try {
        const formData = new FormData();
        formData.append('image', file);

        const resp = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();

        if (resp.ok && data.url) {
            const inp = document.getElementById('popupConfigImageUrl');
            if (inp) inp.value = data.url;
            updatePopupPreview();
            if (statusEl) {
                statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Image uploaded & applied!';
                statusEl.style.color = '#34d399';
            }
        } else {
            throw new Error(data.error || 'Upload returned no URL');
        }
    } catch (err) {
        console.error('[Upload Error]', err);
        if (statusEl) {
            statusEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Upload failed: ' + err.message;
            statusEl.style.color = '#f87171';
        }
    }
}

async function sendPopupTestEmail() {
    const recipient = document.getElementById('popupTestEmailRecipient')?.value?.trim() || 'support@soreva.in';
    const emailSubject = document.getElementById('popupEmailSubject')?.value?.trim();
    const emailBody = document.getElementById('popupEmailBody')?.value?.trim();
    const btn = document.getElementById('btnSendPopupTestEmail');
    const statusBox = document.getElementById('popupTestEmailStatus');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    }
    if (statusBox) {
        statusBox.innerHTML = 'Sending coupon email from support@soreva.in...';
        statusBox.style.color = 'var(--text-muted)';
    }

    try {
        const resp = await fetch('/api/admin/popup/test-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recipient, emailSubject, emailBody })
        });
        const data = await resp.json();

        if (resp.ok && data.success) {
            if (statusBox) {
                statusBox.innerHTML = `<span style="color: #34d399;"><i class="fa-solid fa-check"></i> ${data.message}</span>`;
            }
            if (typeof showToast === 'function') showToast(data.message);
        } else {
            if (statusBox) {
                statusBox.innerHTML = `<span style="color: #f87171;"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error || 'Failed to dispatch email'}</span>`;
            }
        }
    } catch (err) {
        if (statusBox) {
            statusBox.innerHTML = `<span style="color: #f87171;">Error: ${err.message}</span>`;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-vial"></i> Send Test';
        }
    }
}

window.loadPopupOfferSettings = loadPopupOfferSettings;
window.updatePopupPreview = updatePopupPreview;
window.savePopupOfferSettings = savePopupOfferSettings;
window.handlePopupImageFile = handlePopupImageFile;
window.sendPopupTestEmail = sendPopupTestEmail;

/* ==========================================================================
   SORÈVA CIRCLE NEWSLETTER & WELCOME OFFER CONTROLLER
   ========================================================================== */

let activeNewsletterConfig = null;
let currentNewsletterSubscribers = [];

async function loadNewsletterSettings(isRefresh = false) {
    try {
        const resp = await fetch('/api/admin/newsletter/config');
        if (!resp.ok) throw new Error('Failed to fetch newsletter settings');
        const data = await resp.json();
        const cfg = data.config || {};
        activeNewsletterConfig = cfg;
        currentNewsletterSubscribers = data.recentSubscribers || [];

        const chkEnabled = document.getElementById('newsletterConfigEnabled');
        if (chkEnabled) chkEnabled.checked = cfg.enabled !== false;

        const inpTitle = document.getElementById('newsletterConfigTitle');
        if (inpTitle) inpTitle.value = cfg.title || 'Join The Sorèva Circle';

        const inpDesc = document.getElementById('newsletterConfigDesc');
        if (inpDesc) inpDesc.value = cfg.description || 'Subscribe for private seasonal sales, new collection drops, and receive 15% OFF on your first order.';

        const inpCoupon = document.getElementById('newsletterConfigCouponCode');
        if (inpCoupon) inpCoupon.value = cfg.couponCode || 'WELCOME15';

        const inpPct = document.getElementById('newsletterConfigDiscountPercent');
        if (inpPct) inpPct.value = cfg.discountPercent !== undefined ? cfg.discountPercent : 15;

        const inpDiscText = document.getElementById('newsletterConfigDiscountText');
        if (inpDiscText) inpDiscText.value = cfg.discountText || 'Flat 15% Off Your First Order';

        const chkAutoApply = document.getElementById('newsletterConfigAutoApply');
        if (chkAutoApply) chkAutoApply.checked = cfg.autoApply !== false;

        const inpSubj = document.getElementById('newsletterEmailSubject');
        if (inpSubj) inpSubj.value = cfg.emailSubject || '✨ Welcome to The Sorèva Circle — Your 15% OFF Voucher (WELCOME15)';

        const inpHd = document.getElementById('newsletterEmailHeading');
        if (inpHd) inpHd.value = cfg.emailHeading || 'Welcome to The Sorèva Circle';

        const inpBody = document.getElementById('newsletterEmailBody');
        if (inpBody) inpBody.value = cfg.emailBody || 'Thank you for joining our private inner circle. As a valued member, enjoy an exclusive 15% discount on your first acquisition of handcrafted demi-fine luxury jewellery.';

        const badge = document.getElementById('newsletterSubscribersBadge');
        if (badge) badge.textContent = `${data.subscribersCount || 0} Subscribers`;

        const subList = document.getElementById('newsletterSubscribersList');
        if (subList) {
            const subs = data.recentSubscribers || [];
            if (subs.length === 0) {
                subList.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-muted);">No subscribers yet. Leads from \'Join The Sorèva Circle\' will appear here.</div>';
            } else {
                subList.innerHTML = subs.slice().reverse().map(s => `
                    <div style="padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; color: #fff;">${escapeHtml(s.email)}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${s.dateFormatted || s.timestamp || ''} • Source: Footer</div>
                        </div>
                        <span style="font-size: 0.72rem; background: rgba(197,160,89,0.2); color: var(--gold-light); padding: 3px 8px; border-radius: 4px; font-weight: 700;">
                            ${escapeHtml(s.offerCode || 'WELCOME15')}
                        </span>
                    </div>
                `).join('');
            }
        }

        updateNewsletterPreview();

        if (isRefresh && typeof showToast === 'function') {
            showToast('Sorèva Circle settings refreshed!');
        }
    } catch (err) {
        console.error('[loadNewsletterSettings Error]', err);
        if (typeof showToast === 'function') showToast('Failed to load newsletter settings: ' + err.message);
    }
}

function updateNewsletterPreview() {
    const title = document.getElementById('newsletterConfigTitle')?.value || 'Join The Sorèva Circle';
    const desc = document.getElementById('newsletterConfigDesc')?.value || 'Subscribe for private seasonal sales, new collection drops, and receive 15% OFF on your first order.';
    const enabled = document.getElementById('newsletterConfigEnabled')?.checked;

    const prevCard = document.getElementById('adminNewsletterPreviewCard');
    if (prevCard) {
        prevCard.style.opacity = enabled ? '1' : '0.4';
    }

    const prevTitle = document.getElementById('previewNewsletterTitle');
    if (prevTitle) prevTitle.textContent = title;

    const prevDesc = document.getElementById('previewNewsletterDesc');
    if (prevDesc) {
        if (desc.includes('<strong>') || desc.includes('<b>')) {
            prevDesc.innerHTML = desc;
        } else {
            prevDesc.innerHTML = desc.replace(/([0-9]+%\s*OFF)/gi, '<strong style="color: #fff; font-weight: 700;">$1</strong>');
        }
    }
}

async function saveNewsletterSettings() {
    const enabled = document.getElementById('newsletterConfigEnabled')?.checked ?? true;
    const title = (document.getElementById('newsletterConfigTitle')?.value || '').trim();
    const description = (document.getElementById('newsletterConfigDesc')?.value || '').trim();
    const couponCode = (document.getElementById('newsletterConfigCouponCode')?.value || 'WELCOME15').trim().toUpperCase();
    const discountPercent = parseInt(document.getElementById('newsletterConfigDiscountPercent')?.value || '15', 10);
    const discountText = (document.getElementById('newsletterConfigDiscountText')?.value || 'Flat 15% Off Your First Order').trim();
    const autoApply = document.getElementById('newsletterConfigAutoApply')?.checked ?? true;
    const emailSubject = (document.getElementById('newsletterEmailSubject')?.value || '').trim();
    const emailHeading = (document.getElementById('newsletterEmailHeading')?.value || '').trim();
    const emailBody = (document.getElementById('newsletterEmailBody')?.value || '').trim();

    const payload = {
        enabled,
        title,
        description,
        couponCode,
        discountPercent,
        discountText,
        autoApply,
        emailSubject,
        emailHeading,
        emailBody
    };

    try {
        const resp = await fetch('/api/admin/newsletter/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
            activeNewsletterConfig = data.config;
            if (typeof showToast === 'function') {
                showToast('✨ Sorèva Circle Newsletter settings saved successfully!');
            }
        } else {
            throw new Error(data.error || 'Save failed');
        }
    } catch (err) {
        console.error('[saveNewsletterSettings Error]', err);
        if (typeof showToast === 'function') {
            showToast('Error saving newsletter settings: ' + err.message);
        }
    }
}

async function sendNewsletterTestEmail() {
    const recipient = document.getElementById('newsletterTestEmailRecipient')?.value?.trim() || 'support@soreva.in';
    const emailSubject = document.getElementById('newsletterEmailSubject')?.value?.trim();
    const emailBody = document.getElementById('newsletterEmailBody')?.value?.trim();
    const btn = document.getElementById('btnSendNewsletterTestEmail');
    const statusBox = document.getElementById('newsletterTestEmailStatus');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    }
    if (statusBox) {
        statusBox.innerHTML = 'Sending welcome email from support@soreva.in...';
        statusBox.style.color = 'var(--text-muted)';
    }

    try {
        const resp = await fetch('/api/admin/newsletter/test-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recipient, emailSubject, emailBody })
        });
        const data = await resp.json();

        if (resp.ok && data.success) {
            if (statusBox) {
                statusBox.innerHTML = `<span style="color: #34d399;"><i class="fa-solid fa-check"></i> ${data.message}</span>`;
            }
            if (typeof showToast === 'function') showToast(data.message);
        } else {
            if (statusBox) {
                statusBox.innerHTML = `<span style="color: #f87171;"><i class="fa-solid fa-triangle-exclamation"></i> ${data.error || 'Failed to dispatch email'}</span>`;
            }
        }
    } catch (err) {
        if (statusBox) {
            statusBox.innerHTML = `<span style="color: #f87171;">Error: ${err.message}</span>`;
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Test';
        }
    }
}

function exportNewsletterSubscribers() {
    if (!currentNewsletterSubscribers || currentNewsletterSubscribers.length === 0) {
        if (typeof showToast === 'function') showToast('No subscribers available to export.');
        return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Email,Coupon Code,Source,Date Subscribed,Email Delivered\r\n';
    currentNewsletterSubscribers.forEach(sub => {
        const row = [
            `"${sub.email || ''}"`,
            `"${sub.offerCode || 'WELCOME15'}"`,
            `"${sub.source || 'footer_newsletter'}"`,
            `"${sub.dateFormatted || sub.timestamp || ''}"`,
            `"${sub.emailDelivered ? 'Yes' : 'No'}"`
        ].join(',');
        csvContent += row + '\r\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `soreva_circle_subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.loadNewsletterSettings = loadNewsletterSettings;
window.updateNewsletterPreview = updateNewsletterPreview;
window.saveNewsletterSettings = saveNewsletterSettings;
window.sendNewsletterTestEmail = sendNewsletterTestEmail;
window.exportNewsletterSubscribers = exportNewsletterSubscribers;


async function resendAlertForModalOrder(channel) {
    if (!currentModalOrder) return;
    if (channel === 'email') {
        const targetEmail = activeNotificationsConfig?.email?.supportEmail || 'support@soreva.in';
        try {
            const resp = await fetch('/api/admin/notifications/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: targetEmail })
            });
            const res = await resp.json();
            if (typeof showToast === 'function') showToast(res.message || 'Alert dispatched to support');
        } catch (err) {
            if (typeof showToast === 'function') showToast('Failed to dispatch alert: ' + err.message, 'error');
        }
    } else if (channel === 'whatsapp') {
        const phone = (currentModalOrder.customerPhone || '').trim();
        try {
            const resp = await fetch('/api/admin/notifications/test-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone || '9741118940' })
            });
            const res = await resp.json();
            if (typeof showToast === 'function') showToast(res.message || 'WhatsApp confirmation dispatched');
        } catch (err) {
            if (typeof showToast === 'function') showToast('Failed to dispatch WhatsApp: ' + err.message, 'error');
        }
    }
}
window.resendAlertForModalOrder = resendAlertForModalOrder;

// ==========================================
// BULK DELETE OUT OF STOCK PRODUCTS CONTROLLER
// (Strictly preserves all Sorèva customer records & orders)
// ==========================================
async function confirmDeleteOutOfStockProducts() {
    const oosList = (storeData?.products || []).filter(p => 
        p.disabled == 1 || p.active === false || p.active === 0 || p.stockStatus === 'Out of Stock' || (p.stockQty !== undefined && p.stockQty <= 0)
    );
    const count = oosList.length;

    if (count === 0) {
        showToast('No out-of-stock products found to delete.');
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to permanently delete all ${count} out-of-stock products from the catalog?\n\n` +
        `🛡️ EXCLUSIVE DATA GUARANTEE:\n` +
        `All customer accounts, contact details, and past order sales histories are 100% exclusive to Sorèva and will remain completely preserved.`
    );

    if (!confirmed) return;

    const btn = document.getElementById('btnDeleteOutOfStock');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    }

    try {
        const resp = await fetch('/api/admin/products/delete-out-of-stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const res = await resp.json();

        if (res.success) {
            showToast(res.message || `Deleted ${res.deletedCount} out-of-stock pieces.`);
            await loadStoreData();
            fetchInventory();
            fetchDatabaseInfo();
        } else {
            showToast('Delete error: ' + (res.error || 'Server error'), 'error');
        }
    } catch (err) {
        showToast('Failed to delete out of stock products: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Delete Out of Stock (<span id="oosProductBadge">0</span>)';
        }
        updateBadgeCounts();
    }
}

window.confirmDeleteOutOfStockProducts = confirmDeleteOutOfStockProducts;


async function diagnoseMetaWhatsApp() {
    const btn = document.getElementById('btnDiagnoseWa');
    const resultBox = document.getElementById('waDiagnosticResult');
    const tokenInp = document.getElementById('notifWaToken');
    const phoneInp = document.getElementById('notifWaPhoneId');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Diagnosing Meta Credentials...';
    }
    if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.style.background = 'rgba(0, 0, 0, 0.4)';
        resultBox.style.border = '1px solid var(--admin-border)';
        resultBox.style.color = '#fff';
        resultBox.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="color: var(--gold);"></i> Connecting to Meta Graph API to inspect token scopes and Phone ID...';
    }

    try {
        const payload = {};
        if (tokenInp && tokenInp.value.trim()) payload.metaApiToken = tokenInp.value.trim();
        if (phoneInp && phoneInp.value.trim()) payload.metaPhoneNumberId = phoneInp.value.trim();

        const resp = await fetch('/api/admin/notifications/diagnose-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const res = await resp.json();

        if (!res.success) {
            resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
            resultBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            resultBox.style.color = '#fca5a5';
            resultBox.innerHTML = `<strong>Diagnosis Error:</strong> ${res.error || 'Failed to inspect credentials'}`;
            return;
        }

        const d = res.diagnostic;
        let html = '';

        // Token status
        if (d.tokenValid) {
            html += `<div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: 600; color: #4ade80;"><i class="fa-solid fa-check-circle"></i> Meta Token is Valid (${d.tokenDetails.appName || 'Meta App'})</span>
                <span style="font-size: 0.75rem; background: rgba(255,255,255,0.1); padding: 2px 8px; border-radius: 4px;">User: ${d.tokenDetails.userType || 'SYSTEM_USER'}</span>
            </div>`;
        } else {
            html += `<div style="font-weight: 600; color: #f87171; margin-bottom: 8px;"><i class="fa-solid fa-circle-xmark"></i> Meta Token is Invalid or Expired</div>`;
        }

        // WhatsApp permission badge
        if (d.hasMessagingPermission) {
            html += `<div style="color: #4ade80; font-size: 0.8rem; margin-bottom: 6px;"><i class="fa-solid fa-shield-halved"></i> <code>whatsapp_business_messaging</code> permission: <strong>GRANTED</strong></div>`;
        } else {
            html += `<div style="color: #f87171; font-size: 0.82rem; margin-bottom: 6px; background: rgba(239,68,68,0.15); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(239,68,68,0.3);">
                <i class="fa-solid fa-triangle-exclamation"></i> <strong>MISSING PERMISSION:</strong> <code>whatsapp_business_messaging</code> is NOT granted to this token. Meta will reject all dispatch requests until this permission is added.
            </div>`;
        }

        // Issues list
        if (d.issues && d.issues.length > 0) {
            html += `<div style="margin: 10px 0; padding: 10px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">
                <div style="font-weight: 600; color: #fca5a5; margin-bottom: 4px;"><i class="fa-solid fa-bug"></i> Identified Root Causes:</div>
                <ul style="margin: 0; padding-left: 18px; color: #fca5a5;">
                    ${d.issues.map(iss => `<li>${iss}</li>`).join('')}
                </ul>
            </div>`;
        }

        // Actionable Remedy Steps
        if (d.remedySteps && d.remedySteps.length > 0) {
            html += `<div style="margin-top: 10px; padding: 10px; background: rgba(200, 162, 77, 0.1); border-left: 3px solid var(--gold); border-radius: 4px;">
                <div style="font-weight: 600; color: var(--gold); margin-bottom: 6px;"><i class="fa-solid fa-wrench"></i> How to Fix in Meta Business Manager:</div>
                <ol style="margin: 0; padding-left: 18px; color: #ddd; font-size: 0.8rem;">
                    ${d.remedySteps.map(step => `<li>${step.replace(/^\d+\.\s*/, '')}</li>`).join('')}
                </ol>
            </div>`;
        }

        resultBox.style.background = d.hasMessagingPermission ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.08)';
        resultBox.style.border = d.hasMessagingPermission ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)';
        resultBox.innerHTML = html;

    } catch (err) {
        resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
        resultBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        resultBox.style.color = '#fca5a5';
        resultBox.innerHTML = `<strong>Network Error:</strong> ${err.message}`;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-stethoscope"></i> Diagnose Meta Token & Phone ID';
        }
    }
}
window.diagnoseMetaWhatsApp = diagnoseMetaWhatsApp;


// ==========================================


// ==========================================
// STOREFRONT IMAGE & MEDIA EDITING HELPERS
// (Directly embedded in respective sections)
// ==========================================

// Upload file directly from computer via FileReader + /api/admin/upload-image
async function uploadImageFile(file, section = 'general') {
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
                    showToast("Image uploaded and applied!");
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

// Helper to preview category modal showcase image
function previewCategoryModalImg(url) {
    const imgEl = document.getElementById('catModalPreview');
    const placeholder = document.getElementById('catModalPlaceholder');
    const metaContainer = document.getElementById('meta_catModalPreview');
    const cleanUrl = (url || '').trim();

    if (!cleanUrl) {
        if (imgEl) { imgEl.src = ''; imgEl.style.display = 'none'; }
        if (placeholder) placeholder.style.display = 'flex';
        if (metaContainer) metaContainer.innerHTML = '';
        return;
    }

    if (imgEl) {
        imgEl.style.display = 'block';
        imgEl.src = cleanUrl;
        imgEl.onerror = () => {
            imgEl.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = 'flex';
                placeholder.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #ff6b6b;"></i><span style="color: #ff6b6b; font-size: 0.8rem;">Image not found / Invalid URL</span>`;
            }
            if (metaContainer) metaContainer.innerHTML = '<span class="img-meta-tag tag-poor"><i class="fa-solid fa-circle-exclamation"></i> Error</span>';
        };
        imgEl.onload = () => {
            imgEl.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            if (metaContainer) {
                metaContainer.innerHTML = `<span class="img-meta-tag tag-good"><i class="fa-solid fa-check"></i> OK</span> <span class="img-meta-tag">${imgEl.naturalWidth}×${imgEl.naturalHeight}px</span>`;
            }
        };
    }
}

// Upload direct helper for generic input fields (Categories, Hero, Spotlight, Logos, Banners)
async function uploadDirectToInput(fileInput, targetInputId, previewImgId) {
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    try {
        let section = 'boutique';
        if (targetInputId === 'catModalImage') section = 'category';
        else if (targetInputId === 'heroImageInput') section = 'hero';
        else if (targetInputId.includes('spotlight')) section = 'spotlight';
        else if (targetInputId.includes('logo') || targetInputId.includes('Logo')) section = 'branding';
        else if (targetInputId.includes('Banner') || targetInputId.includes('banner')) section = 'banners';

        const url = await uploadImageFile(file, section);
        const input = document.getElementById(targetInputId);
        if (input) {
            input.value = url;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (previewImgId === 'catModalPreview') {
            previewCategoryModalImg(url);
        } else if (previewImgId) {
            previewImg(url, previewImgId);
        }
        showToast("Image uploaded and applied!");
    } catch (e) {
        console.error("uploadDirectToInput error:", e);
        showToast("Upload failed: " + (e.message || "Unknown error"));
    } finally {
        fileInput.value = ''; // Always clear file input so user can pick the same file again if desired
    }
}

// CATEGORY MODAL LOGIC (Clean modal editor with real-time preview & direct upload)
function openCategoryEditModal(idx = null) {
    const isEdit = (idx !== null && idx !== undefined && idx !== '' && idx >= 0 && storeData.categories && storeData.categories[idx]);
    const titleEl = document.getElementById('categoryModalTitle');
    const deleteBtn = document.getElementById('btnDeleteCategoryModal');

    if (isEdit) {
        const cat = storeData.categories[idx];
        if (titleEl) titleEl.textContent = `Edit Category: ${cat.name}`;
        if (deleteBtn) deleteBtn.style.display = 'inline-flex';
        document.getElementById('editCategoryIdx').value = idx;
        document.getElementById('editCategoryId').value = cat.id || '';
        document.getElementById('catModalName').value = cat.name || '';
        document.getElementById('catModalCountLabel').value = cat.countLabel || '';
        document.getElementById('catModalImage').value = cat.image || '';
        previewCategoryModalImg(cat.image);
    } else {
        if (titleEl) titleEl.textContent = "Add New Category";
        if (deleteBtn) deleteBtn.style.display = 'none';
        document.getElementById('editCategoryIdx').value = '-1';
        document.getElementById('editCategoryId').value = '';
        document.getElementById('catModalName').value = '';
        document.getElementById('catModalCountLabel').value = '';
        document.getElementById('catModalImage').value = '';
        previewCategoryModalImg('');
    }

    const backdrop = document.getElementById('categoryEditModalBackdrop');
    if (backdrop) {
        backdrop.classList.add('active');
    }
}

function openCategoryModal() {
    openCategoryEditModal(null);
}

function closeCategoryEditModal() {
    const backdrop = document.getElementById('categoryEditModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('active');
    }
    const fileInput = document.getElementById('catModalFileInput');
    if (fileInput) fileInput.value = '';
}

async function handleSaveCategoryForm(e) {
    e.preventDefault();
    const idxVal = document.getElementById('editCategoryIdx').value;
    const catIdVal = document.getElementById('editCategoryId').value;
    const name = document.getElementById('catModalName').value.trim();
    const countLabel = document.getElementById('catModalCountLabel').value.trim();
    const image = document.getElementById('catModalImage').value.trim();

    if (!name) {
        showToast("Category name is required");
        return;
    }

    const isNew = (idxVal === '' || idxVal === '-1' || isNaN(parseInt(idxVal, 10)));
    let catObj;

    if (!storeData.categories) storeData.categories = [];

    if (isNew) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const maxId = storeData.categories.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0);
        catObj = {
            id: maxId + 1,
            name,
            countLabel: countLabel || "Signature Collection",
            slug,
            image: image || "assets/categories/wristwear.jpg"
        };
        storeData.categories.push(catObj);
    } else {
        const idx = parseInt(idxVal, 10);
        catObj = storeData.categories[idx];
        if (!catObj) return;
        catObj.name = name;
        catObj.countLabel = countLabel;
        if (image) catObj.image = image;
    }

    closeCategoryEditModal();
    renderCategoriesGrid();

    // 1. Direct server save for instant persistence
    try {
        const resp = await fetch('/api/admin/category/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(catObj)
        });
        const res = await resp.json();
        if (res.success) {
            showToast(`Category "${catObj.name}" saved successfully to store!`);
        } else {
            showToast("Warning: " + (res.error || "Server save failed"));
        }
    } catch (err) {
        console.warn("Direct category save error:", err);
    }

    // 2. Safely sync storeData
    saveAllStoreData(true);
}

async function deleteCategoryItem(idx) {
    if (!storeData.categories || !storeData.categories[idx]) return;
    const cat = storeData.categories[idx];
    if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) return;

    storeData.categories.splice(idx, 1);
    renderCategoriesGrid();

    try {
        await fetch('/api/admin/category/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: cat.id, slug: cat.slug })
        });
        showToast(`Category "${cat.name}" deleted.`);
    } catch (e) {
        console.warn("Error deleting category:", e);
    }
    saveAllStoreData(true);
}

function handleDeleteCategoryFromModal() {
    const idxVal = document.getElementById('editCategoryIdx').value;
    if (idxVal !== '' && idxVal !== '-1' && !isNaN(parseInt(idxVal, 10))) {
        closeCategoryEditModal();
        deleteCategoryItem(parseInt(idxVal, 10));
    }
}

// Image Inspector Modal helpers
function openImageInspector(url, targetId = '') {
    const backdrop = document.getElementById('imageInspectorModalBackdrop');
    if (!backdrop) return;
    const imgEl = document.getElementById('inspectorImageEl');
    const slotEl = document.getElementById('inspectorSlotName');
    const cleanUrl = (url || '').trim();

    if (imgEl) imgEl.src = cleanUrl;
    if (slotEl) slotEl.textContent = targetId || 'Image Asset';
    backdrop.classList.add('active');
}

function closeImageInspector() {
    const backdrop = document.getElementById('imageInspectorModalBackdrop');
    if (backdrop) backdrop.classList.remove('active');
}

// LOAD & SAVE STOREFRONT PAGE BANNERS IN SETTINGS
function loadPageBannersSettings() {
    if (!storeData.sectionImages) {
        storeData.sectionImages = {
            packagingBanner: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80',
            catalogHeroBanner: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1600&q=80',
            aboutUsHero: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=80',
            contactUsHero: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?auto=format&fit=crop&w=1200&q=80'
        };
    }

    const si = storeData.sectionImages;
    const pkgInp = document.getElementById('settingPackagingBanner');
    const catInp = document.getElementById('settingCatalogBanner');
    const abtInp = document.getElementById('settingAboutUsBanner');
    const cntInp = document.getElementById('settingContactUsBanner');

    if (pkgInp) { pkgInp.value = si.packagingBanner || ''; previewImg(pkgInp.value, 'packagingBannerPreview'); }
    if (catInp) { catInp.value = si.catalogHeroBanner || ''; previewImg(catInp.value, 'catalogBannerPreview'); }
    if (abtInp) { abtInp.value = si.aboutUsHero || ''; previewImg(abtInp.value, 'aboutUsBannerPreview'); }
    if (cntInp) { cntInp.value = si.contactUsHero || ''; previewImg(cntInp.value, 'contactUsBannerPreview'); }
}

function savePageBannersSettings() {
    if (!storeData.sectionImages) storeData.sectionImages = {};

    const pkgVal = document.getElementById('settingPackagingBanner')?.value.trim();
    const catVal = document.getElementById('settingCatalogBanner')?.value.trim();
    const abtVal = document.getElementById('settingAboutUsBanner')?.value.trim();
    const cntVal = document.getElementById('settingContactUsBanner')?.value.trim();

    if (pkgVal) storeData.sectionImages.packagingBanner = pkgVal;
    if (catVal) storeData.sectionImages.catalogHeroBanner = catVal;
    if (abtVal) storeData.sectionImages.aboutUsHero = abtVal;
    if (cntVal) storeData.sectionImages.contactUsHero = cntVal;

    saveAllStoreData(false);
    showToast("Storefront page banners saved successfully!");
}

// Window global exports
window.uploadImageFile = uploadImageFile;
window.uploadDirectToInput = uploadDirectToInput;
window.openCategoryEditModal = openCategoryEditModal;
window.openCategoryModal = openCategoryModal;
window.closeCategoryEditModal = closeCategoryEditModal;
window.handleSaveCategoryForm = handleSaveCategoryForm;
window.deleteCategoryItem = deleteCategoryItem;
window.handleDeleteCategoryFromModal = handleDeleteCategoryFromModal;
window.previewCategoryModalImg = previewCategoryModalImg;
window.openImageInspector = openImageInspector;
window.closeImageInspector = closeImageInspector;
window.loadPageBannersSettings = loadPageBannersSettings;
window.savePageBannersSettings = savePageBannersSettings;

window.handleInventoryFilter = handleInventoryFilter;
window.filterInventoryByStatus = filterInventoryByStatus;
window.onProductCategoryChange = onProductCategoryChange;
window.onInventoryCategoryChange = onInventoryCategoryChange;
window.updateProductSubCategoryOptions = updateProductSubCategoryOptions;
window.updateInventorySubCategoryOptions = updateInventorySubCategoryOptions;
window.changeInventoryPage = changeInventoryPage;
window.adjustStock = adjustStock;
window.openStockModal = openStockModal;
window.closeStockModal = closeStockModal;
window.updateModalStockPreview = updateModalStockPreview;
window.modalStockQuickAdd = modalStockQuickAdd;
window.modalStockQuickSet = modalStockQuickSet;
window.handleSaveStock = handleSaveStock;
window.fetchInventory = fetchInventory;

// ==========================================
// CZMakers Live Stock / Inventory Sync
// ==========================================
async function syncInventoryFromCZM() {
    const btn = document.getElementById('btnRefreshStock');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing from CZMakers...`;
    }
    showToast("Connecting to https://czmakers.com to sync live inventory...", "info");

    try {
        const resp = await fetch('/api/inventory/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 30, scanCategories: true })
        });
        const data = await resp.json();
        if (data.success) {
            if (Array.isArray(data.inventory)) {
                inventoryData = data.inventory;
            } else {
                await fetchInventory();
            }
            if (typeof updateInventorySubCategoryOptions === 'function') {
                updateInventorySubCategoryOptions();
            }
            handleInventoryFilter(false);
            updateBadgeCounts();

            // Reload store-data to sync product catalog & sub-categories
            if (typeof loadStoreData === 'function') {
                await loadStoreData();
            }
            if (typeof updateProductSubCategoryOptions === 'function') {
                updateProductSubCategoryOptions();
            }
            if (typeof renderProductsTable === 'function') {
                renderProductsTable();
            }
            
            const sum = data.summary || {};
            const details = `Checked ${sum.totalChecked || 0} pieces: ${sum.inStock || 0} In Stock, ${sum.outOfStock || 0} Out of Stock${sum.newDiscovered ? `, ${sum.newDiscovered} new arrivals` : ''}.`;
            showToast(`✓ Stock Synced from CZMakers! ${details}`);
        } else {
            showToast("Failed to sync inventory: " + (data.error || "Unknown error"));
        }
    } catch (err) {
        console.error("Inventory sync error:", err);
        showToast("Error syncing inventory from CZMakers: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml || `<i class="fa-solid fa-rotate"></i> Refresh Stock`;
        }
    }
}
window.syncInventoryFromCZM = syncInventoryFromCZM;

// ==========================================
// CZMakers Authentication Modal
// ==========================================
function openCzmLoginModal() {
    document.getElementById('czmLoginModalBackdrop').classList.add('active');
}
window.openCzmLoginModal = openCzmLoginModal;

function closeCzmLoginModal() {
    document.getElementById('czmLoginModalBackdrop').classList.remove('active');
    document.getElementById('czmLoginForm').reset();
}
window.closeCzmLoginModal = closeCzmLoginModal;

async function handleCzmLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitCzmLogin');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
    }
    
    const email = document.getElementById('czmEmail').value;
    const password = document.getElementById('czmPassword').value;
    
    try {
        const res = await fetch('/api/admin/czm-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if(data.success) {
            showToast("✓ " + data.message);
            closeCzmLoginModal();
        } else {
            showToast("Login Failed: " + (data.error || "Unknown error"));
            alert("Login Failed: " + (data.error || "Unknown error"));
        }
    } catch(err) {
        console.error(err);
        showToast("Error during login attempt");
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = 'Login';
        }
    }
}
window.handleCzmLogin = handleCzmLogin;

// ==========================================
// CZMakers Stock & Pricing Co-Worker Agent
// ==========================================
let coworkerPollInterval = null;

function openCzmCoworkerModal() {
    const modal = document.getElementById('czmCoworkerModalBackdrop');
    if (modal) modal.classList.add('active');
    const toastContainer = document.getElementById('adminToastContainer');
    if (toastContainer) toastContainer.innerHTML = '';
    fetchCoworkerStatus();
    if (!coworkerPollInterval) {
        coworkerPollInterval = setInterval(fetchCoworkerStatus, 2000);
    }
}
window.openCzmCoworkerModal = openCzmCoworkerModal;

function closeCzmCoworkerModal() {
    const modal = document.getElementById('czmCoworkerModalBackdrop');
    if (modal) modal.classList.remove('active');
    fetch('/api/admin/czm-agent/status')
        .then(r => r.json())
        .then(data => {
            if (data.status !== 'running' && coworkerPollInterval) {
                clearInterval(coworkerPollInterval);
                coworkerPollInterval = null;
            }
        })
        .catch(() => {});
}
window.closeCzmCoworkerModal = closeCzmCoworkerModal;

function handleCoworkerModeChange() {
    const selectedMode = document.querySelector('input[name="coworkerSyncMode"]:checked')?.value || 'full_discovery';
    const lblRefresh = document.getElementById('lblModeRefresh');
    const lblDiscovery = document.getElementById('lblModeDiscovery');
    const lblComplete = document.getElementById('lblModeCompleteRefresh');
    const btnStart = document.getElementById('btnStartCoworker');
    
    [lblRefresh, lblDiscovery, lblComplete].forEach(l => {
        if (l) {
            l.style.borderColor = 'rgba(255,255,255,0.1)';
            l.style.background = 'rgba(255,255,255,0.02)';
        }
    });

    if (selectedMode === 'complete_refresh') {
        if (lblComplete) {
            lblComplete.style.borderColor = 'rgba(239,68,68,0.55)';
            lblComplete.style.background = 'rgba(239,68,68,0.1)';
        }
        if (btnStart) {
            btnStart.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Start Complete Refresh';
            btnStart.style.background = 'linear-gradient(135deg, #dc2626, #991b1b)';
            btnStart.style.borderColor = '#ef4444';
        }
    } else if (selectedMode === 'refresh_stock') {
        if (lblRefresh) {
            lblRefresh.style.borderColor = 'rgba(197,160,89,0.35)';
            lblRefresh.style.background = 'rgba(197,160,89,0.06)';
        }
        if (btnStart) {
            btnStart.innerHTML = '<i class="fa-solid fa-play"></i> Start Co-Worker';
            btnStart.style.background = '';
            btnStart.style.borderColor = '';
        }
    } else {
        if (lblDiscovery) {
            lblDiscovery.style.borderColor = 'rgba(197,160,89,0.35)';
            lblDiscovery.style.background = 'rgba(197,160,89,0.06)';
        }
        if (btnStart) {
            btnStart.innerHTML = '<i class="fa-solid fa-play"></i> Start Co-Worker';
            btnStart.style.background = '';
            btnStart.style.borderColor = '';
        }
    }
}
window.handleCoworkerModeChange = handleCoworkerModeChange;

function confirmCompleteStockRefresh() {
    const confirmed = confirm(
        "⚠️ COMPLETE STOCK REFRESH CONFIRMATION\n\n" +
        "This action will:\n" +
        "1. DELETE ALL current products from the catalog and inventory database.\n" +
        "2. Perform a complete, fresh loading of all products directly from CZMakers.\n" +
        "3. Accurately place every piece under its appropriate Category, Sub-Category, and price mappings.\n\n" +
        "🛡️ EXCLUSIVE DATA GUARANTEE:\n" +
        "All customer accounts and past order records will remain 100% preserved.\n\n" +
        "Do you want to proceed with the Complete Stock Refresh?"
    );
    if (!confirmed) return;

    openCzmCoworkerModal();
    const radComplete = document.querySelector('input[name="coworkerSyncMode"][value="complete_refresh"]');
    if (radComplete) {
        radComplete.checked = true;
        handleCoworkerModeChange();
    }
    startCzmCoworkerAgent(true);
}
window.confirmCompleteStockRefresh = confirmCompleteStockRefresh;

async function startCzmCoworkerAgent(skipConfirm = false) {
    const mode = document.querySelector('input[name="coworkerSyncMode"]:checked')?.value || 'full_discovery';
    const maxPages = parseInt(document.getElementById('coworkerMaxPages')?.value || '0', 10);
    const removeMissing = false; // Always preserve existing stock; unmatched pieces marked Out of Stock

    if (mode === 'complete_refresh' && !skipConfirm) {
        const confirmed = confirm(
            "⚠️ COMPLETE STOCK REFRESH CONFIRMATION\n\n" +
            "This will delete ALL existing products in the store and perform a fresh, full loading from CZMakers.\n" +
            "All customer accounts and past order records are 100% safe.\n\n" +
            "Do you want to continue?"
        );
        if (!confirmed) return;
    }

    const btnStart = document.getElementById('btnStartCoworker');
    const btnStop = document.getElementById('btnStopCoworker');

    if (btnStart) {
        btnStart.disabled = true;
        btnStart.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Launching...';
    }

    try {
        const markUnmatchedOos = document.getElementById('coworkerMarkOos') ? document.getElementById('coworkerMarkOos').checked : true;
        const res = await fetch('/api/admin/czm-agent/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode,
                maxPages,
                removeMissing,
                verifyUnseen: (mode === 'full_discovery'),
                wipeProducts: (mode === 'complete_refresh'),
                markUnmatchedOos: markUnmatchedOos
            })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message || "🤖 CZMakers Stock & Pricing Co-Worker started!", "info");
            if (btnStart) btnStart.style.display = 'none';
            if (btnStop) btnStop.style.display = 'inline-flex';

            if (!coworkerPollInterval) {
                coworkerPollInterval = setInterval(fetchCoworkerStatus, 1500);
            }
            setTimeout(fetchCoworkerStatus, 300);
        } else {
            showToast("Error starting agent: " + (data.error || "Unknown error"));
            if (btnStart) {
                btnStart.disabled = false;
                btnStart.innerHTML = (mode === 'complete_refresh') 
                    ? '<i class="fa-solid fa-arrows-rotate"></i> Start Complete Refresh'
                    : '<i class="fa-solid fa-play"></i> Start Co-Worker';
            }
        }
    } catch (err) {
        showToast("Failed to connect to server: " + err.message);
        if (btnStart) {
            btnStart.disabled = false;
            btnStart.innerHTML = (mode === 'complete_refresh') 
                ? '<i class="fa-solid fa-arrows-rotate"></i> Start Complete Refresh'
                : '<i class="fa-solid fa-play"></i> Start Co-Worker';
        }
    }
}
window.startCzmCoworkerAgent = startCzmCoworkerAgent;

async function stopCzmCoworkerAgent() {
    const btnStop = document.getElementById('btnStopCoworker');
    if (btnStop) {
        btnStop.disabled = true;
        btnStop.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Stopping...';
    }

    try {
        const res = await fetch('/api/admin/czm-agent/stop', { method: 'POST' });
        const data = await res.json();
        showToast(data.message || "Stop signal sent to co-worker agent.");
    } catch (err) {
        showToast("Error stopping agent: " + err.message);
    } finally {
        if (btnStop) {
            btnStop.disabled = false;
            btnStop.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Agent';
        }
    }
}
window.stopCzmCoworkerAgent = stopCzmCoworkerAgent;

async function fetchCoworkerStatus() {
    try {
        const res = await fetch('/api/admin/czm-agent/status');
        const data = await res.json();

        const badge = document.getElementById('coworkerStatusBadge');
        const stepText = document.getElementById('coworkerCurrentStepText');
        const pctText = document.getElementById('coworkerProgressPercent');
        const pBar = document.getElementById('coworkerProgressBar');
        const durationText = document.getElementById('coworkerDurationText');
        const terminal = document.getElementById('coworkerTerminalLogs');
        const lastSync = document.getElementById('coworkerLastSyncTime');
        const authEmailEl = document.getElementById('coworkerAuthEmail');

        if (authEmailEl) {
            authEmailEl.textContent = data.authenticatedUser || (data.stats && data.stats.authenticatedUser) || 'sonal.belchada@gmail.com';
        }

        const mScanned = document.getElementById('metricScanned');
        const mUpdated = document.getElementById('metricUpdated');
        const mAdded = document.getElementById('metricAdded');
        const mOOS = document.getElementById('metricOutOfStock');

        const btnStart = document.getElementById('btnStartCoworker');
        const btnStop = document.getElementById('btnStopCoworker');

        const stats = data.stats || {};
        if (mScanned) mScanned.textContent = stats.scanned || 0;
        if (mUpdated) mUpdated.textContent = stats.updated || 0;
        if (mAdded) mAdded.textContent = stats.added || 0;
        if (mOOS) mOOS.textContent = stats.outOfStock || 0;


        if (durationText && data.durationSeconds !== undefined) {
            durationText.textContent = `Duration: ${data.durationSeconds}s`;
        }

        if (data.updatedAt && lastSync) {
            try {
                lastSync.textContent = new Date(data.updatedAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                });
            } catch (e) {
                lastSync.textContent = data.updatedAt;
            }
        }

        // Terminal logs
        if (terminal && Array.isArray(data.recentLogs) && data.recentLogs.length) {
            terminal.innerHTML = data.recentLogs.map(line => {
                let color = '#d4d4d8';
                if (line.includes('✓') || line.includes('🎉')) color = '#86efac';
                else if (line.includes('⚠') || line.includes('🔴')) color = '#fca5a5';
                else if (line.includes('📂') || line.includes('🤖')) color = '#fef08a';
                const safeLine = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<div style="margin-bottom: 2px; color: ${color};">${safeLine}</div>`;
            }).join('');
            terminal.scrollTop = terminal.scrollHeight;
        }

        if (stepText) stepText.textContent = data.step || 'Idle';

        // Status & buttons
        if (data.status === 'running') {
            window._coworkerJustCompleted = false;
            if (badge) {
                badge.style.background = 'rgba(234,179,8,0.15)';
                badge.style.color = '#facc15';
                badge.style.borderColor = 'rgba(234,179,8,0.3)';
                badge.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right: 4px;"></i> Syncing (${data.currentCategory || 'Starting'})...`;
            }
            if (btnStart) btnStart.style.display = 'none';
            if (btnStop) {
                btnStop.style.display = 'inline-flex';
                btnStop.disabled = false;
                btnStop.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Agent';
            }

            // Calculate progress estimate
            let progress = 10;
            if (data.currentCategory && data.totalCategories) {
                const catIdx = ['necklaces', 'choker-necklaces', 'traditional-necklaces', 'earrings', 'jhumka-earrings', 'finger-rings', 'pendants', 'wristwear', 'silver-jewellery', 'accessories'].findIndex(k => k.toLowerCase() === (data.currentCategory || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                const curIdx = catIdx >= 0 ? catIdx : Math.min(8, Math.floor(stats.scanned / 80));
                progress = Math.min(95, Math.max(10, Math.round(((curIdx + 1) / 10) * 90)));
            }
            if (pBar) pBar.style.width = `${progress}%`;
            if (pctText) pctText.textContent = `${progress}%`;
        } else {
            // Completed, stopped, or idle
            if (btnStart) {
                btnStart.style.display = 'inline-flex';
                btnStart.disabled = false;
                const curMode = document.querySelector('input[name="coworkerSyncMode"]:checked')?.value;
                if (curMode === 'complete_refresh') {
                    btnStart.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Start Complete Refresh';
                    btnStart.style.background = 'linear-gradient(135deg, #dc2626, #991b1b)';
                    btnStart.style.borderColor = '#ef4444';
                } else {
                    btnStart.innerHTML = '<i class="fa-solid fa-play"></i> Start Co-Worker';
                    btnStart.style.background = '';
                    btnStart.style.borderColor = '';
                }
            }
            if (btnStop) btnStop.style.display = 'none';

            if (data.status === 'completed') {
                if (badge) {
                    badge.style.background = 'rgba(34,197,94,0.15)';
                    badge.style.color = '#4ade80';
                    badge.style.borderColor = 'rgba(34,197,94,0.3)';
                    badge.innerHTML = `<i class="fa-solid fa-circle-check" style="margin-right: 4px;"></i> Completed`;
                }
                if (pBar) pBar.style.width = '100%';
                if (pctText) pctText.textContent = '100%';
                if (!window._coworkerJustCompleted) {
                    window._coworkerJustCompleted = true;
                    (async () => {
                        if (typeof fetchInventory === 'function') await fetchInventory();
                        if (typeof loadStoreData === 'function') await loadStoreData();
                        if (typeof updateProductSubCategoryOptions === 'function') updateProductSubCategoryOptions();
                        if (typeof renderProductsTable === 'function') renderProductsTable();
                        if (typeof updateInventorySubCategoryOptions === 'function') updateInventorySubCategoryOptions();
                        if (typeof handleInventoryFilter === 'function') handleInventoryFilter(false);
                        if (typeof showToast === 'function') {
                            showToast("✓ Stock & Sub-Categories Refreshed! Inventory and Product Catalog updated with live data.", "success");
                        }
                    })();
                }
            } else if (data.status === 'stopped') {
                if (badge) {
                    badge.style.background = 'rgba(239,68,68,0.15)';
                    badge.style.color = '#f87171';
                    badge.style.borderColor = 'rgba(239,68,68,0.3)';
                    badge.innerHTML = `<i class="fa-solid fa-circle-stop" style="margin-right: 4px;"></i> Stopped`;
                }
            } else {
                if (badge) {
                    badge.style.background = 'rgba(34,197,94,0.15)';
                    badge.style.color = '#4ade80';
                    badge.style.borderColor = 'rgba(34,197,94,0.3)';
                    badge.innerHTML = `<i class="fa-solid fa-circle" style="font-size: 0.5rem; margin-right: 4px;"></i> Ready`;
                }
                if (pBar) pBar.style.width = '0%';
                if (pctText) pctText.textContent = '0%';
            }
        }
    } catch (e) {
        console.warn("Error fetching coworker status:", e);
    }
}
window.fetchCoworkerStatus = fetchCoworkerStatus;
