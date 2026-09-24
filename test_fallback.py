import json
def get_reply(user_msg):
    data = json.load(open('data/store-data.json'))
    products = data.get('products', [])
    
    msg_lower = user_msg.lower()
    
    # Simple keyword extraction
    keywords = [word for word in msg_lower.split() if len(word) > 2]
    
    matches = []
    for p in products:
        score = 0
        search_text = (p.get('name', '') + ' ' + p.get('category', '') + ' ' + p.get('description', '')).lower()
        for kw in keywords:
            if kw in search_text:
                score += 1
        if score > 0:
            matches.append((score, p))
            
    matches.sort(key=lambda x: x[0], reverse=True)
    
    if matches:
        top_product = matches[0][1]
        link = f"<a href='/product.html?id={top_product['id']}' style='color: var(--gold-accent); text-decoration: underline;'>{top_product['name']}</a>"
        return f"I found something perfect for you! Check out the {link} for ₹{top_product.get('priceINR')}."
    else:
        return "I'm sorry, I couldn't find any jewelry matching your request. Could you try searching for something else, like 'choker' or 'jhumkas'?"

print(get_reply("I want a green necklace"))
