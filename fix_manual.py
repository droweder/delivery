with open('server.ts') as f: lines = f.readlines()
for i, line in enumerate(lines):
    if line.strip() == '}' and i > 140 and i < 160:
        lines[i] = '\n'
        
# Now find return mov;
for i, line in enumerate(lines):
    if 'return mov;' in line:
        lines[i] = '  return mov;\n}\n'
        break

with open('server.ts', 'w') as f: f.writelines(lines)
