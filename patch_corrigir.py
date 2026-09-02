import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r"(      pedido\.status = 'PENDENTE';\s*pedido\.entregadorId = undefined;\s*pedido\.entregadorNome = undefined;\s*\}\s*\n)(    res\.json\(\{ sucesso: true, mensagem: 'Pedido corrigido com sucesso!', pedido \};\s*\}\);)"
replacement = r"""\1
    try {
      const supabase = getSupabase();
      if (supabase) {
         supabase.from('pedidos').update({
            status: pedido.status,
            entregador_id: pedido.entregadorId,
            subtotal: pedido.subtotal,
            taxa_entrega: pedido.taxaEntrega,
            desconto: pedido.desconto,
            total: pedido.total,
            forma_pagamento_prevista: pedido.formaPagamentoPrevista,
            troco_para: pedido.trocoPara,
            observacoes: pedido.observacoes,
            devolvido_para_correcao: pedido.devolvidoParaCorrecao,
            despachado_em: pedido.despachadoEm,
            versao: pedido.versao,
         }).eq('id', pedido.id).then(({error}) => { if(error) console.log(error); });
      }
    } catch(e) {}
\2"""

new_content = re.sub(pattern, replacement, content)
with open('server.ts', 'w') as f:
    f.write(new_content)
