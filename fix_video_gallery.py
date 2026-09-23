import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Modify initProductPage to handle videoUrl
pdp_logic = r'''
    // Gallery
    const thumbsContainer = document.getElementById('pdpThumbs');
    const mainImg = document.getElementById('pdpMainImg');
    if (product.gallery && product.gallery.length > 0) {
        let galleryHtml = product.gallery.map((img, idx) => `
            <img src="${img}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 2px solid ${idx===0 ? 'var(--gold-accent)' : 'transparent'};" 
                 onclick="const main=document.getElementById('pdpMainImg'); if(main.tagName==='VIDEO'){ const imgEl=document.createElement('img'); imgEl.id='pdpMainImg'; imgEl.src='${img}'; imgEl.style=main.getAttribute('style'); main.replaceWith(imgEl); } else { main.src='${img}'; } Array.from(this.parentNode.children).forEach(c=>c.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';">
        `).join('');

        if (product.videoUrl) {
            galleryHtml += `
            <div style="width: 70px; height: 70px; border-radius: 6px; cursor: pointer; border: 2px solid transparent; position: relative; background: #000; overflow: hidden;"
                 onclick="const main=document.getElementById('pdpMainImg'); const vidEl=document.createElement('video'); vidEl.id='pdpMainImg'; vidEl.src='${product.videoUrl}'; vidEl.autoplay=true; vidEl.muted=true; vidEl.loop=true; vidEl.playsinline=true; vidEl.style=main.getAttribute('style'); main.replaceWith(vidEl); Array.from(this.parentNode.children).forEach(c=>c.style.borderColor='transparent'); this.style.borderColor='var(--gold-accent)';">
                <video src="${product.videoUrl}" style="width: 100%; height: 100%; object-fit: cover;" muted playsinline></video>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: rgba(0,0,0,0.5); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-play" style="font-size: 0.6rem;"></i></div>
            </div>
            `;
        }
        thumbsContainer.innerHTML = galleryHtml;
    } else {
        thumbsContainer.style.display = 'none';
    }
'''

js = re.sub(r'// Gallery\s+const thumbsContainer = document\.getElementById\(\'pdpThumbs\'\);\s+if \(product\.gallery && product\.gallery\.length > 0\) \{.*?\} else \{\s+thumbsContainer\.style\.display = \'none\';\s+\}', pdp_logic, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
