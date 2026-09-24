import json

data = json.load(open('data/store-data.json'))
products = data.get('products', [])

global_words = set()
for p in products:
    text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
    for w in text.split():
        global_words.add(w)

def search(msg):
    msg_lower = msg.lower()
    stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are', 'color']
    
    raw_keywords = [w for w in msg_lower.replace('?', '').replace('!', '').replace('.', '').replace(',', '').split() if len(w) > 2 and w not in stopwords]
    
    valid_keywords = []
    missing_keywords = []
    for kw in raw_keywords:
        if any(kw in gw for gw in global_words):
            valid_keywords.append(kw)
        else:
            missing_keywords.append(kw)
            
    if missing_keywords:
        print(f"--- Search: '{msg}' ---")
        print(f"I'm sorry, but we don't currently carry any pieces matching '{' '.join(missing_keywords)}'. Would you like to see our '{' '.join(valid_keywords)}' collection instead?")
        print()
        return

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
            matches.append(p)
            
    print(f"--- Search: '{msg}' ---")
    if matches:
        print(f"Found {len(matches)} exact matches!")
        for i in range(min(3, len(matches))):
            p = matches[i]
            print(f"- {p.get('name')} | Cat: {p.get('category')} | SubCat: {p.get('subCategory')}")
    else:
        print(f"I couldn't find any piece that is EXACTLY '{' '.join(valid_keywords)}'.")
    print()

search("I want a pink earring")
search("show me some green necklaces")
search("do you have rose gold rings")
search("bridal choker")
search("mangalsutra")
search("silver jhumka")
