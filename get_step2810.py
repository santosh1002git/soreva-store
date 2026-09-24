import json

with open('app_js_history.json', 'r') as f:
    commits = json.load(f)

for c in commits:
    if c['step'] == 2810:
        print(c['args']['TargetContent'])
        print("---REPLACEMENT---")
        print(c['args']['ReplacementContent'])
