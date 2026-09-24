import json

with open('app_js_history.json', 'r') as f:
    commits = json.load(f)

failed_steps = [136, 174, 352, 354, 530, 536, 540, 1000, 1079, 1131, 1165, 1249, 1253, 1360, 1390, 1554, 1574, 1757, 2810, 2929, 2961, 2965, 2969, 2973, 2975, 2981]

for c in commits:
    if c['step'] in failed_steps:
        print(f"--- Step {c['step']} ---")
        if c['name'] == 'replace_file_content':
            print("Instruction:", c['args'].get('Instruction'))
