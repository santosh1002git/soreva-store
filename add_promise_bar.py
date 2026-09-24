import re

with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

bar_css = '''
.promise-bottom-bar {
    background-color: #7b6357;
    color: #f4eee7;
    padding: 15px 0;
    margin-top: 80px;
    margin-bottom: -100px; /* Offset the section's bottom padding */
    display: flex;
    justify-content: center;
    gap: 40px;
    font-size: 0.75rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 600;
    flex-wrap: wrap;
}
.promise-bottom-bar span {
    display: flex;
    align-items: center;
    gap: 10px;
}
.promise-bottom-bar span i {
    font-size: 0.5rem;
}
'''
if "promise-bottom-bar" not in css:
    css += '\n' + bar_css
    with open('styles.css', 'w', encoding='utf-8') as f:
        f.write(css)

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

bar_html = '''
            <div class="promise-bottom-bar">
                <span><i class="fa-solid fa-diamond"></i> Premium Craftsmanship</span>
                <span><i class="fa-solid fa-diamond"></i> Skin Friendly</span>
                <span><i class="fa-solid fa-diamond"></i> Quality You Can Trust</span>
                <span><i class="fa-solid fa-diamond"></i> Timeless Elegance</span>
                <span><i class="fa-solid fa-diamond"></i> Made To Be Treasured</span>
            </div>
'''

if "promise-bottom-bar" not in html:
    html = html.replace('        </section>\n        <footer class="site-footer">', bar_html + '        </section>\n        <footer class="site-footer">')
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
