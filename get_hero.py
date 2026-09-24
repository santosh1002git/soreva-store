import json

with open('app_js_history.json', 'r') as f:
    commits = json.load(f)

for c in commits:
    args = c.get('args', {})
    if 'ReplacementContent' in args and 'function updateHeroUI' in args['ReplacementContent']:
        print(f"--- Step {c['step']} ---")
        print(args['ReplacementContent'])
