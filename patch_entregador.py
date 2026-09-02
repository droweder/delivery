import re

with open('src/components/AppEntregador.tsx', 'r') as f:
    content = f.read()

# Try again to find modal
# {modalSimuladorPush && (
modal_start = content.find("{modalSimuladorPush && (")
if modal_start != -1:
    # Find matching closing bracket
    bracket_count = 0
    modal_end = -1
    for i in range(modal_start, len(content)):
        if content[i] == '{':
            bracket_count += 1
        elif content[i] == '}':
            bracket_count -= 1
            if bracket_count == 0:
                modal_end = i + 1
                break
    
    if modal_end != -1:
        # Also remove the comments before it
        comment_start = content.rfind("{/* ---", 0, modal_start)
        if comment_start != -1:
            content = content[:comment_start] + content[modal_end:]
        else:
            content = content[:modal_start] + content[modal_end:]

with open('src/components/AppEntregador.tsx', 'w') as f:
    f.write(content)
