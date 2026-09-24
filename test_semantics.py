import json

data = json.load(open('data/store-data.json'))
products = data.get('products', [])

def search(msg):
    msg_lower = msg.lower()
    stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are', 'color']
    raw_keywords = [w for w in msg_lower.replace('?', '').replace('!', '').replace('.', '').replace(',', '').split() if len(w) > 2 and w not in stopwords]
    
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
    
    expanded_keywords = []
    for kw in raw_keywords:
        if kw in semantic_map:
            if semantic_map[kw]: 
                expanded_keywords.append(semantic_map[kw]) 
        else:
            expanded_keywords.append([kw]) 
            
    for synonym_list in expanded_keywords:
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
            missing_keywords.append(synonym_list[0])

    print(f"--- Search: '{msg}' ---")
    print("Valid:", valid_keywords)
    print("Missing:", missing_keywords)

search("I want a creative ring buy")
search("do you have a pink necklace")
search("show me beautiful heavy earrings")
