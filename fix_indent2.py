import re

with open('server.py', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

start = -1
end = -1
for i, line in enumerate(lines):
    if "else:" in line and "Local Search/Recommendation engine" in lines[i+1]:
        start = i
    if "self._send_json" in line and start != -1 and end == -1:
        end = i

if start != -1 and end != -1:
    new_block = """            else:
                # Local Search/Recommendation engine
                data = get_stored_data() or {}
                products = data.get('products', [])
                msg_lower = user_msg.lower()
                
                if not msg_lower:
                    reply = "How can I assist you with your jewelry selection today?"
                elif msg_lower in ['hello', 'hi', 'hey', 'hello!', 'hi!', 'hey!']:
                    reply = "Hello! I am the Sorèva Concierge. What kind of jewelry are you looking for?"
                else:
                    stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are']
                    keywords = [w for w in msg_lower.replace('?', '').replace('!', '').replace('.', '').replace(',', '').split() if len(w) > 2 and w not in stopwords]
                    
                    matches = []
                    if not keywords:
                         reply = "I'm not quite sure what you're looking for. Try mentioning a style like 'choker', 'jhumkas', or 'green necklace'!"
                    else:
                        for p in products:
                            if not p.get('active', True) or p.get('disabled', False):
                                continue
                            score = 0
                            search_text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')}".lower()
                            desc_text = p.get('description', '').lower()
                            
                            for kw in keywords:
                                if kw in search_text:
                                    score += 3
                                elif kw in desc_text:
                                    score += 1
                                    
                            if score > 0:
                                matches.append((score, p))
                                
                        if matches:
                            matches.sort(key=lambda x: x[0], reverse=True)
                            top_product = matches[0][1]
                            link = f"<a href='product.html?id={top_product['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{top_product.get('name', 'This piece')}</a>"
                            reply = f"I found something perfect for you! Check out {link} for ₹{top_product.get('priceINR')}. It features our signature AAA+ Cubic Zirconia."
                            
                            if len(matches) > 1 and matches[1][0] == matches[0][0]:
                                alt = matches[1][1]
                                alt_link = f"<a href='product.html?id={alt['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{alt.get('name', 'This piece')}</a>"
                                reply += f" We also have {alt_link} available."
                        else:
                            reply = "I'm sorry, I couldn't find any specific pieces matching that description right now. Could you try searching for something broader like 'choker', 'jhumkas', or 'tennis bracelet'?"
"""
    lines[start:end] = new_block.split('\n')
    
    with open('server.py', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
