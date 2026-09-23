import re

with open('admin.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add button to Products header
btn_target = r'''<button class="btn-admin-primary" onclick="openProductModal()">
                                <i class="fa-solid fa-plus"></i> Add Piece
                            </button>'''

btn_replacement = r'''<button class="btn-admin-primary" onclick="launchSyncAgent()" style="background: var(--text-dark); margin-right: 8px;">
                                <i class="fa-solid fa-robot"></i> Launch Sync Agent
                            </button>
                            <button class="btn-admin-primary" onclick="openProductModal()">
                                <i class="fa-solid fa-plus"></i> Add Piece
                            </button>'''

html = html.replace(btn_target, btn_replacement)

with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(html)
