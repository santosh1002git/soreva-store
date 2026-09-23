import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Make sure we don't duplicate
if 'urlParams.get(' not in js:
    # Inject before renderProducts call in applyStoreData
    func_pattern = r'function applyStoreData\(data\) \{'
    replacement = r'''function applyStoreData(data) {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCat = urlParams.get('cat');
    const urlSub = urlParams.get('sub');
    
    if (urlCat) {
        currentFilter = urlCat;
        const btn = document.querySelector(`.filter-tab[data-category="${urlCat}"]`);
        if (btn) {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }
    }
    if (urlSub) {
        currentSubFilter = decodeURIComponent(urlSub);
    } else {
        currentSubFilter = null;
    }
'''
    js = re.sub(func_pattern, replacement, js, count=1)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
