import re
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

init_app = '''
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
'''

with open('app.js', 'a', encoding='utf-8') as f:
    f.write('\\n' + init_app)
