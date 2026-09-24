import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

# First we need to build the global words set in the else block
old_logic = """                    stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are']
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
                            reply = "I'm sorry, I couldn't find any specific pieces matching that description right now. Could you try searching for something broader like 'choker', 'jhumkas', or 'tennis bracelet'?"""

new_logic = """                    stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are', 'color']
                    raw_keywords = [w for w in msg_lower.replace('?', '').replace('!', '').replace('.', '').replace(',', '').split() if len(w) > 2 and w not in stopwords]
                    
                    if not raw_keywords:
                         reply = "I'm not quite sure what you're looking for. Try mentioning a style like 'choker', 'jhumkas', or 'tennis bracelet'!"
                    else:
                        global_words = set()
                        for p in products:
                            if not p.get('active', True) or p.get('disabled', False):
                                continue
                            text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
                            for w in text.split():
                                global_words.add(w)
                                
                        valid_keywords = []
                        missing_keywords = []
                        for kw in raw_keywords:
                            if any(kw in gw for gw in global_words):
                                valid_keywords.append(kw)
                            else:
                                missing_keywords.append(kw)
                                
                        if missing_keywords:
                            if valid_keywords:
                                reply = f"I'm sorry, but we don't currently carry any pieces with '{' '.join(missing_keywords)}'. Would you like to explore our <a href='catalog.html?cat=all' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{' '.join(valid_keywords)} collection</a> instead?"
                            else:
                                reply = f"I'm sorry, but we don't currently carry any pieces matching '{' '.join(missing_keywords)}' in our catalog. Could you try a different style?"
                        else:
                            matches = []
                            for p in products:
                                if not p.get('active', True) or p.get('disabled', False):
                                    continue
                                full_text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
                                
                                all_match = True
                                for kw in valid_keywords:
                                    if kw not in full_text:
                                        all_match = False
                                        break
                                
                                if all_match:
                                    # Calculate a relevance score for sorting ties
                                    score = 0
                                    title_text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')}".lower()
                                    for kw in valid_keywords:
                                        if kw in title_text:
                                            score += 5
                                        else:
                                            score += 1
                                    matches.append((score, p))
                            
                            if matches:
                                matches.sort(key=lambda x: x[0], reverse=True)
                                top_product = matches[0][1]
                                link = f"<a href='product.html?id={top_product['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{top_product.get('name', 'This piece')}</a>"
                                reply = f"I found exactly what you're looking for! Check out {link} for ₹{top_product.get('priceINR')}."
                                
                                if len(matches) > 1:
                                    alt = matches[1][1]
                                    alt_link = f"<a href='product.html?id={alt['id']}' style='color: #c5a059; font-weight: bold; text-decoration: underline;'>{alt.get('name', 'This piece')}</a>"
                                    reply += f" We also have {alt_link} available."
                            else:
                                reply = f"I couldn't find any piece that perfectly matches all your criteria ({' and '.join(valid_keywords)}). Try broadening your search!"
"""

code = code.replace(old_logic, new_logic)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
