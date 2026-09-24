with open('server.py', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if '"' in line and "EOL" not in line:
        pass
with open('server.py', 'w') as f:
    for line in lines:
        if line.strip() == '"':
            continue
        f.write(line)
