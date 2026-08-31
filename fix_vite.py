with open('server.ts') as f: text = f.read()

import re
text = re.sub(r'import \{ createServer as createViteServer \} from \'vite\';\n', '', text)
text = text.replace('const vite = await createViteServer({', 'const { createServer } = await import(\'vite\');\n        const vite = await createServer({')

with open('server.ts', 'w') as f: f.write(text)
