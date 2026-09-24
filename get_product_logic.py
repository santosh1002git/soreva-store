import json
with open('app_js_history.json', 'r') as f:
    commits = json.load(f)

for c in commits:
    args = c.get('args', {})
    if 'ReplacementContent' in args and 'window.location.search' in args['ReplacementContent'] and 'id' in args['ReplacementContent']:
        print(f"--- Step {c['step']} ---")
        lines = args['ReplacementContent'].split('\n')
        for l in lines:
            if 'product' in l.lower() or 'document.getElementById' in l:
                print(l)
