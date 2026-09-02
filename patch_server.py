import re

with open('server.ts', 'r') as f:
    content = f.read()

# Remove the /api/push/enviar-teste route
route_pattern = r"\s*\/\/\s*Enviar Push de Teste \(Simulador \/ Painel de Controle\)\s*app\.post\('/api/push/enviar-teste', async \(req, res\) => \{[\s\S]*?res\.json\(\{[\s\S]*?\}\);\s*\}\);\s*"
content = re.sub(route_pattern, "\n", content)

with open('server.ts', 'w') as f:
    f.write(content)
