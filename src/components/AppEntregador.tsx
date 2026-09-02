import React, { useState, useEffect } from 'react';
import { Entregador, FormaPagamento, NotificacaoPush, PagamentoItem, Pedido, SyncQueueItem, TipoEntrega, Usuario } from '../types';
import { formatarMoeda, formatarDataHora } from '../lib/thermalPrinter';
import {
  darBaixaOffline,
  isDeviceOffline,
  obterFilaSyncOffline,
  obterPedidosEntregadorOffline,
  salvarCargaOffline,
  setSimulatedOffline,
  sincronizarFilaComServidor,
} from '../lib/offlineDb';
import {
  playPushChime,
  triggerPushVibration,
  requestPushPermission,
  showNativePushNotification,
  registerPushDeviceOnServer,
  getHistoricoNotificacoes,
  
  markPushNotificationAsRead,
} from '../lib/supabasePush';
import {
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Navigation,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Layers,
  MapPin,
  Clock,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Zap,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  X,
  Radio,
  DownloadCloud,
  Check,
  RotateCcw,
  CalendarClock,
  Split,
  Plus,
  Trash2,
  Coins,
} from 'lucide-react';
import { ModalDevolverPedido } from './ModalDevolverPedido';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';

interface Props {
  entregadores: Entregador[];
  usuarioLogado?: Usuario | null;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  onPedidoAtualizadoNoServidor?: () => void;
}

