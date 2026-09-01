import { Pedido } from '../types';

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export function formatarDataHora(isoString?: string): string {
  if (!isoString) return '--';
  const data = new Date(isoString);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function gerarTextoComandaTermica(pedido: Pedido): string {
  const linha = '========================================';
  const linhaDiv = '----------------------------------------';

  let txt = '';
  txt += `${linha}\n`;
  txt += `       DISK ENTREGA & CONVENIENCIA      \n`;
  txt += `        AGUA, GAS & BEBIDAS GELADAS     \n`;
  txt += `      TEL / WHATSAPP: (11) 98765-4321   \n`;
  txt += `${linha}\n`;
  txt += `PEDIDO: ${pedido.codigo}    DATA: ${formatarDataHora(pedido.criadoEm)}\n`;
  txt += `STATUS: ${pedido.status}\n`;

  if (pedido.tipoEntrega === 'AGENDADA' && pedido.dataHoraEntregaAgendada) {
    txt += `[!] ENTREGA AGENDADA: ${formatarDataHora(pedido.dataHoraEntregaAgendada)}\n`;
  } else {
    txt += `TIPO: ENTREGA IMEDIATA\n`;
  }

  if (pedido.entregadorNome) {
    txt += `ENTREGADOR: ${pedido.entregadorNome}\n`;
  }
  txt += `${linhaDiv}\n`;
  txt += `CLIENTE: ${pedido.cliente.nome}\n`;
  txt += `TEL: ${pedido.cliente.telefone}\n`;
  txt += `END: ${pedido.cliente.endereco}, ${pedido.cliente.numero}\n`;
  if (pedido.cliente.complemento) {
    txt += `COMPL: ${pedido.cliente.complemento}\n`;
  }
  txt += `BAIRRO: ${pedido.cliente.bairroNome}\n`;
  if (pedido.cliente.referencia) {
    txt += `REF: ${pedido.cliente.referencia}\n`;
  }
  txt += `GPS: ${pedido.cliente.lat.toFixed(6)}, ${pedido.cliente.lng.toFixed(6)}\n`;
  txt += `${linhaDiv}\n`;
  txt += `QTD  ITEM / DESCRICAO            VALOR\n`;
  txt += `${linhaDiv}\n`;

  pedido.itens.forEach((it) => {
    const desc = `${it.quantidade}x ${it.nomeProduto} (${it.tipoVenda === 'RECARGA' ? 'RECARGA' : 'COMPLETO'})`;
    const vlr = formatarMoeda(it.subtotal).padStart(10, ' ');
    txt += `${desc.slice(0, 28).padEnd(28, ' ')} ${vlr}\n`;
    if (it.vasilhamesRecolhidosEsperados > 0) {
      txt += `  [!] RECOLHER ${it.vasilhamesRecolhidosEsperados} CASCO(S) ${it.tipoVasilhame}\n`;
    }
  });

  txt += `${linhaDiv}\n`;
  txt += `SUBTOTAL:                    ${formatarMoeda(pedido.subtotal).padStart(12, ' ')}\n`;
  txt += `TAXA ENTREGA (${pedido.cliente.bairroNome}): ${formatarMoeda(pedido.taxaEntrega).padStart(10, ' ')}\n`;
  if (pedido.desconto > 0) {
    txt += `DESCONTO:                    ${formatarMoeda(pedido.desconto).padStart(12, ' ')}\n`;
  }
  txt += `TOTAL A PAGAR:               ${formatarMoeda(pedido.total).padStart(12, ' ')}\n`;
  txt += `${linhaDiv}\n`;

  if (pedido.pagamentosPrevistos && pedido.pagamentosPrevistos.length > 1) {
    txt += `FORMA PAGTO: MULTIPLAS FORMAS (${pedido.pagamentosPrevistos.length})\n`;
    pedido.pagamentosPrevistos.forEach((pg, i) => {
      txt += `  ${i + 1}. ${pg.forma}: ${formatarMoeda(pg.valor)}`;
      if (pg.forma === 'DINHEIRO' && pg.trocoPara) {
        txt += ` (Troco p/ ${formatarMoeda(pg.trocoPara)} -> Devolver ${formatarMoeda(pg.trocoPara - pg.valor)})`;
      }
      txt += `\n`;
    });
  } else {
    txt += `FORMA PAGTO: ${pedido.formaPagamentoPrevista}\n`;
    if (pedido.trocoPara && pedido.formaPagamentoPrevista === 'DINHEIRO') {
      const troco = pedido.trocoPara - pedido.total;
      txt += `PAGTO EM DINHEIRO: LEVAR TROCO P/ ${formatarMoeda(pedido.trocoPara)}\n`;
      txt += `VALOR DO TROCO A DEVOLVER: ${formatarMoeda(troco)}\n`;
    }
  }

  if (pedido.observacoes) {
    txt += `OBS: ${pedido.observacoes}\n`;
  }
  txt += `${linha}\n`;
  txt += `     OBRIGADO PELA PREFERENCIA!         \n`;
  txt += `   VIA DE ENTREGA / BACKUP IMPRESSO     \n`;
  txt += `${linha}\n\n\n`;

  return txt;
}

export function imprimirComanda(pedido: Pedido) {
  const printableHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Comanda - ${pedido.codigo}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.25;
            margin: 0;
            padding: 8px;
            width: 76mm;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 4px 0; }
          .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
          .flex-between { display: flex; justify-content: space-between; }
          .box-aviso { border: 1px solid #000; padding: 4px; margin: 4px 0; font-size: 11px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">DISK ENTREGA & CONVENIENCIA</div>
        <div class="center">Agua Mineral - Gas GLP - Bebidas</div>
        <div class="center">Tel / WhatsApp: (11) 98765-4321</div>
        <div class="double-divider"></div>
        
        <div class="flex-between bold">
          <span>PEDIDO: ${pedido.codigo}</span>
          <span>${formatarDataHora(pedido.criadoEm)}</span>
        </div>
        <div><strong>Status:</strong> ${pedido.status}</div>
        ${
          pedido.tipoEntrega === 'AGENDADA' && pedido.dataHoraEntregaAgendada
            ? `<div class="box-aviso">⏰ ENTREGA AGENDADA: ${formatarDataHora(pedido.dataHoraEntregaAgendada)}</div>`
            : '<div><strong>Entrega:</strong> Imediata</div>'
        }
        ${pedido.entregadorNome ? `<div><strong>Entregador:</strong> ${pedido.entregadorNome}</div>` : ''}
        
        <div class="divider"></div>
        <div><strong>CLIENTE:</strong> ${pedido.cliente.nome}</div>
        <div><strong>TEL:</strong> ${pedido.cliente.telefone}</div>
        <div><strong>END:</strong> ${pedido.cliente.endereco}, ${pedido.cliente.numero}</div>
        ${pedido.cliente.complemento ? `<div><strong>COMPL:</strong> ${pedido.cliente.complemento}</div>` : ''}
        <div><strong>BAIRRO:</strong> ${pedido.cliente.bairroNome}</div>
        ${pedido.cliente.referencia ? `<div><strong>REF:</strong> ${pedido.cliente.referencia}</div>` : ''}
        <div style="font-size: 10px;"><strong>GPS:</strong> ${pedido.cliente.lat.toFixed(5)}, ${pedido.cliente.lng.toFixed(5)}</div>
        
        <div class="divider"></div>
        <div class="bold">ITENS:</div>
        ${pedido.itens
          .map(
            (it) => `
          <div class="flex-between">
            <span>${it.quantidade}x ${it.nomeProduto} <small>(${it.tipoVenda === 'RECARGA' ? 'RECARGA' : 'COMPLETO'})</small></span>
            <span>${formatarMoeda(it.subtotal)}</span>
          </div>
          ${
            it.vasilhamesRecolhidosEsperados > 0
              ? `<div class="box-aviso">[!] RECOLHER ${it.vasilhamesRecolhidosEsperados} CASCO(S) VAZIO(S) ${it.tipoVasilhame}</div>`
              : ''
          }
        `
          )
          .join('')}
        
        <div class="divider"></div>
        <div class="flex-between"><span>Subtotal:</span><span>${formatarMoeda(pedido.subtotal)}</span></div>
        <div class="flex-between"><span>Taxa Entrega (${pedido.cliente.bairroNome}):</span><span>${formatarMoeda(pedido.taxaEntrega)}</span></div>
        ${pedido.desconto > 0 ? `<div class="flex-between"><span>Desconto:</span><span>-${formatarMoeda(pedido.desconto)}</span></div>` : ''}
        <div class="double-divider"></div>
        <div class="flex-between bold" style="font-size: 14px;">
          <span>TOTAL:</span>
          <span>${formatarMoeda(pedido.total)}</span>
        </div>
        
        <div class="divider"></div>
        ${
          pedido.pagamentosPrevistos && pedido.pagamentosPrevistos.length > 1
            ? `
          <div class="bold">FORMA DE PAGTO: MULTIPLAS (${pedido.pagamentosPrevistos.length})</div>
          ${pedido.pagamentosPrevistos
            .map(
              (p) => `
            <div class="flex-between" style="font-size: 11px;">
              <span>• ${p.forma}:</span>
              <span>${formatarMoeda(p.valor)}</span>
            </div>
            ${
              p.forma === 'DINHEIRO' && p.trocoPara
                ? `<div style="font-size: 10px; padding-left: 8px;">Troco p/ ${formatarMoeda(p.trocoPara)} (Devolver: ${formatarMoeda(p.trocoPara - p.valor)})</div>`
                : ''
            }
          `
            )
            .join('')}
        `
            : `
          <div class="bold">FORMA DE PAGAMENTO: ${pedido.formaPagamentoPrevista}</div>
          ${
            pedido.trocoPara && pedido.formaPagamentoPrevista === 'DINHEIRO'
              ? `<div class="box-aviso">LEVAR TROCO P/ ${formatarMoeda(pedido.trocoPara)} (TROCO: ${formatarMoeda(pedido.trocoPara - pedido.total)})</div>`
              : ''
          }
        `
        }
        ${pedido.observacoes ? `<div><strong>OBS:</strong> ${pedido.observacoes}</div>` : ''}
        
        <div class="double-divider"></div>
        <div class="center" style="font-size: 10px;">Via de Backup Impresso para o Entregador</div>
        <div class="center bold">Obrigado pela Preferencia!</div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(printableHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
