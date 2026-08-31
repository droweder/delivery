with open('server.ts') as f: lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.strip() == '}' and i == 150: # line 151
        continue
    if line.strip() == '}' and i == 152: # line 153
        continue
    if line.strip() == '}' and i == 336: # line 337
        continue
    new_lines.append(line)

with open('server.ts', 'w') as f: f.writelines(new_lines)
