with open('server.ts', 'r') as f:
    content = f.read()

dev_target = "console.log(`[Devolução] Pedido ${pedido.codigo} devolvido por ${entregador.nome}: ${motivoDevolucao}`);"
dev_replacement = """try {
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

    console.log(`[Devolução] Pedido ${pedido.codigo} devolvido por ${entregador.nome}: ${motivoDevolucao}`);"""

if dev_target in content:
    content = content.replace(dev_target, dev_replacement, 1)
    print("Devolução patched!")
else:
    print("Devolução target not found!")

fech_target = """    // Tenta persistir no Supabase
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('fechamentos_caixa').insert([fechamento]);
      }
    } catch (e) {}"""

fech_replacement = """    // Tenta persistir no Supabase
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
      }
    } catch (e) {}"""

if fech_target in content:
    content = content.replace(fech_target, fech_replacement, 1)
    print("Fechamento patched!")
else:
    print("Fechamento target not found!")

with open('server.ts', 'w') as f:
    f.write(content)

