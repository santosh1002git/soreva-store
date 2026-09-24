with open('app.js', 'r') as f:
    js = f.read()
idx = js.find('function renderProducts()')
if idx != -1:
    print(js[idx:idx+1500])
