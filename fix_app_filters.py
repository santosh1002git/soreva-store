import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the earlier injected code
js = js.replace('currentFilter = urlCat;', 'activeFilter = urlCat;')
js = js.replace('currentSubFilter = decodeURIComponent(urlSub);', 'activeSubFilter = decodeURIComponent(urlSub);')
js = js.replace('currentSubFilter = null;', 'activeSubFilter = null;')

if 'let activeSubFilter = null;' not in js:
    js = js.replace('let activeFilter = \'all\';', 'let activeFilter = \'all\';\nlet activeSubFilter = null;')

# Update renderProducts to check activeSubFilter
render_pattern = r'// Filter category\n\s+if \(activeFilter !== \'all\'\) \{.*?(?=\s+// Filter plating)'
render_replacement = r'''// Filter category
    if (activeFilter !== 'all') {
        items = items.filter(p => {
            if (activeFilter === 'wristwear' || activeFilter === 'bracelets') {
                return p.category === 'wristwear' || p.category === 'bracelets';
            }
            return p.category === activeFilter;
        });
    }

    // Filter subcategory mapping
    if (activeSubFilter) {
        // We match exactly if possible
        items = items.filter(p => {
            if (!p.subCategory) return false;
            // The mapping is mostly direct now because we mapped the URLs to match the database exactly in index.html!
            // Wait, in index.html I used URL parameters like sub=Bridal%20Necklaces.
            // Which directly match the db values. So we just do a direct string match!
            return p.subCategory.toLowerCase() === activeSubFilter.toLowerCase();
        });
    }
'''
js = re.sub(render_pattern, render_replacement, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
