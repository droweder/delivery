with open('server.ts', 'r') as f:
    content = f.read()

target = "res.json({ sucesso: true, mensagem: 'Pedido corrigido com sucesso!', pedido });"

replacement = """try {
      const supabase = getSupabase();
      if (supabase) {
        supabase.from('pedidos').update({
          status: pedido.status,
          entregador_id: pedido.entregadorId || null,
          subtotal: pedido.subtotal,
          taxa_entrega: pedido.taxaEntrega,
          desconto: pedido.desconto,
          total: pedido.total,
          forma_pagamento_prevista: pedido.formaPagamentoPrevista,
          troco_para: pedido.trocoPara,
          observacoes: pedido.observacoes,
          devolvido_para_correcao: false,
          despachado_em: pedido.despachadoEm || null,
          versao: pedido.versao,
        }).eq('id', pedido.id).then(({error}) => { if(error) console.warn('[Supabase] Erro ao atualizar pedido corrigido:', error); });

        if (pedido.status === 'EM_ROTA') {
          pedido.itens.forEach((it) => {
            const pr = produtos.find((p) => p.id === it.produtoId);
            if (pr) {
              supabase.from('produtos').update({ estoque_cheio: pr.estoqueCheio }).eq('id', pr.id).then();
            }
          });
        }
      }
    } catch(e) {}

    res.json({ sucesso: true, mensagem: 'Pedido corrigido com sucesso!', pedido });"""

if target in content:
    content = content.replace(target, replacement, 1)
    print("Corrigir-reenviar patched!")
else:
    print("Corrigir-reenviar target not found!")

with open('server.ts', 'w') as f:
    f.write(content)
