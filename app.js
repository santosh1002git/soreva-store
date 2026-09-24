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

// Initial Canonical Catalog from CZ Makers Distributor Catalog
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
        description: "Exquisitely handcrafted royal CZ choker necklace from distributor catalog. Features premium AAA+ cubic zirconia crystals in an anti-tarnish micro-plated finish."
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
let HERO_SLIDES = [];

// App State
let cart = [];

let wishlist = [2, 8];
let activeFilter = 'all';
let activeSubFilter = null;
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
    container.innerHTML = categories.map(cat => `
        <div class="category-card" onclick="filterByCategory('${cat.slug}')">
            <div class="category-img-wrap">
                <img class="category-img" src="${cat.image}" alt="${cat.name}">
            </div>
            <div class="category-info">
                <h3 class="category-name">${cat.name}</h3>
                <span class="category-item-count">${cat.countLabel || ''}</span>
            </div>
        </div>
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
    const container = document.getElementById('testimonialsGrid');
    if (!container || !testimonials || !testimonials.length) return;
    container.innerHTML = testimonials.map(t => {
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
}

// Dynamic Social Grid Renderer
function renderSocialFeed(instagram) {
    const container = document.getElementById('socialGrid');
    if (!container || !instagram || !instagram.length) return;
    container.innerHTML = instagram.map(item => `
        <a href="${item.link || 'https://www.instagram.com/soreva_jewels'}" target="_blank" rel="noopener" class="social-item" title="${item.title || 'Instagram Post'}">
            <img class="social-img" src="${item.image}" alt="${item.title || 'Instagram Item'}">
            <div class="social-overlay"><i class="fa-brands fa-instagram"></i></div>
        </a>
    `).join('');
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
    }
    if (data.heroSlides && data.heroSlides.length) {
        HERO_SLIDES = data.heroSlides;
        if (currentHeroIndex >= HERO_SLIDES.length) currentHeroIndex = 0;
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
        renderSocialFeed(data.instagram);
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
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Category bar clicks

}

// ==========================================
// Filter and Sort Engine
// ==========================================
function initFilters() {
    // Filter Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.category;
            activeSubFilter = null;
            
            const pageTitle = document.getElementById('catalogTitle');
            if (pageTitle) {
                if (activeFilter === 'all') {
                    pageTitle.textContent = "The Catalog";
                } else {
                    const formattedCat = activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1).replace(/-/g, ' ');
                    pageTitle.textContent = formattedCat;
                }
            }
            renderProducts();
        });
    });

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
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    // Public storefront: only show active and enabled pieces
    let items = PRODUCTS.filter(p => !p.disabled && p.active !== false && p.active !== 0 && p.stockStatus !== 'Disabled');

    // Filter category
    if (activeFilter !== 'all') {
        items = items.filter(p => {
            if (activeFilter === 'wristwear' || activeFilter === 'bracelets') {
                return p.category === 'wristwear' || p.category === 'bracelets';
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
        items = items.filter(p => p.plating === activePlating);
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
            <div class="product-card" data-id="${product.id}" onclick="openQuickView('${product.id}')">
                <div class="product-thumb-wrap ${!hasHover ? 'scale-hover-only' : ''}">
                    <img class="product-thumb primary-img" src="${product.primaryImg}" alt="${product.name}" loading="lazy" onerror="this.src='https://indian-jewellery.com/core/thumb_images/product_images/773510AQ10CV91077.jpg';">
                    ${hasHover ? `<img class="product-thumb hover-img" src="${product.hoverImg}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.parentElement.classList.add('scale-hover-only');">` : ''}
                    
                    <div class="product-badges">
                        ${product.badge ? `<span class="product-badge badge-bestseller">${product.badge}</span>` : ''}
                        ${product.launchOffer ? `<span class="product-badge badge-launch">15% OFF</span>` : ''}
                    </div>

                    <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${product.id}')" title="Add to Wishlist">
                        <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <div class="product-quick-actions">
                        <button class="btn-quick-view" onclick="event.stopPropagation(); openQuickView('${product.id}')">
                            <i class="fa-regular fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>

                <div class="product-details">
                    <span class="product-category-sub">${product.subCategory || product.category}</span>
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
                    const prod = PRODUCTS.find(p => p.id === item.productId);
                    return sum + (prod ? prod.priceINR * item.qty : 0);
                }, 0);

                if (found.minSpendINR && subtotal < found.minSpendINR) {
                    showToast(`Min spend of ${formatPrice(found.minSpendINR)} required for ${found.code}.`);
                    return;
                }

                appliedCoupon = found;
                updateCartUI();
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
                showToast("Your shopping bag is empty!");
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

function openCheckoutModal() {
    const backdrop = document.getElementById('checkoutModalBackdrop');
    const formView = document.getElementById('checkoutFormView');
    const successView = document.getElementById('checkoutSuccessView');
    const itemsList = document.getElementById('chkItemsList');
    const subtotalEl = document.getElementById('chkSubtotal');
    const discountEl = document.getElementById('chkDiscount');
    const grandTotalEl = document.getElementById('chkGrandTotal');

    if (!backdrop || !formView || !successView) return;

    formView.style.display = 'block';
    successView.style.display = 'none';

    let subtotalINR = 0;
    itemsList.innerHTML = cart.map(item => {
        const prod = PRODUCTS.find(p => p.id === item.productId);
        if (!prod) return '';
        const itemTot = prod.priceINR * item.qty;
        subtotalINR += itemTot;

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,0.08);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${prod.primaryImg}" alt="${prod.name}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(197,160,89,0.2);">
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">${prod.name}</div>
                        <div style="font-size: 0.75rem; color: rgba(251,248,245,0.6);">${item.qty} × ${formatPrice(prod.priceINR)} • ${item.finish}</div>
                    </div>
                </div>
                <strong style="color: #dfbd7c; font-size: 0.9rem;">${formatPrice(itemTot)}</strong>
            </div>
        `;
    }).join('');

    let discountINR = 0;
    if (appliedCoupon && appliedCoupon.discountPercent) {
        discountINR = Math.round(subtotalINR * (appliedCoupon.discountPercent / 100));
    }
    const grandTotal = Math.max(0, subtotalINR - discountINR);

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotalINR);
    if (discountEl) discountEl.textContent = discountINR > 0 ? `- ${formatPrice(discountINR)}` : '₹0';
    if (grandTotalEl) grandTotalEl.textContent = formatPrice(grandTotal);

    backdrop.style.display = 'flex';
}

