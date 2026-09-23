let storeData = [];
let cart = JSON.parse(localStorage.getItem('sorevaCart') || '[]');

async function loadStoreDataAndInit() {
    try {
        const res = await fetch('/data/store-data.json');
        storeData = await res.json();
        if(document.getElementById('catalogGrid')) renderCatalog();
        if(document.getElementById('pdpImage')) initProductPage();
        if(document.getElementById('featuredGrid')) renderFeatured();
        updateCartUI();
    } catch (e) {
        console.error('Failed to load store data', e);
    }
}

function formatPrice(amt) { return '₹' + amt.toLocaleString('en-IN'); }

function renderFeatured() {
    const grid = document.getElementById('featuredGrid');
    if(!grid) return;
    grid.innerHTML = storeData.slice(0, 8).map(p => `
        <div class="product-card" onclick="window.location.href='product.html?id=${p.sku}'">
            <img src="${p.imageUrls[0]}" alt="${p.name}" style="width:100%; aspect-ratio:3/4; object-fit:cover;">
            <div style="padding:10px;">
                <h3>${p.name}</h3>
                <p>${formatPrice(p.priceINR)}</p>
            </div>
        </div>
    `).join('');
}

function renderCatalog() {
    const grid = document.getElementById('catalogGrid');
    if(!grid) return;
    grid.innerHTML = storeData.slice(0, 24).map(p => `
        <div class="product-card" style="cursor:pointer;" onclick="window.location.href='product.html?id=${p.sku}'">
            <img src="${p.imageUrls[0]}" alt="${p.name}" style="width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:8px;">
            <div style="padding:15px 5px;">
                <h3 style="font-size:0.9rem; margin:0 0 5px 0; color:var(--text-dark);">${p.name}</h3>
                <p style="margin:0; font-weight:bold; color:var(--text-dark);">${formatPrice(p.priceINR)}</p>
            </div>
        </div>
    `).join('');
}

function initProductPage() {
    const params = new URLSearchParams(window.location.search);
    const sku = params.get('id');
    const p = storeData.find(x => x.sku === sku);
    if(!p) return;
    
    document.getElementById('pdpImage').src = p.imageUrls[0];
    document.getElementById('pdpTitle').textContent = p.name;
    document.getElementById('pdpPrice').textContent = formatPrice(p.priceINR);
    
    // We removed finish options, so just the add to cart button works!
    const btn = document.getElementById('btnAddToCart');
    if(btn) {
        btn.onclick = () => {
            addToCart(p.sku);
        };
    }
    
    // Fallback accordion for product details
    const container = document.getElementById('pdpMoreDetailsContainer');
    if(container) {
        container.innerHTML = `
            <details style="margin-top:20px; border-top:1px solid #ccc; padding-top:10px;">
                <summary style="cursor:pointer; font-weight:bold; text-transform:uppercase;">More Details</summary>
                <div style="padding: 10px 0; font-size:0.9rem; line-height:1.6;">
                    <p>Electroplating is done with generous amount of Gold and Rhodium.</p>
                </div>
            </details>
        `;
    }
}

function updateCartUI() {
    const count = cart.reduce((acc, i) => acc + i.quantity, 0);
    const counters = document.querySelectorAll('.cart-count, #cartCount');
    counters.forEach(c => c.textContent = count);
}

function addToCart(sku) {
    const prod = storeData.find(p => p.sku === sku);
    if(!prod) return;
    const existing = cart.find(c => c.sku === sku);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({...prod, quantity: 1});
    }
    localStorage.setItem('sorevaCart', JSON.stringify(cart));
    updateCartUI();
    alert('Added to cart!');
}

function openCartDrawer() { alert("Cart drawer functionality is currently simplified in v1.0. Cart items: " + cart.length); }
function closeCartDrawer() {}
function initCartDrawer() {}

function initNavigation() {}
function initFilters() {}
function initSearch() {}
function initQuickView() {}
function updateWishlistUI() {}
function initAnnouncementTicker() {}
function initCurrencySwitcher() {}
function initPatreonHero() {}

document.addEventListener('DOMContentLoaded', () => {
    loadStoreDataAndInit();
});


// ==========================================
// CHATBOT WIDGET INJECTION
// ==========================================
function initChatbot() {
    if (document.getElementById('chatbot-container')) return;
    
    const html = `
    <div id="chatbot-container" style="position: fixed; bottom: 30px; right: 30px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; font-family: sans-serif;">
        <div id="chatbot-window" style="display: none; width: 340px; height: 450px; background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); flex-direction: column; overflow: hidden; margin-bottom: 20px; border: 2px solid #000;">
            <div style="background: #000; color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; font-weight: bold; font-size: 1.2rem;">AI Concierge</h4>
                <button onclick="toggleChatbot()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; font-weight: bold;">X</button>
            </div>
            <div id="chatbot-messages" style="flex: 1; padding: 16px; overflow-y: auto; background: #f9f9f9; display: flex; flex-direction: column; gap: 12px;">
                <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                    Hello! I am your AI jewelry assistant. How can I help you today?
                </div>
            </div>
            <div style="padding: 12px; background: #fff; border-top: 2px solid #000; display: flex; gap: 8px;">
                <input type="text" id="chatbot-input" placeholder="Type your message..." style="flex: 1; padding: 12px; border: 2px solid #000; border-radius: 8px; font-size: 1rem; color: #000; background: #fff;" onkeypress="if(event.key === 'Enter') sendChatMessage()">
                <button onclick="sendChatMessage()" style="background: #000; color: #fff; border: none; padding: 0 16px; border-radius: 8px; cursor: pointer; font-weight: bold;">SEND</button>
            </div>
        </div>
        <button id="chatbot-toggle-btn" onclick="toggleChatbot()" style="width: 70px; height: 70px; border-radius: 50%; background: #000; color: #fff; border: 3px solid #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: bold; transition: transform 0.2s ease;">
            CHAT
        </button>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    window.toggleChatbot = function() {
        const win = document.getElementById('chatbot-window');
        const btn = document.getElementById('chatbot-toggle-btn');
        if (win.style.display === 'none') {
            win.style.display = 'flex';
            btn.style.transform = 'scale(0)';
            setTimeout(() => document.getElementById('chatbot-input').focus(), 100);
        } else {
            win.style.display = 'none';
            btn.style.transform = 'scale(1)';
        }
    };
    
    window.sendChatMessage = async function() {
        const input = document.getElementById('chatbot-input');
        const msg = input.value.trim();
        if (!msg) return;
        
        const messagesDiv = document.getElementById('chatbot-messages');
        messagesDiv.innerHTML += `
            <div style="align-self: flex-end; background: #000; color: #fff; padding: 12px; border-radius: 12px; border-bottom-right-radius: 4px; font-weight: 500; font-size: 0.95rem; max-width: 85%;">
                ${msg}
            </div>
        `;
        input.value = '';
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        const typingId = 'typing-' + Date.now();
        messagesDiv.innerHTML += `
            <div id="${typingId}" style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; max-width: 85%;">
                Thinking...
            </div>
        `;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            const data = await res.json();
            document.getElementById(typingId).remove();
            messagesDiv.innerHTML += `
                <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                    ${data.reply}
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        } catch (e) {
            document.getElementById(typingId).remove();
            messagesDiv.innerHTML += `
                <div style="align-self: flex-start; background: #ffebee; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #d32f2f; font-weight: bold; font-size: 0.95rem; max-width: 85%;">
                    Network Error.
                </div>
            `;
        }
    };
}

document.addEventListener('DOMContentLoaded', initChatbot);
