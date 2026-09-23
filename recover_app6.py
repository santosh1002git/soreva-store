import json

log_path = '/Users/sonalbelchada/.gemini/antigravity/brain/38165703-59bb-4e19-af98-191d0f21dce7/.system_generated/logs/transcript_full.jsonl'

best_app_js = None
max_len = 0

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'pdpDetailsList.innerHTML' in line and 'tool_calls' in line:
            try:
                data = json.loads(line)
                if 'tool_calls' in data:
                    for tc in data['tool_calls']:
                        args = tc.get('arguments', {})
                        content = args.get('CodeContent', '')
                        if not content:
                            content = args.get('CommandLine', '')
                        
                        if 'pdpDetailsList.innerHTML' in content:
                            # Avoid picking up our own patch scripts!
                            if 'EOF' in content and 'app_js =' in content:
                                continue # this is a patch script
                                
                            if len(content) > max_len and len(content) > 10000:
                                max_len = len(content)
                                best_app_js = content
            except:
                pass

if best_app_js:
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

