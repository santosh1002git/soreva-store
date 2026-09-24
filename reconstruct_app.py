import json
import re

with open('app_js_history.json', 'r') as f:
    commits = json.load(f)

app_js = ""

# Find the initial creation
for c in commits:
    if c['step'] == 35:
        cmd = c['args']['CommandLine']
        # Extract everything between the first line (cat ...) and the last line (EOF)
        lines = cmd.split('\n')
        app_js = '\n'.join(lines[1:-1])
        break

print(f"Initial length: {len(app_js)}")

# Apply all patches in order
for c in commits:
    if c['step'] <= 35:
        continue
        
    if c['name'] == 'replace_file_content':
        target = c['args'].get('TargetContent', '')
        replacement = c['args'].get('ReplacementContent', '')
        if target in app_js:
            app_js = app_js.replace(target, replacement)
        else:
            print(f"WARNING: Could not apply patch at step {c['step']}")
            
    elif c['name'] == 'run_command':
        cmd = c['args']['CommandLine']
        # Extract python snippet that patches app.js
        if 'python' in cmd and 'replace' in cmd:
            if 'fix_product_js.py' in cmd or 'patch' in cmd:
                pass # Many of these were run from files, not inline!
        
        # If it was an inline python script modifying app.js:
        if 'with open(\'app.js\'' in cmd and 're.sub' in cmd:
            match = re.search(r"re\.sub\((.*?),\s*(.*?),\s*js.*?\)", cmd)
            if match:
                # This is too brittle.
                pass

# Let's save what we have from direct replace_file_content!
with open('app_recovered_auto.js', 'w', encoding='utf-8') as f:
    f.write(app_js)
print(f"Recovered length after direct patches: {len(app_js)}")
