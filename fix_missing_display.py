import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

old_logic = """                        expanded_keywords = []
                        for kw in raw_keywords:
                            if kw in semantic_map:
                                if semantic_map[kw]: # If it maps to actual traits
                                    expanded_keywords.append(semantic_map[kw]) # Add the list of synonyms
                                # If it maps to [], we just drop it entirely (generic adjective)
                            else:
                                expanded_keywords.append([kw]) # Just the word itself
                                
                        for synonym_list in expanded_keywords:
                            # If ANY synonym in the list exists in the DB, it's valid!
                            found_valid = False
                            for syn in synonym_list:
                                # Multi-word synonyms like 'rose gold' need special checking
                                if ' ' in syn:
                                    if any(syn in text for text in global_words): # Wait, global_words is single words.
                                        pass # Handled below
                                
                                # Check if synonym exists in any product's full text
                                syn_exists = False
                                for p in products:
                                    pt = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
                                    if syn in pt:
                                        syn_exists = True
                                        break
                                if syn_exists:
                                    valid_keywords.append(syn)
                                    found_valid = True
                                    break # Only need one valid synonym per intent
                                    
                            if not found_valid:
                                # We couldn't find the word or any of its synonyms in the DB
                                missing_keywords.append(synonym_list[0])"""

new_logic = """                        expanded_keywords = []
                        for kw in raw_keywords:
                            if kw in semantic_map:
                                if semantic_map[kw]:
                                    expanded_keywords.append((kw, semantic_map[kw]))
                            else:
                                expanded_keywords.append((kw, [kw]))
                                
                        for original_word, synonym_list in expanded_keywords:
                            found_valid = False
                            for syn in synonym_list:
                                syn_exists = False
                                for p in products:
                                    pt = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
                                    if syn in pt:
                                        syn_exists = True
                                        break
                                if syn_exists:
                                    valid_keywords.append(syn)
                                    found_valid = True
                                    break
                                    
                            if not found_valid:
                                missing_keywords.append(original_word)"""

code = code.replace(old_logic, new_logic)
with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
