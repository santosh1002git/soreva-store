with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add a function to append cache-buster to all links and onclicks
link_fix = '''
function preventLocalCaching() {
    // We are on localhost, so prevent aggressive caching on navigation
    const cacheBuster = "cb=" + new Date().getTime();
    
    // Update all a tags
    document.querySelectorAll('a').forEach(a => {
        if (a.href && a.href.includes('.html')) {
            if (a.href.includes('?')) {
                a.href = a.href + '&' + cacheBuster;
            } else {
                a.href = a.href + '?' + cacheBuster;
            }
        }
    });

    // Update all onclick window.location.href
    document.querySelectorAll('[onclick*="window.location.href"]').forEach(el => {
        let onclickAttr = el.getAttribute('onclick');
        if (onclickAttr.includes('.html')) {
            if (onclickAttr.includes('?')) {
                onclickAttr = onclickAttr.replace("'", "&" + cacheBuster + "'");
            } else {
                onclickAttr = onclickAttr.replace("'", "?" + cacheBuster + "'");
            }
            // Just overriding it with a click listener is safer
            const match = onclickAttr.match(/window\.location\.href='(.*?)'/);
            if (match && match[1]) {
                el.removeAttribute('onclick');
                el.addEventListener('click', () => {
                    let url = match[1];
                    url += (url.includes('?') ? '&' : '?') + cacheBuster;
                    window.location.href = url;
                });
            }
        }
    });
}
'''
js += '\n' + link_fix

# Call it in initApp
js = js.replace("if (typeof initProductPage === 'function')", "if (typeof preventLocalCaching === 'function') preventLocalCaching();\n    if (typeof initProductPage === 'function')")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
