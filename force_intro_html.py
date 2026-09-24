with open('index.html', 'r') as f:
    html = f.read()

html = html.replace("if (sessionStorage.getItem('soreva_intro_played') === 'true')", "if (false && sessionStorage.getItem('soreva_intro_played') === 'true')")

with open('index.html', 'w') as f:
    f.write(html)
