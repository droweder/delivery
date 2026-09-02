import re

with open('server.ts', 'r') as f:
    content = f.read()

pattern = r"(      // 5\. Registrar no log de auditoria\s*syncAuditLog\.push\(\{[\s\S]*?\}\);\s*)(processados\.push\(\{ id: syncItem\.id, pedidoId: syncItem\.pedidoId, status: 'OK' \};\s*\})\s*\}\);\s*res\.json\(\{"

replacement = r"""\1
      try {
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
      }
      
      \2
    });

    res.json({"""

new_content = re.sub(pattern, replacement, content)
with open('server.ts', 'w') as f:
    f.write(new_content)
