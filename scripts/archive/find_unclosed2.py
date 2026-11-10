with open('server.ts') as f:
    lines = f.readlines()

count = 0
for i, line in enumerate(lines):
    open_c = line.count('{')
    close_c = line.count('}')
    count += open_c - close_c
    if "let orderCounter = 1045" in line:
        print(f"Line {i+1} Count {count}: {line.strip()}")
    if i in [325, 335]:
        print(f"Line {i+1} Count {count}: {line.strip()}")
