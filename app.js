    const finishContainer = document.getElementById('pdpFinishOptions');
    if (finishContainer) {
        const finishes = product.availableFinishes || [product.plating];
        finishContainer.innerHTML = finishes.map((f, idx) => `
            <button style="padding: 10px 20px; background: ${idx===0 ? 'rgba(197,160,89,0.15)' : 'transparent'}; border: 1px solid ${idx===0 ? 'var(--gold-accent)' : 'var(--border-color)'}; color: ${idx===0 ? 'var(--gold-accent)' : 'var(--text-light)'}; border-radius: 6px; cursor: pointer; text-transform: capitalize;" onclick="Array.from(this.parentNode.children).forEach(c=>{c.style.borderColor='var(--border-color)'; c.style.color='var(--text-light)'; c.style.background='transparent'}); this.style.borderColor='var(--gold-accent)'; this.style.color='var(--gold-accent)'; this.style.background='rgba(197,160,89,0.15)'; window.selectedPdpFinish='${f}';">
                ${f}
            </button>
        `).join('');
        window.selectedPdpFinish = finishes[0];
    }