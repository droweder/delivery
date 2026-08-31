with open('server.ts') as f: text = f.read()

import re
text = re.sub(r'  return mov;\n// Supabase Lazy Client\n\}\nlet supabaseClient: any = null;\n\}', '  return mov;\n}\n\n// Supabase Lazy Client\nlet supabaseClient: any = null;', text)

with open('server.ts', 'w') as f: f.write(text)
