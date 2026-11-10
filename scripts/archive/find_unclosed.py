with open('server.ts') as f:
    lines = f.readlines()

count = 0
for i, line in enumerate(lines):
    count += line.count('{') - line.count('}')
    if count == 0 and "app.get" in line:
        pass # this doesn't help

# Let's print the line numbers where indentation doesn't match braces
count = 0
for i, line in enumerate(lines):
    open_c = line.count('{')
    close_c = line.count('}')
    count += open_c - close_c
    if i > 2400:
        print(f"Line {i+1} Count {count}: {line.strip()}")
