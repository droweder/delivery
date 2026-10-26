import React, { useState, useEffect } from 'react';
import {
  CascoItemRecolhimento,
  EstadoCasco,
  FormaPagamento,
  PagamentoItem,
  Pedido,
  TipoVasilhame,
} from '../types';
import { formatarMoeda } from '../lib/thermalPrinter';
import {
  Flame,
  Droplet,
  Package,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Split,
  Plus,
  Trash2,
  X,
  FileText,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Info,
  MessageCircle,
} from 'lucide-react';
import { abrirWhatsApp, gerarMensagemWhatsApp } from '../utils/whatsapp';

interface Props {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmarBaixa: (dados: {
    formaPagamentoRealizada: FormaPagamento;
    pagamentosRealizados?: PagamentoItem[];
    valorRecebido: number;
    trocoDevolvido: number;
    vasilhamesRecolhidos: { P13: number; P20L: number; [key: string]: number };
    vasilhamesPendentes: { P13: number; P20L: number; [key: string]: number };
    cascosDetalhados: CascoItemRecolhimento[];
    observacaoEntrega: string;
    totalAjustado?: number;
  }) => Promise<void>;
  nomeOperadorOuEntregador?: string;
  isOffline?: boolean;
}

const MARCAS_GLP_POPULARES = [
  'Ultragaz',
  'Liquigás',
  'Nacional',
  'Supergasbras',
  'Consigaz',
  'Copagaz',
  'Outra Marca',
];

const VALORES_CASCO_PADRAO: Record<string, number> = {
  P13: 180,
  P45: 450,
  P20L: 35,
};

// Extrai inteligentemente os cascos esperados de qualquer pedido
export function extrairCascosDoPedido(pedido: Pedido): CascoItemRecolhimento[] {
  const cascos: CascoItemRecolhimento[] = [];

  pedido.itens.forEach((it, idx) => {
    const nomeLower = (it.nomeProduto || '').toLowerCase();
    const isGas =
      it.categoria === 'GAS' ||
      nomeLower.includes('gás') ||
      nomeLower.includes('glp') ||
      it.tipoVasilhame === 'P13' ||
      it.tipoVasilhame === 'P45';
    const isAgua =
      it.categoria === 'AGUA' ||
      nomeLower.includes('água') ||
      nomeLower.includes('agua') ||
      nomeLower.includes('galao') ||
      nomeLower.includes('galão') ||
      it.tipoVasilhame === 'P20L';
    const isBebidaRetornavel =
      nomeLower.includes('retornável') ||
      nomeLower.includes('retornavel') ||
      nomeLower.includes('vasilhame') ||
      nomeLower.includes('litrão') ||
      nomeLower.includes('litrao') ||
      nomeLower.includes('600ml');

    const exigeCasco =
      it.vasilhamesRecolhidosEsperados > 0 ||
      (it.tipoVenda === 'RECARGA' && (it.tipoVasilhame !== 'NENHUM' || isGas || isAgua || isBebidaRetornavel));

    if (exigeCasco) {
      let nomeCasco = 'Casco Retornável';
      let tipoV: TipoVasilhame | string = it.tipoVasilhame || 'OUTRO';

      if (it.tipoVasilhame === 'P13' || nomeLower.includes('13kg') || (isGas && !nomeLower.includes('45'))) {
        nomeCasco = 'Botijão GLP 13kg (Casco P13)';
        tipoV = 'P13';
      } else if (it.tipoVasilhame === 'P45' || nomeLower.includes('45kg') || (isGas && nomeLower.includes('45'))) {
        nomeCasco = 'Cilindro GLP 45kg (Casco P45)';
        tipoV = 'P45';
      } else if (it.tipoVasilhame === 'P20L' || isAgua || nomeLower.includes('20l')) {
        nomeCasco = 'Galão Mineral 20L (Casco 20L)';
        tipoV = 'P20L';
      } else if (isBebidaRetornavel) {
        nomeCasco = `Garrafa Retornável (${it.nomeProduto.split(' ')[0]})`;
        tipoV = 'OUTRO';
      }

      cascos.push({
        id: `casco_${it.id || idx}_${Date.now()}`,
        itemId: it.id,
        produtoId: it.produtoId,
        nomeProduto: it.nomeProduto,
        tipoVasilhame: tipoV,
        nomeCasco,
        quantidadeEsperada: it.quantidade,
        quantidadeRecolhida: it.quantidade, // Pré-preenchido por padrão para agilizar a baixa
        quantidadePendente: 0,
        estadoCasco: 'PERFEITO',
        marcaCasco: 'Padrão Base',
        motivoPendente: '',
        valorCascoCobrado: 0,
      });
    }
  });

  return cascos;
}

