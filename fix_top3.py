import re
with open('server.ts') as f: text = f.read()

text = re.sub(r'  console\.warn\(\'\[Web Push\] Aviso ao configurar VAPID details:\', e\);\n\}\n\}\n// Push Subscriptions', '  console.warn(\'[Web Push] Aviso ao configurar VAPID details:\', e);\n}\n\n// Push Subscriptions', text, flags=re.DOTALL)

with open('server.ts', 'w') as f: f.write(text)
