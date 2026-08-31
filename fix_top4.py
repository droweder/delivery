import re
with open('server.ts') as f: text = f.read()

text = re.sub(r'  return notificacao;\n\}\n\}\n\nlet orderCounter = 1045;', '  return notificacao;\n}\n\nlet orderCounter = 1045;', text, flags=re.DOTALL)

with open('server.ts', 'w') as f: f.write(text)
