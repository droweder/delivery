import React, { useState, useEffect } from 'react';
import { Entregador, FechamentoCaixaEntregador, Pedido, Usuario } from '../types';
import { formatarMoeda, formatarDataHora } from '../lib/thermalPrinter';
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Receipt,
  UserCheck,
  TrendingUp,
  FileText,
  Calendar,
  Lock,
  History,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';

interface Props {
  pedidos: Pedido[];
  entregadores: Entregador[];
  usuarioLogado?: Usuario | null;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  onAcertoConcluido: () => void;
}

export const AcertoCaixa: React.FC<Props> = ({
  pedidos,
  entregadores,
  usuarioLogado,
  activeTab = 'acerto',
  setActiveTab = () => {},
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onAcertoConcluido,
}) => {
  const [entregadorId, setEntregadorId] = useState<string>(entregadores[0]?.id || 'e1');
  const [dinheiroContado, setDinheiroContado] = useState<string>('');
  const [cascosP13Contados, setCascosP13Contados] = useState<string>('');
  const [cascosP20LContados, setCascosP20LContados] = useState<string>('');
  const [observacoesFechamento, setObservacoesFechamento] = useState('');
  const [fechando, setFechando] = useState(false);
  const [ultimoFechamento, setUltimoFechamento] = useState<FechamentoCaixaEntregador | null>(null);
  const [historicoFechamentos, setHistoricoFechamentos] = useState<FechamentoCaixaEntregador[]>([]);
  const [visualizarHistorico, setVisualizarHistorico] = useState(false);

  const entregadorSelecionado = entregadores.find((e) => e.id === entregadorId) || entregadores[0];

  const carregarHistorico = async () => {
    try {
      const res = await fetch(`/api/acerto/fechamentos?entregadorId=${entregadorId}`);
      if (res.ok) {
        const data = await res.json();
        setHistoricoFechamentos(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, [entregadorId]);

  // Pedidos entregues aguardando fechamento para esse entregador
  const pedidosParaAcerto = pedidos.filter(
    (p) => p.entregadorId === entregadorId && p.status === 'ENTREGUE'
  );

  // Totais calculados do sistema
  let totalDinheiroEsperado = 0;
  let totalPixEsperado = 0;
  let totalCartaoEsperado = 0;
  let totalCascosP13Calculados = 0;
  let totalCascosP20LCalculados = 0;

  pedidosParaAcerto.forEach((p) => {
    const forma = p.formaPagamentoRealizada || p.formaPagamentoPrevista;
    const valor = p.valorRecebido || p.total;

    if (forma === 'DINHEIRO') {
      totalDinheiroEsperado += p.total;
    } else if (forma === 'PIX') {
      totalPixEsperado += valor;
    } else if (forma === 'CARTAO_DEBITO' || forma === 'CARTAO_CREDITO') {
      totalCartaoEsperado += valor;
    }

    p.itens.forEach((it) => {
      if (it.tipoVasilhame === 'P13') {
        totalCascosP13Calculados += it.vasilhamesRecolhidosReais ?? it.vasilhamesRecolhidosEsperados;
      } else if (it.tipoVasilhame === 'P20L') {
        totalCascosP20LCalculados += it.vasilhamesRecolhidosReais ?? it.vasilhamesRecolhidosEsperados;
      }
    });
  });

  const totalGeralRotas = totalDinheiroEsperado + totalPixEsperado + totalCartaoEsperado;

  // Diferença de caixa
  const valorInformadoNum = Number(dinheiroContado) || 0;
  const diferencaDinheiro = valorInformadoNum - totalDinheiroEsperado;

  const handleFecharCaixa = async () => {
    if (pedidosParaAcerto.length === 0) {
      alert('Não há pedidos com status "Entregue" para este entregador acertar no momento.');
      return;
    }

    setFechando(true);
    try {
      const res = await fetch('/api/acerto/fechamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entregadorId,
          pedidosIds: pedidosParaAcerto.map((p) => p.id),
          totalDinheiroInformado: valorInformadoNum,
          cascosP13Recolhidos: cascosP13Contados ? Number(cascosP13Contados) : totalCascosP13Calculados,
          cascosP20LRecolhidos: cascosP20LContados ? Number(cascosP20LContados) : totalCascosP20LCalculados,
          observacoes: observacoesFechamento,
        }),
      });

      if (!res.ok) throw new Error('Falha ao processar fechamento');
      const data = await res.json();

      setUltimoFechamento(data.fechamento);
      setDinheiroContado('');
      setCascosP13Contados('');
      setCascosP20LContados('');
      setObservacoesFechamento('');
      onAcertoConcluido();
    } catch (err: any) {
      alert('Erro no fechamento: ' + err.message);
    } finally {
      setFechando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuloHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        usuarioLogado={usuarioLogado}
        isSuperAdmin={isSuperAdmin}
        pedidosPendentesCount={pedidosPendentesCount}
        pedidosEmRotaCount={pedidosEmRotaCount}
        pedidosEntreguesCount={pedidosEntreguesCount}
        moduloNumero="3"
        moduloCor="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
        titulo="Módulo de Acerto & Fechamento de Caixa"
        subtitulo="Conferência de valores recebidos (Dinheiro físico, PIX, Cartão) e recolhimento de vasilhames vazios no final do turno."
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVisualizarHistorico(!visualizarHistorico)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs ${
              visualizarHistorico
                ? 'bg-emerald-700 text-white border-emerald-800'
                : 'border-slate-300 bg-[#eaecf0] text-slate-700 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{visualizarHistorico ? 'Voltar ao Fechamento' : 'Histórico de Turnos'}</span>
          </button>

          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Entregador:</span>
          <select
            id="select-entregador-acerto"
            value={entregadorId}
            onChange={(e) => setEntregadorId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {entregadores.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.nome} ({ent.veiculo})
              </option>
            ))}
          </select>
        </div>
      </ModuloHeader>

      {/* Histórico View */}
      {visualizarHistorico ? (
        <div className="bg-[#eaecf0] p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                Histórico de Turnos & Fechamentos de Caixa
              </h3>
              <p className="text-xs text-slate-500">
                Turnos encerrados com conferência de dinheiro e vasilhames para {entregadorSelecionado?.nome}.
              </p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {historicoFechamentos.length} fechamentos
            </span>
          </div>

          {historicoFechamentos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">Nenhum fechamento registrado para este entregador.</p>
              <p className="text-slate-400 text-[11px]">Os acertos concluídos ficarão arquivados nesta lista.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px]">
                    <th className="p-2.5">Data / Hora</th>
                    <th className="p-2.5">Entregador</th>
                    <th className="p-2.5 text-center">Pedidos Concluídos</th>
                    <th className="p-2.5 text-right">Dinheiro Esperado</th>
                    <th className="p-2.5 text-right">Dinheiro Informado</th>
                    <th className="p-2.5 text-right">Diferença</th>
                    <th className="p-2.5 text-center">Cascos Recolhidos</th>
                    <th className="p-2.5">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-[#eaecf0]">
                  {historicoFechamentos.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-2.5 font-mono text-[11px] text-slate-700">
                        {formatarDataHora(f.data)}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{f.entregadorNome}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                        {f.pedidosConcluidosIds?.length || 0}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {formatarMoeda(f.totalDinheiroEsperado)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {formatarMoeda(f.totalDinheiroInformado)}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        <span
                          className={`font-bold ${
                            f.diferencaDinheiro === 0
                              ? 'text-emerald-700'
                              : f.diferencaDinheiro > 0
                              ? 'text-blue-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {f.diferencaDinheiro === 0 ? 'Exato' : formatarMoeda(f.diferencaDinheiro)}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-xs">
                        <span className="text-amber-700 font-bold">{f.cascosP13Recolhidos}x P13</span>
                        {f.cascosP20LRecolhidos > 0 && (
                          <span className="text-blue-700 font-bold ml-1.5">{f.cascosP20LRecolhidos}x 20L</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px] italic">
                        {f.observacoes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Delivered Orders to Reconcile (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-[#eaecf0] p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                Entregas Realizadas • {entregadorSelecionado?.nome}
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                {pedidosParaAcerto.length} entregas pendentes
              </span>
            </div>

            {pedidosParaAcerto.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg space-y-1.5">
                <CheckCircle2 className="w-6 h-6 mx-auto text-slate-300" />
                <p className="font-bold text-slate-600">Nenhuma entrega pendente de fechamento.</p>
                <p className="text-[10px] text-slate-400">
                  Quando o entregador der baixa no app da rua, os pedidos aparecerão aqui para conferência.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {pedidosParaAcerto.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-black text-slate-900 text-xs">{pedido.codigo}</span>
                        <div className="text-slate-600 font-bold text-[11px]">{pedido.cliente.nome}</div>
                      </div>
                      <span className="font-black font-mono text-blue-700 text-xs">{formatarMoeda(pedido.total)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200 text-slate-500">
                      <div>
                        Forma:{' '}
                        <strong className="text-slate-800">
                          {pedido.formaPagamentoRealizada || pedido.formaPagamentoPrevista}
                        </strong>
                      </div>
                      <div className="font-mono">Entregue: {formatarDataHora(pedido.entregueEm)}</div>
                    </div>

                    {/* Cascos */}
                    {pedido.itens.some((it) => (it.vasilhamesRecolhidosReais || 0) > 0) && (
                      <div className="text-[9px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-200 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-amber-700" />
                        <span>
                          Cascos:{' '}
                          {pedido.itens
                            .filter((it) => (it.vasilhamesRecolhidosReais || 0) > 0)
                            .map((it) => `${it.vasilhamesRecolhidosReais}x ${it.tipoVasilhame}`)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Physical Money & Empty Container Reconciliation (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-[#eaecf0] p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conferência de Valores & Vasilhames</span>
            </h3>

            {/* Expected Summary Box */}
            <div className="p-3 rounded-lg bg-slate-900 text-white space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-[11px]">Dinheiro Físico Esperado:</span>
                <span className="font-black text-white text-xs">{formatarMoeda(totalDinheiroEsperado)}</span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Chave PIX:</span>
                <span>{formatarMoeda(totalPixEsperado)}</span>
              </div>
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Cartões (Maquininhas):</span>
                <span>{formatarMoeda(totalCartaoEsperado)}</span>
              </div>
              <div className="flex justify-between text-amber-300 pt-1.5 border-t border-slate-800 text-[11px]">
                <span>Cascos P13 (Gás) Esperados:</span>
                <span className="font-bold">{totalCascosP13Calculados} botijões</span>
              </div>
              <div className="flex justify-between text-blue-300 text-[11px]">
                <span>Cascos Água 20L Esperados:</span>
                <span className="font-bold">{totalCascosP20LCalculados} galões</span>
              </div>
              <div className="flex justify-between font-black text-xs text-emerald-400 pt-1.5 border-t border-slate-800">
                <span>TOTAL GERAL:</span>
                <span>{formatarMoeda(totalGeralRotas)}</span>
              </div>
            </div>

            {/* Operator physical counting inputs */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">
                  💵 Dinheiro Físico Contado na Base (R$):
                </label>
                <input
                  id="input-dinheiro-contado"
                  type="number"
                  step="0.01"
                  value={dinheiroContado}
                  onChange={(e) => setDinheiroContado(e.target.value)}
                  placeholder={totalDinheiroEsperado > 0 ? String(totalDinheiroEsperado) : '0.00'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Difference feedback banner */}
              {dinheiroContado !== '' && (
                <div
                  className={`p-2 rounded-lg font-bold flex items-center justify-between text-[11px] ${
                    diferencaDinheiro === 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : diferencaDinheiro > 0
                      ? 'bg-blue-50 text-blue-800 border border-blue-300'
                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}
                >
                  <span>
                    {diferencaDinheiro === 0
                      ? '✓ Caixa Bateu 100% (Sem diferença)'
                      : diferencaDinheiro > 0
                      ? `▲ Sobra no Caixa: +${formatarMoeda(diferencaDinheiro)}`
                      : `▼ Falta no Caixa: ${formatarMoeda(diferencaDinheiro)}`}
                  </span>
                </div>
              )}

              {/* Physical Empty Containers Checked */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 text-[10px]">Cascos P13 Descarregados:</label>
                  <input
                    type="number"
                    value={cascosP13Contados}
                    onChange={(e) => setCascosP13Contados(e.target.value)}
                    placeholder={String(totalCascosP13Calculados)}
                    className="w-full px-2 py-1 rounded-lg border border-slate-200 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 text-[10px]">Galões 20L Descarregados:</label>
                  <input
                    type="number"
                    value={cascosP20LContados}
                    onChange={(e) => setCascosP20LContados(e.target.value)}
                    placeholder={String(totalCascosP20LCalculados)}
                    className="w-full px-2 py-1 rounded-lg border border-slate-200 font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5 text-[10px]">Observações:</label>
                <input
                  type="text"
                  value={observacoesFechamento}
                  onChange={(e) => setObservacoesFechamento(e.target.value)}
                  placeholder="Ex: Turno da manhã sem pendências..."
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Action Button: Finalizar Acerto */}
            <button
              id="btn-finalizar-acerto-turno"
              disabled={fechando || pedidosParaAcerto.length === 0}
              onClick={handleFecharCaixa}
              className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{fechando ? 'Processando Fechamento...' : 'Concluir Acerto & Fechar Turno'}</span>
            </button>
          </div>

          {/* Last Settlement Card Receipt */}
          {ultimoFechamento && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5 text-xs animate-fade-in">
              <div className="flex items-center gap-1.5 text-emerald-900 font-black text-xs">
                <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                <span>Último Fechamento Realizado</span>
              </div>
              <div className="text-slate-700 space-y-0.5 text-[11px]">
                <div>
                  <strong>Entregador:</strong> {ultimoFechamento.entregadorNome}
                </div>
                <div>
                  <strong>Horário:</strong> {formatarDataHora(ultimoFechamento.data)}
                </div>
                <div className="font-mono">
                  <strong>Esperado:</strong> {formatarMoeda(ultimoFechamento.totalDinheiroEsperado)} |{' '}
                  <strong>Recebido:</strong> {formatarMoeda(ultimoFechamento.totalDinheiroInformado)}
                </div>
                <div>
                  <strong>Cascos:</strong> {ultimoFechamento.cascosP13Recolhidos}x P13,{' '}
                  {ultimoFechamento.cascosP20LRecolhidos}x Água 20L
                </div>
                <div className="text-emerald-700 font-bold pt-0.5">
                  ✓ Estoque de vazios atualizado e pedidos concluídos.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
