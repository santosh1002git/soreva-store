import re

with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

promise_css = '''
/* ==========================================
   SORÈVA PROMISE SECTION
   ========================================== */
.promise-section {
    background: linear-gradient(135deg, #fbf9f6 0%, #f4eee7 100%);
    padding: 100px 20px;
    text-align: center;
    border-top: 1px solid var(--border-color);
}
.promise-header {
    margin-bottom: 60px;
}
.promise-ornament {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
    margin-bottom: 20px;
    color: var(--gold-accent);
}
.promise-ornament::before,
.promise-ornament::after {
    content: '';
    height: 1px;
    width: 60px;
    background-color: var(--gold-accent);
    opacity: 0.5;
}
.promise-title {
    font-family: var(--font-heading);
    font-size: 3.5rem;
    color: var(--text-dark);
    margin-bottom: 15px;
}
.promise-subtitle {
    font-size: 0.85rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-muted);
}
.promise-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 30px;
    max-width: 1300px;
    margin: 0 auto;
}
.promise-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 10px;
    border-right: 1px solid rgba(199, 179, 153, 0.2);
}
.promise-item:last-child {
    border-right: none;
}
.promise-icon-wrap {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    border: 1px solid var(--gold-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    color: var(--gold-accent);
    font-size: 1.5rem;
    background: #fff;
    box-shadow: 0 5px 15px rgba(0,0,0,0.02);
}
.promise-item-title {
    font-size: 0.95rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-dark);
    margin-bottom: 12px;
    line-height: 1.4;
}
.promise-item-desc {
    font-size: 0.9rem;
    color: var(--text-muted);
    line-height: 1.6;
}

@media (max-width: 1024px) {
    .promise-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 40px 20px;
    }
    .promise-item:nth-child(3) {
        border-right: none;
    }
}
@media (max-width: 768px) {
    .promise-grid {
        grid-template-columns: 1fr;
        gap: 40px;
    }
    .promise-item {
        border-right: none;
        border-bottom: 1px solid rgba(199, 179, 153, 0.2);
        padding-bottom: 40px;
    }
    .promise-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
    .promise-title {
        font-size: 2.5rem;
    }
}
'''
if "SORÈVA PROMISE SECTION" not in css:
    css += '\n' + promise_css
    with open('styles.css', 'w', encoding='utf-8') as f:
        f.write(css)

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

promise_html = '''
        <!-- SORÈVA PROMISE SECTION -->
        <section class="promise-section">
            <div class="promise-header">
                <div class="promise-ornament">
                    <i class="fa-solid fa-gem" style="font-size: 0.7rem;"></i>
                </div>
                <h2 class="promise-title">Sorèva Promise</h2>
                <div class="promise-subtitle">Exceptional Craftsmanship • Timeless Beauty • Trusted Always</div>
            </div>
            
            <div class="promise-grid">
                <div class="promise-item">
                    <div class="promise-icon-wrap"><i class="fa-solid fa-hands-holding-circle"></i></div>
                    <h3 class="promise-item-title">Hand-Set<br>Gemstones</h3>
                    <p class="promise-item-desc">Every gemstone is carefully hand-set and secured for maximum brilliance and lasting confidence.</p>
                </div>
                <div class="promise-item">
                    <div class="promise-icon-wrap"><i class="fa-solid fa-droplet"></i></div>
                    <h3 class="promise-item-title">Premium Gold<br>& Rhodium</h3>
                    <p class="promise-item-desc">Finished with generous layers of 24K Gold and Rhodium for extraordinary shine and durability.</p>
                </div>
                <div class="promise-item">
                    <div class="promise-icon-wrap"><i class="fa-solid fa-leaf"></i></div>
                    <h3 class="promise-item-title">Skin Friendly<br>For Daily Wear</h3>
                    <p class="promise-item-desc">Thoughtfully crafted with comfortable, hypoallergenic materials for everyday elegance.</p>
                </div>
                <div class="promise-item">
                    <div class="promise-icon-wrap"><i class="fa-solid fa-magnifying-glass-chart"></i></div>
                    <h3 class="promise-item-title">Quality Checked<br>& Inspected</h3>
                    <p class="promise-item-desc">Every Sorèva piece undergoes meticulous 5-point quality checks before it reaches you.</p>
                </div>
                <div class="promise-item">
                    <div class="promise-icon-wrap"><i class="fa-solid fa-box-open"></i></div>
                    <h3 class="promise-item-title">Fast & Insured<br>Delivery</h3>
                    <p class="promise-item-desc">Enjoy peace of mind with our fast, free, and fully insured express delivery straight to your doorstep.</p>
                </div>
            </div>
        </section>
'''

if "promise-section" not in html:
    # Insert before <footer
    html = html.replace('<footer class="site-footer">', promise_html + '\n        <footer class="site-footer">')
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)

