import re
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Remove the finish options safely
js = re.sub(r'const finishContainer = document.getElementById\(\'pdpFinishOptions\'\);.*?window\.selectedPdpFinish = finishes\[0\];\s*\}', '', js, flags=re.DOTALL)
js = re.sub(r'const pdpFinishOptions = document.getElementById\(\'pdpFinishOptions\'\);.*?pdpFinishOptions\.innerHTML = \'<span.*?</span>\';\s*\}', '', js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
