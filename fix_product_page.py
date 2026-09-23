import re

with open('catalog.html', 'r', encoding='utf-8') as f:
    html = f.read()

product_section = r'''</header>
    <main class="page-content">
        <!-- PRODUCT DETAILS SECTION -->
        <section class="product-page-section" style="padding: 120px 0 60px;">
            <div class="container">
                <div class="pdp-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start;">
                    
                    <!-- Left: Gallery -->
                    <div class="pdp-gallery" style="position: sticky; top: 100px;">
                        <img id="pdpMainImg" src="" style="width: 100%; border-radius: 12px; aspect-ratio: 4/5; object-fit: cover; background: #26201e; border: 1px solid var(--border-color);" alt="Product Image">
                        <div id="pdpThumbs" style="display: flex; gap: 12px; margin-top: 16px; overflow-x: auto; padding-bottom: 8px;">
                            <!-- Thumbs injected by JS -->
                        </div>
                    </div>
                    
                    <!-- Right: Info -->
                    <div class="pdp-info">
                        <nav style="font-size: 0.85rem; color: rgba(251,248,245,0.6); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
                            <a href="index.html" style="color: inherit; text-decoration: none;">Home</a> &nbsp;/&nbsp; 
                            <a id="pdpCatLink" href="#" style="color: inherit; text-decoration: none;">Category</a> &nbsp;/&nbsp; 
                            <span id="pdpSubCat">Subcategory</span>
                        </nav>
                        
                        <h1 id="pdpTitle" style="font-family: var(--font-heading); font-size: 2.5rem; color: var(--gold-accent); margin-bottom: 12px;">Product Title</h1>
                        
                        <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 24px;">
                            <div style="color: var(--gold-hover);">
                                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i>
                                <span id="pdpRating" style="color: var(--text-color); margin-left: 6px; font-weight: 600;">4.8</span>
                            </div>
                            <span style="color: rgba(251,248,245,0.4);">|</span>
                            <span style="color: rgba(251,248,245,0.7); font-size: 0.9rem;" id="pdpReviews">12 Reviews</span>
                        </div>
                        
                        <div style="margin-bottom: 30px;">
                            <span id="pdpPrice" style="font-size: 1.8rem; font-weight: 700; color: var(--text-color);">₹0</span>
                            <span id="pdpOriginalPrice" style="font-size: 1.2rem; text-decoration: line-through; color: rgba(251,248,245,0.5); margin-left: 12px;">₹0</span>
                            <p style="font-size: 0.85rem; color: var(--gold-badge); margin-top: 6px;"><i class="fa-solid fa-truck-fast"></i> Complimentary Insured Shipping in India</p>
                        </div>
                        
                        <p id="pdpDescription" style="font-size: 1.05rem; line-height: 1.7; color: rgba(251,248,245,0.85); margin-bottom: 36px;">Product description goes here.</p>
                        
                        <div style="margin-bottom: 30px;">
                            <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-light); margin-bottom: 12px;">Select Finish</h4>
                            <div id="pdpFinishOptions" style="display: flex; gap: 12px;">
                                <!-- Plating options injected by JS -->
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 16px; margin-bottom: 40px; align-items: center;">
                            <div style="display: flex; border: 1px solid var(--border-color); border-radius: 8px; height: 56px; width: 120px; justify-content: center; align-items: center; background: #26201e;">
                                <button onclick="let q=document.getElementById('pdpQty'); if(q.value>1) q.value--;" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer; width:36px;">-</button>
                                <input type="number" id="pdpQty" value="1" min="1" max="10" readonly style="width:40px; text-align:center; background:none; border:none; color:white; font-weight:bold; font-size:1.1rem;">
                                <button onclick="let q=document.getElementById('pdpQty'); if(q.value<10) q.value++;" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer; width:36px;">+</button>
                            </div>
                            <button id="pdpAddToCartBtn" class="btn-primary" style="flex: 1; height: 56px; font-size: 1.1rem; justify-content: center;">
                                <i class="fa-solid fa-bag-shopping"></i> Add to Bag
                            </button>
                        </div>

                        <div style="border-top: 1px solid var(--border-color); padding-top: 24px;">
                            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px; color: rgba(251,248,245,0.8);">
                                <i class="fa-solid fa-shield-halved" style="font-size: 1.2rem; color: var(--gold-accent); width: 24px;"></i>
                                <span>Lifetime Quality Guarantee</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px; color: rgba(251,248,245,0.8);">
                                <i class="fa-solid fa-box" style="font-size: 1.2rem; color: var(--gold-accent); width: 24px;"></i>
                                <span>Includes Signature Luxury Keepsake Box</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 16px; color: rgba(251,248,245,0.8);">
                                <i class="fa-solid fa-arrow-rotate-left" style="font-size: 1.2rem; color: var(--gold-accent); width: 24px;"></i>
                                <span>14-Day Hassle-Free Returns</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>
    <footer class="site-footer">'''

html = re.sub(r'</header>.*?<footer class="site-footer">', product_section, html, flags=re.DOTALL)

with open('product.html', 'w', encoding='utf-8') as f:
    f.write(html)
