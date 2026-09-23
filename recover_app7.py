with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()

replacement = r'''    const finishContainer = document.getElementById('pdpFinishOptions');
    if (finishContainer) {
        const finishes = product.availableFinishes || [product.plating];
        finishContainer.innerHTML = finishes.map((f, idx) => `
            <button style="padding: 10px 20px; background: ${idx===0 ? 'rgba(197,160,89,0.15)' : 'transparent'}; border: 1px solid ${idx===0 ? 'var(--gold-accent)' : 'var(--border-color)'}; color: ${idx===0 ? 'var(--gold-accent)' : 'var(--text-light)'}; border-radius: 6px; cursor: pointer; text-transform: capitalize;" onclick="Array.from(this.parentNode.children).forEach(c=>{c.style.borderColor='var(--border-color)'; c.style.color='var(--text-light)'; c.style.background='transparent'}); this.style.borderColor='var(--gold-accent)'; this.style.color='var(--gold-accent)'; this.style.background='rgba(197,160,89,0.15)'; window.selectedPdpFinish='${f}';">
                ${f}
            </button>
        `).join('');
        window.selectedPdpFinish = finishes[0];
    }'''

# Split the 88MB text by the replacement string
parts = text.split(replacement)

# Since it matched at every zero-width position, each part between replacements should be exactly 1 character!
original_chars = []
for p in parts:
    original_chars.append(p)

original_text = "".join(original_chars)

with open('app_reconstructed.js', 'w', encoding='utf-8') as f:
    f.write(original_text)

print(f"Parts count: {len(parts)}")
print(f"Reconstructed length: {len(original_text)}")

