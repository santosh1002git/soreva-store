import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

# I will replace the greeting block
old_logic = """                if not msg_lower:
                    reply = "How can I assist you with your jewelry selection today?"
                elif any(greet in msg_lower for greet in ['hello', 'hi', 'hey']):
                    reply = "Hello! I am the Sorèva Concierge. What kind of jewelry are you looking for?"
                else:"""

new_logic = """                if not msg_lower:
                    reply = "How can I assist you with your jewelry selection today?"
                elif msg_lower in ['hello', 'hi', 'hey', 'hello!', 'hi!', 'hey!']:
                    reply = "Hello! I am the Sorèva Concierge. What kind of jewelry are you looking for?"
                else:"""

code = code.replace(old_logic, new_logic)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