function closeCheckoutModal() {
    const backdrop = document.getElementById('checkoutModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
}

async function handlePlaceOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitOrder');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Reserving & Placing Order...</span>`;

    const name = document.getElementById('chkCustName').value.trim();
    const email = document.getElementById('chkCustEmail').value.trim();
    const phone = document.getElementById('chkCustPhone').value.trim();
    const address = document.getElementById('chkCustAddress').value.trim();
    const city = document.getElementById('chkCustCity').value.trim();
    const paymentMethod = document.getElementById('chkPaymentMethod').value;

    let subtotalINR = 0;
    const orderItems = cart.map(it => {
        const prod = PRODUCTS.find(p => p.id === it.productId);
        const price = prod ? prod.priceINR : 0;
        subtotalINR += price * it.qty;
        return {
            productId: it.productId,
            name: prod ? prod.name : 'Jewellery Piece',
            finish: it.finish,
            qty: it.qty,
            price: price
        };
    });

    let discountINR = 0;
    if (appliedCoupon && appliedCoupon.discountPercent) {
        discountINR = Math.round(subtotalINR * (appliedCoupon.discountPercent / 100));
    }
    const finalAmount = Math.max(0, subtotalINR - discountINR);

    try {
        const resp = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                shippingAddress: address,
                city: city,
                paymentMethod: paymentMethod,
                items: orderItems,
                totalAmount: finalAmount
            })
        });

        const res = await resp.json();

        if (res.success) {
            // Clear cart
            cart = [];
            appliedCoupon = null;
            localStorage.setItem('sorevaCart', JSON.stringify(cart));
            updateCartUI();

            // Populate Success View
            document.getElementById('successCustName').textContent = name;
            document.getElementById('successOrderNum').textContent = res.orderNumber || 'SRV-2026-1085';
            document.getElementById('successTotalAmt').textContent = formatPrice(finalAmount);

            document.getElementById('checkoutFormView').style.display = 'none';
            document.getElementById('checkoutSuccessView').style.display = 'block';

            showToast(`Order ${res.orderNumber} placed successfully!`);
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

function addToCart(productId, finish = "24K Gold", quantity = 1) {
    const existing = cart.find(item => item.productId === productId && item.finish === finish);
    if (existing) {
        existing.qty += quantity;
    } else {
        cart.push({ productId, finish, qty: quantity });
    }
    updateCartUI();
    showToast("Added to your shopping bag!");

    // Open drawer automatically for smooth feedback
    const drawer = document.getElementById('cartDrawer');
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (drawer && backdrop) {
        drawer.classList.add('active');
        backdrop.classList.add('active');
    }
}

function updateCartQty(index, delta) {
    if (cart[index]) {
        cart[index].qty += delta;
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
        }
        updateCartUI();
    }
}

