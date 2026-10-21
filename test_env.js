
var window = this;
window.addEventListener = function(){};
window.location = { search: '?id=czm_50074', href: 'http://localhost/product.html?id=czm_50074' };
var location = window.location;
var document = {
    addEventListener: function(){},
    removeEventListener: function(){},
    getElementById: function(id){ 
        return { 
            id: id,
            style:{}, 
            innerHTML:'', 
            textContent:'', 
            appendChild:function(){},
            classList: { add:function(){}, remove:function(){}, contains:function(){ return false; } }
        }; 
    },
    querySelectorAll: function(){ return []; },
    querySelector: function(){ return null; },
    createElement: function(tag){ 
        return { 
            tagName: tag,
            style:{}, 
            innerHTML:'', 
            appendChild:function(){},
            classList: { add:function(){}, remove:function(){}, contains:function(){ return false; } }
        }; 
    },
    body: { appendChild: function(){} },
    title: ''
};
var localStorage = { getItem: function(){ return null; }, setItem: function(){} };
var sessionStorage = { getItem: function(){ return null; }, setItem: function(){} };
var URLSearchParams = function(s){ return { get: function(k){ return 'czm_50074'; } }; };
var fetch = function(){ return Promise.resolve({ json: function(){ return Promise.resolve({}); } }); };

/* ==========================================================================
   SORÈVA LUXURY JEWELLERY - STORE ENGINE
   Reference: soreva.in
   Features: Currency Switcher, Interactive Cart Drawer, Free Shipping Meter,
             Quick View Modal, Live Search, Category/Plating Filters,
             Coupon Engine (LAUNCH15).
   ========================================================================== */

// Currency Exchange Rates (Base: INR)
let CURRENCIES = {
    INR: { symbol: '₹', rate: 1, label: 'INR (₹)' },
    USD: { symbol: '$', rate: 0.012, label: 'USD ($)' },
    AED: { symbol: 'د.إ', rate: 0.044, label: 'AED (د.إ)' },
    GBP: { symbol: '£', rate: 0.0095, label: 'GBP (£)' },
    EUR: { symbol: '€', rate: 0.011, label: 'EUR (€)' }
};

let currentCurrency = 'INR';

// Initial Canonical Catalog from Sorèva Sorèva Exclusive
let PRODUCTS = [
    {
        id: "czm_41673",
        sku: "CZM-41673",
        name: "Traditional Royal CZ Choker",
        category: "necklace",
        subCategory: "Traditional Necklaces",
        priceINR: 6599,
        originalPriceINR: 8899,
        rating: 4.9,
        reviews: 36,
        plating: "gold",
        availableFinishes: ["24K Gold", "Rhodium Silver", "Rose Gold"],
        badge: "Bestseller",
        launchOffer: false,
        disabled: false,
        active: true,
        stockStatus: "In Stock",
        stockQty: 15,
        primaryImg: "https://indian-jewellery.com/core/thumb_images/product_images/412512AQ10CV92119.jpg",
        hoverImg: "https://indian-jewellery.com/core/thumb_images/product_images/412512AQ10CV92119A.jpg",
        videoUrl: "https://indian-jewellery.com/core/thumb_images/product_videos/412512AQ10CV92119V1.mp4",
        gallery: [
            "https://indian-jewellery.com/core/thumb_images/product_images/412512AQ10CV92119.jpg",
            "https://indian-jewellery.com/core/thumb_images/product_images/412512AQ10CV92119A.jpg"
        ],
        description: "Exquisitely handcrafted royal CZ choker necklace from Sorèva collection. Features premium AAA+ cubic zirconia crystals in an anti-tarnish micro-plated finish."
    },
    {
        id: "czm_51860",
        sku: "CZM-51860",
        name: "Celeste Diamond-Cut Zircon Drops",
        category: "earrings",
        subCategory: "Big Size Earrings",
        priceINR: 2349,
        originalPriceINR: 3199,
        rating: 4.8,
        reviews: 24,
        plating: "silver",
        availableFinishes: ["Rhodium Silver", "24K Gold"],
        badge: "Trending",
        launchOffer: false,
        disabled: false,
        active: true,
        stockStatus: "In Stock",
        stockQty: 15,
        primaryImg: "https://indian-jewellery.com/core/thumb_images/product_images/571196DN10CD75382.jpg",
        hoverImg: "https://indian-jewellery.com/core/thumb_images/product_images/571196DN10CD75382A.jpg",
        videoUrl: "https://indian-jewellery.com/core/thumb_images/product_videos/571196DN10CD75382V1.mp4",
        gallery: [
            "https://indian-jewellery.com/core/thumb_images/product_images/571196DN10CD75382.jpg"
        ],
        description: "Cascading multi-faceted cubic zirconia chandelier drops with brilliant diamond-cut sparkle."
    },
    {
        id: "czm_46520",
        sku: "CZM-46520",
        name: "Dulhan Shine Bridal Bracelet",
        category: "bracelets",
        subCategory: "Bracelets Rings Combo",
        priceINR: 2599,
        originalPriceINR: 3499,
        rating: 4.9,
        reviews: 19,
        plating: "gold",
        availableFinishes: ["24K Gold", "Rhodium Silver"],
        badge: "Bridal Pick",
        launchOffer: false,
        disabled: false,
        active: true,
        stockStatus: "In Stock",
        stockQty: 15,
        primaryImg: "https://indian-jewellery.com/core/thumb_images/product_images/49938CP12CU68939.jpg",
        hoverImg: "https://indian-jewellery.com/core/thumb_images/product_images/49938CP12CU68939A.jpg",
        videoUrl: "https://indian-jewellery.com/core/thumb_images/product_videos/49938CP12CU68939V1.mp4",
        gallery: [
            "https://indian-jewellery.com/core/thumb_images/product_images/49938CP12CU68939.jpg"
        ],
        description: "Grand bridal wristwear set with hand-faceted cubic zirconia and secure double safety clasp."
    },
    {
        id: "czm_51132",
        sku: "CZM-51132",
        name: "Brilliant Princess Solitaire Ring",
        category: "rings",
        subCategory: "Finger Rings",
        priceINR: 1199,
        originalPriceINR: 1599,
        rating: 5.0,
        reviews: 28,
        plating: "silver",
        availableFinishes: ["Rhodium Silver", "24K Gold", "Rose Gold"],
        badge: "Popular",
        launchOffer: false,
        disabled: false,
        active: true,
        stockStatus: "In Stock",
        stockQty: 15,
        primaryImg: "https://indian-jewellery.com/core/thumb_images/product_images/56518NC12CI45512.jpg",
        hoverImg: "https://indian-jewellery.com/core/thumb_images/product_images/56518NC12CI45512A.jpg",
        videoUrl: "https://indian-jewellery.com/core/thumb_images/product_videos/56518NC12CI45512V1.mp4",
        gallery: [
            "https://indian-jewellery.com/core/thumb_images/product_images/56518NC12CI45512.jpg"
        ],
        description: "Crown-cut solitaire center stone with micro-pave encrusted shoulders."
    },
    {
        id: "czm_50550",
        sku: "CZM-50550",
        name: "Diamond Replica Halo Pendant",
        category: "pendants",
        subCategory: "CZ Pendant Sets",
        priceINR: 1199,
        originalPriceINR: 1599,
        rating: 4.8,
        reviews: 15,
        plating: "gold",
        availableFinishes: ["24K Gold", "Rhodium Silver"],
        badge: "Classic",
        launchOffer: false,
        disabled: false,
        active: true,
        stockStatus: "In Stock",
        stockQty: 15,
        primaryImg: "https://indian-jewellery.com/core/thumb_images/product_images/55252BF12CP10120.jpg",
        hoverImg: "https://indian-jewellery.com/core/thumb_images/product_images/55252BF12CP10120A.jpg",
        videoUrl: "https://indian-jewellery.com/core/thumb_images/product_videos/55252BF12CP10120V1.mp4",
        gallery: [
            "https://indian-jewellery.com/core/thumb_images/product_images/55252BF12CP10120.jpg"
        ],
        description: "Delicate floating solitaire pendant set in micro-halo setting on an adjustable fine chain."
    },
    {
        id: "czm_41674",
        sku: "CZM-41674",
        name: "Grand Empress Bridal CZ Choker",
        category: "necklace",
        subCategory: "Traditional Necklaces",
        priceINR: 6449,
        originalPriceINR: 8699,
        rating: 5.0,
        reviews: 31,
        plating: "gold",
        availableFinishes: ["24K Gold", "Rhodium Silver"],
        badge: "Royal Edition",
        launchOffer: false,
        disabled: false,
        active: true,
        stockStatus: "In Stock",
        stockQty: 15,
        primaryImg: "https://indian-jewellery.com/core/thumb_images/product_images/413800AQ10CV92120.jpg",
        hoverImg: "https://indian-jewellery.com/core/thumb_images/product_images/413800AQ10CV92120A.jpg",
        videoUrl: "https://indian-jewellery.com/core/thumb_images/product_videos/413800AQ10CV92120V1.mp4",
        gallery: [
            "https://indian-jewellery.com/core/thumb_images/product_images/413800AQ10CV92120.jpg"
        ],
        description: "An opulent heirloom statement choker layered with brilliant cut round and baguette stones."
    },
    {
        id: "czm_51696",
        sku: "CZM-51696",
        name: "Imperial Cascading CZ Drops",
        category: "earrings",
        subCategory: "Big Size Earrings",
        priceINR: 2349,
        originalPriceINR: 3199,
        rating: 4.9,
        reviews: 22,
        plating: "gold",
        availableFinishes: ["24K Gold", "Rhodium Silver"],
        badge: "Festive Pick",
        launchOffer: false,
        disabled: false,
        active: true,
        stockStatus: "In Stock",
        stockQty: 15,
        primaryImg: "https://indian-jewellery.com/core/thumb_images/product_images/571230DN12CP75345.jpg",
        hoverImg: "https://indian-jewellery.com/core/thumb_images/product_images/571230DN12CP75345A.jpg",
        videoUrl: "https://indian-jewellery.com/core/thumb_images/product_videos/571230DN12CP75345V1.mp4",
        gallery: [
            "https://indian-jewellery.com/core/thumb_images/product_images/571230DN12CP75345.jpg"
        ],
        description: "Intricately clustered AAA+ grade Austrian Cubic Zirconia in high-polish finish."
    },
    {
        id: "czm_46519",
        sku: "CZM-46519",
        name: "Shagun Spark CZ Tennis Bracelet",
        category: "bracelets",
        subCategory: "Bracelets Rings Combo",
        priceINR: 2199,
        originalPriceINR: 2999,
        rating: 4.9,
        reviews: 18,
        plating: "gold",
        availableFinishes: ["24K Gold", "Rhodium Silver", "Rose Gold"],
        badge: "Bestseller",
        launchOffer: false,
        disabled: false,
        active: true,
        stockStatus: "In Stock",
        stockQty: 15,
        primaryImg: "https://indian-jewellery.com/core/thumb_images/product_images/49938CP12CU68937.jpg",
        hoverImg: "https://indian-jewellery.com/core/thumb_images/product_images/49938CP12CU68937A.jpg",
        videoUrl: "https://indian-jewellery.com/core/thumb_images/product_videos/49938CP12CU68937V1.mp4",
        gallery: [
            "https://indian-jewellery.com/core/thumb_images/product_images/49938CP12CU68937.jpg"
        ],
        description: "Continuous fire of handset round brilliant stones. Flexible, feather-light, and flawlessly secure."
    }
];
const DEFAULT_HERO_SLIDES = [
    {
        id: 1,
        tag: "01 / 08 • ROYAL CHOKER EDIT",
        headline: "Where Timeless <em>Brilliance</em> Thrives",
        subtitle: "Handcrafted with Austrian AAA+ Cubic Zirconia crystals and 24K gold micro-finish. Designed for regal celebrations.",
        image: "assets/hero/hero-slide-1.jpg",
        name: "Aurelia Pavé Heritage Collar Necklace",
        priceINR: 6599,
        finish: "24K Gold Plated",
        productId: "czm_41673",
        ctaText: "Explore Catalog",
        ctaLink: "#products-catalog"
    },
    {
        id: 2,
        tag: "02 / 08 • CELESTE DROPS EDIT",
        headline: "The Fiery <em>Brilliance</em> of Pure Light",
        subtitle: "Diamond-cut multi-faceted cascading teardrops in Rhodium Silver finish with fiery diamond dispersion.",
        image: "assets/hero/hero-slide-2.jpg",
        name: "Isabella Graduated Cascading Crystal Earrings",
        priceINR: 2349,
        finish: "Rhodium Silver",
        productId: "czm_51860",
        ctaText: "Explore Catalog",
        ctaLink: "#products-catalog"
    },
    {
        id: 3,
        tag: "03 / 08 • BRIDAL EMPRESS EDIT",
        headline: "Grandeur Reimagined for <em>Every Queen</em>",
        subtitle: "An opulent heirloom statement choker layered with brilliant cut round and baguette stones.",
        image: "assets/hero/hero-slide-3.jpg",
        name: "Primavera Baguette Royal Heritage Collar",
        priceINR: 6449,
        finish: "24K Gold Plated",
        productId: "czm_41674",
        ctaText: "Explore Catalog",
        ctaLink: "#products-catalog"
    },
    {
        id: 4,
        tag: "04 / 08 • SIGNATURE RINGS EDIT",
        headline: "Subtle Luxury at <em>Your Fingertips</em>",
        subtitle: "Crown-cut solitary center stone with micro-pave encrusted shoulders for effortless everyday glamour.",
        image: "assets/hero/hero-slide-4.jpg",
        name: "Floriana Sculpted Blossom Pavé Ring",
        priceINR: 1199,
        finish: "Rhodium Silver",
        productId: "czm_51132",
        ctaText: "Explore Catalog",
        ctaLink: "#products-catalog"
    },
    {
        id: 5,
        tag: "05 / 08 • WRISTWEAR ICON EDIT",
        headline: "Fluid Elegance Around <em>Your Wrist</em>",
        subtitle: "Continuous fire of handset round brilliant stones. Flexible, feather-light, and flawlessly secure.",
        image: "assets/hero/hero-slide-5.jpg",
        name: "Honoria Flawless Hathphool Bangle & Ring Suite",
        priceINR: 2199,
        finish: "24K Gold Plated",
        productId: "czm_46519",
        ctaText: "Explore Catalog",
        ctaLink: "#products-catalog"
    },
    {
        id: 6,
        tag: "06 / 08 • HALO SOLITAIRE EDIT",
        headline: "Everyday Grace with <em>Luminous Depth</em>",
        subtitle: "Delicate floating solitaire pendant set in micro-halo setting on an adjustable fine chain.",
        image: "assets/hero/hero-slide-6.jpg",
        name: "Novella Pear-Cut Teardrop Pendant & Earrings Set",
        priceINR: 1199,
        finish: "24K Gold Plated",
        productId: "czm_50550",
        ctaText: "Explore Catalog",
        ctaLink: "#products-catalog"
    },
    {
        id: 7,
        tag: "07 / 08 • IMPERIAL JHUMKA EDIT",
        headline: "Heritage Craftsmanship <em>Modern Silhouette</em>",
        subtitle: "Filigree bells encrusted with pave crystals and delicate pearl drops for regal festive evenings.",
        image: "assets/hero/hero-slide-7.jpg",
        name: "Zephyrina Floral Statement Chandelier Drops",
        priceINR: 2349,
        finish: "24K Gold Plated",
        productId: "czm_51696",
        ctaText: "Explore Catalog",
        ctaLink: "#products-catalog"
    },
    {
        id: 8,
        tag: "08 / 08 • DULHAN SHINE EDIT",
        headline: "Radiance That Captures <em>Every Gaze</em>",
        subtitle: "Grand bridal combo wristwear set with hand-faceted cubic zirconia and safety clasp.",
        image: "assets/hero/hero-slide-8.jpg",
        name: "Querida Dainty Hand-Harness Crystal Parure",
        priceINR: 2599,
        finish: "24K Gold Plated",
        productId: "czm_46520",
        ctaText: "Explore Catalog",
        ctaLink: "#products-catalog"
    }
];
let HERO_SLIDES = [...DEFAULT_HERO_SLIDES];
window.HERO_SLIDES = HERO_SLIDES;
window.DEFAULT_HERO_SLIDES = DEFAULT_HERO_SLIDES;

// App State - Resilient Cart Storage & Retention Engine
function loadCartFromStorage() {
    try {
        const raw = localStorage.getItem('sorevaCart') || localStorage.getItem('cart');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter(item => item && (item.productId || item.id)).map(item => ({
                    productId: String(item.productId || item.id).trim(),
                    finish: item.finish || '24K Gold',
                    qty: Math.max(1, parseInt(item.qty || item.quantity) || 1),
                    name: item.name || '',
                    priceINR: Number(item.priceINR || item.price) || 0,
                    primaryImg: item.primaryImg || item.image || ''
                }));
            }
        }
    } catch (e) {
        console.warn('[Cart Storage Restore]', e);
    }
    return [];
}
let cart = loadCartFromStorage();

// Persistent Auth State (synchronous on page load to eliminate logged-out flicker across page loads & tabs)
let authToken = localStorage.getItem('soreva_auth_token') || null;
let currentUser = null;
try {
    const savedUser = localStorage.getItem('soreva_user');
    if (savedUser && authToken) {
        currentUser = JSON.parse(savedUser);
    }
} catch (e) {
    console.warn('[Auth State Restore]', e);
    currentUser = null;
}

// ==========================================================================
// REAL-TIME MULTI-TAB SYNCHRONIZATION ENGINE
// Ensures cart, user session, and order state are synchronized across all open tabs
// ==========================================================================
const TAB_INSTANCE_ID = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
let tabSyncChannel = null;

try {
    if (typeof BroadcastChannel !== 'undefined') {
        tabSyncChannel = new BroadcastChannel('soreva_multi_tab_sync');
        tabSyncChannel.onmessage = (event) => {
            handleCrossTabMessage(event.data);
        };
    }
} catch (e) {
    console.warn('[TabSync] BroadcastChannel not supported, falling back to storage bus', e);
}

function broadcastCrossTab(type, payload = {}) {
    const msg = { type, ...payload, senderId: TAB_INSTANCE_ID, timestamp: Date.now() };
    if (tabSyncChannel) {
        try {
            tabSyncChannel.postMessage(msg);
        } catch (e) {
            console.warn('[TabSync] BroadcastChannel error', e);
        }
    }
    // Also pulse localStorage to notify tabs without BroadcastChannel or in background
    try {
        localStorage.setItem('soreva_tab_sync_pulse', JSON.stringify({ type, timestamp: Date.now(), senderId: TAB_INSTANCE_ID }));
    } catch (e) {}
}

function handleCrossTabMessage(data) {
    if (!data || data.senderId === TAB_INSTANCE_ID) return; // Ignore messages from current tab

    switch (data.type) {
        case 'CART_UPDATED':
            if (Array.isArray(data.cart)) {
                cart = data.cart;
                updateCartUI();
                refreshCheckoutModalIfOpen();
            }
            break;

        case 'USER_LOGGED_IN':
            if (data.token) authToken = data.token;
            if (data.user) currentUser = data.user;
            if (Array.isArray(data.cart)) {
                cart = data.cart;
                try { localStorage.setItem('sorevaCart', JSON.stringify(cart)); } catch (e) {}
            }
            updateUserUI();
            updateCartUI();
            break;

        case 'USER_LOGGED_OUT':
            authToken = null;
            currentUser = null;
            updateUserUI();
            updateCartUI();
            break;

        case 'ORDER_COMPLETED':
            cart = [];
            appliedCoupon = null;
            updateCartUI();
            closeCheckoutModal();
            break;
    }
}

// Storage event listener for cross-tab synchronization (fires in all other tabs when localStorage is written)
window.addEventListener('storage', (e) => {
    if (e.key === 'sorevaCart') {
        try {
            const newCart = e.newValue ? JSON.parse(e.newValue) : [];
            if (Array.isArray(newCart)) {
                cart = newCart;
                updateCartUI();
                refreshCheckoutModalIfOpen();
            }
        } catch (err) {}
    } else if (e.key === 'soreva_wishlist') {
        try {
            const newWish = e.newValue ? JSON.parse(e.newValue) : [];
            if (Array.isArray(newWish)) {
                wishlist = newWish.map(String);
                updateWishlistUI();
                const drawer = document.getElementById('wishlistDrawer');
                if (drawer && drawer.classList.contains('active')) {
                    renderWishlistItems();
                }
            }
        } catch (err) {}
    } else if (e.key === 'soreva_user' || e.key === 'soreva_auth_token') {
        const token = localStorage.getItem('soreva_auth_token') || null;
        let usr = null;
        try {
            const raw = localStorage.getItem('soreva_user');
            if (raw && token) usr = JSON.parse(raw);
        } catch (err) {}
        authToken = token;
        currentUser = usr;
        updateUserUI();
    } else if (e.key === 'soreva_tab_sync_pulse') {
        try {
            const pulse = e.newValue ? JSON.parse(e.newValue) : null;
            if (pulse && pulse.senderId !== TAB_INSTANCE_ID) {
                syncTabStateOnFocus();
            }
        } catch (err) {}
    }
});

// Sync state immediately when user clicks into / switches to this tab
function syncTabStateOnFocus() {
    // 1. Check Auth
    const token = localStorage.getItem('soreva_auth_token') || null;
    let usr = null;
    try {
        const raw = localStorage.getItem('soreva_user');
        if (raw && token) usr = JSON.parse(raw);
    } catch (err) {}

    let authDirty = false;
    if (token !== authToken) {
        authToken = token;
        authDirty = true;
    }
    if (JSON.stringify(usr) !== JSON.stringify(currentUser)) {
        currentUser = usr;
        authDirty = true;
    }
    if (authDirty) {
        updateUserUI();
    }

    // 2. Check Cart
    try {
        const savedCartStr = localStorage.getItem('sorevaCart');
        const savedCart = savedCartStr ? JSON.parse(savedCartStr) : [];
        if (Array.isArray(savedCart) && JSON.stringify(savedCart) !== JSON.stringify(cart)) {
            cart = savedCart;
            updateCartUI();
            refreshCheckoutModalIfOpen();
        }
    } catch (err) {}
}

window.addEventListener('focus', syncTabStateOnFocus);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        syncTabStateOnFocus();
    }
});

function refreshCheckoutModalIfOpen() {
    const backdrop = document.getElementById('checkoutModalBackdrop');
    if (backdrop && (backdrop.style.display === 'flex' || backdrop.classList.contains('active'))) {
        openCheckoutModal();
    }
}

// Persistent Wishlist / Saved Favourites State
let wishlist = [];
try {
    const savedWish = localStorage.getItem('soreva_wishlist');
    if (savedWish) {
        const parsed = JSON.parse(savedWish);
        if (Array.isArray(parsed)) {
            wishlist = parsed.map(String);
        }
    }
} catch (e) {
    wishlist = [];
}
let activeFilter = 'necklace';
let activeSubFilter = null;
let activeBadgeFilter = null;
let activePlating = 'all';
let appliedCoupon = null;
let FREE_SHIPPING_THRESHOLD_INR = 2499;

// Dynamic Store Data State
let CATEGORIES = [];
let COUPONS = [];
let SPOTLIGHT = null;
let TESTIMONIALS = [];
let INSTAGRAM = [];
let SETTINGS = null;
let announcementInterval = null;

// ==========================================
// Currency Formatter
// ==========================================
function formatPrice(inrAmount) {
    const cur = (CURRENCIES && CURRENCIES[currentCurrency]) ? CURRENCIES[currentCurrency] : { symbol: '₹', rate: 1 };
    const converted = inrAmount * cur.rate;
    if (currentCurrency === 'INR') {
        return `₹${Math.round(converted).toLocaleString('en-IN')}`;
    }
    return `${cur.symbol}${converted.toFixed(2)}`;
}

// (Initialization handled at bottom of file after all modules and state are defined)

// Announcement Slides Rotator
function initAnnouncementTicker() {
    const slides = document.querySelectorAll('.announcement-slide');
    if (!slides.length) return;
    if (announcementInterval) clearInterval(announcementInterval);
    let currentSlide = 0;
    const speed = (SETTINGS && SETTINGS.tickerSpeedMs) || 4500;
    announcementInterval = setInterval(() => {
        const liveSlides = document.querySelectorAll('.announcement-slide');
        if (!liveSlides.length) return;
        if (liveSlides[currentSlide]) liveSlides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % liveSlides.length;
        if (liveSlides[currentSlide]) liveSlides[currentSlide].classList.add('active');
    }, speed);
}

// Dynamic Announcements Renderer
function renderAnnouncements(announcements) {
    const container = document.getElementById('announcementSlides');
    if (!container || !announcements || !announcements.length) return;
    container.innerHTML = announcements.map((ann, idx) => `
        <div class="announcement-slide ${idx === 0 ? 'active' : ''}">
            <span>${ann}</span>
        </div>
    `).join('');
    initAnnouncementTicker();
}

