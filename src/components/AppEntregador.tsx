import React, { useState, useEffect } from 'react';
import {
  CascoItemRecolhimento,
  Entregador,
  FormaPagamento,
  NotificacaoPush,
  PagamentoItem,
  Pedido,
  SyncQueueItem,
  TipoEntrega,
  Usuario,
} from '../types';
import { formatarMoeda, formatarDataHora } from '../lib/thermalPrinter';
import { ModalBaixaEntrega } from './ModalBaixaEntrega';
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

  // GPS Tracking State
  const [gpsAtivo, setGpsAtivo] = useState(true);
  const [coordsGps, setCoordsGps] = useState<{ lat: number; lng: number } | null>({
    lat: -23.55052,
    lng: -46.633308,
  });
  const [ultimaAtualizacaoGpsStr, setUltimaAtualizacaoGpsStr] = useState<string>('');

  // Auto GPS Tracking Effect
  useEffect(() => {
    if (!gpsAtivo || !entregadorAtualId) return;

    const enviarPosicaoGps = async (lat: number, lng: number, velocidade?: number, precisao?: number) => {
      try {
        setCoordsGps({ lat, lng });
        setUltimaAtualizacaoGpsStr(new Date().toLocaleTimeString());

        const pedidoAtivo = pedidosLocais.find((p) => p.status === 'EM_ROTA');
        const entAtual = entregadores.find((e) => e.id === entregadorAtualId);

        await fetch(`/api/entregadores/${entregadorAtualId}/localizacao`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            velocidadeKmh: velocidade !== undefined ? velocidade : (pedidoAtivo ? Math.floor(22 + Math.random() * 14) : 0),
            bateriaNivel: entAtual?.bateriaNivel ?? 88,
            precisaoMetros: precisao ?? 8,
            pedidoIdEmAndamento: pedidoAtivo?.id,
            pedidoCodigoEmAndamento: pedidoAtivo?.codigo,
          }),
        });
      } catch (e) {
        console.warn('[GPS Tracking] Erro ao enviar posicao:', e);
      }
    };

    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const vel = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : undefined;
          enviarPosicaoGps(pos.coords.latitude, pos.coords.longitude, vel, pos.coords.accuracy);
        },
        (err) => {
          console.warn('[GPS Geolocation] Fallback devido a erro/iframe:', err.message);
          // Fallback de simulação suave
          enviarPosicaoGps(-23.55052 + (Math.random() - 0.5) * 0.005, -46.633308 + (Math.random() - 0.5) * 0.005, 26, 12);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    }

    const interval = setInterval(() => {
      // Periodic ping
      if (coordsGps) {
        enviarPosicaoGps(
          coordsGps.lat + (Math.random() - 0.5) * 0.002,
          coordsGps.lng + (Math.random() - 0.5) * 0.002,
          Math.floor(20 + Math.random() * 16),
          6
        );
      }
    }, 12000);

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(interval);
    };
  }, [gpsAtivo, entregadorAtualId, pedidosLocais, entregadores]);

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
  };

  // Confirmação de Baixa com dinâmica completa de recolhimento de cascos
  const handleConfirmarBaixaModal = async (dados: {
    formaPagamentoRealizada: FormaPagamento;
    pagamentosRealizados?: PagamentoItem[];
    valorRecebido: number;
    trocoDevolvido: number;
    vasilhamesRecolhidos: { P13: number; P20L: number; [key: string]: number };
    vasilhamesPendentes: { P13: number; P20L: number; [key: string]: number };
    cascosDetalhados: CascoItemRecolhimento[];
    observacaoEntrega: string;
    totalAjustado?: number;
  }) => {
    if (!pedidoParaBaixa) return;

    try {
      const { sincronizadoImediato } = await darBaixaOffline(pedidoParaBaixa.id, entregadorAtualId, {
        formaPagamentoRealizada: dados.formaPagamentoRealizada,
        pagamentosRealizados: dados.pagamentosRealizados,
        valorRecebido: dados.valorRecebido,
        trocoDevolvido: dados.trocoDevolvido,
        vasilhamesRecolhidos: dados.vasilhamesRecolhidos,
        vasilhamesPendentes: dados.vasilhamesPendentes,
        cascosDetalhados: dados.cascosDetalhados,
        observacaoEntrega: dados.observacaoEntrega,
      });

      const codPedido = pedidoParaBaixa.codigo;
      const totalRecolhidos = dados.cascosDetalhados.reduce((acc, c) => acc + c.quantidadeRecolhida, 0);
      const totalPendentes = dados.cascosDetalhados.reduce((acc, c) => acc + c.quantidadePendente, 0);

      setPedidoParaBaixa(null);
      await carregarDadosDoIndexedDB();
      if (onPedidoAtualizadoNoServidor) onPedidoAtualizadoNoServidor();

      let resumoCascos = '';
      if (totalRecolhidos > 0) resumoCascos += ` (${totalRecolhidos} casco(s) recolhido(s))`;
      if (totalPendentes > 0) resumoCascos += ` [⚠️ ${totalPendentes} Vale-Casco pendente gerado]`;

      if (sincronizadoImediato) {
        setNotificacao({
          tipo: 'sucesso',
          texto: `Pedido ${codPedido} entregue e sincronizado com o servidor!${resumoCascos}`,
        });
      } else {
        setNotificacao({
          tipo: 'info',
          texto: `Pedido ${codPedido} gravado OFFLINE no celular (IndexedDB)!${resumoCascos}`,
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

                    {/* Resumo de Cascos Recolhidos do Pedido */}
                    {pedido.cascosRecolhidos && pedido.cascosRecolhidos.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {pedido.cascosRecolhidos.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                              c.quantidadeRecolhida > 0
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80'
                                : 'bg-amber-950/60 text-amber-300 border border-amber-800/80'
                            }`}
                          >
                            📦 {c.quantidadeRecolhida}x {c.nomeCasco} {c.quantidadePendente > 0 ? `(⚠️ ${c.quantidadePendente} pendente)` : '✓'}
                          </span>
                        ))}
                      </div>
                    )}
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
      {/* MODAL DE BAIXA E RECOLHIMENTO DE CASCOS                               */}
      {/* ---------------------------------------------------------------------- */}
      <ModalBaixaEntrega
        pedido={pedidoParaBaixa}
        isOpen={Boolean(pedidoParaBaixa)}
        onClose={() => setPedidoParaBaixa(null)}
        onConfirmarBaixa={handleConfirmarBaixaModal}
        nomeOperadorOuEntregador={entregadorAtual?.nome || 'Entregador'}
        isOffline={isOffline}
      />
    </div>
  );
};
