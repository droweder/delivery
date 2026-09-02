import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern_put = r"(    if \(motivoAjuste\) \{\s*const dataHoraStr =.*?\s*const registroAudit =.*?\s*pedido\.observacoes =.*?\s*\}\s*console\.log\(\`\[Gerência\] Pedido \$\{pedido\.codigo\} atualizado pelo gerente\.\`\);\s*)(res\.json\(\{ sucesso: true, pedido \};\s*\})\s*"
replacement_put = r"""\1
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
            itens_pedido_json: pedido.itens, // in case there's a JSON column, or we don't bother for now
         }).eq('id', pedido.id).then();
      }
    } catch(e) {}
    
    \2"""

content = re.sub(pattern_put, replacement_put, content)

pattern_cancel = r"(    const registroCancel = .*?\s*pedido\.observacoes = .*?\s*if \(pedido\.entregadorId\) \{[\s\S]*?\}\s*)(res\.json\(\{ sucesso: true, pedido \};\s*\})\s*"
replacement_cancel = r"""\1
    try {
      const supabase = getSupabase();
      if (supabase) {
         supabase.from('pedidos').update({
            status: pedido.status,
            versao: pedido.versao,
            observacoes: pedido.observacoes
         }).eq('id', pedido.id).then();
      }
    } catch(e) {}
    \2"""
content = re.sub(pattern_cancel, replacement_cancel, content)

with open('server.ts', 'w') as f:
    f.write(content)
