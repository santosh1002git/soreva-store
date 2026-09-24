with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

script = '''
<script>
window.addEventListener('error', function(e) {
    const err = document.createElement('div');
    err.style.position = 'fixed';
    err.style.top = '0';
    err.style.left = '0';
    err.style.zIndex = '9999999';
    err.style.background = 'red';
    err.style.color = 'white';
    err.style.padding = '20px';
    err.style.fontSize = '20px';
    err.innerHTML = 'JS ERROR: ' + e.message + ' at ' + e.filename + ':' + e.lineno;
    document.body.appendChild(err);
});
</script>
</head>
'''

html = html.replace('</head>', script)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
