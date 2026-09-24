import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

old_logic = """                else:
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
                            
                    if matches:"""

new_logic = """                else:
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
                                # Heavily weight title/category matches
                                if kw in search_text:
                                    score += 3
                                elif kw in desc_text:
                                    score += 1
                                    
                            if score > 0:
                                matches.append((score, p))
                                
                        if matches:"""

code = code.replace(old_logic, new_logic)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
