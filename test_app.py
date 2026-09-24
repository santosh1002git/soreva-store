import json

log_path = '/Users/sonalbelchada/.gemini/antigravity/brain/38165703-59bb-4e19-af98-191d0f21dce7/.system_generated/logs/transcript_full.jsonl'
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            idx = data.get('step_index', 0)
            if idx <= 100:
                if 'app.js' in line:
                    print(f"Step {idx}: {data.get('type')}")
                    if data.get('type') == 'PLANNER_RESPONSE':
                        for tc in data.get('tool_calls', []):
                            print(f"  Tool: {tc.get('name')}")
        except Exception:
            pass