// Dynamic Categories Showcase Renderer
function renderCategories(categories) {
    const container = document.getElementById('categoryGrid');
    if (!container || !categories || !categories.length) return;
    container.innerHTML = categories.map((cat, idx) => `
        <a href="catalog.html?cat=${cat.slug}" class="category-card" aria-label="${cat.name}">
            <div class="category-img-wrap">
                <img class="category-img" src="${cat.image}" alt="${cat.name}" loading="lazy">
                <div class="category-overlay-gradient"></div>
                <span class="category-number-badge">${String(idx + 1).padStart(2, '0')}</span>
            </div>
            <div class="category-content-overlay">
                <span class="category-meta-tag">${cat.countLabel || 'Curated Pieces'}</span>
                <h3 class="category-title-text">${cat.name}</h3>
                <div class="category-explore-pill">
                    <span>Explore</span>
                    <i class="fa-solid fa-arrow-right-long"></i>
                </div>
            </div>
        </a>
    `).join('');
}

// Category filter helper (for card clicks)
function filterByCategory(slug) {
    activeFilter = slug;
    document.querySelectorAll('.cat-nav-link').forEach(l => {
        l.classList.toggle('active', l.dataset.category === slug);
    });
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === slug);
    });
    const productsSec = document.getElementById('products-catalog');
    if (productsSec) productsSec.scrollIntoView({ behavior: 'smooth' });
    renderProducts();
}

// Dynamic Spotlight Section Renderer
function renderSpotlight(spotlight) {
    if (!spotlight) return;
    const tagEl = document.getElementById('spotlightTag');
    const titleEl = document.getElementById('spotlightTitle');
    const desc1El = document.getElementById('spotlightDesc1');
    const desc2El = document.getElementById('spotlightDesc2');
    const imgMainEl = document.getElementById('spotlightImgMain');
    const imgSubEl = document.getElementById('spotlightImgSub');
    const featEl = document.getElementById('spotlightFeatures');

    if (tagEl && spotlight.tag) tagEl.textContent = spotlight.tag;
    if (titleEl && spotlight.title) titleEl.innerHTML = spotlight.title;
    if (desc1El && spotlight.desc1) desc1El.textContent = spotlight.desc1;
    if (desc2El && spotlight.desc2) desc2El.innerHTML = spotlight.desc2;
    if (imgMainEl && spotlight.imgMain) imgMainEl.src = spotlight.imgMain;
    if (imgSubEl && spotlight.imgSub) imgSubEl.src = spotlight.imgSub;
    if (featEl && spotlight.features && spotlight.features.length) {
        const icons = [
            'fa-gem',
            'fa-wand-magic-sparkles',
            'fa-hand-holding-heart',
            'fa-feather',
            'fa-shield-halved'
        ];
        featEl.innerHTML = spotlight.features.map((f, i) => `
            <div class="spot-feat-item">
                <i class="fa-solid ${icons[i % icons.length]} spot-feat-icon"></i>
                <div>
                    <h5>${f.title}</h5>
                    <p>${f.desc}</p>
                </div>
            </div>
        `).join('');
    }
}

// Dynamic Testimonials Renderer
function renderTestimonials(testimonials) {
    if (!testimonials || !testimonials.length) return;
    const cardsHtml = testimonials.map(t => {
        const stars = '<i class="fa-solid fa-star"></i>'.repeat(t.rating || 5);
        const snippet = t.text ? (t.text.split('.')[0] + '!') : 'Exquisite jewellery';
        return `
            <div class="review-card">
                <div class="review-stars">${stars}</div>
                <p class="review-quote">"${snippet}"</p>
                <p class="review-body">"${t.text}"</p>
                <div class="reviewer-meta">
                    <img class="reviewer-avatar" src="${t.avatar}" alt="${t.name}">
                    <div class="reviewer-info">
                        <h5>${t.name}</h5>
                        <span>${t.verified ? '<i class="fa-solid fa-circle-check"></i> Verified Buyer' : ''} • ${t.city}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const grid1 = document.getElementById('testimonialsGrid');
    if (grid1) grid1.innerHTML = cardsHtml;
    const grid2 = document.getElementById('productTestimonialsGrid');
    if (grid2) grid2.innerHTML = cardsHtml;
}

// Global function to smoothly scroll to reviews / testimonials section with sticky header offset
function scrollToReviewsSection(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }
    const target = document.getElementById('testimonials') || document.getElementById('reviews');
    if (target) {
        const headerOffset = 100;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
        });
        if (window.history && window.history.pushState) {
            history.pushState(null, '', '#testimonials');
        } else {
            location.hash = '#testimonials';
        }
    } else {
        // Current page does not have a testimonials section, redirect to index.html#testimonials
        window.location.href = 'index.html#testimonials';
    }
}
window.scrollToReviewsSection = scrollToReviewsSection;


// ==========================================
// Instagram Reels Video Gallery
// ==========================================
let currentInstagramReels = [];

function triggerInstagramEmbedProcess() {
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        if (window.instgrm && window.instgrm.Embeds) {
            clearInterval(checkInterval);
            try {
                window.instgrm.Embeds.process();
            } catch (e) {
                console.warn('[Instagram] Embeds.process error:', e);
            }
        } else if (attempts > 30) {
            clearInterval(checkInterval);
        }
    }, 200);

    let script = document.querySelector('script[src*="instagram.com/embed.js"]');
    if (!script) {
        script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.src = 'https://www.instagram.com/embed.js';
        document.head.appendChild(script);
    }
}

function renderSocialFeed(instagram, handle = 'soreva_jewels') {
    const container = document.getElementById('socialGrid');
    if (!container) return;

    const items = (instagram && instagram.length) ? instagram : (typeof INSTAGRAM !== 'undefined' ? INSTAGRAM : []);
    if (!items || !items.length) return;
    currentInstagramReels = items;

    // Verified official reels from @soreva_jewels
    const fallbackPermalinks = [
        'https://www.instagram.com/reel/DdqS_DcTt5z/',
        'https://www.instagram.com/reel/DdnZyRnzf-M/',
        'https://www.instagram.com/reel/DdgR2vnzK8i/',
        'https://www.instagram.com/reel/DddeqOWpiSR/',
        'https://www.instagram.com/reel/DdalJxwT2lh/',
        'https://www.instagram.com/reel/DdX5hpdzqF4/'
    ];

    container.innerHTML = items.slice(0, 6).map((item, idx) => {
        const rawLink = item.permalink || item.link || '';
        const permalink = (rawLink && rawLink.includes('/reel/'))
            ? rawLink
            : (fallbackPermalinks[idx % fallbackPermalinks.length]);
        
        const caption = item.caption || item.title || 'Handcrafted cubic zirconia jewellery in motion.';
        const cleanCaption = caption.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 80);

        return `
        <div class="insta-embed-card" data-reel-id="${item.id || idx}">
            <blockquote class="instagram-media" 
                        data-instgrm-permalink="${permalink}" 
                        data-instgrm-version="14">
                <div style="padding: 24px 16px; text-align: center;">
                    <a href="${permalink}" target="_blank" rel="noopener" style="text-decoration: none; color: #14100f; display: block;">
                        <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(45deg, #f09433, #dc2743, #bc1888); margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 4px 12px rgba(220, 39, 67, 0.3);">
                            <i class="fa-brands fa-instagram" style="font-size: 1.25rem;"></i>
                        </div>
                        <div style="font-family: Georgia, serif; font-size: 0.95rem; font-weight: 600; margin-bottom: 6px; color: #14100f;">@${handle}</div>
                        <p style="font-size: 0.82rem; color: #777; margin-bottom: 12px; line-height: 1.4;">${cleanCaption}...</p>
                        <span class="btn-insta-follow" style="font-size: 0.76rem; padding: 6px 16px;">Watch on Instagram</span>
                    </a>
                </div>
            </blockquote>
        </div>
        `;
    }).join('');

    triggerInstagramEmbedProcess();
}

function handleReelHoverPlay(videoEl) {
    if (!videoEl) return;
    videoEl.play().catch(() => {});
    const card = videoEl.closest('.reel-card');
    if (card) card.classList.remove('is-paused');
}

function handleReelHoverPause(videoEl) {
    if (!videoEl) return;
    videoEl.pause();
    const card = videoEl.closest('.reel-card');
    if (card) card.classList.add('is-paused');
}

function toggleReelAudio(e, btnEl, videoId) {
    e.stopPropagation();
    const vid = document.getElementById(videoId);
    if (!vid) return;

    vid.muted = !vid.muted;
    const icon = btnEl.querySelector('i');
    if (icon) {
        if (vid.muted) {
            icon.className = 'fa-solid fa-volume-xmark';
        } else {
            icon.className = 'fa-solid fa-volume-high';
            vid.play().catch(() => {});
        }
    }
}

function initReelIntersectionAutoplay() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const vid = entry.target.querySelector('video');
            if (!vid) return;
            if (entry.isIntersecting) {
                vid.play().catch(() => {});
                entry.target.classList.remove('is-paused');
            } else {
                vid.pause();
                entry.target.classList.add('is-paused');
            }
        });
    }, { threshold: 0.35 });

    document.querySelectorAll('.reel-card').forEach(card => observer.observe(card));
}

// Fullscreen Reel Modal Player
function openReelModal(reelId) {
    const item = (currentInstagramReels || []).find(r => String(r.id) === String(reelId)) || (currentInstagramReels || [])[0];
    if (!item) return;

    let modal = document.getElementById('reelModalBackdrop');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reelModalBackdrop';
        modal.className = 'reel-modal-backdrop';
        modal.onclick = (e) => { if (e.target === modal) closeReelModal(); };
        document.body.appendChild(modal);
    }

    const videoSrc = item.videoUrl || item.image || '';
    const permalink = item.permalink || 'https://www.instagram.com/soreva_jewels';
    const caption = item.caption || item.title || 'Sorèva Jewels Reel';
    const likes = item.likes || '1,420';

    modal.innerHTML = `
        <div class="reel-modal-card">
            <button class="reel-modal-close" onclick="closeReelModal()"><i class="fa-solid fa-xmark"></i></button>
            <div class="reel-modal-video-wrap">
                <video class="reel-modal-video" id="modalReelVideo" src="${videoSrc}" poster="${item.thumbnail || ''}" autoplay loop playsinline controls></video>
            </div>
            <div class="reel-modal-side">
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(45deg, #f09433, #dc2743); padding: 2px;">
                                <div style="width: 100%; height: 100%; border-radius: 50%; background: #14100f; display: flex; align-items: center; justify-content: center;">
                                    <i class="fa-brands fa-instagram" style="color: #ffffff; font-size: 1.1rem;"></i>
                                </div>
                            </div>
                            <div>
                                <h4 style="font-size: 0.95rem; margin: 0; color: #ffffff;">@soreva_jewels</h4>
                                <span style="font-size: 0.75rem; color: var(--gold-light);"><i class="fa-solid fa-certificate"></i> Official Store Atelier</span>
                            </div>
                        </div>
                    </div>
                    
                    <h3 style="font-family: var(--font-heading); font-size: 1.25rem; color: var(--gold-light); margin-bottom: 12px;">${(item.title || 'Bespoke Atelier Creation').replace(/</g, '&lt;')}</h3>
                    <p style="font-size: 0.88rem; line-height: 1.6; color: rgba(255,255,255,0.85); margin-bottom: 20px;">
                        ${(caption || '').replace(/</g, '&lt;')}
                    </p>
                </div>

                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.1); margin-bottom: 16px; font-size: 0.85rem; color: rgba(255,255,255,0.7);">
                        <span><i class="fa-solid fa-heart" style="color: #e4405f; margin-right: 5px;"></i> ${likes} likes</span>
                        <span><i class="fa-solid fa-clock" style="margin-right: 5px;"></i> ${item.date || 'Recent'}</span>
                    </div>
                    <a href="${permalink}" target="_blank" rel="noopener" class="btn-insta-follow" style="width: 100%; justify-content: center; text-align: center;">
                        <i class="fa-brands fa-instagram"></i> View Full Reel on Instagram
                    </a>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
    const modalVid = document.getElementById('modalReelVideo');
    if (modalVid) modalVid.play().catch(() => {});
}

function closeReelModal() {
    const modal = document.getElementById('reelModalBackdrop');
    if (modal) {
        const modalVid = document.getElementById('modalReelVideo');
        if (modalVid) modalVid.pause();
        modal.classList.remove('active');
    }
}


// Dynamic Store Settings Renderer
function renderSettings(settings) {
    if (!settings) return;
    SETTINGS = settings;
    if (settings.storeName) {
        document.title = `${settings.storeName} - ${settings.tagline || 'Exquisite CZ Jewellery'}`;
    }
    const logoImg = document.getElementById('siteLogoImg');
    if (logoImg) {
        const targetUrl = (settings.logoUrl && !settings.logoUrl.includes('soreva.in')) ? settings.logoUrl : 'assets/logo-black.png';
        logoImg.src = targetUrl + (targetUrl.includes('?') ? '' : '?v=2026_clean');
        logoImg.style.display = 'block';
    }
    if (settings.logoWhiteUrl) {
        const footerLogoImg = document.getElementById('footerLogoImg');
        if (footerLogoImg) {
            footerLogoImg.src = settings.logoWhiteUrl;
            footerLogoImg.style.display = 'block';
        }
    }
    if (settings.contactPhone) {
        const phoneLink = document.getElementById('footerContactPhone');
        if (phoneLink) {
            phoneLink.textContent = settings.contactPhone;
            phoneLink.href = `tel:${settings.contactPhone.replace(/\s+/g, '')}`;
        }
    }
    if (settings.contactEmail) {
        const emailLink = document.getElementById('footerContactEmail');
        if (emailLink) {
            emailLink.textContent = settings.contactEmail;
            emailLink.href = `mailto:${settings.contactEmail}`;
        }
    }
    if (settings.freeShippingThresholdINR) {
        FREE_SHIPPING_THRESHOLD_INR = settings.freeShippingThresholdINR;
    }
}

// Currency Dropdown Renderer
function renderCurrencyDropdown() {
    const dropdown = document.getElementById('currencyDropdown');
    const label = document.getElementById('currentCurrencyLabel');
    if (!dropdown || !CURRENCIES) return;
    dropdown.innerHTML = Object.entries(CURRENCIES).map(([code, c]) => `
        <div class="currency-option ${code === currentCurrency ? 'active' : ''}" data-currency="${code}">
            <span>${c.label || code}</span>
            ${code === currentCurrency ? '<i class="fa-solid fa-check" style="font-size: 0.75rem;"></i>' : ''}
        </div>
    `).join('');
    if (label) label.textContent = currentCurrency;

    dropdown.querySelectorAll('.currency-option').forEach(option => {
        option.addEventListener('click', () => {
            const currencyCode = option.dataset.currency;
            if (CURRENCIES[currencyCode]) {
                currentCurrency = currencyCode;
                renderCurrencyDropdown();
                renderProducts();
                updateCartUI();
                updateHeroUI();
                showToast(`Currency changed to ${CURRENCIES[currencyCode].label}`);
            }
        });
    });
}

// Apply Store Data to all page sections
function applyStoreData(data) {
    if (!data) return;
    if (data.settings) renderSettings(data.settings);
    if (data.currencies) {
        CURRENCIES = data.currencies;
        renderCurrencyDropdown();
    }
    if (data.products && data.products.length) {
        PRODUCTS = data.products;
        if (typeof parseUrlAndSetTitle === 'function') parseUrlAndSetTitle();
        renderProducts();
        if (typeof preventLocalCaching === 'function') preventLocalCaching();
        if (typeof initProductPage === 'function') initProductPage();
        if (typeof renderCuratedBadges === 'function') renderCuratedBadges();

        // Immediately update cart and checkout with live products data
        if (Array.isArray(cart) && cart.length > 0) {
            let cartDirty = false;
            cart.forEach(item => {
                const prod = (typeof findProductById === 'function') ? findProductById(item.productId) : null;
                if (prod) {
                    if (!item.name || item.name !== prod.name) { item.name = prod.name; cartDirty = true; }
                    if (!item.priceINR || item.priceINR !== prod.priceINR) { item.priceINR = prod.priceINR; cartDirty = true; }
                    if (!item.primaryImg || item.primaryImg !== prod.primaryImg) { item.primaryImg = prod.primaryImg; cartDirty = true; }
                }
            });
            if (cartDirty) {
                try { localStorage.setItem('sorevaCart', JSON.stringify(cart)); } catch (e) {}
            }
        }
        if (typeof updateCartUI === 'function') updateCartUI();
        if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
        if (typeof refreshCheckoutModalIfOpen === 'function') refreshCheckoutModalIfOpen();
    }
    if (data.heroSlides && data.heroSlides.length) {
        HERO_SLIDES = data.heroSlides;
        if (currentHeroIndex >= HERO_SLIDES.length) currentHeroIndex = 0;
        initPatreonHero();
    } else if (typeof DEFAULT_HERO_SLIDES !== 'undefined' && (!HERO_SLIDES || !HERO_SLIDES.length)) {
        HERO_SLIDES = [...DEFAULT_HERO_SLIDES];
        initPatreonHero();
    }
    if (data.announcements && data.announcements.length) {
        renderAnnouncements(data.announcements);
    }
    if (data.categories && data.categories.length) {
        CATEGORIES = data.categories;
        renderCategories(data.categories);
    }
    if (data.coupons && data.coupons.length) {
        COUPONS = data.coupons;
    }
    if (data.spotlight) {
        SPOTLIGHT = data.spotlight;
        renderSpotlight(data.spotlight);
    }
    if (data.testimonials && data.testimonials.length) {
        TESTIMONIALS = data.testimonials;
        renderTestimonials(data.testimonials);
    }
    if (data.instagram && data.instagram.length) {
        INSTAGRAM = data.instagram;
        renderSocialFeed(data.instagram, data.settings?.instagram?.handle);
    }
}

// Load Store Data from API / Local Storage with live synchronization
async function loadStoreDataAndInit() {
    // 1. Check cached data; if it has legacy fake placeholder products (unsplash or numeric IDs), purge it!
    const cached = localStorage.getItem('soreva_store_data');
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            const hasLegacyDummy = parsed && parsed.products && parsed.products.some(p => typeof p.id === 'number' || (p.primaryImg && p.primaryImg.includes('unsplash')));
            if (hasLegacyDummy) {
                console.log("Purging stale placeholder cache from localStorage...");
                localStorage.removeItem('soreva_store_data');
            } else if (parsed && parsed.products && parsed.products.length > 0) {
                applyStoreData(parsed);
            }
        } catch (e) {
            localStorage.removeItem('soreva_store_data');
        }
    }

    // 2. Fetch latest canonical store-data from backend server
    try {
        const resp = await fetch('/api/store-data');
        if (resp.ok) {
            const serverData = await resp.json();
            try {
                // Cache top 50 products in localStorage to stay comfortably under the 5MB browser quota
                const cacheable = { ...serverData, products: (serverData.products || []).slice(0, 50) };
                localStorage.setItem('soreva_store_data', JSON.stringify(cacheable));
            } catch (e) {
                // In-memory data store used for catalogs exceeding localStorage quota
            }
            applyStoreData(serverData);
            return;
        }
    } catch (err) {
        console.warn("API /api/store-data fetch failed:", err);
    }

    // 3. Fallback to static store-data.json
    try {
        const staticResp = await fetch('/data/store-data.json');
        if (staticResp.ok) {
            const staticData = await staticResp.json();
            applyStoreData(staticData);
        }
    } catch (e) {
        console.warn("Static store-data.json fallback failed:", e);
    }
}

    // 3. Multi-tab live sync: whenever Admin updates data, update storefront immediately
    window.addEventListener('storage', (e) => {
        if (e.key === 'soreva_store_data' && e.newValue) {
            try {
                const freshData = JSON.parse(e.newValue);
                applyStoreData(freshData);
                showToast("Storefront updated with latest catalog changes!");
            } catch (err) {}
        }
    });

    // 4. Also reload on focus in case admin edited in separate window
    window.addEventListener('focus', () => {
        const freshCache = localStorage.getItem('soreva_store_data');
        if (freshCache) {
            try {
                applyStoreData(JSON.parse(freshCache));
            } catch (err) {}
        }
    });

// Currency Switcher
function initCurrencySwitcher() {
    const btn = document.getElementById('currencyBtn');
    const dropdown = document.getElementById('currencyDropdown');
    const label = document.getElementById('currentCurrencyLabel');

    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });

    dropdown.querySelectorAll('.currency-option').forEach(option => {
        option.addEventListener('click', () => {
            const currencyCode = option.dataset.currency;
            if (CURRENCIES[currencyCode]) {
                currentCurrency = currencyCode;
                label.textContent = currencyCode;
                dropdown.querySelectorAll('.currency-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                dropdown.classList.remove('show');
                
                // Re-render UI prices
                renderProducts();
                updateCartUI();
                updateHeroUI();
                showToast(`Currency changed to ${CURRENCIES[currencyCode].label}`);
            }
        });
    });
}

// Header & Sticky behavior
function initNavigation() {
    const header = document.querySelector('.site-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 40) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Attach click listeners to all reviews links in header & elsewhere
    document.querySelectorAll('a[href*="#testimonials"], a[href*="#reviews"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const hasSection = document.getElementById('testimonials') || document.getElementById('reviews');
            if (hasSection) {
                e.preventDefault();
                scrollToReviewsSection(e);
            }
        });
    });

    // Handle initial hash on page load if arriving with #testimonials or #reviews
    if (window.location.hash === '#testimonials' || window.location.hash === '#reviews') {
        setTimeout(() => {
            const target = document.getElementById('testimonials') || document.getElementById('reviews');
            if (target) {
                const headerOffset = 100;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: 'smooth'
                });
            }
        }, 300);
    }
}

// ==========================================
// Filter and Sort Engine
// ==========================================
function initFilters() {
    const catInfoMap = {
        wristwear: { title: "Wristwear <em>Collection</em>", desc: "Handcrafted bangles, kadas, and tennis bracelets in 24K gold and rhodium finish." },
        bracelets: { title: "Wristwear <em>Collection</em>", desc: "Handcrafted bangles, kadas, and tennis bracelets in 24K gold and rhodium finish." },
        necklace: { title: "Necklace <em>Collection</em>", desc: "Royal chokers, grand bridal sets, and delicate pavé statement pieces." },
        necklaces: { title: "Necklace <em>Collection</em>", desc: "Royal chokers, grand bridal sets, and delicate pavé statement pieces." },
        earrings: { title: "Earrings <em>Collection</em>", desc: "From majestic royal jhumkas and chandeliers to essential daily studs." },
        rings: { title: "Finger Rings <em>Collection</em>", desc: "Exquisite cocktail rings, engagement solitaires, and eternal bands." },
        pendants: { title: "Pendants <em>Collection</em>", desc: "Lustrous solitaires, traditional mangalsutras, and festive pendant sets." },
        silver: { title: "Silver Jewellery <em>Collection</em>", desc: "Certified 925 Sterling Silver creations with anti-tarnish rhodium plating." },
        'silver-jewellery': { title: "Silver Jewellery <em>Collection</em>", desc: "Certified 925 Sterling Silver creations with anti-tarnish rhodium plating." },
        accessories: { title: "Accessories <em>Collection</em>", desc: "Heritage maang tikkas and artisanal brooches." }
    };

    // Filter Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.category || 'necklace';
            if (activeFilter === 'all') activeFilter = 'necklace';
            activeSubFilter = null;
            activeSearchQuery = null;
            
            const pageTitle = document.getElementById('catalogTitle');
            const pageDesc = document.getElementById('catalogDesc');
            const info = catInfoMap[activeFilter] || {
                title: (activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1).replace(/-/g, ' ')) + " <em>Collection</em>",
                desc: "Discover our handcrafted jewellery pieces in " + activeFilter + "."
            };
            if (pageTitle) pageTitle.innerHTML = info.title;
            if (pageDesc) pageDesc.textContent = info.desc;
            
            try {
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', 'catalog.html?cat=' + encodeURIComponent(activeFilter));
                }
            } catch (e) {}

            window.currentPage = 1;
            renderProducts();
        });
    });

function formatPlating(plating) {
    if (!plating) return '24K Gold Plated';
    const p = plating.toLowerCase().trim();
    if (p === 'silver') return 'Rhodium Silver';
    if (p === 'rosegold' || p === 'rose-gold') return 'Rose Gold Plated';
    if (p === 'two-tone' || p === 'twotone') return 'Two Tone Plated';
    if (p === 'oxidised' || p === 'oxidized') return 'Oxidised Silver';
    if (p === 'antique') return 'Antique Mehndi Plated';
    if (p === 'gold') return '24K Gold Plated';
    return plating.charAt(0).toUpperCase() + plating.slice(1);
}

