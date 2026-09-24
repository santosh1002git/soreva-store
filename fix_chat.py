import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

old_else = """            else:
                # Simulated fallback for local testing without API key
                msg_lower = user_msg.lower()
                reply = "I am the Sorèva AI Concierge powered by Llama 3! I am currently running in simulated mode. To fully activate my real brain on Vercel, simply add your GROQ_API_KEY to your Vercel Environment Variables!"
                
                if 'necklace' in msg_lower:
                    reply = "We have a beautiful collection of Bridal and Classic necklaces! They feature AAA+ Cubic Zirconia."
                elif 'stock' in msg_lower or 'available' in msg_lower:
                    reply = "I can check live inventory for you! Please provide the SKU."
                elif 'price' in msg_lower or 'cost' in msg_lower:
                    reply = "Our pieces range from accessible luxury to premium bridal sets. You can sort by price on our catalog!"

            self._send_json({"reply": reply})"""

new_else = """            else:
                # Local Search/Recommendation engine
                data = get_stored_data() or {}
                products = data.get('products', [])
                msg_lower = user_msg.lower()
                
                if not msg_lower:
                    reply = "How can I assist you with your jewelry selection today?"
                elif any(greet in msg_lower for greet in ['hello', 'hi', 'hey']):
                    reply = "Hello! I am the Sorèva Concierge. What kind of jewelry are you looking for?"
                else:
                    keywords = [w for w in msg_lower.replace('?', '').replace('!', '').replace('.', '').split() if len(w) > 2 and w not in ['want', 'need', 'looking', 'show', 'some', 'the', 'for']]
                    
                    matches = []
                    for p in products:
                        if not p.get('active', True) or p.get('disabled', False):
                            continue
                        score = 0
                        search_text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('description', '')}".lower()
                        for kw in keywords:
                            if kw in search_text:
                                score += 1
                        if score > 0:
                            matches.append((score, p))
                            
                    if matches:
                        matches.sort(key=lambda x: x[0], reverse=True)
                        top_product = matches[0][1]
                        link = f"<a href='product.html?id={top_product['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{top_product.get('name', 'This piece')}</a>"
                        reply = f"I found something perfect for you! Check out {link} for ₹{top_product.get('priceINR')}. It features our signature AAA+ Cubic Zirconia."
                        
                        # Add a second recommendation if available
                        if len(matches) > 1 and matches[1][0] == matches[0][0]:
                            alt = matches[1][1]
                            alt_link = f"<a href='product.html?id={alt['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{alt.get('name', 'This piece')}</a>"
                            reply += f" We also have {alt_link} available."
                    else:
                        reply = "I'm sorry, I couldn't find any specific pieces matching that description right now. Could you try searching for something broader like 'choker', 'jhumkas', or 'tennis bracelet'?"

            self._send_json({"reply": reply})"""

code = code.replace(old_else, new_else)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
