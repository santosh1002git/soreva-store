import re
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_tab = '''            activeFilter = tab.dataset.category;
            renderProducts();'''
new_tab = '''            activeFilter = tab.dataset.category;
            activeSubFilter = null;
            
            const pageTitle = document.getElementById('pageTitleH1');
            if (pageTitle) {
                if (activeFilter === 'all') {
                    pageTitle.textContent = "The Catalog";
                } else {
                    const formattedCat = activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1).replace(/-/g, ' ');
                    pageTitle.textContent = formattedCat;
                }
            }
            renderProducts();'''
js = js.replace(old_tab, new_tab)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
