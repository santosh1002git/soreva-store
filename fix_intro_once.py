import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add sessionStorage check to initInnovativeAtelierEntry
intro_logic = r'''function initInnovativeAtelierEntry() {
    const entrySection = document.getElementById('innovativeAtelierEntry');
    if (!entrySection) return;

    // Only play once per session
    if (sessionStorage.getItem('soreva_intro_played')) {
        entrySection.style.display = 'none';
        document.body.style.overflow = 'auto';
        return;
    }
    sessionStorage.setItem('soreva_intro_played', 'true');
'''

js = js.replace('function initInnovativeAtelierEntry() {\n    const entrySection = document.getElementById(\'innovativeAtelierEntry\');\n    if (!entrySection) return;', intro_logic)

# Also update the prologue button to play the animation and bypass sessionStorage check!
# The user might click the "Intro" button in the header.
# Wait, let's make sure openEntryPrologue() ignores the sessionStorage check, or we don't care because openEntryPrologue() manually shows it.
# Actually, openEntryPrologue() is a separate function.

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
