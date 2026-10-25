import { Pedido } from '../types';

export function gerarMensagemWhatsApp(pedido: Pedido, nomeEmpresa: string = 'Delivery'): string {
  const codigo = pedido.codigo;
  const statusStr =
    pedido.status === 'PENDENTE'
      ? '📦 Pedido Recebido e em Preparação'
      : pedido.status === 'EM_ROTA'
      ? '🛵 Saiu para Entrega!'
      : pedido.status === 'ENTREGUE' || pedido.status === 'CONCLUIDO'
      ? '✅ Pedido Entregue com Sucesso'
      : pedido.status === 'CANCELADO'
      ? '❌ Pedido Cancelado'
      : '📦 Status Atualizado';

  let itensStr = pedido.itens
    .map((item) => `• ${item.quantidade}x ${item.nomeProduto} (${item.tipoVenda === 'COMPLETO' ? 'C/ Casco' : 'Recarga'}) - R$ ${item.subtotal.toFixed(2)}`)
    .join('\n');

  let msg = `Olá, *${pedido.cliente.nome}*!\n\n`;
  msg += `Aqui é da *${nomeEmpresa}*.\n`;
  msg += `Acompanhamento do seu Pedido *${codigo}*:\n\n`;
  msg += `Status: *${statusStr}*\n\n`;
  msg += `*Itens do Pedido:*\n${itensStr}\n\n`;
  msg += `Taxa de Entrega: R$ ${pedido.taxaEntrega.toFixed(2)}\n`;
  if (pedido.desconto > 0) {
    msg += `Desconto: -R$ ${pedido.desconto.toFixed(2)}\n`;
  }
  msg += `*Total: R$ ${pedido.total.toFixed(2)}*\n\n`;
  msg += `Forma de Pagamento: *${pedido.formaPagamentoPrevista.replace('_', ' ')}*\n`;

  if (pedido.entregadorNome) {
    msg += `Entregador Responsável: *${pedido.entregadorNome}*\n`;
  }

  if (pedido.cashbackGanho && pedido.cashbackGanho > 0) {
    msg += `\n✨ *Você acumulou R$ ${pedido.cashbackGanho.toFixed(2)} em Cashback* nesta compra!`;
  }

  msg += `\n\nAgradecemos a preferência! Se precisar de algo, basta responder esta mensagem.`;

  return msg;
}

export function abrirWhatsApp(telefone: string, mensagem: string) {
  const numLimpo = telefone.replace(/\D/g, '');
  const numComDdi = numLimpo.length <= 11 ? `55${numLimpo}` : numLimpo;
  const url = `https://wa.me/${numComDdi}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, '_blank');
}
