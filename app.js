/* ==========================================================================
   SORÈVA LUXURY JEWELLERY - STORE ENGINE
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

function getOptimizedImgUrl(url) {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('/api/img/')) return url;
    if (url.startsWith('assets/')) return '/' + url;
    if (url.startsWith('/assets/')) return url;
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

// Lazy-load hover images on user intent (mouse over / touch start / pointer enter)
if (typeof document !== 'undefined') {
    document.addEventListener('pointerenter', function(e) {
        const card = e.target && e.target.closest ? e.target.closest('.product-card') : null;
        if (!card) return;
        const hoverImg = card.querySelector('img.hover-img[data-src]');
        if (hoverImg && !hoverImg.src) {
            hoverImg.src = hoverImg.getAttribute('data-src');
            hoverImg.removeAttribute('data-src');
        }
    }, true);
}

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

PRODUCTS.forEach(p => {
    if (p.primaryImg) p.primaryImg = getOptimizedImgUrl(p.primaryImg);
    if (p.hoverImg) p.hoverImg = getOptimizedImgUrl(p.hoverImg);
    if (Array.isArray(p.gallery)) p.gallery = p.gallery.map(getOptimizedImgUrl);
});

const DEFAULT_HERO_SLIDES = [
    {
        id: 1,
        tag: "01 / 08 • ROYAL CHOKER EDIT",
        headline: "Where Timeless <em>Brilliance</em> Thrives",
        subtitle: "Handcrafted with Austrian AAA+ Cubic Zirconia crystals and 24K gold micro-finish. Designed for regal celebrations.",
        image: "assets/hero/hero-slide-1.jpg",
        name: "Aurelia Pavé Heritage Collar Necklace",
        finish: "24K Gold Plated",
        productId: "czm_41673",
        ctaText: "Explore Catalog",
        ctaLink: "product.html?id=czm_41673",
        linkUrl: "product.html?id=czm_41673"
    },
    {
        id: 2,
        tag: "02 / 08 • CELESTE DROPS EDIT",
        headline: "The Fiery <em>Brilliance</em> of Pure Light",
        subtitle: "Diamond-cut multi-faceted cascading teardrops in Rhodium Silver finish with fiery diamond dispersion.",
        image: "assets/hero/hero-slide-2.jpg",
        name: "Isabella Graduated Cascading Crystal Earrings",
        finish: "Rhodium Silver",
        productId: "czm_51860",
        ctaText: "Explore Catalog",
        ctaLink: "product.html?id=czm_51860",
        linkUrl: "product.html?id=czm_51860"
    },
    {
        id: 3,
        tag: "03 / 08 • BRIDAL EMPRESS EDIT",
        headline: "Grandeur Reimagined for <em>Every Queen</em>",
        subtitle: "An opulent heirloom statement choker layered with brilliant cut round and baguette stones.",
        image: "assets/hero/hero-slide-3.jpg",
        name: "Primavera Baguette Royal Heritage Collar",
        finish: "24K Gold Plated",
        productId: "czm_41674",
        ctaText: "Explore Catalog",
        ctaLink: "product.html?id=czm_41674",
        linkUrl: "product.html?id=czm_41674"
    },
    {
        id: 4,
        tag: "04 / 08 • SIGNATURE RINGS EDIT",
        headline: "Subtle Luxury at <em>Your Fingertips</em>",
        subtitle: "Crown-cut solitary center stone with micro-pave encrusted shoulders for effortless everyday glamour.",
        image: "assets/hero/hero-slide-4.jpg",
        name: "Floriana Sculpted Blossom Pavé Ring",
        finish: "Rhodium Silver",
        productId: "czm_51132",
        ctaText: "Explore Catalog",
        ctaLink: "product.html?id=czm_51132",
        linkUrl: "product.html?id=czm_51132"
    },
    {
        id: 5,
        tag: "05 / 08 • WRISTWEAR ICON EDIT",
        headline: "Fluid Elegance Around <em>Your Wrist</em>",
        subtitle: "Continuous fire of handset round brilliant stones. Flexible, feather-light, and flawlessly secure.",
        image: "assets/hero/hero-slide-5.jpg",
        name: "Honoria Flawless Hathphool Bangle & Ring Suite",
        finish: "24K Gold Plated",
        productId: "czm_46519",
        ctaText: "Explore Catalog",
        ctaLink: "product.html?id=czm_46519",
        linkUrl: "product.html?id=czm_46519"
    },
    {
        id: 6,
        tag: "06 / 08 • HALO SOLITAIRE EDIT",
        headline: "Everyday Grace with <em>Luminous Depth</em>",
        subtitle: "Delicate floating solitaire pendant set in micro-halo setting on an adjustable fine chain.",
        image: "assets/hero/hero-slide-6.jpg",
        name: "Novella Pear-Cut Teardrop Pendant & Earrings Set",
        finish: "24K Gold Plated",
        productId: "czm_50550",
        ctaText: "Explore Catalog",
        ctaLink: "product.html?id=czm_50550",
        linkUrl: "product.html?id=czm_50550"
    },
    {
        id: 7,
        tag: "07 / 08 • IMPERIAL JHUMKA EDIT",
        headline: "Heritage Craftsmanship <em>Modern Silhouette</em>",
        subtitle: "Filigree bells encrusted with pave crystals and delicate pearl drops for regal festive evenings.",
        image: "assets/hero/hero-slide-7.jpg",
        name: "Zephyrina Floral Statement Chandelier Drops",
        finish: "24K Gold Plated",
        productId: "czm_51696",
        ctaText: "Explore Catalog",
        ctaLink: "product.html?id=czm_51696",
        linkUrl: "product.html?id=czm_51696"
    },
    {
        id: 8,
        tag: "08 / 08 • DULHAN SHINE EDIT",
        headline: "Radiance That Captures <em>Every Gaze</em>",
        subtitle: "Grand bridal combo wristwear set with hand-faceted cubic zirconia and safety clasp.",
        image: "assets/hero/hero-slide-8.jpg",
        name: "Querida Dainty Hand-Harness Crystal Parure",
        finish: "24K Gold Plated",
        productId: "czm_46520",
        ctaText: "Explore Catalog",
        ctaLink: "product.html?id=czm_46520",
        linkUrl: "product.html?id=czm_46520"
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
let activeFilter = 'all';
let activeSubFilter = null;
let activeBadgeFilter = null;
let activePlating = 'all';

// CZMakers-Style Multi-Filter Engine State
let selectedCategory = 'all';
let selectedSubCategories = new Set();
let selectedPlatings = new Set();
let selectedSetContents = new Set();
let selectedStoneColors = new Set();
let selectedStoneSizes = new Set();
let catalogSort = 'featured';
let catalogCurrentPage = 1;
const CATALOG_PAGE_SIZE = 24;

const CATEGORY_OPTIONS = [
    { key: 'all', label: 'All Jewellery' },
    { key: 'necklace', label: 'Necklaces' },
    { key: 'earrings', label: 'Earrings' },
    { key: 'wristwear', label: 'Wristwear' },
    { key: 'rings', label: 'Finger Rings' },
    { key: 'pendants', label: 'Pendants' }
];

const PLATING_OPTIONS = [
    { key: 'gold', label: 'Golden', swatchClass: 'golden' },
    { key: 'silver', label: 'Full Silver', swatchClass: 'full-silver' },
    { key: 'two-tone', label: 'Two Tone', swatchClass: 'two-tone' },
    { key: 'rosegold', label: 'Rose Gold', swatchClass: 'rose-gold' },
    { key: 'oxidised', label: 'Oxidised', swatchClass: 'oxidised' },
    { key: 'antique', label: 'Antique (Mehndi)', swatchClass: 'antique' }
];

const SET_CONTENTS_OPTIONS = [
    'Solo Piece',
    'Necklace & Earrings Only',
    'Full Round Neck',
    'With Mangtika',
    'Pendant Set',
    'Combo Sets'
];

const STONE_COLOR_OPTIONS = [
    { key: 'Full White', label: 'Full White', swatchClass: 'full-white' },
    { key: 'Ruby', label: 'Ruby', swatchClass: 'ruby' },
    { key: 'Green', label: 'Green', swatchClass: 'green' },
    { key: 'Blue', label: 'Blue', swatchClass: 'blue' },
    { key: 'Mint Green', label: 'Mint Green', swatchClass: 'mint-green' },
    { key: 'Multi Color', label: 'Multi Color', swatchClass: 'multi-color' },
    { key: 'Pink', label: 'Pink', swatchClass: 'pink' },
    { key: 'Yellow', label: 'Yellow', swatchClass: 'yellow' },
    { key: 'Red', label: 'Red', swatchClass: 'red' }
];

const STONE_SIZE_OPTIONS = [
    'Mix',
    'All Big',
    'All Small'
];
let appliedCoupon = null;
try {
    const savedCpn = localStorage.getItem('soreva_applied_coupon');
    if (savedCpn) appliedCoupon = JSON.parse(savedCpn);
} catch (e) {}
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
    const num = (typeof inrAmount === 'number' && !isNaN(inrAmount)) ? inrAmount : (Number(inrAmount) || 0);
    const cur = (CURRENCIES && CURRENCIES[currentCurrency]) ? CURRENCIES[currentCurrency] : { symbol: '₹', rate: 1 };
    const converted = num * cur.rate;
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

// Dynamic Categories Showcase Renderer with Infinite Auto-Scroll Loop & Hover Pause
function renderCategories(categories) {
    const container = document.getElementById('categoryGrid');
    if (!container || !categories || !categories.length) return;
    const fallbackMap = {
        'wristwear': 'assets/uploads/category_focus_1792570221.jpeg',
        'necklace': 'assets/uploads/category_Gemini_Generated_Image_9lfkoo9lfkoo9lfk_1792569510.jpeg',
        'earrings': 'assets/uploads/category_ear_1792569584.jpeg',
        'rings': 'assets/uploads/category_ring_1792568855.jpeg',
        'pendants': 'assets/uploads/category_Gemini_Generated_Image_clctxdclctxdclct_1792568195.jpeg'
    };

    const generateCardsHtml = (isClone = false) => categories.map((cat, idx) => {
        const fallback = fallbackMap[cat.slug] || '/assets/categories/necklaces.jpg';
        const rawImg = cat.image || fallback;
        const imgUrl = (typeof getOptimizedImgUrl === 'function') ? getOptimizedImgUrl(rawImg) : rawImg;
        return `
        <a href="catalog.html?cat=${encodeURIComponent(cat.slug)}" class="category-card" aria-label="${cat.name}" ${isClone ? 'tabindex="-1" aria-hidden="true"' : ''}>
            <div class="category-img-wrap">
                <img class="category-img" src="${imgUrl}" alt="${cat.name}" loading="lazy" onerror="this.onerror=null; this.src='${fallback}';">
                <div class="category-overlay-gradient"></div>
                <span class="category-number-badge">${String((idx % categories.length) + 1).padStart(2, '0')}</span>
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
        `;
    }).join('');

    const set1 = generateCardsHtml(false);
    const set2 = generateCardsHtml(true);

    container.innerHTML = `
        <div class="category-marquee-track" id="categoryTrack">
            <div class="category-cards-set">${set1}</div>
            <div class="category-cards-set" aria-hidden="true">${set2}</div>
        </div>
    `;

    initCategoryMarquee();
}

// State for Category Showcase Marquee & Manual Navigation
let categoryMarqueeState = {
    rafId: null,
    currentX: 0,
    targetX: 0,
    speed: 0.75, // pixels per frame at ~60fps
    isHovered: false,
    isDragging: false,
    isInteracting: false,
    setWidth: 0
};

let manualShiftPauseTimer = null;

function getCategoryCardShiftAmount() {
    const firstCard = document.querySelector('.category-card');
    if (firstCard) {
        const parent = firstCard.parentElement;
        const gap = parent ? (parseFloat(window.getComputedStyle(parent).gap) || 22) : 22;
        return (firstCard.offsetWidth || 260) + gap;
    }
    return 282;
}

function shiftCategoryCarousel(direction) {
    const shiftDist = getCategoryCardShiftAmount();
    // direction > 0: shift right (show previous cards)
    // direction < 0: shift left (show next cards)
    categoryMarqueeState.targetX += direction * shiftDist;
    categoryMarqueeState.isInteracting = true;

    if (manualShiftPauseTimer) clearTimeout(manualShiftPauseTimer);
    manualShiftPauseTimer = setTimeout(() => {
        categoryMarqueeState.isInteracting = false;
    }, 2500);

    if (!categoryMarqueeState.rafId) {
        initCategoryMarquee();
    }
}
window.shiftCategoryCarousel = shiftCategoryCarousel;

function initCategoryMarquee() {
    const wrapper = document.getElementById('categoryCarouselWrapper');
    const container = document.getElementById('categoryGrid');
    const track = document.getElementById('categoryTrack');
    if (!container || !track) return;

    // Switch from pure CSS animation to smooth JS RAF engine
    track.classList.add('is-raf-controlled');
    track.style.animation = 'none';

    const measureSetWidth = () => {
        const firstSet = track.querySelector('.category-cards-set');
        if (firstSet && firstSet.offsetWidth > 50) {
            categoryMarqueeState.setWidth = firstSet.offsetWidth;
        }
    };
    measureSetWidth();

    // Cancel existing RAF to prevent multiple parallel loops
    if (categoryMarqueeState.rafId) {
        cancelAnimationFrame(categoryMarqueeState.rafId);
        categoryMarqueeState.rafId = null;
    }

    function step() {
        const currentTrack = document.getElementById('categoryTrack');
        if (!currentTrack) {
            categoryMarqueeState.rafId = null;
            return;
        }

        if (!categoryMarqueeState.setWidth || categoryMarqueeState.setWidth < 50) {
            measureSetWidth();
        }

        // Auto-scroll when not hovered, dragging, or actively interacting with manual controls
        if (!categoryMarqueeState.isHovered && !categoryMarqueeState.isDragging && !categoryMarqueeState.isInteracting) {
            categoryMarqueeState.targetX -= categoryMarqueeState.speed;
        }

        // Smooth easing interpolation
        const diff = categoryMarqueeState.targetX - categoryMarqueeState.currentX;
        if (Math.abs(diff) < 0.05) {
            categoryMarqueeState.currentX = categoryMarqueeState.targetX;
        } else {
            categoryMarqueeState.currentX += diff * 0.14;
        }

        // Seamless infinite wrap in both directions
        const sw = categoryMarqueeState.setWidth;
        if (sw > 50) {
            while (categoryMarqueeState.currentX <= -sw) {
                categoryMarqueeState.currentX += sw;
                categoryMarqueeState.targetX += sw;
            }
            while (categoryMarqueeState.currentX > 0) {
                categoryMarqueeState.currentX -= sw;
                categoryMarqueeState.targetX -= sw;
            }
        }

        currentTrack.style.transform = `translate3d(${categoryMarqueeState.currentX.toFixed(2)}px, 0, 0)`;
        categoryMarqueeState.rafId = requestAnimationFrame(step);
    }

    categoryMarqueeState.rafId = requestAnimationFrame(step);

    // Event listeners
    const hoverTarget = wrapper || container;
    if (!hoverTarget.dataset.marqueeEventsBound) {
        hoverTarget.dataset.marqueeEventsBound = 'true';

        hoverTarget.addEventListener('mouseenter', () => {
            categoryMarqueeState.isHovered = true;
        });

        hoverTarget.addEventListener('mouseleave', () => {
            categoryMarqueeState.isHovered = false;
        });

        // Touch gestures
        let lastTouchX = 0;
        let touchResumeTimer = null;

        hoverTarget.addEventListener('touchstart', (e) => {
            if (!e.touches || !e.touches[0]) return;
            if (touchResumeTimer) clearTimeout(touchResumeTimer);
            categoryMarqueeState.isDragging = true;
            categoryMarqueeState.isHovered = true;
            lastTouchX = e.touches[0].clientX;
        }, { passive: true });

        hoverTarget.addEventListener('touchmove', (e) => {
            if (!categoryMarqueeState.isDragging || !e.touches || !e.touches[0]) return;
            const clientX = e.touches[0].clientX;
            const deltaX = clientX - lastTouchX;
            lastTouchX = clientX;
            categoryMarqueeState.targetX += deltaX;
            categoryMarqueeState.currentX += deltaX;
        }, { passive: true });

        hoverTarget.addEventListener('touchend', () => {
            categoryMarqueeState.isDragging = false;
            if (touchResumeTimer) clearTimeout(touchResumeTimer);
            touchResumeTimer = setTimeout(() => {
                categoryMarqueeState.isHovered = false;
            }, 2000);
        }, { passive: true });

        window.addEventListener('resize', () => {
            measureSetWidth();
        });
    }

    // Attach click listeners to buttons directly
    const prevBtn = document.getElementById('categoryNavPrev');
    const nextBtn = document.getElementById('categoryNavNext');
    if (prevBtn && !prevBtn.dataset.navBound) {
        prevBtn.dataset.navBound = 'true';
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            shiftCategoryCarousel(1);
        });
    }
    if (nextBtn && !nextBtn.dataset.navBound) {
        nextBtn.dataset.navBound = 'true';
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            shiftCategoryCarousel(-1);
        });
    }
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
    if (imgMainEl && spotlight.imgMain) {
        imgMainEl.src = getOptimizedImgUrl(spotlight.imgMain);
        imgMainEl.onerror = function() { this.onerror = null; this.src = 'assets/placeholder-jewelry.svg'; };
    }
    if (imgSubEl && spotlight.imgSub) {
        imgSubEl.src = getOptimizedImgUrl(spotlight.imgSub);
        imgSubEl.onerror = function() { this.onerror = null; this.src = 'assets/hero/hero-slide-2.jpg'; };
    }
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
// Instagram Reels Video Gallery (Compact & Hover Autoplay)
// ==========================================
let currentInstagramReels = [];

const SOREVA_LOCAL_REELS = [
    {
        id: 'reel_1',
        videoUrl: '/assets/reels/reel_1.mp4',
        thumbnail: '/assets/reels/reel_1_poster.jpg',
        permalink: 'https://www.instagram.com/reel/DdqS_DcTt5z/',
        title: 'Ruby Radiance Choker',
        caption: 'A little drama never hurt — especially when it looks this good. A flash of red & unmatched brilliance.',
        views: '18.4K',
        likes: '1.4K',
        date: 'Recent'
    },
    {
        id: 'reel_2',
        videoUrl: '/assets/reels/reel_2.mp4',
        thumbnail: '/assets/reels/reel_2_poster.jpg',
        permalink: 'https://www.instagram.com/reel/DdnZyRnzf-M/',
        title: 'The Brilliance That Lingers',
        caption: 'It starts with the sparkle. But that touch of red is what you remember. Pure cubic zirconia perfection.',
        views: '24.1K',
        likes: '2.1K',
        date: 'Recent'
    },
    {
        id: 'reel_3',
        videoUrl: '/assets/reels/reel_3.mp4',
        thumbnail: '/assets/reels/reel_3_poster.jpg',
        permalink: 'https://www.instagram.com/reel/DdgR2vnzK8i/',
        title: 'Cascading Diamond Collar',
        caption: 'A little colour. A lot of presence. Handcrafted for evenings where only the finest jewellery speaks.',
        views: '15.9K',
        likes: '1.2K',
        date: 'Recent'
    },
    {
        id: 'reel_4',
        videoUrl: '/assets/reels/reel_4.mp4',
        thumbnail: '/assets/reels/reel_4_poster.jpg',
        permalink: 'https://www.instagram.com/reel/DddeqOWpiSR/',
        title: 'Bespoke Atelier Creation',
        caption: 'Some pieces don’t need an occasion. You see them, love them, and wear them forever.',
        views: '19.8K',
        likes: '1.8K',
        date: 'Recent'
    },
    {
        id: 'reel_5',
        videoUrl: '/assets/reels/reel_5.mp4',
        thumbnail: '/assets/reels/reel_5_poster.jpg',
        permalink: 'https://www.instagram.com/reel/DdalJxwT2lh/',
        title: 'Ruby Radiance Bold Drops',
        caption: 'Ruby Radiance — bold, passionate & unforgettable. Crafted with AAA+ grade cubic zirconia.',
        views: '28.3K',
        likes: '3.2K',
        date: 'Recent'
    },
    {
        id: 'reel_6',
        videoUrl: '/assets/reels/reel_6.mp4',
        thumbnail: '/assets/reels/reel_6_poster.jpg',
        permalink: 'https://www.instagram.com/reel/DdTjaQ0z5SR/',
        title: 'Timeless Atelier Glamour',
        caption: 'Designed to turn heads without uttering a single word. Unmatched fire in every facet.',
        views: '16.7K',
        likes: '1.6K',
        date: 'Recent'
    }
];

let activeMobileReelVid = null;
let reelIntersectionObserver = null;

function renderSocialFeed(instagram, handle = 'soreva_jewels') {
    const container = document.getElementById('socialGrid');
    if (!container) return;

    currentInstagramReels = SOREVA_LOCAL_REELS;

    container.innerHTML = SOREVA_LOCAL_REELS.map((item, idx) => {
        const videoSrc = item.videoUrl;
        const posterSrc = item.thumbnail;
        const permalink = item.permalink || `https://www.instagram.com/${handle}`;
        const caption = item.caption || item.title || 'Sorèva Reel';
        const likes = item.likes || '1.2K';

        return `
        <div class="reel-card is-paused" 
             data-reel-id="${item.id || idx}" 
             onmouseenter="handleReelCardEnter(this)" 
             onmouseleave="handleReelCardLeave(this)" 
             onclick="handleReelCardClick(event, this, '${item.id || idx}')">
            
            <video class="reel-video" 
                   id="reel_vid_${idx}"
                   src="${videoSrc}" 
                   poster="${posterSrc}" 
                   loop 
                   muted 
                   playsinline 
                   webkit-playsinline
                   preload="auto">
            </video>
            
            <div class="reel-top-bar">
                <span class="reel-badge"><i class="fa-brands fa-instagram"></i> Reel</span>
                <div class="reel-top-actions">
                    <button type="button" class="reel-audio-btn" onclick="toggleReelAudio(event, this, 'reel_vid_${idx}')" title="Toggle Sound" aria-label="Toggle Sound">
                        <i class="fa-solid fa-volume-xmark"></i>
                    </button>
                    <button type="button" class="reel-expand-btn" onclick="openReelModalFromCard(event, '${item.id || idx}')" title="View Full Reel" aria-label="View Full Reel">
                        <i class="fa-solid fa-expand"></i>
                    </button>
                </div>
            </div>

            <div class="reel-center-play">
                <i class="fa-solid fa-play"></i>
            </div>

            <div class="reel-bottom-info">
                <div class="reel-user-tag">
                    <i class="fa-brands fa-instagram"></i> @${handle}
                </div>
                <p class="reel-caption-text">${(caption || '').replace(/</g, '&lt;')}</p>
                <div class="reel-meta-row">
                    <span><i class="fa-solid fa-heart" style="color: #e4405f; font-size: 0.65rem;"></i> ${likes}</span>
                    <a href="${permalink}" target="_blank" rel="noopener noreferrer" class="btn-reel-ig" onclick="handleInstagramLinkClick(event, '${permalink}')">
                        <i class="fa-brands fa-instagram"></i> Watch on IG
                    </a>
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Ensure all video DOM objects strictly reflect WebKit mobile autoplay policy
    container.querySelectorAll('video.reel-video').forEach(vid => {
        vid.muted = true;
        vid.defaultMuted = true;
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
    });

    initReelIntersectionAutoplay();
}

function handleReelCardEnter(cardEl) {
    if (!cardEl || window.innerWidth <= 768) return;
    const vid = cardEl.querySelector('video');
    if (vid) {
        vid.play().catch(() => {});
    }
    cardEl.classList.remove('is-paused');
    cardEl.classList.add('is-playing');
}

function handleReelCardLeave(cardEl) {
    if (!cardEl || window.innerWidth <= 768) return;
    const vid = cardEl.querySelector('video');
    if (vid) {
        vid.pause();
    }
    cardEl.classList.add('is-paused');
    cardEl.classList.remove('is-playing');
}

function handleReelCardClick(e, cardEl, reelId) {
    // If the click originated from an explicit button or link, ignore card click
    if (e.target.closest('button') || e.target.closest('a')) return;

    const vid = cardEl ? cardEl.querySelector('video') : null;
    if (!vid) return;

    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Mobile tap: toggle play/pause inline with single-active playback
        if (vid.paused) {
            if (activeMobileReelVid && activeMobileReelVid !== vid) {
                activeMobileReelVid.pause();
                const prevCard = activeMobileReelVid.closest('.reel-card');
                if (prevCard) {
                    prevCard.classList.remove('is-playing');
                    prevCard.classList.add('is-paused');
                }
            }
            activeMobileReelVid = vid;
            vid.play().then(() => {
                cardEl.classList.remove('is-paused');
                cardEl.classList.add('is-playing');
            }).catch(() => {
                // If inline autoplay was blocked, open modal as graceful fallback
                openReelModal(reelId);
            });
        } else {
            vid.pause();
            cardEl.classList.remove('is-playing');
            cardEl.classList.add('is-paused');
            if (activeMobileReelVid === vid) activeMobileReelVid = null;
        }
    } else {
        // Desktop click: open lightbox modal
        openReelModal(reelId);
    }
}

function openReelModalFromCard(e, reelId) {
    if (e) e.stopPropagation();
    openReelModal(reelId);
}

function handleInstagramLinkClick(e, url) {
    if (e) e.stopPropagation();
    if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

function toggleReelAudio(e, btnEl, videoId) {
    if (e) e.stopPropagation();
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
    if (reelIntersectionObserver) {
        reelIntersectionObserver.disconnect();
    }

    const isMobile = window.innerWidth <= 768;

    reelIntersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const vid = entry.target.querySelector('video');
            if (!vid) return;

            if (entry.isIntersecting) {
                if (isMobile) {
                    // Mobile: single active playing video
                    if (activeMobileReelVid && activeMobileReelVid !== vid) {
                        activeMobileReelVid.pause();
                        const prevCard = activeMobileReelVid.closest('.reel-card');
                        if (prevCard) {
                            prevCard.classList.remove('is-playing');
                            prevCard.classList.add('is-paused');
                        }
                    }
                    activeMobileReelVid = vid;
                }
                vid.play().then(() => {
                    entry.target.classList.remove('is-paused');
                    entry.target.classList.add('is-playing');
                }).catch(() => {});
            } else {
                vid.pause();
                entry.target.classList.remove('is-playing');
                entry.target.classList.add('is-paused');
                if (activeMobileReelVid === vid) {
                    activeMobileReelVid = null;
                }
            }
        });
    }, { 
        threshold: isMobile ? 0.6 : 0.35 
    });

    document.querySelectorAll('.reel-card').forEach(card => reelIntersectionObserver.observe(card));
}

// Fullscreen Reel Modal Player
function openReelModal(reelId) {
    // Pause any card reel playing in background
    if (activeMobileReelVid) {
        activeMobileReelVid.pause();
    }
    document.querySelectorAll('.reel-card video').forEach(v => v.pause());
    document.querySelectorAll('.reel-card').forEach(c => {
        c.classList.remove('is-playing');
        c.classList.add('is-paused');
    });

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
            <button class="reel-modal-close" onclick="closeReelModal()" aria-label="Close Modal"><i class="fa-solid fa-xmark"></i></button>
            <div class="reel-modal-video-wrap">
                <video class="reel-modal-video" 
                       id="modalReelVideo" 
                       src="${videoSrc}" 
                       poster="${item.thumbnail || ''}" 
                       autoplay 
                       loop 
                       muted 
                       playsinline 
                       webkit-playsinline
                       controls>
                </video>
                <button type="button" class="reel-modal-sound-btn" id="modalSoundBtn" onclick="toggleModalSound(event)">
                    <i class="fa-solid fa-volume-xmark"></i> Tap for Sound
                </button>
            </div>
            <div class="reel-modal-side">
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(45deg, #f09433, #dc2743); padding: 2px; flex-shrink: 0;">
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
                    <a href="${permalink}" target="_blank" rel="noopener noreferrer" class="btn-insta-follow" style="width: 100%; justify-content: center; text-align: center;">
                        <i class="fa-brands fa-instagram"></i> View Full Reel on Instagram
                    </a>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');

    // Temporarily hide chatbot so it never overlaps the Instagram action button
    const chatbot = document.getElementById('chatbot-container');
    if (chatbot) chatbot.style.display = 'none';

    const modalVid = document.getElementById('modalReelVideo');
    if (modalVid) {
        modalVid.muted = true;
        modalVid.defaultMuted = true;
        modalVid.playsInline = true;
        modalVid.setAttribute('playsinline', '');
        modalVid.setAttribute('webkit-playsinline', '');
        modalVid.play().catch(() => {});
    }
}

function toggleModalSound(e) {
    if (e) e.stopPropagation();
    const modalVid = document.getElementById('modalReelVideo');
    const soundBtn = document.getElementById('modalSoundBtn');
    if (!modalVid) return;

    modalVid.muted = !modalVid.muted;
    if (soundBtn) {
        if (modalVid.muted) {
            soundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Tap for Sound';
        } else {
            soundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Sound On';
            modalVid.play().catch(() => {});
        }
    }
}

function closeReelModal() {
    const modal = document.getElementById('reelModalBackdrop');
    if (modal) {
        const modalVid = document.getElementById('modalReelVideo');
        if (modalVid) modalVid.pause();
        modal.classList.remove('active');
    }
    // Restore chatbot container visibility
    const chatbot = document.getElementById('chatbot-container');
    if (chatbot) chatbot.style.display = '';
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
        // Defensive check: NEVER overwrite larger in-memory catalog with a smaller slice
        if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS) && PRODUCTS.length > data.products.length) {
            console.warn(`[applyStoreData] Ignored smaller incoming catalog: existing (${PRODUCTS.length}) > incoming (${data.products.length})`);
            return;
        }
        data.products.forEach(p => {
            if (p.primaryImg) p.primaryImg = getOptimizedImgUrl(p.primaryImg);
            if (p.hoverImg) p.hoverImg = getOptimizedImgUrl(p.hoverImg);
            if (Array.isArray(p.gallery)) {
                p.gallery = p.gallery.map(g => getOptimizedImgUrl(g));
            }
        });
        PRODUCTS = data.products;
        if (typeof parseUrlAndSetTitle === 'function') parseUrlAndSetTitle();
        renderProducts();
        if (typeof preventLocalCaching === 'function') preventLocalCaching();
        if (typeof initProductPage === 'function') initProductPage();
        if (window.currentPdpProduct && typeof renderSimilarProducts === 'function') renderSimilarProducts(window.currentPdpProduct);
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

// IndexedDB Full Catalog Cache for instant page transitions without 5MB localStorage limits
const CATALOG_IDB_NAME = 'SorevaCatalogDB';
const CATALOG_IDB_STORE = 'storeData';

function openCatalogIdb() {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.indexedDB) return resolve(null);
        try {
            const req = indexedDB.open(CATALOG_IDB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(CATALOG_IDB_STORE)) {
                    db.createObjectStore(CATALOG_IDB_STORE);
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}

async function getIdbCachedStoreData() {
    try {
        const db = await openCatalogIdb();
        if (!db) return null;
        return new Promise((resolve) => {
            const tx = db.transaction(CATALOG_IDB_STORE, 'readonly');
            const store = tx.objectStore(CATALOG_IDB_STORE);
            const req = store.get('latest');
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

async function setIdbCachedStoreData(data) {
    try {
        const db = await openCatalogIdb();
        if (!db) return;
        const tx = db.transaction(CATALOG_IDB_STORE, 'readwrite');
        const store = tx.objectStore(CATALOG_IDB_STORE);
        store.put(data, 'latest');
    } catch (e) {}
}

// Load Store Data from API with IndexedDB instant fallback and live synchronization
async function loadStoreDataAndInit() {
    // 1. Immediately purge any legacy truncated soreva_store_data from localStorage
    try {
        localStorage.removeItem('soreva_store_data');
    } catch (e) {}

    // 2. Instant-render from IndexedDB cache if available
    try {
        const cached = await getIdbCachedStoreData();
        if (cached && cached.products && cached.products.length > 500) {
            applyStoreData(cached);
        }
    } catch (e) {}

    // 3. Fetch latest canonical store-data from backend server (gzipped ~760KB, instant)
    try {
        const resp = await fetch('/api/store-data');
        if (resp.ok) {
            const serverData = await resp.json();
            if (serverData && serverData.products && serverData.products.length > 0) {
                applyStoreData(serverData);
                setIdbCachedStoreData(serverData);
                return;
            }
        }
    } catch (err) {
        console.warn("API /api/store-data fetch failed:", err);
    }

    // 4. Fallback to static store-data.json
    try {
        const staticResp = await fetch('/data/store-data.json');
        if (staticResp.ok) {
            const staticData = await staticResp.json();
            if (staticData && staticData.products && staticData.products.length > 0) {
                applyStoreData(staticData);
                setIdbCachedStoreData(staticData);
            }
        }
    } catch (e) {
        console.warn("Static store-data.json fallback failed:", e);
    }
}

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

function switchCurrency(currencyCode) {
    if (CURRENCIES && CURRENCIES[currencyCode]) {
        currentCurrency = currencyCode;
        const label = document.getElementById('currentCurrencyLabel');
        if (label) label.textContent = currencyCode;
        document.querySelectorAll('.currency-option').forEach(o => {
            o.classList.toggle('active', o.dataset.currency === currencyCode);
        });
        document.querySelectorAll('.mobile-currency-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.currency === currencyCode);
        });
        if (typeof renderProducts === 'function') renderProducts();
        if (typeof updateCartUI === 'function') updateCartUI();
        if (typeof updateHeroUI === 'function') updateHeroUI();
        if (typeof renderCuratedBadges === 'function') renderCuratedBadges();
        if (typeof initProductPage === 'function') initProductPage();
        if (typeof showToast === 'function') showToast(`Currency set to ${CURRENCIES[currencyCode].label}`);
    }
}
window.switchCurrency = switchCurrency;

// Mobile Navigation Drawer System
function initMobileNav() {
    let backdrop = document.getElementById('mobileNavBackdrop');
    let drawer = document.getElementById('mobileNavDrawer');

    if (!drawer) {
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'mobileNavBackdrop';
            backdrop.className = 'mobile-nav-backdrop';
            backdrop.onclick = closeMobileNavDrawer;
            document.body.appendChild(backdrop);
        }

        drawer = document.createElement('aside');
        drawer.id = 'mobileNavDrawer';
        drawer.className = 'mobile-nav-drawer';
        drawer.setAttribute('aria-label', 'Mobile Navigation');

        drawer.innerHTML = `
            <div class="mobile-drawer-header">
                <div class="mobile-drawer-brand">
                    <img src="assets/logo-white.png" alt="Sorèva" class="mobile-drawer-logo" onerror="this.onerror=null; this.src='assets/logo-black.png';">
                    <span class="mobile-drawer-tagline">Haute Joaillerie</span>
                </div>
                <button type="button" class="mobile-drawer-close" id="mobileNavClose" onclick="closeMobileNavDrawer()" aria-label="Close Navigation">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="mobile-drawer-body">
                <div class="mobile-nav-section-title">Jewellery Collections</div>

                <!-- 1. Necklaces -->
                <div class="mobile-nav-acc-item">
                    <button type="button" class="mobile-nav-acc-header" onclick="toggleMobileNavAccordion(this)">
                        <span class="mobile-nav-acc-title">
                            <i class="fa-solid fa-gem"></i> Necklaces
                        </span>
                        <span class="mobile-nav-acc-meta">
                            <span class="mobile-nav-badge">5,000+</span>
                            <i class="fa-solid fa-chevron-down mobile-nav-chevron"></i>
                        </span>
                    </button>
                    <div class="mobile-nav-acc-body">
                        <a href="catalog.html?cat=necklace" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">All Necklaces</a>
                        <a href="catalog.html?cat=necklace&sub=Choker%20Necklaces" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Choker Necklaces</a>
                        <a href="catalog.html?cat=necklace&sub=Collar%20Necklaces" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Collar Necklaces</a>
                        <a href="catalog.html?cat=necklace&sub=Classic%20Necklaces" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Classic Necklaces</a>
                        <a href="catalog.html?cat=necklace&sub=Bridal%20Necklaces" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Bridal Necklaces</a>
                        <a href="catalog.html?cat=necklace&sub=Aurous%20Collection" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Aurous Collection</a>
                        <a href="catalog.html?cat=necklace&sub=Traditional%20Necklaces" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Traditional Sets</a>
                    </div>
                </div>

                <!-- 2. Earrings -->
                <div class="mobile-nav-acc-item">
                    <button type="button" class="mobile-nav-acc-header" onclick="toggleMobileNavAccordion(this)">
                        <span class="mobile-nav-acc-title">
                            <i class="fa-solid fa-sparkles"></i> Earrings
                        </span>
                        <span class="mobile-nav-acc-meta">
                            <span class="mobile-nav-badge">2,500+</span>
                            <i class="fa-solid fa-chevron-down mobile-nav-chevron"></i>
                        </span>
                    </button>
                    <div class="mobile-nav-acc-body">
                        <a href="catalog.html?cat=earrings" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">All Earrings</a>
                        <a href="catalog.html?cat=earrings&sub=Jhumka%20Earrings" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Royal Jhumkas</a>
                        <a href="catalog.html?cat=earrings&sub=Big%20Size%20Earrings" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Statement Earrings</a>
                        <a href="catalog.html?cat=earrings&sub=Medium%20Earrings" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Elegant Drops</a>
                        <a href="catalog.html?cat=earrings&sub=Tops%20%26%20Studs" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Tops &amp; Studs</a>
                        <a href="catalog.html?cat=earrings&sub=Small%20Earrings" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Minimal Earrings</a>
                    </div>
                </div>

                <!-- 3. Finger Rings -->
                <div class="mobile-nav-acc-item">
                    <button type="button" class="mobile-nav-acc-header" onclick="toggleMobileNavAccordion(this)">
                        <span class="mobile-nav-acc-title">
                            <i class="fa-solid fa-ring"></i> Finger Rings
                        </span>
                        <span class="mobile-nav-acc-meta">
                            <span class="mobile-nav-badge">1,100+</span>
                            <i class="fa-solid fa-chevron-down mobile-nav-chevron"></i>
                        </span>
                    </button>
                    <div class="mobile-nav-acc-body">
                        <a href="catalog.html?cat=rings" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">All Finger Rings</a>
                        <a href="catalog.html?cat=rings&sub=CZ%20Finger%20Rings" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">CZ Statement Rings</a>
                    </div>
                </div>

                <!-- 4. Pendants -->
                <div class="mobile-nav-acc-item">
                    <button type="button" class="mobile-nav-acc-header" onclick="toggleMobileNavAccordion(this)">
                        <span class="mobile-nav-acc-title">
                            <i class="fa-solid fa-certificate"></i> Pendants
                        </span>
                        <span class="mobile-nav-acc-meta">
                            <span class="mobile-nav-badge">800+</span>
                            <i class="fa-solid fa-chevron-down mobile-nav-chevron"></i>
                        </span>
                    </button>
                    <div class="mobile-nav-acc-body">
                        <a href="catalog.html?cat=pendants" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">All Pendants</a>
                        <a href="catalog.html?cat=pendants&sub=CZ%20Pendant%20Sets" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">CZ Pendant Sets</a>
                        <a href="catalog.html?cat=pendants&sub=Pendants%20with%20Medium%20Chain" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Pendants with Medium Chain</a>
                        <a href="catalog.html?cat=pendants&sub=Pendants%20with%20Broad%20Chain" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Pendants with Broad Chain</a>
                        <a href="catalog.html?cat=pendants&sub=CZ%20Mangalsutra" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">CZ Mangalsutra</a>
                    </div>
                </div>

                <!-- 5. Wristwear -->
                <div class="mobile-nav-acc-item">
                    <button type="button" class="mobile-nav-acc-header" onclick="toggleMobileNavAccordion(this)">
                        <span class="mobile-nav-acc-title">
                            <i class="fa-solid fa-circle-notch"></i> Wristwear
                        </span>
                        <span class="mobile-nav-acc-meta">
                            <span class="mobile-nav-badge">1,700+</span>
                            <i class="fa-solid fa-chevron-down mobile-nav-chevron"></i>
                        </span>
                    </button>
                    <div class="mobile-nav-acc-body">
                        <a href="catalog.html?cat=wristwear" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">All Wristwear</a>
                        <a href="catalog.html?cat=wristwear&sub=CZ%20Bangles" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">CZ Bangles</a>
                        <a href="catalog.html?cat=wristwear&sub=CZ%20Bracelets" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">CZ Bracelets</a>
                        <a href="catalog.html?cat=wristwear&sub=Bracelets%20%26%20Rings%20Combo" class="mobile-nav-sub-link" onclick="closeMobileNavDrawer()">Hathphool &amp; Ring Combos</a>
                    </div>
                </div>



                <div class="mobile-nav-section-title">Discover Sorèva</div>
                <button type="button" class="mobile-nav-direct-link" onclick="closeMobileNavDrawer(); openWishlistDrawer();" style="width: 100%; text-align: left; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <span><i class="fa-solid fa-heart" style="color: #e02424; margin-right: 10px;"></i> Saved Favourites</span>
                    <span class="badge-count wishlist-count-badge" style="position: static; transform: none; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; font-size: 0.75rem; border-radius: 50%; background: rgba(224, 36, 36, 0.12); color: #e02424; border: 1px solid rgba(224, 36, 36, 0.3); font-weight: 700;">0</span>
                </button>
                <button type="button" class="mobile-nav-direct-link" onclick="closeMobileNavDrawer(); openCartDrawer();" style="width: 100%; text-align: left; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; padding: 12px 0;">
                    <span><i class="fa-solid fa-cart-shopping" style="color: var(--gold-accent); margin-right: 10px;"></i> Shopping Cart</span>
                    <span class="badge-count cart-count-badge" style="position: static; transform: none; display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; font-size: 0.75rem; border-radius: 50%; background: var(--gold-accent); color: #120e0d; font-weight: 700;">0</span>
                </button>
                <a href="catalog.html" class="mobile-nav-direct-link" onclick="closeMobileNavDrawer()"><i class="fa-solid fa-gem"></i> All Products Catalog</a>
                <a href="about-us.html" class="mobile-nav-direct-link" onclick="closeMobileNavDrawer()"><i class="fa-solid fa-landmark"></i> The Maison</a>
                <a href="contact-us.html" class="mobile-nav-direct-link" onclick="closeMobileNavDrawer()"><i class="fa-solid fa-headset"></i> Customer Concierge</a>
                <a href="shipping-delivery-policy.html" class="mobile-nav-direct-link" onclick="closeMobileNavDrawer()"><i class="fa-solid fa-truck-fast"></i> Shipping &amp; Delivery</a>
                <a href="return-exchange-policy.html" class="mobile-nav-direct-link" onclick="closeMobileNavDrawer()"><i class="fa-solid fa-rotate-left"></i> Returns &amp; Exchanges</a>
            </div>

            <!-- Currency Selection -->
            <div class="mobile-drawer-currency-wrap">
                <span class="mobile-drawer-currency-label">Select Currency</span>
                <div class="mobile-drawer-currency-grid">
                    <button type="button" class="mobile-currency-btn ${currentCurrency === 'INR' ? 'active' : ''}" data-currency="INR" onclick="switchCurrency('INR')">INR (₹)</button>
                    <button type="button" class="mobile-currency-btn ${currentCurrency === 'USD' ? 'active' : ''}" data-currency="USD" onclick="switchCurrency('USD')">USD ($)</button>
                    <button type="button" class="mobile-currency-btn ${currentCurrency === 'AED' ? 'active' : ''}" data-currency="AED" onclick="switchCurrency('AED')">AED (د.إ)</button>
                    <button type="button" class="mobile-currency-btn ${currentCurrency === 'GBP' ? 'active' : ''}" data-currency="GBP" onclick="switchCurrency('GBP')">GBP (£)</button>
                    <button type="button" class="mobile-currency-btn ${currentCurrency === 'EUR' ? 'active' : ''}" data-currency="EUR" onclick="switchCurrency('EUR')">EUR (€)</button>
                </div>
            </div>

            <!-- Footer -->
            <div class="mobile-drawer-footer">
                <button type="button" class="btn-luxury-primary" onclick="closeMobileNavDrawer(); handleHeaderAuthClick(event);" style="width: 100%; justify-content: center; font-size: 0.88rem; padding: 11px;">
                    <i class="fa-regular fa-user"></i> <span id="mobileDrawerAuthText">Client Sign In / Portal</span>
                </button>
                <div class="mobile-drawer-contact-row">
                    <span>Care: <a href="tel:+919741118940"><i class="fa-solid fa-phone"></i> +91 97411 18940</a></span>
                    <a href="mailto:support@soreva.in"><i class="fa-solid fa-envelope"></i> support@soreva.in</a>
                </div>
            </div>
        `;

        document.body.appendChild(drawer);
    }

    // Touch swipe left on drawer to close
    let touchStartX = 0;
    drawer.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });
    drawer.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 70) {
            closeMobileNavDrawer();
        }
    }, { passive: true });
}
window.initMobileNav = initMobileNav;

function openMobileNavDrawer() {
    initMobileNav();
    const backdrop = document.getElementById('mobileNavBackdrop');
    const drawer = document.getElementById('mobileNavDrawer');
    if (backdrop) backdrop.classList.add('active');
    if (drawer) drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
}
window.openMobileNavDrawer = openMobileNavDrawer;

function closeMobileNavDrawer() {
    const backdrop = document.getElementById('mobileNavBackdrop');
    const drawer = document.getElementById('mobileNavDrawer');
    if (backdrop) backdrop.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    document.body.style.overflow = '';
}
window.closeMobileNavDrawer = closeMobileNavDrawer;

function toggleMobileNavDrawer() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer && drawer.classList.contains('active')) {
        closeMobileNavDrawer();
    } else {
        openMobileNavDrawer();
    }
}
window.toggleMobileNavDrawer = toggleMobileNavDrawer;

function toggleMobileNavAccordion(button) {
    const item = button.closest('.mobile-nav-acc-item');
    if (item) {
        item.classList.toggle('open');
    }
}
window.toggleMobileNavAccordion = toggleMobileNavAccordion;

// ==============================================================================
// CATEGORY MENU DROPDOWNS (TABLET, MOBILE & TOUCH)
// ==============================================================================
function closeCategoryNavPopper() {
    const popper = document.getElementById('categoryNavPopper');
    const backdrop = document.getElementById('categoryNavPopperBackdrop');
    if (popper) {
        popper.classList.remove('active');
        popper.removeAttribute('data-active-cat');
    }
    if (backdrop) backdrop.classList.remove('active');
    document.querySelectorAll('.cat-nav-link').forEach(l => l.classList.remove('popper-active'));
    document.querySelectorAll('.nav-dropdown-item').forEach(i => i.classList.remove('is-open'));
}
window.closeCategoryNavPopper = closeCategoryNavPopper;

function openCategoryNavPopper(trigger, menu) {
    let popper = document.getElementById('categoryNavPopper');
    let backdrop = document.getElementById('categoryNavPopperBackdrop');
    if (!popper) {
        popper = document.createElement('div');
        popper.id = 'categoryNavPopper';
        popper.className = 'mobile-category-popper';
        document.body.appendChild(popper);
    }
    if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.id = 'categoryNavPopperBackdrop';
        backdrop.className = 'mobile-category-popper-backdrop';
        backdrop.onclick = closeCategoryNavPopper;
        document.body.appendChild(backdrop);
    }

    const catName = trigger.innerText.trim();
    popper.setAttribute('data-active-cat', catName);

    // Extract subcategory links from the menu
    const links = Array.from(menu.querySelectorAll('a'));
    let linksHtml = '';
    links.forEach(a => {
        const href = a.getAttribute('href') || '#';
        const text = a.innerText.trim();
        linksHtml += `
            <a href="${href}" onclick="closeCategoryNavPopper();">
                <span>${text}</span>
                <i class="fa-solid fa-chevron-right"></i>
            </a>
        `;
    });

    popper.innerHTML = `
        <div class="mobile-category-popper-header">
            <span class="mobile-category-popper-title">${catName}</span>
            <button type="button" class="mobile-category-popper-close" onclick="closeCategoryNavPopper();" aria-label="Close">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="mobile-category-popper-items">
            ${linksHtml}
        </div>
    `;

    // Position popper right under the tapped category trigger
    const rect = trigger.getBoundingClientRect();
    const popperWidth = Math.min(300, window.innerWidth - 32);
    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (popperWidth / 2);
    if (left < 16) left = 16;
    if (left + popperWidth > window.innerWidth - 16) {
        left = window.innerWidth - popperWidth - 16;
    }

    popper.style.width = popperWidth + 'px';
    popper.style.top = top + 'px';
    popper.style.left = left + 'px';

    popper.classList.add('active');
    backdrop.classList.add('active');

    document.querySelectorAll('.cat-nav-link').forEach(l => l.classList.remove('popper-active'));
    trigger.classList.add('popper-active');
}
window.openCategoryNavPopper = openCategoryNavPopper;

function initCategoryDropdowns() {
    const dropdownItems = document.querySelectorAll('.header-category-bar .nav-dropdown-item');
    dropdownItems.forEach(item => {
        const trigger = item.querySelector('.cat-nav-link');
        const menu = item.querySelector('.nav-dropdown-menu');
        if (!trigger || !menu) return;

        if (trigger.getAttribute('data-dropdown-bound') === 'true') return;
        trigger.setAttribute('data-dropdown-bound', 'true');

        trigger.addEventListener('click', (e) => {
            const isTouchOrMobile = window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
            if (isTouchOrMobile) {
                const popper = document.getElementById('categoryNavPopper');
                const catName = trigger.innerText.trim();

                // If already open for this category, let second click navigate
                if (popper && popper.classList.contains('active') && popper.getAttribute('data-active-cat') === catName) {
                    closeCategoryNavPopper();
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                openCategoryNavPopper(trigger, menu);
            }
        });
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCategoryNavPopper();
    });

    // Close on resize to wide desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) closeCategoryNavPopper();
    });
}
window.initCategoryDropdowns = initCategoryDropdowns;

// Header & Sticky behavior
function initNavigation() {
    initMobileNav();
    initCategoryDropdowns();
    const header = document.querySelector('.site-header');
    if (header) {
        const updateHeaderScroll = () => {
            if (window.scrollY > 30) {
                header.classList.add('scrolled');
                document.body.classList.add('is-scrolled');
            } else {
                header.classList.remove('scrolled');
                document.body.classList.remove('is-scrolled');
            }
        };
        window.addEventListener('scroll', updateHeaderScroll, { passive: true });
        updateHeaderScroll();
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
// Filter and Sort Engine (CZMakers Multi-Filter Architecture)
// ==========================================

function normalizePlating(val) {
    if (!val) return 'gold';
    const s = String(val).toLowerCase().trim().replace(/[\s_]/g, '-');
    if (s === 'silver' || s.includes('rhodium')) return 'silver';
    if (s === 'rosegold' || s === 'rose-gold') return 'rosegold';
    if (s === 'two-tone' || s === 'twotone') return 'two-tone';
    if (s === 'oxidised' || s === 'oxidized') return 'oxidised';
    if (s === 'antique' || s.includes('mehndi')) return 'antique';
    return 'gold';
}
window.normalizePlating = normalizePlating;

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
window.formatPlating = formatPlating;

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
window.renderPlatingBadgeHtml = renderPlatingBadgeHtml;

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

function isProductOutOfStock(product) {
    if (!product) return true;
    if (product.stockStatus === 'Out of Stock') return true;
    if (product.inStock === false) return true;
    if (product.stockQty !== undefined && product.stockQty !== null && Number(product.stockQty) <= 0) return true;
    return false;
}
window.isProductOutOfStock = isProductOutOfStock;

function matchCategory(p, catKey) {
    if (!catKey || catKey === 'all') return true;
    const normCat = String(catKey).toLowerCase().trim();
    const pCat = String(p.category || '').toLowerCase().trim();
    const pSub = String(p.subCategory || '').toLowerCase().trim();
    const pName = String(p.name || '').toLowerCase();

    if (normCat === 'wristwear' || normCat === 'bracelets') {
        return pCat === 'wristwear' || pCat === 'bracelets' || pSub.includes('bangle') || pSub.includes('bracelet');
    }
    if (normCat === 'necklace' || normCat === 'necklaces') {
        return pCat === 'necklace' || pSub.includes('necklace') || pSub.includes('choker') || pSub.includes('collar');
    }
    if (normCat === 'earrings') {
        return pCat === 'earrings' || pSub.includes('earring') || pSub.includes('jhumka') || pSub.includes('stud') || pSub.includes('tops');
    }
    if (normCat === 'rings' || normCat === 'finger-rings') {
        return pCat === 'rings' || pSub.includes('ring') || pName.includes('ring');
    }
    if (normCat === 'pendants') {
        return pCat === 'pendants' || pSub.includes('pendant') || pName.includes('mangalsutra');
    }
    if (normCat === 'silver' || normCat === 'silver-jewellery') {
        return pCat === 'silver' || pSub.includes('silver') || pName.includes('silver') || (p.plating && p.plating.toLowerCase().includes('silver'));
    }
    if (normCat === 'accessories') {
        return pCat === 'accessories' || pSub.includes('brooch') || pSub.includes('mangtika') || pSub.includes('tikka') || pSub.includes('accessory');
    }
    return pCat === normCat;
}
window.matchCategory = matchCategory;

function normalizeSubCategoryName(text) {
    if (!text) return '';
    let s = String(text).toLowerCase().replace(/&/g, ' and ');
    s = s.replace(/[^a-z0-9]+/g, ' ');
    const words = s.split(/\s+/).filter(Boolean).map(w => {
        if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
        if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
        return w;
    });
    return words.join(' ');
}

const SUBCATEGORY_SYNONYMS = {
    'mangtika': ['cz maang tikka', 'maang tikka', 'royal maang tikka', 'mangtika', 'tikka', 'tika'],
    'cz brooch': ['cz brooch', 'cz brooches', 'artisanal brooches', 'brooch', 'brooches'],
    'finger ring': ['finger ring', 'cz finger ring', 'statement ring', 'ring'],
    'cz finger ring': ['finger ring', 'cz finger ring', 'statement ring', 'ring'],
    '925 sterling finger ring': ['925 sterling silver ring', 'sterling silver ring', '925 sterling finger ring', 'silver ring'],
    '925 sterling silver pendant': ['925 sterling silver pendant', 'sterling silver pendant', 'silver pendant'],
    '925 sterling silver earring': ['925 sterling silver earring', 'sterling silver earring', 'silver earring'],
    'tops and stud': ['essential stud', 'tops and stud', 'tops stud', 'stud', 'tops'],
    'big size earring': ['big size earring', 'statement earring'],
    'medium earring': ['medium earring', 'elegant drop'],
    'small earring': ['small earring', 'minimal earring'],
    'jhumka earring': ['jhumka earring', 'royal jhumka', 'jhumka'],
    'traditional necklace': ['traditional necklace', 'traditional set'],
    'choker necklace': ['choker necklace', 'choker', 'chokers', 'royal choker'],
    'cz accessory': ['cz accessory', 'cz accessories', 'hair and couture accessories', 'hair accessories', 'couture accessories', 'accessories'],
    'bracelet and ring combo': ['bracelet and ring combo', 'bracelet ring combo', 'bracelets rings combo', 'hathphool'],
    'pendant with broad chain': ['pendant with broad chain', 'pendants with broad chain'],
    'pendant with medium chain': ['pendant with medium chain', 'pendants with medium chain'],
    'cz mangalsutra': ['cz mangalsutra', 'mangalsutra']
};

function matchProductSubCategory(prodSub, targetSub, prodName = '') {
    if (!targetSub) return true;
    if (prodSub && prodSub === targetSub) return true;

    const pNorm = normalizeSubCategoryName(prodSub);
    const tNorm = normalizeSubCategoryName(targetSub);
    const nNorm = normalizeSubCategoryName(prodName);

    if (pNorm && tNorm && (pNorm === tNorm || pNorm.includes(tNorm) || tNorm.includes(pNorm))) {
        return true;
    }

    if (tNorm.includes('mangalsutra') && nNorm.includes('mangalsutra')) {
        return true;
    }

    for (const [canon, syns] of Object.entries(SUBCATEGORY_SYNONYMS)) {
        const cNorm = normalizeSubCategoryName(canon);
        const allNorms = [cNorm, ...syns.map(normalizeSubCategoryName)];
        const targetMatches = allNorms.some(s => s === tNorm || tNorm.includes(s));
        if (targetMatches) {
            const prodMatches = allNorms.some(s => s === pNorm || pNorm.includes(s));
            if (prodMatches) return true;
            if (tNorm.includes('mangalsutra') && nNorm.includes('mangalsutra')) return true;
        }
    }
    return false;
}
window.matchProductSubCategory = matchProductSubCategory;

function getAvailableSubCategories(catKey) {
    const subCounts = new Map();
    PRODUCTS.forEach(p => {
        if (p.disabled || p.active === false || p.active === 0 || p.stockStatus === 'Disabled') return;
        if (!matchCategory(p, catKey)) return;
        const sub = p.subCategory || 'Other';
        subCounts.set(sub, (subCounts.get(sub) || 0) + 1);
    });
    return Array.from(subCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;

function escapeJs(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;');
}
window.escapeJs = escapeJs;

// Render Sidebar Options with Counts & Swatches
function renderFilterSidebar() {
    const activeProducts = PRODUCTS.filter(p => !p.disabled && p.active !== false && p.active !== 0 && p.stockStatus !== 'Disabled');

    // 1. CATEGORY
    const catListEl = document.getElementById('categoryFilterList');
    if (catListEl) {
        catListEl.innerHTML = CATEGORY_OPTIONS.map(cat => {
            const count = activeProducts.filter(p => matchCategory(p, cat.key)).length;
            const isSelected = (selectedCategory === cat.key);
            return `
                <div class="filter-option-item ${isSelected ? 'selected' : ''}" onclick="selectCategoryFilter('${cat.key}')">
                    <div class="filter-option-main">
                        <span class="custom-radio"></span>
                        <span class="filter-option-label">${cat.label}</span>
                    </div>
                    <span class="filter-option-count">${count.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    }

    // 2. SUB CATEGORY (Filtered according to active category)
    const subListEl = document.getElementById('subCategoryFilterList');
    if (subListEl) {
        const availableSubs = getAvailableSubCategories(selectedCategory);
        if (availableSubs.length === 0) {
            subListEl.innerHTML = `<div style="padding: 6px 8px; font-size: 0.8rem; color: #a09890;">No sub categories</div>`;
        } else {
            subListEl.innerHTML = availableSubs.map(sub => {
                const isSelected = Array.from(selectedSubCategories).some(target => sub.name === target || matchProductSubCategory(sub.name, target));
                return `
                    <div class="filter-option-item ${isSelected ? 'selected' : ''}" onclick="toggleSubCategoryFilter('${escapeJs(sub.name)}')">
                        <div class="filter-option-main">
                            <span class="custom-checkbox"></span>
                            <span class="filter-option-label">${escapeHtml(sub.name)}</span>
                        </div>
                        <span class="filter-option-count">${sub.count.toLocaleString()}</span>
                    </div>
                `;
            }).join('');
        }
    }

    // 3. BY PLATING COLOUR
    const platingListEl = document.getElementById('platingFilterList');
    if (platingListEl) {
        const catProducts = activeProducts.filter(p => matchCategory(p, selectedCategory));
        platingListEl.innerHTML = PLATING_OPTIONS.map(plat => {
            const count = catProducts.filter(p => normalizePlating(p.plating) === plat.key).length;
            const isSelected = selectedPlatings.has(plat.key);
            return `
                <div class="filter-option-item ${isSelected ? 'selected' : ''}" onclick="togglePlatingFilter('${plat.key}')">
                    <div class="filter-option-main">
                        <span class="custom-checkbox"></span>
                        <span class="plating-swatch-dot ${plat.swatchClass}"></span>
                        <span class="filter-option-label">${plat.label}</span>
                    </div>
                    <span class="filter-option-count">${count.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    }

    // 4. BY SET CONTENTS
    const setListEl = document.getElementById('setContentsFilterList');
    if (setListEl) {
        const catProducts = activeProducts.filter(p => matchCategory(p, selectedCategory));
        setListEl.innerHTML = SET_CONTENTS_OPTIONS.map(content => {
            const count = catProducts.filter(p => (p.setContents || '').toLowerCase() === content.toLowerCase()).length;
            const isSelected = selectedSetContents.has(content);
            return `
                <div class="filter-option-item ${isSelected ? 'selected' : ''}" onclick="toggleSetContentFilter('${escapeJs(content)}')">
                    <div class="filter-option-main">
                        <span class="custom-checkbox"></span>
                        <span class="filter-option-label">${escapeHtml(content)}</span>
                    </div>
                    <span class="filter-option-count">${count.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    }

    // 5. BY STONE COLOUR
    const stoneColListEl = document.getElementById('stoneColorFilterList');
    if (stoneColListEl) {
        const catProducts = activeProducts.filter(p => matchCategory(p, selectedCategory));
        stoneColListEl.innerHTML = STONE_COLOR_OPTIONS.map(stone => {
            const count = catProducts.filter(p => (p.stoneColor || '').toLowerCase() === stone.key.toLowerCase()).length;
            const isSelected = selectedStoneColors.has(stone.key);
            return `
                <div class="filter-option-item ${isSelected ? 'selected' : ''}" onclick="toggleStoneColorFilter('${escapeJs(stone.key)}')">
                    <div class="filter-option-main">
                        <span class="custom-checkbox"></span>
                        <span class="stone-swatch-dot ${stone.swatchClass}"></span>
                        <span class="filter-option-label">${stone.label}</span>
                    </div>
                    <span class="filter-option-count">${count.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    }

    // 6. BY STONE SIZE
    const stoneSizeListEl = document.getElementById('stoneSizeFilterList');
    if (stoneSizeListEl) {
        const catProducts = activeProducts.filter(p => matchCategory(p, selectedCategory));
        stoneSizeListEl.innerHTML = STONE_SIZE_OPTIONS.map(size => {
            const count = catProducts.filter(p => (p.stoneSize || '').toLowerCase() === size.toLowerCase()).length;
            const isSelected = selectedStoneSizes.has(size);
            return `
                <div class="filter-option-item ${isSelected ? 'selected' : ''}" onclick="toggleStoneSizeFilter('${escapeJs(size)}')">
                    <div class="filter-option-main">
                        <span class="custom-checkbox"></span>
                        <span class="filter-option-label">${escapeHtml(size)}</span>
                    </div>
                    <span class="filter-option-count">${count.toLocaleString()}</span>
                </div>
            `;
        }).join('');
    }
}
window.renderFilterSidebar = renderFilterSidebar;

// Render Active Filter Chips Row
function renderActiveFilterChips() {
    const wrap = document.getElementById('activeFilterChipsWrap');
    const list = document.getElementById('activeFilterChips');
    if (!wrap || !list) return;

    const chips = [];

    if (selectedCategory && selectedCategory !== 'all') {
        const catObj = CATEGORY_OPTIONS.find(c => c.key === selectedCategory);
        chips.push({
            group: 'category',
            val: selectedCategory,
            label: 'Category',
            text: catObj ? catObj.label : selectedCategory
        });
    }

    selectedSubCategories.forEach(sub => {
        chips.push({
            group: 'subCategory',
            val: sub,
            label: 'Sub',
            text: sub
        });
    });

    selectedPlatings.forEach(platKey => {
        const pObj = PLATING_OPTIONS.find(p => p.key === platKey);
        chips.push({
            group: 'plating',
            val: platKey,
            label: 'Plating',
            text: pObj ? pObj.label : platKey
        });
    });

    selectedSetContents.forEach(content => {
        chips.push({
            group: 'setContents',
            val: content,
            label: 'Contents',
            text: content
        });
    });

    selectedStoneColors.forEach(color => {
        chips.push({
            group: 'stoneColor',
            val: color,
            label: 'Stone',
            text: color
        });
    });

    selectedStoneSizes.forEach(size => {
        chips.push({
            group: 'stoneSize',
            val: size,
            label: 'Stone Size',
            text: size
        });
    });

    if (chips.length === 0) {
        wrap.style.display = 'none';
        list.innerHTML = '';
        return;
    }

    wrap.style.display = 'flex';
    list.innerHTML = chips.map(c => `
        <div class="filter-chip">
            <span class="chip-label">${escapeHtml(c.label)}:</span>
            <span class="chip-val">${escapeHtml(c.text)}</span>
            <span class="chip-remove" onclick="removeFilterChip('${escapeHtml(c.group)}', '${escapeJs(c.val)}')">
                <i class="fa-solid fa-xmark"></i>
            </span>
        </div>
    `).join('');
}
window.renderActiveFilterChips = renderActiveFilterChips;

function removeFilterChip(group, val) {
    if (group === 'category') {
        selectCategoryFilter('all');
        return;
    }
    if (group === 'subCategory') selectedSubCategories.delete(val);
    if (group === 'plating') selectedPlatings.delete(val);
    if (group === 'setContents') selectedSetContents.delete(val);
    if (group === 'stoneColor') selectedStoneColors.delete(val);
    if (group === 'stoneSize') selectedStoneSizes.delete(val);

    catalogCurrentPage = 1;
    renderProducts();
    updateFilterUrl();
}
window.removeFilterChip = removeFilterChip;

function clearAllFilters() {
    selectedCategory = 'all';
    activeFilter = 'all';
    selectedSubCategories.clear();
    selectedPlatings.clear();
    selectedSetContents.clear();
    selectedStoneColors.clear();
    selectedStoneSizes.clear();
    activeBadgeFilter = null;
    activeSearchQuery = null;
    catalogCurrentPage = 1;

    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) sortSelect.value = 'featured';
    catalogSort = 'featured';

    const pageTitle = document.getElementById('catalogTitle');
    const pageDesc = document.getElementById('catalogDesc');
    if (pageTitle) pageTitle.innerHTML = 'Cubic Zirconia <em>Masterpieces</em>';
    if (pageDesc) pageDesc.innerHTML = 'Discover handcrafted royal chokers, brilliant solitaires, chandelier earrings, and enduring tennis bracelets.';
    document.title = 'All Jewellery Collections | Sorèva';

    renderProducts();
    updateFilterUrl();
    syncMobileQuickPills('all');
    closeMobileFilterDrawer();
}
window.clearAllFilters = clearAllFilters;

function syncMobileQuickPills(catKey) {
    const key = (catKey || 'all').toLowerCase().trim();
    const pills = document.querySelectorAll('.mobile-quick-filter-pills .quick-pill');
    pills.forEach(p => {
        const pillCat = (p.getAttribute('data-category') || '').toLowerCase().trim();
        if (pillCat === key) {
            p.classList.add('active');
            try { p.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } catch(e){}
        } else {
            p.classList.remove('active');
        }
    });
}
window.syncMobileQuickPills = syncMobileQuickPills;

function selectCategoryFilter(catKey) {
    selectedCategory = catKey;
    activeFilter = catKey;
    selectedSubCategories.clear();
    catalogCurrentPage = 1;

    updateCatalogTitleDesc(catKey);
    renderProducts();
    updateFilterUrl();
    syncMobileQuickPills(catKey);
}
window.selectCategoryFilter = selectCategoryFilter;

function toggleSubCategoryFilter(sub) {
    let matchedExisting = null;
    for (const existing of selectedSubCategories) {
        if (existing === sub || matchProductSubCategory(existing, sub)) {
            matchedExisting = existing;
            break;
        }
    }
    if (matchedExisting) {
        selectedSubCategories.delete(matchedExisting);
    } else {
        selectedSubCategories.add(sub);
    }
    catalogCurrentPage = 1;
    renderProducts();
    updateFilterUrl();
}
window.toggleSubCategoryFilter = toggleSubCategoryFilter;

function togglePlatingFilter(plat) {
    if (selectedPlatings.has(plat)) selectedPlatings.delete(plat);
    else selectedPlatings.add(plat);
    catalogCurrentPage = 1;
    renderProducts();
    updateFilterUrl();
}
window.togglePlatingFilter = togglePlatingFilter;

function toggleSetContentFilter(content) {
    if (selectedSetContents.has(content)) selectedSetContents.delete(content);
    else selectedSetContents.add(content);
    catalogCurrentPage = 1;
    renderProducts();
    updateFilterUrl();
}
window.toggleSetContentFilter = toggleSetContentFilter;

function toggleStoneColorFilter(color) {
    if (selectedStoneColors.has(color)) selectedStoneColors.delete(color);
    else selectedStoneColors.add(color);
    catalogCurrentPage = 1;
    renderProducts();
    updateFilterUrl();
}
window.toggleStoneColorFilter = toggleStoneColorFilter;

function toggleStoneSizeFilter(size) {
    if (selectedStoneSizes.has(size)) selectedStoneSizes.delete(size);
    else selectedStoneSizes.add(size);
    catalogCurrentPage = 1;
    renderProducts();
    updateFilterUrl();
}
window.toggleStoneSizeFilter = toggleStoneSizeFilter;

function toggleFilterAccordion(headerEl) {
    const parent = headerEl.closest('.filter-group-accordion');
    if (parent) {
        parent.classList.toggle('open');
    }
}
window.toggleFilterAccordion = toggleFilterAccordion;

function openMobileFilterDrawer() {
    const sidebar = document.getElementById('catalogSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('active');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}
window.openMobileFilterDrawer = openMobileFilterDrawer;

function closeMobileFilterDrawer() {
    const sidebar = document.getElementById('catalogSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
}
window.closeMobileFilterDrawer = closeMobileFilterDrawer;

function handleLoadMoreProducts() {
    catalogCurrentPage++;
    renderProducts(true);
}
window.handleLoadMoreProducts = handleLoadMoreProducts;

function updateFilterUrl() {
    try {
        if (!window.history || !window.history.replaceState) return;
        const params = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'all') params.set('cat', selectedCategory);
        if (selectedSubCategories.size > 0) params.set('sub', [...selectedSubCategories].join(','));
        if (selectedPlatings.size > 0) params.set('plating', [...selectedPlatings].join(','));
        if (selectedSetContents.size > 0) params.set('setContents', [...selectedSetContents].join(','));
        if (selectedStoneColors.size > 0) params.set('stone', [...selectedStoneColors].join(','));
        if (selectedStoneSizes.size > 0) params.set('stoneSize', [...selectedStoneSizes].join(','));
        if (catalogSort && catalogSort !== 'featured') params.set('sort', catalogSort);
        if (activeBadgeFilter) params.set('badge', activeBadgeFilter);
        if (activeSearchQuery) params.set('q', activeSearchQuery);

        const qs = params.toString();
        const newUrl = qs ? `catalog.html?${qs}` : 'catalog.html';
        window.history.replaceState(null, '', newUrl);
    } catch (e) {}
}
window.updateFilterUrl = updateFilterUrl;

function updateCatalogTitleDesc(catKey, sub, badge) {
    const pageTitle = document.getElementById("catalogTitle");
    const pageDesc = document.getElementById("catalogDesc");
    if (!pageTitle) return;

    if (badge) {
        const b = badge.toLowerCase();
        if (b.includes("new") || b.includes("launch")) {
            pageTitle.innerHTML = "New Launch <em>Collection</em>";
            if (pageDesc) pageDesc.textContent = "Discover our newest demi-fine creations featuring brilliant diamond-cut solitaires.";
            document.title = "New Launch Collection | Sorèva";
            return;
        } else if (b.includes("trend")) {
            pageTitle.innerHTML = "Trending <em>Now</em>";
            if (pageDesc) pageDesc.textContent = "Most sought-after statement pieces trending across weddings and celebrations.";
            document.title = "Trending Collection | Sorèva";
            return;
        } else if (b.includes("best") || b.includes("seller")) {
            pageTitle.innerHTML = "Best <em>Sellers</em>";
            if (pageDesc) pageDesc.textContent = "Our most cherished iconic creations loved by connoisseurs of fine jewellery.";
            document.title = "Best Sellers | Sorèva";
            return;
        }
    }

    if (sub && selectedSubCategories.size === 1) {
        const singleSub = [...selectedSubCategories][0];
        pageTitle.innerHTML = `${escapeHtml(singleSub)} <em>Collection</em>`;
        if (pageDesc) pageDesc.textContent = `Explore our curated ${escapeHtml(singleSub)} selection.`;
        document.title = `${singleSub} | Sorèva`;
        return;
    }

    const catInfoMap = {
        all: { title: "Cubic Zirconia <em>Masterpieces</em>", desc: "Discover handcrafted royal chokers, brilliant solitaires, chandelier earrings, and enduring tennis bracelets.", docTitle: "All Jewellery Collections" },
        wristwear: { title: "Wristwear <em>Collection</em>", desc: "Handcrafted bangles, kadas, and tennis bracelets in 24K gold and rhodium finish.", docTitle: "Wristwear & Bangles" },
        bracelets: { title: "Wristwear <em>Collection</em>", desc: "Handcrafted bangles, kadas, and tennis bracelets in 24K gold and rhodium finish.", docTitle: "Wristwear & Bangles" },
        necklace: { title: "Necklace <em>Collection</em>", desc: "Royal chokers, grand bridal sets, and delicate pavé statement pieces.", docTitle: "Necklaces" },
        necklaces: { title: "Necklace <em>Collection</em>", desc: "Royal chokers, grand bridal sets, and delicate pavé statement pieces.", docTitle: "Necklaces" },
        earrings: { title: "Earrings <em>Collection</em>", desc: "From majestic royal jhumkas and chandeliers to essential daily studs.", docTitle: "Earrings" },
        rings: { title: "Finger Rings <em>Collection</em>", desc: "Exquisite cocktail rings, engagement solitaires, and eternal bands.", docTitle: "Finger Rings" },
        pendants: { title: "Pendants <em>Collection</em>", desc: "Lustrous solitaires, traditional mangalsutras, and festive pendant sets.", docTitle: "Pendants" }
    };

    const info = catInfoMap[catKey] || {
        title: (catKey.charAt(0).toUpperCase() + catKey.slice(1).replace(/-/g, " ")) + " <em>Collection</em>",
        desc: "Discover handcrafted demi-fine creations in " + catKey + ".",
        docTitle: catKey.charAt(0).toUpperCase() + catKey.slice(1)
    };

    pageTitle.innerHTML = info.title;
    if (pageDesc) pageDesc.textContent = info.desc;
    document.title = `${info.docTitle} | Sorèva`;
}
window.updateCatalogTitleDesc = updateCatalogTitleDesc;

function initFilters() {
    // Sort selector
    const sortSelect = document.getElementById('sortBy');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            catalogSort = e.target.value;
            catalogCurrentPage = 1;
            renderProducts();
            updateFilterUrl();
        });
    }

    // Category bar clicks (if on page)
    document.querySelectorAll('.cat-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetCat = link.dataset.category;
            if (targetCat) {
                e.preventDefault();
                selectCategoryFilter(targetCat);
            }
        });
    });
}
window.initFilters = initFilters;

// Primary Products Render Engine
function renderProducts(isLoadMore = false) {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    // Public storefront: only show active and enabled pieces
    let items = PRODUCTS.filter(p => !p.disabled && p.active !== false && p.active !== 0 && p.stockStatus !== 'Disabled');

    // 1. Search Query
    if (activeSearchQuery) {
        const qWords = activeSearchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        items = items.filter(p => {
            const name = (p.name || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            const sub = (p.subCategory || '').toLowerCase();
            const sku = (p.sku || '').toLowerCase();
            const plating = (p.plating || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            const stone = (p.stoneColor || '').toLowerCase();
            const setC = (p.setContents || '').toLowerCase();
            const haystack = `${name} ${cat} ${sub} ${sku} ${plating} ${stone} ${setC} ${desc}`;
            return qWords.every(w => haystack.includes(w));
        });
    }

    // 2. Badge Filter
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

        // If viewing New Launch with default featured sort, interleave categories for a diverse showcase
        if ((activeBadgeFilter.includes('new') || activeBadgeFilter.includes('launch')) && (!catalogSort || catalogSort === 'featured')) {
            const catMap = {};
            items.forEach(p => {
                const c = (p.category || 'other').toLowerCase();
                if (!catMap[c]) catMap[c] = [];
                catMap[c].push(p);
            });
            const cats = Object.keys(catMap);
            const mixed = [];
            const maxLen = Math.max(...cats.map(c => catMap[c].length), 0);
            for (let i = 0; i < maxLen; i++) {
                cats.forEach(c => {
                    if (i < catMap[c].length) mixed.push(catMap[c][i]);
                });
            }
            items = mixed;
        }
    }

    // 3. Category Filter
    if (selectedCategory && selectedCategory !== 'all') {
        items = items.filter(p => matchCategory(p, selectedCategory));
    }

    // 4. Sub Category Multi-Select Filter
    if (selectedSubCategories.size > 0) {
        items = items.filter(p => {
            for (const sub of selectedSubCategories) {
                if (matchProductSubCategory(p.subCategory, sub, p.name)) return true;
            }
            return false;
        });
    }

    // 5. Plating Colour Multi-Select Filter
    if (selectedPlatings.size > 0) {
        items = items.filter(p => selectedPlatings.has(normalizePlating(p.plating)));
    }

    // 6. Set Contents Multi-Select Filter
    if (selectedSetContents.size > 0) {
        items = items.filter(p => p.setContents && selectedSetContents.has(p.setContents));
    }

    // 7. Stone Colour Multi-Select Filter
    if (selectedStoneColors.size > 0) {
        items = items.filter(p => p.stoneColor && selectedStoneColors.has(p.stoneColor));
    }

    // 8. Stone Size Multi-Select Filter
    if (selectedStoneSizes.size > 0) {
        items = items.filter(p => p.stoneSize && selectedStoneSizes.has(p.stoneSize));
    }

    // 9. Sorting
    const sortVal = catalogSort;
    if (sortVal === 'price-low') {
        items.sort((a, b) => a.priceINR - b.priceINR);
    } else if (sortVal === 'price-high') {
        items.sort((a, b) => b.priceINR - a.priceINR);
    } else if (sortVal === 'rating') {
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortVal === 'name-asc') {
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const totalMatching = items.length;
    const pageSize = CATALOG_PAGE_SIZE;
    const page = catalogCurrentPage;
    const paginatedItems = items.slice(0, page * pageSize);

    // Render Product Cards
    if (totalMatching === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 70px 20px; background: #fcfbfa; border: 1px dashed #dcd5cb; border-radius: 12px; margin: 20px 0;">
                <i class="fa-solid fa-gem" style="font-size: 2.8rem; color: #c5a059; margin-bottom: 20px; opacity: 0.85;"></i>
                <h3 style="font-family: var(--font-heading); font-size: 1.6rem; color: var(--text-dark); margin-bottom: 8px;">No Pieces Match Your Selection</h3>
                <p style="color: var(--text-light); max-width: 440px; margin: 0 auto 20px auto; font-size: 0.95rem; line-height: 1.6;">
                    Try unchecking some filters, choosing a different metal finish, or clearing all filters to explore our full atelier collections.
                </p>
                <button type="button" class="btn-primary" onclick="clearAllFilters()" style="padding: 10px 24px; font-weight: 700; border-radius: 24px;">
                    <i class="fa-solid fa-rotate-left" style="margin-right: 6px;"></i> Reset All Filters
                </button>
            </div>
        `;
    } else {
        grid.innerHTML = paginatedItems.map((product, idx) => {
            const hasHover = product.hoverImg && product.hoverImg !== product.primaryImg;
            const isWishlisted = (typeof wishlist !== 'undefined' && Array.isArray(wishlist)) && (wishlist.includes(product.id) || wishlist.includes(String(product.id)) || wishlist.includes(product.sku));
            const isTop = idx < 6;
            const priorityAttrs = isTop ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"';
            const primaryUrl = getOptimizedImgUrl(product.primaryImg);
            const hoverUrl = getOptimizedImgUrl(product.hoverImg);
            return `
            <div class="product-card ${isProductOutOfStock(product) ? 'is-out-of-stock' : ''}" data-id="${product.id}" onclick="handleProductCardClick(event, '${product.id}')" style="cursor: pointer;">
                <div class="product-thumb-wrap ${!hasHover ? 'scale-hover-only' : ''}">
                    <img class="product-thumb primary-img" src="${primaryUrl}" alt="${escapeHtml(product.name)}" ${priorityAttrs} onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
                    ${hasHover ? `<img class="product-thumb hover-img" data-src="${hoverUrl}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.style.display='none'; this.parentElement.classList.add('scale-hover-only');">` : ''}
                    
                    <div class="product-badges">
                        ${isProductOutOfStock(product) ? '<span class="product-badge badge-sold-out"><i class="fa-solid fa-ban"></i> OUT OF STOCK</span>' : renderProductBadgeHtml(product.badge)}
                        ${(!isProductOutOfStock(product) && product.launchOffer) ? `<span class="product-badge badge-launch">15% OFF</span>` : ''}
                    </div>

                    <button type="button" class="btn-wishlist ${isWishlisted ? 'active' : ''}" data-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')" title="Add to Wishlist">
                        <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <div class="product-quick-actions" onclick="event.stopPropagation();">
                        <button type="button" class="btn-quick-view" onclick="event.stopPropagation(); openQuickView('${product.id}', event);" ontouchend="event.stopPropagation(); openQuickView('${product.id}', event);">
                            <i class="fa-regular fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>

                <div class="product-details">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span class="product-category-sub" style="margin-bottom: 0;">${escapeHtml(product.subCategory || product.category)}</span>
                        <span class="product-finish-pill" title="Crafted Finish">${formatPlating(product.plating)}</span>
                    </div>
                    <h3 class="product-title">${escapeHtml(product.name)}</h3>
                    <div class="product-price-row">
                        <span class="price-current">${formatPrice(product.priceINR)}</span>
                        ${product.originalPriceINR > product.priceINR ? `<span class="price-original">${formatPrice(product.originalPriceINR)}</span>` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    // Update Top Results Count
    const resCountEl = document.getElementById('catalogResultsCount');
    if (resCountEl) {
        resCountEl.innerHTML = `Showing <strong>${paginatedItems.length.toLocaleString()}</strong> of <strong>${totalMatching.toLocaleString()}</strong> pieces`;
    }

    // Update Pagination Progress & Load More Button
    const pagWrap = document.getElementById('catalogPaginationWrap');
    const pagShown = document.getElementById('pagShownCount');
    const pagTotal = document.getElementById('pagTotalCount');
    const pagFill = document.getElementById('paginationFill');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (pagWrap && pagShown && pagTotal && pagFill) {
        if (totalMatching > 0) {
            pagWrap.style.display = 'flex';
            pagShown.textContent = paginatedItems.length.toLocaleString();
            pagTotal.textContent = totalMatching.toLocaleString();
            const pct = Math.min(100, Math.round((paginatedItems.length / totalMatching) * 100));
            pagFill.style.width = `${pct}%`;

            if (loadMoreBtn) {
                if (paginatedItems.length >= totalMatching) {
                    loadMoreBtn.style.display = 'none';
                } else {
                    loadMoreBtn.style.display = 'inline-flex';
                    const remaining = totalMatching - paginatedItems.length;
                    const textSpan = loadMoreBtn.querySelector('span');
                    if (textSpan) textSpan.textContent = `Load More Creations (${remaining.toLocaleString()} remaining)`;
                }
            }
        } else {
            pagWrap.style.display = 'none';
        }
    }

    // Update Mobile Filter Badge
    const filterBadgeNum = document.getElementById('filterBadgeNum');
    const totalActiveFilters = (selectedCategory !== 'all' ? 1 : 0) +
        selectedSubCategories.size +
        selectedPlatings.size +
        selectedSetContents.size +
        selectedStoneColors.size +
        selectedStoneSizes.size;

    if (filterBadgeNum) {
        if (totalActiveFilters > 0) {
            filterBadgeNum.textContent = totalActiveFilters;
            filterBadgeNum.style.display = 'inline-flex';
        } else {
            filterBadgeNum.style.display = 'none';
        }
    }

    // Sync Active Filter Chips Row
    renderActiveFilterChips();

    // Sync Sidebar Counts & Active States
    renderFilterSidebar();
}
window.renderProducts = renderProducts;

// ==========================================
// Cart State & Slide-Over Drawer
// ==========================================
function initCartDrawer() {
    if (typeof ensureCartDrawerInDOM === 'function') ensureCartDrawerInDOM();

    const openBtns = document.querySelectorAll('.cart-open-btn, #headerCartBtn');
    const closeBtn = document.getElementById('cartDrawerClose');
    const backdrop = document.getElementById('cartDrawerBackdrop');

    openBtns.forEach(btn => {
        let lastTouch = 0;
        btn.addEventListener('click', (e) => {
            if (Date.now() - lastTouch < 500) return;
            e.preventDefault();
            openCartDrawer();
        });
        btn.addEventListener('touchend', (e) => {
            lastTouch = Date.now();
            e.preventDefault();
            openCartDrawer();
        }, { passive: false });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeCartDrawer();
        });
    }
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            e.preventDefault();
            closeCartDrawer();
        });
    }

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
                { code: 'DIWALI20', discountPercent: 20, minSpendINR: 0, active: true, description: 'Flat 20% Off Everything (Diwali Festive Offer)' },
                { code: 'FLAT200', discountAmountINR: 200, discountPercent: 0, minSpendINR: 0, active: true, description: 'FLAT ₹200 OFF on your first luxury order' },
                { code: 'LAUNCH15', discountPercent: 15, minSpendINR: 0, active: true },
                { code: 'FESTIVE20', discountPercent: 20, minSpendINR: 4000, active: true },
                { code: 'ROYAL10', discountPercent: 10, minSpendINR: 1500, active: true }
            ];

            const found = couponList.find(c => c.active && c.code.toUpperCase() === code);
            if (found) {
                const subtotal = (cart || []).reduce((sum, item) => {
                    const prod = (typeof findProductById === 'function') ? findProductById(item.productId) : null;
                    const price = prod ? (prod.priceINR || 0) : (Number(item.priceINR) || 0);
                    return sum + (price * (parseInt(item.qty) || 1));
                }, 0);

                if (found.minSpendINR && subtotal < found.minSpendINR) {
                    showToast(`Min spend of ${formatPrice(found.minSpendINR)} required for ${found.code}.`);
                    return;
                }

                appliedCoupon = found;
                try { localStorage.setItem('soreva_applied_coupon', JSON.stringify(appliedCoupon)); } catch (e) {}
                updateCartUI();
                if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
                const discText = found.discountAmountINR ? `₹${found.discountAmountINR}` : `${found.discountPercent}%`;
                showToast(`Coupon ${found.code} applied! ${discText} discount granted.`);
            } else {
                showToast(`Invalid or expired coupon "${code}". Try FLAT200 or LAUNCH15.`);
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

function handlePdpAddToCart() {
    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
    const productId = (window.currentPdpProduct && window.currentPdpProduct.id) || (urlParams ? urlParams.get('id') : null);
    if (!productId) {
        if (typeof showToast === 'function') showToast("Product details loading, please try in a moment.", "info");
        return;
    }
    const prod = (typeof findProductById === 'function') ? findProductById(productId) : (window.currentPdpProduct || null);
    if (prod && isProductOutOfStock(prod)) {
        if (typeof showToast === 'function') showToast("This piece is currently out of stock.", "warning");
        return;
    }
    const qtyInput = document.getElementById('pdpQty');
    const qty = Math.max(1, parseInt(qtyInput ? qtyInput.value : 1) || 1);
    const finish = (prod && prod.plating) ? formatPlating(prod.plating) : '24K Gold';
    addToCart(productId, finish, qty);
}
window.handlePdpAddToCart = handlePdpAddToCart;

function handlePdpBuyNow() {
    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
    const productId = (window.currentPdpProduct && window.currentPdpProduct.id) || (urlParams ? urlParams.get('id') : null);
    if (!productId) {
        if (typeof showToast === 'function') showToast("Product details loading, please try in a moment.", "info");
        return;
    }
    const prod = (typeof findProductById === 'function') ? findProductById(productId) : (window.currentPdpProduct || null);
    if (prod && isProductOutOfStock(prod)) {
        if (typeof showToast === 'function') showToast("This piece is currently out of stock and cannot be purchased.", "warning");
        return;
    }
    const qtyInput = document.getElementById('pdpQty');
    const qty = Math.max(1, parseInt(qtyInput ? qtyInput.value : 1) || 1);
    const finish = (prod && prod.plating) ? formatPlating(prod.plating) : '24K Gold';
    addToCart(productId, finish, qty, { skipDrawer: true });
    closeCartDrawer();
    openCheckoutModal();
}
window.handlePdpBuyNow = handlePdpBuyNow;

function handleModalBuyNow() {
    const addBtn = document.getElementById('modalAddToCartBtn');
    if (addBtn) {
        addBtn.click();
    }
    const qModal = document.getElementById('quickViewBackdrop');
    if (qModal) qModal.classList.remove('active');
    closeCartDrawer();
    openCheckoutModal();
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
        if (pctText) {
            if (appliedCoupon.discountAmountINR) {
                const parent = pctText.parentElement;
                if (parent) {
                    parent.innerHTML = `Coupon <strong id="chkAppliedCouponCodeText" style="letter-spacing: 0.5px;">${appliedCoupon.code}</strong> applied (<span id="chkAppliedCouponPercentText">₹${appliedCoupon.discountAmountINR} off</span>)`;
                } else {
                    pctText.textContent = `₹${appliedCoupon.discountAmountINR} off`;
                }
            } else {
                pctText.textContent = appliedCoupon.discountPercent;
            }
        }
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
    if (appliedCoupon) {
        if (appliedCoupon.discountPercent) {
            discountINR = Math.round(subtotalINR * (appliedCoupon.discountPercent / 100));
        } else if (appliedCoupon.discountAmountINR) {
            discountINR = Math.min(subtotalINR, Number(appliedCoupon.discountAmountINR) || 0);
        }
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
        { code: 'DIWALI20', discountPercent: 20, minSpendINR: 0, active: true, description: 'Flat 20% Off Everything (Diwali Festive Offer)' },
        { code: 'FLAT200', discountAmountINR: 200, discountPercent: 0, minSpendINR: 0, active: true, description: 'FLAT ₹200 OFF on your first luxury order' },
        { code: 'LAUNCH15', discountPercent: 15, minSpendINR: 0, active: true },
        { code: 'FESTIVE20', discountPercent: 20, minSpendINR: 4000, active: true },
        { code: 'ROYAL10', discountPercent: 10, minSpendINR: 1500, active: true }
    ];

    const found = couponList.find(c => c.active && c.code.toUpperCase() === code);
    if (!found) {
        if (msgEl) {
            msgEl.textContent = `Invalid or expired coupon "${code}". Try FLAT200 or LAUNCH15.`;
            msgEl.style.color = "#ff6b6b";
            msgEl.style.display = "block";
        }
        if (typeof showToast === 'function') showToast(`Invalid or expired coupon "${code}". Try FLAT200 or LAUNCH15.`);
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
    try { localStorage.setItem('soreva_applied_coupon', JSON.stringify(appliedCoupon)); } catch (e) {}
    updateCartUI();
    updateCheckoutTotals();

    // Sync cart input if present
    const cartCpnInput = document.getElementById('couponCodeInput');
    if (cartCpnInput) cartCpnInput.value = found.code;

    const discountMsg = found.discountAmountINR ? `₹${found.discountAmountINR} flat discount` : `${found.discountPercent}% discount`;
    if (msgEl) {
        msgEl.textContent = `Coupon ${found.code} applied! ${discountMsg} granted.`;
        msgEl.style.color = "#81c784";
        msgEl.style.display = "block";
    }
    if (typeof showToast === 'function') {
        showToast(`Coupon ${found.code} applied! ${discountMsg} granted.`);
    }
}
window.handleCheckoutApplyCoupon = handleCheckoutApplyCoupon;

function handleCheckoutRemoveCoupon() {
    const prevCode = appliedCoupon ? appliedCoupon.code : '';
    appliedCoupon = null;
    try { localStorage.removeItem('soreva_applied_coupon'); } catch (e) {}

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
            primaryImg: item.primaryImg || 'assets/placeholder-jewelry.svg'
        };
        const price = prod.priceINR || 0;
        const itemTot = price * (item.qty || 1);
        subtotalINR += itemTot;

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${getOptimizedImgUrl(prod.primaryImg) || 'assets/placeholder-jewelry.svg'}" alt="${(prod.name || '').replace(/"/g, '&quot;')}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(197,160,89,0.2);" onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
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
    const invNumEl = document.getElementById('successInvoiceNum');
    const invBtnEl = document.getElementById('successInvoiceBtn');
    const totalAmtEl = document.getElementById('successTotalAmt');
    const payMethodEl = document.getElementById('successPaymentMethod');
    const payIdRow = document.getElementById('successPaymentIdRow');
    const payIdEl = document.getElementById('successPaymentId');

    if (custEl) custEl.textContent = name;
    if (orderNumEl) orderNumEl.textContent = res.orderNumber || 'SRV-2026-1085';

    const invNum = res.invoiceNumber || ('INV-' + (res.orderNumber || '').replace('SRV-', ''));
    if (invNumEl) invNumEl.textContent = invNum;
    if (invBtnEl) {
        invBtnEl.href = res.invoiceUrl || `/api/orders/invoice?id=${res.orderId || ''}`;
    }

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
    if (appliedCoupon) {
        if (appliedCoupon.discountPercent) {
            discountINR = Math.round(subtotalINR * (appliedCoupon.discountPercent / 100));
        } else if (appliedCoupon.discountAmountINR) {
            discountINR = Math.min(subtotalINR, Number(appliedCoupon.discountAmountINR) || 0);
        }
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
                    image: (window.location.origin ? window.location.origin + '/assets/logo-black.png' : 'https://soreva.in/assets/logo-black.png'),
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
    if (typeof closeFestivePopup === 'function') closeFestivePopup();
    if (typeof closeWelcomeDiscountModal === 'function') closeWelcomeDiscountModal();
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
    openCartDrawer();
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

// ==========================================================================
// WELCOME DISCOUNT & MOBILE OTP AUTH ENGINE (KUSHAL'S / SOREVA LUXURY)
// ==========================================================================
// ==========================================================================
// FESTIVE DIWALI EMAIL OFFER POP-UP ENGINE (AS ATTACHED SCREEN)
// ==========================================================================
let _festivePopupConfig = null;

async function initFestivePopup() {
    try {
        const res = await fetch('/api/popup/config');
        if (res.ok) {
            const data = await res.json();
            if (data && data.config) {
                _festivePopupConfig = data.config;
                applyFestivePopupConfig(data.config);

                // Auto-open if enabled and not already dismissed/claimed in session
                if (data.config.enabled !== false) {
                    const dismissed = sessionStorage.getItem('festive_popup_dismissed');
                    const claimed = localStorage.getItem('festive_popup_claimed');
                    if (dismissed !== 'true' && claimed !== 'true') {
                        const delaySecs = parseFloat(data.config.delaySeconds || 2) * 1000;
                        setTimeout(() => {
                            if (sessionStorage.getItem('festive_popup_dismissed') !== 'true') {
                                openFestivePopup();
                            }
                        }, Math.max(800, delaySecs));
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[Festive Popup Config Error]', e);
    }
}
window.initFestivePopup = initFestivePopup;

function applyFestivePopupConfig(cfg) {
    if (!cfg) return;
    const t1 = document.getElementById('festivePopupTitle1');
    if (t1 && cfg.headline1) t1.textContent = cfg.headline1;

    const t2 = document.getElementById('festivePopupTitle2');
    if (t2 && cfg.headline2) {
        if (cfg.headline2.includes('<strong>') || cfg.headline2.includes('<b>')) {
            t2.innerHTML = cfg.headline2;
        } else {
            t2.innerHTML = cfg.headline2.replace(/(20% Off Everything!|[0-9]+% Off[^<]*)/gi, '<strong>$1</strong>');
        }
    }

    const img = document.getElementById('festivePopupImg');
    if (img && cfg.imageUrl) img.src = cfg.imageUrl;

    const desc = document.getElementById('festivePopupDesc');
    if (desc && cfg.description) desc.textContent = cfg.description;

    const input = document.getElementById('festivePopupEmail');
    if (input && cfg.placeholderText) input.placeholder = cfg.placeholderText;

    const btn = document.getElementById('festivePopupSubmitBtn');
    if (btn && cfg.buttonText) {
        const span = btn.querySelector('span');
        if (span) span.textContent = cfg.buttonText;
    }
}
window.applyFestivePopupConfig = applyFestivePopupConfig;

function openFestivePopup() {
    if (typeof closeEntryPrologue === 'function') closeEntryPrologue();
    const entry = document.getElementById('entryExperience');
    if (entry) {
        entry.classList.add('unveiled');
    }

    const backdrop = document.getElementById('festivePopupBackdrop');
    if (!backdrop) return;
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Restore initial form view if previously submitted
    const formWrap = document.getElementById('festivePopupFormWrap');
    if (formWrap) formWrap.style.display = '';
    const media = document.querySelector('.festive-popup-media');
    if (media) media.style.display = '';
    const desc = document.getElementById('festivePopupDesc');
    if (desc) desc.style.display = '';
    const header = document.querySelector('.festive-popup-header');
    if (header) header.style.display = '';
    const successWrap = document.getElementById('festivePopupSuccess');
    if (successWrap) successWrap.style.display = 'none';

    // If config was already fetched, make sure it is applied
    if (_festivePopupConfig) applyFestivePopupConfig(_festivePopupConfig);

    setTimeout(() => {
        const input = document.getElementById('festivePopupEmail');
        if (input) input.focus();
    }, 200);
}
window.openFestivePopup = openFestivePopup;
window.openWelcomeDiscountModal = openFestivePopup; // Alias so all triggers work

function closeFestivePopup() {
    const backdrop = document.getElementById('festivePopupBackdrop');
    if (backdrop) {
        backdrop.classList.remove('active');
    }
    document.body.style.overflow = '';
    try {
        sessionStorage.setItem('festive_popup_dismissed', 'true');
    } catch (e) {}
}
window.closeFestivePopup = closeFestivePopup;
window.closeWelcomeDiscountModal = closeFestivePopup;

async function handleFestivePopupSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById('festivePopupEmail');
    const submitBtn = document.getElementById('festivePopupSubmitBtn');
    if (!emailInput || !submitBtn) return;

    const email = (emailInput.value || '').trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
        if (typeof showToast === 'function') showToast('Please enter a valid email address.');
        emailInput.focus();
        return;
    }

    const origBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span><i class="fa-solid fa-spinner fa-spin"></i> Submitting...</span>';

    try {
        const res = await fetch('/api/popup/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            const offerCode = data.offerCode || 'DIWALI20';
            const discText = data.discountText || 'Flat 20% Off Everything!';

            const emailSpan = document.getElementById('festiveSuccessEmailText');
            if (emailSpan) emailSpan.textContent = email;

            const codeBadge = document.getElementById('festiveSuccessCodeBadge');
            if (codeBadge) codeBadge.textContent = offerCode;

            const discSpan = document.getElementById('festiveSuccessDiscountText');
            if (discSpan) discSpan.textContent = discText;

            const formWrap = document.getElementById('festivePopupFormWrap');
            if (formWrap) formWrap.style.display = 'none';

            const media = document.querySelector('.festive-popup-media');
            if (media) media.style.display = 'none';

            const desc = document.getElementById('festivePopupDesc');
            if (desc) desc.style.display = 'none';

            const header = document.querySelector('.festive-popup-header');
            if (header) header.style.display = 'none';

            const successWrap = document.getElementById('festivePopupSuccess');
            if (successWrap) successWrap.style.display = 'block';

            try {
                window.appliedCoupon = {
                    code: offerCode,
                    discountPercent: 20,
                    minSpendINR: 0,
                    active: true,
                    description: discText
                };
                localStorage.setItem('soreva_applied_coupon', JSON.stringify(window.appliedCoupon));
                if (typeof renderCartSummary === 'function') renderCartSummary();
                if (typeof updateCartCount === 'function') updateCartCount();
            } catch (err) {}

            try {
                localStorage.setItem('festive_popup_claimed', 'true');
            } catch (err) {}

            if (typeof showToast === 'function') {
                showToast(`🎉 Coupon ${offerCode} applied! Confirmation email sent to ${email}`);
            }
        } else {
            if (typeof showToast === 'function') {
                showToast(data.error || 'Failed to submit email. Please try again.');
            }
        }
    } catch (err) {
        console.error('[Popup Subscribe Error]', err);
        if (typeof showToast === 'function') {
            showToast('Network error submitting email. Please try again.');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
    }
}
window.handleFestivePopupSubmit = handleFestivePopupSubmit;

function handleFestiveShopNow() {
    const codeBadge = document.getElementById('festiveSuccessCodeBadge');
    const code = (codeBadge ? codeBadge.textContent : 'DIWALI20').trim();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            if (typeof showToast === 'function') showToast(`Copied code "${code}" to clipboard!`);
        }).catch(() => {});
    }

    closeFestivePopup();

    const catalog = document.getElementById('catalog') || document.querySelector('.catalog-section');
    if (catalog) {
        catalog.scrollIntoView({ behavior: 'smooth' });
    }
}
window.handleFestiveShopNow = handleFestiveShopNow;

let welcomeOtpTimer = null;
let welcomeOtpCountdown = 30;
let welcomeActivePhone = '';

function openWelcomeDiscountModal() {
    const backdrop = document.getElementById('welcomeDiscountBackdrop');
    if (!backdrop) return;
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset alert
    const alertBox = document.getElementById('welcomeAlertMessage');
    if (alertBox) {
        alertBox.className = 'welcome-alert-message';
        alertBox.style.display = 'none';
        alertBox.textContent = '';
    }

    // Default to phone step unless already on success
    const successStep = document.getElementById('welcomeStepSuccess');
    if (successStep && successStep.style.display !== 'block') {
        switchWelcomeModalStep('phone');
    }

    setTimeout(() => {
        const input = document.getElementById('welcomePhoneInput');
        if (input && !input.disabled) input.focus();
    }, 200);
}
window.openWelcomeDiscountModal = openWelcomeDiscountModal;

function closeWelcomeDiscountModal() {
    const backdrop = document.getElementById('welcomeDiscountBackdrop');
    if (backdrop) {
        backdrop.classList.remove('active');
    }
    document.body.style.overflow = '';
    try {
        sessionStorage.setItem('soreva_welcome_dismissed', 'true');
    } catch (e) {}
    if (welcomeOtpTimer) {
        clearInterval(welcomeOtpTimer);
        welcomeOtpTimer = null;
    }
}
window.closeWelcomeDiscountModal = closeWelcomeDiscountModal;

function switchWelcomeModalStep(step) {
    const phoneStep = document.getElementById('welcomeStepPhone');
    const otpStep = document.getElementById('welcomeStepOtp');
    const successStep = document.getElementById('welcomeStepSuccess');
    const alertBox = document.getElementById('welcomeAlertMessage');

    if (alertBox) {
        alertBox.className = 'welcome-alert-message';
        alertBox.style.display = 'none';
        alertBox.textContent = '';
    }

    if (phoneStep) phoneStep.style.display = (step === 'phone') ? 'block' : 'none';
    if (otpStep) otpStep.style.display = (step === 'otp') ? 'block' : 'none';
    if (successStep) successStep.style.display = (step === 'success') ? 'block' : 'none';

    if (step === 'otp') {
        const firstCell = document.querySelector('.welcome-otp-cell[data-idx="0"]');
        if (firstCell) {
            setTimeout(() => firstCell.focus(), 150);
        }
    } else if (step === 'phone') {
        const phoneInput = document.getElementById('welcomePhoneInput');
        if (phoneInput) {
            setTimeout(() => phoneInput.focus(), 150);
        }
    }
}
window.switchWelcomeModalStep = switchWelcomeModalStep;

function showWelcomeAlert(msg, type = 'error') {
    const alertBox = document.getElementById('welcomeAlertMessage');
    if (!alertBox) return;
    alertBox.className = `welcome-alert-message ${type}`;
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
}

function handleWelcomePhoneInput(input) {
    input.value = input.value.replace(/\D/g, '').slice(0, 10);
    const btn = document.getElementById('welcomeSendOtpBtn');
    if (!btn) return;
    if (input.value.length === 10 && /^[6-9]/.test(input.value)) {
        btn.disabled = false;
        btn.classList.add('ready');
    } else {
        btn.disabled = true;
        btn.classList.remove('ready');
    }
}
window.handleWelcomePhoneInput = handleWelcomePhoneInput;

async function handleWelcomeSendOtp(e) {
    if (e) e.preventDefault();
    const phoneInput = document.getElementById('welcomePhoneInput');
    const btn = document.getElementById('welcomeSendOtpBtn');
    const consent = document.getElementById('welcomeConsentCheckbox');

    if (!phoneInput) return;
    const phone = phoneInput.value.trim();

    if (phone.length !== 10 || !/^[6-9]/.test(phone)) {
        showWelcomeAlert('Please enter a valid 10-digit Indian mobile number.', 'error');
        return;
    }

    if (consent && !consent.checked) {
        showWelcomeAlert('Please agree to terms to proceed.', 'error');
        return;
    }

    welcomeActivePhone = phone;
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Sending OTP...</span>';

    try {
        const resp = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await resp.json();

        if (resp.ok && data.success) {
            const phoneDisp = document.getElementById('welcomeOtpPhoneDisplay');
            if (phoneDisp) phoneDisp.textContent = `+91 ${phone.slice(0, 2)}******${phone.slice(-2)}`;

            switchWelcomeModalStep('otp');
            startWelcomeOtpCountdown();

            // Clear any old digits
            document.querySelectorAll('.welcome-otp-cell').forEach(c => c.value = '');

            const codeToUse = data.otpDemo || '1234';
            window._lastDemoOtp = codeToUse;
            window._currentOtpCode = codeToUse;

            const badge = document.getElementById('welcomeOtpCodeBadge');
            if (badge) badge.textContent = codeToUse;

            // Auto-fill code so user never gets stuck waiting
            setTimeout(() => {
                handleAutoFillOtp(codeToUse);
            }, 350);

            if (data.smsDelivered) {
                if (typeof showToast === 'function') {
                    showToast(`OTP sent to +91 ${phone} via SMS!`);
                }
            } else {
                if (typeof showToast === 'function') {
                    showToast(`Verification code: ${codeToUse}`);
                }
            }
        } else {
            showWelcomeAlert(data.error || 'Failed to send verification code. Please check number.', 'error');
        }
    } catch (err) {
        showWelcomeAlert('Network error sending OTP. Please check connection.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}
window.handleWelcomeSendOtp = handleWelcomeSendOtp;

function handleAutoFillOtp(code) {
    const otp = code || window._currentOtpCode || window._lastDemoOtp || '1234';
    const cells = document.querySelectorAll('.welcome-otp-cell');
    if (!cells || !cells.length) return;
    const digits = String(otp).split('');
    cells.forEach((cell, idx) => {
        if (digits[idx]) cell.value = digits[idx];
    });
    const lastCell = cells[Math.min(digits.length - 1, cells.length - 1)];
    if (lastCell) lastCell.focus();
}
window.handleAutoFillOtp = handleAutoFillOtp;

function startWelcomeOtpCountdown() {
    if (welcomeOtpTimer) clearInterval(welcomeOtpTimer);
    welcomeOtpCountdown = 30;

    const timerSpan = document.getElementById('welcomeResendSecs');
    const timerText = document.getElementById('welcomeResendTimerText');
    const resendBtn = document.getElementById('welcomeResendBtn');

    if (resendBtn) resendBtn.disabled = true;
    if (timerText) timerText.style.display = 'inline';
    if (timerSpan) timerSpan.textContent = welcomeOtpCountdown;

    welcomeOtpTimer = setInterval(() => {
        welcomeOtpCountdown--;
        if (timerSpan) timerSpan.textContent = welcomeOtpCountdown;
        if (welcomeOtpCountdown <= 0) {
            clearInterval(welcomeOtpTimer);
            welcomeOtpTimer = null;
            if (timerText) timerText.style.display = 'none';
            if (resendBtn) resendBtn.disabled = false;
        }
    }, 1000);
}

function handleWelcomeResendOtp() {
    handleWelcomeSendOtp();
}
window.handleWelcomeResendOtp = handleWelcomeResendOtp;

async function handleWelcomeVerifyOtp(e) {
    if (e) e.preventDefault();
    const cells = document.querySelectorAll('.welcome-otp-cell');
    const otp = Array.from(cells).map(c => c.value).join('').trim();
    const btn = document.getElementById('welcomeVerifyOtpBtn');

    if (otp.length < 4) {
        showWelcomeAlert('Please enter the complete 4-digit verification code.', 'error');
        return;
    }

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Verifying...</span>';

    try {
        const resp = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: welcomeActivePhone,
                otp: otp,
                cart: cart
            })
        });
        const data = await resp.json();

        if (resp.ok && data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('soreva_auth_token', authToken);
            localStorage.setItem('soreva_user', JSON.stringify(currentUser));
            if (data.cart) {
                cart = data.cart;
                try { localStorage.setItem('sorevaCart', JSON.stringify(cart)); } catch (e) {}
            }

            // Automatically apply FLAT200 Coupon
            appliedCoupon = {
                code: 'FLAT200',
                discountAmountINR: 200,
                discountPercent: 0,
                minSpendINR: 0,
                active: true,
                description: 'FLAT ₹200 OFF on your first luxury order'
            };
            try {
                localStorage.setItem('soreva_applied_coupon', JSON.stringify(appliedCoupon));
            } catch (e) {}

            try {
                localStorage.setItem('soreva_welcome_claimed', 'true');
                sessionStorage.setItem('soreva_welcome_dismissed', 'true');
            } catch (e) {}

            updateUserUI();
            updateCartUI();
            if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
            if (typeof updateCheckoutCouponUI === 'function') updateCheckoutCouponUI();
            broadcastCrossTab('USER_LOGGED_IN', { user: currentUser, token: authToken, cart: cart });

            switchWelcomeModalStep('success');

            if (typeof showToast === 'function') {
                showToast('Welcome to Sorèva! FLAT ₹200 OFF code FLAT200 applied.');
            }
        } else {
            showWelcomeAlert(data.error || 'Invalid code. Try again or use 1234.', 'error');
        }
    } catch (err) {
        showWelcomeAlert('Network error while verifying OTP. Please retry.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}
window.handleWelcomeVerifyOtp = handleWelcomeVerifyOtp;

function handleWelcomeSuccessContinue() {
    closeWelcomeDiscountModal();
    const trending = document.getElementById('featuredCollections') || document.getElementById('trendingNow');
    if (trending) {
        trending.scrollIntoView({ behavior: 'smooth' });
    }
}
window.handleWelcomeSuccessContinue = handleWelcomeSuccessContinue;

function initWelcomeOtpCellInputs() {
    const cells = document.querySelectorAll('.welcome-otp-cell');
    if (!cells || !cells.length) return;

    cells.forEach((cell, idx) => {
        cell.addEventListener('input', () => {
            const val = cell.value.replace(/\D/g, '');
            cell.value = val ? val[0] : '';
            if (cell.value && idx < cells.length - 1) {
                cells[idx + 1].focus();
            }
            const fullOtp = Array.from(cells).map(c => c.value).join('');
            if (fullOtp.length === 4) {
                handleWelcomeVerifyOtp();
            }
        });

        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!cell.value && idx > 0) {
                    cells[idx - 1].focus();
                }
            } else if (e.key === 'ArrowLeft' && idx > 0) {
                cells[idx - 1].focus();
            } else if (e.key === 'ArrowRight' && idx < cells.length - 1) {
                cells[idx + 1].focus();
            }
        });

        cell.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const clean = text.replace(/\D/g, '').slice(0, cells.length);
            if (clean.length > 0) {
                clean.split('').forEach((char, i) => {
                    if (cells[i]) cells[i].value = char;
                });
                const nextIdx = Math.min(clean.length, cells.length - 1);
                cells[nextIdx].focus();
                if (clean.length === 4) {
                    handleWelcomeVerifyOtp();
                }
            }
        });
    });
}

function checkAutoOpenWelcomeModal() {
    try {
        const token = localStorage.getItem('soreva_auth_token');
        const dismissed = sessionStorage.getItem('soreva_welcome_dismissed');
        const claimed = localStorage.getItem('soreva_welcome_claimed');

        if (token || dismissed === 'true' || claimed === 'true') {
            return;
        }

        setTimeout(() => {
            if (!localStorage.getItem('soreva_auth_token') && sessionStorage.getItem('soreva_welcome_dismissed') !== 'true') {
                openWelcomeDiscountModal();
            }
        }, 2800);
    } catch (e) {
        console.warn('[Welcome Modal Init Error]', e);
    }
}

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

async function fetchProductData(pid) {
    if (!pid) return null;
    const strPid = String(pid).trim();
    const cleanNum = strPid.replace(/^czm_/, '');

    // 1. Check in-memory first
    let found = (typeof findProductById === 'function') ? findProductById(strPid) : null;
    if (found) return found;

    // 2. Fetch directly from the high-speed backend endpoint
    try {
        const resp = await fetch(`/api/product?id=${encodeURIComponent(strPid)}`);
        if (resp.ok) {
            const data = await resp.json();
            if (data && data.success && data.product) {
                const prod = data.product;
                if (prod.primaryImg) prod.primaryImg = getOptimizedImgUrl(prod.primaryImg);
                if (prod.hoverImg) prod.hoverImg = getOptimizedImgUrl(prod.hoverImg);
                if (Array.isArray(prod.gallery)) {
                    prod.gallery = prod.gallery.map(g => getOptimizedImgUrl(g));
                }
                if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) {
                    const idx = PRODUCTS.findIndex(p => String(p.id).trim() === String(prod.id).trim() || String(p.id).replace(/^czm_/, '') === cleanNum);
                    if (idx >= 0) {
                        PRODUCTS[idx] = prod;
                    } else {
                        PRODUCTS.push(prod);
                    }
                }
                return prod;
            }
        }
    } catch (e) {
        console.warn('[fetchProductData] Failed to fetch product:', strPid, e);
    }
    return null;
}
window.fetchProductData = fetchProductData;

function ensureCartDrawerInDOM() {
    let backdrop = document.getElementById('cartDrawerBackdrop');
    let drawer = document.getElementById('cartDrawer');
    if (backdrop && backdrop.parentElement !== document.body) {
        document.body.appendChild(backdrop);
    }
    if (drawer && drawer.parentElement !== document.body) {
        document.body.appendChild(drawer);
    }
}
window.ensureCartDrawerInDOM = ensureCartDrawerInDOM;

function openCartDrawer() {
    ensureCartDrawerInDOM();

    // Close any conflicting drawers or modals
    if (typeof closeWishlistDrawer === 'function') closeWishlistDrawer();
    if (typeof closeMobileNavDrawer === 'function') closeMobileNavDrawer();
    if (typeof closeQuickView === 'function') closeQuickView();
    if (typeof closeSearchOverlay === 'function') closeSearchOverlay();

    // Lock page background scrolling
    document.body.style.overflow = 'hidden';

    // Refresh UI before presenting
    if (typeof updateCartUI === 'function') updateCartUI();

    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer) drawer.classList.add('active');
    if (backdrop) backdrop.classList.add('active');

    try {
        window.dispatchEvent(new CustomEvent('soreva:cart-opened', { detail: { count: (cart || []).length } }));
    } catch(e) {}
}

function closeCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');

    // Only restore body overflow if no other modal/drawer is active
    const qv = document.getElementById('quickViewBackdrop');
    const chk = document.getElementById('checkoutModalBackdrop');
    const wl = document.getElementById('wishlistDrawer');
    const nav = document.getElementById('mobileNavDrawer');
    const isOtherModalOpen = (qv && qv.classList.contains('active')) ||
                            (chk && chk.classList.contains('active')) ||
                            (wl && wl.classList.contains('active')) ||
                            (nav && nav.classList.contains('active'));
    if (!isOtherModalOpen) {
        document.body.style.overflow = '';
    }

    try {
        window.dispatchEvent(new CustomEvent('soreva:cart-closed'));
    } catch(e) {}
}
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;

function addToCart(productId, finish = "24K Gold", quantity = 1, options = {}) {
    if (typeof finish === 'number') {
        const temp = finish;
        finish = (typeof quantity === 'string' && quantity) ? quantity : "24K Gold";
        quantity = temp;
    }
    if (typeof quantity === 'object' && quantity !== null && (!options || Object.keys(options).length === 0)) {
        options = quantity;
        quantity = 1;
    }
    if (!finish || typeof finish !== 'string') finish = "24K Gold";
    if (!quantity || isNaN(quantity) || quantity < 1) quantity = 1;
    const pid = String(productId).trim();

    // Check in memory or current PDP product
    const prodCheck = (typeof findProductById === 'function') ? findProductById(pid) :
        (window.currentPdpProduct && (String(window.currentPdpProduct.id) === pid || String(window.currentPdpProduct.sku) === pid) ? window.currentPdpProduct : null);

    if (prodCheck && isProductOutOfStock(prodCheck)) {
        if (typeof showToast === 'function') showToast("Sorry, this item is currently out of stock.", "warning");
        return;
    }

    const prod = (typeof findProductById === 'function') ? findProductById(pid) :
        (window.currentPdpProduct && (String(window.currentPdpProduct.id) === pid || String(window.currentPdpProduct.sku) === pid) ? window.currentPdpProduct : null);

    if (prod && prod.plating && (!finish || finish === "24K Gold" || finish === "gold")) {
        finish = formatPlating(prod.plating);
    }

    const existing = (cart || []).find(item => {
        const itemClean = String(item.productId).replace(/^czm_/, '');
        const pidClean = pid.replace(/^czm_/, '');
        return (String(item.productId) === pid || itemClean === pidClean) && item.finish === finish;
    });

    if (existing) {
        existing.qty = (parseInt(existing.qty) || 0) + quantity;
        if (prod) {
            if (prod.name) existing.name = prod.name;
            if (prod.priceINR) existing.priceINR = prod.priceINR;
            if (prod.primaryImg) existing.primaryImg = prod.primaryImg;
        }
    } else {
        cart.push({
            productId: pid,
            finish,
            qty: quantity,
            name: prod ? (prod.name || 'Bespoke Jewellery Piece') : '',
            priceINR: prod ? (Number(prod.priceINR) || 0) : 0,
            primaryImg: prod ? (prod.primaryImg || '') : ''
        });

        if ((!prod || !prod.name || !prod.priceINR) && pid) {
            fetch(`/api/product?id=${encodeURIComponent(pid)}`).then(r => r.json()).then(data => {
                if (data && data.success && data.product) {
                    const liveP = data.product;
                    if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) {
                        const idx = PRODUCTS.findIndex(p => String(p.id) === String(liveP.id));
                        if (idx < 0) PRODUCTS.push(liveP);
                        else PRODUCTS[idx] = liveP;
                    }
                    const itm = cart.find(c => String(c.productId) === pid || String(c.productId).replace(/^czm_/, '') === pid.replace(/^czm_/, ''));
                    if (itm) {
                        if (!itm.name) itm.name = liveP.name;
                        if (!itm.priceINR) itm.priceINR = liveP.priceINR;
                        if (!itm.primaryImg) itm.primaryImg = liveP.primaryImg;
                        syncCartWithServer();
                        updateCartUI();
                    }
                }
            }).catch(() => {});
        }
    }

    syncCartWithServer();
    updateCartUI();
    if (typeof updateCheckoutTotals === 'function') updateCheckoutTotals();
    if (typeof refreshCheckoutModalIfOpen === 'function') refreshCheckoutModalIfOpen();

    if (typeof showToast === 'function') showToast("Added to your shopping cart!");

    // Open drawer automatically unless caller explicitly requested skipDrawer (e.g. Buy Now)
    if (!options || !options.skipDrawer) {
        openCartDrawer();
    }
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
    const shippingMeter = document.querySelector('#cartDrawer .shipping-meter');
    const shippingMeterText = document.getElementById('shippingMeterText');
    const shippingProgressFill = document.getElementById('shippingProgressFill');
    const drawerFooter = document.querySelector('#cartDrawer .drawer-footer');

    // Total Count across all items
    const totalItems = (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + (parseInt(item.qty) || 1), 0);
    countBadges.forEach(badge => {
        badge.textContent = totalItems;
    });

    if (!list) return;

    if (!cart || cart.length === 0) {
        list.innerHTML = `
            <div class="cart-empty-state" style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
                <div style="width: 76px; height: 76px; margin: 0 auto 18px; background: rgba(197, 160, 89, 0.1); border: 1px dashed var(--gold-accent); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-cart-shopping" style="font-size: 2rem; color: var(--gold-accent);"></i>
                </div>
                <h4 style="font-family: var(--font-heading); color: var(--theme-color); font-size: 1.3rem; margin-bottom: 8px;">Your Cart is Empty</h4>
                <p style="font-size: 0.88rem; line-height: 1.6; margin-bottom: 22px; color: var(--text-muted); max-width: 320px; margin-left: auto; margin-right: auto;">
                    Discover handcrafted Austrian Cubic Zirconia collections sculpted for modern celebrations.
                </p>
                <a href="catalog.html" class="btn-primary" onclick="closeCartDrawer()" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; text-decoration: none; font-weight: 600; border-radius: 25px;">
                    <i class="fa-solid fa-gem"></i> Explore Catalog
                </a>
            </div>
        `;
        if (shippingMeter) shippingMeter.style.display = 'none';
        if (drawerFooter) drawerFooter.style.display = 'none';
        if (subtotalEl) subtotalEl.textContent = formatPrice(0);
        if (discountEl) discountEl.textContent = formatPrice(0);
        if (totalEl) totalEl.textContent = formatPrice(0);
        if (shippingProgressFill) shippingProgressFill.style.width = '0%';
        if (shippingMeterText) shippingMeterText.textContent = `Add ${formatPrice(FREE_SHIPPING_THRESHOLD_INR)} for Free Express Shipping`;
        return;
    }

    if (shippingMeter) shippingMeter.style.display = 'block';
    if (drawerFooter) drawerFooter.style.display = 'block';

    let subtotalINR = 0;

    list.innerHTML = cart.map((item, idx) => {
        const liveProd = (typeof findProductById === 'function') ? findProductById(item.productId) : null;
        const product = liveProd || {
            id: item.productId,
            name: item.name || 'Bespoke Jewellery Piece',
            priceINR: Number(item.priceINR) || 0,
            primaryImg: item.primaryImg || 'assets/placeholder-jewelry.svg'
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
                <img class="cart-item-thumb" src="${getOptimizedImgUrl(product.primaryImg) || 'assets/placeholder-jewelry.svg'}" alt="${(product.name || '').replace(/"/g, '&quot;')}" onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${(product.name || 'Bespoke Jewellery').replace(/</g, '&lt;')}</h4>
                    <p class="cart-item-variant">Finish: <strong>${(item.finish || '24K Gold').replace(/</g, '&lt;')}</strong></p>
                    <div class="cart-item-bottom">
                        <div class="cart-qty-control">
                            <button type="button" class="qty-btn" onclick="updateCartQty(${idx}, -1)" aria-label="Decrease quantity">-</button>
                            <span class="qty-val">${item.qty}</span>
                            <button type="button" class="qty-btn" onclick="updateCartQty(${idx}, 1)" aria-label="Increase quantity">+</button>
                        </div>
                        <span class="cart-item-price">${formatPrice(itemTotalINR)}</span>
                        <button type="button" class="btn-remove-item" onclick="removeFromCart(${idx})" title="Remove item" aria-label="Remove item">
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
    if (appliedCoupon) {
        if (appliedCoupon.discountPercent) {
            discountINR = Math.round((subtotalINR * appliedCoupon.discountPercent) / 100);
        } else if (appliedCoupon.discountAmountINR) {
            discountINR = Math.min(subtotalINR, Number(appliedCoupon.discountAmountINR) || 0);
        }
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
// ==========================================
// Wishlist Engine (Persistent Drawer & Favourites)
// ==========================================
function toggleWishlist(productId) {
    if (!productId) return;
    const pStr = String(productId).trim();
    const idx = wishlist.findIndex(id => String(id).trim() === pStr);
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

    // Update heart icons on all matching buttons across DOM
    document.querySelectorAll(`[data-wishlist-id="${pStr}"], .btn-wishlist[data-id="${pStr}"], .curation-wishlist-btn[data-id="${pStr}"]`).forEach(btn => {
        btn.classList.toggle('active', added);
        btn.setAttribute('title', added ? 'Remove from Wishlist' : 'Add to Wishlist');
        btn.setAttribute('aria-label', added ? 'Remove from Wishlist' : 'Add to Wishlist');
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = added ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        }
    });

    const pdpWishBtn = document.getElementById('pdpWishlistBtn');
    if (pdpWishBtn) {
        const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
        const currentPdpId = urlParams ? urlParams.get('id') : (window.currentPdpProduct ? window.currentPdpProduct.id : null);
        if (currentPdpId && (String(currentPdpId).trim() === pStr || (window.currentPdpProduct && String(window.currentPdpProduct.sku).trim() === pStr))) {
            pdpWishBtn.classList.toggle('active', added);
            pdpWishBtn.setAttribute('title', added ? 'Remove from Favourites' : 'Save to Favourites');
            const icon = pdpWishBtn.querySelector('i');
            if (icon) icon.className = added ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        }
    }

    const modalWishBtn = document.getElementById('modalWishlistBtn');
    if (modalWishBtn) {
        const modalPid = modalWishBtn.getAttribute('data-id');
        if (modalPid && String(modalPid).trim() === pStr) {
            modalWishBtn.classList.toggle('active', added);
            modalWishBtn.setAttribute('title', added ? 'Remove from Favourites' : 'Save to Favourites');
            const icon = modalWishBtn.querySelector('i');
            if (icon) icon.className = added ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        }
    }

    // If wishlist drawer is currently active, re-render
    const drawer = document.getElementById('wishlistDrawer');
    if (drawer && drawer.classList.contains('active')) {
        renderWishlistItems();
    }

    window.dispatchEvent(new CustomEvent('soreva:wishlist-updated', { detail: { count: wishlist.length, added, productId: pStr } }));
}

function updateWishlistUI() {
    const count = (wishlist || []).length;
    const badges = document.querySelectorAll('.wishlist-count-badge');
    badges.forEach(b => {
        b.textContent = count;
    });

    // Update all card wishlist buttons
    document.querySelectorAll('.btn-wishlist, .curation-wishlist-btn').forEach(btn => {
        const id = btn.getAttribute('data-id') || btn.dataset.id || btn.getAttribute('data-wishlist-id');
        if (id) {
            const isFav = wishlist.some(w => String(w).trim() === String(id).trim());
            btn.classList.toggle('active', isFav);
            btn.setAttribute('title', isFav ? 'Remove from Wishlist' : 'Add to Wishlist');
            btn.setAttribute('aria-label', isFav ? 'Remove from Wishlist' : 'Add to Wishlist');
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            }
        }
    });

    const pdpWishBtn = document.getElementById('pdpWishlistBtn');
    if (pdpWishBtn) {
        const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
        const currentPdpId = urlParams ? urlParams.get('id') : (window.currentPdpProduct ? window.currentPdpProduct.id : null);
        if (currentPdpId) {
            const isFav = wishlist.some(w => String(w).trim() === String(currentPdpId).trim() || (window.currentPdpProduct && String(w).trim() === String(window.currentPdpProduct.sku).trim()));
            pdpWishBtn.classList.toggle('active', isFav);
            pdpWishBtn.setAttribute('title', isFav ? 'Remove from Favourites' : 'Save to Favourites');
            const icon = pdpWishBtn.querySelector('i');
            if (icon) {
                icon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            }
        }
    }

    const modalWishBtn = document.getElementById('modalWishlistBtn');
    if (modalWishBtn) {
        const modalPid = modalWishBtn.getAttribute('data-id');
        if (modalPid) {
            const isFav = wishlist.some(w => String(w).trim() === String(modalPid).trim());
            modalWishBtn.classList.toggle('active', isFav);
            modalWishBtn.setAttribute('title', isFav ? 'Remove from Favourites' : 'Save to Favourites');
            const icon = modalWishBtn.querySelector('i');
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

    // Dismiss other overlays
    if (typeof closeMobileNavDrawer === 'function') closeMobileNavDrawer();
    if (typeof closeQuickView === 'function') closeQuickView();
    if (typeof closeSearchOverlay === 'function') closeSearchOverlay();

    renderWishlistItems();

    const drawer = document.getElementById('wishlistDrawer');
    const backdrop = document.getElementById('wishlistDrawerBackdrop');
    if (drawer) {
        drawer.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
    }
    if (backdrop) {
        backdrop.classList.add('active');
        backdrop.setAttribute('aria-hidden', 'false');
    }

    try {
        document.body.style.overflow = 'hidden';
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('soreva:wishlist-opened', { detail: { count: (wishlist || []).length } }));
}

function closeWishlistDrawer() {
    const drawer = document.getElementById('wishlistDrawer');
    const backdrop = document.getElementById('wishlistDrawerBackdrop');
    if (drawer) {
        drawer.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');
    }
    if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.setAttribute('aria-hidden', 'true');
    }

    try {
        document.body.style.overflow = '';
    } catch (e) {}

    window.dispatchEvent(new CustomEvent('soreva:wishlist-closed'));
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
                <h4 style="font-family: var(--font-heading); color: var(--theme-color); font-size: 1.3rem; margin-bottom: 8px;">Your Favourites List is Empty</h4>
                <p style="font-size: 0.88rem; line-height: 1.6; margin-bottom: 24px; color: var(--text-muted);">
                    You haven't saved any jewellery pieces yet. Explore our handcrafted fine collections and tap the heart icon to save your favourites.
                </p>
                <a href="catalog.html" class="btn-primary" onclick="closeWishlistDrawer()" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; text-decoration: none; font-weight: 600; border-radius: 6px;">
                    <i class="fa-solid fa-gem"></i> Explore Catalog
                </a>
            </div>
        `;
        if (footerEl) footerEl.style.display = 'none';
        return;
    }

    if (footerEl) footerEl.style.display = 'block';

    const itemsHtml = wishlist.map(id => {
        const prod = (typeof findProductById === 'function') ? findProductById(id) : ((PRODUCTS || []).find(p => String(p.id).trim() === String(id).trim() || String(p.sku).trim() === String(id).trim()));
        if (!prod) {
            return `
                <div class="cart-item wishlist-item" id="wishlist-item-${id}" style="display: flex; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--border-color); align-items: center;">
                    <div style="width: 68px; height: 68px; border-radius: 8px; background: rgba(197, 160, 89, 0.08); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-color);">
                        <i class="fa-solid fa-gem" style="color: var(--gold-accent); font-size: 1.4rem;"></i>
                    </div>
                    <div class="cart-item-details" style="flex: 1; min-width: 0;">
                        <h4 class="cart-item-title" style="font-size: 0.92rem; font-weight: 600; color: var(--theme-color); margin: 0 0 4px;">Sorèva Fine Jewel</h4>
                        <span class="cart-item-variant" style="font-size: 0.78rem; color: var(--text-muted); display: block;">SKU: ${escapeHtml(id)}</span>
                    </div>
                    <button type="button" onclick="toggleWishlist('${id}')" title="Remove from Favourites" style="background: none; border: none; color: #e53935; cursor: pointer; padding: 8px; font-size: 0.95rem;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        }

        const priceFormatted = formatPrice(prod.priceINR || 0);
        const originalPriceFormatted = prod.originalPriceINR ? formatPrice(prod.originalPriceINR) : '';
        const img = getOptimizedImgUrl(prod.primaryImg) || 'assets/categories/wristwear.jpg';
        const finish = (prod.availableFinishes && prod.availableFinishes[0]) || (prod.plating || '24K Gold');
        const inStock = prod.stockQty === undefined || prod.stockQty > 0;

        return `
            <div class="cart-item wishlist-item" id="wishlist-item-${prod.id}" style="display: flex; gap: 14px; padding: 16px 20px; border-bottom: 1px solid var(--border-color); align-items: center;">
                <a href="product.html?id=${encodeURIComponent(prod.id)}" onclick="closeWishlistDrawer()" style="display: block; width: 72px; height: 72px; flex-shrink: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #fff;">
                    <img src="${img}" alt="${escapeHtml(prod.name)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.src='assets/categories/wristwear.jpg';">
                </a>
                <div class="cart-item-details" style="flex: 1; min-width: 0;">
                    <a href="product.html?id=${encodeURIComponent(prod.id)}" onclick="closeWishlistDrawer()" style="text-decoration: none; color: inherit;">
                        <h4 class="cart-item-title" style="font-size: 0.92rem; font-weight: 600; color: var(--theme-color); margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(prod.name)}</h4>
                    </a>
                    <span class="cart-item-variant" style="font-size: 0.78rem; color: var(--text-muted); display: block; margin-bottom: 6px;">Finish: ${formatPlating(finish)} • <span style="text-transform: capitalize;">${escapeHtml(prod.category || 'Jewellery')}</span></span>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <span class="cart-item-price" style="font-size: 0.95rem; font-weight: 700; color: var(--theme-color);">${priceFormatted}</span>
                        ${originalPriceFormatted ? `<span style="font-size: 0.8rem; text-decoration: line-through; color: var(--text-muted);">${originalPriceFormatted}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                    <button type="button" class="btn-primary btn-sm btn-wishlist-move" onclick="moveWishlistToBag('${prod.id}', '${finish}')" style="padding: 7px 12px; font-size: 0.78rem; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; cursor: pointer;" ${!inStock ? 'disabled style="opacity: 0.5;"' : ''}>
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
    if (!productId) return;
    addToCart(productId, finish || "24K Gold", 1, { skipDrawer: true });

    // Remove from wishlist
    const pStr = String(productId).trim();
    const idx = wishlist.findIndex(id => String(id).trim() === pStr);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        try {
            localStorage.setItem('soreva_wishlist', JSON.stringify(wishlist));
        } catch (e) {}
        updateWishlistUI();
    }

    closeWishlistDrawer();

    setTimeout(() => {
        openCartDrawer();
        showToast("Moved piece from favourites to your shopping cart!");
    }, 200);
}

function moveAllWishlistToBag() {
    if (!wishlist || wishlist.length === 0) return;

    let addedCount = 0;
    wishlist.forEach(id => {
        const prod = (typeof findProductById === 'function') ? findProductById(id) : ((PRODUCTS || []).find(p => String(p.id).trim() === String(id).trim() || String(p.sku).trim() === String(id).trim()));
        if (prod) {
            const finish = (prod.availableFinishes && prod.availableFinishes[0]) || (prod.plating || '24K Gold');
            addToCart(prod.id, finish, 1, { skipDrawer: true });
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
        openCartDrawer();
        showToast(`${addedCount} piece(s) moved to your Shopping Cart!`);
    }, 250);
}

function initWishlistDrawer() {
    ensureWishlistDrawerInDOM();
    const openBtns = document.querySelectorAll('.wishlist-open-btn, #headerWishlistBtn');
    openBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            openWishlistDrawer();
        };
        btn.ontouchend = (e) => {
            e.preventDefault();
            openWishlistDrawer();
        };
    });

    const closeBtn = document.getElementById('wishlistDrawerClose');
    if (closeBtn) {
        closeBtn.onclick = closeWishlistDrawer;
        closeBtn.ontouchend = (e) => { e.preventDefault(); closeWishlistDrawer(); };
    }

    const backdrop = document.getElementById('wishlistDrawerBackdrop');
    if (backdrop) {
        backdrop.onclick = closeWishlistDrawer;
        backdrop.ontouchend = (e) => { e.preventDefault(); closeWishlistDrawer(); };
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const drawer = document.getElementById('wishlistDrawer');
            if (drawer && drawer.classList.contains('active')) {
                closeWishlistDrawer();
            }
        }
    });

    updateWishlistUI();
}

function ensureWishlistDrawerInDOM() {
    let backdropEl = document.getElementById('wishlistDrawerBackdrop');
    let drawerEl = document.getElementById('wishlistDrawer');

    if (!backdropEl) {
        backdropEl = document.createElement('div');
        backdropEl.className = 'drawer-backdrop';
        backdropEl.id = 'wishlistDrawerBackdrop';
        backdropEl.onclick = closeWishlistDrawer;
        backdropEl.ontouchend = (e) => { e.preventDefault(); closeWishlistDrawer(); };
        document.body.appendChild(backdropEl);
    } else if (backdropEl.parentElement !== document.body) {
        document.body.appendChild(backdropEl);
    }

    if (!drawerEl) {
        drawerEl = document.createElement('aside');
        drawerEl.className = 'cart-drawer wishlist-drawer';
        drawerEl.id = 'wishlistDrawer';
        drawerEl.setAttribute('aria-label', 'Saved Favourites');
        drawerEl.innerHTML = `
            <div class="drawer-header">
                <h3 class="drawer-title">
                    <i class="fa-solid fa-heart" style="color: #e02424;"></i>
                    <span>Saved Favourites</span>
                    <span style="font-size: 0.95rem; color: var(--text-muted); font-family: var(--font-body);">(<span class="wishlist-count-badge">0</span>)</span>
                </h3>
                <button type="button" class="drawer-close-btn" id="wishlistDrawerClose" onclick="closeWishlistDrawer()" ontouchend="event.preventDefault(); closeWishlistDrawer();" aria-label="Close Favourites">
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
    } else if (drawerEl.parentElement !== document.body) {
        document.body.appendChild(drawerEl);
    }
}

function handlePdpWishlistClick() {
    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
    const productId = urlParams ? urlParams.get('id') : (window.currentPdpProduct ? window.currentPdpProduct.id : null);
    const pid = productId || (window.currentPdpProduct ? (window.currentPdpProduct.id || window.currentPdpProduct.sku) : null);
    if (pid) {
        toggleWishlist(pid);
    }
}

function handleModalWishlistClick() {
    if (typeof currentModalProductId !== 'undefined' && currentModalProductId) {
        toggleWishlist(currentModalProductId);
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
window.handleModalWishlistClick = handleModalWishlistClick;
window.getWishlist = () => wishlist;
try {
    Object.defineProperty(window, 'wishlist', {
        get: () => wishlist,
        set: (val) => {
            wishlist = Array.isArray(val) ? val.map(String) : [];
            try { localStorage.setItem('soreva_wishlist', JSON.stringify(wishlist)); } catch (e) {}
            updateWishlistUI();
        },
        configurable: true
    });
} catch (e) {
    window.wishlist = wishlist;
}

// ==========================================
// Quick View Modal
// ==========================================
let currentModalProductId = null;
let currentModalSelectedFinish = "24K Gold";
let _lastQuickViewOpenTime = 0;

function ensureQuickViewModalInDOM() {
    let modalEl = document.getElementById('quickViewBackdrop');
    if (!modalEl) {
        modalEl = document.createElement('div');
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
                        <div id="modalPlatingBadgeWrap" style="margin: 6px 0 8px;"></div>
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
                        <div style="display: flex; gap: 12px; margin-top: 14px; flex-wrap: wrap;">
                            <button type="button" class="btn-add-cart" id="modalAddToCartBtn" onclick="handleModalAddToCart()" style="flex: 1; min-width: 130px; padding: 14px;">
                                <i class="fa-solid fa-cart-shopping"></i> Add to Cart
                            </button>
                            <button type="button" class="btn-buy-now" id="modalBuyNowBtn" onclick="handleModalBuyNow()" style="flex: 1.2; min-width: 170px; padding: 14px; background: linear-gradient(135deg, #c5a059, #967537); color: #120e0d; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fa-solid fa-shield-halved"></i> Buy Now
                            </button>
                            <button type="button" class="btn-wishlist-modal" id="modalWishlistBtn" onclick="handleModalWishlistClick()" title="Save to Favourites" aria-label="Save to Favourites">
                                <i class="fa-regular fa-heart"></i>
                            </button>
                            <a id="modalFullDetailsBtn" href="#" style="padding: 14px 18px; text-align: center; text-decoration: none; border: 1px solid var(--gold-badge); border-radius: 8px; color: var(--gold-badge); font-weight: 600; display: inline-flex; justify-content: center; align-items: center; gap: 6px; transition: all 0.25s;">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Details
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);
    } else if (modalEl.parentElement && modalEl.parentElement !== document.body) {
        // Guaranteed reparenting to document.body so modal is never trapped inside an off-screen drawer
        document.body.appendChild(modalEl);
    }
}

function handleProductCardClick(event, productId) {
    if (event && event.target && event.target.closest) {
        if (event.target.closest('.curation-quick-btn, .curation-quick-overlay, .btn-quick-view, .product-quick-actions, .curation-wishlist-btn, .btn-wishlist, .curation-add-cart-btn, .btn-add-cart')) {
            return;
        }
    }
    if (productId) {
        window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
    }
}
window.handleProductCardClick = handleProductCardClick;

function closeQuickView() {
    const modalBackdrop = document.getElementById('quickViewBackdrop');
    if (modalBackdrop) {
        modalBackdrop.classList.remove('active');
        modalBackdrop.style.display = 'none';
    }
    document.body.style.overflow = '';
}

function handleModalAddToCart() {
    if (!currentModalProductId) return;
    const qtyInput = document.getElementById('modalQtyInput');
    const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
    const finish = currentModalSelectedFinish || '24K Gold';
    addToCart(currentModalProductId, finish, qty);
    closeQuickView();
}
window.handleModalAddToCart = handleModalAddToCart;

function handleModalBuyNow() {
    if (!currentModalProductId) return;
    const qtyInput = document.getElementById('modalQtyInput');
    const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
    const finish = currentModalSelectedFinish || '24K Gold';
    addToCart(currentModalProductId, finish, qty);
    closeQuickView();
    setTimeout(() => {
        const drawer = document.getElementById('cartDrawer');
        const backdrop = document.getElementById('cartDrawerBackdrop');
        if (drawer) drawer.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        if (typeof openCheckoutModal === 'function') openCheckoutModal();
    }, 180);
}
window.handleModalBuyNow = handleModalBuyNow;

function initQuickView() {
    ensureQuickViewModalInDOM();
    const modalBackdrop = document.getElementById('quickViewBackdrop');
    const closeBtn = document.getElementById('modalCloseBtn');

    if (closeBtn) {
        const handleClose = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            closeQuickView();
        };
        closeBtn.onclick = handleClose;
        closeBtn.addEventListener('touchend', handleClose, { passive: false });
    }

    if (modalBackdrop) {
        const modalInner = modalBackdrop.querySelector('.quickview-modal');
        if (modalInner) {
            modalInner.addEventListener('click', (e) => e.stopPropagation());
            modalInner.addEventListener('touchend', (e) => e.stopPropagation());
        }
        const handleBackdropClick = (e) => {
            if (e.target === modalBackdrop) {
                if (e.cancelable) e.preventDefault();
                closeQuickView();
            }
        };
        modalBackdrop.onclick = handleBackdropClick;
        modalBackdrop.addEventListener('touchend', handleBackdropClick, { passive: false });
    }

    // Modal Add to Cart
    const modalAddBtn = document.getElementById('modalAddToCartBtn');
    if (modalAddBtn) {
        modalAddBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleModalAddToCart();
        };
    }

    const modalBuyBtn = document.getElementById('modalBuyNowBtn');
    if (modalBuyBtn) {
        modalBuyBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleModalBuyNow();
        };
    }

    // Escape key closes Quick View modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeQuickView();
        }
    });
}

async function openQuickView(productId, evt) {
    if (evt) {
        if (evt.stopPropagation) evt.stopPropagation();
        if (evt.stopImmediatePropagation) evt.stopImmediatePropagation();
    }
    const now = Date.now();
    if (now - _lastQuickViewOpenTime < 380) return; // Prevent double trigger from touchend + click
    _lastQuickViewOpenTime = now;

    if (!productId) return;
    ensureQuickViewModalInDOM();

    // Immediately open modal backdrop with scroll lock for instant tactile feedback
    const modalBackdrop = document.getElementById('quickViewBackdrop');
    if (modalBackdrop) {
        if (modalBackdrop.parentElement && modalBackdrop.parentElement !== document.body) {
            document.body.appendChild(modalBackdrop);
        }
        modalBackdrop.style.display = 'flex';
        modalBackdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    const pid = String(productId).trim();
    // 1. Fetch data from memory first
    let product = (typeof findProductById === 'function') ? findProductById(pid) : null;
    
    // 2. Fallback to fetchProductData or API endpoint
    if (!product && typeof fetchProductData === 'function') {
        product = await fetchProductData(pid);
    }

    if (!product) {
        try {
            const resp = await fetch(`/api/product?id=${encodeURIComponent(pid)}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.success && data.product) {
                    product = data.product;
                    if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) {
                        PRODUCTS.push(product);
                    }
                }
            }
        } catch (e) {
            console.error('[QuickView] Error fetching product:', pid, e);
        }
    }

    if (!product) {
        console.warn('[QuickView] Product not found:', productId);
        if (typeof showToast === 'function') showToast('Masterpiece details unavailable');
        closeQuickView();
        return;
    }

    populateQuickViewModal(product);
}

function populateQuickViewModal(product) {
    if (!product) return;
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
        fullDetailsBtn.href = `product.html?id=${encodeURIComponent(product.id)}`;
    }

    if (modalImg) {
        modalImg.src = getOptimizedImgUrl(product.primaryImg) || 'assets/placeholder-jewelry.svg';
        modalImg.onerror = function() { this.onerror = null; this.src = 'assets/placeholder-jewelry.svg'; };
    }
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
    const modalBuyBtn = document.getElementById('modalBuyNowBtn');
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
    if (modalBuyBtn) {
        if (isOos) {
            modalBuyBtn.disabled = true;
            modalBuyBtn.style.opacity = '0.5';
            modalBuyBtn.style.cursor = 'not-allowed';
            modalBuyBtn.style.pointerEvents = 'none';
        } else {
            modalBuyBtn.disabled = false;
            modalBuyBtn.style.opacity = '1';
            modalBuyBtn.style.cursor = 'pointer';
            modalBuyBtn.style.pointerEvents = 'auto';
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
    if (modalDesc) {
        modalDesc.innerHTML = product.description || `Sculpted with haute joaillerie precision, the ${product.name} features diamond-grade Austrian cubic zirconia crystals hand-finished in enduring ${formatPlating(product.plating)} with anti-tarnish protective sealing.`;
    }

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
        const gallery = (Array.isArray(product.images) && product.images.length)
            ? product.images.filter(i => i && (typeof i === 'string' || i.visible !== false)).map(i => typeof i === 'string' ? i : i.url)
            : ((product.gallery && product.gallery.length) ? product.gallery : [product.primaryImg].filter(Boolean));
        modalThumbs.innerHTML = gallery.map((rawImg, i) => {
            const optImg = getOptimizedImgUrl(rawImg);
            return `
            <img class="modal-thumb ${i === 0 ? 'active' : ''}" src="${optImg}" alt="Thumbnail" onclick="switchModalImage(this, '${optImg}')" onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
        `;
        }).join('');
    }

    const qtyInput = document.getElementById('modalQtyInput');
    if (qtyInput) qtyInput.value = 1;

    // Sync Quick View modal Wishlist / Favourite button
    const modalWishBtn = document.getElementById('modalWishlistBtn');
    if (modalWishBtn) {
        modalWishBtn.setAttribute('data-id', pid);
        const isFav = (wishlist || []).some(w => String(w).trim() === pid);
        modalWishBtn.classList.toggle('active', isFav);
        modalWishBtn.setAttribute('title', isFav ? 'Remove from Favourites' : 'Save to Favourites');
        modalWishBtn.setAttribute('aria-label', isFav ? 'Remove from Favourites' : 'Save to Favourites');
        const icon = modalWishBtn.querySelector('i');
        if (icon) icon.className = isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    }

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
    if (mainImg && src) {
        mainImg.src = getOptimizedImgUrl(src);
        mainImg.onerror = function() { this.onerror = null; this.src = 'assets/placeholder-jewelry.svg'; };
    }
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
                <button type="button" class="search-chip" data-query="Pendants">Solitaire Pendants</button>
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
                <span style="color: var(--text-muted); font-size: 0.82rem;">Try searching for necklaces, rings, earrings, bangles, or pendants.</span>
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
        const img = getOptimizedImgUrl(p.primaryImg) || 'assets/placeholder-jewelry.svg';

        html += `
            <div class="search-item-match" onclick="handleSearchResultClick('${escapeHtml(p.id)}')" role="button" tabindex="0">
                <img src="${img}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
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

    // 1. Render all full-bleed background slide images for instant crossfading & click navigation
    slidesWrapper.innerHTML = HERO_SLIDES.map((slide, idx) => `
        <div class="hero-slide-item ${idx === currentHeroIndex ? 'active' : ''}" data-index="${idx}" style="cursor: pointer;" title="Click to view ${slide.name || 'this collection'}">
            <img class="hero-slide-bg" src="${slide.image}" alt="${slide.name || 'Hero slide'}" loading="${idx === 0 ? 'eager' : 'lazy'}" onerror="this.onerror=null; this.src='assets/hero/hero-slide-${(idx % 8) + 1}.jpg';">
        </div>
    `).join('');

    // Jump navigation handler for hero clicks
    function navigateToHeroSlideUrl(slide) {
        if (!slide) return;
        const targetUrl = (slide.linkUrl || slide.ctaLink || (slide.productId ? `product.html?id=${encodeURIComponent(slide.productId)}` : '#categoryGrid')).trim();
        if (!targetUrl) return;
        if (targetUrl.startsWith('#')) {
            const targetEl = document.querySelector(targetUrl);
            if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
            else window.location.hash = targetUrl;
        } else {
            window.location.href = targetUrl;
        }
    }

    let heroTouchDidSwipe = false;

    const handleHeroBannerClick = (e) => {
        // Prevent navigation if interacting with control buttons
        if (e.target.closest('#heroArrowPrev') || 
            e.target.closest('#heroArrowNext') || 
            e.target.closest('#heroDotsNav') || 
            e.target.closest('#heroQuickViewBtn') ||
            e.target.closest('.hero-cta-actions a') ||
            e.target.closest('button')) {
            return;
        }
        if (heroTouchDidSwipe) {
            heroTouchDidSwipe = false;
            return;
        }
        const currentSlide = HERO_SLIDES[currentHeroIndex];
        navigateToHeroSlideUrl(currentSlide);
    };

    slidesWrapper.onclick = handleHeroBannerClick;

    const activePieceBadge = document.getElementById('heroActivePieceBadge');
    if (activePieceBadge) {
        activePieceBadge.style.cursor = 'pointer';
        activePieceBadge.onclick = handleHeroBannerClick;
    }

    const heroTopPill = document.getElementById('heroTopPill');
    if (heroTopPill) {
        heroTopPill.style.cursor = 'pointer';
        heroTopPill.onclick = handleHeroBannerClick;
    }

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

        // Touch swipe for mobile and tablet devices
        let heroTouchStartX = 0;
        let heroTouchStartY = 0;
        heroSection.addEventListener('touchstart', (e) => {
            heroTouchDidSwipe = false;
            if (e.touches && e.touches[0]) {
                heroTouchStartX = e.touches[0].clientX;
                heroTouchStartY = e.touches[0].clientY;
            }
        }, { passive: true });
        heroSection.addEventListener('touchend', (e) => {
            if (e.changedTouches && e.changedTouches[0]) {
                const diffX = heroTouchStartX - e.changedTouches[0].clientX;
                const diffY = heroTouchStartY - e.changedTouches[0].clientY;
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
                    heroTouchDidSwipe = true;
                    if (diffX > 0) {
                        handleNext();
                    } else {
                        handlePrev();
                    }
                }
            }
        }, { passive: true });
        
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
    const ctaBtn = document.querySelector('.hero-cta-actions .btn-primary');

    if (tagEl) tagEl.textContent = slide.tag || '';
    if (headlineEl) headlineEl.innerHTML = slide.headline || '';
    if (subtitleEl) subtitleEl.textContent = slide.subtitle || '';
    if (counterEl) counterEl.textContent = `0${currentHeroIndex + 1} / 0${HERO_SLIDES.length}`;

    if (activeNameEl) activeNameEl.textContent = slide.name || 'Featured Piece';
    if (activePriceEl) {
        // Pricing completely removed per user request: only show finish/edition if present
        if (slide.finish && slide.finish.trim()) {
            activePriceEl.textContent = slide.finish.trim();
            activePriceEl.style.display = 'block';
        } else {
            activePriceEl.textContent = '';
            activePriceEl.style.display = 'none';
        }
    }

    if (ctaBtn) {
        const targetUrl = (slide.linkUrl || slide.ctaLink || (slide.productId ? `product.html?id=${encodeURIComponent(slide.productId)}` : '#categoryGrid')).trim();
        ctaBtn.href = targetUrl;
        if (slide.ctaText) {
            const textSpan = ctaBtn.querySelector('span');
            if (textSpan) textSpan.textContent = slide.ctaText;
        }
    }
}


// ==========================================
// Product Details Page (PDP)
// ==========================================
function renderProductPageContent(product) {
    if (!product) return;

    // Populate Title & Meta
    document.title = (product.name || 'Sorèva Luxury Jewellery') + " | Sorèva";
    const pdpTitle = document.getElementById('pdpTitle');
    if (pdpTitle) pdpTitle.textContent = product.name || 'Jewellery Piece';

    const pdpMainImg = document.getElementById('pdpMainImg');
    const optPrimary = getOptimizedImgUrl(product.primaryImg) || 'assets/placeholder-jewelry.svg';
    if (pdpMainImg) {
        pdpMainImg.onerror = function() { this.onerror = null; this.src = 'assets/placeholder-jewelry.svg'; };
        if (pdpMainImg.tagName && pdpMainImg.tagName.toLowerCase() === 'video') {
            const newImg = document.createElement('img');
            newImg.id = 'pdpMainImg';
            newImg.src = optPrimary;
            newImg.style.cssText = pdpMainImg.style ? pdpMainImg.style.cssText : '';
            newImg.alt = product.name || 'Product Image';
            newImg.onerror = function() { this.onerror = null; this.src = 'assets/placeholder-jewelry.svg'; };
            if (typeof pdpMainImg.replaceWith === 'function') {
                pdpMainImg.replaceWith(newImg);
            } else {
                pdpMainImg.src = optPrimary;
            }
        } else {
            pdpMainImg.src = optPrimary;
        }
    }

    const pdpThumbs = document.getElementById('pdpThumbs');
    if (pdpThumbs) {
        const gallery = (Array.isArray(product.images) && product.images.length)
            ? product.images.filter(i => i && (typeof i === 'string' || i.visible !== false)).map(i => typeof i === 'string' ? i : i.url)
            : ((product.gallery && product.gallery.length) ? product.gallery : [product.primaryImg].filter(Boolean));
        let galleryHtml = gallery.map((rawImg, idx) => {
            const optImg = getOptimizedImgUrl(rawImg);
            return `
            <img src="${optImg}" class="pdp-thumb-img ${idx === 0 ? 'active' : ''}" 
                 onclick="const main=document.getElementById('pdpMainImg'); if(main.tagName==='VIDEO'){ const imgEl=document.createElement('img'); imgEl.id='pdpMainImg'; imgEl.src='${optImg}'; imgEl.style=main.getAttribute('style'); imgEl.onerror=function(){this.onerror=null;this.src='assets/placeholder-jewelry.svg';}; main.replaceWith(imgEl); } else { main.src='${optImg}'; main.onerror=function(){this.onerror=null;this.src='assets/placeholder-jewelry.svg';}; } document.querySelectorAll('.pdp-thumb-img').forEach(el=>el.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';" 
                 onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';"
                 style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid ${idx === 0 ? 'var(--gold-accent)' : 'transparent'};">
            `;
        }).join('');

        if (product.videoUrl) {
            galleryHtml += `
                <div style="width: 80px; height: 100px; border-radius: 8px; cursor: pointer; border: 2px solid transparent; position: relative; background: #000; overflow: hidden; flex-shrink: 0;"
                     onclick="const main=document.getElementById('pdpMainImg'); const vidEl=document.createElement('video'); vidEl.id='pdpMainImg'; vidEl.src='${product.videoUrl}'; vidEl.autoplay=true; vidEl.muted=true; vidEl.loop=true; vidEl.playsinline=true; vidEl.style=main.getAttribute('style'); main.replaceWith(vidEl); document.querySelectorAll('.pdp-thumb-img').forEach(el=>el.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';">
                    <video src="${product.videoUrl}" style="width: 100%; height: 100%; object-fit: cover;" muted playsinline></video>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.5); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-play" style="font-size: 0.75rem;"></i>
                    </div>
                </div>
            `;
        }
        pdpThumbs.innerHTML = galleryHtml;
    }

    const catLink = document.getElementById('pdpCatLink');
    if (catLink) {
        const catName = product.category || 'Jewellery';
        catLink.textContent = catName.charAt(0).toUpperCase() + catName.slice(1);
        catLink.href = `catalog.html?cat=${encodeURIComponent(catName)}`;
    }
    
    const subCat = document.getElementById('pdpSubCat');
    if (subCat) subCat.textContent = product.subCategory || 'Bespoke Collection';

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
        if (typeof pdpOosNotice.remove === 'function') {
            pdpOosNotice.remove();
        } else if (pdpOosNotice.parentNode) {
            pdpOosNotice.parentNode.removeChild(pdpOosNotice);
        }
    }
    
    const rating = document.getElementById('pdpRating');
    if (rating) rating.textContent = product.rating || 4.8;

    const reviews = document.getElementById('pdpReviews');
    if (reviews) reviews.textContent = `${product.reviews || 14} Reviews`;
    
    const price = document.getElementById('pdpPrice');
    if (price) price.textContent = formatPrice(product.priceINR || 0);
    
    const origPrice = document.getElementById('pdpOriginalPrice');
    if (origPrice) {
        if (product.originalPriceINR && product.originalPriceINR > product.priceINR) {
            origPrice.textContent = formatPrice(product.originalPriceINR);
            origPrice.style.display = 'inline';
        } else {
            origPrice.style.display = 'none';
        }
    }

    const desc = document.getElementById('pdpDescription');
    if (desc) {
        desc.innerHTML = product.description || `Sculpted with haute joaillerie precision, the ${product.name} features diamond-grade Austrian cubic zirconia crystals hand-finished in enduring ${formatPlating(product.plating)} with anti-tarnish protective sealing.`;
    }

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
            addBtn.onclick = handlePdpAddToCart;
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
            buyBtn.onclick = () => handlePdpBuyNow();
        }
        if (qtyInput) qtyInput.disabled = false;
        if (qtyContainer) {
            qtyContainer.style.opacity = '1';
            qtyContainer.style.pointerEvents = 'auto';
        }
    }
    if (typeof updateWishlistUI === "function") updateWishlistUI();
    window.currentPdpProduct = product;
    if (typeof renderSimilarProducts === "function") renderSimilarProducts(product);
}
window.renderProductPageContent = renderProductPageContent;

// ==========================================
// Similar Products Engine (Product Details Page)
// ==========================================
function renderSimilarProducts(currentProduct) {
    const grid = document.getElementById('similarProductsGrid');
    const sec = document.getElementById('similarProductsSection');
    if (!grid || !currentProduct) return;

    if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) {
        if (sec) sec.style.display = 'none';
        return;
    }

    const currentId = String(currentProduct.id || currentProduct.sku || '');
    const currentSub = (currentProduct.subCategory || '').toLowerCase();
    const currentCat = (currentProduct.category || '').toLowerCase();
    const currentPlating = (typeof normalizePlating === 'function') ? normalizePlating(currentProduct.plating) : (currentProduct.plating || 'gold');
    const currentStone = (currentProduct.stoneColor || '').toLowerCase();
    const currentSet = (currentProduct.setContents || '').toLowerCase();

    // Filter candidate products: active, in-stock first, not current piece
    const candidates = PRODUCTS.filter(p => {
        if (!p || p.disabled || p.active === false || p.active === 0 || p.stockStatus === 'Disabled') return false;
        const pId = String(p.id || p.sku || '');
        return pId !== currentId;
    });

    if (candidates.length === 0) {
        if (sec) sec.style.display = 'none';
        return;
    }

    // Score candidates based on subcategory, category, plating, stone, setContents
    const scored = candidates.map(p => {
        let score = 0;
        const pSub = (p.subCategory || '').toLowerCase();
        const pCat = (p.category || '').toLowerCase();
        const pPlating = (typeof normalizePlating === 'function') ? normalizePlating(p.plating) : (p.plating || 'gold');
        const pStone = (p.stoneColor || '').toLowerCase();
        const pSet = (p.setContents || '').toLowerCase();

        // 1. Same Subcategory (highest relevance, e.g. Bridal Necklaces -> Bridal Necklaces)
        if (currentSub && pSub && pSub === currentSub) score += 20;

        // 2. Same Main Category
        if (currentCat && pCat && (pCat === currentCat || (currentCat === 'wristwear' && pCat === 'bracelets') || (currentCat === 'bracelets' && pCat === 'wristwear'))) score += 10;

        // 3. Same Plating Finish (e.g. 24K Gold -> 24K Gold)
        if (currentPlating && pPlating && pPlating === currentPlating) score += 6;

        // 4. Same Stone Color (e.g. Ruby -> Ruby)
        if (currentStone && pStone && pStone === currentStone) score += 5;

        // 5. Same Set Contents
        if (currentSet && pSet && pSet === currentSet) score += 4;

        // 6. In Stock bonus
        const oos = (typeof isProductOutOfStock === 'function') ? isProductOutOfStock(p) : false;
        if (!oos) score += 8;

        // 7. Rating / Launch offer bonus
        if (p.rating) score += Math.min(3, p.rating);
        if (p.launchOffer) score += 2;

        return { product: p, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Pick top 4 masterpieces
    const similarItems = scored.slice(0, 4).map(s => s.product);

    if (sec) sec.style.display = 'block';

    grid.innerHTML = similarItems.map((product, idx) => {
        const hasHover = product.hoverImg && product.hoverImg !== product.primaryImg;
        const isWishlisted = (typeof wishlist !== 'undefined' && Array.isArray(wishlist)) && (wishlist.includes(product.id) || wishlist.includes(String(product.id)) || wishlist.includes(product.sku));
        const oos = (typeof isProductOutOfStock === 'function') ? isProductOutOfStock(product) : false;
        const isTop = idx < 4;
        const priorityAttrs = isTop ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"';
        const primaryUrl = getOptimizedImgUrl(product.primaryImg);
        const hoverUrl = getOptimizedImgUrl(product.hoverImg);
        return `
            <div class="product-card ${oos ? 'is-out-of-stock' : ''}" data-id="${product.id}" onclick="handleProductCardClick(event, '${product.id}')" style="cursor: pointer;">
                <div class="product-thumb-wrap ${!hasHover ? 'scale-hover-only' : ''}">
                    <img class="product-thumb primary-img" src="${primaryUrl}" alt="${escapeHtml(product.name)}" ${priorityAttrs} onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
                    ${hasHover ? `<img class="product-thumb hover-img" data-src="${hoverUrl}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" onerror="this.style.display='none'; this.parentElement.classList.add('scale-hover-only');">` : ''}
                    
                    <div class="product-badges">
                        ${oos ? '<span class="product-badge badge-sold-out"><i class="fa-solid fa-ban"></i> OUT OF STOCK</span>' : renderProductBadgeHtml(product.badge)}
                        ${(!oos && product.launchOffer) ? `<span class="product-badge badge-launch">15% OFF</span>` : ''}
                    </div>

                    <button type="button" class="btn-wishlist ${isWishlisted ? 'active' : ''}" data-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')" title="Add to Wishlist">
                        <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <div class="product-quick-actions" onclick="event.stopPropagation();">
                        <button type="button" class="btn-quick-view" onclick="event.stopPropagation(); openQuickView('${product.id}', event);" ontouchend="event.stopPropagation(); openQuickView('${product.id}', event);">
                            <i class="fa-regular fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>

                <div class="product-details">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span class="product-category-sub" style="margin-bottom: 0;">${escapeHtml(product.subCategory || product.category)}</span>
                        <span class="product-finish-pill" title="Crafted Finish">${formatPlating(product.plating)}</span>
                    </div>
                    <h3 class="product-title">${escapeHtml(product.name)}</h3>
                    <div class="product-price-row">
                        <span class="price-current">${formatPrice(product.priceINR)}</span>
                        ${product.originalPriceINR > product.priceINR ? `<span class="price-original">${formatPrice(product.originalPriceINR)}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
window.renderSimilarProducts = renderSimilarProducts;

async function initProductPage() {
    // Only run if we are on the product page
    const pdpMainImg = document.getElementById('pdpMainImg');
    if (!pdpMainImg) return;

    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
    const productId = urlParams ? urlParams.get('id') : null;
    
    if (!productId) {
        const titleEl = document.getElementById('pdpTitle');
        if (titleEl) titleEl.textContent = "Product Not Found";
        return;
    }

    // 1. Check in-memory or fetch directly via /api/product
    let product = (typeof fetchProductData === 'function')
        ? await fetchProductData(productId)
        : ((typeof findProductById === 'function') ? findProductById(productId) : null);

    if (!product) {
        try {
            const resp = await fetch(`/api/product?id=${encodeURIComponent(productId)}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.success && data.product) {
                    product = data.product;
                    if (product.primaryImg) product.primaryImg = getOptimizedImgUrl(product.primaryImg);
                    if (product.hoverImg) product.hoverImg = getOptimizedImgUrl(product.hoverImg);
                    if (Array.isArray(product.gallery)) {
                        product.gallery = product.gallery.map(g => getOptimizedImgUrl(g));
                    }
                    if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) {
                        PRODUCTS.push(product);
                    }
                }
            }
        } catch (e) {
            console.warn('[initProductPage] Direct fetch error:', e);
        }
    }

    if (!product) {
        const titleEl = document.getElementById('pdpTitle');
        if (titleEl) titleEl.textContent = "Product Not Found";
        return;
    }

    renderProductPageContent(product);
}
window.initProductPage = initProductPage;

function initApp() {
    if (typeof initAuth === 'function') initAuth();
    if (typeof initAnnouncementTicker === 'function') initAnnouncementTicker();
    if (typeof initCategoryMarquee === 'function') initCategoryMarquee();
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
    if (typeof initProductPage === 'function') initProductPage();
    
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

    // Initialize Festive Offer Pop-up Engine
    if (typeof initFestivePopup === 'function') initFestivePopup();
    if (typeof initWelcomeOtpCellInputs === 'function') initWelcomeOtpCellInputs();
}

document.addEventListener('DOMContentLoaded', initApp);


function parseUrlAndSetTitle() {
    const urlParams = (typeof URLSearchParams !== "undefined" && window.location && window.location.search) ? new URLSearchParams(window.location.search) : null;
    if (!urlParams) {
        selectedCategory = 'all';
        activeFilter = 'all';
        updateCatalogTitleDesc('all');
        return;
    }

    const cat = urlParams.get("cat");
    const sub = urlParams.get("sub");
    const plating = urlParams.get("plating");
    const setContents = urlParams.get("setContents");
    const stone = urlParams.get("stone");
    const stoneSize = urlParams.get("stoneSize");
    const sort = urlParams.get("sort");
    const badge = urlParams.get("badge");
    const searchQuery = urlParams.get("q") || urlParams.get("search");

    if (searchQuery && searchQuery.trim()) {
        activeSearchQuery = searchQuery.trim();
        const pageTitle = document.getElementById("catalogTitle");
        const pageDesc = document.getElementById("catalogDesc");
        if (pageTitle) {
            pageTitle.innerHTML = `Search Results: <em>"${escapeHtml(activeSearchQuery)}"</em>`;
            if (pageDesc) {
                pageDesc.innerHTML = `Showing exquisite demi-fine creations matching "${escapeHtml(activeSearchQuery)}". <a href="catalog.html" onclick="clearAllFilters(); return false;" style="color: var(--gold-accent); text-decoration: underline; margin-left: 8px; font-weight: 600;">Clear search</a>`;
            }
            document.title = `Search: "${activeSearchQuery}" | Sorèva`;
        }
        return;
    } else {
        activeSearchQuery = null;
    }

    if (cat && cat !== "all") {
        selectedCategory = cat;
        activeFilter = cat;
    } else {
        selectedCategory = "all";
        activeFilter = "all";
    }

    if (sub) {
        selectedSubCategories.clear();
        sub.split(',').map(s => s.trim()).filter(Boolean).forEach(s => selectedSubCategories.add(s));
    }
    if (plating) {
        selectedPlatings.clear();
        plating.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).forEach(s => selectedPlatings.add(s));
    }
    if (setContents) {
        selectedSetContents.clear();
        setContents.split(',').map(s => s.trim()).filter(Boolean).forEach(s => selectedSetContents.add(s));
    }
    if (stone) {
        selectedStoneColors.clear();
        stone.split(',').map(s => s.trim()).filter(Boolean).forEach(s => selectedStoneColors.add(s));
    }
    if (stoneSize) {
        selectedStoneSizes.clear();
        stoneSize.split(',').map(s => s.trim()).filter(Boolean).forEach(s => selectedStoneSizes.add(s));
    }
    if (sort) {
        catalogSort = sort;
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) sortSelect.value = sort;
    }
    if (badge) {
        activeBadgeFilter = badge.toLowerCase();
    }

    updateCatalogTitleDesc(selectedCategory, sub, badge);
    if (typeof syncMobileQuickPills === 'function') syncMobileQuickPills(selectedCategory);

    // Sync filter-tab active state
    const tabs = document.querySelectorAll(".filter-tab");
    if (tabs.length) {
        tabs.forEach(t => {
            if (t.dataset.category === selectedCategory) {
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
                <div class="curation-card" onclick="handleProductCardClick(event, '${p.id}')" role="button" tabindex="0" aria-label="${p.name}">
                    <div class="curation-media-wrap">
                        <img class="curation-img" src="${getOptimizedImgUrl(p.primaryImg)}" alt="${p.name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='assets/placeholder-jewelry.svg';">
                        <div class="product-badges">
                            <span class="product-badge ${badgeClass}">${badgeIcon}${badgeLabel}</span>
                        </div>
                        <button type="button" class="curation-wishlist-btn btn-wishlist ${isWishlisted ? 'active' : ''}" data-id="${p.id}" onclick="event.stopPropagation(); toggleWishlist('${p.id}');" title="Save to Wishlist" aria-label="Save to Wishlist">
                            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                        <div class="curation-quick-overlay" onclick="event.stopPropagation();">
                            <button type="button" class="curation-quick-btn" onclick="event.stopPropagation(); openQuickView('${p.id}', event);" ontouchend="event.stopPropagation(); openQuickView('${p.id}', event);">
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
        let nlItems = PRODUCTS.filter(p => p.badge && (p.badge.toLowerCase().includes('new') || p.badge.toLowerCase().includes('launch')) && !isProductOutOfStock(p));
        if (nlItems.length > 0) {
            // Group by category and interleave in round-robin fashion so the homepage track shows a varied mix
            const catMap = {};
            nlItems.forEach(p => {
                const c = (p.category || 'other').toLowerCase();
                if (!catMap[c]) catMap[c] = [];
                catMap[c].push(p);
            });
            const cats = Object.keys(catMap);
            const mixedNl = [];
            const maxLen = Math.max(...cats.map(c => catMap[c].length), 0);
            for (let i = 0; i < maxLen; i++) {
                cats.forEach(c => {
                    if (i < catMap[c].length && mixedNl.length < 24) {
                        mixedNl.push(catMap[c][i]);
                    }
                });
            }
            newLaunchTrack.innerHTML = buildCardsHtml(
                mixedNl.length > 0 ? mixedNl : nlItems.slice(0, 20), 
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
        if (typeof closeMobileNavDrawer === 'function') closeMobileNavDrawer();
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

/* ==========================================================================
   SORÈVA CIRCLE NEWSLETTER & WELCOME15 COUPON DISPATCHER
   ========================================================================== */

