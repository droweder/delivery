import React, { useState } from 'react';
import { Entregador, Pedido, Usuario } from '../types';
import { formatarMoeda, formatarDataHora, imprimirComanda } from '../lib/thermalPrinter';
import { abrirWhatsApp, gerarMensagemWhatsApp } from '../utils/whatsapp';
import {
  Truck,
  Printer,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  Flame,
  Droplet,
  Send,
  UserCheck,
  ChevronRight,
  Filter,
  BellRing,
  Radio,
  Zap,
  MessageCircle,
  Navigation,
} from 'lucide-react';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';
import { ModalRastreamentoEntregadores } from './ModalRastreamentoEntregadores';
import { ModalBaixaEntrega } from './ModalBaixaEntrega';

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
  onDespacharPedidos: (pedidosIds: string[], entregadorId: string, imprimir?: boolean) => Promise<void>;
  onVisualizarComanda: (pedido: Pedido) => void;
  onPedidoAtualizado?: () => void;
}

export const DespachoKanban: React.FC<Props> = ({
  pedidos,
  entregadores,
  usuarioLogado,
  activeTab = 'despacho',
  setActiveTab = () => {},
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onDespacharPedidos,
  onVisualizarComanda,
  onPedidoAtualizado = () => {},
}) => {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [entregadorDestino, setEntregadorDestino] = useState<string>(entregadores[0]?.id || 'e1');
  const [despachando, setDespachando] = useState(false);
  const [filtroEntregador, setFiltroEntregador] = useState<string>('TODOS');
  const [alertaPushEnviado, setAlertaPushEnviado] = useState<string | null>(null);
  const [modalRastreamentoAberto, setModalRastreamentoAberto] = useState(false);
  const [entregadorRastrearId, setEntregadorRastrearId] = useState<string | undefined>(undefined);
  const [pedidoParaBaixaHub, setPedidoParaBaixaHub] = useState<Pedido | null>(null);

  const pedidosPendentes = pedidos.filter((p) => p.status === 'PENDENTE');
  const pedidosEmRota = pedidos.filter((p) => {
    if (p.status !== 'EM_ROTA') return false;
    if (filtroEntregador !== 'TODOS' && p.entregadorId !== filtroEntregador) return false;
    return true;
  });
  const pedidosEntregues = pedidos.filter((p) => {
    if (p.status !== 'ENTREGUE') return false;
    if (filtroEntregador !== 'TODOS' && p.entregadorId !== filtroEntregador) return false;
    return true;
  });

  const toggleSelecionar = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selecionarTodosPendentes = () => {
    if (selecionados.length === pedidosPendentes.length) {
      setSelecionados([]);
    } else {
      setSelecionados(pedidosPendentes.map((p) => p.id));
    }
  };

  const handleDespacho = async (imprimir = false) => {
    if (selecionados.length === 0) {
      alert('Selecione pelo menos um pedido pendente para despachar!');
      return;
    }
    setDespachando(true);
    const entregadorEscolhido = entregadores.find((e) => e.id === entregadorDestino);
    const qtdPedidos = selecionados.length;

    try {
      await onDespacharPedidos(selecionados, entregadorDestino, imprimir);
      setSelecionados([]);
      setAlertaPushEnviado(
        `🔔 Notificação Push enviada via Supabase Realtime para o celular de ${entregadorEscolhido?.nome || 'Entregador'} (${qtdPedidos} pedido(s) despachado(s))!`
      );
      setTimeout(() => setAlertaPushEnviado(null), 6000);
    } catch (err: any) {
      alert('Erro no despacho: ' + err.message);
    } finally {
      setDespachando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Dispatch Bar */}
      <ModuloHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        usuarioLogado={usuarioLogado}
        isSuperAdmin={isSuperAdmin}
        pedidosPendentesCount={pedidosPendentesCount}
        pedidosEmRotaCount={pedidosEmRotaCount}
        pedidosEntreguesCount={pedidosEntreguesCount}
        moduloNumero="2"
        moduloCor="bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300"
        titulo="Módulo de Despacho • Kanban Operacional"
        subtitulo={
          <>
            Atribuição de rotas, disparo de <strong>Notificações Push Supabase</strong> para o celular do entregador e impressão de comandas.
          </>
        }
      >
        {/* Quick Courier filter & Push status badge */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold shadow-2xs">
            <Radio className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>Supabase Push Ativo</span>
          </div>

          <button
            id="btn-rastreamento-gps"
            onClick={() => {
              setEntregadorRastrearId(undefined);
              setModalRastreamentoAberto(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 animate-pulse" />
            <span>Rastreamento GPS & Rotas</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <select
              value={filtroEntregador}
              onChange={(e) => setFiltroEntregador(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            >
              <option value="TODOS">Todos os Entregadores</option>
              {entregadores.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.nome} ({ent.veiculo?.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModuloHeader>

        {/* Push Alert Toast */}
        {alertaPushEnviado && (
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-blue-600 animate-bounce shrink-0" />
              <span>{alertaPushEnviado}</span>
            </div>
            <button onClick={() => setAlertaPushEnviado(null)} className="text-slate-400 hover:text-slate-700 ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Dispatch Action Panel (when pending orders exist) */}
        {pedidosPendentes.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="select-all-pending"
                checked={selecionados.length === pedidosPendentes.length && pedidosPendentes.length > 0}
                onChange={selecionarTodosPendentes}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="font-bold text-slate-900">
                  {selecionados.length} de {pedidosPendentes.length} selecionados
                </span>
                <p className="text-[10px] text-slate-600">Escolha o entregador para assumir:</p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <select
                id="select-entregador-destino"
                value={entregadorDestino}
                onChange={(e) => setEntregadorDestino(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-800 bg-[#eaecf0] text-xs shadow-xs"
              >
                {entregadores.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    🛵 {ent.nome} ({ent.pedidosAtivosCount} em rota)
                  </option>
                ))}
              </select>

              <button
                id="btn-despachar-imprimir"
                disabled={despachando || selecionados.length === 0}
                onClick={() => handleDespacho(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Despachar + Comanda</span>
              </button>

              <button
                id="btn-despachar-apenas"
                disabled={despachando || selecionados.length === 0}
                onClick={() => handleDespacho(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Despachar & Enviar Push</span>
              </button>
            </div>
          </div>
        )}

      {/* Kanban Board Columns (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* COLUMN 1: PENDENTES (Na Base) */}
        <div className="bg-slate-100/90 p-3 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">1. Pendentes na Base</h3>
            </div>
            <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-black">
              {pedidosPendentes.length}
            </span>
          </div>

          <div className="space-y-2 min-h-[380px]">
            {pedidosPendentes.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Clock className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
                Nenhum pedido pendente.
              </div>
            ) : (
              pedidosPendentes.map((pedido) => {
                const isSelected = selecionados.includes(pedido.id);

                return (
                  <div
                    key={pedido.id}
                    className={`p-3 rounded-lg bg-[#eaecf0] border transition-all shadow-xs space-y-2 text-xs ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelecionar(pedido.id)}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="font-black text-slate-900 text-xs">{pedido.codigo}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatarDataHora(pedido.criadoEm)}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">
                        Pendente
                      </span>
                    </div>

                    {/* Customer details */}
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs">{pedido.cliente.nome}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {pedido.cliente.endereco}, {pedido.cliente.numero} •{' '}
                          <strong>{pedido.cliente.bairroNome}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Agendamento Badge */}
                    {pedido.tipoEntrega === 'AGENDADA' && pedido.dataHoraEntregaAgendada && (
                      <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Agendado: {formatarDataHora(pedido.dataHoraEntregaAgendada)}</span>
                      </div>
                    )}

                    {/* Items chips */}
                    <div className="pt-1.5 border-t border-slate-100 space-y-0.5">
                      {pedido.itens.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="text-slate-700 truncate pr-2">
                            <strong>{it.quantidade}x</strong> {it.nomeProduto}{' '}
                            <span className="text-[10px] text-slate-500">
                              ({it.tipoVenda === 'RECARGA' ? 'Troca' : 'Completo'})
                            </span>
                          </span>
                          <span className="font-semibold font-mono">{formatarMoeda(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total & Action */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div>
                        <span className="text-[9px] text-slate-500">Total:</span>
                        <div className="font-black font-mono text-blue-700 text-xs">{formatarMoeda(pedido.total)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirWhatsApp(pedido.cliente.telefone, gerarMensagemWhatsApp(pedido))}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                          title="Enviar aviso do pedido no WhatsApp do Cliente"
                        >
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => onVisualizarComanda(pedido)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          Comanda
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: EM ROTA (Com os Entregadores na Rua) */}
        <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-200 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">2. Em Rota (Na Rua)</h3>
            </div>
            <span className="px-1.5 py-0.2 rounded bg-blue-200 text-blue-900 text-[10px] font-black">
              {pedidosEmRota.length}
            </span>
          </div>

          <div className="space-y-2 min-h-[380px]">
            {pedidosEmRota.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <Truck className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-blue-400" />
                Nenhum pedido em trânsito.
              </div>
            ) : (
              pedidosEmRota.map((pedido) => (
                <div
                  key={pedido.id}
                  className="p-3 rounded-lg bg-[#eaecf0] border border-blue-200 shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-slate-900 text-xs">{pedido.codigo}</span>
                      <div className="text-[10px] text-blue-600 font-bold mt-0.5">
                        🛵 {pedido.entregadorNome || 'Entregador atribuído'}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">
                      Em Rota
                    </span>
                  </div>

                  {/* Customer details */}
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 text-xs">{pedido.cliente.nome}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {pedido.cliente.endereco}, {pedido.cliente.numero} ({pedido.cliente.bairroNome})
                    </div>
                  </div>

                  {/* Agendamento Badge */}
                  {pedido.tipoEntrega === 'AGENDADA' && pedido.dataHoraEntregaAgendada && (
                    <div className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Agendado: {formatarDataHora(pedido.dataHoraEntregaAgendada)}</span>
                    </div>
                  )}

                  {/* Pagamento Previsto */}
                  <div className="p-1.5 rounded bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="text-slate-600">
                      {pedido.pagamentosPrevistos && pedido.pagamentosPrevistos.length > 1 ? (
                        <span className="font-semibold text-purple-700">
                          Múltiplos ({pedido.pagamentosPrevistos.map((p) => p.forma).join('+')})
                        </span>
                      ) : (
                        <span>Forma: {pedido.formaPagamentoPrevista}</span>
                      )}
                    </div>
                    <span className="font-black font-mono text-slate-900">{formatarMoeda(pedido.total)}</span>
                  </div>

                    {/* Comanda and WhatsApp Button & Dar Baixa */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] flex-wrap gap-1">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatarDataHora(pedido.despachadoEm)}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pedido.entregadorId && (
                          <button
                            onClick={() => {
                              setEntregadorRastrearId(pedido.entregadorId);
                              setModalRastreamentoAberto(true);
                            }}
                            className="flex items-center gap-1 text-sky-600 hover:text-sky-800 font-bold text-[11px]"
                            title="Rastrear entregador no mapa"
                          >
                            <Navigation className="w-3 h-3" /> GPS
                          </button>
                        )}
                        <button
                          onClick={() => abrirWhatsApp(pedido.cliente.telefone, gerarMensagemWhatsApp(pedido))}
                          className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-bold text-[11px]"
                          title="Avisar cliente via WhatsApp que pedido está em rota"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </button>
                        <button
                          onClick={() => onVisualizarComanda(pedido)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-[11px]"
                        >
                          <Printer className="w-3 h-3" /> Comanda
                        </button>
                        <button
                          onClick={() => setPedidoParaBaixaHub(pedido)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-xs transition-all active:scale-95 cursor-pointer ml-1"
                          title="Dar baixa no pedido e registrar recolhimento de cascos"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dar Baixa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>

        {/* COLUMN 3: ENTREGUES (Aguardando Acerto no Final do Turno) */}
        <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">3. Entregues (Aguardando Acerto)</h3>
            </div>
            <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[10px] font-black">
              {pedidosEntregues.length}
            </span>
          </div>

          <div className="space-y-2 min-h-[380px]">
            {pedidosEntregues.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-emerald-400" />
                Nenhuma entrega concluída aguardando acerto.
              </div>
            ) : (
              pedidosEntregues.map((pedido) => (
                <div
                  key={pedido.id}
                  className="p-3 rounded-lg bg-[#eaecf0] border border-emerald-200 shadow-xs space-y-1.5 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-slate-900 text-xs">{pedido.codigo}</span>
                      <div className="text-[10px] text-emerald-700 font-bold">
                        ✓ {pedido.entregadorNome}
                      </div>
                    </div>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                      Entregue
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div className="font-bold text-slate-900">{pedido.cliente.nome}</div>
                    <div className="text-[11px] text-slate-800 font-mono">
                      {pedido.pagamentosRealizados && pedido.pagamentosRealizados.length > 1 ? (
                        <span className="text-purple-700 font-semibold">
                          Pago Dividido: {pedido.pagamentosRealizados.map((p) => `${p.forma} (${formatarMoeda(p.valor)})`).join(', ')}
                        </span>
                      ) : (
                        <span>
                          Pago: {pedido.formaPagamentoRealizada || pedido.formaPagamentoPrevista} (
                          {formatarMoeda(pedido.valorRecebido || pedido.total)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resumo de Cascos Recolhidos e Vales-Casco */}
                  {pedido.cascosRecolhidos && pedido.cascosRecolhidos.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-emerald-100">
                      {pedido.cascosRecolhidos.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                            c.quantidadeRecolhida > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          📦 {c.quantidadeRecolhida}x {c.nomeCasco} {c.quantidadePendente > 0 ? `(⚠️ ${c.quantidadePendente} Vale-Casco)` : '✓'}
                        </span>
                      ))}
                    </div>
                  )}

                  {pedido.origemOffline && (
                    <div className="text-[9px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                      ⚡ Registrado Offline
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-mono">
                    Entregue: {formatarDataHora(pedido.entregueEm)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Baixa de Pedido no Hub (Desktop/Web) */}
      <ModalBaixaEntrega
        pedido={pedidoParaBaixaHub}
        isOpen={Boolean(pedidoParaBaixaHub)}
        onClose={() => setPedidoParaBaixaHub(null)}
        nomeOperadorOuEntregador={usuarioLogado?.nome || 'Operador de Despacho'}
        onConfirmarBaixa={async (dados) => {
          if (!pedidoParaBaixaHub) return;
          const res = await fetch(`/api/pedidos/${pedidoParaBaixaHub.id}/baixa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Erro ao registrar baixa');
          }
          setPedidoParaBaixaHub(null);
          onPedidoAtualizado();
        }}
      />

      {/* Modal de Rastreamento de Frota & Histórico de Trajeto */}
      <ModalRastreamentoEntregadores
        aberto={modalRastreamentoAberto}
        onFechar={() => setModalRastreamentoAberto(false)}
        entregadores={entregadores}
        entregadorInicialId={entregadorRastrearId}
      />
    </div>
  );
};
