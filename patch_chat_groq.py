import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the chat endpoint with Groq integration
old_chat = r'''
        if parsed.path == '/api/chat':
            user_msg = payload.get('message', '').lower()
            
            # This is a placeholder for the actual LLM integration (Gemma 3 / Llama 3)
            # We will return a simulated intelligent response.
            reply = "I am the Sorèva AI Concierge powered by an intelligent conversational model! To fully activate my brain using Llama-3 or Gemma, we just need to plug in a provider API key in the backend. Would you like to provide an API key, or keep me as a simulated assistant for now?"
            
            if 'necklace' in user_msg:
                reply = "We have a beautiful collection of Bridal and Classic necklaces! Would you like me to filter the catalog for you?"
            elif 'stock' in user_msg or 'available' in user_msg:
                reply = "I can check live inventory for you! Please provide the SKU or the name of the piece."
            elif 'price' in user_msg or 'cost' in user_msg:
                reply = "Our pieces range from accessible luxury to premium bridal sets. You can sort by price on our catalog page!"
            
            self._send_json({"reply": reply})
            return
'''

new_chat = r'''
        if parsed.path == '/api/chat':
            user_msg = payload.get('message', '').strip()
            
            # Use Groq API if key is present in environment (e.g. Vercel)
            import os, urllib.request, urllib.error
            groq_key = os.environ.get('GROQ_API_KEY')
            
            if groq_key:
                try:
                    req = urllib.request.Request('https://api.groq.com/openai/v1/chat/completions', headers={
                        'Authorization': f'Bearer {groq_key}',
                        'Content-Type': 'application/json'
                    }, data=json.dumps({
                        "model": "llama3-8b-8192",
                        "messages": [
                            {"role": "system", "content": "You are the Sorèva AI Concierge. You are a polite, luxurious jewelry assistant for the Sorèva brand. Keep your answers extremely concise (1-2 sentences max). Answer questions about necklaces, earrings, rings, and jewelry styling."},
                            {"role": "user", "content": user_msg}
                        ]
                    }).encode('utf-8'))
                    resp = urllib.request.urlopen(req, timeout=10)
                    data = json.loads(resp.read().decode('utf-8'))
                    reply = data['choices'][0]['message']['content']
                except Exception as e:
                    reply = f"Sorry, I am experiencing temporary network interference with my AI brain. ({e})"
            else:
                # Simulated fallback for local testing without API key
                msg_lower = user_msg.lower()
                reply = "I am the Sorèva AI Concierge powered by Llama 3! I am currently running in simulated mode. To fully activate my real brain on Vercel, simply add your GROQ_API_KEY to your Vercel Environment Variables!"
                
                if 'necklace' in msg_lower:
                    reply = "We have a beautiful collection of Bridal and Classic necklaces! They feature AAA+ Cubic Zirconia."
                elif 'stock' in msg_lower or 'available' in msg_lower:
                    reply = "I can check live inventory for you! Please provide the SKU."
                elif 'price' in msg_lower or 'cost' in msg_lower:
                    reply = "Our pieces range from accessible luxury to premium bridal sets. You can sort by price on our catalog!"

            self._send_json({"reply": reply})
            return
'''

code = code.replace(old_chat.strip(), new_chat.strip())

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