async function handleNewsletterSubscribe(event) {
    if (event && event.preventDefault) event.preventDefault();
    const form = event && event.target ? event.target.closest('form') : document.querySelector('.newsletter-form');
    if (!form) return;

    const input = form.querySelector('.newsletter-input') || form.querySelector('input[type="email"]');
    const submitBtn = form.querySelector('.newsletter-btn') || form.querySelector('button[type="submit"]');
    const email = input ? input.value.trim().toLowerCase() : '';

    if (!email || !email.includes('@') || !email.includes('.')) {
        if (typeof showToast === 'function') showToast('Please enter a valid email address.');
        return;
    }

    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Subscribe';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subscribing...';
    }

    try {
        const resp = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await resp.json();

        if (resp.ok && data.success) {
            const code = data.couponCode || 'WELCOME15';
            const discPct = data.discountPercent || 15;

            // 1. Auto-apply coupon to customer's active session
            appliedCoupon = {
                code: code,
                discountPercent: discPct,
                minSpendINR: 0,
                active: true,
                description: `${discPct}% OFF (The Sorèva Circle)`
            };
            window.appliedCoupon = appliedCoupon;
            try {
                localStorage.setItem('soreva_applied_coupon', JSON.stringify(appliedCoupon));
            } catch (e) {}

            if (typeof updateCartTotals === 'function') updateCartTotals();
            if (typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
            if (typeof renderCartSummary === 'function') renderCartSummary();

            // 2. Celebratory Toast
            if (typeof showToast === 'function') {
                showToast(`✨ Welcome to The Sorèva Circle! Coupon ${code} (${discPct}% OFF) sent to ${email} & applied to your bag!`);
            }

            // 3. Inline feedback under the form
            let feedbackEl = form.parentElement.querySelector('.newsletter-feedback-msg');
            if (!feedbackEl) {
                feedbackEl = document.createElement('div');
                feedbackEl.className = 'newsletter-feedback-msg';
                feedbackEl.style.cssText = 'color: #c5a059; font-size: 0.85rem; margin-top: 10px; font-weight: 600; display: flex; align-items: center; gap: 6px;';
                form.parentElement.appendChild(feedbackEl);
            }
            feedbackEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> 15% OFF coupon (<strong>${code}</strong>) sent to your inbox & applied to your bag!`;
            setTimeout(() => {
                if (feedbackEl && feedbackEl.parentElement) {
                    feedbackEl.style.transition = 'opacity 0.6s ease';
                    feedbackEl.style.opacity = '0';
                    setTimeout(() => feedbackEl.remove(), 600);
                }
            }, 8000);

            if (input) input.value = '';
        } else {
            if (typeof showToast === 'function') {
                showToast(data.error || 'Subscription could not be processed. Please try again.');
            }
        }
    } catch (err) {
        console.error('[Newsletter Subscribe Error]', err);
        if (typeof showToast === 'function') {
            showToast('Unable to reach server. Please check your connection.');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}
window.handleNewsletterSubscribe = handleNewsletterSubscribe;

// Auto-bind to all .newsletter-form elements across any page
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.newsletter-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            handleNewsletterSubscribe(e);
        });
    });
});

