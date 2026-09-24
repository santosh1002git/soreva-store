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

// Initial Canonical Catalog from CZ Makers Sorèva Exclusive
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
        availableFinishes: ["18K Gold", "Rhodium Silver", "Rose Gold"],
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
        availableFinishes: ["Rhodium Silver", "18K Gold"],
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
        availableFinishes: ["18K Gold", "Rhodium Silver"],
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
        availableFinishes: ["Rhodium Silver", "18K Gold", "Rose Gold"],
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
        availableFinishes: ["18K Gold", "Rhodium Silver"],
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
        availableFinishes: ["18K Gold", "Rhodium Silver"],
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
        availableFinishes: ["18K Gold", "Rhodium Silver"],
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
        availableFinishes: ["18K Gold", "Rhodium Silver", "Rose Gold"],
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

// App State
let cart = [];

let wishlist = [2, 8];
let activeFilter = 'all';
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
        renderProducts();
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
    document.querySelectorAll('.cat-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.cat-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const targetCat = link.dataset.category;
            
            // Sync with filter tabs
            activeFilter = targetCat;
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.category === targetCat);
            });

            // Smooth scroll to products
            const productsSec = document.getElementById('products-catalog');
            if (productsSec) {
                productsSec.scrollIntoView({ behavior: 'smooth' });
            }
            renderProducts();
        });
    });
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

    if (totalMatching === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fa-solid fa-gem" style="font-size: 2.5rem; color: var(--border-color); margin-bottom: 16px;"></i>
                <h3 style="font-family: var(--font-heading); color: var(--theme-color);">No pieces match your selection</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 6px;">Try adjusting your metal finish or category filter.</p>
            </div>
        `;
        const existingLoadMore = document.getElementById('storeLoadMoreContainer');
        if (existingLoadMore) existingLoadMore.innerHTML = '';
        return;
    }

    const visibleItems = items.slice(0, currentStorePageLimit);

    grid.innerHTML = visibleItems.map(product => {
        const isWishlisted = wishlist.includes(String(product.id)) || wishlist.includes(product.id);
        const finishes = (product.availableFinishes && product.availableFinishes.length) ? product.availableFinishes : ["18K Gold", "Rhodium Silver"];
        const primaryFinish = finishes[0];
        const discountPct = (product.originalPriceINR && product.originalPriceINR > product.priceINR) 
            ? Math.round((1 - product.priceINR / product.originalPriceINR) * 100) 
            : 0;
        const hoverImg = product.hoverImg || product.primaryImg;

        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-thumb-wrap">
                    <img class="product-thumb primary-img" src="${product.primaryImg}" alt="${product.name}" loading="lazy">
                    <img class="product-thumb hover-img" src="${hoverImg}" alt="${product.name}" loading="lazy">
                    
                    <div class="product-badges">
                        ${product.badge ? `<span class="product-badge badge-bestseller">${product.badge}</span>` : ''}
                        ${product.launchOffer ? `<span class="product-badge badge-launch">15% OFF</span>` : ''}
                    </div>

                    <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist('${product.id}')" title="Add to Wishlist">
                        <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>

                    <div class="product-quick-actions">
                        <button class="btn-quick-view" onclick="openQuickView('${product.id}')">
                            <i class="fa-regular fa-eye"></i> Quick View
                        </button>
                    </div>
                </div>

                <div class="product-details">
                    <span class="product-category-sub">${product.subCategory || product.category}</span>
                    <h3 class="product-title">${product.name}</h3>
                    
                    <div class="product-rating">
                        <i class="fa-solid fa-star"></i>
                        <span style="font-weight: 600; color: var(--theme-color);">${product.rating || 4.8}</span>
                        <span class="review-count">(${product.reviews || 12})</span>
                    </div>

                    <div class="product-plating-swatches">
                        <span class="swatch-dot gold ${product.plating === 'gold' ? 'active' : ''}" title="18K Gold Plated"></span>
                        <span class="swatch-dot silver ${product.plating === 'silver' ? 'active' : ''}" title="Rhodium Silver"></span>
                        <span class="swatch-dot rosegold ${product.plating === 'rosegold' || product.plating === 'rose-gold' ? 'active' : ''}" title="Rose Gold"></span>
                    </div>

                    <div class="product-price-row">
                        <span class="current-price">${formatPrice(product.priceINR)}</span>
                        ${discountPct > 0 ? `<span class="original-price">${formatPrice(product.originalPriceINR)}</span>` : ''}
                        ${discountPct > 0 ? `<span class="discount-tag">Save ${discountPct}%</span>` : ''}
                    </div>

                    <button class="btn-add-cart" onclick="addToCart('${product.id}', '${primaryFinish}')">
                        <i class="fa-solid fa-bag-shopping"></i> Add To Cart
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Load More container
    let loadMoreContainer = document.getElementById('storeLoadMoreContainer');
    if (!loadMoreContainer) {
        loadMoreContainer = document.createElement('div');
        loadMoreContainer.id = 'storeLoadMoreContainer';
        loadMoreContainer.style.cssText = 'text-align: center; margin: 40px auto 20px; width: 100%;';
        grid.parentNode.insertBefore(loadMoreContainer, grid.nextSibling);
    }

    if (totalMatching > currentStorePageLimit) {
        const nextBatch = Math.min(48, totalMatching - currentStorePageLimit);
        loadMoreContainer.innerHTML = `
            <div style="margin-bottom: 14px; color: var(--text-muted); font-size: 0.92rem;">
                Displaying <strong>${Math.min(currentStorePageLimit, totalMatching).toLocaleString('en-IN')}</strong> of <strong>${totalMatching.toLocaleString('en-IN')}</strong> handcrafted pieces
            </div>
            <button class="btn-primary" onclick="loadMoreStoreProducts()" style="padding: 14px 38px; border-radius: 30px; cursor: pointer; font-size: 0.95rem; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(0,0,0,0.12);">
                <i class="fa-solid fa-gem" style="margin-right: 8px;"></i> Load More Pieces (+${nextBatch.toLocaleString('en-IN')})
            </button>
        `;
    } else {
        loadMoreContainer.innerHTML = `
            <div style="color: var(--text-muted); font-size: 0.88rem; padding: 20px 0;">
                Showing all <strong>${totalMatching.toLocaleString('en-IN')}</strong> luxury pieces in this selection.
            </div>
        `;
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
            saveCart();
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

function addToCart(productId, finish = "18K Gold", quantity = 1) {
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
let currentModalSelectedFinish = "18K Gold";

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
