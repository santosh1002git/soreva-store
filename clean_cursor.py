import re
with open('styles.css', 'r') as f:
    css = f.read()

# The first logo-type-cursor does not have transition: left. It has animation: blink
old_cursor = r'\.logo-type-cursor \{[^\}]*?background-color: #c5a059;[^\}]*?animation: blink[^\}]*?\}'
css = re.sub(old_cursor, '', css, flags=re.DOTALL)

with open('styles.css', 'w') as f:
    f.write(css)
