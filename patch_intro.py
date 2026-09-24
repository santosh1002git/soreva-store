with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

js = js.replace('if (sessionStorage.getItem(\'soreva_intro_played\'))', 'if (false && sessionStorage.getItem(\'soreva_intro_played\'))')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
