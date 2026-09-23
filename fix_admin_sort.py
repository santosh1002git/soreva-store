import re

with open('admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix sorting to happen BEFORE pagination
fixed_logic = r'''
    // Group by category if we are viewing 'all'
    if (filterCat === 'all' && !filterText) {
        items.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / adminCatalogPageSize));
    if (adminCatalogPage > totalPages) adminCatalogPage = totalPages;
    if (adminCatalogPage < 1) adminCatalogPage = 1;

    const startIdx = (adminCatalogPage - 1) * adminCatalogPageSize;
    let pageItems = items.slice(startIdx, startIdx + adminCatalogPageSize);
'''

js = re.sub(r'const total = items\.length;.*?if \(filterCat === \'all\' && !filterText\) \{\s*pageItems\.sort\(\(a, b\) => \(a\.category \|\| \'\'\)\.localeCompare\(b\.category \|\| \'\'\)\);\s*\}', fixed_logic, js, flags=re.DOTALL)

with open('admin.js', 'w', encoding='utf-8') as f:
    f.write(js)
