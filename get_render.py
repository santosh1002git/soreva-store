import json

with open('app_js_history.json', 'r') as f:
    commits = json.load(f)

for c in commits:
    args = c.get('args', {})
    if 'ReplacementContent' in args and 'function renderProducts()' in args['ReplacementContent']:
        print(f"--- Step {c['step']} ---")
        lines = args['ReplacementContent'].split('\n')
        # Just print the card HTML part
        for i, l in enumerate(lines):
            if 'product-card' in l:
                for j in range(i, min(i+25, len(lines))):
                    print(lines[j])
                break