function removeFromCart(index) {
    if (cart[index]) {
        cart.splice(index, 1);
        updateCartUI();
        showToast("Item removed from bag.");
    }
}

function updateCartUI() {
    const list = document.getElementById('cartItemsList');
    const countBadges = document.querySelectorAll('.cart-count-badge');
    const subtotalEl = document.getElementById('cartSubtotal');
    const discountEl = document.getElementById('cartDiscount');
    const totalEl = document.getElementById('cartTotal');
    const shippingMeterText = document.getElementById('shippingMeterText');
    const shippingProgressFill = document.getElementById('shippingProgressFill');

    // Total Count
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    countBadges.forEach(badge => badge.textContent = totalItems);

    if (!list) return;

    if (cart.length === 0) {
        list.innerHTML = `
            <div class="cart-empty-state">
                <i class="fa-solid fa-bag-shopping"></i>
                <h4>Your Bag is Empty</h4>
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
        const product = PRODUCTS.find(p => p.id === item.productId);
        if (!product) return '';
        const itemTotalINR = product.priceINR * item.qty;
        subtotalINR += itemTotalINR;

        return `
            <div class="cart-item">
                <img class="cart-item-thumb" src="${product.primaryImg}" alt="${product.name}">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${product.name}</h4>
                    <p class="cart-item-variant">Finish: <strong>${item.finish}</strong></p>
                    <div class="cart-item-bottom">
                        <div class="cart-qty-control">
                            <button class="qty-btn" onclick="updateCartQty(${idx}, -1)">-</button>
                            <span class="qty-val">${item.qty}</span>
                            <button class="qty-btn" onclick="updateCartQty(${idx}, 1)">+</button>
                        </div>
                        <span class="cart-item-price">${formatPrice(itemTotalINR)}</span>
                        <button class="btn-remove-item" onclick="removeFromCart(${idx})" title="Remove item">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Calculations
    let discountINR = 0;
    if (appliedCoupon) {
        discountINR = (subtotalINR * appliedCoupon.discountPercent) / 100;
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

// ==========================================
// Wishlist Engine
// ==========================================
function toggleWishlist(productId) {
    const idx = wishlist.indexOf(productId);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        showToast("Removed from wishlist");
    } else {
        wishlist.push(productId);
        showToast("Saved to your wishlist!");
    }
    updateWishlistUI();
    renderProducts();
}

function updateWishlistUI() {
    const badges = document.querySelectorAll('.wishlist-count-badge');
    badges.forEach(b => b.textContent = wishlist.length);
}

// ==========================================
// Quick View Modal
// ==========================================
let currentModalProductId = null;
let currentModalSelectedFinish = "24K Gold";

function initQuickView() {
    const modalBackdrop = document.getElementById('quickViewBackdrop');
    const closeBtn = document.getElementById('modalCloseBtn');

    const closeModal = () => {
        modalBackdrop.classList.remove('active');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeModal();
        });
    }

    // Modal Add To Cart
    const modalAddBtn = document.getElementById('modalAddToCartBtn');
    if (modalAddBtn) {
        modalAddBtn.addEventListener('click', () => {
            const qtyInput = document.getElementById('modalQtyInput');
            const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
            if (currentModalProductId) {
                addToCart(currentModalProductId, currentModalSelectedFinish, qty);
                closeModal();
            }
        });
    }
}

