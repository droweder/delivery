import React from 'react';
import { Pedido } from '../types';
import { formatarMoeda, formatarDataHora, imprimirComanda } from '../lib/thermalPrinter';
import { Printer, X, CheckCircle2, AlertTriangle, MapPin, Phone } from 'lucide-react';

interface Props {
  pedido: Pedido | null;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<Props> = ({ pedido, onClose }) => {
  if (!pedido) return null;

  return (
    <div
      id="thermal-receipt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-xs">Comanda Térmica (80mm)</h3>
              <p className="text-[10px] text-slate-500">Impressão física para rota do entregador</p>
            </div>
          </div>
          <button
            id="btn-close-thermal-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Receipt Simulation */}
        <div className="p-3 bg-slate-100 max-h-[65vh] overflow-y-auto">
          <div className="bg-white p-3.5 rounded-lg shadow-xs border border-slate-200 font-mono text-[11px] text-slate-800 space-y-2.5">
            <div className="text-center border-b border-dashed border-slate-300 pb-2">
              <div className="font-black text-xs tracking-wider uppercase text-slate-900">Logi-Gás Pro • Conveniência</div>
              <div className="text-[10px] text-slate-500">Água Mineral, Gás GLP & Bebidas</div>
              <div className="text-[10px] text-slate-500">WhatsApp / Tel: (11) 98765-4321</div>
            </div>

            <div className="flex justify-between font-black text-xs">
              <span>PEDIDO: {pedido.codigo}</span>
              <span className="font-normal text-[10px]">{formatarDataHora(pedido.criadoEm)}</span>
            </div>
            <div className="text-[10px]">
              <span className="font-black">STATUS: </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">{pedido.status}</span>
            </div>
            {pedido.entregadorNome && (
              <div className="text-[10px] bg-slate-50 p-1 rounded border border-slate-200">
                <span className="font-bold">ENTREGADOR: </span>
                {pedido.entregadorNome}
              </div>
            )}

            <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-0.5 text-[10px]">
              <div className="font-bold text-slate-900">DADOS DO CLIENTE:</div>
              <div><strong>Nome:</strong> {pedido.cliente.nome}</div>
              <div><strong>Tel:</strong> {pedido.cliente.telefone}</div>
              <div><strong>End:</strong> {pedido.cliente.endereco}, {pedido.cliente.numero}</div>
              {pedido.cliente.complemento && <div><strong>Compl:</strong> {pedido.cliente.complemento}</div>}
              <div><strong>Bairro:</strong> {pedido.cliente.bairroNome}</div>
              {pedido.cliente.referencia && <div className="text-amber-900 bg-amber-50 p-0.5 rounded"><strong>Ref:</strong> {pedido.cliente.referencia}</div>}
              <div className="text-[9px] text-slate-400">
                GPS: {pedido.cliente.lat.toFixed(5)}, {pedido.cliente.lng.toFixed(5)}
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-1">
              <div className="font-bold text-slate-900 text-[10px]">ITENS:</div>
              {pedido.itens.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>
                      {it.quantidade}x {it.nomeProduto}{' '}
                      <span className="text-[9px] text-slate-400">
                        ({it.tipoVenda === 'RECARGA' ? 'RECARGA' : 'COMPLETO'})
                      </span>
                    </span>
                    <span className="font-bold font-mono">{formatarMoeda(it.subtotal)}</span>
                  </div>
                  {it.vasilhamesRecolhidosEsperados > 0 && (
                    <div className="text-[9px] text-amber-800 bg-amber-50 px-1 py-0.2 rounded flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                      RECOLHER {it.vasilhamesRecolhidosEsperados} CASCO(S) {it.tipoVasilhame}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">{formatarMoeda(pedido.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxa Entrega ({pedido.cliente.bairroNome}):</span>
                <span className="font-mono">{formatarMoeda(pedido.taxaEntrega)}</span>
              </div>
              {pedido.desconto > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Desconto:</span>
                  <span className="font-mono">-{formatarMoeda(pedido.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs border-t border-slate-300 pt-1 text-slate-900">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono text-blue-700">{formatarMoeda(pedido.total)}</span>
              </div>
            </div>

            {/* Payment & Observations */}
            <div className="border-t border-dashed border-slate-300 pt-1.5 space-y-0.5 text-[10px]">
              <div>
                <strong>Forma de Pagamento:</strong>{' '}
                <span className="font-black text-blue-700">{pedido.formaPagamentoPrevista}</span>
              </div>
              {pedido.trocoPara && pedido.formaPagamentoPrevista === 'DINHEIRO' && (
                <div className="p-1 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                  <strong>Troco para:</strong> {formatarMoeda(pedido.trocoPara)} (Devolver{' '}
                  {formatarMoeda(pedido.trocoPara - pedido.total)})
                </div>
              )}
              {pedido.observacoes && (
                <div className="p-1 rounded bg-slate-100 text-slate-700">
                  <strong>Obs:</strong> {pedido.observacoes}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[9px] text-slate-400">
              <div>*** COMPROVANTE NÃO FISCAL - BACKUP ROTA ***</div>
              <div>Logi-Gás Pro • Impressão ESC/POS 80mm</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            id="btn-close-thermal-dialog"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>
          <button
            id="btn-print-thermal-receipt"
            onClick={() => imprimirComanda(pedido)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Comanda (ESC/POS)
          </button>
        </div>
      </div>
    </div>
  );
};
