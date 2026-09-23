import re

with open('catalog.html', 'r', encoding='utf-8') as f:
    html = f.read()

replacement = r'''</header>

    <main class="page-content">
        <section class="products-section" id="products-catalog" style="padding-top: 120px; padding-bottom: 80px;">
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">The <em>Catalog</em></h2>
                    <p class="section-desc">Filter and explore our meticulously handcrafted luxury pieces.</p>
                </div>

                <div class="filter-bar">
                    <div class="filter-tabs">
                        <button class="filter-tab active" data-category="all">All Designs</button>
                        <button class="filter-tab" data-category="necklace">Necklace</button>
                        <button class="filter-tab" data-category="earrings">Earrings</button>
                        <button class="filter-tab" data-category="rings">Finger Rings</button>
                        <button class="filter-tab" data-category="pendants">Pendants</button>
                        <button class="filter-tab" data-category="bracelets">Wristwear</button>
                    </div>

                    <div class="filter-extra-controls">
                        <select class="plating-select" id="platingFilter" aria-label="Filter by Plating">
                            <option value="all">All Finishes</option>
                            <option value="gold">18K Gold Plated</option>
                            <option value="silver">Rhodium Silver</option>
                            <option value="rosegold">Rose Gold Plated</option>
                        </select>

                        <select class="sort-select" id="sortBy" aria-label="Sort products">
                            <option value="featured">Featured</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="rating">Highest Rated</option>
                        </select>
                    </div>
                </div>

                <div class="product-grid" id="productsGrid">
                    <!-- Injected by app.js -->
                </div>
            </div>
        </section>
    </main>

    <footer class="site-footer">'''

html = re.sub(r'</header>.*?<footer class="site-footer">', replacement, html, flags=re.DOTALL)

with open('catalog.html', 'w', encoding='utf-8') as f:
    f.write(html)