function openQuickView(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    currentModalProductId = product.id;
    currentModalSelectedFinish = product.availableFinishes[0];

    const modalBackdrop = document.getElementById('quickViewBackdrop');
    const modalImg = document.getElementById('modalMainImg');
    const modalThumbs = document.getElementById('modalThumbsRow');
    const modalCat = document.getElementById('modalCategory');
    const modalTitle = document.getElementById('modalTitle');
    const modalPrice = document.getElementById('modalPrice');
    const modalOriginal = document.getElementById('modalOriginalPrice');
    const modalDesc = document.getElementById('modalDescription');
    
    const finishPillsWrap = document.getElementById('modalFinishPills');
    
    // Update Full Details Link
    const fullDetailsBtn = document.getElementById('modalFullDetailsBtn');
    if (fullDetailsBtn) {
        fullDetailsBtn.href = `product.html?id=${product.id}`;
    }


    if (modalImg) modalImg.src = product.primaryImg;
    if (modalCat) modalCat.textContent = `${product.category} • ${product.subCategory}`;
    if (modalTitle) modalTitle.textContent = product.name;
    if (modalPrice) modalPrice.textContent = formatPrice(product.priceINR);
    if (modalOriginal) modalOriginal.textContent = formatPrice(product.originalPriceINR);
    if (modalDesc) modalDesc.textContent = product.description;

    // Gallery Thumbs
    if (modalThumbs && product.gallery) {
        modalThumbs.innerHTML = product.gallery.map((img, i) => `
            <img class="modal-thumb ${i === 0 ? 'active' : ''}" src="${img}" alt="Thumbnail" onclick="switchModalImage(this, '${img}')">
        `).join('');
    }

    // Metal Finish Pills
    if (finishPillsWrap) {
        finishPillsWrap.innerHTML = product.availableFinishes.map((finish, i) => `
            <button class="plating-pill ${i === 0 ? 'active' : ''}" onclick="selectModalFinish(this, '${finish}')">
                ${finish}
            </button>
        `).join('');
    }

    const qtyInput = document.getElementById('modalQtyInput');
    if (qtyInput) qtyInput.value = 1;

    modalBackdrop.classList.add('active');
}

function switchModalImage(thumbEl, src) {
    document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
    thumbEl.classList.add('active');
    const mainImg = document.getElementById('modalMainImg');
    if (mainImg) mainImg.src = src;
}

function selectModalFinish(pillEl, finish) {
    document.querySelectorAll('.plating-pill').forEach(p => p.classList.remove('active'));
    pillEl.classList.add('active');
    currentModalSelectedFinish = finish;
}