function renderPlatingBadgeHtml(plating) {
    const raw = (plating || 'gold').toLowerCase().trim();
    let label = '24K Gold Plated';
    let icon = 'fa-coins';
    let bg = 'rgba(197, 160, 89, 0.12)';
    let color = '#967537';
    let border = 'rgba(197, 160, 89, 0.35)';

    if (raw === 'silver' || raw.includes('silver') || raw.includes('rhodium')) {
        label = 'Rhodium Silver';
        icon = 'fa-gem';
        bg = 'rgba(148, 163, 184, 0.14)';
        color = '#475569';
        border = 'rgba(148, 163, 184, 0.35)';
    } else if (raw === 'rosegold' || raw.includes('rose')) {
        label = 'Rose Gold Plated';
        icon = 'fa-sparkles';
        bg = 'rgba(244, 114, 182, 0.14)';
        color = '#be185d';
        border = 'rgba(244, 114, 182, 0.35)';
    } else if (raw === 'two-tone' || raw.includes('tone')) {
        label = 'Two-Tone Plated';
        icon = 'fa-circle-half-stroke';
        bg = 'rgba(168, 85, 247, 0.14)';
        color = '#7e22ce';
        border = 'rgba(168, 85, 247, 0.35)';
    } else if (raw === 'oxidised' || raw.includes('oxidi')) {
        label = 'Oxidised Silver';
        icon = 'fa-moon';
        bg = 'rgba(100, 116, 139, 0.16)';
        color = '#334155';
        border = 'rgba(100, 116, 139, 0.35)';
    } else if (raw === 'antique' || raw.includes('antique') || raw.includes('mehndi')) {
        label = 'Antique Mehndi Plated';
        icon = 'fa-sun';
        bg = 'rgba(217, 119, 6, 0.14)';
        color = '#b45309';
        border = 'rgba(217, 119, 6, 0.35)';
    }

    return `<span class="product-plating-badge" style="background: ${bg}; color: ${color}; border: 1px solid ${border};"><i class="fa-solid ${icon}"></i> ${label}</span>`;
}


    // Plating selector
    const platingSelect = document.getElementById('platingFilter');
    if (platingSelect) {
        platingSelect.addEventListener('change', (e) => {
            activePlating = e.target.value;
            renderProducts();
        });
    }

    // Sort selector
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            renderProducts();
        });
    }
}

let currentStorePageLimit = 48;

function loadMoreStoreProducts() {
    currentStorePageLimit += 48;
    renderProducts();
}

// Render Products Grid

// ==========================================
// Product Badges Renderer (Exclusive, Trending, New Launch, Bestseller)
// ==========================================
function renderProductBadgeHtml(badge) {
    if (!badge || typeof badge !== 'string' || !badge.trim()) return '';
    const b = badge.trim();
    const bLower = b.toLowerCase();
    let badgeClass = 'badge-custom';
    let icon = '';

    if (bLower.includes('exclusive')) {
        badgeClass = 'badge-exclusive';
        icon = '<i class="fa-solid fa-gem" style="margin-right: 4px; font-size: 0.62rem;"></i>';
    } else if (bLower.includes('trending')) {
        badgeClass = 'badge-trending';
        icon = '<i class="fa-solid fa-fire" style="margin-right: 4px; font-size: 0.65rem;"></i>';
    } else if (bLower.includes('new') || bLower.includes('launch')) {
        badgeClass = 'badge-new-launch';
        icon = '<i class="fa-solid fa-sparkles" style="margin-right: 4px; font-size: 0.62rem;"></i>';
    } else if (bLower.includes('bestseller')) {
        badgeClass = 'badge-bestseller';
        icon = '<i class="fa-solid fa-crown" style="margin-right: 4px; font-size: 0.62rem;"></i>';
    }

    return `<span class="product-badge ${badgeClass}">${icon}${b}</span>`;
}


// ==========================================
// Stock Availability Helper
// ==========================================
function isProductOutOfStock(product) {
    if (!product) return true;
    if (product.stockStatus === 'Out of Stock') return true;
    if (product.inStock === false) return true;
    if (product.stockQty !== undefined && product.stockQty !== null && Number(product.stockQty) <= 0) return true;
    return false;
}
window.isProductOutOfStock = isProductOutOfStock;

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    // Strict Category Isolation: Never display whole catalog together
    if (!activeFilter || activeFilter === 'all') {
        activeFilter = 'necklace';
    }

    // Public storefront: only show active and enabled pieces
    let items = PRODUCTS.filter(p => !p.disabled && p.active !== false && p.active !== 0 && p.stockStatus !== 'Disabled');

    // Filter badge (e.g. from ?badge=new-launch)
    if (activeBadgeFilter) {
        items = items.filter(p => {
            if (!p.badge) return false;
            const b = p.badge.toLowerCase();
            if (activeBadgeFilter.includes('new') || activeBadgeFilter.includes('launch')) {
                return b.includes('new') || b.includes('launch');
            }
            if (activeBadgeFilter.includes('trend')) {
                return b.includes('trend');
            }
            if (activeBadgeFilter.includes('best') || activeBadgeFilter.includes('seller')) {
                return b.includes('best') || b.includes('seller');
            }
            return b.includes(activeBadgeFilter);
        });
    }

    // Search query filtering takes precedence when user arrives via search
    if (activeSearchQuery) {
        const qWords = activeSearchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        items = items.filter(p => {
            const name = (p.name || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            const sub = (p.subCategory || '').toLowerCase();
            const sku = (p.sku || '').toLowerCase();
            const plating = (p.plating || p.finish || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            const haystack = `${name} ${cat} ${sub} ${sku} ${plating} ${desc}`;
            return qWords.every(w => haystack.includes(w));
        });
    } else if (activeFilter !== 'all') {
        items = items.filter(p => {
            if (activeFilter === 'wristwear' || activeFilter === 'bracelets') {
                return p.category === 'wristwear' || p.category === 'bracelets';
            }
            if (activeFilter === 'necklace' || activeFilter === 'necklaces') {
                return p.category === 'necklace';
            }
            if (activeFilter === 'earrings') {
                return p.category === 'earrings';
            }
            if (activeFilter === 'rings' || activeFilter === 'finger-rings') {
                return p.category === 'rings';
            }
            if (activeFilter === 'pendants') {
                return p.category === 'pendants';
            }
            if (activeFilter === 'silver' || activeFilter === 'silver-jewellery') {
                return p.category === 'silver' || (p.subCategory && p.subCategory.toLowerCase().includes('silver'));
            }
            if (activeFilter === 'accessories') {
                return p.category === 'accessories';
            }
            return p.category === activeFilter;
        });
    }

    // Filter subcategory
    if (activeSubFilter) {
        items = items.filter(p => p.subCategory && p.subCategory.toLowerCase() === activeSubFilter.toLowerCase());
    }

    // Filter plating
    if (activePlating !== 'all') {
        items = items.filter(p => {
            const pl = (p.plating || '').toLowerCase().replace(/[\s_]/g, '-');
            const target = activePlating.toLowerCase().replace(/[\s_]/g, '-');
            if (target === 'rosegold') return pl === 'rosegold' || pl === 'rose-gold';
            if (target === 'two-tone') return pl === 'two-tone' || pl === 'twotone';
            return pl === target;
        });
    }

    // Sorting
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        const sortVal = sortSelect.value;
        if (sortVal === 'price-low') {
            items.sort((a, b) => a.priceINR - b.priceINR);
        } else if (sortVal === 'price-high') {
            items.sort((a, b) => b.priceINR - a.priceINR);
        } else if (sortVal === 'rating') {
            items.sort((a, b) => b.rating - a.rating);
        }
    }

    
    
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
            const hasHover = product.hoverImg && product.hoverImg !== product.primaryImg;
            const isWishlisted = wishlist.includes(product.id) || wishlist.includes(product.sku);
            return `
            <div class="product-card ${isProductOutOfStock(product) ? 'is-out-of-stock' : ''}" data-id="${product.id}" onclick="window.location.href='product.html?id=${product.id}'" style="cursor: pointer;">
                <div class="product-thumb-wrap ${!hasHover ? 'scale-hover-only' : ''}">
                    <img class="product-thumb primary-img" src="${product.primaryImg}" alt="${product.name}" loading="lazy" onerror="this.src='https://indian-jewellery.com/core/thumb_images/product_images/773510AQ10CV91077.jpg';">
                    ${hasHover ? `<img class="product-thumb hover-img" src="${product.hoverImg}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('scale-hover-only');">` : ''}
                    
                    <div class="product-badges">
                        ${isProductOutOfStock(product) ? '<span class="product-badge badge-sold-out"><i class="fa-solid fa-ban"></i> OUT OF STOCK</span>' : renderProductBadgeHtml(product.badge)}
                        ${(!isProductOutOfStock(product) && product.launchOffer) ? `<span class="product-badge badge-launch">15% OFF</span>` : ''}
                    </div>

                    <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" data-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')" title="Add to Wishlist">
                        <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <div class="product-quick-actions">
                        <button class="btn-quick-view" onclick="event.stopPropagation(); openQuickView('${product.id}')">
                            <i class="fa-regular fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>

                <div class="product-details">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span class="product-category-sub" style="margin-bottom: 0;">${product.subCategory || product.category}</span>
                        <span class="product-finish-pill" title="Crafted Finish">${formatPlating(product.plating)}</span>
                    </div>
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



// ==========================================
// Cart State & Slide-Over Drawer
// ==========================================
function initCartDrawer() {
    const openBtns = document.querySelectorAll('.cart-open-btn');
    const closeBtn = document.getElementById('cartDrawerClose');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    const drawer = document.getElementById('cartDrawer');

    openBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            drawer.classList.add('active');
            backdrop.classList.add('active');
        });
    });

    const closeDrawer = () => {
        drawer.classList.remove('active');
        backdrop.classList.remove('active');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Coupon Code submission
    const couponBtn = document.getElementById('applyCouponBtn');
    const couponInput = document.getElementById('couponCodeInput');
    if (couponBtn && couponInput) {
        couponBtn.addEventListener('click', () => {
            const code = couponInput.value.trim().toUpperCase();
            if (!code) {
                showToast("Please enter a valid coupon code.");
                return;
            }

            const couponList = (COUPONS && COUPONS.length) ? COUPONS : [
                { code: 'LAUNCH15', discountPercent: 15, minSpendINR: 0, active: true },
                { code: 'FESTIVE20', discountPercent: 20, minSpendINR: 4000, active: true },
                { code: 'ROYAL10', discountPercent: 10, minSpendINR: 1500, active: true }
            ];

            const found = couponList.find(c => c.active && c.code.toUpperCase() === code);
            if (found) {
                const subtotal = cart.reduce((sum, item) => {
                    const prod = PRODUCTS.find(p => String(p.id) === String(item.productId));
                    return sum + (prod ? prod.priceINR * item.qty : 0);
                }, 0);

                if (found.minSpendINR && subtotal < found.minSpendINR) {
                    showToast(`Min spend of ${formatPrice(found.minSpendINR)} required for ${found.code}.`);
                    return;
                }

                appliedCoupon = found;
                updateCartUI();
                if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
                showToast(`Coupon ${found.code} applied! ${found.discountPercent}% discount granted.`);
            } else {
                showToast(`Invalid or expired coupon "${code}". Try LAUNCH15.`);
            }
        });
    }

    // Checkout Gateway
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                showToast("Your shopping cart is empty!");
                return;
            }
            // Close drawer
            const drawer = document.getElementById('cartDrawer');
            const backdrop = document.getElementById('cartDrawerBackdrop');
            if (drawer && backdrop) {
                drawer.classList.remove('active');
                backdrop.classList.remove('active');
            }
            openCheckoutModal();
        });
    }
}

function ensureCheckoutModalInDOM() {
    if (document.getElementById('checkoutModalBackdrop')) return;
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-backdrop';
    modalEl.id = 'checkoutModalBackdrop';
    modalEl.style.display = 'none';
    modalEl.style.alignItems = 'center';
    modalEl.style.justifyContent = 'center';
    modalEl.style.zIndex = '10000';
    modalEl.style.position = 'fixed';
    modalEl.style.inset = '0';
    modalEl.style.background = 'rgba(0,0,0,0.75)';
    modalEl.style.backdropFilter = 'blur(8px)';
    modalEl.innerHTML = `
        <div class="checkout-modal" style="background: #1e1918; border: 1px solid rgba(197,160,89,0.35); border-radius: 16px; width: 92%; max-width: 820px; max-height: 90vh; overflow-y: auto; padding: 36px 32px; color: #fbf8f5; box-shadow: 0 25px 70px rgba(0,0,0,0.8), 0 0 30px rgba(197,160,89,0.2); position: relative;">
            <button class="modal-close-btn" onclick="closeCheckoutModal()" aria-label="Close Checkout" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #fbf8f5; font-size: 1.3rem; cursor: pointer;">
                <i class="fa-solid fa-xmark"></i>
            </button>

            <!-- CHECKOUT FORM VIEW -->
            <div id="checkoutFormView">
                <div style="text-align: center; margin-bottom: 24px;">
                    <img src="assets/logo-white.png" alt="Sorèva" style="height: 38px; width: auto; object-fit: contain; margin-bottom: 8px;">
                    <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 1.6rem; color: #c5a059;">Boutique Atelier Checkout</h2>
                    <p style="font-size: 0.88rem; color: rgba(251,248,245,0.7);">Enter your delivery details to reserve and finalize your handcrafted jewellery.</p>
                </div>

                <div class="checkout-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
                    <!-- LEFT COLUMN: Client Details -->
                    <div>
                        <h4 style="font-size: 0.88rem; text-transform: uppercase; letter-spacing: 1px; color: #c5a059; margin-bottom: 14px;">
                            <i class="fa-solid fa-location-dot"></i> Shipping Destination
                        </h4>

                        <form id="checkoutOrderForm" onsubmit="handlePlaceOrder(event)">
                            <div style="margin-bottom: 14px;">
                                <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.8);">Full Name *</label>
                                <input type="text" id="chkCustName" required placeholder="e.g. Radhika Merchant" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                                <div>
                                    <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.8);">Email *</label>
                                    <input type="email" id="chkCustEmail" required placeholder="radhika@example.com" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.8);">Phone Number *</label>
                                    <input type="tel" id="chkCustPhone" required placeholder="+91 97411 18940" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                                </div>
                            </div>

                            <!-- ADDRESS LINE 1: FLAT / BUILDING / STREET -->
                            <div style="margin-bottom: 12px;">
                                <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.85); font-weight: 500;">Flat, House No., Building, Apartment *</label>
                                <input type="text" id="chkCustAddress" required placeholder="e.g. Penthouse 8B, Imperial Towers, 4th Cross" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                            </div>

                            <!-- ADDRESS LINE 2: AREA / LANDMARK / SECTOR -->
                            <div style="margin-bottom: 12px;">
                                <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.85); font-weight: 500;">Area, Street, Landmark / Sector</label>
                                <input type="text" id="chkCustAddressLine2" placeholder="e.g. Near Palladium Mall, High Street Phoenix" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                            </div>

                            <!-- CITY & STATE -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                <div>
                                    <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.85); font-weight: 500;">Town / City *</label>
                                    <input type="text" id="chkCustCity" required placeholder="e.g. Mumbai" value="Mumbai" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.85); font-weight: 500;">State *</label>
                                    <input type="text" id="chkCustState" required placeholder="e.g. Maharashtra" value="Maharashtra" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                                </div>
                            </div>

                            <!-- PIN CODE & COUNTRY -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                <div>
                                    <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.85); font-weight: 500;">Postal / PIN Code *</label>
                                    <input type="text" id="chkCustPincode" required placeholder="e.g. 400013" maxlength="10" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(197,160,89,0.3); border-radius: 8px; color: #fff; font-size: 0.9rem;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(251,248,245,0.85); font-weight: 500;">Country</label>
                                    <input type="text" id="chkCustCountry" readonly value="India" style="width: 100%; box-sizing: border-box; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #c5a059; font-weight: 600; font-size: 0.9rem;">
                                </div>
                            </div>

                            <!-- LUXURY RAZORPAY PAYMENT SELECTION -->
                            <div style="margin-bottom: 18px;">
                                <label style="display: block; font-size: 0.82rem; margin-bottom: 8px; color: rgba(251,248,245,0.85); font-weight: 600;">Payment Method *</label>
                                <div id="lblPayRazorpay" style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: rgba(197,160,89,0.12); border: 1px solid #c5a059; border-radius: 10px;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                            <span style="font-weight: 700; color: #fbf8f5; font-size: 0.94rem;">
                                                <i class="fa-solid fa-shield-halved" style="color: #c5a059; margin-right: 6px;"></i> Razorpay Secure Checkout
                                            </span>
                                            <span style="background: rgba(46,125,50,0.25); color: #81c784; border: 1px solid rgba(76,175,80,0.4); font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">100% Secure & Encrypted</span>
                                        </div>
                                        <p style="margin: 6px 0 10px; font-size: 0.82rem; color: rgba(251,248,245,0.75); line-height: 1.4;">
                                            Instant confirmation via UPI (Google Pay, PhonePe, Paytm), Credit / Debit Cards, Net Banking & Wallets.
                                        </p>
                                        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                                            <span style="background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; color: #c5a059; font-weight: 600;">UPI</span>
                                            <span style="background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; color: #c5a059; font-weight: 600;">GPay</span>
                                            <span style="background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; color: #c5a059; font-weight: 600;">PhonePe</span>
                                            <span style="background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; color: #c5a059; font-weight: 600;">Cards</span>
                                            <span style="background: rgba(255,255,255,0.08); padding: 3px 8px; border-radius: 4px; font-size: 0.72rem; color: #c5a059; font-weight: 600;">NetBanking</span>
                                        </div>
                                    </div>
                                </div>
                                <input type="hidden" id="chkPaymentMethod" value="Razorpay">
                            </div>

                            <button type="submit" id="btnSubmitOrder" style="width: 100%; background: linear-gradient(135deg, #c5a059, #967537); border: none; padding: 14px; border-radius: 8px; color: #120e0d; font-weight: 700; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: transform 0.2s;">
                                <i id="btnSubmitOrderIcon" class="fa-solid fa-shield-halved"></i>
                                <span id="btnSubmitOrderText">Pay Securely via Razorpay</span>
                            </button>
                        </form>
                    </div>

                    <!-- RIGHT COLUMN: Order Summary -->
                    <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(197,160,89,0.2); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="font-size: 0.88rem; text-transform: uppercase; letter-spacing: 1px; color: #c5a059; margin-bottom: 14px;">
                                <i class="fa-solid fa-cart-shopping"></i> Order Summary
                            </h4>
                            <div id="chkItemsList" style="max-height: 220px; overflow-y: auto; margin-bottom: 16px;">
                                <!-- Items rendered dynamically -->
                            </div>

                            <!-- CHECKOUT PROMO COUPON CODE SECTION -->
                            <div id="chkCouponContainer" style="margin-bottom: 16px; border-top: 1px dashed rgba(197,160,89,0.25); padding-top: 14px;">
                                <div id="chkCouponInputWrap" style="display: flex; gap: 8px;">
                                    <input type="text" id="chkCouponCodeInput" placeholder="Coupon Code (e.g. LAUNCH15)" style="flex: 1; min-width: 0; background: rgba(0,0,0,0.4); border: 1px solid rgba(197,160,89,0.35); border-radius: 6px; padding: 10px 12px; color: #fff; font-size: 0.85rem; text-transform: uppercase; font-family: inherit; outline: none; transition: border-color 0.2s;" onkeydown="if(event.key==='Enter'){event.preventDefault();handleCheckoutApplyCoupon();}" onfocus="this.style.borderColor='#c5a059';" onblur="this.style.borderColor='rgba(197,160,89,0.35)';">
                                    <button type="button" id="chkApplyCouponBtn" onclick="handleCheckoutApplyCoupon()" style="background: linear-gradient(135deg, #c5a059, #967537); color: #120e0d; border: none; border-radius: 6px; padding: 0 16px; font-weight: 700; font-size: 0.82rem; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: transform 0.15s, opacity 0.15s; white-space: nowrap;" onmouseover="this.style.transform='translateY(-1px)';" onmouseout="this.style.transform='none';">
                                        Apply
                                    </button>
                                </div>
                                <div id="chkCouponAppliedBadge" style="display: none; align-items: center; justify-content: space-between; background: rgba(129,199,132,0.12); border: 1px solid rgba(129,199,132,0.35); border-radius: 6px; padding: 8px 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: #81c784;">
                                        <i class="fa-solid fa-tags"></i>
                                        <span>Coupon <strong id="chkAppliedCouponCodeText" style="letter-spacing: 0.5px;"></strong> applied (<span id="chkAppliedCouponPercentText"></span>% off)</span>
                                    </div>
                                    <button type="button" onclick="handleCheckoutRemoveCoupon()" title="Remove coupon" style="background: none; border: none; color: rgba(251,248,245,0.6); cursor: pointer; font-size: 0.9rem; padding: 2px 6px; border-radius: 4px; transition: color 0.15s;" onmouseover="this.style.color='#ff6b6b'" onmouseout="this.style.color='rgba(251,248,245,0.6)'">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                                <div id="chkCouponMsg" style="font-size: 0.76rem; margin-top: 6px; display: none;"></div>
                            </div>
                        </div>

                        <div style="border-top: 1px solid rgba(197,160,89,0.2); padding-top: 14px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem; color: rgba(251,248,245,0.7);">
                                <span>Subtotal</span>
                                <span id="chkSubtotal">₹0</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem; color: #81c784;">
                                <span>Promo Discount</span>
                                <span id="chkDiscount">₹0</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; color: #81c784;">
                                <span>Complimentary Insured Shipping</span>
                                <span>Free</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 700; color: #dfbd7c; border-top: 1px dashed rgba(197,160,89,0.3); padding-top: 10px;">
                                <span>Grand Total</span>
                                <span id="chkGrandTotal">₹0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SUCCESS CONFIRMATION VIEW -->
            <div id="checkoutSuccessView" style="display: none; text-align: center; padding: 28px 12px;">
                <div style="width: 72px; height: 72px; background: rgba(76,175,80,0.15); border: 2px solid #4caf50; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #81c784; font-size: 2rem; margin-bottom: 18px;">
                    <i class="fa-solid fa-check"></i>
                </div>
                <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 1.9rem; color: #dfbd7c; margin-bottom: 8px;">Order Confirmed</h2>
                <p style="font-size: 1rem; color: rgba(251,248,245,0.85); margin-bottom: 20px;">
                    Thank you, <strong id="successCustName" style="color: #fff;"></strong>! Your bespoke jewellery order has been received and routed into our atelier queue.
                </p>

                <div style="background: rgba(197,160,89,0.12); border: 1px solid #c5a059; border-radius: 12px; max-width: 440px; margin: 0 auto 24px; padding: 18px 24px; text-align: left;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(251,248,245,0.7); font-size: 0.88rem;">Order Number</span>
                        <strong style="font-family: monospace; font-size: 1.05rem; color: #c5a059;" id="successOrderNum">SRV-2026-1085</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(251,248,245,0.7); font-size: 0.88rem;">Payment Method</span>
                        <strong style="color: #81c784;" id="successPaymentMethod">Razorpay (Verified)</strong>
                    </div>
                    <div id="successPaymentIdRow" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(251,248,245,0.7); font-size: 0.88rem;">Razorpay Payment ID</span>
                        <strong style="font-family: monospace; font-size: 0.88rem; color: #c5a059;" id="successPaymentId">—</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: rgba(251,248,245,0.7); font-size: 0.88rem;">Total Charged</span>
                        <strong style="color: #fff;" id="successTotalAmt">₹3,499</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: rgba(251,248,245,0.7); font-size: 0.88rem;">Estimated Delivery</span>
                        <strong style="color: #81c784;">3 - 5 Business Days</strong>
                    </div>
                </div>

                <div style="display: flex; gap: 14px; justify-content: center;">
                    <button class="btn-primary" onclick="closeCheckoutModal()" style="padding: 12px 28px; background: #c5a059; color: #120e0d; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                        <i class="fa-solid fa-gem"></i> Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalEl);
}
window.ensureCheckoutModalInDOM = ensureCheckoutModalInDOM;
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;

function handleCheckoutClick() {
    if (!cart || cart.length === 0) {
        showToast('Your shopping cart is empty! Please add a jewellery piece first.');
        const drawer = document.getElementById('cartDrawer');
        const backdrop = document.getElementById('cartDrawerBackdrop');
        if (drawer) drawer.classList.add('active');
        if (backdrop) backdrop.classList.add('active');
        return;
    }
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    openCheckoutModal();
}
window.handleCheckoutClick = handleCheckoutClick;

function handlePdpBuyNow() {
    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
    const productId = urlParams ? urlParams.get('id') : null;
    if (productId) {
        const prod = (typeof findProductById === 'function') ? findProductById(productId) : (typeof PRODUCTS !== 'undefined' ? PRODUCTS.find(p => p.id === productId || p.sku === productId) : null);
        if (prod && isProductOutOfStock(prod)) {
            if (typeof showToast === 'function') showToast("This piece is currently out of stock and cannot be purchased.", "warning");
            return;
        }
    }
    const addBtn = document.getElementById('pdpAddToCartBtn');
    if (addBtn && !addBtn.disabled) {
        addBtn.click();
    } else {
        return;
    }
    setTimeout(() => {
        const drawer = document.getElementById('cartDrawer');
        const backdrop = document.getElementById('cartDrawerBackdrop');
        if (drawer) drawer.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        openCheckoutModal();
    }, 180);
}
window.handlePdpBuyNow = handlePdpBuyNow;

