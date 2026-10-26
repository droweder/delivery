import { Pedido } from '../types';

export function formatarTelefoneWhatsApp(telefone: string): string {
  const numLimpo = (telefone || '').replace(/\D/g, '');
  if (!numLimpo) return '';
  return numLimpo.length <= 11 ? `55${numLimpo}` : numLimpo;
}

export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const numComDdi = formatarTelefoneWhatsApp(telefone);
  return `https://wa.me/${numComDdi}?text=${encodeURIComponent(mensagem)}`;
}

export function abrirWhatsApp(telefone: string, mensagem: string): void {
  const url = gerarLinkWhatsApp(telefone, mensagem);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}

// 1. CONFIRMAÇÃO DE PEDIDO (PDV / PENDENTE)
export function gerarMensagemConfirmacaoPedido(
  pedido: Pedido,
  nomeEmpresa: string = 'Disk Entrega & Conveniência'
): string {
  const codigo = pedido.codigo;
  const itensStr = pedido.itens
    .map(
      (item) =>
        `  • ${item.quantidade}x *${item.nomeProduto}* (${item.tipoVenda === 'COMPLETO' ? 'C/ Casco Novo' : 'Troca de Vasilhame'}) — R$ ${item.subtotal.toFixed(2)}`
    )
    .join('\n');

  const tempoEstimado =
    pedido.tipoEntrega === 'AGENDADA' && pedido.dataHoraEntregaAgendada
      ? `🗓️ *Entrega Agendada para:* ${new Date(pedido.dataHoraEntregaAgendada).toLocaleString('pt-BR')}`
      : `⏱️ *Previsão de Entrega:* 30 a 50 minutos`;

  let msg = `Olá, *${pedido.cliente.nome}*! 👋\n\n`;
  msg += `Aqui é da *${nomeEmpresa}*.\n`;
  msg += `Recebemos o seu pedido *${codigo}* com sucesso! 🎉\n\n`;
  msg += `📋 *Resumo do Pedido:*\n${itensStr}\n\n`;
  msg += `🛵 Taxa de Entrega: R$ ${pedido.taxaEntrega.toFixed(2)}\n`;
  if (pedido.desconto > 0) {
    msg += `🏷️ Desconto: -R$ ${pedido.desconto.toFixed(2)}\n`;
  }
  msg += `💰 *Total a Pagar: R$ ${pedido.total.toFixed(2)}*\n\n`;
  msg += `💳 *Forma de Pagamento:* ${pedido.formaPagamentoPrevista.replace('_', ' ')}\n`;
  if (pedido.trocoPara && pedido.formaPagamentoPrevista === 'DINHEIRO') {
    msg += `💵 *Troco para:* R$ ${pedido.trocoPara.toFixed(2)} (Devolver: R$ ${(pedido.trocoPara - pedido.total).toFixed(2)})\n`;
  }
  msg += `${tempoEstimado}\n\n`;
  msg += `📍 *Endereço de Entrega:*\n${pedido.cliente.endereco}, ${pedido.cliente.numero} - ${pedido.cliente.bairroNome}\n`;
  if (pedido.cliente.complemento) {
    msg += `Compl: ${pedido.cliente.complemento}\n`;
  }

  // Vasilhames para troca
  const vasilhamesTroca = pedido.itens.filter((it) => it.vasilhamesRecolhidosEsperados > 0);
  if (vasilhamesTroca.length > 0) {
    const totalCascos = vasilhamesTroca.reduce((acc, it) => acc + it.vasilhamesRecolhidosEsperados, 0);
    msg += `\n⚠️ *Lembrete:* Por favor, deixe separado(s) *${totalCascos} casco(s) vazio(s)* para troca com o entregador.\n`;
  }

  if (pedido.cashbackGanho && pedido.cashbackGanho > 0) {
    msg += `\n✨ *Você acumulou R$ ${pedido.cashbackGanho.toFixed(2)} em Cashback* nesta compra!`;
  }

  msg += `\n\nAssim que o entregador sair para rota, avisaremos você por aqui! Se precisar de algo, basta responder esta mensagem.`;
  return msg;
}

