with open('server.ts') as f: lines = f.readlines()
for i, line in enumerate(lines):
    if line.strip() == '}' and lines[i+1].strip() == '} catch (e) {}':
        if 'supabase.from(\'fechamentos_caixa\')' in lines[i-2]:
            lines[i] = '' # delete the extra brace
            
with open('server.ts', 'w') as f: f.writelines(lines)
