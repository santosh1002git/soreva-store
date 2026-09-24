import re
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

funcs = [
    'initAnnouncementTicker', 'initCurrencySwitcher', 'initNavigation',
    'initPatreonHero', 'initFilters', 'initSearch', 'initCartDrawer',
    'initQuickView', 'updateCartUI', 'updateWishlistUI'
]
for func in funcs:
    if f"function {func}" not in js:
        print(f"MISSING: {func}")
