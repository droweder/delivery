with open('server.ts', 'r') as f:
    content = f.read()

# 1. Fix PUT /api/pedidos/:id
old_put = """    try {
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
    } catch(e) {}"""

new_put = """    try {
      const supabase = getSupabase();
      if (supabase) {
         await supabase.from('pedidos').update({
            status: pedido.status,
            entregador_id: pedido.entregadorId || null,
            subtotal: pedido.subtotal,
            taxa_entrega: pedido.taxaEntrega,
            desconto: pedido.desconto,
            total: pedido.total,
            forma_pagamento_prevista: pedido.formaPagamentoPrevista,
            troco_para: pedido.trocoPara || null,
            observacoes: pedido.observacoes,
            versao: pedido.versao,
         }).eq('id', pedido.id);
      }
    } catch(e) {}"""

if old_put in content:
    content = content.replace(old_put, new_put, 1)
    print("PUT /api/pedidos/:id patched!")
else:
    print("PUT target not found!")

# 2. Fix POST /api/entregador/sincronizar-baixas
old_sync = """      try {
        const supabase = getSupabase();
        if (supabase) {
          // Atualiza pedido no Supabase
          supabase.from('pedidos').update({
            status: pedido.status,
            forma_pagamento_realizada: pedido.formaPagamentoRealizada,
            pagamentos_realizados: pedido.pagamentosRealizados,
            valor_recebido: pedido.valorRecebido,
            entregue_em: pedido.entregueEm,
            origem_offline: pedido.origemOffline,
            sincronizado: pedido.sincronizado,
            versao: pedido.versao,
          }).eq('id', pedido.id).then(({error}) => {
             if(error) console.warn("[Supabase] Erro ao sincronizar baixa:", error);
          });
          
          // Se houver clientes com fiado
          if (pedido.cliente && (syncItem.payload.vasilhamesPendentes.P13 > 0 || syncItem.payload.vasilhamesPendentes.P20L > 0)) {
             supabase.from('clientes').update({
               vasilhames_pendentes: pedido.cliente.vasilhamesPendentes
             }).eq('id', pedido.cliente.id).then();
          }
        }
      } catch (e) {
        console.warn("[Supabase] Fallback ao DB offline", e);
      }"""

new_sync = """      try {
        const supabase = getSupabase();
        if (supabase) {
          // Atualiza pedido no Supabase
          const { error: errUpdate } = await supabase.from('pedidos').update({
            status: pedido.status,
            entregue_em: pedido.entregueEm,
            sincronizado: true,
            versao: pedido.versao,
            observacoes: pedido.observacoes,
          }).eq('id', pedido.id);
          if (errUpdate) console.warn("[Supabase] Erro ao sincronizar baixa:", errUpdate);

          // Se houver clientes com fiado
          if (pedido.cliente && (syncItem.payload.vasilhamesPendentes.P13 > 0 || syncItem.payload.vasilhamesPendentes.P20L > 0)) {
             await supabase.from('clientes').update({
               vasilhames_pendentes: pedido.cliente.vasilhamesPendentes
             }).eq('id', pedido.cliente.id);
          }
        }
      } catch (e) {
        console.warn("[Supabase] Fallback ao DB offline", e);
      }"""

if old_sync in content:
    content = content.replace(old_sync, new_sync, 1)
    print("Sincronizar baixas patched!")
else:
    print("Sync target not found!")

# 3. Fix POST /api/acerto/fechamento
old_fech = """        // Atualiza todos os pedidos para CONCLUIDO no Supabase
        for (const p of pedidosFechamento) {
          supabase.from('pedidos').update({
            status: 'CONCLUIDO',
            concluido_em: p.concluidoEm,
          }).eq('id', p.id).then(({error}) => { if(error) console.warn('[Supabase] Erro ao concluir pedido:', error); });
        }"""

new_fech = """        // Atualiza todos os pedidos para CONCLUIDO no Supabase
        for (const p of pedidosFechamento) {
          const { error: errConc } = await supabase.from('pedidos').update({
            status: 'CONCLUIDO',
            concluido_em: p.concluidoEm,
          }).eq('id', p.id);
          if (errConc) console.warn('[Supabase] Erro ao concluir pedido:', errConc);
        }"""

if old_fech in content:
    content = content.replace(old_fech, new_fech, 1)
    print("Fechamento patched!")
else:
    print("Fechamento target not found!")

with open('server.ts', 'w') as f:
    f.write(content)
