import json

log_path = '/Users/sonalbelchada/.gemini/antigravity/brain/38165703-59bb-4e19-af98-191d0f21dce7/.system_generated/logs/transcript_full.jsonl'

best_app_js = None
max_len = 0

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        # Check if this line might contain the app.js code
        if 'function loadStoreData' in line and 'function renderCatalog' in line:
            # It's likely a tool call
            try:
                data = json.loads(line)
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        args = tc.get('arguments', {})
                        # It could be write_to_file or run_command
                        content = args.get('CodeContent', '')
                        if not content:
                            content = args.get('CommandLine', '')
                        
                        if 'function renderCatalog' in content:
                            if len(content) > max_len:
                                max_len = len(content)
                                best_app_js = content
            except:
                pass

if best_app_js:
    # If it was a bash script, we need to extract the EOF part
    if 'EOF' in best_app_js and 'cat <<' in best_app_js:
        import re
        match = re.search(r"cat << '?EOF'? > .*?\n(.*?)\nEOF", best_app_js, re.DOTALL)
        if match:
            best_app_js = match.group(1)
            
    with open('app_recovered.js', 'w', encoding='utf-8') as f:
        f.write(best_app_js)
    print(f"Recovered app.js! Length: {len(best_app_js)}")
else:
    print("Could not find app.js")

