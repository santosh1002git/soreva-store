import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

def replacer(match):
    return """    container.innerHTML = categories.map(cat => `
        <a href="catalog.html?cat=${cat.slug}" class="category-card" style="text-decoration: none; color: inherit; display: block;">
            <div class="category-img-wrap">
                <img class="category-img" src="${cat.image}" alt="${cat.name}">
            </div>
            <div class="category-info">
                <h3 class="category-name">${cat.name}</h3>
                <span class="category-item-count">${cat.countLabel || ''}</span>
                <div class="btn-secondary" style="margin-top: 15px; width: 100%; padding: 8px 0; font-size: 0.85rem;">Explore Category</div>
            </div>
        </a>
    `).join('');"""

js = re.sub(r'    container\.innerHTML = categories\.map\(cat => `.*?`\)\.join\(\'\'\);', replacer, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
