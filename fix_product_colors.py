import re

with open('product.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Fix colors for light theme
html = html.replace('color: rgba(251,248,245,0.6);', 'color: var(--text-muted);')
html = html.replace('color: var(--text-color);', 'color: var(--text-dark);')
html = html.replace('color: rgba(251,248,245,0.4);', 'color: var(--border-color);')
html = html.replace('color: rgba(251,248,245,0.7);', 'color: var(--text-muted);')
html = html.replace('color: rgba(251,248,245,0.5);', 'color: var(--text-muted);')
html = html.replace('color: rgba(251,248,245,0.85);', 'color: var(--text-dark);')
html = html.replace('color: rgba(251,248,245,0.8);', 'color: var(--text-dark);')
html = html.replace('background: #26201e;', 'background: #ffffff;')
html = html.replace('color:white;', 'color: var(--text-dark);')

# Add a section for extra details
details_html = r'''
                        <div style="margin-bottom: 30px;">
                            <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-light); margin-bottom: 12px;">Product Details</h4>
                            <ul id="pdpDetailsList" style="list-style: none; padding: 0; margin: 0; font-size: 0.95rem; color: var(--text-dark); line-height: 1.8;">
                                <!-- Injected by JS -->
                            </ul>
                        </div>
'''
html = html.replace('                        <div style="margin-bottom: 30px;">\n                            <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-light); margin-bottom: 12px;">Select Finish</h4>', details_html + '                        <div style="margin-bottom: 30px;">\n                            <h4 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-light); margin-bottom: 12px;">Select Finish</h4>')

with open('product.html', 'w', encoding='utf-8') as f:
    f.write(html)
