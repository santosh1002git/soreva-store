import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update initChatbot to load history from sessionStorage
old_init = """            <div id="chatbot-messages" style="flex: 1; padding: 16px; overflow-y: auto; background: #f9f9f9; display: flex; flex-direction: column; gap: 12px;">
                <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                    Hello! I am your AI jewelry assistant. How can I help you today?
                </div>
            </div>"""

new_init = """            <div id="chatbot-messages" style="flex: 1; padding: 16px; overflow-y: auto; background: #f9f9f9; display: flex; flex-direction: column; gap: 12px;">
                <!-- History loaded here -->
            </div>"""

js = js.replace(old_init, new_init)

old_body_insert = """    document.body.insertAdjacentHTML('beforeend', html);
    
    window.toggleChatbot = function() {"""

new_body_insert = """    document.body.insertAdjacentHTML('beforeend', html);
    
    const messagesDiv = document.getElementById('chatbot-messages');
    const savedHistory = sessionStorage.getItem('soreva_chat_history');
    if (savedHistory) {
        messagesDiv.innerHTML = savedHistory;
        setTimeout(() => { messagesDiv.scrollTop = messagesDiv.scrollHeight; }, 100);
    } else {
        messagesDiv.innerHTML = `
            <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                Hello! I am your AI jewelry assistant. How can I help you today?
            </div>
        `;
    }
    
    window.toggleChatbot = function() {"""

js = js.replace(old_body_insert, new_body_insert)

# 2. Update sendChatMessage to save history
old_send = """            messagesDiv.innerHTML += `
                <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                    ${data.reply}
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        } catch (e) {"""

new_send = """            messagesDiv.innerHTML += `
                <div style="align-self: flex-start; background: #e0e0e0; padding: 12px; border-radius: 12px; border-bottom-left-radius: 4px; color: #000; font-weight: 500; font-size: 0.95rem; border: 1px solid #ccc; max-width: 85%;">
                    ${data.reply}
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            sessionStorage.setItem('soreva_chat_history', messagesDiv.innerHTML);
        } catch (e) {"""

js = js.replace(old_send, new_send)

# 3. Save user message to history too
old_user_msg = """        messagesDiv.innerHTML += `
            <div style="align-self: flex-end; background: #000; color: #fff; padding: 12px; border-radius: 12px; border-bottom-right-radius: 4px; font-weight: 500; font-size: 0.95rem; max-width: 85%;">
                ${msg}
            </div>
        `;
        input.value = '';"""

new_user_msg = """        messagesDiv.innerHTML += `
            <div style="align-self: flex-end; background: #000; color: #fff; padding: 12px; border-radius: 12px; border-bottom-right-radius: 4px; font-weight: 500; font-size: 0.95rem; max-width: 85%;">
                ${msg}
            </div>
        `;
        sessionStorage.setItem('soreva_chat_history', messagesDiv.innerHTML);
        input.value = '';"""

js = js.replace(old_user_msg, new_user_msg)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
