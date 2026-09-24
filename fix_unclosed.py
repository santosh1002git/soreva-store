import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# The current broken HTML looks like:
# <div class="btn-secondary" style="margin-top: 15px; width: 100%; padding: 8px 0; font-size: 0.85rem;" >Explore Category</div>
#                         </a>
# We need to insert </div> before </a>

html = re.sub(
    r'(Explore Category</div>)\s*(</a>)',
    r'\1\n                        </div>\n                    \2',
    html
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