function handleModalBuyNow() {
    const addBtn = document.getElementById('modalAddToCartBtn');
    if (addBtn) {
        addBtn.click();
    }
    const qModal = document.getElementById('quickViewBackdrop');
    if (qModal) qModal.classList.remove('active');
    setTimeout(() => {
        const drawer = document.getElementById('cartDrawer');
        const backdrop = document.getElementById('cartDrawerBackdrop');
        if (drawer) drawer.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        openCheckoutModal();
    }, 180);
}
window.handleModalBuyNow = handleModalBuyNow;


// ==========================================
// GST & Tax Helper Functions
// ==========================================
function getGstSettings() {
    const s = (typeof SETTINGS !== 'undefined' && SETTINGS) ? SETTINGS : {};
    const rate = (s.gstRate !== undefined) ? parseFloat(s.gstRate) : 3.0;
    const enabled = (s.gstEnabled !== undefined) ? Boolean(s.gstEnabled) : true;
    return {
        rate: isNaN(rate) ? 3.0 : rate,
        enabled: enabled
    };
}
window.getGstSettings = getGstSettings;


// ==========================================
// Checkout Coupon & Order Totals Engine
// ==========================================
function updateCheckoutCouponUI() {
    const inputWrap = document.getElementById('chkCouponInputWrap');
    const badge = document.getElementById('chkCouponAppliedBadge');
    const codeText = document.getElementById('chkAppliedCouponCodeText');
    const pctText = document.getElementById('chkAppliedCouponPercentText');
    const inputEl = document.getElementById('chkCouponCodeInput');
    const msgEl = document.getElementById('chkCouponMsg');

    if (!inputWrap || !badge) return;

    if (appliedCoupon && appliedCoupon.code) {
        inputWrap.style.display = 'none';
        badge.style.display = 'flex';
        if (codeText) codeText.textContent = appliedCoupon.code;
        if (pctText) pctText.textContent = appliedCoupon.discountPercent;
        if (inputEl) inputEl.value = '';
    } else {
        inputWrap.style.display = 'flex';
        badge.style.display = 'none';
    }
}
window.updateCheckoutCouponUI = updateCheckoutCouponUI;

function updateCheckoutTotals() {
    const subtotalEl = document.getElementById('chkSubtotal');
    const discountEl = document.getElementById('chkDiscount');
    const grandTotalEl = document.getElementById('chkGrandTotal');
    const gstRow = document.getElementById('chkGstRow');
    const gstLabel = document.getElementById('chkGstLabel');
    const gstAmountEl = document.getElementById('chkGstAmount');

    let subtotalINR = 0;
    if (Array.isArray(cart)) {
        cart.forEach(item => {
            const liveProd = (typeof findProductById === 'function') ? findProductById(item.productId) : null;
            const price = liveProd ? liveProd.priceINR : (Number(item.priceINR) || 0);
            subtotalINR += price * (item.qty || 1);
        });
    }

    let discountINR = 0;
    if (appliedCoupon && appliedCoupon.discountPercent) {
        discountINR = Math.round(subtotalINR * (appliedCoupon.discountPercent / 100));
    }
    const taxableAmount = Math.max(0, subtotalINR - discountINR);

    const gstConfig = (typeof getGstSettings === 'function') ? getGstSettings() : { rate: 3, enabled: true };
    let gstAmountINR = 0;
    if (gstConfig.enabled && gstConfig.rate > 0) {
        gstAmountINR = Math.round(taxableAmount * (gstConfig.rate / 100));
    }
    const grandTotal = taxableAmount + gstAmountINR;

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotalINR);
    if (discountEl) {
        if (discountINR > 0) {
            discountEl.textContent = `- ${formatPrice(discountINR)}${appliedCoupon ? ` (${appliedCoupon.code})` : ''}`;
        } else {
            discountEl.textContent = '₹0';
        }
    }

    if (gstRow) {
        if (gstConfig.enabled && gstConfig.rate > 0) {
            gstRow.style.display = 'flex';
            if (gstLabel) gstLabel.textContent = `Applicable GST (${gstConfig.rate}%)`;
            if (gstAmountEl) gstAmountEl.textContent = formatPrice(gstAmountINR);
        } else {
            gstRow.style.display = 'none';
        }
    }

    if (grandTotalEl) grandTotalEl.textContent = formatPrice(grandTotal);

    updateCheckoutCouponUI();
}
window.updateCheckoutTotals = updateCheckoutTotals;

function handleCheckoutApplyCoupon() {
    const inputEl = document.getElementById('chkCouponCodeInput');
    const msgEl = document.getElementById('chkCouponMsg');
    if (!inputEl) return;

    const code = inputEl.value.trim().toUpperCase();
    if (!code) {
        if (msgEl) {
            msgEl.textContent = "Please enter a coupon code.";
            msgEl.style.color = "#ff6b6b";
            msgEl.style.display = "block";
        }
        if (typeof showToast === 'function') showToast("Please enter a valid coupon code.");
        return;
    }

    const couponList = (COUPONS && COUPONS.length) ? COUPONS : [
        { code: 'LAUNCH15', discountPercent: 15, minSpendINR: 0, active: true },
        { code: 'FESTIVE20', discountPercent: 20, minSpendINR: 4000, active: true },
        { code: 'ROYAL10', discountPercent: 10, minSpendINR: 1500, active: true }
    ];

    const found = couponList.find(c => c.active && c.code.toUpperCase() === code);
    if (!found) {
        if (msgEl) {
            msgEl.textContent = `Invalid or expired coupon "${code}". Try LAUNCH15.`;
            msgEl.style.color = "#ff6b6b";
            msgEl.style.display = "block";
        }
        if (typeof showToast === 'function') showToast(`Invalid or expired coupon "${code}". Try LAUNCH15.`);
        return;
    }

    const subtotal = cart.reduce((sum, item) => {
        const liveProd = (typeof findProductById === 'function') ? findProductById(item.productId) : null;
        const price = liveProd ? liveProd.priceINR : (Number(item.priceINR) || 0);
        return sum + price * (item.qty || 1);
    }, 0);

    if (found.minSpendINR && subtotal < found.minSpendINR) {
        const minMsg = `Min spend of ${formatPrice(found.minSpendINR)} required for ${found.code}.`;
        if (msgEl) {
            msgEl.textContent = minMsg;
            msgEl.style.color = "#ffb74d";
            msgEl.style.display = "block";
        }
        if (typeof showToast === 'function') showToast(minMsg);
        return;
    }

    appliedCoupon = found;
    updateCartUI();
    updateCheckoutTotals();

    // Sync cart input if present
    const cartCpnInput = document.getElementById('couponCodeInput');
    if (cartCpnInput) cartCpnInput.value = found.code;

    if (msgEl) {
        msgEl.textContent = `Coupon ${found.code} applied! ${found.discountPercent}% discount granted.`;
        msgEl.style.color = "#81c784";
        msgEl.style.display = "block";
    }
    if (typeof showToast === 'function') {
        showToast(`Coupon ${found.code} applied! ${found.discountPercent}% discount granted.`);
    }
}
window.handleCheckoutApplyCoupon = handleCheckoutApplyCoupon;

function handleCheckoutRemoveCoupon() {
    const prevCode = appliedCoupon ? appliedCoupon.code : '';
    appliedCoupon = null;

    const inputEl = document.getElementById('chkCouponCodeInput');
    if (inputEl) inputEl.value = '';

    const cartCpnInput = document.getElementById('couponCodeInput');
    if (cartCpnInput) cartCpnInput.value = '';

    const msgEl = document.getElementById('chkCouponMsg');
    if (msgEl) {
        msgEl.textContent = prevCode ? `Coupon ${prevCode} removed.` : 'Coupon removed.';
        msgEl.style.color = "rgba(251,248,245,0.7)";
        msgEl.style.display = "block";
        setTimeout(() => {
            if (msgEl) msgEl.style.display = 'none';
        }, 3000);
    }

    updateCartUI();
    updateCheckoutTotals();
    if (typeof showToast === 'function') showToast("Coupon removed.");
}
window.handleCheckoutRemoveCoupon = handleCheckoutRemoveCoupon;

function openCheckoutModal() {
    ensureCheckoutModalInDOM();
    const backdrop = document.getElementById('checkoutModalBackdrop');
    const formView = document.getElementById('checkoutFormView');
    const successView = document.getElementById('checkoutSuccessView');
    const itemsList = document.getElementById('chkItemsList');
    const subtotalEl = document.getElementById('chkSubtotal');
    const discountEl = document.getElementById('chkDiscount');
    const grandTotalEl = document.getElementById('chkGrandTotal');

    if (!backdrop || !formView || !successView) return;

    // Pre-fill user profile info if logged in
    if (currentUser) {
        const nameInp = document.getElementById('chkCustName');
        const emailInp = document.getElementById('chkCustEmail');
        const phoneInp = document.getElementById('chkCustPhone');
        const addrInp = document.getElementById('chkCustAddress');
        const cityInp = document.getElementById('chkCustCity');

        if (nameInp && (!nameInp.value || nameInp.value.trim() === '')) nameInp.value = currentUser.name || '';
        if (emailInp && (!emailInp.value || emailInp.value.trim() === '')) emailInp.value = currentUser.email || '';
        if (phoneInp && (!phoneInp.value || phoneInp.value.trim() === '')) phoneInp.value = currentUser.phone || '';
        if (addrInp && (!addrInp.value || addrInp.value.trim() === '')) addrInp.value = currentUser.address || '';
        if (cityInp && (!cityInp.value || cityInp.value.trim() === '')) cityInp.value = currentUser.city || 'Mumbai';
        const stateInp = document.getElementById('chkCustState');
        const pinInp = document.getElementById('chkCustPincode');
        if (stateInp && (!stateInp.value || stateInp.value.trim() === '')) stateInp.value = currentUser.state || 'Maharashtra';
        if (pinInp && (!pinInp.value || pinInp.value.trim() === '')) pinInp.value = currentUser.pincode || '';
    }

    formView.style.display = 'block';
    successView.style.display = 'none';

    let subtotalINR = 0;
    itemsList.innerHTML = cart.map(item => {
        const liveProd = (typeof findProductById === 'function') ? findProductById(item.productId) : null;
        const prod = liveProd || {
            id: item.productId,
            name: item.name || 'Bespoke Jewellery Piece',
            priceINR: Number(item.priceINR) || 0,
            primaryImg: item.primaryImg || 'assets/hero/hero-slide-1.jpg'
        };
        const price = prod.priceINR || 0;
        const itemTot = price * (item.qty || 1);
        subtotalINR += itemTot;

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${prod.primaryImg || 'assets/hero/hero-slide-1.jpg'}" alt="${(prod.name || '').replace(/"/g, '&quot;')}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(197,160,89,0.2);" onerror="this.onerror=null; this.src='assets/hero/hero-slide-1.jpg';">
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">${(prod.name || 'Bespoke Jewellery').replace(/</g, '&lt;')}</div>
                        <div style="font-size: 0.75rem; color: rgba(251,248,245,0.6);">${item.qty || 1} × ${formatPrice(price)} • ${(item.finish || '24K Gold').replace(/</g, '&lt;')}</div>
                    </div>
                </div>
                <strong style="color: #dfbd7c; font-size: 0.9rem;">${formatPrice(itemTot)}</strong>
            </div>
        `;
    }).join('');

    updateCheckoutTotals();

    backdrop.style.display = 'flex';
    backdrop.classList.add('active');
}

function closeCheckoutModal() {
    const backdrop = document.getElementById('checkoutModalBackdrop');
    if (backdrop) {
        backdrop.style.display = 'none';
        backdrop.classList.remove('active');
    }
    const msgEl = document.getElementById('chkCouponMsg');
    if (msgEl) msgEl.style.display = 'none';
}

function loadRazorpaySdk() {
    return new Promise((resolve) => {
        if (window.Razorpay) return resolve(window.Razorpay);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(window.Razorpay);
        script.onerror = () => {
            console.warn('[Razorpay] SDK network load failed. Running simulated checkout mode.');
            resolve(null);
        };
        document.head.appendChild(script);
    });
}
window.loadRazorpaySdk = loadRazorpaySdk;

function handlePaymentMethodChange(val) {
    const hiddenInp = document.getElementById('chkPaymentMethod');
    if (hiddenInp) hiddenInp.value = val;

    const lblRzp = document.getElementById('lblPayRazorpay');
    const lblCod = document.getElementById('lblPayCOD');
    const btnText = document.getElementById('btnSubmitOrderText');
    const btnIcon = document.getElementById('btnSubmitOrderIcon');

    if (val === 'Razorpay') {
        if (lblRzp) {
            lblRzp.style.background = 'rgba(197,160,89,0.12)';
            lblRzp.style.borderColor = '#c5a059';
        }
        if (lblCod) {
            lblCod.style.background = 'rgba(255,255,255,0.03)';
            lblCod.style.borderColor = 'rgba(255,255,255,0.12)';
        }
        if (btnText) btnText.textContent = 'Pay Securely via Razorpay';
        if (btnIcon) btnIcon.className = 'fa-solid fa-shield-halved';
    } else {
        if (lblCod) {
            lblCod.style.background = 'rgba(197,160,89,0.12)';
            lblCod.style.borderColor = '#c5a059';
        }
        if (lblRzp) {
            lblRzp.style.background = 'rgba(255,255,255,0.03)';
            lblRzp.style.borderColor = 'rgba(255,255,255,0.12)';
        }
        if (btnText) btnText.textContent = 'Complete Order & Reserve';
        if (btnIcon) btnIcon.className = 'fa-solid fa-truck-fast';
    }
}
window.handlePaymentMethodChange = handlePaymentMethodChange;

function finalizeSuccessfulOrder(res, name, finalAmount, paymentId = null) {
    cart = [];
    appliedCoupon = null;
    try { localStorage.setItem('sorevaCart', JSON.stringify([])); } catch (e) {}
    syncCartWithServer();
    updateCartUI();
    broadcastCrossTab('ORDER_COMPLETED', { orderNumber: res.orderNumber });

    // Populate Success View
    const custEl = document.getElementById('successCustName');
    const orderNumEl = document.getElementById('successOrderNum');
    const totalAmtEl = document.getElementById('successTotalAmt');
    const payMethodEl = document.getElementById('successPaymentMethod');
    const payIdRow = document.getElementById('successPaymentIdRow');
    const payIdEl = document.getElementById('successPaymentId');

    if (custEl) custEl.textContent = name;
    if (orderNumEl) orderNumEl.textContent = res.orderNumber || 'SRV-2026-1085';
    if (totalAmtEl) totalAmtEl.textContent = formatPrice(finalAmount);

    if (paymentId) {
        if (payMethodEl) payMethodEl.innerHTML = '<span style="color: #81c784;"><i class="fa-solid fa-circle-check"></i> Razorpay (Verified)</span>';
        if (payIdRow) payIdRow.style.display = 'flex';
        if (payIdEl) payIdEl.textContent = paymentId;
    } else {
        if (payMethodEl) payMethodEl.textContent = 'Cash on Delivery (Insured)';
        if (payIdRow) payIdRow.style.display = 'none';
    }

    document.getElementById('checkoutFormView').style.display = 'none';
    document.getElementById('checkoutSuccessView').style.display = 'block';

    showToast(`Order ${res.orderNumber} confirmed!`);
}

// Indian Postal PIN Code Auto-Lookup & Checkout Validation
let pincodeLookupTimer = null;
async function handlePincodeLookup(pincode) {
    if (!pincode) return;
    const cleanPin = String(pincode).replace(/\D/g, '');
    if (cleanPin.length === 6) {
        clearTimeout(pincodeLookupTimer);
        pincodeLookupTimer = setTimeout(async () => {
            try {
                const resp = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
                        const po = data[0].PostOffice[0];
                        const cityInp = document.getElementById('chkCustCity');
                        const stateInp = document.getElementById('chkCustState');
                        if (cityInp && (!cityInp.value || cityInp.value.trim() === '')) {
                            cityInp.value = po.District || po.Block || po.Name || '';
                        }
                        if (stateInp && (!stateInp.value || stateInp.value.trim() === '')) {
                            stateInp.value = po.State || '';
                        }
                    }
                }
            } catch (e) {
                // Silently fallback to manual entry
            }
        }, 250);
    }
}
window.handlePincodeLookup = handlePincodeLookup;

function showCheckoutError(fieldId, msg) {
    const el = document.getElementById(fieldId);
    if (el) {
        el.style.borderColor = '#e53935';
        el.style.boxShadow = '0 0 10px rgba(229, 57, 53, 0.4)';
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const onInput = () => {
            el.style.borderColor = 'rgba(197, 160, 89, 0.3)';
            el.style.boxShadow = 'none';
            el.removeEventListener('input', onInput);
        };
        el.addEventListener('input', onInput);
    }
    showToast(msg);
}
window.showCheckoutError = showCheckoutError;

async function handlePlaceOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitOrder');
    const originalText = btn.innerHTML;

    const name = document.getElementById('chkCustName').value.trim();
    const email = document.getElementById('chkCustEmail').value.trim();
    const phone = document.getElementById('chkCustPhone').value.trim();
    const address = document.getElementById('chkCustAddress').value.trim();
    const addressLine2 = (document.getElementById('chkCustAddressLine2') ? document.getElementById('chkCustAddressLine2').value.trim() : '');
    const city = document.getElementById('chkCustCity').value.trim();
    const state = (document.getElementById('chkCustState') ? document.getElementById('chkCustState').value.trim() : 'Maharashtra');
    const pincode = (document.getElementById('chkCustPincode') ? document.getElementById('chkCustPincode').value.trim() : '');
    const country = (document.getElementById('chkCustCountry') ? document.getElementById('chkCustCountry').value.trim() : 'India') || 'India';
    const orderNotes = (document.getElementById('chkOrderNotes') ? document.getElementById('chkOrderNotes').value.trim() : '');
    const paymentMethod = (document.getElementById('chkPaymentMethod') ? document.getElementById('chkPaymentMethod').value : 'Razorpay') || 'Razorpay';

    if (!name) {
        showCheckoutError('chkCustName', "Please enter your full name.");
        return;
    }
    if (!email || !email.includes('@')) {
        showCheckoutError('chkCustEmail', "Please enter a valid email address for order confirmation.");
        return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (!phone || cleanPhone.length < 10) {
        showCheckoutError('chkCustPhone', "Please enter a valid 10-digit mobile phone number.");
        return;
    }
    if (!address) {
        showCheckoutError('chkCustAddress', "Please enter your flat / house number and building name.");
        return;
    }
    if (!pincode || pincode.replace(/\D/g, '').length < 6) {
        showCheckoutError('chkCustPincode', "Please enter your 6-digit postal PIN code.");
        return;
    }
    if (!city) {
        showCheckoutError('chkCustCity', "Please enter your town / city.");
        return;
    }
    if (!state) {
        showCheckoutError('chkCustState', "Please enter your state / province.");
        return;
    }

    if (!cart || cart.length === 0) {
        alert("Your shopping cart is empty! Please add a jewellery piece before placing an order.");
        return;
    }

    let subtotalINR = 0;
    const orderItems = cart.map(it => {
        const liveProd = (typeof findProductById === 'function') ? findProductById(it.productId) : null;
        const price = liveProd ? liveProd.priceINR : (Number(it.priceINR) || 0);
        subtotalINR += price * (it.qty || 1);
        return {
            productId: it.productId,
            name: liveProd ? liveProd.name : (it.name || 'Jewellery Piece'),
            finish: it.finish || '24K Gold',
            qty: it.qty || 1,
            price: price
        };
    });

    let discountINR = 0;
    if (appliedCoupon && appliedCoupon.discountPercent) {
        discountINR = Math.round(subtotalINR * (appliedCoupon.discountPercent / 100));
    }
    const taxableAmount = Math.max(0, subtotalINR - discountINR);

    const gstConfig = getGstSettings();
    let gstAmountINR = 0;
    if (gstConfig.enabled && gstConfig.rate > 0) {
        gstAmountINR = Math.round(taxableAmount * (gstConfig.rate / 100));
    }
    const finalAmount = taxableAmount + gstAmountINR;

    // -----------------------------------------------------------
    // RAZORPAY GATEWAY CHECKOUT FLOW
    // -----------------------------------------------------------
    if (paymentMethod === 'Razorpay') {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Connecting to Razorpay...</span>`;

        try {
            // 1. Create Order on Backend
            const orderResp = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalAmount,
                    notes: {
                        customerName: name,
                        customerEmail: email,
                        customerPhone: phone
                    }
                })
            });

            const orderData = await orderResp.json();
            if (!orderData.success) {
                throw new Error(orderData.error || 'Failed to initialize Razorpay transaction');
            }

            // 2. Ensure Razorpay Checkout SDK is ready
            const RazorpaySDK = await loadRazorpaySdk();

            if (RazorpaySDK && !orderData.isMock) {
                // Official Razorpay Checkout Modal
                const options = {
                    key: orderData.keyId,
                    amount: orderData.amount,
                    currency: orderData.currency || "INR",
                    name: orderData.merchantName || "Sorèva Luxury Jewellery",
                    description: `Atelier Order for ${name}`,
                    image: "/assets/logo-black.png",
                    order_id: orderData.orderId,
                    handler: async function (response) {
                        btn.disabled = true;
                        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Verifying Payment...</span>`;
                        try {
                            const verifyResp = await fetch('/api/razorpay/verify-payment', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature || '',
                                    customerName: name,
                                    customerEmail: email,
                                    customerPhone: phone,
                                    shippingAddress: address,
                                    addressLine2: addressLine2,
                                    city: city,
                                    state: state,
                                    pincode: pincode,
                                    country: country,
                                    orderNotes: orderNotes,
                                    subtotalAmount: subtotalINR,
                                    discountAmount: discountINR,
                                    gstAmount: gstAmountINR,
                                    gstRate: gstConfig.rate,
                                    couponCode: (appliedCoupon ? appliedCoupon.code : ''),
                                    items: orderItems,
                                    totalAmount: finalAmount
                                })
                            });
                            const verifyRes = await verifyResp.json();
                            if (verifyRes.success) {
                                finalizeSuccessfulOrder(verifyRes, name, finalAmount, response.razorpay_payment_id);
                            } else {
                                alert("Payment verification issue: " + (verifyRes.error || "Please contact atelier support"));
                                btn.disabled = false;
                                btn.innerHTML = originalText;
                            }
                        } catch (err) {
                            alert("Verification error: " + err.message);
                            btn.disabled = false;
                            btn.innerHTML = originalText;
                        }
                    },
                    prefill: {
                        name: name,
                        email: email,
                        contact: phone
                    },
                    notes: {
                        address: address,
                        city: city
                    },
                    theme: {
                        color: orderData.themeColor || "#38302e"
                    },
                    modal: {
                        ondismiss: function () {
                            btn.disabled = false;
                            btn.innerHTML = originalText;
                            showToast("Razorpay checkout window closed. Cart saved.");
                        }
                    }
                };

                const rzpInstance = new RazorpaySDK(options);
                rzpInstance.on('payment.failed', function (resp) {
                    alert("Payment Declined: " + (resp.error.description || "Bank declined transaction. Please try another card or UPI."));
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                });
                rzpInstance.open();
            } else {
                // Instant Interactive Sandbox Flow (when keys are in test/demo mode)
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Verifying Secure Payment...</span>`;
                const simPaymentId = "pay_" + Math.random().toString(36).substring(2, 12).toUpperCase();
                
                const verifyResp = await fetch('/api/razorpay/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: orderData.orderId,
                        razorpay_payment_id: simPaymentId,
                        razorpay_signature: 'sandbox_verified_signature',
                        customerName: name,
                        customerEmail: email,
                        customerPhone: phone,
                        shippingAddress: address,
                        addressLine2: addressLine2,
                        city: city,
                        state: state,
                        pincode: pincode,
                        country: country,
                        orderNotes: orderNotes,
                        subtotalAmount: subtotalINR,
                        discountAmount: discountINR,
                        couponCode: (appliedCoupon ? appliedCoupon.code : ''),
                        items: orderItems,
                        totalAmount: finalAmount
                    })
                });
                const verifyRes = await verifyResp.json();
                if (verifyRes.success) {
                    finalizeSuccessfulOrder(verifyRes, name, finalAmount, simPaymentId);
                } else {
                    throw new Error(verifyRes.error || "Failed to finalize order");
                }
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        } catch (err) {
            alert("Payment error: " + err.message);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
        return;
    }

    // -----------------------------------------------------------
    // CASH ON DELIVERY (INSURED) FLOW
    // -----------------------------------------------------------
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Reserving & Placing Order...</span>`;

    try {
        const resp = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                shippingAddress: address,
                addressLine2: addressLine2,
                city: city,
                state: state,
                pincode: pincode,
                country: country,
                orderNotes: orderNotes,
                subtotalAmount: subtotalINR,
                discountAmount: discountINR,
                couponCode: (appliedCoupon ? appliedCoupon.code : ''),
                paymentMethod: paymentMethod,
                items: orderItems,
                totalAmount: finalAmount
            })
        });

        const res = await resp.json();
        if (res.success) {
            finalizeSuccessfulOrder(res, name, finalAmount, null);
        } else {
            alert("Order could not be processed: " + (res.error || "Please check server connection"));
        }
    } catch (err) {
        alert("Checkout network error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}


// ==========================================
// SORÈVA CLIENT AUTHENTICATION & CART SYNC
// ==========================================

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

async function syncCartWithServer() {
    // 1. Immediately persist to localStorage
    try {
        localStorage.setItem('sorevaCart', JSON.stringify(cart));
    } catch (e) {
        console.warn('[Cart LocalStorage Error]', e);
    }

    // 2. Broadcast to all open tabs immediately
    broadcastCrossTab('CART_UPDATED', { cart: cart });

    // 3. Persist to SQLite database if logged in
    if (!authToken) return;
    try {
        const resp = await fetch('/api/cart/sync', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ items: cart })
        });
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            console.warn('[Cart Database Sync Warning]', data.error || resp.statusText);
        }
    } catch (err) {
        console.warn('[Cart Database Sync Offline]', err);
    }
}

function mergeLocalAndServerCarts(localItems, serverItems) {
    const map = {};
    (serverItems || []).forEach(it => {
        const pid = String(it.productId || it.id || '').trim();
        if (!pid) return;
        const finish = it.finish || '24K Gold';
        const qty = parseInt(it.qty || it.quantity || 1);
        const k = `${pid}_${finish}`;
        map[k] = { 
            productId: pid, 
            finish, 
            qty,
            name: it.name || '',
            priceINR: Number(it.priceINR || it.price) || 0,
            primaryImg: it.primaryImg || it.image || ''
        };
    });
    (localItems || []).forEach(it => {
        const pid = String(it.productId || it.id || '').trim();
        if (!pid) return;
        const finish = it.finish || '24K Gold';
        const qty = parseInt(it.qty || it.quantity || 1);
        const k = `${pid}_${finish}`;
        if (map[k]) {
            map[k].qty = Math.min(20, Math.max(map[k].qty, qty));
            if (!map[k].name && it.name) map[k].name = it.name;
            if (!map[k].priceINR && it.priceINR) map[k].priceINR = Number(it.priceINR) || 0;
            if (!map[k].primaryImg && it.primaryImg) map[k].primaryImg = it.primaryImg;
        } else {
            map[k] = { 
                productId: pid, 
                finish, 
                qty: Math.min(20, qty),
                name: it.name || '',
                priceINR: Number(it.priceINR || it.price) || 0,
                primaryImg: it.primaryImg || it.image || ''
            };
        }
    });
    return Object.values(map);
}

function getInitials(name) {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function ensureAuthModalInDOM() {
    if (document.getElementById('authModalBackdrop')) return;
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-backdrop';
    modalEl.id = 'authModalBackdrop';
    modalEl.innerHTML = `
        <div class="auth-modal-card" id="authModalCard">
            <div class="auth-modal-header">
                <button class="auth-modal-close" id="authModalClose" aria-label="Close Modal" onclick="closeAuthModal()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="auth-brand-badge">
                    <i class="fa-solid fa-gem"></i>
                    <span>Sorèva Client Privileges</span>
                </div>
                <h3 class="auth-modal-title" id="authModalTitle">Welcome to Sorèva</h3>
                <p class="auth-modal-sub" id="authModalSub">Sign in to synchronize your bespoke jewellery cart and order privileges.</p>
            </div>

            <div class="auth-tab-bar">
                <button type="button" class="auth-tab-btn active" id="tabBtnSignIn" onclick="switchAuthTab('signin')">Sign In</button>
                <button type="button" class="auth-tab-btn" id="tabBtnRegister" onclick="switchAuthTab('register')">Create Account</button>
            </div>

            <div class="auth-form-body">
                <div class="auth-alert-box" id="authAlertBox"></div>

                <!-- Sign In Form -->
                <form id="signInForm" onsubmit="handleSignInSubmit(event)">
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="loginEmail">Email Address</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-regular fa-envelope auth-input-icon"></i>
                            <input type="email" id="loginEmail" class="auth-input" placeholder="e.g. client@soreva.in" required autocomplete="email">
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="loginPassword">Password</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-solid fa-lock auth-input-icon"></i>
                            <input type="password" id="loginPassword" class="auth-input" placeholder="Enter your account password" required autocomplete="current-password">
                            <button type="button" class="auth-password-toggle" onclick="toggleAuthPasswordVisibility('loginPassword', this)">
                                <i class="fa-regular fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="auth-submit-btn" id="btnSubmitLogin">
                        <span>Sign In to Sorèva</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                    <div class="auth-footer-notes">
                        <span>New to the Maison? </span>
                        <a href="javascript:void(0)" onclick="switchAuthTab('register')">Create an Account</a>
                    </div>
                </form>

                <!-- Register Form -->
                <form id="registerForm" style="display: none;" onsubmit="handleRegisterSubmit(event)">
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="regName">Full Name</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-regular fa-user auth-input-icon"></i>
                            <input type="text" id="regName" class="auth-input" placeholder="e.g. Sonal Belchada" required autocomplete="name">
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="regEmail">Email Address</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-regular fa-envelope auth-input-icon"></i>
                            <input type="email" id="regEmail" class="auth-input" placeholder="e.g. sonal@soreva.in" required autocomplete="email">
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="regPhone">Mobile Number (For Concierge Updates)</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-solid fa-phone auth-input-icon"></i>
                            <input type="tel" id="regPhone" class="auth-input" placeholder="+91 98765 43210" autocomplete="tel">
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="regPassword">Create Password</label>
                        <div class="auth-input-wrapper">
                            <i class="fa-solid fa-lock auth-input-icon"></i>
                            <input type="password" id="regPassword" class="auth-input" placeholder="Minimum 6 characters" minlength="6" required autocomplete="new-password">
                            <button type="button" class="auth-password-toggle" onclick="toggleAuthPasswordVisibility('regPassword', this)">
                                <i class="fa-regular fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <button type="submit" class="auth-submit-btn" id="btnSubmitRegister">
                        <span>Create Maison Account</span>
                        <i class="fa-solid fa-gem"></i>
                    </button>
                    <div class="auth-footer-notes">
                        <span>Already registered? </span>
                        <a href="javascript:void(0)" onclick="switchAuthTab('signin')">Sign In</a>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modalEl);

    // Close on backdrop click
    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) closeAuthModal();
    });
}

