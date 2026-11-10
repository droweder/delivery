with open('server.ts') as f:
    lines = f.readlines()

count = 0
for i, line in enumerate(lines[:331]):
    open_c = line.count('{')
    close_c = line.count('}')
    if open_c != close_c:
        print(f"Line {i+1} [+{open_c} -{close_c} = {count}]: {line.strip()}")
    count += open_c - close_c
