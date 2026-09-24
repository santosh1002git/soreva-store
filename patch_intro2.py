with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

import re

intro_logic = r'''
let logoTypingTimeouts = [];

function initIntro() {
    const intro = document.getElementById('entryExperience');
    if (!intro) return;
    
    // if (false && sessionStorage.getItem('soreva_intro_played')) { ... }
    
    intro.style.display = 'flex';
    intro.classList.remove('unveiled');
    document.body.style.overflow = 'hidden';
    entryActive = true;
    
    // Clear previous timeouts if re-running
    logoTypingTimeouts.forEach(t => clearTimeout(t));
    logoTypingTimeouts = [];
    
    const logoInner = document.getElementById('logoTypeInner');
    const logoCursor = document.getElementById('logoTypeCursor');
    
    if (logoInner) logoInner.classList.remove('revealed');
    if (logoCursor) {
        logoCursor.classList.remove('revealed');
        logoCursor.classList.remove('fade-out');
    }
    
    // 1. Initial pause, then start typing (revealing)
    let t1 = setTimeout(() => {
        if (logoInner && entryActive) {
            logoInner.classList.add('revealed');
            if (logoCursor) logoCursor.classList.add('revealed');
        }
    }, 400);
    
    // 2. Fade out the cursor after typing finishes
    let t2 = setTimeout(() => {
        if (logoCursor && entryActive) {
            logoCursor.classList.add('fade-out');
        }
    }, 1800); // 400ms delay + 1.4s transition
    
    // 3. Automatically close the intro
    entryAutoTimer = setTimeout(() => {
        closeEntryPrologue();
    }, 2800);
    
    logoTypingTimeouts.push(t1, t2);
}
'''

# We need to replace the existing initIntro function.
js = re.sub(r'function initIntro\(\) \{.*?(?=// Call initIntro)', intro_logic + '\n', js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
