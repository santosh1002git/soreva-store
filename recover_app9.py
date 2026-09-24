import json

log_path = '/Users/sonalbelchada/.gemini/antigravity/brain/38165703-59bb-4e19-af98-191d0f21dce7/.system_generated/logs/transcript_full.jsonl'

commits = []

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'app.js' in line:
            try:
                data = json.loads(line)
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        args = tc.get('arguments', {})
                        target = args.get('TargetFile', '')
                        content = args.get('CodeContent', '')
                        if 'app.js' in target or 'app.js' in args.get('CommandLine', ''):
                            commits.append(tc)
            except:
                pass

with open('app_js_history.json', 'w', encoding='utf-8') as f:
    json.dump(commits, f, indent=2)

print(f"Found {len(commits)} tool calls touching app.js")