function openAuthModal(tab = 'signin') {
    ensureAuthModalInDOM();
    switchAuthTab(tab);
    const backdrop = document.getElementById('authModalBackdrop');
    if (backdrop) {
        backdrop.style.display = 'flex';
        void backdrop.offsetWidth;
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    const alertBox = document.getElementById('authAlertBox');
    if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.className = 'auth-alert-box';
    }
}

function closeAuthModal() {
    const backdrop = document.getElementById('authModalBackdrop');
    if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
    }
}

window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleUserLogout = handleUserLogout;
window.handleSignInSubmit = handleSignInSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.toggleAuthPasswordVisibility = toggleAuthPasswordVisibility;
window.openCartDrawerFromAccount = openCartDrawerFromAccount;

function switchAuthTab(tab) {
    const signInForm = document.getElementById('signInForm');
    const regForm = document.getElementById('registerForm');
    const tabSignIn = document.getElementById('tabBtnSignIn');
    const tabReg = document.getElementById('tabBtnRegister');
    const title = document.getElementById('authModalTitle');
    const sub = document.getElementById('authModalSub');
    const alertBox = document.getElementById('authAlertBox');

    if (alertBox) {
        alertBox.style.display = 'none';
        alertBox.className = 'auth-alert-box';
    }

    if (tab === 'register') {
        if (signInForm) signInForm.style.display = 'none';
        if (regForm) regForm.style.display = 'block';
        if (tabSignIn) tabSignIn.classList.remove('active');
        if (tabReg) tabReg.classList.add('active');
        if (title) title.textContent = 'Create Maison Account';
        if (sub) sub.textContent = 'Register to retain your bespoke jewellery cart and exclusive privileges.';
    } else {
        if (signInForm) signInForm.style.display = 'block';
        if (regForm) regForm.style.display = 'none';
        if (tabSignIn) tabSignIn.classList.add('active');
        if (tabReg) tabReg.classList.remove('active');
        if (title) title.textContent = 'Welcome Back';
        if (sub) sub.textContent = 'Sign in to access your bespoke cart and saved orders.';
    }
}

function toggleAuthPasswordVisibility(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    const icon = btn.querySelector('i');
    if (inp.type === 'password') {
        inp.type = 'text';
        if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        }
    } else {
        inp.type = 'password';
        if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
}

function showAuthAlert(msg, type = 'error') {
    const alertBox = document.getElementById('authAlertBox');
    if (!alertBox) return;
    alertBox.className = `auth-alert-box ${type}`;
    const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
    alertBox.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(msg)}</span>`;
    alertBox.style.display = 'flex';
}

async function handleSignInSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitLogin');
    const email = (document.getElementById('loginEmail')?.value || '').trim();
    const password = (document.getElementById('loginPassword')?.value || '').trim();

    if (!email || !password) {
        showAuthAlert('Please enter both email and password.', 'error');
        return;
    }

    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Verifying...</span>';

    try {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, guestCart: cart })
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('soreva_auth_token', authToken);
            localStorage.setItem('soreva_user', JSON.stringify(currentUser));
            if (data.cart) {
                cart = data.cart;
                localStorage.setItem('sorevaCart', JSON.stringify(cart));
            }
            closeAuthModal();
            updateUserUI();
            updateCartUI();
            broadcastCrossTab('USER_LOGGED_IN', { user: currentUser, token: authToken, cart: cart });
            showToast(data.message || `Welcome back, ${currentUser.name}!`);
        } else {
            showAuthAlert(data.error || 'Authentication failed. Please verify credentials.', 'error');
        }
    } catch (err) {
        showAuthAlert('Network error while signing in. Please check connection.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitRegister');
    const name = (document.getElementById('regName')?.value || '').trim();
    const email = (document.getElementById('regEmail')?.value || '').trim();
    const phone = (document.getElementById('regPhone')?.value || '').trim();
    const password = (document.getElementById('regPassword')?.value || '').trim();

    if (!name || !email || !password) {
        showAuthAlert('Please complete all required fields.', 'error');
        return;
    }

    const origText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Creating Account...</span>';

    try {
        const resp = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password, cart })
        });
        const data = await resp.json();
        if (resp.ok && data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('soreva_auth_token', authToken);
            localStorage.setItem('soreva_user', JSON.stringify(currentUser));
            if (data.cart) {
                cart = data.cart;
                localStorage.setItem('sorevaCart', JSON.stringify(cart));
            }
            closeAuthModal();
            updateUserUI();
            updateCartUI();
            broadcastCrossTab('USER_LOGGED_IN', { user: currentUser, token: authToken, cart: cart });
            showToast(data.message || `Welcome to Sorèva, ${currentUser.name}!`);
        } else {
            showAuthAlert(data.error || 'Registration failed. Please check information.', 'error');
        }
    } catch (err) {
        showAuthAlert('Network error while creating account. Please retry.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origText;
    }
}

async function handleUserLogout() {
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown) dropdown.classList.remove('active');

    try {
        if (authToken) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }
    } catch (e) {
        // Continue logout locally
    }

    localStorage.removeItem('soreva_auth_token');
    localStorage.removeItem('soreva_user');
    authToken = null;
    currentUser = null;
    updateUserUI();
    updateCartUI();
    broadcastCrossTab('USER_LOGGED_OUT');
    showToast('You have signed out. Your cart remains safely preserved in your Sorèva account.');
}

function openCartDrawerFromAccount() {
    const dropdown = document.getElementById('userDropdownMenu');
    if (dropdown) dropdown.classList.remove('active');
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer && backdrop) {
        drawer.classList.add('active');
        backdrop.classList.add('active');
    }
}

function updateCartAuthBanner() {
    let banner = document.getElementById('cartAuthBanner');
    const drawer = document.getElementById('cartDrawer');
    if (!drawer) return;
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'cartAuthBanner';
        const meter = drawer.querySelector('.shipping-meter');
        if (meter) {
            meter.after(banner);
        } else {
            const header = drawer.querySelector('.drawer-header');
            if (header) header.after(banner);
        }
    }
    if (currentUser) {
        banner.className = 'cart-auth-banner logged-in';
        banner.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-cloud-check" style="color:var(--gold-accent);"></i>
                <span>Cart synced to <strong>${escapeHtml(currentUser.name)}</strong></span>
            </div>
            <a href="javascript:void(0)" onclick="handleUserLogout()" style="font-size:0.75rem; color:#888; text-decoration:underline;">Logout</a>
        `;
    } else {
        banner.className = 'cart-auth-banner guest';
        banner.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <i class="fa-regular fa-user" style="color:var(--gold-accent);"></i>
                <span><a href="javascript:void(0)" onclick="openAuthModal('signin')">Sign In</a> to save cart across devices</span>
            </div>
            <span style="font-size:0.72rem; color:var(--text-muted);">Guest Session</span>
        `;
    }
}

function handleHeaderAuthClick(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const dropdown = document.getElementById('userDropdownMenu');
    if (currentUser) {
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    } else {
        openAuthModal('signin');
    }
}
window.handleHeaderAuthClick = handleHeaderAuthClick;

function initHeaderAuth() {
    let container = document.getElementById('userAccountContainer');
    if (!container) {
        const headerActions = document.querySelector('.header-actions-right');
        if (headerActions) {
            container = document.createElement('div');
            container.className = 'user-account-container';
            container.id = 'userAccountContainer';
            container.innerHTML = `
                <button class="header-auth-pill" id="headerAuthBtn" onclick="handleHeaderAuthClick(event)" aria-label="Sign In / Client Account" title="Sign In to Sorèva">
                    <i class="fa-regular fa-user" id="userAuthIcon"></i>
                    <span class="user-avatar-initials" id="userAvatarBadge" style="display: none;"></span>
                    <span class="auth-btn-text" id="authBtnText">Sign In</span>
                </button>
                <div class="user-dropdown-menu" id="userDropdownMenu">
                    <div class="user-dropdown-header">
                        <div class="user-dropdown-avatar" id="userDropdownAvatar">S</div>
                        <div class="user-dropdown-info">
                            <span class="user-dropdown-name" id="userDropdownName">Valued Client</span>
                            <span class="user-dropdown-email" id="userDropdownEmail">client@soreva.in</span>
                        </div>
                    </div>
                    <ul class="user-dropdown-items">
                        <li>
                            <button type="button" class="user-dropdown-link" onclick="openCartDrawerFromAccount()">
                                <i class="fa-solid fa-cart-shopping"></i>
                                <span>Shopping Cart (<strong class="cart-count-badge">0</strong>)</span>
                            </button>
                        </li>
                        <li>
                            <button type="button" class="user-dropdown-link logout-link" onclick="handleUserLogout()">
                                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                                <span>Sign Out</span>
                            </button>
                        </li>
                    </ul>
                </div>
            `;
            const cartBtn = headerActions.querySelector('.cart-open-btn');
            if (cartBtn) {
                headerActions.insertBefore(container, cartBtn);
            } else {
                headerActions.appendChild(container);
            }
        }
    }

    const authBtn = document.getElementById('headerAuthBtn');
    const dropdown = document.getElementById('userDropdownMenu');

    if (authBtn) {
        authBtn.onclick = (e) => {
            handleHeaderAuthClick(e);
        };
    }

    if (dropdown && container) {
        document.addEventListener('click', (e) => {
            if (dropdown.classList.contains('active')) {
                if (!container.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            }
        });
    }

    updateUserUI();
}

function updateUserUI() {
    const authBtn = document.getElementById('headerAuthBtn');
    const icon = document.getElementById('userAuthIcon');
    const badge = document.getElementById('userAvatarBadge');
    const btnText = document.getElementById('authBtnText');
    const dropdownName = document.getElementById('userDropdownName');
    const dropdownEmail = document.getElementById('userDropdownEmail');
    const dropdownAvatar = document.getElementById('userDropdownAvatar');
    const countBadges = document.querySelectorAll('.cart-count-badge');

    const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
    countBadges.forEach(b => b.textContent = totalItems);

    if (currentUser) {
        const fullName = (currentUser.name || 'Valued Client').trim();
        const initials = getInitials(fullName);
        if (authBtn) {
            authBtn.classList.add('logged-in');
            authBtn.title = `Signed in as ${fullName} (${currentUser.email || ''})`;
        }
        if (icon) icon.style.display = 'none';
        if (badge) {
            badge.style.display = 'inline-flex';
            badge.textContent = initials;
        }
        if (btnText) {
            btnText.innerHTML = `<span class="auth-greeting">Hi, </span><span class="auth-user-name">${escapeHtml(fullName)}</span> <i class="fa-solid fa-chevron-down" style="font-size: 0.65rem; margin-left: 3px; opacity: 0.7;"></i>`;
        }
        if (dropdownName) dropdownName.textContent = fullName;
        if (dropdownEmail) dropdownEmail.textContent = currentUser.email || '';
        if (dropdownAvatar) dropdownAvatar.textContent = initials;
    } else {
        if (authBtn) {
            authBtn.classList.remove('logged-in');
            authBtn.title = 'Sign In to Sorèva';
        }
        if (icon) icon.style.display = 'inline-block';
        if (badge) badge.style.display = 'none';
        if (btnText) {
            btnText.innerHTML = 'Sign In';
        }
        if (dropdownName) dropdownName.textContent = 'Valued Client';
        if (dropdownEmail) dropdownEmail.textContent = 'client@soreva.in';
        if (dropdownAvatar) dropdownAvatar.textContent = 'S';
    }
    updateCartAuthBanner();
}

async function initAuth() {
    ensureAuthModalInDOM();
    ensureCheckoutModalInDOM();
    initHeaderAuth();

    if (authToken) {
        try {
            const resp = await fetch('/api/auth/me', {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data.authenticated && data.user) {
                    currentUser = data.user;
                    try { localStorage.setItem('soreva_user', JSON.stringify(currentUser)); } catch (e) {}
                    if (data.cart && data.cart.length > 0) {
                        if (!cart || cart.length === 0) {
                            cart = data.cart;
                            try { localStorage.setItem('sorevaCart', JSON.stringify(cart)); } catch (e) {}
                        } else {
                            cart = mergeLocalAndServerCarts(cart, data.cart);
                            try { localStorage.setItem('sorevaCart', JSON.stringify(cart)); } catch (e) {}
                            syncCartWithServer();
                        }
                    } else if (cart && cart.length > 0) {
                        syncCartWithServer();
                    }
                    updateUserUI();
                    updateCartUI();
                } else if (data.authenticated === false) {
                    // Only revoke if server explicitly reports false
                    localStorage.removeItem('soreva_auth_token');
                    localStorage.removeItem('soreva_user');
                    authToken = null;
                    currentUser = null;
                    updateUserUI();
                    broadcastCrossTab('USER_LOGGED_OUT');
                }
            } else if (resp.status === 401) {
                // Explicit 401 Unauthorized
                localStorage.removeItem('soreva_auth_token');
                localStorage.removeItem('soreva_user');
                authToken = null;
                currentUser = null;
                updateUserUI();
                broadcastCrossTab('USER_LOGGED_OUT');
            } else {
                // Non-fatal HTTP status (500, 502, 503): DO NOT LOG OFF, keep cached session!
                console.warn('[Auth Server Response Non-Fatal]', resp.status);
            }
        } catch (e) {
            // Network drops/offline: Keep local session active
            console.warn('[Auth Check Offline / Keeping Local Session]', e);
        }
    }
}

// Immediate eager execution to guarantee user name and logged-in status are shown without delay
if (typeof document !== 'undefined') {
    if (document.readyState !== 'loading') {
        initAuth();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            initAuth();
        });
    }
}


// ==========================================
// Robust Product Matcher (Handles exact, czm_ prefix, and SKU)
// ==========================================
function findProductById(pid) {
    if (!pid || typeof PRODUCTS === 'undefined' || !Array.isArray(PRODUCTS) || !PRODUCTS.length) return null;
    const strPid = String(pid).trim();
    const cleanNum = strPid.replace(/^czm_/, '');

    // 1. Direct exact match
    let found = PRODUCTS.find(p => String(p.id).trim() === strPid);
    if (found) return found;

    // 2. Clean numeric match (e.g. 41673 vs czm_41673)
    found = PRODUCTS.find(p => {
        const pIdStr = String(p.id).trim();
        const pClean = pIdStr.replace(/^czm_/, '');
        return pClean === cleanNum || pIdStr === `czm_${cleanNum}`;
    });
    if (found) return found;

    // 3. Match by SKU
    found = PRODUCTS.find(p => p.sku && (String(p.sku).trim() === strPid || String(p.sku).replace(/^CZM-/, '') === cleanNum));
    return found || null;
}
window.findProductById = findProductById;

function openCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer && backdrop) {
        drawer.classList.add('active');
        backdrop.classList.add('active');
    }
}
function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer && backdrop) {
        drawer.classList.remove('active');
        backdrop.classList.remove('active');
    }
}
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;

function addToCart(productId, finish = "24K Gold", quantity = 1) {
    if (typeof finish === 'number') {
        const temp = finish;
        finish = (typeof quantity === 'string' && quantity) ? quantity : "24K Gold";
        quantity = temp;
    }
    if (!finish || typeof finish !== 'string') finish = "24K Gold";
    if (!quantity || isNaN(quantity) || quantity < 1) quantity = 1;
    const pid = String(productId).trim();
    const prodCheck = (typeof findProductById === 'function') ? findProductById(pid) : (typeof PRODUCTS !== 'undefined' ? PRODUCTS.find(p => String(p.id).trim() === pid || String(p.sku).trim() === pid) : null);
    if (prodCheck && isProductOutOfStock(prodCheck)) {
        if (typeof showToast === 'function') showToast("Sorry, this item is currently out of stock.", "warning");
        return;
    }

    const prod = (typeof findProductById === 'function') ? findProductById(pid) : null;
    if (prod && prod.plating && (!finish || finish === "24K Gold" || finish === "gold")) {
        finish = formatPlating(prod.plating);
    }

    const existing = cart.find(item => {
        const itemClean = String(item.productId).replace(/^czm_/, '');
        const pidClean = pid.replace(/^czm_/, '');
        return (String(item.productId) === pid || itemClean === pidClean) && item.finish === finish;
    });

    if (existing) {
        existing.qty = (parseInt(existing.qty) || 0) + quantity;
        if (prod) {
            existing.name = prod.name;
            existing.priceINR = prod.priceINR;
            if (prod.primaryImg) existing.primaryImg = prod.primaryImg;
        }
    } else {
        cart.push({
            productId: pid,
            finish,
            qty: quantity,
            name: prod ? prod.name : '',
            priceINR: prod ? prod.priceINR : 0,
            primaryImg: prod ? prod.primaryImg : ''
        });
    }

    syncCartWithServer();
    updateCartUI();
    if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
    if (typeof refreshCheckoutModalIfOpen === 'function') refreshCheckoutModalIfOpen();

    if (typeof showToast === 'function') showToast("Added to your shopping cart!");

    // Open drawer automatically for smooth feedback
    openCartDrawer();
}
window.addToCart = addToCart;

function updateCartQty(index, delta) {
    if (!Array.isArray(cart) || !cart[index]) return;
    cart[index].qty = (parseInt(cart[index].qty) || 1) + delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    syncCartWithServer();
    updateCartUI();
    if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
    if (typeof refreshCheckoutModalIfOpen === 'function') refreshCheckoutModalIfOpen();
}
window.updateCartQty = updateCartQty;

function removeFromCart(index) {
    if (!Array.isArray(cart) || !cart[index]) return;
    cart.splice(index, 1);
    syncCartWithServer();
    updateCartUI();
    if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
    if (typeof refreshCheckoutModalIfOpen === 'function') refreshCheckoutModalIfOpen();
    if (typeof showToast === 'function') showToast("Item removed from cart.");
}
window.removeFromCart = removeFromCart;

function clearCart() {
    cart = [];
    appliedCoupon = null;
    syncCartWithServer();
    updateCartUI();
    if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
    if (typeof refreshCheckoutModalIfOpen === 'function') refreshCheckoutModalIfOpen();
    if (typeof showToast === 'function') showToast("Cart cleared.");
}
window.clearCart = clearCart;

function updateCartUI() {
    const list = document.getElementById('cartItemsList');
    const countBadges = document.querySelectorAll('.cart-count-badge');
    const subtotalEl = document.getElementById('cartSubtotal');
    const discountEl = document.getElementById('cartDiscount');
    const totalEl = document.getElementById('cartTotal');
    const shippingMeterText = document.getElementById('shippingMeterText');
    const shippingProgressFill = document.getElementById('shippingProgressFill');

    // Total Count across all items
    const totalItems = (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + (parseInt(item.qty) || 1), 0);
    countBadges.forEach(badge => {
        badge.textContent = totalItems;
    });

    if (!list) return;

    if (!cart || cart.length === 0) {
        list.innerHTML = `
            <div class="cart-empty-state">
                <i class="fa-solid fa-cart-shopping"></i>
                <h4>Your Cart is Empty</h4>
                <p>Discover our exquisite Cubic Zirconia collections and elevate your everyday style.</p>
            </div>
        `;
        if (subtotalEl) subtotalEl.textContent = formatPrice(0);
        if (discountEl) discountEl.textContent = formatPrice(0);
        if (totalEl) totalEl.textContent = formatPrice(0);
        if (shippingProgressFill) shippingProgressFill.style.width = '0%';
        if (shippingMeterText) shippingMeterText.textContent = `Add ${formatPrice(FREE_SHIPPING_THRESHOLD_INR)} for Free Express Shipping`;
        return;
    }

    let subtotalINR = 0;

    list.innerHTML = cart.map((item, idx) => {
        const liveProd = (typeof findProductById === 'function') ? findProductById(item.productId) : null;
        const product = liveProd || {
            id: item.productId,
            name: item.name || 'Bespoke Jewellery Piece',
            priceINR: Number(item.priceINR) || 0,
            primaryImg: item.primaryImg || 'assets/hero/hero-slide-1.jpg'
        };

        // Keep snapshot fresh
        if (liveProd) {
            item.name = liveProd.name;
            item.priceINR = liveProd.priceINR;
            if (liveProd.primaryImg) item.primaryImg = liveProd.primaryImg;
        }

        const itemTotalINR = (product.priceINR || 0) * (item.qty || 1);
        subtotalINR += itemTotalINR;

        return `
            <div class="cart-item" data-index="${idx}" data-product-id="${item.productId}">
                <img class="cart-item-thumb" src="${product.primaryImg || 'assets/hero/hero-slide-1.jpg'}" alt="${(product.name || '').replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='assets/hero/hero-slide-1.jpg';">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${(product.name || 'Bespoke Jewellery').replace(/</g, '&lt;')}</h4>
                    <p class="cart-item-variant">Finish: <strong>${(item.finish || '24K Gold').replace(/</g, '&lt;')}</strong></p>
                    <div class="cart-item-bottom">
                        <div class="cart-qty-control">
                            <button class="qty-btn" onclick="updateCartQty(${idx}, -1)" aria-label="Decrease quantity">-</button>
                            <span class="qty-val">${item.qty}</span>
                            <button class="qty-btn" onclick="updateCartQty(${idx}, 1)" aria-label="Increase quantity">+</button>
                        </div>
                        <span class="cart-item-price">${formatPrice(itemTotalINR)}</span>
                        <button class="btn-remove-item" onclick="removeFromCart(${idx})" title="Remove item" aria-label="Remove item">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Re-check coupon minimum spend
    if (appliedCoupon && appliedCoupon.minSpendINR && subtotalINR < appliedCoupon.minSpendINR) {
        if (typeof showToast === 'function') {
            showToast(`Coupon ${appliedCoupon.code} removed: min spend of ${formatPrice(appliedCoupon.minSpendINR)} required.`);
        }
        appliedCoupon = null;
        const couponInput = document.getElementById('couponCodeInput');
        if (couponInput) couponInput.value = '';
    }

    // Calculations
    let discountINR = 0;
    if (appliedCoupon && appliedCoupon.discountPercent) {
        discountINR = Math.round((subtotalINR * appliedCoupon.discountPercent) / 100);
    }
    const finalTotalINR = Math.max(0, subtotalINR - discountINR);

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotalINR);
    if (discountEl) discountEl.textContent = appliedCoupon ? `-${formatPrice(discountINR)} (${appliedCoupon.code})` : formatPrice(0);
    if (totalEl) totalEl.textContent = formatPrice(finalTotalINR);

    // Free Shipping Progress
    const remainingINR = FREE_SHIPPING_THRESHOLD_INR - subtotalINR;
    if (remainingINR <= 0) {
        if (shippingProgressFill) shippingProgressFill.style.width = '100%';
        if (shippingMeterText) shippingMeterText.innerHTML = `<span>🎉 You have unlocked <strong>Free Express Shipping</strong>!</span>`;
    } else {
        const pct = Math.min(100, Math.round((subtotalINR / FREE_SHIPPING_THRESHOLD_INR) * 100));
        if (shippingProgressFill) shippingProgressFill.style.width = `${pct}%`;
        if (shippingMeterText) shippingMeterText.innerHTML = `<span>Add <strong>${formatPrice(remainingINR)}</strong> more for Free Express Shipping</span>`;
    }
}
window.updateCartUI = updateCartUI;

