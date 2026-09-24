with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

import re

# Find openQuickView and inject the href update
fix = '''
    const finishPillsWrap = document.getElementById('modalFinishPills');
    
    // Update Full Details Link
    const fullDetailsBtn = document.getElementById('modalFullDetailsBtn');
    if (fullDetailsBtn) {
        fullDetailsBtn.href = `product.html?id=${product.id}`;
    }
'''

js = re.sub(r'const finishPillsWrap = document\.getElementById\(\'modalFinishPills\'\);', fix, js)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