// 2. SAIU PARA ENTREGA (EM ROTA)
export function gerarMensagemSaiuParaEntrega(
  pedido: Pedido,
  nomeEmpresa: string = 'Disk Entrega & Conveniência'
): string {
  const codigo = pedido.codigo;
  let msg = `Olá, *${pedido.cliente.nome}*! 🛵💨\n\n`;
  msg += `Boas notícias da *${nomeEmpresa}*!\n`;
  msg += `O seu pedido *${codigo}* *ACABOU DE SAIR PARA ENTREGA* e está a caminho da sua residência!\n\n`;

  if (pedido.entregadorNome) {
    msg += `👤 *Entregador(a):* ${pedido.entregadorNome}\n`;
  }
  msg += `📍 *Destino:* ${pedido.cliente.endereco}, ${pedido.cliente.numero} - ${pedido.cliente.bairroNome}\n`;
  msg += `💰 *Valor a Pagar:* R$ ${pedido.total.toFixed(2)} (${pedido.formaPagamentoPrevista.replace('_', ' ')})\n\n`;

  // Vasilhames
  const vasilhamesTroca = pedido.itens.filter((it) => it.vasilhamesRecolhidosEsperados > 0);
  if (vasilhamesTroca.length > 0) {
    const totalCascos = vasilhamesTroca.reduce((acc, it) => acc + it.vasilhamesRecolhidosEsperados, 0);
    msg += `📦 Lembre-se de deixar separado(s) *${totalCascos} vasilhame(s) vazio(s)* para entrega ao motorista.\n\n`;
  }

  msg += `O entregador já está na sua região e chegará em poucos minutos. Fique atento(a) à campainha/portão! 🔔`;
  return msg;
}

// 3. ENTREGA CONCLUÍDA & PÓS-VENDA
export function gerarMensagemConclusaoEntrega(
  pedido: Pedido,
  nomeEmpresa: string = 'Disk Entrega & Conveniência'
): string {
  const codigo = pedido.codigo;
  let msg = `Olá, *${pedido.cliente.nome}*! ✅\n\n`;
  msg += `Confirmamos a entrega do seu pedido *${codigo}* pela *${nomeEmpresa}*!\n\n`;
  msg += `Esperamos que tenha tido uma excelente experiência com nosso atendimento e agilidade.\n\n`;

  if (pedido.cashbackGanho && pedido.cashbackGanho > 0) {
    msg += `🎁 *Saldo de Cashback Ganho:* R$ ${pedido.cashbackGanho.toFixed(2)} para usar no seu próximo pedido!\n\n`;
  }

  msg += `⭐ Como foi sua entrega hoje? Sua avaliação é muito importante para nós!\n\n`;
  msg += `Guarde nosso contato para seu próximo pedido de Gás e Água Mineral. Tenha um ótimo dia! 💙`;
  return msg;
}

// 4. FUNÇÃO POLIMÓRFICA RETROCOMPATÍVEL
export function gerarMensagemWhatsApp(
  pedido: Pedido,
  tipoOuNome?: 'AUTO' | 'CONFIRMACAO' | 'ROTA' | 'CONCLUIDO' | string,
  nomeEmpresaParam?: string
): string {
  let tipo: 'AUTO' | 'CONFIRMACAO' | 'ROTA' | 'CONCLUIDO' = 'AUTO';
  let nomeEmpresa = 'Disk Entrega & Conveniência';

  if (tipoOuNome === 'CONFIRMACAO' || tipoOuNome === 'ROTA' || tipoOuNome === 'CONCLUIDO' || tipoOuNome === 'AUTO') {
    tipo = tipoOuNome;
    if (nomeEmpresaParam) nomeEmpresa = nomeEmpresaParam;
  } else if (typeof tipoOuNome === 'string') {
    nomeEmpresa = tipoOuNome;
  }

  if (tipo === 'CONFIRMACAO') {
    return gerarMensagemConfirmacaoPedido(pedido, nomeEmpresa);
  }
  if (tipo === 'ROTA') {
    return gerarMensagemSaiuParaEntrega(pedido, nomeEmpresa);
  }
  if (tipo === 'CONCLUIDO') {
    return gerarMensagemConclusaoEntrega(pedido, nomeEmpresa);
  }

  // AUTO com base no status do pedido
  if (pedido.status === 'EM_ROTA') {
    return gerarMensagemSaiuParaEntrega(pedido, nomeEmpresa);
  }
  if (pedido.status === 'ENTREGUE' || pedido.status === 'CONCLUIDO') {
    return gerarMensagemConclusaoEntrega(pedido, nomeEmpresa);
  }
  return gerarMensagemConfirmacaoPedido(pedido, nomeEmpresa);
}