// ==========================================
// ==========================================
// Wishlist Engine (Persistent Drawer & Favourites)
// ==========================================
function toggleWishlist(productId) {
    if (!productId) return;
    const pStr = String(productId);
    const idx = wishlist.findIndex(id => String(id) === pStr);
    let added = false;

    if (idx > -1) {
        wishlist.splice(idx, 1);
        showToast("Removed from your favourites");
    } else {
        wishlist.push(pStr);
        showToast("Saved to your favourites!");
        added = true;
    }

    try {
        localStorage.setItem('soreva_wishlist', JSON.stringify(wishlist));
    } catch (e) {}

    updateWishlistUI();

    // Update heart icons on all matching buttons
    document.querySelectorAll(`[data-wishlist-id="${pStr}"], .btn-wishlist[data-id="${pStr}"]`).forEach(btn => {
        btn.classList.toggle('active', added);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = added ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        }
    });

    const pdpWishBtn = document.getElementById('pdpWishlistBtn');
    if (pdpWishBtn) {
        const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
        const currentPdpId = urlParams.get('id');
        if (currentPdpId && String(currentPdpId) === pStr) {
            pdpWishBtn.classList.toggle('active', added);
            const icon = pdpWishBtn.querySelector('i');
            if (icon) icon.className = added ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        }
    }

    // If wishlist drawer is currently active, re-render
    const drawer = document.getElementById('wishlistDrawer');
    if (drawer && drawer.classList.contains('active')) {
        renderWishlistItems();
    }
}

function updateWishlistUI() {
    const count = (wishlist || []).length;
    const badges = document.querySelectorAll('.wishlist-count-badge');
    badges.forEach(b => {
        b.textContent = count;
    });

    document.querySelectorAll('.btn-wishlist').forEach(btn => {
        const id = btn.getAttribute('data-id') || btn.dataset.id;
        if (id) {
            const isFav = wishlist.some(w => String(w) === String(id));
            btn.classList.toggle('active', isFav);
            btn.setAttribute('title', isFav ? 'Remove from Wishlist' : 'Add to Wishlist');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            }
        }
    });

    const pdpWishBtn = document.getElementById('pdpWishlistBtn');
    if (pdpWishBtn) {
        const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
        const currentPdpId = urlParams ? urlParams.get('id') : null;
        if (currentPdpId) {
            const isFav = wishlist.some(w => String(w) === String(currentPdpId));
            pdpWishBtn.classList.toggle('active', isFav);
            pdpWishBtn.setAttribute('title', isFav ? 'Remove from Favourites' : 'Save to Favourites');
            const icon = pdpWishBtn.querySelector('i');
            if (icon) {
                icon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            }
        }
    }
}

function openWishlistDrawer() {
    ensureWishlistDrawerInDOM();

    // Close shopping cart drawer if open
    const cartDrawer = document.getElementById('cartDrawer');
    const cartBackdrop = document.getElementById('cartDrawerBackdrop');
    if (cartDrawer) cartDrawer.classList.remove('active');
    if (cartBackdrop) cartBackdrop.classList.remove('active');

    renderWishlistItems();

    const drawer = document.getElementById('wishlistDrawer');
    const backdrop = document.getElementById('wishlistDrawerBackdrop');
    if (drawer) drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
}

function closeWishlistDrawer() {
    const drawer = document.getElementById('wishlistDrawer');
    const backdrop = document.getElementById('wishlistDrawerBackdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
}

function renderWishlistItems() {
    const listEl = document.getElementById('wishlistItemsList');
    const footerEl = document.getElementById('wishlistDrawerFooter');
    if (!listEl) return;

    if (!wishlist || wishlist.length === 0) {
        listEl.innerHTML = `
            <div class="empty-wishlist-view" style="text-align: center; padding: 60px 24px; color: var(--text-muted);">
                <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: rgba(197, 160, 89, 0.1); border: 1px dashed var(--gold-accent); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-regular fa-heart" style="font-size: 2.2rem; color: var(--gold-accent);"></i>
                </div>
                <h4 style="font-family: var(--font-heading); color: var(--theme-color); font-size: 1.3rem; margin-bottom: 8px;">Your Wishlist is Empty</h4>
                <p style="font-size: 0.88rem; line-height: 1.6; margin-bottom: 24px; color: var(--text-muted);">
                    You haven't saved any jewellery pieces yet. Explore our handcrafted fine collections and tap the heart icon to save your favourites.
                </p>
                <a href="catalog.html" class="btn-primary" onclick="closeWishlistDrawer()" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; text-decoration: none; font-weight: 600;">
                    <i class="fa-solid fa-gem"></i> Explore Catalog
                </a>
            </div>
        `;
        if (footerEl) footerEl.style.display = 'none';
        return;
    }

    if (footerEl) footerEl.style.display = 'block';

    const itemsHtml = wishlist.map(id => {
        const prod = (PRODUCTS || []).find(p => String(p.id) === String(id) || String(p.sku) === String(id));
        if (!prod) {
            return `
                <div class="cart-item wishlist-item" id="wishlist-item-${id}" style="display: flex; gap: 14px; padding: 16px; border-bottom: 1px solid var(--border-color); align-items: center;">
                    <div style="width: 64px; height: 64px; border-radius: 6px; background: rgba(0,0,0,0.04); display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-gem" style="color: var(--gold-accent);"></i>
                    </div>
                    <div class="cart-item-details" style="flex: 1;">
                        <h4 class="cart-item-title" style="font-size: 0.9rem; margin: 0 0 4px;">Jewellery Piece</h4>
                        <span class="cart-item-variant" style="font-size: 0.78rem; color: var(--text-muted);">SKU: ${id}</span>
                    </div>
                    <button type="button" onclick="toggleWishlist('${id}')" title="Remove" style="background: none; border: none; color: #e53935; cursor: pointer; padding: 8px;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        }

        const priceFormatted = formatPrice(prod.priceINR);
        const originalPriceFormatted = prod.originalPriceINR ? formatPrice(prod.originalPriceINR) : '';
        const img = prod.primaryImg || 'assets/categories/wristwear.jpg';
        const finish = (prod.availableFinishes && prod.availableFinishes[0]) || (prod.plating || '24K Gold');
        const inStock = prod.stockQty === undefined || prod.stockQty > 0;

        return `
            <div class="cart-item wishlist-item" id="wishlist-item-${prod.id}" style="display: flex; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--border-color); align-items: center;">
                <a href="product.html?id=${prod.id}" onclick="closeWishlistDrawer()" style="display: block; width: 72px; height: 72px; flex-shrink: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #fff;">
                    <img src="${img}" alt="${prod.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='assets/categories/wristwear.jpg'">
                </a>
                <div class="cart-item-details" style="flex: 1; min-width: 0;">
                    <a href="product.html?id=${prod.id}" onclick="closeWishlistDrawer()" style="text-decoration: none; color: inherit;">
                        <h4 class="cart-item-title" style="font-size: 0.92rem; font-weight: 600; color: var(--theme-color); margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${prod.name}</h4>
                    </a>
                    <span class="cart-item-variant" style="font-size: 0.78rem; color: var(--text-muted); display: block; margin-bottom: 6px;">Finish: ${finish} • <span style="text-transform: capitalize;">${prod.category || 'Jewellery'}</span></span>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <span class="cart-item-price" style="font-size: 0.95rem; font-weight: 700; color: var(--theme-color);">${priceFormatted}</span>
                        ${originalPriceFormatted ? `<span style="font-size: 0.8rem; text-decoration: line-through; color: var(--text-muted);">${originalPriceFormatted}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                    <button type="button" class="btn-primary btn-sm" onclick="moveWishlistToBag('${prod.id}', '${finish}')" style="padding: 7px 12px; font-size: 0.78rem; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; border-radius: 6px;" ${!inStock ? 'disabled style="opacity: 0.5;"' : ''}>
                        <i class="fa-solid fa-cart-shopping"></i> ${inStock ? 'Move to Cart' : 'Out of Stock'}
                    </button>
                    <button type="button" onclick="toggleWishlist('${prod.id}')" title="Remove from Favourites" style="background: none; border: none; color: var(--text-muted); font-size: 0.82rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; padding: 4px;">
                        <i class="fa-solid fa-trash-can" style="color: #c5a059;"></i> <span style="font-size: 0.74rem;">Remove</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    listEl.innerHTML = itemsHtml;
}

function moveWishlistToBag(productId, finish) {
    addToCart(productId, finish || "24K Gold", 1);

    // Remove from wishlist
    const pStr = String(productId);
    const idx = wishlist.findIndex(id => String(id) === pStr);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        try {
            localStorage.setItem('soreva_wishlist', JSON.stringify(wishlist));
        } catch (e) {}
        updateWishlistUI();
    }

    renderWishlistItems();
    showToast("Moved piece from favourites to your shopping cart!");
}

function moveAllWishlistToBag() {
    if (!wishlist || wishlist.length === 0) return;

    let addedCount = 0;
    wishlist.forEach(id => {
        const prod = (PRODUCTS || []).find(p => String(p.id) === String(id) || String(p.sku) === String(id));
        if (prod) {
            const finish = (prod.availableFinishes && prod.availableFinishes[0]) || (prod.plating || '24K Gold');
            addToCart(prod.id, finish, 1);
            addedCount++;
        }
    });

    wishlist = [];
    try {
        localStorage.setItem('soreva_wishlist', JSON.stringify(wishlist));
    } catch (e) {}
    updateWishlistUI();
    closeWishlistDrawer();

    setTimeout(() => {
        const cartDrawer = document.getElementById('cartDrawer');
        const cartBackdrop = document.getElementById('cartDrawerBackdrop');
        if (cartDrawer && cartBackdrop) {
            cartDrawer.classList.add('active');
            cartBackdrop.classList.add('active');
        }
        showToast(`${addedCount} piece(s) moved to your Shopping Cart!`);
    }, 250);
}

function initWishlistDrawer() {
    ensureWishlistDrawerInDOM();
    const openBtns = document.querySelectorAll('.wishlist-open-btn');
    openBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            openWishlistDrawer();
        };
    });

    const closeBtn = document.getElementById('wishlistDrawerClose');
    if (closeBtn) closeBtn.onclick = closeWishlistDrawer;

    const backdrop = document.getElementById('wishlistDrawerBackdrop');
    if (backdrop) backdrop.onclick = closeWishlistDrawer;

    updateWishlistUI();
}

function ensureWishlistDrawerInDOM() {
    if (document.getElementById('wishlistDrawer')) return;

    const backdropEl = document.createElement('div');
    backdropEl.className = 'drawer-backdrop';
    backdropEl.id = 'wishlistDrawerBackdrop';
    backdropEl.onclick = closeWishlistDrawer;
    document.body.appendChild(backdropEl);

    const drawerEl = document.createElement('aside');
    drawerEl.className = 'cart-drawer wishlist-drawer';
    drawerEl.id = 'wishlistDrawer';
    drawerEl.setAttribute('aria-label', 'Saved Favourites');
    drawerEl.innerHTML = `
        <div class="drawer-header">
            <h3 class="drawer-title">
                <i class="fa-solid fa-heart" style="color: var(--gold-accent);"></i>
                <span>Saved Favourites</span>
                <span style="font-size: 0.95rem; color: var(--text-muted); font-family: var(--font-body);">(<span class="wishlist-count-badge">0</span>)</span>
            </h3>
            <button type="button" class="drawer-close-btn" id="wishlistDrawerClose" onclick="closeWishlistDrawer()" aria-label="Close Favourites">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div class="cart-items-list" id="wishlistItemsList" style="flex: 1; overflow-y: auto;"></div>

        <div class="drawer-footer" id="wishlistDrawerFooter" style="padding: 20px 24px; border-top: 1px solid var(--border-color); background: #fff;">
            <button type="button" class="btn-checkout" id="moveAllWishlistBtn" onclick="moveAllWishlistToBag()" style="cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; font-weight: 700; background: var(--gold-accent); color: #241e1d; border: none; border-radius: var(--radius-sm); margin-bottom: 10px;">
                <i class="fa-solid fa-cart-shopping"></i>
                <span>Move All to Shopping Cart</span>
            </button>
            <button type="button" class="btn-outline" onclick="closeWishlistDrawer()" style="width: 100%; padding: 10px; font-size: 0.85rem; border: 1px solid var(--border-color); background: transparent; cursor: pointer; border-radius: var(--radius-sm); color: var(--text-muted);">
                Continue Browsing
            </button>
        </div>
    `;
    document.body.appendChild(drawerEl);
}

function handlePdpWishlistClick() {
    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
    const productId = urlParams.get('id');
    if (productId) {
        toggleWishlist(productId);
    }
}

// Global window exports
window.toggleWishlist = toggleWishlist;
window.openWishlistDrawer = openWishlistDrawer;
window.closeWishlistDrawer = closeWishlistDrawer;
window.renderWishlistItems = renderWishlistItems;
window.moveWishlistToBag = moveWishlistToBag;
window.moveAllWishlistToBag = moveAllWishlistToBag;
window.initWishlistDrawer = initWishlistDrawer;
window.handlePdpWishlistClick = handlePdpWishlistClick;

// ==========================================
// Quick View Modal
// ==========================================
let currentModalProductId = null;
let currentModalSelectedFinish = "24K Gold";

function ensureQuickViewModalInDOM() {
    if (document.getElementById('quickViewBackdrop')) return;
    const modalEl = document.createElement('div');
    modalEl.className = 'modal-backdrop';
    modalEl.id = 'quickViewBackdrop';
    modalEl.innerHTML = `
        <div class="quickview-modal">
            <button class="modal-close-btn" id="modalCloseBtn" aria-label="Close Modal" onclick="closeQuickView()">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <div class="quickview-grid">
                <div class="modal-gallery">
                    <img class="modal-main-img" id="modalMainImg" src="" alt="Product Preview">
                    <div class="modal-thumb-row" id="modalThumbsRow"></div>
                </div>
                <div class="modal-details">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                        <span class="modal-cat" id="modalCategory" style="margin-bottom: 0;">Necklaces • Modern Chokers</span>
                        <span id="modalBadgeContainer"></span>
                    </div>
                    <div id="modalPlatingBadgeWrap" style="margin: 6px 0;"></div>
                    <h2 class="modal-title" id="modalTitle">Product Title</h2>
                    <div class="modal-price-wrap">
                        <span class="modal-price" id="modalPrice">₹0</span>
                        <span class="original-price" id="modalOriginalPrice" style="font-size: 1.05rem;">₹0</span>
                    </div>
                    <p class="modal-desc" id="modalDescription"></p>
                    <div id="modalSpecsWrap"></div>
                    <div class="modal-option-group">
                        <label class="modal-option-label">Quantity</label>
                        <div style="display: inline-flex; align-items: center; border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden;">
                            <button type="button" class="qty-btn" onclick="let q=document.getElementById('modalQtyInput'); if(q && q.value>1) q.value--;">-</button>
                            <input type="number" id="modalQtyInput" value="1" min="1" max="10" readonly style="width: 44px; text-align: center; border: none; font-weight: 600;">
                            <button type="button" class="qty-btn" onclick="let q=document.getElementById('modalQtyInput'); if(q && q.value<10) q.value++;">+</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 14px;">
                        <button type="button" class="btn-add-cart" id="modalAddToCartBtn" style="flex: 1; padding: 14px;">
                            <i class="fa-solid fa-cart-shopping"></i> Add to Cart
                        </button>
                        <a id="modalFullDetailsBtn" href="#" style="flex: 1; padding: 14px; text-align: center; text-decoration: none; border: 1px solid var(--gold-badge); border-radius: 8px; color: var(--gold-badge); font-weight: 600; display: inline-flex; justify-content: center; align-items: center; gap: 8px; transition: all 0.2s;">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Full Details
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modalEl);
}

function closeQuickView() {
    const modalBackdrop = document.getElementById('quickViewBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.remove('active');
        modalBackdrop.style.display = 'none';
    }
}

function initQuickView() {
    ensureQuickViewModalInDOM();
    const modalBackdrop = document.getElementById('quickViewBackdrop');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeQuickView();
        };
    }

    if (modalBackdrop) {
        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) {
                closeQuickView();
            }
        };
    }

    // Modal Add to Cart
    const modalAddBtn = document.getElementById('modalAddToCartBtn');
    if (modalAddBtn) {
        modalAddBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const qtyInput = document.getElementById('modalQtyInput');
            const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
            if (currentModalProductId) {
                addToCart(currentModalProductId, currentModalSelectedFinish, qty);
                closeQuickView();
            }
        };
    }

    // Escape key closes Quick View modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeQuickView();
        }
    });
}

function openQuickView(productId) {
    if (!productId) return;
    ensureQuickViewModalInDOM();

    const pid = String(productId).trim();
    const product = (typeof PRODUCTS !== 'undefined' && PRODUCTS.length)
        ? PRODUCTS.find(p => String(p.id).trim() === pid || String(p.sku).trim() === pid)
        : null;

    if (!product) {
        console.warn('[QuickView] Product not found in catalog:', productId);
        window.location.href = `product.html?id=${pid}`;
        return;
    }

    currentModalProductId = product.id;
    currentModalSelectedFinish = formatPlating(product.plating);

    const modalBackdrop = document.getElementById('quickViewBackdrop');
    const modalImg = document.getElementById('modalMainImg');
    const modalThumbs = document.getElementById('modalThumbsRow');
    const modalCat = document.getElementById('modalCategory');
    const modalTitle = document.getElementById('modalTitle');
    const modalPrice = document.getElementById('modalPrice');
    const modalOriginal = document.getElementById('modalOriginalPrice');
    const modalDesc = document.getElementById('modalDescription');
    const fullDetailsBtn = document.getElementById('modalFullDetailsBtn');

    if (fullDetailsBtn) {
        fullDetailsBtn.href = `product.html?id=${product.id}`;
    }

    if (modalImg) modalImg.src = product.primaryImg || '';
    if (modalCat) modalCat.textContent = `${product.category || 'Jewellery'} • ${product.subCategory || 'Collection'}`;
    if (modalTitle) modalTitle.textContent = product.name || 'Jewellery Piece';
    const modalPlatingWrap = document.getElementById('modalPlatingBadgeWrap');
    if (modalPlatingWrap) {
        modalPlatingWrap.innerHTML = renderPlatingBadgeHtml(product.plating);
    }
    const modalBadgeWrap = document.getElementById('modalBadgeContainer');
    const isOos = isProductOutOfStock(product);
    if (modalBadgeWrap) {
        modalBadgeWrap.innerHTML = isOos 
            ? '<span class="product-badge badge-sold-out" style="background:#dc2626 !important; color:#fff !important; font-weight:700;"><i class="fa-solid fa-ban"></i> OUT OF STOCK</span>' 
            : renderProductBadgeHtml(product.badge);
    }
    const modalAddBtn = document.getElementById('modalAddToCartBtn');
    if (modalAddBtn) {
        if (isOos) {
            modalAddBtn.disabled = true;
            modalAddBtn.classList.add('btn-out-of-stock');
            modalAddBtn.style.opacity = '0.5';
            modalAddBtn.style.cursor = 'not-allowed';
            modalAddBtn.style.pointerEvents = 'none';
            modalAddBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Out of Stock';
        } else {
            modalAddBtn.disabled = false;
            modalAddBtn.classList.remove('btn-out-of-stock');
            modalAddBtn.style.opacity = '1';
            modalAddBtn.style.cursor = 'pointer';
            modalAddBtn.style.pointerEvents = 'auto';
            modalAddBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Add to Cart';
        }
    }
    if (modalPrice) modalPrice.textContent = formatPrice(product.priceINR || 0);
    
    if (modalOriginal) {
        if (product.originalPriceINR && product.originalPriceINR > product.priceINR) {
            modalOriginal.textContent = formatPrice(product.originalPriceINR);
            if (modalOriginal.style) modalOriginal.style.display = 'inline-block';
        } else {
            if (modalOriginal.style) modalOriginal.style.display = 'none';
        }
    }
    if (modalDesc) modalDesc.textContent = product.description || 'Handcrafted luxury cubic zirconia piece from the Sorèva atelier.';

    const modalSpecsWrap = document.getElementById('modalSpecsWrap');
    if (modalSpecsWrap) {
        const isSilver = (product.category === 'silver' || (product.subCategory && product.subCategory.toLowerCase().includes('silver')));
        modalSpecsWrap.innerHTML = `
            <div style="display: flex; gap: 12px; flex-wrap: wrap; margin: 12px 0 16px; padding: 10px 14px; background: rgba(197, 160, 89, 0.08); border-radius: 8px; font-size: 0.84rem; border: 1px solid rgba(197, 160, 89, 0.2);">
                <span style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 5px;">
                    <i class="fa-solid fa-coins" style="color: var(--gold-accent);"></i> <strong>Finish:</strong> ${formatPlating(product.plating)}
                </span>
                <span style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 5px;">
                    <i class="fa-solid fa-shield-halved" style="color: var(--gold-accent);"></i> <strong>Metal:</strong> ${isSilver ? '925 Silver' : 'Brass & Copper'}
                </span>
                <span style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 5px;">
                    <i class="fa-solid fa-gem" style="color: var(--gold-accent);"></i> <strong>Stones:</strong> AAA+ CZ
                </span>
            </div>
        `;
    }

    // Gallery Thumbs
    if (modalThumbs) {
        const gallery = (product.gallery && product.gallery.length) ? product.gallery : [product.primaryImg];
        modalThumbs.innerHTML = gallery.map((img, i) => `
            <img class="modal-thumb ${i === 0 ? 'active' : ''}" src="${img}" alt="Thumbnail" onclick="switchModalImage(this, '${img}')">
        `).join('');
    }

    const qtyInput = document.getElementById('modalQtyInput');
    if (qtyInput) qtyInput.value = 1;

    if (modalBackdrop) {
        modalBackdrop.style.display = 'flex';
        modalBackdrop.classList.add('active');
    }
}

