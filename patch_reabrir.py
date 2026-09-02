import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r"(    pedido\.observacoes = \(pedido\.observacoes \|\| ''\) \+ `\\n\[REABERTO GERENTE \$\{new Date\(\)\.toLocaleTimeString\(\)\}\]`;\s*\n)(    res\.json\(\{ sucesso: true, pedido \};\s*\}\);)"
replacement = r"""\1
    try {
      const supabase = getSupabase();
      if (supabase) {
         supabase.from('pedidos').update({
            status: pedido.status,
            entregador_id: null,
            versao: pedido.versao,
            observacoes: pedido.observacoes
         }).eq('id', pedido.id).then(({error}) => { if(error) console.log(error); });
      }
    } catch(e) {}
\2"""

new_content = re.sub(pattern, replacement, content)
with open('server.ts', 'w') as f:
    f.write(new_content)
