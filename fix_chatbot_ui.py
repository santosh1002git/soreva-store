import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

chatbot_html = r'''
    <!-- CHATBOT WIDGET -->
    <div id="chatbot-container" style="position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; font-family: var(--font-body);">
        
        <!-- Chat Window -->
        <div id="chatbot-window" style="display: none; width: 320px; height: 420px; background: #fff; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); flex-direction: column; overflow: hidden; margin-bottom: 16px; border: 1px solid var(--border-color);">
            
            <div style="background: var(--theme-color); color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-gem" style="font-size: 1.2rem; color: #d4af37;"></i>
                    <h4 style="margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 1.1rem; letter-spacing: 0.5px;">Sorèva Concierge</h4>
                </div>
                <button onclick="toggleChatbot()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.1rem;"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <div id="chatbot-messages" style="flex: 1; padding: 16px; overflow-y: auto; background: var(--bg-cream); display: flex; flex-direction: column; gap: 12px;">
                <div style="align-self: flex-start; background: #fff; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); max-width: 85%; font-size: 0.9rem; color: var(--text-dark); border: 1px solid var(--border-color);">
                    Hello! Welcome to Sorèva. I'm your AI jewelry assistant. Are you looking for anything specific today?
                </div>
            </div>
            
            <div style="padding: 12px; background: #fff; border-top: 1px solid var(--border-color); display: flex; gap: 8px;">
                <input type="text" id="chatbot-input" placeholder="Ask about our pieces..." style="flex: 1; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 20px; font-size: 0.9rem; outline: none; background: var(--bg-cream);" onkeypress="if(event.key === 'Enter') sendChatMessage()">
                <button onclick="sendChatMessage()" style="background: var(--theme-color); color: #fff; border: none; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-paper-plane" style="font-size: 0.9rem;"></i></button>
            </div>
        </div>

        <!-- Floating Button -->
        <button id="chatbot-toggle-btn" onclick="toggleChatbot()" style="width: 60px; height: 60px; border-radius: 50%; background: var(--theme-color); color: #fff; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; transition: transform 0.2s ease;">
            <i class="fa-regular fa-comment-dots"></i>
        </button>

    </div>

    <script>
        function toggleChatbot() {
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
        }
        
        async function sendChatMessage() {
            const input = document.getElementById('chatbot-input');
            const msg = input.value.trim();
            if (!msg) return;
            
            const messagesDiv = document.getElementById('chatbot-messages');
            
            // Add user message
            messagesDiv.innerHTML += `
                <div style="align-self: flex-end; background: var(--theme-color); color: #fff; padding: 10px 14px; border-radius: 12px; border-bottom-right-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); max-width: 85%; font-size: 0.9rem;">
                    ${msg}
                </div>
            `;
            input.value = '';
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Add typing indicator
            const typingId = 'typing-' + Date.now();
            messagesDiv.innerHTML += `
                <div id="${typingId}" style="align-self: flex-start; background: #fff; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); max-width: 85%; font-size: 0.9rem; color: var(--text-muted); border: 1px solid var(--border-color); display: flex; gap: 4px; align-items: center;">
                    <span style="width: 6px; height: 6px; background: #ccc; border-radius: 50%; display: inline-block; animation: pulse 1s infinite;"></span>
                    <span style="width: 6px; height: 6px; background: #ccc; border-radius: 50%; display: inline-block; animation: pulse 1s infinite 0.2s;"></span>
                    <span style="width: 6px; height: 6px; background: #ccc; border-radius: 50%; display: inline-block; animation: pulse 1s infinite 0.4s;"></span>
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Send to backend
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: msg })
                });
                const data = await res.json();
                
                document.getElementById(typingId).remove();
                
                messagesDiv.innerHTML += `
                    <div style="align-self: flex-start; background: #fff; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); max-width: 85%; font-size: 0.9rem; color: var(--text-dark); border: 1px solid var(--border-color); line-height: 1.4;">
                        ${data.reply}
                    </div>
                `;
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            } catch (e) {
                document.getElementById(typingId).remove();
                messagesDiv.innerHTML += `
                    <div style="align-self: flex-start; background: #fff; padding: 10px 14px; border-radius: 12px; border-bottom-left-radius: 4px; border: 1px solid red; color: red; max-width: 85%; font-size: 0.9rem;">
                        Sorry, I lost connection to the server.
                    </div>
                `;
            }
        }
    </script>
    <style>
        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.5); opacity: 1; }
            100% { transform: scale(1); opacity: 0.5; }
        }
    </style>
'''

html = html.replace('</body>', chatbot_html + '\n</body>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('catalog.html', 'r', encoding='utf-8') as f:
    cat_html = f.read()

cat_html = cat_html.replace('</body>', chatbot_html + '\n</body>')

with open('catalog.html', 'w', encoding='utf-8') as f:
    f.write(cat_html)

with open('product.html', 'r', encoding='utf-8') as f:
    prod_html = f.read()

prod_html = prod_html.replace('</body>', chatbot_html + '\n</body>')

with open('product.html', 'w', encoding='utf-8') as f:
    f.write(prod_html)
