with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace saveCart(); with localStorage.setItem('sorevaCart', JSON.stringify(cart));
js = js.replace('saveCart();', "localStorage.setItem('sorevaCart', JSON.stringify(cart));")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