function switchModalImage(thumbEl, src) {
    document.querySelectorAll('.modal-thumb').forEach(t => {
        if (t && t.classList) t.classList.remove('active');
    });
    if (thumbEl && thumbEl.classList) thumbEl.classList.add('active');
    const mainImg = document.getElementById('modalMainImg');
    if (mainImg && src) mainImg.src = src;
}

function selectModalFinish(pillEl, finish) {
    document.querySelectorAll('.plating-pill').forEach(p => {
        if (p && p.classList) p.classList.remove('active');
    });
    if (pillEl && pillEl.classList) pillEl.classList.add('active');
    currentModalSelectedFinish = finish;
}

// Expose on global window object so inline onclick attributes can access them unconditionally
window.openQuickView = openQuickView;
window.closeQuickView = closeQuickView;
window.switchModalImage = switchModalImage;
window.selectModalFinish = selectModalFinish;
window.ensureQuickViewModalInDOM = ensureQuickViewModalInDOM;


// ==========================================
// Luxury Live Search System (Header & Global)
// ==========================================
let searchDebounceTimer = null;
let activeSearchQuery = null;

function ensureSearchOverlayInDOM() {
    if (document.getElementById('searchOverlay')) return;

    const overlayHtml = `
    <!-- LIVE SEARCH BACKDROP -->
    <div class="search-backdrop" id="searchBackdrop" onclick="closeSearchOverlay()"></div>

    <!-- LIVE SEARCH OVERLAY -->
    <div class="search-overlay" id="searchOverlay" role="dialog" aria-modal="true" aria-label="Search Sorèva Collections">
        <div class="container search-box-container">
            <div class="search-header-row">
                <span class="search-modal-label">DISCOVER SORÈVA COLLECTIONS</span>
                <button type="button" class="search-close-btn" id="searchCloseBtn" onclick="closeSearchOverlay()" aria-label="Close search (Esc)" title="Close (Esc)">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="search-form-wrap">
                <i class="fa-solid fa-magnifying-glass search-input-icon"></i>
                <input type="search" id="searchKeywordInput" class="search-input-field" placeholder="Search for necklaces, rings, earrings, bangles, solitaires..." autocomplete="off" spellcheck="false">
                <button type="button" class="search-clear-input-btn" id="searchClearInputBtn" aria-label="Clear input" style="display: none;">
                    <i class="fa-solid fa-circle-xmark"></i>
                </button>
                <button type="button" class="search-submit-btn" id="searchSubmitBtn" aria-label="Search">
                    <span>Search</span>
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>

            <!-- Popular Quick Searches / Trending Chips -->
            <div class="search-quick-tags" id="searchQuickTags">
                <span class="quick-tag-label">Popular:</span>
                <button type="button" class="search-chip" data-query="Necklace">Necklaces</button>
                <button type="button" class="search-chip" data-query="Solitaire Ring">Solitaire Rings</button>
                <button type="button" class="search-chip" data-query="Earrings">Earrings</button>
                <button type="button" class="search-chip" data-query="Bangles">Bangles & Kadas</button>
                <button type="button" class="search-chip" data-query="Sterling Silver">925 Sterling Silver</button>
                <button type="button" class="search-chip" data-query="Choker">Bridal Chokers</button>
            </div>

            <div class="search-results-dropdown" id="searchResults"></div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', overlayHtml);
    bindSearchOverlayEvents();
}

function openSearchOverlay(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    ensureSearchOverlayInDOM();
    const overlay = document.getElementById('searchOverlay');
    const backdrop = document.getElementById('searchBackdrop');
    const input = document.getElementById('searchKeywordInput');

    if (backdrop) backdrop.classList.add('active');
    if (overlay) {
        overlay.classList.add('active');
        if (input) {
            setTimeout(() => {
                input.focus();
                input.select();
            }, 80);
        }
    }
}

function closeSearchOverlay(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const overlay = document.getElementById('searchOverlay');
    const backdrop = document.getElementById('searchBackdrop');
    const resultsWrap = document.getElementById('searchResults');

    if (overlay) overlay.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    if (resultsWrap) {
        resultsWrap.classList.remove('show');
    }
}

function toggleSearchOverlay(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const overlay = document.getElementById('searchOverlay');
    if (overlay && overlay.classList.contains('active')) {
        closeSearchOverlay(e);
    } else {
        openSearchOverlay(e);
    }
}

function handleSearchSubmit(query) {
    const q = (query || '').trim();
    if (!q) return;
    closeSearchOverlay();
    window.location.href = `catalog.html?q=${encodeURIComponent(q)}`;
}

function handleSearchResultClick(productId) {
    closeSearchOverlay();
    if (typeof openQuickView === 'function') {
        openQuickView(productId);
    } else {
        window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
    }
}

async function executeSearchSuggestions(query) {
    const resultsWrap = document.getElementById('searchResults');
    if (!resultsWrap) return;

    const q = (query || '').trim();
    if (q.length === 0) {
        resultsWrap.classList.remove('show');
        resultsWrap.innerHTML = '';
        return;
    }

    // 1. Try backend fast search API endpoint
    try {
        const resp = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
        if (resp.ok) {
            const data = await resp.json();
            renderSearchSuggestions(q, data.results || [], data.total || 0);
            return;
        }
    } catch (err) {
        // Fall back to client search
    }

    // 2. Client-side fallback if PRODUCTS loaded
    if (typeof PRODUCTS !== 'undefined' && PRODUCTS && PRODUCTS.length) {
        const qWords = q.toLowerCase().split(/\s+/).filter(Boolean);
        const matches = PRODUCTS.filter(p => {
            if (p.disabled || p.active === false || p.active === 0 || p.stockStatus === 'Disabled') return false;
            const name = (p.name || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            const sub = (p.subCategory || '').toLowerCase();
            const sku = (p.sku || '').toLowerCase();
            const plating = (p.plating || p.finish || '').toLowerCase();
            const haystack = `${name} ${cat} ${sub} ${sku} ${plating}`;
            return qWords.every(w => haystack.includes(w));
        });
        renderSearchSuggestions(q, matches.slice(0, 8), matches.length);
        return;
    }

    resultsWrap.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
            <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px; color: var(--gold-accent);"></i>
            Searching exquisite collections...
        </div>
    `;
    resultsWrap.classList.add('show');
}

function renderSearchSuggestions(query, results, totalCount) {
    const resultsWrap = document.getElementById('searchResults');
    if (!resultsWrap) return;

    if (!results || results.length === 0) {
        resultsWrap.innerHTML = `
            <div style="padding: 24px 20px; text-align: center;">
                <p style="color: var(--text-dark); font-weight: 600; margin-bottom: 6px;">No pieces found for "<strong>${escapeHtml(query)}</strong>"</p>
                <span style="color: var(--text-muted); font-size: 0.82rem;">Try searching for necklaces, rings, earrings, bangles, or 925 sterling silver.</span>
            </div>
        `;
        resultsWrap.classList.add('show');
        return;
    }

    let html = `
        <div class="search-results-header">
            <span>FOUND ${totalCount} ${totalCount === 1 ? 'PIECE' : 'PIECES'}</span>
            <span>TOP SUGGESTIONS</span>
        </div>
    `;

    results.forEach(p => {
        const priceStr = (typeof formatPrice === 'function') ? formatPrice(p.priceINR || 0) : `₹${p.priceINR}`;
        const subText = p.subCategory || (p.category ? (p.category.charAt(0).toUpperCase() + p.category.slice(1)) : 'Demi-Fine Jewellery');
        const finishText = formatPlating(p.plating || p.finish);
        const img = p.primaryImg || 'assets/hero/hero-slide-1.jpg';

        html += `
            <div class="search-item-match" onclick="handleSearchResultClick('${escapeHtml(p.id)}')" role="button" tabindex="0">
                <img src="${img}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null; this.src='assets/hero/hero-slide-1.jpg';">
                <div style="flex: 1; min-width: 0;">
                    <h5 class="search-item-title">${escapeHtml(p.name)}</h5>
                    <span class="search-item-meta">${escapeHtml(subText)} • ${escapeHtml(finishText)}</span>
                </div>
                <div class="search-item-price">${priceStr}</div>
            </div>
        `;
    });

    if (totalCount > results.length) {
        html += `
            <div class="search-view-all-footer" onclick="handleSearchSubmit('${escapeHtml(query)}')">
                View all ${totalCount} pieces for "${escapeHtml(query)}" <i class="fa-solid fa-arrow-right" style="margin-left: 6px;"></i>
            </div>
        `;
    }

    resultsWrap.innerHTML = html;
    resultsWrap.classList.add('show');
}

function bindSearchOverlayEvents() {
    const input = document.getElementById('searchKeywordInput');
    const clearBtn = document.getElementById('searchClearInputBtn');
    const submitBtn = document.getElementById('searchSubmitBtn');
    const closeBtn = document.getElementById('searchCloseBtn');
    const resultsWrap = document.getElementById('searchResults');

    if (input) {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (clearBtn) clearBtn.style.display = val.length > 0 ? 'inline-block' : 'none';
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                executeSearchSuggestions(val);
            }, 150);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit(input.value);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSearchOverlay();
            }
        });
    }

    if (clearBtn && input) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            input.value = '';
            clearBtn.style.display = 'none';
            if (resultsWrap) {
                resultsWrap.classList.remove('show');
                resultsWrap.innerHTML = '';
            }
            input.focus();
        });
    }

    if (submitBtn && input) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleSearchSubmit(input.value);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeSearchOverlay();
        });
    }

    // Quick tag chips
    document.querySelectorAll('.search-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            e.preventDefault();
            const q = chip.dataset.query || chip.textContent.trim();
            if (input) {
                input.value = q;
                if (clearBtn) clearBtn.style.display = 'inline-block';
                input.focus();
                executeSearchSuggestions(q);
            }
        });
    });
}

function initSearch() {
    ensureSearchOverlayInDOM();
    bindSearchOverlayEvents();

    const searchBtns = document.querySelectorAll('.search-open-btn');
    searchBtns.forEach(btn => {
        btn.onclick = (e) => {
            openSearchOverlay(e);
        };
    });

    const backdrop = document.getElementById('searchBackdrop');
    if (backdrop) {
        backdrop.onclick = (e) => {
            closeSearchOverlay(e);
        };
    }

    const closeBtn = document.getElementById('searchCloseBtn');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            closeSearchOverlay(e);
        };
    }

    // Escape key closes search overlay
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSearchOverlay(e);
        }
    });
}

window.openSearchOverlay = openSearchOverlay;
window.closeSearchOverlay = closeSearchOverlay;
window.toggleSearchOverlay = toggleSearchOverlay;
window.handleSearchSubmit = handleSearchSubmit;
window.handleSearchResultClick = handleSearchResultClick;
window.executeSearchSuggestions = executeSearchSuggestions;

// ==========================================
// Toast Notifications
// ==========================================
function showToast(message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <i class="fa-solid fa-sparkles" style="color: var(--gold-badge);"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}


// ==========================================
// CHATBOT WIDGET INJECTION
// ==========================================
function initChatbot() {
    if (document.getElementById('chatbot-container')) return;
    
    const html = `
    <div id="chatbot-container" style="position: fixed; bottom: 30px; right: 30px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; font-family: sans-serif;">
        <div id="chatbot-window" style="display: none; width: 340px; height: 450px; background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); flex-direction: column; overflow: hidden; margin-bottom: 20px; border: 2px solid #000;">
            <div style="background: #000; color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; font-weight: bold; font-size: 1.2rem;">AI Concierge</h4>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <button onclick="clearChatbotHistory()" aria-label="Clear Chat" title="Clear Chat History" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1rem; opacity: 0.8;"><i class="fa-solid fa-trash"></i></button>
                    <button onclick="toggleChatbot()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; font-weight: bold;">X</button>
                </div>
            </div>
            <div id="chatbot-messages" style="flex: 1; padding: 16px; overflow-y: auto; background: #f9f9f9; display: flex; flex-direction: column; gap: 12px;">
                <!-- History loaded here -->
            </div>
            <div style="padding: 12px; background: #fff; border-top: 2px solid #000; display: flex; gap: 8px;">
                <input type="text" id="chatbot-input" placeholder="Type your message..." style="flex: 1; padding: 12px; border: 2px solid #000; border-radius: 8px; font-size: 1rem; color: #000; background: #fff;" onkeypress="if(event.key === 'Enter') sendChatMessage()">
                <button onclick="sendChatMessage()" style="background: #000; color: #fff; border: none; padding: 0 16px; border-radius: 8px; cursor: pointer; font-weight: bold;">SEND</button>
            </div>
        </div>
        <button id="chatbot-toggle-btn" onclick="toggleChatbot()" style="width: 70px; height: 70px; border-radius: 50%; background: #000; color: #fff; border: 3px solid #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: bold; transition: transform 0.2s ease;">
            CHAT
        </button>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    const messagesDiv = document.getElementById('chatbot-messages');
    const savedHistory = sessionStorage.getItem('soreva_chat_history');
    if (savedHistory) {
        messagesDiv.innerHTML = savedHistory;
        setTimeout(() => { messagesDiv.scrollTop = messagesDiv.scrollHeight; }, 100);
    } else {
        messagesDiv.innerHTML = `
            <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                Hello! I am your AI jewelry assistant. How can I help you today?
            </div>
        `;
    }
    
    window.clearChatbotHistory = function() {
        sessionStorage.removeItem('soreva_chat_history');
        const messagesDiv = document.getElementById('chatbot-messages');
        messagesDiv.innerHTML = `
            <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                Hello! I am your AI jewelry assistant. How can I help you today?
            </div>
        `;
    };

    window.toggleChatbot = function() {
        const win = document.getElementById('chatbot-window');
        const btn = document.getElementById('chatbot-toggle-btn');
        if (win.style.display === 'none') {
            win.style.display = 'flex';
            btn.style.transform = 'scale(0)';
            setTimeout(() => document.getElementById('chatbot-input').focus(), 100);
        } else {
            win.style.display = 'none';
            btn.style.transform = 'scale(1)';
        }
    };
    
    window.sendChatMessage = async function() {
        const input = document.getElementById('chatbot-input');
        const msg = input.value.trim();
        if (!msg) return;
        
        const messagesDiv = document.getElementById('chatbot-messages');
        messagesDiv.innerHTML += `
            <div style="align-self: flex-end; background: #000; color: #fff; padding: 12px; border-radius: 12px; border-bottom-right-radius: 4px; font-weight: 500; font-size: 0.95rem; max-width: 85%;">
                ${msg}
            </div>
        `;
        sessionStorage.setItem('soreva_chat_history', messagesDiv.innerHTML);
        input.value = '';
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        const typingId = 'typing-' + Date.now();
        messagesDiv.innerHTML += `
            <div id="${typingId}" style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; max-width: 85%;">
                Thinking...
            </div>
        `;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            const data = await res.json();
            document.getElementById(typingId).remove();
            messagesDiv.innerHTML += `
                <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                    ${data.reply}
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            sessionStorage.setItem('soreva_chat_history', messagesDiv.innerHTML);
        } catch (e) {
            document.getElementById(typingId).remove();
            messagesDiv.innerHTML += `
                <div style="align-self: flex-start; background: #ffebee; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #d32f2f; font-weight: bold; font-size: 0.95rem; max-width: 85%;">
                    Network Error.
                </div>
            `;
        }
    };
}

document.addEventListener('DOMContentLoaded', initChatbot);


// ==========================================================================
// LOGO TYPING INTRO
// ==========================================================================
let entryActive = false;
let entryAutoTimer = null;
let logoTypingTimeouts = [];

function closeEntryPrologue() {
    const intro = document.getElementById('entryExperience');
    if (!intro || !entryActive) return;
    
    entryActive = false;
    if (entryAutoTimer) clearTimeout(entryAutoTimer);
    
    intro.classList.add('unveiled');
    document.body.style.overflow = '';
    
    // Store in session so it only plays once per session
    sessionStorage.setItem('soreva_intro_played', 'true');
}

function initIntro() {
    const intro = document.getElementById('entryExperience');
    if (!intro) return;
    
    // Play only once per session
    if (sessionStorage.getItem('soreva_intro_played') === 'true') {
        intro.style.display = 'none';
        return;
    }
    
    intro.style.display = 'flex';
    intro.classList.remove('unveiled');
    document.body.style.overflow = 'hidden';
    entryActive = true;
    
    // Clear previous timeouts if re-running
    logoTypingTimeouts.forEach(t => clearTimeout(t));
    logoTypingTimeouts = [];
    
    const logoInner = document.getElementById('logoTypeInner');
    const logoCursor = document.getElementById('logoTypeCursor');
    
    if (logoInner) logoInner.classList.remove('revealed');
    if (logoCursor) {
        logoCursor.classList.remove('revealed');
        logoCursor.classList.remove('fade-out');
    }
    
    // 1. Initial pause, then start typing (revealing)
    let t1 = setTimeout(() => {
        if (logoInner && entryActive) {
            logoInner.classList.add('revealed');
            if (logoCursor) logoCursor.classList.add('revealed');
        }
    }, 400);
    
    // 2. Fade out the cursor after typing finishes
    let t2 = setTimeout(() => {
        if (logoCursor && entryActive) {
            logoCursor.classList.add('fade-out');
        }
    }, 1800); // 400ms delay + 1.4s transition
    
    // 3. Automatically close the intro
    entryAutoTimer = setTimeout(() => {
        closeEntryPrologue();
    }, 2800);
    
    logoTypingTimeouts.push(t1, t2);
}

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    initIntro();
});


let currentHeroIndex = 0;
let heroAutoSlideInterval = null;
let heroListenersBound = false;

function initPatreonHero() {
    const heroSection = document.getElementById('homeHero');
    const slidesWrapper = document.getElementById('heroSlidesWrapper');
    const prevArrow = document.getElementById('heroArrowPrev');
    const nextArrow = document.getElementById('heroArrowNext');
    const quickViewBtn = document.getElementById('heroQuickViewBtn');
    const dotsNav = document.getElementById('heroDotsNav');

    if (!heroSection || !slidesWrapper) return;

    if (!HERO_SLIDES || !HERO_SLIDES.length) {
        HERO_SLIDES = (typeof DEFAULT_HERO_SLIDES !== 'undefined' && DEFAULT_HERO_SLIDES.length) ? [...DEFAULT_HERO_SLIDES] : [];
    }

    // 1. Render all 8 full-bleed background slide images for instant crossfading
    slidesWrapper.innerHTML = HERO_SLIDES.map((slide, idx) => `
        <div class="hero-slide-item ${idx === currentHeroIndex ? 'active' : ''}" data-index="${idx}">
            <img class="hero-slide-bg" src="${slide.image}" alt="${slide.name}" loading="${idx === 0 ? 'eager' : 'lazy'}" onerror="this.onerror=null; this.src='assets/hero/hero-slide-${(idx % 8) + 1}.jpg';">
        </div>
    `).join('');

    // 2. Render Clickable Navigation Dots
    if (dotsNav) {
        dotsNav.innerHTML = HERO_SLIDES.map((_, idx) => `
            <button class="hero-dot ${idx === 0 ? 'active' : ''}" data-slide="${idx}" aria-label="Go to slide ${idx + 1}" title="Slide ${idx + 1}"></button>
        `).join('');

        dotsNav.querySelectorAll('.hero-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetIdx = parseInt(dot.dataset.slide, 10);
                resetHeroAutoSlide();
                changeHeroSlide(targetIdx);
            });
        });
    }

    updateHeroUI();

    // 3. Navigation Arrows (Front & Back Buttons)
    const handlePrev = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        resetHeroAutoSlide();
        changeHeroSlide(currentHeroIndex - 1);
    };

    const handleNext = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        resetHeroAutoSlide();
        changeHeroSlide(currentHeroIndex + 1);
    };

    if (prevArrow) {
        prevArrow.onclick = handlePrev;
        prevArrow.addEventListener('touchend', (e) => {
            e.preventDefault();
            handlePrev(e);
        });
    }

    if (nextArrow) {
        nextArrow.onclick = handleNext;
        nextArrow.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleNext(e);
        });
    }

    if (!heroListenersBound) {
        // Keyboard Arrow Navigation
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            }
        });

        // Pause on hover
        heroSection.addEventListener('mouseenter', () => {
            clearInterval(heroAutoSlideInterval);
        });

        heroSection.addEventListener('mouseleave', () => {
            startHeroAutoSlide();
        });
        
        heroListenersBound = true;
    }

    // 4. Quick View button for current piece
    if (quickViewBtn) {
        // Remove existing listeners by cloning
        const newBtn = quickViewBtn.cloneNode(true);
        quickViewBtn.parentNode.replaceChild(newBtn, quickViewBtn);
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentSlide = HERO_SLIDES[currentHeroIndex];
            openQuickView(currentSlide.productId);
        });
    }

    // 5. Smooth Automatic Slide Cycling (every 6 seconds)
    startHeroAutoSlide();
}

function startHeroAutoSlide() {
    clearInterval(heroAutoSlideInterval);
    heroAutoSlideInterval = setInterval(() => {
        changeHeroSlide(currentHeroIndex + 1);
    }, 6000);
}

function resetHeroAutoSlide() {
    startHeroAutoSlide();
}

function changeHeroSlide(newIndex) {
    if (newIndex < 0) {
        newIndex = HERO_SLIDES.length - 1;
    }
    currentHeroIndex = newIndex % HERO_SLIDES.length;

    // Crossfade background slides
    const slideItems = document.querySelectorAll('.hero-slide-item');
    slideItems.forEach((slideEl, idx) => {
        slideEl.classList.toggle('active', idx === currentHeroIndex);
    });

    // Update Dots
    const dots = document.querySelectorAll('.hero-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentHeroIndex);
    });

    updateHeroUI();
}

function updateHeroUI() {
    const slide = HERO_SLIDES[currentHeroIndex];
    if (!slide) return;

    const tagEl = document.getElementById('heroSlideTag');
    const headlineEl = document.getElementById('heroHeadline');
    const subtitleEl = document.getElementById('heroSubtitle');
    const activeNameEl = document.getElementById('heroActiveName');
    const activePriceEl = document.getElementById('heroActivePrice');
    const counterEl = document.getElementById('heroSlideCounter');

    if (tagEl) tagEl.textContent = slide.tag;
    if (headlineEl) headlineEl.innerHTML = slide.headline;
    if (subtitleEl) subtitleEl.textContent = slide.subtitle;
    if (counterEl) counterEl.textContent = `0${currentHeroIndex + 1} / 0${HERO_SLIDES.length}`;

    if (activeNameEl) activeNameEl.textContent = slide.name;
    if (activePriceEl) activePriceEl.textContent = `${formatPrice(slide.priceINR)} • ${slide.finish}`;
}