// ==========================================
// Live Search Overlay
// ==========================================
function initSearch() {
    const searchBtns = document.querySelectorAll('.search-open-btn');
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('searchKeywordInput');
    const resultsWrap = document.getElementById('searchResults');

    searchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            overlay.classList.toggle('active');
            if (overlay.classList.contains('active') && input) {
                setTimeout(() => input.focus(), 150);
            }
        });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (overlay.classList.contains('active') && !overlay.contains(e.target) && !e.target.closest('.search-open-btn')) {
            overlay.classList.remove('active');
        }
    });

    if (input && resultsWrap) {
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length === 0) {
                resultsWrap.classList.remove('show');
                resultsWrap.innerHTML = '';
                return;
            }

            const matches = PRODUCTS.filter(p => 
                !p.disabled && p.active !== false && p.stockStatus !== 'Disabled' &&
                (p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query) ||
                p.subCategory.toLowerCase().includes(query))
            );

            if (matches.length === 0) {
                resultsWrap.innerHTML = `
                    <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
                        No jewellery found for "<strong>${e.target.value}</strong>"
                    </div>
                `;
            } else {
                resultsWrap.innerHTML = matches.map(p => `
                    <div class="search-item-match" onclick="openQuickView(${p.id}); document.getElementById('searchOverlay').classList.remove('active');">
                        <img src="${p.primaryImg}" alt="${p.name}">
                        <div style="flex: 1;">
                            <h5 style="font-family: var(--font-heading); font-size: 0.95rem; color: var(--theme-color); margin-bottom: 2px;">${p.name}</h5>
                            <span style="font-size: 0.75rem; color: var(--gold-hover); text-transform: uppercase;">${p.subCategory}</span>
                        </div>
                        <span style="font-size: 0.95rem; font-weight: 700; color: var(--theme-color);">${formatPrice(p.priceINR)}</span>
                    </div>
                `).join('');
            }
            resultsWrap.classList.add('show');
        });
    }
}

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
                <button onclick="toggleChatbot()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; font-weight: bold;">X</button>
            </div>
            <div id="chatbot-messages" style="flex: 1; padding: 16px; overflow-y: auto; background: #f9f9f9; display: flex; flex-direction: column; gap: 12px;">
                <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                    Hello! I am your AI jewelry assistant. How can I help you today?
                </div>
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

    // 1. Render all 8 full-bleed background slide images for instant crossfading
    slidesWrapper.innerHTML = HERO_SLIDES.map((slide, idx) => `
        <div class="hero-slide-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
            <img class="hero-slide-bg" src="${slide.image}" alt="${slide.name}" loading="eager">
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
                        • Plating: ${product.finish || '24K Gold'}<br>
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
                cart.push({...product, quantity: qty, selectedFinish: product.finish || '24K Gold Plated'});
            }
            localStorage.setItem('sorevaCart', JSON.stringify(cart));
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

function initApp() {
    if (typeof initAnnouncementTicker === 'function') initAnnouncementTicker();
    if (typeof initCurrencySwitcher === 'function') initCurrencySwitcher();
    if (typeof initNavigation === 'function') initNavigation();
    if (typeof initPatreonHero === 'function') initPatreonHero();
    if (typeof initFilters === 'function') initFilters();
    if (typeof initSearch === 'function') initSearch();
    if (typeof initCartDrawer === 'function') initCartDrawer();
    if (typeof initQuickView === 'function') initQuickView();
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof updateWishlistUI === 'function') updateWishlistUI();
    
    // Clear out hardcoded products before loading
    if (typeof PRODUCTS !== 'undefined') PRODUCTS = [];
    if (typeof HERO_SLIDES !== 'undefined') HERO_SLIDES = [];
    
    if (typeof loadStoreDataAndInit === 'function') loadStoreDataAndInit();
}

document.addEventListener('DOMContentLoaded', initApp);


function parseUrlAndSetTitle() {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('cat');
    const sub = urlParams.get('sub');
    
    if (cat && cat !== 'all') {
        activeFilter = cat;
    }
    if (sub) {
        activeSubFilter = sub;
    }

    // Set page title
    const pageTitle = document.getElementById('catalogTitle');
    if (pageTitle) {
        if (sub) {
            pageTitle.textContent = sub;
            document.title = sub + " | Sorèva";
        } else if (cat && cat !== 'all') {
            const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ');
            pageTitle.textContent = formattedCat;
            document.title = formattedCat + " | Sorèva";
        }
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
