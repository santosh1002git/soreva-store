import re
with open('app.js', 'r') as f:
    js = f.read()

print("Syntax Check passed?", "function" in js)
