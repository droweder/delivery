import re
with open('server.ts') as f: text = f.read()

text = re.sub(r'  return supabaseClient;\n// VAPID Web Push Keys Setup', '  return supabaseClient;\n}\n\n// VAPID Web Push Keys Setup', text, flags=re.DOTALL)

with open('server.ts', 'w') as f: f.write(text)
