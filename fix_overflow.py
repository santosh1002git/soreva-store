import re

with open('styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Replace overflow-x: auto with overflow: visible in header-category-bar
css = css.replace('.header-category-bar {\n    background-color: var(--theme-color);\n    color: var(--text-color);\n    padding: 0 24px;\n    overflow-x: auto;\n    scrollbar-width: none;\n}', 
                  '.header-category-bar {\n    background-color: var(--theme-color);\n    color: var(--text-color);\n    padding: 0 24px;\n    overflow: visible;\n}')

with open('styles.css', 'w', encoding='utf-8') as f:
    f.write(css)
