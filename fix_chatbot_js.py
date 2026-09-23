import re

# Remove the previously injected HTML from files
for file in ['index.html', 'catalog.html', 'product.html']:
    with open(file, 'r', encoding='utf-8') as f:
        html = f.read()
    html = re.sub(r'<!-- CHATBOT WIDGET -->.*?</body>', '</body>', html, flags=re.DOTALL)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(html)

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

chatbot_injection = r'''
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
'''

if 'function initChatbot()' not in app_js:
    app_js += '\n' + chatbot_injection

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)
