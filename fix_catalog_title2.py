with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

import re

fix = '''
function initFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('cat');
    if (cat) {
        currentFilters.category = cat;
        // Also update the page title
        const pageTitle = document.getElementById('pageTitleH1') || document.querySelector('h1');
        if (pageTitle) {
            const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ');
            pageTitle.textContent = formattedCat;
            document.title = formattedCat + " | Sorèva";
        }
    }
'''

js = re.sub(r'function initFilters\(\) \{.*?if \(cat\) \{.*?\}', fix, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
