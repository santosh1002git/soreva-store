import json

log_path = '/Users/sonalbelchada/.gemini/antigravity/brain/38165703-59bb-4e19-af98-191d0f21dce7/.system_generated/logs/transcript_full.jsonl'

writes = []

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'app.js' in line:
            try:
                data = json.loads(line)
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        if tc.get('name') == 'default_api:write_to_file':
                            args = tc.get('arguments', {})
                            if args.get('TargetFile', '').endswith('app.js'):
                                writes.append(args.get('CodeContent'))
                        elif tc.get('name') == 'default_api:run_command':
                            args = tc.get('arguments', {})
                            cmd = args.get('CommandLine', '')
                            if '> app.js' in cmd or 'app.js' in cmd:
                                if 'cat <<' in cmd:
                                    import re
                                    match = re.search(r"cat << '?EOF'? > .*?app\.js\n(.*?)\nEOF", cmd, re.DOTALL)
                                    if match:
                                        writes.append(match.group(1))
            except:
                pass

for i, content in enumerate(writes):
    with open(f'app_recovered_{i}.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Recovered version {i}! Length: {len(content)}")

