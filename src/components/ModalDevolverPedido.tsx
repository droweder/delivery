import React, { useState } from 'react';
import { Pedido } from '../types';
import { RotateCcw, AlertTriangle, X, Check, ArrowLeft, MessageSquare, AlertCircle } from 'lucide-react';
import { formatarMoeda } from '../lib/thermalPrinter';

interface Props {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmarDevolucao: (pedidoId: string, motivo: string, observacao: string) => Promise<void>;
  nomeEntregador: string;
}

const MOTIVOS_PADRAO = [
  'Endereço divergente / Não localizado',
  'Cliente ausente / Não atende portaria ou telefone',
  'Valor divergente ou troco incorreto',
  'Cliente solicitou troca de produto (ex: gás por água)',
  'Cliente pediu cancelamento ou alteração na entrega',
  'Vasilhame do cliente impróprio / recusa na troca',
  'Outro motivo operacional',
];

export const ModalDevolverPedido: React.FC<Props> = ({
  pedido,
  isOpen,
  onClose,
  onConfirmarDevolucao,
  nomeEntregador,
}) => {
  if (!isOpen || !pedido) return null;

  const [motivoSelecionado, setMotivoSelecionado] = useState(MOTIVOS_PADRAO[0]);
  const [observacaoDetalhada, setObservacaoDetalhada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoSelecionado) {
      setErro('Por favor, selecione um motivo para a devolução.');
      return;
    }

    try {
      setEnviando(true);
      setErro(null);
      await onConfirmarDevolucao(pedido.id, motivoSelecionado, observacaoDetalhada);
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao processar a devolução do pedido');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 p-4 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Devolver Pedido para Correção</h3>
              <p className="text-[11px] text-amber-300">
                O pedido retornará para o emitente/atendente corrigir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Order Summary Card */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-400 text-sm">{pedido.codigo}</span>
              <span className="font-bold text-white text-sm">{formatarMoeda(pedido.total)}</span>
            </div>
            <div className="font-semibold text-slate-200">{pedido.cliente.nome}</div>
            <div className="text-[11px] text-slate-400">
              {pedido.cliente.endereco}, {pedido.cliente.numero} - {pedido.cliente.bairroNome}
            </div>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-700/60 flex items-center justify-between">
              <span>Emitido por: {pedido.emitidoPorNome || 'Atendente PDV'}</span>
              <span>Entregador: {nomeEntregador}</span>
            </div>
          </div>

          {/* Alert Notice */}
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Ao devolver este pedido, os itens serão estornados da sua carga de trânsito e o atendente
              receberá um aviso para realizar as correções necessárias e despachar novamente.
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Selecione o Motivo da Devolução:
            </label>
            <div className="space-y-1.5">
              {MOTIVOS_PADRAO.map((motivo) => {
                const isSelected = motivoSelecionado === motivo;
                return (
                  <button
                    type="button"
                    key={motivo}
                    onClick={() => setMotivoSelecionado(motivo)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-xs'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{motivo}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Note */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Observação Adicional do Entregador (Opcional):</span>
            </label>
            <textarea
              value={observacaoDetalhada}
              onChange={(e) => setObservacaoDetalhada(e.target.value)}
              placeholder="Ex: Cliente disse que o interfone quebrou e pediu para ligar no celular da filha (11) 99999-9999 antes de voltar..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {erro && (
            <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-2 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${enviando ? 'animate-spin' : ''}`} />
              <span>{enviando ? 'Devolvendo...' : 'Confirmar Devolução ao Emitente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
