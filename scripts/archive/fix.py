with open('server.ts', 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "  if (!process.env.VERCEL) {" in line:
        if skip:
            continue
        skip = True
    new_lines.append(line)

with open('server.ts', 'w') as f:
    f.writelines(new_lines)
