with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

intro_logic = '''
// ==========================================================================
// LOGO TYPING INTRO
// ==========================================================================
let entryActive = false;
let entryAutoTimer = null;
let logoTypingTimeouts = [];

function closeEntryPrologue() {
    const intro = document.getElementById('entryExperience');
    if (!intro || !entryActive) return;
    
    entryActive = false;
    if (entryAutoTimer) clearTimeout(entryAutoTimer);
    
    intro.classList.add('unveiled');
    document.body.style.overflow = '';
    
    // Store in session so it only plays once per session
    sessionStorage.setItem('soreva_intro_played', 'true');
}

function initIntro() {
    const intro = document.getElementById('entryExperience');
    if (!intro) return;
    
    // Play only once per session
    if (sessionStorage.getItem('soreva_intro_played') === 'true') {
        intro.style.display = 'none';
        return;
    }
    
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

// Call on load
document.addEventListener('DOMContentLoaded', () => {
    initIntro();
});
'''

# check if closeEntryPrologue already exists!
import re
if 'function closeEntryPrologue' in js:
    print("WARNING: closeEntryPrologue already exists!")
    # Remove it!
    js = re.sub(r'function closeEntryPrologue\(\) \{.*?\n\}', '', js, flags=re.DOTALL)
if 'function initIntro' in js:
    print("WARNING: initIntro already exists!")
    js = re.sub(r'function initIntro\(\) \{.*?\n\}', '', js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js + "\n" + intro_logic)