export const ModalBaixaEntrega: React.FC<Props> = ({
  pedido,
  isOpen,
  onClose,
  onConfirmarBaixa,
  nomeOperadorOuEntregador,
  isOffline = false,
}) => {
  if (!isOpen || !pedido) return null;

  // Estados de Pagamento
  const [modoMultiploBaixa, setModoMultiploBaixa] = useState(false);
  const [formaPagtoRealizada, setFormaPagtoRealizada] = useState<FormaPagamento>(
    pedido.formaPagamentoPrevista || 'DINHEIRO'
  );
  const [pagamentosBaixa, setPagamentosBaixa] = useState<PagamentoItem[]>([]);
  const [valorRecebido, setValorRecebido] = useState<number>(pedido.trocoPara || pedido.total);
  const [obsEntrega, setObsEntrega] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(false);

  // Estados de Dinâmica de Cascos
  const [cascosLista, setCascosLista] = useState<CascoItemRecolhimento[]>([]);

  // Inicialização ao abrir modal
  useEffect(() => {
    if (!pedido) return;

    // Configuração de Pagamento
    if (pedido.pagamentosPrevistos && pedido.pagamentosPrevistos.length > 0) {
      setPagamentosBaixa(pedido.pagamentosPrevistos.map((p) => ({ ...p })));
      setModoMultiploBaixa(pedido.pagamentosPrevistos.length > 1);
      setFormaPagtoRealizada(pedido.pagamentosPrevistos[0]?.forma || pedido.formaPagamentoPrevista);
      const primeiroDinheiro = pedido.pagamentosPrevistos.find((p) => p.forma === 'DINHEIRO');
      setValorRecebido(primeiroDinheiro?.trocoPara || pedido.total);
    } else {
      setPagamentosBaixa([
        {
          id: 'pg_1',
          forma: pedido.formaPagamentoPrevista,
          valor: pedido.total,
          trocoPara: pedido.trocoPara,
        },
      ]);
      setModoMultiploBaixa(false);
      setFormaPagtoRealizada(pedido.formaPagamentoPrevista);
      setValorRecebido(pedido.trocoPara || pedido.total);
    }

    // Extrai cascos do pedido
    const cascosExtraidos = extrairCascosDoPedido(pedido);
    setCascosLista(cascosExtraidos);
    setObsEntrega('');
  }, [pedido]);

  // Total de Acréscimo se houver cobrança avulsa de casco
  const valorTotalCascosCobrados = cascosLista.reduce(
    (acc, c) => acc + (Number(c.valorCascoCobrado) || 0),
    0
  );
  const totalFinalPedido = pedido.total + valorTotalCascosCobrados;

  // Funções de manipulação de cascos
  const alterarQtdRecolhida = (index: number, novaQtd: number) => {
    setCascosLista((prev) => {
      const clone = [...prev];
      const item = { ...clone[index] };
      const qtdValida = Math.max(0, novaQtd);
      item.quantidadeRecolhida = qtdValida;
      item.quantidadePendente = Math.max(0, item.quantidadeEsperada - qtdValida);

      // Se não houver mais pendência, zera cobrança de casco e motivo
      if (item.quantidadePendente === 0) {
        item.motivoPendente = '';
        item.valorCascoCobrado = 0;
      }
      clone[index] = item;
      return clone;
    });
  };

  const alterarEstadoCasco = (index: number, estado: EstadoCasco) => {
    setCascosLista((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], estadoCasco: estado };
      return clone;
    });
  };

  const alterarMarcaCasco = (index: number, marca: string) => {
    setCascosLista((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], marcaCasco: marca };
      return clone;
    });
  };

  const alterarMotivoPendente = (index: number, motivo: string) => {
    setCascosLista((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], motivoPendente: motivo };
      return clone;
    });
  };

  const toggleCobrarCascoNoAto = (index: number, cobrar: boolean) => {
    setCascosLista((prev) => {
      const clone = [...prev];
      const item = { ...clone[index] };
      if (cobrar) {
        const valorUnitario = VALORES_CASCO_PADRAO[item.tipoVasilhame] || 180;
        item.valorCascoCobrado = valorUnitario * item.quantidadePendente;
        item.motivoPendente = 'Casco cobrado no ato do cliente (+ R$ ' + item.valorCascoCobrado + ')';
      } else {
        item.valorCascoCobrado = 0;
        item.motivoPendente = 'Vale-Casco gerado (recolher na próxima rota)';
      }
      clone[index] = item;
      return clone;
    });
  };

  const recolherTodosCascos100 = () => {
    setCascosLista((prev) =>
      prev.map((c) => ({
        ...c,
        quantidadeRecolhida: c.quantidadeEsperada,
        quantidadePendente: 0,
        motivoPendente: '',
        valorCascoCobrado: 0,
        estadoCasco: 'PERFEITO',
      }))
    );
  };

  // Funções de manipulação de pagamentos
  const handleAddPagamentoBaixa = (formaPadrao: FormaPagamento = 'PIX') => {
    const somaAtual = pagamentosBaixa.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    const restante = Math.max(0, parseFloat((totalFinalPedido - somaAtual).toFixed(2)));
    setPagamentosBaixa((prev) => [
      ...prev,
      {
        id: `pg_bx_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        forma: formaPadrao,
        valor: restante,
        trocoPara: undefined,
      },
    ]);
  };

  const handleRemoverPagamentoBaixa = (index: number) => {
    if (pagamentosBaixa.length <= 1) return;
    setPagamentosBaixa((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAlterarPagamentoBaixa = (
    index: number,
    campo: keyof PagamentoItem,
    valor: any
  ) => {
    setPagamentosBaixa((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [campo]: valor };
      return clone;
    });
  };

  const handlePreencherRestanteBaixa = (index: number) => {
    const outrosSoma = pagamentosBaixa.reduce(
      (acc, p, i) => (i === index ? acc : acc + (Number(p.valor) || 0)),
      0
    );
    const restante = Math.max(0, totalFinalPedido - outrosSoma);
    handleAlterarPagamentoBaixa(index, 'valor', parseFloat(restante.toFixed(2)));
  };

  // Submissão da Baixa
  const handleSubmitBaixa = async () => {
    setSalvando(true);
    try {
      let pagamentosRealizadosPayload: PagamentoItem[] | undefined = undefined;
      let formaRealizadaFinal: FormaPagamento = formaPagtoRealizada;
      let trocoFinal = 0;

      if (modoMultiploBaixa) {
        const validos = pagamentosBaixa.filter((p) => Number(p.valor) > 0);
        if (validos.length === 0) {
          alert('Informe ao menos uma forma de pagamento com valor!');
          setSalvando(false);
          return;
        }
        pagamentosRealizadosPayload = validos.map((p) => ({
          forma: p.forma,
          valor: Number(p.valor),
          trocoPara: p.forma === 'DINHEIRO' && p.trocoPara ? Number(p.trocoPara) : undefined,
          observacao: p.observacao,
        }));
        formaRealizadaFinal = pagamentosRealizadosPayload[0]?.forma || 'DINHEIRO';
        const dinheiroItem = pagamentosRealizadosPayload.find((p) => p.forma === 'DINHEIRO');
        if (dinheiroItem && dinheiroItem.trocoPara) {
          trocoFinal = Math.max(0, dinheiroItem.trocoPara - dinheiroItem.valor);
        }
      } else {
        formaRealizadaFinal = formaPagtoRealizada;
        trocoFinal =
          formaPagtoRealizada === 'DINHEIRO'
            ? Math.max(0, (Number(valorRecebido) || 0) - totalFinalPedido)
            : 0;
        pagamentosRealizadosPayload = [
          {
            forma: formaPagtoRealizada,
            valor: totalFinalPedido,
            trocoPara:
              formaPagtoRealizada === 'DINHEIRO' && valorRecebido > totalFinalPedido
                ? Number(valorRecebido)
                : undefined,
          },
        ];
      }

      // Prepara dicionário consolidado de vasilhames
      let p13Rec = 0;
      let p13Pend = 0;
      let p20Rec = 0;
      let p20Pend = 0;

      cascosLista.forEach((c) => {
        if (c.tipoVasilhame === 'P13') {
          p13Rec += c.quantidadeRecolhida;
          p13Pend += c.quantidadePendente;
        } else if (c.tipoVasilhame === 'P20L') {
          p20Rec += c.quantidadeRecolhida;
          p20Pend += c.quantidadePendente;
        }
      });

      await onConfirmarBaixa({
        formaPagamentoRealizada: formaRealizadaFinal,
        pagamentosRealizados: pagamentosRealizadosPayload,
        valorRecebido: Number(valorRecebido) || totalFinalPedido,
        trocoDevolvido: trocoFinal,
        vasilhamesRecolhidos: { P13: p13Rec, P20L: p20Rec },
        vasilhamesPendentes: { P13: p13Pend, P20L: p20Pend },
        cascosDetalhados: cascosLista,
        observacaoEntrega: obsEntrega,
        totalAjustado: totalFinalPedido,
      });

      if (enviarWhatsApp && pedido.cliente?.telefone) {
        abrirWhatsApp(pedido.cliente.telefone, gerarMensagemWhatsApp(pedido, 'CONCLUIDO'));
      }

      onClose();
    } catch (err: any) {
      alert('Erro ao confirmar baixa: ' + (err.message || err));
    } finally {
      setSalvando(false);
    }
  };

  const totalCascosEsperados = cascosLista.reduce((acc, c) => acc + c.quantidadeEsperada, 0);
  const totalCascosRecolhidos = cascosLista.reduce((acc, c) => acc + c.quantidadeRecolhida, 0);
  const totalCascosPendentes = cascosLista.reduce((acc, c) => acc + c.quantidadePendente, 0);

  const clienteTemDebitoAnterior =
    (pedido.cliente.vasilhamesPendentes?.P13 || 0) > 0 ||
    (pedido.cliente.vasilhamesPendentes?.P20L || 0) > 0;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-[#eaecf0] dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-black">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-[10px] tracking-wide">
                  BAIXA & RECOLHIMENTO
                </span>
                {isOffline && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                    ⚡ Modo Offline
                  </span>
                )}
              </div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Baixa do Pedido {pedido.codigo}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Informações do Cliente */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                {pedido.cliente.nome}
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                {pedido.cliente.telefone}
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 text-xs">
              {pedido.cliente.endereco}, {pedido.cliente.numero} •{' '}
              <strong>{pedido.cliente.bairroNome}</strong>
            </div>

            {/* Alerta de Vales-Casco Anteriores do Cliente */}
            {clienteTemDebitoAnterior && (
              <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 flex items-center gap-1.5 font-bold text-[11px]">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Cliente possui <strong>{pedido.cliente.vasilhamesPendentes.P13}x P13</strong> e{' '}
                  <strong>{pedido.cliente.vasilhamesPendentes.P20L}x 20L</strong> pendentes de entregas anteriores!
                </span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SEÇÃO PRINCIPAL: DINÂMICA DE RECOLHIMENTO DE CASCOS / VASILHAMES */}
          {/* ========================================================================= */}
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900/60 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-blue-200 dark:border-blue-900/40">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                  Controle & Recolhimento de Cascos
                </span>
              </div>

              {totalCascosEsperados > 0 && (
                <button
                  type="button"
                  onClick={recolherTodosCascos100}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>100% Recolhido</span>
                </button>
              )}
            </div>

            {cascosLista.length === 0 ? (
              /* Pedido sem cascos retornáveis */
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">Sem Cascos Retornáveis</div>
                  <div className="text-[11px] opacity-90">
                    Este pedido não contém produtos com vasilhames retornáveis para recolhimento.
                  </div>
                </div>
              </div>
            ) : (
              /* Lista de Produtos com Casco e suas quantidades */
              <div className="space-y-3">
                {cascosLista.map((casco, idx) => {
                  const isGas = casco.tipoVasilhame === 'P13' || casco.tipoVasilhame === 'P45';
                  const isAgua = casco.tipoVasilhame === 'P20L';

                  return (
                    <div
                      key={casco.id || idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5"
                    >
                      {/* Casco Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isGas
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : isAgua
                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            }`}
                          >
                            {isGas ? (
                              <Flame className="w-4 h-4" />
                            ) : isAgua ? (
                              <Droplet className="w-4 h-4" />
                            ) : (
                              <Package className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 dark:text-white text-xs">
                              {casco.nomeCasco}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              Produto: {casco.nomeProduto}
                            </div>
                          </div>
                        </div>

                        {/* Badge de Quantidade Esperada */}
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10px]">
                            Esperado: {casco.quantidadeEsperada} un
                          </span>
                        </div>
                      </div>

                      {/* Contador de Cascos Recolhidos */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          Cascos Recolhidos do Cliente:
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => alterarQtdRecolhida(idx, casco.quantidadeRecolhida - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-black text-sm flex items-center justify-center text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={casco.quantidadeRecolhida}
                            onChange={(e) =>
                              alterarQtdRecolhida(idx, parseInt(e.target.value) || 0)
                            }
                            className="w-12 h-7 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-center font-black text-slate-900 dark:text-white text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => alterarQtdRecolhida(idx, casco.quantidadeRecolhida + 1)}
                            className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-black text-sm flex items-center justify-center text-slate-800 dark:text-slate-200 transition-colors"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => alterarQtdRecolhida(idx, casco.quantidadeEsperada)}
                            className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px] transition-colors"
                          >
                            Todos ({casco.quantidadeEsperada})
                          </button>
                        </div>
                      </div>

                      {/* Status de Recolhimento */}
                      <div className="flex items-center justify-between text-[11px]">
                        {casco.quantidadeRecolhida >= casco.quantidadeEsperada ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            100% dos cascos recolhidos ({casco.quantidadeRecolhida} de {casco.quantidadeEsperada})
                          </span>
                        ) : (
                          <span className="text-amber-800 dark:text-amber-300 font-extrabold flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Falta recolher {casco.quantidadePendente} casco(s)!
                          </span>
                        )}
                      </div>

                      {/* DINÂMICA DE CASCO FALTANTE / PENDENTE */}
                      {casco.quantidadePendente > 0 && (
                        <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/80 space-y-2">
                          <div className="font-bold text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Ação para os {casco.quantidadePendente} casco(s) faltante(s):</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {/* Opção 1: Gerar Vale-Casco (Fiado de Vasilhame) */}
                            <button
                              type="button"
                              onClick={() => toggleCobrarCascoNoAto(idx, false)}
                              className={`p-2 rounded-lg border text-left transition-all ${
                                !casco.valorCascoCobrado
                                  ? 'bg-amber-100 dark:bg-amber-900/60 border-amber-500 text-amber-950 dark:text-amber-100 font-bold shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="font-extrabold text-[11px]">📋 Gerar Vale-Casco</div>
                              <div className="text-[10px] opacity-80">
                                Débito na ficha do cliente para recolher depois
                              </div>
                            </button>

                            {/* Opção 2: Cobrar Casco no Ato (Venda Completa) */}
                            <button
                              type="button"
                              onClick={() => toggleCobrarCascoNoAto(idx, true)}
                              className={`p-2 rounded-lg border text-left transition-all ${
                                (casco.valorCascoCobrado || 0) > 0
                                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-950 dark:text-emerald-100 font-bold shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="font-extrabold text-[11px]">
                                💰 Cobrar Casco (+ {formatarMoeda((VALORES_CASCO_PADRAO[casco.tipoVasilhame] || 180) * casco.quantidadePendente)})
                              </div>
                              <div className="text-[10px] opacity-80">
                                Cliente comprou o casco novo no ato
                              </div>
                            </button>
                          </div>

                          {/* Se for Vale-Casco, seleciona o motivo da pendência */}
                          {!casco.valorCascoCobrado && (
                            <div className="space-y-1 pt-1 border-t border-amber-200 dark:border-amber-900/40">
                              <label className="text-[10px] font-bold text-amber-900 dark:text-amber-200">
                                Motivo do não recolhimento:
                              </label>
                              <select
                                value={casco.motivoPendente || 'Cliente devolverá na base'}
                                onChange={(e) => alterarMotivoPendente(idx, e.target.value)}
                                className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 font-bold text-slate-800 dark:text-slate-200 text-xs"
                              >
                                <option value="Cliente devolverá na base">
                                  Cliente prometeu levar o casco na base
                                </option>
                                <option value="Não tinha casco no momento (recolher na próxima rota)">
                                  Não tinha casco no momento (recolher na próxima entrega)
                                </option>
                                <option value="Emprestado / Comprovante emitido">
                                  Emprestado / Comprovante emitido
                                </option>
                                <option value="Casco danificado recusado pelo entregador">
                                  Casco do cliente furado/danificado (recusado pelo entregador)
                                </option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CONTROLE DE ESTADO & MARCA DO CASCO RECOLHIDO */}
                      {casco.quantidadeRecolhida > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            <span>Estado do Casco Recolhido:</span>
                            <span>Marca / Bandeira:</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(
                              [
                                ['PERFEITO', '🟢 Perfeito', 'bg-emerald-50 text-emerald-800 border-emerald-300'],
                                ['OUTRA_MARCA', '🟡 Outra Marca (Troca)', 'bg-amber-50 text-amber-800 border-amber-300'],
                                ['AVARIADO', '🔴 Avariado / Amassado', 'bg-rose-50 text-rose-800 border-rose-300'],
                                ['VENCIDO', '⏰ Vencido (+3 anos)', 'bg-purple-50 text-purple-800 border-purple-300'],
                              ] as const
                            ).map(([est, label, classes]) => (
                              <button
                                key={est}
                                type="button"
                                onClick={() => alterarEstadoCasco(idx, est)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                                  casco.estadoCasco === est
                                    ? 'ring-2 ring-blue-500 font-black shadow-xs ' + classes
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          {/* Se for outra marca ou gás, exibe seletor de marcas de botijão */}
                          {casco.estadoCasco === 'OUTRA_MARCA' && isGas && (
                            <div className="flex items-center gap-1 flex-wrap pt-1">
                              <span className="text-[10px] text-slate-500 font-bold">Marca recebida:</span>
                              {MARCAS_GLP_POPULARES.map((marca) => (
                                <button
                                  key={marca}
                                  type="button"
                                  onClick={() => alterarMarcaCasco(idx, marca)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                    casco.marcaCasco === marca
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {marca}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SEÇÃO DE PAGAMENTO & COBRANÇA */}
          {/* ========================================================================= */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Forma de Pagamento Recebida:</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  const novoModo = !modoMultiploBaixa;
                  setModoMultiploBaixa(novoModo);
                  if (novoModo && pagamentosBaixa.length === 0) {
                    setPagamentosBaixa([
                      { id: 'pg_bx_1', forma: formaPagtoRealizada, valor: totalFinalPedido },
                    ]);
                  }
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                  modoMultiploBaixa
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                }`}
              >
                <Split className="w-3 h-3" />
                <span>{modoMultiploBaixa ? '✓ Múltiplas Formas' : '+ Dividir / Alterar'}</span>
              </button>
            </div>

            {/* Total a cobrar com cascos extras se houver */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">
              <span className="text-slate-700 dark:text-slate-300">Total Final a Cobrar:</span>
              <div className="text-right">
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-base font-mono">
                  {formatarMoeda(totalFinalPedido)}
                </span>
                {valorTotalCascosCobrados > 0 && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold">
                    (Inclui {formatarMoeda(valorTotalCascosCobrados)} de cascos comprados no ato)
                  </span>
                )}
              </div>
            </div>

            {!modoMultiploBaixa ? (
              /* Modo Pagamento Único */
              <div className="space-y-2">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
                  {(
                    [
                      ['DINHEIRO', 'Dinheiro'],
                      ['PIX', 'Pix'],
                      ['CARTAO_DEBITO', 'Débito'],
                      ['CARTAO_CREDITO', 'Crédito'],
                      ['A_PRAZO_FIADO', 'Fiado'],
                    ] as const
                  ).map(([tipo, label]) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        setFormaPagtoRealizada(tipo);
                        setPagamentosBaixa([
                          { id: 'pg_bx_1', forma: tipo, valor: totalFinalPedido },
                        ]);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        formaPagtoRealizada === tipo
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {formaPagtoRealizada === 'DINHEIRO' && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        Valor Recebido em Dinheiro:
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-amber-800 dark:text-amber-300">R$</span>
                        <input
                          type="number"
                          value={valorRecebido || ''}
                          onChange={(e) => setValorRecebido(Number(e.target.value))}
                          className="w-24 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 font-black text-right text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200 pt-1 border-t border-amber-200 dark:border-amber-800/40">
                      <span>Troco a Devolver:</span>
                      <span className="text-sm font-black text-amber-800 dark:text-amber-300 font-mono">
                        {formatarMoeda(Math.max(0, valorRecebido - totalFinalPedido))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Modo Dividido / Múltiplas Formas */
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-200">
                  <span>Valores Recebidos por Forma:</span>
                  <span className="font-mono">Total: {formatarMoeda(totalFinalPedido)}</span>
                </div>

                <div className="space-y-1.5">
                  {pagamentosBaixa.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-purple-200 dark:border-purple-800/50 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <select
                          value={item.forma}
                          onChange={(e) =>
                            handleAlterarPagamentoBaixa(idx, 'forma', e.target.value as FormaPagamento)
                          }
                          className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs font-bold bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 shrink-0"
                        >
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="PIX">Pix</option>
                          <option value="CARTAO_DEBITO">Débito</option>
                          <option value="CARTAO_CREDITO">Crédito</option>
                          <option value="A_PRAZO_FIADO">Fiado</option>
                        </select>

                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">
                            R$
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor || ''}
                            onChange={(e) =>
                              handleAlterarPagamentoBaixa(
                                idx,
                                'valor',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0,00"
                            className="w-full pl-7 pr-2 py-1 rounded border border-slate-300 dark:border-slate-600 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handlePreencherRestanteBaixa(idx)}
                          className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/60 hover:bg-purple-200 text-purple-900 dark:text-purple-200 text-[10px] font-bold border border-purple-300 dark:border-purple-700 shrink-0 transition-colors"
                        >
                          Restante
                        </button>

                        {pagamentosBaixa.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoverPagamentoBaixa(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {item.forma === 'DINHEIRO' && (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700 text-[10px]">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            Nota recebida (Troco):
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-500">R$</span>
                            <input
                              type="number"
                              value={item.trocoPara || ''}
                              onChange={(e) =>
                                handleAlterarPagamentoBaixa(
                                  idx,
                                  'trocoPara',
                                  e.target.value ? Number(e.target.value) : undefined
                                )
                              }
                              placeholder="0,00"
                              className="w-16 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddPagamentoBaixa('PIX')}
                    className="flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar outra forma</span>
                  </button>

                  {/* Cobertura */}
                  {(() => {
                    const soma = pagamentosBaixa.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
                    const dif = totalFinalPedido - soma;
                    return (
                      <div className="text-[10px] font-bold font-mono">
                        {Math.abs(dif) < 0.01 ? (
                          <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            100% Cobrado ({formatarMoeda(soma)})
                          </span>
                        ) : dif > 0 ? (
                          <span className="text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                            Falta {formatarMoeda(dif)}
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                            Excesso {formatarMoeda(Math.abs(dif))}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Observação da Entrega */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Observação da Baixa (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Entregue na portaria, deixado com dona Maria..."
              value={obsEntrega}
              onChange={(e) => setObsEntrega(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
              {totalCascosEsperados > 0 ? (
                <span>
                  📦 <strong>{totalCascosRecolhidos}</strong> de {totalCascosEsperados} cascos recolhidos
                  {totalCascosPendentes > 0 && (
                    <span className="text-amber-600 font-extrabold ml-1">
                      ({totalCascosPendentes} Vale-Casco)
                    </span>
                  )}
                </span>
              ) : (
                <span>✓ Sem vasilhames retornáveis</span>
              )}
            </div>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
              Total: {formatarMoeda(totalFinalPedido)}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enviarWhatsApp}
                onChange={(e) => setEnviarWhatsApp(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Avisar no WhatsApp</span>
              </span>
            </label>

            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitBaixa}
              disabled={salvando}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{salvando ? 'Salvando...' : 'CONFIRMAR BAIXA'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
