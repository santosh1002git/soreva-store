import re

with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Replace the specific block that doesn't have a null check
target = r"""    const finishes = product.availableFinishes || \[product.plating\];
    const finishContainer = document.getElementById\('pdpFinishOptions'\);
    finishContainer\.innerHTML = finishes\.map\(\(f, idx\) => `
        <button style="padding: 10px 20px; background: \$\{idx===0 \? 'rgba\(197,160,89,0.15\)' : 'transparent'\}\; border: 1px solid \$\{idx===0 \? 'var\(--gold-accent\)' : 'var\(--border-color\)'\}\; color: \$\{idx===0 \? 'var\(--gold-accent\)' : 'var\(--text-light\)'\}\; border-radius: 6px; cursor: pointer; text-transform: capitalize;" onclick="Array\.from\(this\.parentNode\.children\)\.forEach\(c=>\{c\.style\.borderColor='var\(--border-color\)'; c\.style\.color='var\(--text-light\)'; c\.style\.background='transparent'\}\); this\.style\.borderColor='var\(--gold-accent\)'; this\.style\.color='var\(--gold-accent\)'; this\.style\.background='rgba\(197,160,89,0.15\)'; window\.selectedPdpFinish='\$\{f\}';">
            \$\{f\}
        </button>
    `\)\.join\(''\);
    window\.selectedPdpFinish = finishes\[0\];"""

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

app_js = re.sub(target, replacement, app_js, flags=re.MULTILINE)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

