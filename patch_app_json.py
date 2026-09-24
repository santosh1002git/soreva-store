with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Fix the storeData bug
js = js.replace('storeData.slice', 'storeData.products.slice')
js = js.replace('storeData.find', 'storeData.products.find')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
