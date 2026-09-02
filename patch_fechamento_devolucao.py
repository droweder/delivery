import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Patch devolver-pedido
pat_dev = r"(    console\.log\(`\[Devolução\] Pedido \$\{pedido\.codigo\} devolvido por \$\{entregador\.nome\}: \$\{motivoDevolucao\}`\);\s*\n)(    res\.json\(\{\s*sucesso: true,)"

rep_dev = r"""    try {
      const supabase = getSupabase();
      if (supabase) {
        supabase.from('pedidos').update({
          status: pedido.status,
          devolvido_para_correcao: pedido.devolvidoParaCorrecao,
          motivo_devolucao: pedido.motivoDevolucao,
          devolvido_em: pedido.devolvidoEm,
          devolvido_por_id: pedido.devolvidoPorId,
          devolvido_por_nome: pedido.devolvidoPorNome,
          observacoes: pedido.observacoes,
          versao: pedido.versao,
        }).eq('id', pedido.id).then(({error}) => { if(error) console.warn('[Supabase] Erro ao atualizar devolvido:', error); });

        // Atualiza estoque devolvido
        pedido.itens.forEach((item) => {
          const prod = produtos.find((pr) => pr.id === item.produtoId);
          if (prod) {
            supabase.from('produtos').update({ estoque_cheio: prod.estoqueCheio }).eq('id', prod.id).then();
          }
        });

        if (entObj) {
          supabase.from('entregadores').update({ pedidos_ativos_count: entObj.pedidosAtivosCount }).eq('id', entObj.id).then();
        }
      }
    } catch(e) {}

\1\2"""

content = re.sub(pat_dev, rep_dev, content)

# 2. Patch fechamento
pat_fech = r"(    // Tenta persistir no Supabase\s*try \{\s*const supabase = getSupabase\(\);\s*if \(supabase\) \{\s*await supabase\.from\('fechamentos_caixa'\)\.insert\(\[fechamento\]\);\s*\}"

rep_fech = r"""    // Tenta persistir no Supabase
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('fechamentos_caixa').insert([fechamento]);

        // Atualiza todos os pedidos para CONCLUIDO no Supabase
        for (const p of pedidosFechamento) {
          supabase.from('pedidos').update({
            status: 'CONCLUIDO',
            concluido_em: p.concluidoEm,
          }).eq('id', p.id).then(({error}) => { if(error) console.warn('[Supabase] Erro ao concluir pedido:', error); });
        }

        // Atualiza status do entregador no Supabase
        supabase.from('entregadores').update({
          status: 'DISPONIVEL',
          pedidos_ativos_count: 0,
          total_entregas_hoje: entregador.totalEntregasHoje,
        }).eq('id', entregador.id).then();

        // Atualiza vasilhames em estoque no Supabase
        if (p13Prod) {
          supabase.from('produtos').update({ estoque_vazio: p13Prod.estoqueVazio }).eq('id', p13Prod.id).then();
        }
        if (p20Prod) {
          supabase.from('produtos').update({ estoque_vazio: p20Prod.estoqueVazio }).eq('id', p20Prod.id).then();
        }
      }"""

content = re.sub(pat_fech, rep_fech, content)

with open('server.ts', 'w') as f:
    f.write(content)

print("Patch aplicado com sucesso!")
