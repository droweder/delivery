import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  X,
  Navigation,
  Clock,
  Battery,
  Gauge,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Truck,
  MapPin,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Radio,
  ExternalLink,
  Phone,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Entregador, PontoLocalizacaoHistorico } from '../types';

// Leaflet default marker icons fix
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface Props {
  aberto: boolean;
  onFechar: () => void;
  entregadores: Entregador[];
  entregadorInicialId?: string;
}

interface EntregadorFrota {
  id: string;
  nome: string;
  telefone: string;
  veiculo: string;
  placa: string;
  status: string;
  pedidosAtivosCount: number;
  pedidosEmRota?: Array<{
    id: string;
    codigo: string;
    clienteNome?: string;
    endereco?: string;
    total: number;
    itensResumo?: string;
  }>;
  bateriaNivel: number;
  latAtual: number;
  lngAtual: number;
  ultimaAtualizacaoGps: string;
  velocidadeAtualKmh: number;
  precisaoMetros: number;
  totalEntregasHoje: number;
}

// Controller component to smoothly pan/zoom Leaflet map
function MapFlyTo({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Fit bounds to polyline points
function MapFitBounds({ pontos }: { pontos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (pontos.length > 1) {
      const bounds = L.latLngBounds(pontos);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pontos.length === 1) {
      map.setView(pontos[0], 15);
    }
  }, [pontos, map]);
  return null;
}

// Haversine formula to compute distance in km
function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Custom DivIcons
const getCourierDivIcon = (nome: string, status: string, velocidade: number) => {
  const isEmRota = status === 'EM_ROTA';
  const corBg = isEmRota ? '#0284c7' : '#10b981';
  const pulseClass = isEmRota ? 'animate-pulse' : '';

  return L.divIcon({
    className: 'custom-courier-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          background-color: ${corBg};
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          border: 2.5px solid white;
          font-size: 17px;
        " class="${pulseClass}">
          🛵
        </div>
        <div style="
          background-color: rgba(15, 23, 42, 0.9);
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 6px;
          margin-top: 3px;
          white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.25);
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span>${nome.split(' ')[0]}</span>
          ${velocidade > 0 ? `<span style="color: #38bdf8; font-size: 9px;">${velocidade}km/h</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 26],
    popupAnchor: [0, -26],
  });
};

const getPlaybackDivIcon = (velocidade: number, hora: string) => {
  return L.divIcon({
    className: 'custom-playback-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          background-color: #f59e0b;
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.3), 0 4px 12px rgba(0,0,0,0.4);
          border: 2.5px solid white;
          font-size: 18px;
        ">
          🛵
        </div>
        <div style="
          background-color: #0f172a;
          color: #fbbf24;
          font-size: 10px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 6px;
          margin-top: 4px;
          white-space: nowrap;
          border: 1px solid #f59e0b;
        ">
          ⏱️ ${hora} ${velocidade > 0 ? `• ${velocidade} km/h` : ''}
        </div>
      </div>
    `,
    iconSize: [50, 56],
    iconAnchor: [25, 28],
  });
};

const getStartPinIcon = () =>
  L.divIcon({
    className: 'start-pin',
    html: `
      <div style="background-color: #16a34a; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 900; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">
        🟢 Início Rota
      </div>
    `,
    iconSize: [70, 24],
    iconAnchor: [35, 12],
  });

const getEndPinIcon = () =>
  L.divIcon({
    className: 'end-pin',
    html: `
      <div style="background-color: #dc2626; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 900; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">
        🏁 Última Posição
      </div>
    `,
    iconSize: [85, 24],
    iconAnchor: [42, 12],
  });

export const ModalRastreamentoEntregadores: React.FC<Props> = ({
  aberto,
  onFechar,
  entregadores,
  entregadorInicialId,
}) => {
  const [modo, setModo] = useState<'tempo_real' | 'historico'>('tempo_real');
  const [fullscreen, setFullscreen] = useState(false);

  // Live Fleet State
  const [frota, setFrota] = useState<EntregadorFrota[]>([]);
  const [carregandoFrota, setCarregandoFrota] = useState(false);
  const [entregadorFocoId, setEntregadorFocoId] = useState<string | null>(entregadorInicialId || null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.55052, -46.633308]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [ultimoSyncGps, setUltimoSyncGps] = useState<string>('');

  // History / Replay State
  const [entregadorHistoricoId, setEntregadorHistoricoId] = useState<string>(
    entregadorInicialId || entregadores[0]?.id || 'e1'
  );
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [historicoPontos, setHistoricoPontos] = useState<PontoLocalizacaoHistorico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [replayTocando, setReplayTocando] = useState<boolean>(false);
  const [replayVelocidade, setReplayVelocidade] = useState<number>(1); // 1x, 2x, 5x

  const replayTimerRef = useRef<any>(null);

  // Fetch Live Fleet Data
  const carregarDadosFrota = async () => {
    try {
      setCarregandoFrota(true);
      const res = await fetch('/api/rastreamento/frota');
      if (res.ok) {
        const data = await res.json();
        setFrota(data.frota || []);
        setUltimoSyncGps(new Date().toLocaleTimeString());

        // Se houver entregador selecionado para foco, centraliza nele
        if (entregadorFocoId) {
          const alvo = data.frota?.find((f: EntregadorFrota) => f.id === entregadorFocoId);
          if (alvo && alvo.latAtual && alvo.lngAtual) {
            setMapCenter([alvo.latAtual, alvo.lngAtual]);
          }
        } else if (data.frota && data.frota.length > 0) {
          const primeiro = data.frota[0];
          if (primeiro.latAtual && primeiro.lngAtual) {
            setMapCenter([primeiro.latAtual, primeiro.lngAtual]);
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar frota:', e);
    } finally {
      setCarregandoFrota(false);
    }
  };

  // Fetch Courier Route History
  const carregarHistoricoEntregador = async (entId: string, data: string) => {
    try {
      setCarregandoHistorico(true);
      setReplayTocando(false);
      const res = await fetch(`/api/entregadores/${entId}/historico-localizacao?data=${data}`);
      if (res.ok) {
        const json = await res.json();
        const pts = json.pontos || [];
        setHistoricoPontos(pts);
        setReplayIndex(pts.length > 0 ? pts.length - 1 : 0);
        if (pts.length > 0) {
          const ultimo = pts[pts.length - 1];
          setMapCenter([ultimo.lat, ultimo.lng]);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar historico:', e);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  // Auto-refresh for live fleet every 8 seconds
  useEffect(() => {
    if (!aberto) return;

    if (modo === 'tempo_real') {
      carregarDadosFrota();
      const interval = setInterval(carregarDadosFrota, 8000);
      return () => clearInterval(interval);
    }
  }, [aberto, modo, entregadorFocoId]);

  // Load history when entering history mode or changing target courier/date
  useEffect(() => {
    if (!aberto || modo !== 'historico') return;
    carregarHistoricoEntregador(entregadorHistoricoId, dataSelecionada);
  }, [aberto, modo, entregadorHistoricoId, dataSelecionada]);

  // Sync initial target
  useEffect(() => {
    if (entregadorInicialId) {
      setEntregadorFocoId(entregadorInicialId);
      setEntregadorHistoricoId(entregadorInicialId);
    }
  }, [entregadorInicialId]);

  // Replay playback loop
  useEffect(() => {
    if (!replayTocando) {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      return;
    }

    const intervalMs = Math.max(150, 1000 / replayVelocidade);
    replayTimerRef.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= historicoPontos.length - 1) {
          setReplayTocando(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [replayTocando, replayVelocidade, historicoPontos.length]);

  if (!aberto) return null;

  // Compute Route Statistics
  let distanciaTotalKm = 0;
  let velMaxima = 0;
  let somaVelocidades = 0;

  for (let i = 0; i < historicoPontos.length; i++) {
    const p = historicoPontos[i];
    if (p.velocidadeKmh && p.velocidadeKmh > velMaxima) velMaxima = p.velocidadeKmh;
    somaVelocidades += p.velocidadeKmh || 0;

    if (i > 0) {
      const prev = historicoPontos[i - 1];
      distanciaTotalKm += calcularDistanciaKm(prev.lat, prev.lng, p.lat, p.lng);
    }
  }

  const velMedia = historicoPontos.length > 0 ? Math.round(somaVelocidades / historicoPontos.length) : 0;
  const pontoAtualReplay = historicoPontos[replayIndex] || null;
  const polylineCoords: [number, number][] = historicoPontos.map((p) => [p.lat, p.lng]);

  const entregadorHistoricoNome =
    entregadores.find((e) => e.id === entregadorHistoricoId)?.nome || 'Entregador';

  const formatarHora = (isoStr?: string) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getBateriaColor = (nivel: number) => {
    if (nivel > 50) return 'text-emerald-600 dark:text-emerald-400';
    if (nivel > 20) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400 animate-pulse';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          fullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[92vh] max-h-[850px]'
        }`}
      >
        {/* Top Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shadow-inner">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  Rastreamento GPS & Histórico de Rotas
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Tempo Real
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Localização contínua dos entregadores em rota, telemetria e reprodução cronológica dos trajetos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Tabs */}
            <div className="bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs font-bold">
              <button
                onClick={() => setModo('tempo_real')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  modo === 'tempo_real'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Frota ao Vivo</span>
              </button>
              <button
                onClick={() => setModo('historico')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  modo === 'historico'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Histórico & Replay</span>
              </button>
            </div>

            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:block"
              title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onFechar}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* ========================================================= */}
          {/* LEFT SIDEBAR: Fleet List or Route Info */}
          {/* ========================================================= */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col shrink-0 overflow-hidden">
            {modo === 'tempo_real' ? (
              // FROTA EM TEMPO REAL PANEL
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-sky-600" /> Entregadores Conectados
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {frota.length} monitorados • Atualizado às {ultimoSyncGps || '--:--'}
                    </span>
                  </div>
                  <button
                    onClick={carregarDadosFrota}
                    disabled={carregandoFrota}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 transition-all"
                    title="Recarregar posições agora"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${carregandoFrota ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                  {frota.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <Truck className="w-8 h-8 mx-auto mb-2 opacity-30 text-sky-500" />
                      Nenhum entregador transmitindo sinal no momento.
                    </div>
                  ) : (
                    frota.map((ent) => {
                      const isFoco = entregadorFocoId === ent.id;
                      const emRota = ent.status === 'EM_ROTA';

                      return (
                        <div
                          key={ent.id}
                          onClick={() => {
                            setEntregadorFocoId(ent.id);
                            if (ent.latAtual && ent.lngAtual) {
                              setMapCenter([ent.latAtual, ent.lngAtual]);
                              setMapZoom(16);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                            isFoco
                              ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-sky-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  emRota
                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                }`}
                              >
                                🛵
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  {ent.nome}
                                  {isFoco && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-600 text-white font-extrabold">
                                      Foco
                                    </span>
                                  )}
                                </h4>
                                <span className="text-[10px] text-slate-500">{ent.veiculo}</span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                emRota
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              }`}
                            >
                              {emRota ? 'Em Rota' : 'Disponível'}
                            </span>
                          </div>

                          {/* Telemetry Metrics Bar */}
                          <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 text-[10px]">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Gauge className="w-3 h-3 text-sky-500" />
                              <span className="font-bold font-mono">{ent.velocidadeAtualKmh} km/h</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Battery className={`w-3 h-3 ${getBateriaColor(ent.bateriaNivel)}`} />
                              <span className="font-bold font-mono">{ent.bateriaNivel}%</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 justify-end">
                              <span className="font-bold text-slate-900 dark:text-slate-200">
                                📦 {ent.pedidosAtivosCount}
                              </span>
                            </div>
                          </div>

                          {/* Active Delivery Order Peek */}
                          {ent.pedidosEmRota && ent.pedidosEmRota.length > 0 && (
                            <div className="p-1.5 rounded-lg bg-sky-100/50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-[10px] space-y-0.5">
                              <div className="flex items-center justify-between font-bold text-sky-900 dark:text-sky-300">
                                <span>Destino: {ent.pedidosEmRota[0].codigo}</span>
                                <span>{ent.pedidosEmRota[0].clienteNome}</span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-400 truncate">
                                {ent.pedidosEmRota[0].endereco}
                              </p>
                            </div>
                          )}

                          {/* Action Bar */}
                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatarHora(ent.ultimaAtualizacaoGps)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEntregadorHistoricoId(ent.id);
                                setModo('historico');
                              }}
                              className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                            >
                              <span>Ver Trajeto do Dia</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              // HISTÓRICO & REPLAY PANEL
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-sky-600" /> Parâmetros do Histórico
                  </span>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Entregador:</label>
                      <select
                        value={entregadorHistoricoId}
                        onChange={(e) => setEntregadorHistoricoId(e.target.value)}
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        {entregadores.map((ent) => (
                          <option key={ent.id} value={ent.id}>
                            🛵 {ent.nome} ({ent.veiculo.split(' ')[0]})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Data da Rota:</label>
                      <input
                        type="date"
                        value={dataSelecionada}
                        onChange={(e) => setDataSelecionada(e.target.value)}
                        className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Route Summary KPI Badges */}
                <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block">Distância Total</span>
                      <span className="text-sm font-black font-mono text-sky-600 dark:text-sky-400">
                        {distanciaTotalKm.toFixed(1)} km
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block">Pontos GPS</span>
                      <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                        {historicoPontos.length} registros
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block">Velocidade Média</span>
                      <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {velMedia} km/h
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 font-bold block">Velocidade Máxima</span>
                      <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                        {velMaxima} km/h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Breadcrumbs List */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 px-1 block">
                    Paradas & Pontos Registrados
                  </span>

                  {historicoPontos.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhum trajeto gravado nesta data para {entregadorHistoricoNome}.
                    </div>
                  ) : (
                    historicoPontos.map((p, idx) => {
                      const isAtual = replayIndex === idx;
                      const isStop = p.velocidadeKmh === 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setReplayIndex(idx);
                            setMapCenter([p.lat, p.lng]);
                          }}
                          className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isAtual
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 font-bold'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isStop ? 'bg-amber-500' : 'bg-sky-500'
                              }`}
                            ></span>
                            <div>
                              <div className="font-mono text-[11px] text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{formatarHora(p.timestamp)}</span>
                                {p.pedidoCodigoEmAndamento && (
                                  <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[9px] font-bold">
                                    {p.pedidoCodigoEmAndamento}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {isStop ? 'Parada / Entrega' : `${p.velocidadeKmh || 0} km/h em trânsito`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right text-[10px] text-slate-500 font-mono">
                            <span>🔋 {p.bateriaNivel || 100}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* MAIN WORKSPACE: LEAFLET MAP & REPLAY CONTROLS */}
          {/* ========================================================= */}
          <div className="flex-1 flex flex-col relative min-w-0 min-h-[350px]">
            {/* Map Container */}
            <div className="flex-1 relative w-full h-full">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                className="w-full h-full z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapFlyTo center={mapCenter} zoom={mapZoom} />

                {/* MODE 1: LIVE FLEET MARKERS */}
                {modo === 'tempo_real' &&
                  frota.map((ent) => {
                    if (!ent.latAtual || !ent.lngAtual) return null;

                    return (
                      <Marker
                        key={ent.id}
                        position={[ent.latAtual, ent.lngAtual]}
                        icon={getCourierDivIcon(ent.nome, ent.status, ent.velocidadeAtualKmh)}
                        eventHandlers={{
                          click: () => {
                            setEntregadorFocoId(ent.id);
                          },
                        }}
                      >
                        <Popup className="custom-leaflet-popup">
                          <div className="p-1 space-y-2 text-xs min-w-[210px]">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                              <div>
                                <h4 className="font-extrabold text-slate-900">{ent.nome}</h4>
                                <span className="text-[10px] text-slate-500">{ent.veiculo} ({ent.placa})</span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  ent.status === 'EM_ROTA'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {ent.status === 'EM_ROTA' ? 'Em Rota' : 'Disponível'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg">
                              <div>
                                <span className="text-[9px] text-slate-500 block">Velocidade</span>
                                <span className="font-black text-sky-700">{ent.velocidadeAtualKmh} km/h</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block">Bateria</span>
                                <span className="font-black text-emerald-700">{ent.bateriaNivel}%</span>
                              </div>
                            </div>

                            {ent.pedidosEmRota && ent.pedidosEmRota.length > 0 && (
                              <div className="p-1.5 bg-blue-50 border border-blue-200 rounded text-[10px]">
                                <span className="font-bold text-blue-900 block">
                                  Entrega Ativa: {ent.pedidosEmRota[0].codigo}
                                </span>
                                <span className="text-slate-600 block truncate">
                                  {ent.pedidosEmRota[0].clienteNome} • {ent.pedidosEmRota[0].endereco}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                onClick={() => {
                                  setEntregadorHistoricoId(ent.id);
                                  setModo('historico');
                                }}
                                className="flex-1 py-1 px-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] text-center"
                              >
                                Ver Trajeto Completo
                              </button>
                              {ent.telefone && (
                                <a
                                  href={`https://wa.me/55${ent.telefone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                  title="Falar no WhatsApp"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                {/* MODE 2: ROUTE POLYLINE & REPLAY */}
                {modo === 'historico' && historicoPontos.length > 0 && (
                  <>
                    <MapFitBounds pontos={polylineCoords} />

                    {/* Polyline of the complete route */}
                    <Polyline
                      positions={polylineCoords}
                      pathOptions={{
                        color: '#0284c7',
                        weight: 4,
                        opacity: 0.85,
                        dashArray: undefined,
                      }}
                    />

                    {/* Start Pin */}
                    <Marker
                      position={[historicoPontos[0].lat, historicoPontos[0].lng]}
                      icon={getStartPinIcon()}
                    >
                      <Tooltip permanent direction="top" offset={[0, -10]}>
                        Partida Base: {formatarHora(historicoPontos[0].timestamp)}
                      </Tooltip>
                    </Marker>

                    {/* End Pin */}
                    {historicoPontos.length > 1 && (
                      <Marker
                        position={[
                          historicoPontos[historicoPontos.length - 1].lat,
                          historicoPontos[historicoPontos.length - 1].lng,
                        ]}
                        icon={getEndPinIcon()}
                      >
                        <Tooltip permanent direction="top" offset={[0, -10]}>
                          Último Ponto: {formatarHora(historicoPontos[historicoPontos.length - 1].timestamp)}
                        </Tooltip>
                      </Marker>
                    )}

                    {/* Active Scrubber / Replay Vehicle Marker */}
                    {pontoAtualReplay && (
                      <Marker
                        position={[pontoAtualReplay.lat, pontoAtualReplay.lng]}
                        icon={getPlaybackDivIcon(
                          pontoAtualReplay.velocidadeKmh || 0,
                          formatarHora(pontoAtualReplay.timestamp)
                        )}
                        zIndexOffset={1000}
                      >
                        <Popup>
                          <div className="text-xs p-1 space-y-1">
                            <span className="font-extrabold text-slate-900 block">
                              📍 Ponto #{replayIndex + 1} de {historicoPontos.length}
                            </span>
                            <span className="text-[10px] text-slate-600 block">
                              Horário: {formatarHora(pontoAtualReplay.timestamp)}
                            </span>
                            <span className="text-[10px] text-slate-600 block">
                              Velocidade: {pontoAtualReplay.velocidadeKmh || 0} km/h
                            </span>
                            <span className="text-[10px] text-slate-600 block">
                              Bateria Celular: {pontoAtualReplay.bateriaNivel || 100}%
                            </span>
                            {pontoAtualReplay.pedidoCodigoEmAndamento && (
                              <span className="text-[10px] font-bold text-sky-700 block">
                                Entregando: {pontoAtualReplay.pedidoCodigoEmAndamento}
                              </span>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </>
                )}
              </MapContainer>

              {/* Map Floating Indicator */}
              <div className="absolute top-3 right-3 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {modo === 'tempo_real'
                    ? `${frota.length} entregadores no radar`
                    : `Exibindo trajeto de ${entregadorHistoricoNome}`}
                </span>
              </div>
            </div>

            {/* REPLAY CONTROLLER BAR (Bottom of Map in History Mode) */}
            {modo === 'historico' && historicoPontos.length > 0 && (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 shadow-lg z-10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReplayTocando(!replayTocando)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all"
                  >
                    {replayTocando ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{replayTocando ? 'Pausar Replay' : 'Iniciar Replay'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setReplayTocando(false);
                      setReplayIndex(0);
                      if (historicoPontos[0]) {
                        setMapCenter([historicoPontos[0].lat, historicoPontos[0].lng]);
                      }
                    }}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    title="Reiniciar trajeto para o início"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Playback speed multiplier */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-bold">
                    {[1, 2, 5].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setReplayVelocidade(speed)}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          replayVelocidade === speed
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline Range Scrubber */}
                <div className="flex-1 max-w-lg flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={historicoPontos.length - 1}
                    value={replayIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setReplayIndex(idx);
                      const p = historicoPontos[idx];
                      if (p) setMapCenter([p.lat, p.lng]);
                    }}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-600"
                  />
                  <div className="text-right shrink-0 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[70px]">
                    {formatarHora(pontoAtualReplay?.timestamp)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
