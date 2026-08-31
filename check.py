with open('server.ts') as f:
    text = f.read()

count = 0
for i, char in enumerate(text):
    if char == '{':
        count += 1
    elif char == '}':
        count -= 1
        if count < 0:
            print(f"Negative count at {i}")

print(f"Final count: {count}")
