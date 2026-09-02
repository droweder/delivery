import re

with open('server.ts', 'r') as f:
    content = f.read()

# We need to find the place in /api/despacho/atribuir where `pedidosAtualizados` is built
# and update them in Supabase.
pattern = r"(    // Dispara Notificação Push para o Celular do Entregador \(Supabase Realtime \/ Web Push\)\s*let notificacoesGeradas: NotificacaoPush\[\] = \[\];)"
replacement = r"""    try {
      const supabase = getSupabase();
      if (supabase && pedidosAtualizados.length > 0) {
        // Atualiza pedidos em lote no supabase (apenas os campos necessários ou usar upsert)
        for (const p of pedidosAtualizados) {
           supabase.from('pedidos').update({
             entregador_id: p.entregadorId,
             status: p.status,
             despachado_em: p.despachadoEm,
             despachado_por: p.despachadoPor,
             devolvido_para_correcao: p.devolvidoParaCorrecao,
             versao: p.versao
           }).eq('id', p.id).then(({error}) => {
             if (error) console.warn('[Supabase] Erro ao atribuir pedido:', error);
           });
           
           // Se quiser abater estoque no db
           p.itens.forEach(item => {
             const prod = produtos.find(pr => pr.id === item.produtoId);
             if (prod) {
               supabase.from('produtos').update({ estoque_cheio: prod.estoqueCheio }).eq('id', prod.id).then();
             }
           });
        }
        
        // Update entregador
        supabase.from('entregadores').update({
           status: entregador.status,
           pedidos_ativos_count: entregador.pedidosAtivosCount
        }).eq('id', entregador.id).then();
      }
    } catch(e) {
      console.warn(e);
    }

\1"""

new_content = re.sub(pattern, replacement, content)
with open('server.ts', 'w') as f:
    f.write(new_content)
