import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_header = """            <div style="background: #000; color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; font-weight: bold; font-size: 1.2rem;">AI Concierge</h4>
                <button onclick="toggleChatbot()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; font-weight: bold;">X</button>
            </div>"""

new_header = """            <div style="background: #000; color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; font-weight: bold; font-size: 1.2rem;">AI Concierge</h4>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <button onclick="clearChatbotHistory()" aria-label="Clear Chat" title="Clear Chat History" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1rem; opacity: 0.8;"><i class="fa-solid fa-trash"></i></button>
                    <button onclick="toggleChatbot()" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 1.2rem; font-weight: bold;">X</button>
                </div>
            </div>"""

js = js.replace(old_header, new_header)

old_toggle = """    window.toggleChatbot = function() {"""

new_toggle = """    window.clearChatbotHistory = function() {
        sessionStorage.removeItem('soreva_chat_history');
        const messagesDiv = document.getElementById('chatbot-messages');
        messagesDiv.innerHTML = `
            <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                Hello! I am your AI jewelry assistant. How can I help you today?
            </div>
        `;
    };

    window.toggleChatbot = function() {"""

js = js.replace(old_toggle, new_toggle)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