export const AppEntregador: React.FC<Props> = ({
  entregadores,
  usuarioLogado,
  activeTab = 'entregador',
  setActiveTab = () => {},
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onPedidoAtualizadoNoServidor,
}) => {
  const [entregadorAtualId, setEntregadorAtualId] = useState<string>(entregadores[0]?.id || 'e1');
  const [pedidosLocais, setPedidosLocais] = useState<Pedido[]>([]);
  const [filaSync, setFilaSync] = useState<SyncQueueItem[]>([]);
  const [carregandoCarga, setCarregandoCarga] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [isOffline, setIsOffline] = useState(isDeviceOffline());
  const [modoMolduraCelular, setModoMolduraCelular] = useState(true);
  const [notificacao, setNotificacao] = useState<{ tipo: 'sucesso' | 'info' | 'erro'; texto: string } | null>(null);

  // Push Notifications State
  const [pushPermissao, setPushPermissao] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [historicoPush, setHistoricoPush] = useState<NotificacaoPush[]>([]);
  const [pushPopUpAtivo, setPushPopUpAtivo] = useState<NotificacaoPush | null>(null);
  const [modalPushAberto, setModalPushAberto] = useState(false);
  const [somHabilitado, setSomHabilitado] = useState(true);

  // Delivery Confirmation Modal State
  const [pedidoParaBaixa, setPedidoParaBaixa] = useState<Pedido | null>(null);
  const [pedidoParaDevolucao, setPedidoParaDevolucao] = useState<Pedido | null>(null);
  const [modoMultiploBaixa, setModoMultiploBaixa] = useState(false);
  const [formaPagtoRealizada, setFormaPagtoRealizada] = useState<FormaPagamento>('DINHEIRO');
  const [pagamentosBaixa, setPagamentosBaixa] = useState<PagamentoItem[]>([]);
  const [valorRecebido, setValorRecebido] = useState<number>(0);
  const [cascosP13Recolhidos, setCascosP13Recolhidos] = useState<number>(0);
  const [cascosP13Pendentes, setCascosP13Pendentes] = useState<number>(0);
  const [cascosP20LRecolhidos, setCascosP20LRecolhidos] = useState<number>(0);
  const [cascosP20LPendentes, setCascosP20LPendentes] = useState<number>(0);
  const [obsEntrega, setObsEntrega] = useState('');

  const entregadorAtual = entregadores.find((e) => e.id === entregadorAtualId) || entregadores[0];

  // Carrega dados locais do IndexedDB
  const carregarDadosDoIndexedDB = async () => {
    try {
      const pedidos = await obterPedidosEntregadorOffline(entregadorAtualId);
      setPedidosLocais(pedidos);
      const fila = await obterFilaSyncOffline(entregadorAtualId);
      setFilaSync(fila);
    } catch (e) {
      console.error('Erro ao ler do IndexedDB:', e);
    }
  };

  // Carrega histórico de notificações push
  const carregarHistoricoPush = async () => {
    const historico = await getHistoricoNotificacoes(entregadorAtualId);
    setHistoricoPush(historico);
  };

  // Solicita permissão e registra dispositivo
  const handleAtivarPush = async () => {
    const permissao = await requestPushPermission();
    setPushPermissao(permissao);
    if (permissao === 'granted') {
      await registerPushDeviceOnServer(entregadorAtualId);
      if (somHabilitado) playPushChime('NORMAL');
      triggerPushVibration([100, 50, 100]);
      setNotificacao({
        tipo: 'sucesso',
        texto: '🔔 Notificações Push Ativadas! Seu celular receberá alertas com som e vibração a cada novo pedido despachado.',
      });
    } else {
      setNotificacao({
        tipo: 'info',
        texto: 'Permissão no navegador pendente. Os alertas sonoros e pop-ups no app continuarão funcionando normalmente.',
      });
    }
  };

  // Baixa Carga de Dados no Wi-Fi da Base
  const baixarCargaDaBase = async (silencioso = false) => {
    if (isOffline) {
      if (!silencioso) {
        setNotificacao({
          tipo: 'erro',
          texto: 'Você está Offline! Conecte-se ao Wi-Fi da base para atualizar a carga de rotas.',
        });
      }
      return;
    }

    setCarregandoCarga(true);
    try {
      const res = await fetch(`/api/entregador/${entregadorAtualId}/carga`);
      if (!res.ok) throw new Error('Falha ao obter carga do servidor');
      const data = await res.json();

      await salvarCargaOffline(entregadorAtualId, data.pedidos || []);
      setPedidosLocais(data.pedidos || []);
      const fila = await obterFilaSyncOffline(entregadorAtualId);
      setFilaSync(fila);

      if (!silencioso) {
        setNotificacao({
          tipo: 'sucesso',
          texto: `Carga baixada! ${data.pedidos?.length || 0} pedidos sincronizados no IndexedDB.`,
        });
      }
    } catch (err: any) {
      console.error(err);
      if (!silencioso) {
        setNotificacao({ tipo: 'erro', texto: 'Erro ao baixar carga: ' + err.message });
      }
    } finally {
      setCarregandoCarga(false);
    }
  };

  // Sincronizar Fila Offline com o Servidor
  const sincronizarFila = async () => {
    if (isOffline) {
      setNotificacao({
        tipo: 'info',
        texto: 'Dispositivo sem rede. A fila de baixas permanecerá segura no IndexedDB e sincronizará quando voltar o sinal.',
      });
      return;
    }

    setSincronizando(true);
    try {
      const resultado = await sincronizarFilaComServidor(entregadorAtualId);
      await carregarDadosDoIndexedDB();
      if (onPedidoAtualizadoNoServidor) onPedidoAtualizadoNoServidor();

      setNotificacao({
        tipo: 'sucesso',
        texto: `Sincronização concluída: ${resultado.sincronizados} baixas registradas no servidor.`,
      });
    } catch (err: any) {
      setNotificacao({ tipo: 'erro', texto: 'Falha na sincronização: ' + err.message });
    } finally {
      setSincronizando(false);
    }
  };

  // Disparo / Recepção de Push Notification no App
  const processarNovaNotificacaoRecebida = (novaNotif: NotificacaoPush) => {
    if (somHabilitado) {
      playPushChime(novaNotif.prioridade);
    }
    triggerPushVibration(novaNotif.prioridade === 'URGENTE' ? [300, 100, 300, 100, 400] : [200, 100, 200]);
    showNativePushNotification(novaNotif);

    // Pop-up in-app
    setPushPopUpAtivo(novaNotif);
    setTimeout(() => {
      setPushPopUpAtivo((curr) => (curr?.id === novaNotif.id ? null : curr));
    }, 8000);

    // Atualiza carga offline e histórico
    baixarCargaDaBase(true);
    carregarHistoricoPush();
  };

  // Efeitos de escuta de rede, IndexedDB e Push Event Source (SSE / Supabase)
  useEffect(() => {
    carregarDadosDoIndexedDB();
    carregarHistoricoPush();
    registerPushDeviceOnServer(entregadorAtualId);

    const handleNetwork = () => {
      const off = isDeviceOffline();
      setIsOffline(off);
      if (!off) {
        sincronizarFilaComServidor(entregadorAtualId).then(() => {
          carregarDadosDoIndexedDB();
          if (onPedidoAtualizadoNoServidor) onPedidoAtualizadoNoServidor();
        });
      }
    };

    const handleDbUpdated = () => {
      carregarDadosDoIndexedDB();
    };

    // Escuta eventos vindos do Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
        processarNovaNotificacaoRecebida(event.data.payload);
      } else if (event.data?.type === 'TRIGGER_OFFLINE_SYNC') {
        sincronizarFila();
      }
    };

    // Conecta ao canal de Push SSE do servidor (Supabase Realtime Stream)
    const eventSource = new EventSource(`/api/push/stream?entregadorId=${entregadorAtualId}`);
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.titulo && payload.corpo) {
          processarNovaNotificacaoRecebida(payload);
        }
      } catch (err) {
        // Ignora
      }
    };

    window.addEventListener('network-status-changed', handleNetwork);
    window.addEventListener('online', handleNetwork);
    window.addEventListener('offline', handleNetwork);
    window.addEventListener('offline-db-updated', handleDbUpdated);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Busca carga inicial
    baixarCargaDaBase(true);

    return () => {
      eventSource.close();
      window.removeEventListener('network-status-changed', handleNetwork);
      window.removeEventListener('online', handleNetwork);
      window.removeEventListener('offline', handleNetwork);
      window.removeEventListener('offline-db-updated', handleDbUpdated);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [entregadorAtualId]);

  // Abre Modal de Baixa
  const abrirModalBaixa = (pedido: Pedido) => {
    setPedidoParaBaixa(pedido);

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

    let p13Esperado = 0;
    let p20lEsperado = 0;
    pedido.itens.forEach((it) => {
      if (it.tipoVasilhame === 'P13' && it.tipoVenda === 'RECARGA') p13Esperado += it.quantidade;
      if (it.tipoVasilhame === 'P20L' && it.tipoVenda === 'RECARGA') p20lEsperado += it.quantidade;
    });

    setCascosP13Recolhidos(p13Esperado);
    setCascosP13Pendentes(0);
    setCascosP20LRecolhidos(p20lEsperado);
    setCascosP20LPendentes(0);
    setObsEntrega('');
  };

  const handleAddPagamentoBaixa = (formaPadrao: FormaPagamento = 'PIX') => {
    if (!pedidoParaBaixa) return;
    const somaAtual = pagamentosBaixa.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    const restante = Math.max(0, parseFloat((pedidoParaBaixa.total - somaAtual).toFixed(2)));
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
    if (!pedidoParaBaixa) return;
    const outrosSoma = pagamentosBaixa.reduce(
      (acc, p, i) => (i === index ? acc : acc + (Number(p.valor) || 0)),
      0
    );
    const restante = Math.max(0, pedidoParaBaixa.total - outrosSoma);
    handleAlterarPagamentoBaixa(index, 'valor', parseFloat(restante.toFixed(2)));
  };

  // Confirma Baixa (100% Offline-First)
  const confirmarBaixa = async () => {
    if (!pedidoParaBaixa) return;

    let pagamentosRealizadosPayload: PagamentoItem[] | undefined = undefined;
    let formaRealizadaFinal: FormaPagamento = formaPagtoRealizada;
    let trocoFinal = 0;

    if (modoMultiploBaixa) {
      const validos = pagamentosBaixa.filter((p) => Number(p.valor) > 0);
      if (validos.length === 0) {
        alert('Informe ao menos uma forma de pagamento com valor!');
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
      trocoFinal = formaPagtoRealizada === 'DINHEIRO' ? Math.max(0, (Number(valorRecebido) || 0) - pedidoParaBaixa.total) : 0;
      pagamentosRealizadosPayload = [
        {
          forma: formaPagtoRealizada,
          valor: pedidoParaBaixa.total,
          trocoPara: formaPagtoRealizada === 'DINHEIRO' && valorRecebido > pedidoParaBaixa.total ? Number(valorRecebido) : undefined,
        },
      ];
    }

    try {
      const { sincronizadoImediato } = await darBaixaOffline(pedidoParaBaixa.id, entregadorAtualId, {
        formaPagamentoRealizada: formaRealizadaFinal,
        pagamentosRealizados: pagamentosRealizadosPayload,
        valorRecebido: Number(valorRecebido) || pedidoParaBaixa.total,
        trocoDevolvido: trocoFinal,
        vasilhamesRecolhidos: {
          P13: cascosP13Recolhidos,
          P20L: cascosP20LRecolhidos,
        },
        vasilhamesPendentes: {
          P13: cascosP13Pendentes,
          P20L: cascosP20LPendentes,
        },
        observacaoEntrega: obsEntrega,
      });

      setPedidoParaBaixa(null);
      await carregarDadosDoIndexedDB();
      if (onPedidoAtualizadoNoServidor) onPedidoAtualizadoNoServidor();

      if (sincronizadoImediato) {
        setNotificacao({
          tipo: 'sucesso',
          texto: `Pedido ${pedidoParaBaixa.codigo} entregue e sincronizado imediatamente com o servidor!`,
        });
      } else {
        setNotificacao({
          tipo: 'info',
          texto: `Pedido ${pedidoParaBaixa.codigo} gravado OFFLINE no celular (IndexedDB)! Sincronizará quando houver conexão.`,
        });
      }
    } catch (e: any) {
      alert('Erro ao dar baixa: ' + e.message);
    }
  };

  const handleConfirmarDevolucao = async (pedidoId: string, motivo: string, observacao: string) => {
    try {
      const res = await fetch('/api/entregador/devolver-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          entregadorId: entregadorAtualId,
          motivoDevolucao: motivo,
          observacao,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao devolver pedido');
      }

      setPedidosLocais((prev) => prev.filter((p) => p.id !== pedidoId));
      setNotificacao({
        tipo: 'sucesso',
        texto: `Pedido devolvido com sucesso! O emitente/atendente receberá para correção.`,
      });
      if (onPedidoAtualizadoNoServidor) onPedidoAtualizadoNoServidor();
      await carregarDadosDoIndexedDB();
    } catch (err: any) {
      setNotificacao({ tipo: 'erro', texto: err.message || 'Erro ao devolver pedido' });
      throw err;
    }
  };

  const [abaMobile, setAbaMobile] = useState<'ROTA' | 'CONCLUIDAS'>('ROTA');

  // Filtros de Pedidos Ativos vs Entregues
  const pedidosPendentesNaRota = pedidosLocais.filter((p) => p.status === 'EM_ROTA');
  const pedidosEntreguesNaRota = pedidosLocais.filter((p) => p.status === 'ENTREGUE');
  const pedidosConcluidosNaRota = pedidosLocais.filter((p) => p.status === 'CONCLUIDO');
  const pedidosHistoricoEntregues = pedidosLocais.filter((p) => p.status === 'ENTREGUE' || p.status === 'CONCLUIDO');
  const totalNaoLidas = historicoPush.filter((n) => !n.lida).length;

  return (
    <div className="space-y-4">
      {/* Header Info com Botão de Menus Integrado */}
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
        titulo="PWA Mobile Entregador • Offline-First + Push"
        subtitulo="Notificações push em segundo plano com som cristalino, motor háptico de vibração e sincronização resiliente via IndexedDB."
      >
        {/* Courier Selector & Simulation Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          <select
            id="select-entregador-ativo"
            value={entregadorAtualId}
            onChange={(e) => setEntregadorAtualId(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 text-xs shadow-xs"
          >
            {entregadores.map((ent) => (
              <option key={ent.id} value={ent.id}>
                🛵 {ent.nome} ({ent.veiculo?.split(' ')[0]})
              </option>
            ))}
          </select>

          {/* Push History / Drawer Button */}
          <button
            onClick={() => setModalPushAberto(true)}
            className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all shadow-xs"
            title="Ver Histórico de Notificações Push"
          >
            <Bell className="w-3.5 h-3.5 text-blue-600" />
            <span>Notificações</span>
            {totalNaoLidas > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black animate-pulse">
                {totalNaoLidas}
              </span>
            )}
          </button>

          {/* Toggle Sound */}
          <button
            onClick={() => {
              setSomHabilitado(!somHabilitado);
              if (!somHabilitado) playPushChime('NORMAL');
            }}
            className={`p-1.5 rounded-xl border text-xs font-bold transition-all ${
              somHabilitado
                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={somHabilitado ? 'Som de Notificação Ativado' : 'Som Mudo'}
          >
            {somHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Offline Simulation Toggle */}
          <button
            onClick={() => {
              const novo = !isOffline;
              setSimulatedOffline(novo);
              setIsOffline(novo);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border font-bold text-xs transition-all shadow-xs ${
              isOffline
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-600" /> : <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isOffline ? 'Simulando Offline' : 'Simular Sem Sinal'}</span>
          </button>

          {/* Toggle Phone Frame */}
          <button
            onClick={() => setModoMolduraCelular(!modoMolduraCelular)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all"
          >
            {modoMolduraCelular ? 'Modo Expandido' : 'Modo Celular'}
          </button>
        </div>
      </ModuloHeader>

        {/* Push Permission Alert Banner */}
        {pushPermissao !== 'granted' && (
          <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-blue-900">
              <BellRing className="w-4 h-4 text-blue-600 shrink-0 animate-bounce" />
              <span>
                <strong>Ative as Notificações Push:</strong> Receba alertas com toque sonoro e vibração no celular assim que a base despachar um novo pedido para sua rota.
              </span>
            </div>
            <button
              onClick={handleAtivarPush}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shrink-0 shadow-xs"
            >
              🔔 Permitir Notificações
            </button>
          </div>
        )}

        {/* Toast / Notification Banner */}
        {notificacao && (
          <div
            className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between ${
              notificacao.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : notificacao.tipo === 'erro'
                ? 'bg-red-50 text-red-900 border border-red-200'
                : 'bg-blue-50 text-blue-900 border border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{notificacao.texto}</span>
            </div>
            <button onClick={() => setNotificacao(null)} className="text-slate-400 hover:text-slate-700 ml-2">
              ✕
            </button>
          </div>
        )}

      {/* Main Screen Layout (Phone Frame or Wide View) */}
      <div className={`mx-auto transition-all ${modoMolduraCelular ? 'max-w-md' : 'max-w-4xl'}`}>
        <div className="bg-slate-900 rounded-3xl p-3 shadow-2xl border-4 border-slate-800 text-slate-100 relative overflow-hidden">
          {/* Top Speaker Notch */}
          <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-700 mr-2"></div>
            <div className="w-8 h-1 rounded bg-slate-700"></div>
          </div>

          {/* In-App Push Alert Pop-up (Floats on top of screen) */}
          {pushPopUpAtivo && (
            <div className="mb-3 p-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl shadow-xl border border-blue-400/50 animate-bounce-short">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-[#eaecf0]/20">
                    <BellRing className="w-4 h-4 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-white">{pushPopUpAtivo.titulo}</h4>
                    <p className="text-[11px] text-blue-100 line-clamp-2 mt-0.5">{pushPopUpAtivo.corpo}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPushPopUpAtivo(null)}
                  className="text-white/70 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center justify-between text-[10px]">
                <span className="font-bold text-amber-300">
                  {pushPopUpAtivo.valorTotal ? formatarMoeda(pushPopUpAtivo.valorTotal) : 'Novo Pedido'}
                </span>
                <button
                  onClick={() => {
                    setPushPopUpAtivo(null);
                    baixarCargaDaBase(true);
                  }}
                  className="px-2.5 py-1 bg-[#eaecf0] text-blue-900 font-black rounded-lg hover:bg-blue-50"
                >
                  Ver na Rota
                </button>
              </div>
            </div>
          )}

          {/* Mobile Status Bar */}
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-300 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">🛵 {entregadorAtual?.nome?.split(' ')[0]}</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400">
                {entregadorAtual?.veiculo?.split(' ')[0]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Push Status Dot */}
              <div className="flex items-center gap-1 text-[10px] text-blue-400" title="Supabase Realtime Conectado">
                <Radio className="w-3 h-3 animate-pulse text-blue-400" />
                <span>Push</span>
              </div>

              {/* Online/Offline Status */}
              {isOffline ? (
                <span className="flex items-center gap-1 text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-700/50">
                  <WifiOff className="w-3 h-3" /> OFFLINE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50">
                  <Wifi className="w-3 h-3" /> ONLINE
                </span>
              )}
            </div>
          </div>

          {/* Mobile Top Actions (Wi-Fi Base Sync & Queue) */}
          <div className="grid grid-cols-2 gap-2 my-2.5">
            <button
              onClick={() => baixarCargaDaBase(false)}
              disabled={carregandoCarga || isOffline}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold transition-all"
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${carregandoCarga ? 'animate-bounce' : ''}`} />
              <span>{carregandoCarga ? 'Baixando...' : 'Baixar Carga Wi-Fi'}</span>
            </button>

            <button
              onClick={sincronizarFila}
              disabled={sincronizando || isOffline || filaSync.length === 0}
              className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-bold transition-all ${
                filaSync.length > 0
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              } disabled:opacity-50`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
              <span>
                {sincronizando
                  ? 'Sincronizando...'
                  : filaSync.length > 0
                  ? `Sincronizar (${filaSync.length})`
                  : 'Fila Sincronizada'}
              </span>
            </button>
          </div>

          {/* IndexedDB Queue Notice (Offline badge) */}
          {filaSync.length > 0 && (
            <div className="p-2 bg-amber-950/60 border border-amber-600/50 rounded-xl text-[11px] text-amber-200 mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong>{filaSync.length} entrega(s) gravadas no IndexedDB.</strong> Sincronizarão assim que houver rede.
                </span>
              </div>
            </div>
          )}

          {/* Tab Navigation in Mobile App */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl mb-3">
            <button
              type="button"
              onClick={() => setAbaMobile('ROTA')}
              className={`flex-1 text-center py-1.5 rounded-lg font-black text-xs transition-all ${
                abaMobile === 'ROTA'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rota Ativa ({pedidosPendentesNaRota.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaMobile('CONCLUIDAS')}
              className={`flex-1 text-center py-1.5 rounded-lg font-black text-xs transition-all ${
                abaMobile === 'CONCLUIDAS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Concluídas ({pedidosHistoricoEntregues.length})
            </button>
          </div>

          {/* Deliveries List */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {abaMobile === 'ROTA' ? (
              pedidosPendentesNaRota.length === 0 ? (
                <div className="p-6 text-center text-slate-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">Nenhum pedido pendente na rota atual.</p>
                  <p className="text-[10px]">Aguardando novo despacho da base ou teste de notificação push.</p>
                </div>
              ) : (
                pedidosPendentesNaRota.map((pedido, idx) => (
                  <div
                    key={pedido.id}
                    className="bg-slate-800/90 border border-slate-700 hover:border-emerald-500/50 rounded-2xl p-3 space-y-2.5 transition-all shadow-md"
                  >
                    {/* Order Top Bar */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-black text-sm text-white">{pedido.codigo}</span>
                          <span className="px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300 font-bold text-[9px]">
                            {pedido.cliente.bairroNome}
                          </span>

                          {pedido.tipoEntrega === 'AGENDADA' && pedido.dataHoraEntregaAgendada ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[9px] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                {formatarDataHora(pedido.dataHoraEntregaAgendada)}
                              </span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 font-bold text-[9px] flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 text-blue-400" />
                              <span>Imediata</span>
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-200 mt-1">{pedido.cliente.nome}</h4>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-emerald-400">{formatarMoeda(pedido.total)}</span>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {pedido.pagamentosPrevistos && pedido.pagamentosPrevistos.length > 1 ? (
                            <span className="text-purple-300 flex items-center justify-end gap-0.5">
                              <Split className="w-2.5 h-2.5" />
                              <span>{pedido.pagamentosPrevistos.length} formas</span>
                            </span>
                          ) : (
                            <span className="uppercase">{pedido.formaPagamentoPrevista}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Detalhe de pagamentos múltiplos previstos */}
                    {pedido.pagamentosPrevistos && pedido.pagamentosPrevistos.length > 1 && (
                      <div className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-[10px] text-purple-200 flex flex-wrap gap-2">
                        <span className="font-bold text-purple-300 flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          Previsto:
                        </span>
                        {pedido.pagamentosPrevistos.map((pg, pIdx) => (
                          <span key={pIdx} className="bg-purple-900/60 px-1.5 py-0.5 rounded font-mono">
                            {pg.forma}: {formatarMoeda(pg.valor)}
                            {pg.forma === 'DINHEIRO' && pg.trocoPara ? ` (Troco R$ ${pg.trocoPara})` : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Address & GPS shortcut */}
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs space-y-1">
                      <div className="flex items-start gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">
                            {pedido.cliente.endereco}, {pedido.cliente.numero}
                          </span>
                          {pedido.cliente.complemento && (
                            <span className="text-[10px] text-slate-400 block">
                              Comp: {pedido.cliente.complemento}
                            </span>
                          )}
                          {pedido.cliente.referencia && (
                            <span className="text-[10px] text-amber-300 block">
                              Ref: {pedido.cliente.referencia}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                        <span className="text-slate-400">Tel: {pedido.cliente.telefone}</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${pedido.cliente.endereco}, ${pedido.cliente.numero}, ${pedido.cliente.bairroNome}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Abrir GPS / Waze</span>
                        </a>
                      </div>
                    </div>

                    {/* Items to deliver */}
                    <div className="space-y-1 text-xs">
                      {pedido.itens.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-[11px] bg-slate-900/40 px-2 py-1 rounded-lg"
                        >
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="font-bold text-white">{it.quantidade}x</span>
                            <span>{it.nomeProduto}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {it.tipoVenda === 'RECARGA' ? '🔄 Troca Casco' : '📦 Vasilhame Novo'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Actions (Baixa & Devolução) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => abrirModalBaixa(pedido)}
                        className="sm:col-span-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>DAR BAIXA (OFFLINE)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPedidoParaDevolucao(pedido)}
                        className="py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all active:scale-98"
                        title="Devolver pedido para o emitente corrigir"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Devolver</span>
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              /* CONCLUIDAS TAB */
              pedidosHistoricoEntregues.length === 0 ? (
                <div className="p-6 text-center text-slate-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">Nenhum pedido entregue ou concluído até o momento.</p>
                </div>
              ) : (
                pedidosHistoricoEntregues.map((pedido) => (
                  <div
                    key={pedido.id}
                    className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 space-y-2 transition-all shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-white">{pedido.codigo}</span>
                          {pedido.status === 'CONCLUIDO' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[9px] flex items-center gap-1">
                              🏁 Concluído (Caixa Fechado)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[9px] flex items-center gap-1">
                              🟢 Entregue (Aguardando Acerto)
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-300 mt-1">{pedido.cliente.nome}</h4>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-emerald-400">{formatarMoeda(pedido.total)}</span>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                          {pedido.formaPagamentoRealizada || pedido.formaPagamentoPrevista}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      {pedido.cliente.endereco}, {pedido.cliente.numero} ({pedido.cliente.bairroNome})
                    </div>

                    <div className="p-1.5 bg-slate-900/60 rounded-lg text-[10px] text-slate-400 flex items-center justify-between font-mono">
                      <span>Data: {formatarDataHora(pedido.entregueEm || pedido.criadoEm)}</span>
                      <span>Itens: {pedido.itens.map((it) => `${it.quantidade}x ${it.nomeProduto}`).join(', ')}</span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL DE HISTÓRICO DE NOTIFICAÇÕES PUSH (DRAWER)                       */}
      {/* ---------------------------------------------------------------------- */}
      {modalPushAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fade-in">
          <div className="bg-[#eaecf0] rounded-2xl max-w-lg w-full p-4 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm sm:text-base">Histórico de Notificações Push</h3>
                  <p className="text-[11px] text-slate-500">Supabase Realtime & Web Push Dispatched Log</p>
                </div>
              </div>
              <button
                onClick={() => setModalPushAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {historicoPush.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Nenhuma notificação registrada ainda.
                </div>
              ) : (
                historicoPush.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markPushNotificationAsRead(notif.id);
                      setHistoricoPush((prev) =>
                        prev.map((n) => (n.id === notif.id ? { ...n, lida: true } : n))
                      );
                    }}
                    className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                      notif.lida
                        ? 'bg-slate-50 border-slate-200 text-slate-600'
                        : 'bg-blue-50/80 border-blue-300 text-blue-950 font-medium shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900">{notif.titulo}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">{notif.corpo}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                      <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold uppercase">
                        {notif.canal}
                      </span>
                      {notif.valorTotal && (
                        <span className="font-bold text-emerald-700">{formatarMoeda(notif.valorTotal)}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  playPushChime('NORMAL');
                  triggerPushVibration();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Testar Som de Alerta</span>
              </button>
              <button
                onClick={() => setModalPushAberto(false)}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL DE SIMULAÇÃO DE PUSH NOTIFICATIONS                                */}
      

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL DE BAIXA OFFLINE                                                 */}
      {/* ---------------------------------------------------------------------- */}
      {pedidoParaBaixa && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fade-in">
          <div className="bg-[#eaecf0] rounded-2xl max-w-md w-full p-4 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  CONFIRMAÇÃO DE ENTREGA
                </span>
                <h3 className="font-black text-slate-900 text-base mt-0.5">
                  Baixa do Pedido {pedidoParaBaixa.codigo}
                </h3>
              </div>
              <button onClick={() => setPedidoParaBaixa(null)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            {/* Customer info */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{pedidoParaBaixa.cliente.nome}</div>
              <div className="text-slate-600">
                {pedidoParaBaixa.cliente.endereco}, {pedidoParaBaixa.cliente.numero} - {pedidoParaBaixa.cliente.bairroNome}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Total a Cobrar:</span>
                <span className="font-black text-emerald-700 text-sm">{formatarMoeda(pedidoParaBaixa.total)}</span>
              </div>
            </div>

            {/* Payment Method Selector (Single vs Multiple / Split) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Forma de Pagamento no Ato:</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const novoModo = !modoMultiploBaixa;
                    setModoMultiploBaixa(novoModo);
                    if (novoModo && pagamentosBaixa.length === 0) {
                      setPagamentosBaixa([
                        { id: 'pg_bx_1', forma: formaPagtoRealizada, valor: pedidoParaBaixa.total },
                      ]);
                    }
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    modoMultiploBaixa
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Split className="w-3 h-3" />
                  <span>{modoMultiploBaixa ? '✓ Múltiplas Formas' : '+ Dividir / Alterar'}</span>
                </button>
              </div>

              {!modoMultiploBaixa ? (
                /* Modo Pagamento Único */
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-1">
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
                            { id: 'pg_bx_1', forma: tipo, valor: pedidoParaBaixa.total },
                          ]);
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                          formaPagtoRealizada === tipo
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {formaPagtoRealizada === 'DINHEIRO' && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900">Valor Recebido do Cliente:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-amber-800">R$</span>
                          <input
                            type="number"
                            value={valorRecebido || ''}
                            onChange={(e) => setValorRecebido(Number(e.target.value))}
                            className="w-24 px-2 py-1 rounded bg-[#eaecf0] border border-amber-300 font-black text-right text-slate-900 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between font-bold text-amber-900 pt-1 border-t border-amber-200">
                        <span>Troco a Devolver:</span>
                        <span className="text-sm font-black text-amber-800 font-mono">
                          {formatarMoeda(Math.max(0, valorRecebido - pedidoParaBaixa.total))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Modo Múltiplas Formas / Dividido */
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                    <span>Valores Recebidos:</span>
                    <span className="font-mono">Total: {formatarMoeda(pedidoParaBaixa.total)}</span>
                  </div>

                  <div className="space-y-1.5">
                    {pagamentosBaixa.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-2 rounded-lg bg-white border border-purple-200 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <select
                            value={item.forma}
                            onChange={(e) =>
                              handleAlterarPagamentoBaixa(idx, 'forma', e.target.value as FormaPagamento)
                            }
                            className="px-2 py-1 rounded border border-slate-300 text-xs font-bold bg-[#eaecf0] text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 shrink-0"
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
                              className="w-full pl-7 pr-2 py-1 rounded border border-slate-300 text-xs font-mono font-bold bg-[#eaecf0] text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePreencherRestanteBaixa(idx)}
                            className="px-2 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-900 text-[10px] font-bold border border-purple-300 shrink-0 transition-colors"
                          >
                            Completar
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
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px]">
                            <span className="text-slate-600 font-medium">Nota recebida (Troco):</span>
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
                                className="w-16 px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-bold bg-[#eaecf0]"
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
                      className="flex items-center gap-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar outra forma</span>
                    </button>

                    {/* Status de Cobertura */}
                    {(() => {
                      const soma = pagamentosBaixa.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
                      const dif = pedidoParaBaixa.total - soma;
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

            {/* Vasilhames recolhidos vs pendentes */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800">Controle de Vasilhames / Cascos:</span>

              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Casco Botijão P13:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">Recolhido:</span>
                    <input
                      type="number"
                      min="0"
                      value={cascosP13Recolhidos}
                      onChange={(e) => setCascosP13Recolhidos(Number(e.target.value))}
                      className="w-12 px-1.5 py-0.5 rounded border border-slate-300 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Casco Galão Água 20L:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">Recolhido:</span>
                    <input
                      type="number"
                      min="0"
                      value={cascosP20LRecolhidos}
                      onChange={(e) => setCascosP20LRecolhidos(Number(e.target.value))}
                      className="w-12 px-1.5 py-0.5 rounded border border-slate-300 text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Note */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-800">Observação da Entrega (Opcional):</label>
              <input
                type="text"
                placeholder="Ex: Deixado na portaria, recebido pela esposa..."
                value={obsEntrega}
                onChange={(e) => setObsEntrega(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            {/* Confirm Actions */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setPedidoParaBaixa(null)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-xs text-slate-700"
              >
                Cancelar
              </button>

              <button
                onClick={confirmarBaixa}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-xs shadow-md transition-all"
              >
                ✓ CONFIRMAR BAIXA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devolver Pedido para Correção pelo Emitente */}
      <ModalDevolverPedido
        pedido={pedidoParaDevolucao}
        isOpen={Boolean(pedidoParaDevolucao)}
        onClose={() => setPedidoParaDevolucao(null)}
        onConfirmarDevolucao={handleConfirmarDevolucao}
        nomeEntregador={entregadorAtual?.nome || 'Entregador'}
      />
    </div>
  );
};
