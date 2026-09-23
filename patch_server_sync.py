import re

with open('server.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Add the sync endpoint
endpoint = r'''
        if parsed.path == '/api/admin/sync-catalog':
            # Run the agent in the background
            import subprocess
            import os
            script_path = os.path.join(DATA_DIR, '..', 'scripts', 'czm_sync_agent.py')
            subprocess.Popen([sys.executable, script_path])
            
            self._send_json({"success": True, "message": "Agent launched. Syncing catalog in the background. Please check back in a few minutes."})
            return
            
        if parsed.path == '/api/db/products/update':
'''

code = code.replace("if parsed.path == '/api/db/products/update':", endpoint)

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(code)
