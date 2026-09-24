import json

with open('app_js_history.json', 'r') as f:
    commits = json.load(f)

for c in commits:
    if c['step'] == 35:
        print(c['args']['CommandLine'][:500])
        print("...")
        print(len(c['args']['CommandLine']))
