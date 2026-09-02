import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern_put = r"    console\.log\(`\[Gerência\] Pedido \$\{pedido\.codigo\} atualizado pelo gerente\.`\);\s*\n\s*res\.json\(\{ sucesso: true, pedido \}\);"
replacement_put = r"""    console.log(`[Gerência] Pedido ${pedido.codigo} atualizado pelo gerente.`);
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
            pagamentos_previstos: pedido.pagamentosPrevistos,
            forma_pagamento_realizada: pedido.formaPagamentoRealizada,
            pagamentos_realizados: pedido.pagamentosRealizados,
            valor_recebido: pedido.valorRecebido,
            troco_para: pedido.trocoPara,
            observacoes: pedido.observacoes,
            tipo_entrega: pedido.tipoEntrega,
            data_hora_entrega_agendada: pedido.dataHoraEntregaAgendada,
            previsao_minutos: pedido.previsaoMinutos,
            versao: pedido.versao,
         }).eq('id', pedido.id).then(({error}) => { if(error) console.log(error); });
      }
    } catch(e) {}
    res.json({ sucesso: true, pedido });"""

content = re.sub(pattern_put, replacement_put, content)

pattern_cancel = r"    if \(pedido\.entregadorId\) \{\s*dispararNotificacaoPush\(\{[\s\S]*?\}\);\s*\}\s*\n\s*res\.json\(\{ sucesso: true, pedido \}\);"
replacement_cancel = r"""    if (pedido.entregadorId) {
      dispararNotificacaoPush({
        entregadorId: pedido.entregadorId,
        titulo: `⚠️ Pedido ${pedido.codigo} Cancelado`,
        corpo: `O gerente cancelou o pedido de ${pedido.cliente.nome}. Não prossiga com a entrega.`,
        tipo: 'CANCELAMENTO',
        pedidoId: pedido.id,
        pedidoCodigo: pedido.codigo,
        prioridade: 'ALTA',
      });
    }

    try {
      const supabase = getSupabase();
      if (supabase) {
         supabase.from('pedidos').update({
            status: pedido.status,
            versao: pedido.versao,
            observacoes: pedido.observacoes
         }).eq('id', pedido.id).then(({error}) => { if(error) console.log(error); });
      }
    } catch(e) {}

    res.json({ sucesso: true, pedido });"""

content = re.sub(pattern_cancel, replacement_cancel, content)

with open('server.ts', 'w') as f:
    f.write(content)
