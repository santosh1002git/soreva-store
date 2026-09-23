import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

replacement = r'''
    const modalDesc = document.getElementById('modalDescription');
    const finishPillsWrap = document.getElementById('modalFinishPills');
    const fullDetailsBtn = document.getElementById('modalFullDetailsBtn'); // NEW

    if (modalImg) modalImg.src = product.primaryImg;
    if (modalCat) modalCat.textContent = `${product.category} • ${product.subCategory}`;
    if (modalTitle) modalTitle.textContent = product.name;
    if (modalPrice) modalPrice.textContent = formatPrice(product.priceINR);
    if (modalOriginal) modalOriginal.textContent = formatPrice(product.originalPriceINR);
    if (modalDesc) modalDesc.textContent = product.description;
    
    // Set Full Details URL
    if (fullDetailsBtn) {
        fullDetailsBtn.href = `product.html?id=${product.id}`;
    }
'''

js = re.sub(r'''\s*const modalDesc = document.getElementById\('modalDescription'\);\s*const finishPillsWrap = document.getElementById\('modalFinishPills'\);\s*if \(modalImg\) modalImg\.src = product\.primaryImg;.*?if \(modalDesc\) modalDesc\.textContent = product\.description;''', replacement, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
