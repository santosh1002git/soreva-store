with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

import re
thumb_logic = '''
    const pdpThumbs = document.getElementById('pdpThumbs');
    if (pdpThumbs) {
        let galleryHtml = `<img src="${product.primaryImg}" class="pdp-thumb-img active" onclick="document.getElementById('pdpMainImg').src=this.src; document.querySelectorAll('.pdp-thumb-img').forEach(el=>el.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';" style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid var(--gold-accent);">`;
        if (product.hoverImg) {
            galleryHtml += `<img src="${product.hoverImg}" class="pdp-thumb-img" onclick="document.getElementById('pdpMainImg').src=this.src; document.querySelectorAll('.pdp-thumb-img').forEach(el=>el.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';" style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid transparent;">`;
        }
        pdpThumbs.innerHTML = galleryHtml;
    }
'''

js = js.replace("document.title = product.name + \" | Sorèva\";", "document.title = product.name + \" | Sorèva\";" + thumb_logic)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
