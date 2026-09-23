import re

for filename in ['index.html', 'catalog.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        html = f.read()

    replacement = r'''
                    <div style="display: flex; gap: 12px; margin-top: 14px;">
                        <button class="btn-add-cart" id="modalAddToCartBtn" style="flex: 1; padding: 14px;">
                            <i class="fa-solid fa-bag-shopping"></i> Add To Bag
                        </button>
                        <a id="modalFullDetailsBtn" href="#" style="flex: 1; padding: 14px; text-align: center; text-decoration: none; border: 1px solid var(--gold-badge); border-radius: 8px; color: var(--gold-badge); font-weight: 600; display: inline-flex; justify-content: center; align-items: center; gap: 8px; transition: all 0.2s;">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Full Details
                        </a>
                    </div>
'''
    
    html = re.sub(r'<button class="btn-add-cart" id="modalAddToCartBtn" style="margin-top: 14px; padding: 14px;">.*?Add To Bag\s*</button>', replacement, html, flags=re.DOTALL)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html)