// ==========================================
// Product Details Page (PDP)
// ==========================================
function initProductPage() {
    // Only run if we are on the product page
    const pdpMainImg = document.getElementById('pdpMainImg');
    if (!pdpMainImg) return;

    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
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
    const pdpThumbs = document.getElementById('pdpThumbs');
    if (pdpThumbs) {
        let galleryHtml = `<img src="${product.primaryImg}" class="pdp-thumb-img active" onclick="document.getElementById('pdpMainImg').src=this.src; document.querySelectorAll('.pdp-thumb-img').forEach(el=>el.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';" style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid var(--gold-accent);">`;
        if (product.hoverImg) {
            galleryHtml += `<img src="${product.hoverImg}" class="pdp-thumb-img" onclick="document.getElementById('pdpMainImg').src=this.src; document.querySelectorAll('.pdp-thumb-img').forEach(el=>el.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';" style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid transparent;">`;
        }
        pdpThumbs.innerHTML = galleryHtml;
    }

    pdpMainImg.src = product.primaryImg;
    
    const catLink = document.getElementById('pdpCatLink');
    if (catLink) {
        catLink.textContent = product.category.charAt(0).toUpperCase() + product.category.slice(1);
        catLink.href = `catalog.html?cat=${product.category}`;
    }
    
    const subCat = document.getElementById('pdpSubCat');
    if (subCat) subCat.textContent = product.subCategory;
    
    document.getElementById('pdpTitle').textContent = product.name;
    const isPdpOos = isProductOutOfStock(product);
    const pdpBadgeWrap = document.getElementById('pdpBadgeContainer');
    if (pdpBadgeWrap) {
        let badgeHtml = isPdpOos 
            ? '<span class="product-badge badge-sold-out" style="background:#dc2626 !important; color:#fff !important; font-weight:700; padding:6px 14px; font-size:0.85rem; border-radius:6px; display:inline-flex; align-items:center; gap:6px;"><i class="fa-solid fa-ban"></i> OUT OF STOCK</span>' 
            : renderProductBadgeHtml(product.badge);
        badgeHtml += renderPlatingBadgeHtml(product.plating);
        pdpBadgeWrap.innerHTML = badgeHtml;
        pdpBadgeWrap.style.display = 'flex';
        pdpBadgeWrap.style.alignItems = 'center';
        pdpBadgeWrap.style.gap = '8px';
        pdpBadgeWrap.style.flexWrap = 'wrap';
    }

    // Out of Stock notification banner
    let pdpOosNotice = document.getElementById('pdpOosNotice');
    if (isPdpOos) {
        if (!pdpOosNotice) {
            pdpOosNotice = document.createElement('div');
            pdpOosNotice.id = 'pdpOosNotice';
            pdpOosNotice.style.cssText = 'display:flex; align-items:center; gap:10px; background:rgba(220,38,38,0.08); border:1px solid rgba(220,38,38,0.3); color:#dc2626; padding:14px 18px; border-radius:8px; margin-bottom:24px; font-weight:600; font-size:0.95rem;';
            pdpOosNotice.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="font-size:1.2rem;"></i> <span>This piece is currently out of stock and unavailable for purchase.</span>';
            const buttonsRow = document.getElementById('pdpAddToCartBtn')?.parentElement;
            if (buttonsRow && buttonsRow.parentElement) {
                buttonsRow.parentElement.insertBefore(pdpOosNotice, buttonsRow);
            }
        }
    } else if (pdpOosNotice) {
        pdpOosNotice.remove();
    }
    
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

    // Render Unified Collapsible Accordions (Product Details, Shipping & Returns, Care Instructions)
    const isSilver = (product.category === 'silver' || (product.subCategory && product.subCategory.toLowerCase().includes('silver')));
    const platingStr = formatPlating(product.plating || product.finish || '24K Gold');
    const stoneInfo = product.stoneColor 
        ? `AAA+ Handset Austrian Cubic Zirconia (${escapeHtml(product.stoneColor)})` 
        : 'AAA+ Handset Austrian Cubic Zirconia (Diamond Setting)';

    let detailsHtml = `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
            <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-award" style="color: var(--gold-accent); width: 16px;"></i> Plating / Finish:
            </strong>
            <span style="font-weight: 600; color: var(--gold-accent); background: rgba(197, 160, 89, 0.1); padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(197, 160, 89, 0.25);">
                ${platingStr}
            </span>
        </li>
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
            <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-shield-halved" style="color: var(--gold-accent); width: 16px;"></i> Base Metal:
            </strong>
            <span style="color: var(--text-dark); font-weight: 500;">${isSilver ? '925 Sterling Silver' : 'Hypoallergenic Luxury Brass & Copper Alloy'}</span>
        </li>
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
            <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-gem" style="color: var(--gold-accent); width: 16px;"></i> Stone Type:
            </strong>
            <span style="color: var(--text-dark); font-weight: 500;">${stoneInfo}</span>
        </li>
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
            <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--gold-accent); width: 16px;"></i> Setting Technique:
            </strong>
            <span style="color: var(--text-dark); font-weight: 500;">Handcrafted 4-Prong Diamond Setting</span>
        </li>
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
            <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-layer-group" style="color: var(--gold-accent); width: 16px;"></i> Collection:
            </strong>
            <span style="text-transform: capitalize; color: var(--text-dark); font-weight: 500;">${escapeHtml(product.category || 'Jewellery')} &bull; ${escapeHtml(product.subCategory || 'Bespoke')}</span>
        </li>
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
            <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-circle-check" style="color: #10b981; width: 16px;"></i> Skin Safety:
            </strong>
            <span style="color: #10b981; font-weight: 600;">100% Anti-Tarnish, Nickel-Free & Lead-Safe</span>
        </li>
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
            <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-box" style="color: var(--gold-accent); width: 16px;"></i> Packaging:
            </strong>
            <span style="color: var(--text-dark); font-weight: 500;">Includes Signature Velvet-Lined Keepsake Box</span>
        </li>
    `;

    if (product.stoneSize) {
        detailsHtml += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
                <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-ruler-combined" style="color: var(--gold-accent); width: 16px;"></i> Stone Size:
                </strong>
                <span style="color: var(--text-dark); font-weight: 500;">${escapeHtml(String(product.stoneSize))}</span>
            </li>
        `;
    }

    if (product.setContents) {
        detailsHtml += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06);">
                <strong style="color: var(--text-dark); display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-shapes" style="color: var(--gold-accent); width: 16px;"></i> Set Contents:
                </strong>
                <span style="color: var(--text-dark); font-weight: 500;">${escapeHtml(String(product.setContents))}</span>
            </li>
        `;
    }

    // Render Auxiliary Accordions (Product Details, Shipping & Returns, Care Instructions)
    const moreDetails = document.getElementById('pdpMoreDetailsContainer');
    if (moreDetails) {
        moreDetails.innerHTML = `
            <div style="border-top: 1px solid var(--border-color); margin-top: 20px;">
                <details style="padding: 16px 0; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                    <summary style="font-weight: 600; color: var(--text-dark); display: flex; justify-content: space-between; align-items: center; list-style: none;">
                        <span style="display: inline-flex; align-items: center; gap: 8px;"><i class="fa-solid fa-list-check" style="color: var(--gold-accent);"></i> Product Details</span>
                        <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </summary>
                    <div style="padding-top: 12px;">
                        <ul id="pdpDetailsList" style="list-style: none; padding: 0; margin: 0; font-size: 0.95rem; color: var(--text-dark); line-height: 1.8;">
                            ${detailsHtml}
                        </ul>
                    </div>
                </details>
                <details style="padding: 16px 0; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                    <summary style="font-weight: 600; color: var(--text-dark); display: flex; justify-content: space-between; align-items: center; list-style: none;">
                        <span style="display: inline-flex; align-items: center; gap: 8px;"><i class="fa-solid fa-truck-fast" style="color: var(--gold-accent);"></i> Shipping & Returns</span>
                        <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </summary>
                    <div style="padding-top: 16px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
                        • Free insured delivery across India.<br>
                        • <strong>Processing & Dispatch:</strong> 1–3 business days after payment confirmation.<br>
                        • <strong>Transit & Delivery:</strong> 3–7 business days with real-time SMS, WhatsApp & Email tracking.<br>
                        • <strong>Sorèva Care:</strong> 48-hour claim window for damaged, defective, or incorrect items (unboxing video required).<br>
                        • <a href="shipping-delivery-policy.html" style="color: var(--gold-accent); text-decoration: underline; font-weight: 500;">Shipping Policy</a> · <a href="return-exchange-policy.html" style="color: var(--gold-accent); text-decoration: underline; font-weight: 500;">Return Policy</a>
                    </div>
                </details>
                <details style="padding: 16px 0; border-bottom: 1px solid var(--border-color); cursor: pointer;">
                    <summary style="font-weight: 600; color: var(--text-dark); display: flex; justify-content: space-between; align-items: center; list-style: none;">
                        <span style="display: inline-flex; align-items: center; gap: 8px;"><i class="fa-solid fa-hand-holding-heart" style="color: var(--gold-accent);"></i> Care Instructions</span>
                        <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
                    </summary>
                    <div style="padding-top: 16px; color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">
                        Store in the provided Sorèva pouch. Avoid direct contact with perfumes, sanitizers, and water to maintain the brilliance of the CZ crystals and plating.
                    </div>
                </details>
            </div>
            <style>
                details > summary::-webkit-details-marker { display: none; }
                details[open] summary .fa-chevron-down { transform: rotate(180deg); }
                details summary .fa-chevron-down { transition: transform 0.3s ease; }
            </style>
        `;
    } else {
        const pdpDetailsList = document.getElementById('pdpDetailsList');
        if (pdpDetailsList) pdpDetailsList.innerHTML = detailsHtml;
    }

    // Add to Cart and Buy Now Buttons (Disabled if Out of Stock)
    const addBtn = document.getElementById('pdpAddToCartBtn');
    const buyBtn = document.getElementById('pdpBuyNowBtn');
    const qtyInput = document.getElementById('pdpQty');
    const qtyContainer = qtyInput?.parentElement;

    if (isPdpOos) {
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.classList.add('btn-out-of-stock');
            addBtn.style.opacity = '0.5';
            addBtn.style.cursor = 'not-allowed';
            addBtn.style.pointerEvents = 'none';
            addBtn.style.background = '#4b5563';
            addBtn.style.color = '#9ca3af';
            addBtn.style.borderColor = '#4b5563';
            addBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Out of Stock';
        }
        if (buyBtn) {
            buyBtn.disabled = true;
            buyBtn.classList.add('btn-out-of-stock');
            buyBtn.style.opacity = '0.5';
            buyBtn.style.cursor = 'not-allowed';
            buyBtn.style.pointerEvents = 'none';
            buyBtn.style.background = '#4b5563';
            buyBtn.style.color = '#9ca3af';
            buyBtn.style.boxShadow = 'none';
            buyBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Unavailable';
        }
        if (qtyInput) qtyInput.disabled = true;
        if (qtyContainer) {
            qtyContainer.style.opacity = '0.45';
            qtyContainer.style.pointerEvents = 'none';
        }
    } else {
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.classList.remove('btn-out-of-stock');
            addBtn.style.opacity = '';
            addBtn.style.cursor = 'pointer';
            addBtn.style.pointerEvents = 'auto';
            addBtn.style.background = 'transparent';
            addBtn.style.color = 'var(--text-dark)';
            addBtn.style.borderColor = 'var(--gold-accent)';
            addBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Add to Cart';
            addBtn.onclick = () => {
                const qty = parseInt(document.getElementById('pdpQty')?.value) || 1;
                const finish = product.plating || product.finish || '24K Gold';
                addToCart(product.id, finish, qty);
            };
        }
        if (buyBtn) {
            buyBtn.disabled = false;
            buyBtn.classList.remove('btn-out-of-stock');
            buyBtn.style.opacity = '';
            buyBtn.style.cursor = 'pointer';
            buyBtn.style.pointerEvents = 'auto';
            buyBtn.style.background = 'linear-gradient(135deg, #c5a059, #967537)';
            buyBtn.style.color = '#120e0d';
            buyBtn.style.boxShadow = '0 4px 15px rgba(197,160,89,0.35)';
            buyBtn.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Buy Now';
        }
        if (qtyInput) qtyInput.disabled = false;
        if (qtyContainer) {
            qtyContainer.style.opacity = '1';
            qtyContainer.style.pointerEvents = 'auto';
        }
    }
    if (typeof updateWishlistUI === "function") updateWishlistUI();
}

function initApp() {
    if (typeof initAuth === 'function') initAuth();
    if (typeof initAnnouncementTicker === 'function') initAnnouncementTicker();
    if (typeof initCurrencySwitcher === 'function') initCurrencySwitcher();
    if (typeof initNavigation === 'function') initNavigation();
    if (typeof initPatreonHero === 'function') initPatreonHero();
    if (typeof initFilters === 'function') initFilters();
    if (typeof initSearch === 'function') initSearch();
    if (typeof initCartDrawer === 'function') initCartDrawer();
    if (typeof initWishlistDrawer === 'function') initWishlistDrawer();
    if (typeof initQuickView === 'function') initQuickView();
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof updateWishlistUI === 'function') updateWishlistUI();
    
    // Clear out hardcoded products before loading
    if (typeof PRODUCTS !== 'undefined') PRODUCTS = [];
    if (typeof HERO_SLIDES === 'undefined' || !HERO_SLIDES || !HERO_SLIDES.length) { HERO_SLIDES = (typeof DEFAULT_HERO_SLIDES !== 'undefined') ? [...DEFAULT_HERO_SLIDES] : []; }
    
    if (typeof loadStoreDataAndInit === 'function') loadStoreDataAndInit();
    // Fetch live Instagram reels feed
    fetch('/api/instagram/feed').then(r => r.json()).then(res => {
        if (res && res.success && res.items && res.items.length) {
            renderSocialFeed(res.items, res.handle);
        }
    }).catch(err => console.warn('Could not fetch /api/instagram/feed:', err));
}

document.addEventListener('DOMContentLoaded', initApp);


function parseUrlAndSetTitle() {
    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
    const cat = urlParams ? urlParams.get("cat") : null;
    const sub = urlParams ? urlParams.get("sub") : null;
    const badge = urlParams ? urlParams.get("badge") : null;
    const searchQuery = urlParams ? (urlParams.get("q") || urlParams.get("search")) : null;

    if (searchQuery && searchQuery.trim()) {
        activeSearchQuery = searchQuery.trim();
        const pageTitle = document.getElementById("catalogTitle");
        const pageDesc = document.getElementById("catalogDesc");
        if (pageTitle) {
            pageTitle.innerHTML = `Search Results: <em>"${escapeHtml(activeSearchQuery)}"</em>`;
            if (pageDesc) {
                pageDesc.innerHTML = `Showing exquisite demi-fine creations matching "${escapeHtml(activeSearchQuery)}". <a href="catalog.html?cat=necklace" style="color: var(--gold-accent); text-decoration: underline; margin-left: 8px; font-weight: 600;">Clear search</a>`;
            }
            document.title = `Search: "${activeSearchQuery}" | Sorèva`;
        }
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        return;
    } else {
        activeSearchQuery = null;
    }
    
    // Default strictly to "wristwear" when no category or "all" is specified
    if (cat && cat !== "all") {
        activeFilter = cat;
    } else {
        activeFilter = "wristwear";
    }
    if (sub) {
        activeSubFilter = sub;
    }
    if (badge) {
        activeBadgeFilter = badge.toLowerCase();
    }

    const catInfoMap = {
        wristwear: { title: "Wristwear <em>Collection</em>", desc: "Handcrafted bangles, kadas, and tennis bracelets in 24K gold and rhodium finish." },
        bracelets: { title: "Wristwear <em>Collection</em>", desc: "Handcrafted bangles, kadas, and tennis bracelets in 24K gold and rhodium finish." },
        necklace: { title: "Necklace <em>Collection</em>", desc: "Royal chokers, grand bridal sets, and delicate pavé statement pieces." },
        necklaces: { title: "Necklace <em>Collection</em>", desc: "Royal chokers, grand bridal sets, and delicate pavé statement pieces." },
        earrings: { title: "Earrings <em>Collection</em>", desc: "From majestic royal jhumkas and chandeliers to essential daily studs." },
        rings: { title: "Finger Rings <em>Collection</em>", desc: "Exquisite cocktail rings, engagement solitaires, and eternal bands." },
        pendants: { title: "Pendants <em>Collection</em>", desc: "Lustrous solitaires, traditional mangalsutras, and festive pendant sets." },
        silver: { title: "Silver Jewellery <em>Collection</em>", desc: "Certified 925 Sterling Silver creations with anti-tarnish rhodium plating." },
        "silver-jewellery": { title: "Silver Jewellery <em>Collection</em>", desc: "Certified 925 Sterling Silver creations with anti-tarnish rhodium plating." },
        accessories: { title: "Accessories <em>Collection</em>", desc: "Heritage maang tikkas and artisanal brooches." }
    };

    // Set page title & description
    const pageTitle = document.getElementById("catalogTitle");
    const pageDesc = document.getElementById("catalogDesc");
    if (pageTitle) {
        if (badge) {
            const b = badge.toLowerCase();
            if (b.includes("new") || b.includes("launch")) {
                pageTitle.innerHTML = "New Launch <em>Collection</em>";
                if (pageDesc) pageDesc.textContent = "Discover our newest demi-fine creations featuring brilliant diamond-cut solitaires.";
                document.title = "New Launch Collection | Sorèva";
            } else if (b.includes("trend")) {
                pageTitle.innerHTML = "Trending <em>Now</em>";
                if (pageDesc) pageDesc.textContent = "Most sought-after statement pieces trending across weddings and celebrations.";
                document.title = "Trending Collection | Sorèva";
            } else if (b.includes("best") || b.includes("seller")) {
                pageTitle.innerHTML = "Best <em>Sellers</em>";
                if (pageDesc) pageDesc.textContent = "Our most cherished iconic creations loved by connoisseurs of fine jewellery.";
                document.title = "Best Sellers | Sorèva";
            }
        } else if (sub) {
            pageTitle.innerHTML = sub + " <em>Collection</em>";
            if (pageDesc) pageDesc.textContent = "Explore our curated " + sub + " selection.";
            document.title = sub + " | Sorèva";
        } else {
            const info = catInfoMap[activeFilter] || {
                title: (activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1).replace(/-/g, " ")) + " <em>Collection</em>",
                desc: "Discover handcrafted demi-fine creations in " + activeFilter + "."
            };
            pageTitle.innerHTML = info.title;
            if (pageDesc) pageDesc.textContent = info.desc;
            document.title = (catInfoMap[activeFilter] ? activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1) : "Collection") + " | Sorèva";
        }
    }

    // Sync filter-tab active state
    const tabs = document.querySelectorAll(".filter-tab");
    if (tabs.length) {
        tabs.forEach(t => {
            if (t.dataset.category === activeFilter) {
                t.classList.add("active");
            } else {
                t.classList.remove("active");
            }
        });
    }
}

function preventLocalCaching() {
    // We are on localhost, so prevent aggressive caching on navigation
    const cacheBuster = "cb=" + new Date().getTime();
    
    // Update all a tags
    document.querySelectorAll('a').forEach(a => {
        if (a.href && a.href.includes('.html')) {
            if (a.href.includes('?')) {
                a.href = a.href + '&' + cacheBuster;
            } else {
                a.href = a.href + '?' + cacheBuster;
            }
        }
    });

    // Update all onclick window.location.href
    document.querySelectorAll('[onclick*="window.location.href"]').forEach(el => {
        let onclickAttr = el.getAttribute('onclick');
        if (onclickAttr.includes('.html')) {
            if (onclickAttr.includes('?')) {
                onclickAttr = onclickAttr.replace("'", "&" + cacheBuster + "'");
            } else {
                onclickAttr = onclickAttr.replace("'", "?" + cacheBuster + "'");
            }
            // Just overriding it with a click listener is safer
            const match = onclickAttr.match(/window\.location\.href='(.*?)'/);
            if (match && match[1]) {
                el.removeAttribute('onclick');
                el.addEventListener('click', () => {
                    let url = match[1];
                    url += (url.includes('?') ? '&' : '?') + cacheBuster;
                    window.location.href = url;
                });
            }
        }
    });
}


// Smooth scroll handler for badge horizontal showcases
function scrollCurationTrack(trackId, amount) {
    const track = document.getElementById(trackId);
    if (track) {
        track.scrollBy({ left: amount, behavior: 'smooth' });
    }
}
window.scrollCurationTrack = scrollCurationTrack;


// ============================================================
// DYNAMIC HORIZONTAL BADGE SHOWCASES (NEW LAUNCH, TRENDING, BEST SELLERS)
// ============================================================
function renderCuratedBadges() {
    if (!PRODUCTS || !PRODUCTS.length) return;

    const newLaunchTrack = document.getElementById('track-new-launch');
    const trendingTrack = document.getElementById('track-trending');
    const bestsellersTrack = document.getElementById('track-bestsellers');

    if (!newLaunchTrack && !trendingTrack && !bestsellersTrack) return;

    function buildCardsHtml(items, badgeClass, badgeIcon, badgeLabel) {
        return items.map(p => {
            const priceCurr = typeof formatPrice === 'function' ? formatPrice(p.priceINR) : `₹${p.priceINR.toLocaleString('en-IN')}`;
            const priceOrigHtml = (p.originalPriceINR > p.priceINR) 
                ? `<span class="curation-price-orig">${typeof formatPrice === 'function' ? formatPrice(p.originalPriceINR) : `₹${p.originalPriceINR.toLocaleString('en-IN')}`}</span>` 
                : '';
            const rating = p.rating || 4.9;
            const reviews = p.reviews || 16;
            const sub = p.subCategory || (p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : 'Fine Jewellery');
            const isWishlisted = (typeof wishlist !== 'undefined') && (wishlist.includes(p.id) || wishlist.includes(p.sku));

            return `
                <div class="curation-card" onclick="window.location.href='product.html?id=${p.id}'" role="button" tabindex="0" aria-label="${p.name}">
                    <div class="curation-media-wrap">
                        <img class="curation-img" src="${p.primaryImg}" alt="${p.name}" loading="lazy" onerror="this.src='https://indian-jewellery.com/core/thumb_images/product_images/773510AQ10CV91077.jpg';">
                        <div class="product-badges">
                            <span class="product-badge ${badgeClass}">${badgeIcon}${badgeLabel}</span>
                        </div>
                        <button class="curation-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}'); this.classList.toggle('active');" title="Save to Wishlist" aria-label="Save to Wishlist">
                            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                        <div class="curation-quick-overlay">
                            <button class="curation-quick-btn" onclick="event.stopPropagation(); openQuickView('${p.id}');">
                                <i class="fa-regular fa-eye"></i> Quick View
                            </button>
                        </div>
                    </div>
                    <div class="curation-body">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px;">
                            <span class="curation-cat-tag" style="margin-bottom: 0;">${sub}</span>
                            <span class="product-finish-pill" title="Crafted Finish">${formatPlating(p.plating)}</span>
                        </div>
                        <h3 class="curation-title" title="${p.name}">${p.name}</h3>
                        <div class="curation-rating">
                            <span class="curation-stars">★★★★★</span>
                            <span class="curation-score">${rating}</span>
                            <span class="curation-count">(${reviews})</span>
                        </div>
                        <div class="curation-price-row">
                            <span class="curation-price-now">${priceCurr}</span>
                            ${priceOrigHtml}
                        </div>
                        <button class="curation-add-cart-btn" onclick="event.stopPropagation(); addToCart('${p.id}');">
                            <i class="fa-solid fa-cart-shopping"></i> Add to Cart
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 1. New Launch
    if (newLaunchTrack) {
        let nlItems = PRODUCTS.filter(p => p.badge && (p.badge.toLowerCase().includes('new') || p.badge.toLowerCase().includes('launch')));
        if (nlItems.length >= 10) {
            newLaunchTrack.innerHTML = buildCardsHtml(
                nlItems.slice(0, 15), 
                'badge-new-launch', 
                '<i class="fa-solid fa-sparkles" style="margin-right: 4px; font-size: 0.62rem;"></i>', 
                'New Launch'
            );
        }
    }

    // 2. Trending
    if (trendingTrack) {
        let trItems = PRODUCTS.filter(p => p.badge && p.badge.toLowerCase().includes('trend'));
        if (trItems.length >= 10) {
            trendingTrack.innerHTML = buildCardsHtml(
                trItems.slice(0, 15), 
                'badge-trending', 
                '<i class="fa-solid fa-fire" style="margin-right: 4px; font-size: 0.65rem;"></i>', 
                'Trending'
            );
        }
    }

    // 3. Best Sellers
    if (bestsellersTrack) {
        let bsItems = PRODUCTS.filter(p => p.badge && (p.badge.toLowerCase().includes('best') || p.badge.toLowerCase().includes('seller')));
        if (bsItems.length >= 10) {
            bestsellersTrack.innerHTML = buildCardsHtml(
                bsItems.slice(0, 15), 
                'badge-bestseller', 
                '<i class="fa-solid fa-crown" style="margin-right: 4px; font-size: 0.65rem;"></i>', 
                'Best Seller'
            );
        }
    }
}
window.renderCuratedBadges = renderCuratedBadges;

// Keyboard Escape key to close search, cart or wishlist drawer
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (typeof closeSearchOverlay === 'function') closeSearchOverlay();
        if (typeof closeCartDrawer === 'function') closeCartDrawer();
        if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
    }
});

// Re-align to reviews section once all page assets (fonts/images) finish loading
window.addEventListener('load', () => {
    if (window.location.hash === '#testimonials' || window.location.hash === '#reviews') {
        setTimeout(() => {
            const target = document.getElementById('testimonials') || document.getElementById('reviews');
            if (target) {
                const headerOffset = 100;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: 'smooth'
                });
            }
        }, 150);
    }
});


console.log("app.js parsed and executed successfully!");