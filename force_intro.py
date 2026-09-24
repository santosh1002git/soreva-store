with open('app.js', 'r') as f:
    js = f.read()

# Remove the play only once check
js = js.replace("if (sessionStorage.getItem('soreva_intro_played') === 'true')", "if (false && sessionStorage.getItem('soreva_intro_played') === 'true')")

with open('app.js', 'w') as f:
    f.write(js)
