import re

with open('server.ts', 'r') as f:
    text = f.read()

text = text.replace("'./src/data/initialData.js'", "'./src/data/initialData'")
text = text.replace("'./src/data/schemaSql.js'", "'./src/data/schemaSql'")

with open('server.ts', 'w') as f:
    f.write(text)
