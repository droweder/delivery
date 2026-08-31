import re
with open('server.ts') as f: text = f.read()

# Fix the Push Subscriptions comment mess
text = re.sub(r'// Push Subscriptions // Push Subscriptions.*?Push Notifications Log \(Supabase / Web Push\)', '}\n// Push Subscriptions & Push Notifications Log (Supabase / Web Push)', text, flags=re.DOTALL)

with open('server.ts', 'w') as f: f.write(text)
