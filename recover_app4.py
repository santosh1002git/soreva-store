with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# The corruption starts at "const finishContainer = document.getElementById('pdpFinishOptions');"
# We can use regex to replace the ENTIRE corrupted block (which might be 88MB) with just the correct block!

start_str = "    const finishContainer = document.getElementById('pdpFinishOptions');"
end_str = "        window.selectedPdpFinish = finishes[0];\n    }"

first_idx = text.find(start_str)
last_idx = text.rfind(end_str)

if first_idx != -1 and last_idx != -1:
    correct_block = '''    const finishContainer = document.getElementById('pdpFinishOptions');
    if (finishContainer) {
        const finishes = product.availableFinishes || [product.plating];
        finishContainer.innerHTML = finishes.map((f, idx) => `
            <button style="padding: 10px 20px; background: ${idx===0 ? 'rgba(197,160,89,0.15)' : 'transparent'}; border: 1px solid ${idx===0 ? 'var(--gold-accent)' : 'var(--border-color)'}; color: ${idx===0 ? 'var(--gold-accent)' : 'var(--text-light)'}; border-radius: 6px; cursor: pointer; text-transform: capitalize;" onclick="Array.from(this.parentNode.children).forEach(c=>{c.style.borderColor='var(--border-color)'; c.style.color='var(--text-light)'; c.style.background='transparent'}); this.style.borderColor='var(--gold-accent)'; this.style.color='var(--gold-accent)'; this.style.background='rgba(197,160,89,0.15)'; window.selectedPdpFinish='${f}';">
                ${f}
            </button>
        `).join('');
        window.selectedPdpFinish = finishes[0];
    }'''
    
    new_text = text[:first_idx] + correct_block + text[last_idx + len(end_str):]
    
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print(f"Repaired! New length: {len(new_text)}")
else:
    print("Could not find boundaries.")

