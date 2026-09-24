import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

old_logic = """                        valid_keywords = []
                        missing_keywords = []
                        for kw in raw_keywords:
                            if any(kw in gw for gw in global_words):
                                valid_keywords.append(kw)
                            else:
                                missing_keywords.append(kw)"""

new_logic = """                        # Semantic "Brain" - Maps user intent to catalog traits
                        semantic_map = {
                            "creative": ["statement", "designer", "unique", "art"],
                            "unique": ["statement", "designer", "exclusive"],
                            "simple": ["classic", "minimal", "everyday", "essential", "medium", "small"],
                            "elegant": ["classic", "minimal", "fine", "medium"],
                            "heavy": ["bridal", "traditional", "broad", "choker"],
                            "wedding": ["bridal", "traditional"],
                            "marriage": ["bridal", "traditional", "mangalsutra"],
                            "pink": ["rose gold"],
                            "green": ["emerald", "kundan"],
                            "red": ["ruby", "kundan"],
                            "black": ["oxidised", "black"],
                            "white": ["cz", "rhodium", "silver", "zirconia"],
                            "cheap": ["sale", "essential"],
                            "expensive": ["bridal", "premium"],
                            "beautiful": [], # Ignore generic adjectives
                            "pretty": [],
                            "gorgeous": [],
                            "nice": [],
                            "buy": []
                        }
                        
                        valid_keywords = []
                        missing_keywords = []
                        
                        # Expand raw keywords using the semantic brain
                        expanded_keywords = []
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

code = code.replace(old_logic, new_logic)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
