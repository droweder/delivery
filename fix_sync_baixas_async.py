with open('server.ts', 'r') as f:
    content = f.read()

target = """  app.post('/api/entregador/sincronizar-baixas', (req, res) => {"""
replacement = """  app.post('/api/entregador/sincronizar-baixas', async (req, res) => {"""

content = content.replace(target, replacement, 1)

target_loop = """    itensSincronizacao.forEach((syncItem) => {"""
replacement_loop = """    for (const syncItem of itensSincronizacao) {"""

content = content.replace(target_loop, replacement_loop, 1)

target_end_loop = """      processados.push({ id: syncItem.id, pedidoId: syncItem.pedidoId, status: 'OK' });
    });"""

replacement_end_loop = """      processados.push({ id: syncItem.id, pedidoId: syncItem.pedidoId, status: 'OK' });
    }"""

content = content.replace(target_end_loop, replacement_end_loop, 1)

with open('server.ts', 'w') as f:
    f.write(content)

print("sincronizar-baixas async loop patched!")
