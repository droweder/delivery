with open('server.ts') as f: lines = f.readlines()

count = 0
for i, line in enumerate(lines):
    count += line.count('{') - line.count('}')
    if count == 0 and len(line.strip()) > 0 and not line.strip().startswith('//') and line.strip() != '}' and line.strip() != ');':
        print(f"L{i+1} count reaches 0: {line.strip()}")
