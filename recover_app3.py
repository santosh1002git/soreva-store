import json

log_path = '/Users/sonalbelchada/.gemini/antigravity/brain/38165703-59bb-4e19-af98-191d0f21dce7/.system_generated/logs/transcript_full.jsonl'
best_app_js = None

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for tc in data['tool_calls']:
                    if tc.get('name') == 'default_api:write_to_file':
                        args = tc.get('arguments', {})
                        if args.get('TargetFile', '').endswith('app.js'):
                            best_app_js = args.get('CodeContent')
        except Exception as e:
            pass

if best_app_js:
    with open('app_recovered.js', 'w', encoding='utf-8') as f:
        f.write(best_app_js)
    print(f"Recovered app.js! Length: {len(best_app_js)}")
else:
    print("Could not find app.js via write_to_file")

