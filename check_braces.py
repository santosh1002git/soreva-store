with open('app.js', 'r') as f:
    js = f.read()

open_braces = js.count('{')
close_braces = js.count('}')
print(f"Open: {open_braces}, Close: {close_braces}")
if open_braces != close_braces:
    print("MISMATCH!")
