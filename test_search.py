import json

data = json.load(open('data/store-data.json'))
products = data.get('products', [])

def search(msg):
    msg_lower = msg.lower()
    stopwords = ['want', 'need', 'looking', 'show', 'some', 'the', 'for', 'can', 'you', 'please', 'give', 'me', 'find', 'have', 'any', 'that', 'with', 'like', 'this', 'and', 'are', 'color']
    keywords = [w for w in msg_lower.replace('?', '').replace('!', '').replace('.', '').replace(',', '').split() if len(w) > 2 and w not in stopwords]
    
    matches = []
    for p in products:
        if not p.get('active', True) or p.get('disabled', False):
            continue
            
        full_text = f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')} {p.get('plating', '')} {' '.join(p.get('availableFinishes', []))} {p.get('description', '')}".lower()
        
        matched_kws = 0
        bonus = 0
        for kw in keywords:
            if kw in full_text:
                matched_kws += 1
                if kw in f"{p.get('name', '')} {p.get('category', '')} {p.get('subCategory', '')}".lower():
                    bonus += 5
                else:
                    bonus += 1
                    
        if matched_kws > 0:
            score = (matched_kws * 100) + bonus
            matches.append((score, p))
            
    matches.sort(key=lambda x: x[0], reverse=True)
    
    print(f"--- Search: '{msg}' ---")
    if matches:
        for i in range(min(3, len(matches))):
            score, p = matches[i]
            print(f"Score: {score} | Name: {p.get('name')} | Cat: {p.get('category')} | SubCat: {p.get('subCategory')} | Desc snippet: {p.get('description', '')[:50]}")
    else:
        print("No matches")
    print()

search("I want a pink earring")
search("show me some green necklaces")
search("do you have rose gold rings")
search("bridal choker")
