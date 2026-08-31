with open('server.ts') as f: lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.strip() == '}' and i == 151:  # line 152 (0-indexed 151)
        continue
    if line.strip() == 'let supabaseClient: any = null;':
        new_lines.append('}\n')
        new_lines.append(line)
        continue
    
    if line.strip() == '// VAPID Web Push Keys Setup (Supabase / W3C Standard)':
        new_lines.append('}\n')
        new_lines.append(line)
        continue

    new_lines.append(line)

with open('server.ts', 'w') as f: f.writelines(new_lines)
