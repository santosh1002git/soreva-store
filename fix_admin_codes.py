with open('admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

target = '''<div style="display: flex; flex-direction: column;">
                        <strong>${p.name}</strong>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">ID: ${p.id}</span>
                    </div>'''

replacement = '''<div style="display: flex; flex-direction: column;">
                        <strong>${p.name}</strong>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">
                            SKU: ${(() => {
                                const m = p.description ? p.description.match(/Distributor Model:\\s*([A-Za-z0-9-]+)/) : null;
                                return m ? m[1] : p.id.replace('czm_', '');
                            })()}
                        </span>
                    </div>'''

js = js.replace(target, replacement)

with open('admin.js', 'w', encoding='utf-8') as f:
    f.write(js)
