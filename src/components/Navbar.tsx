import React, { useEffect, useState, useRef } from 'react';
import {
  ShoppingBag,
  Truck,
  DollarSign,
  Layers,
  Smartphone,
  Database,
  Wifi,
  WifiOff,
  Flame,
  Droplet,
  RefreshCw,
  TrendingUp,
  FolderKanban,
  Users,
  ChevronDown,
  Menu,
  X,
  User,
  Shield,
  RotateCcw,
  Check,
} from 'lucide-react';
import { isDeviceOffline, setSimulatedOffline } from '../lib/offlineDb';
import { Usuario } from '../types';

export type MainTab =
  | 'pdv'
  | 'despacho'
  | 'acerto'
  | 'vasilhames'
  | 'gerencia'
  | 'cadastros'
  | 'usuarios'
  | 'entregador'
  | 'arquitetura';

interface Props {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  pedidosPendentesCount: number;
  pedidosEmRotaCount: number;
  pedidosEntreguesCount: number;
  pedidosDevolvidosCount?: number;
  usuarioLogado?: Usuario;
  onAbrirTrocaUsuario?: () => void;
  onRefreshAll: () => void;
}

interface MenuOption {
  id: MainTab;
  label: string;
  shortLabel: string;
  badge?: number;
  badgeClass?: string;
  icon: React.ComponentType<any>;
  destaque?: boolean;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  pedidosPendentesCount,
  pedidosEmRotaCount,
  pedidosEntreguesCount,
  pedidosDevolvidosCount = 0,
  usuarioLogado,
  onAbrirTrocaUsuario,
  onRefreshAll,
}) => {
  const [offlineMode, setOfflineMode] = useState(isDeviceOffline());
  const [menuSuspensoAberto, setMenuSuspensoAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const opcoesMenu: MenuOption[] = [
    {
      id: 'pdv',
      label: '1. PDV Express & Vendas',
      shortLabel: 'PDV',
      badge: pedidosPendentesCount,
      badgeClass: 'bg-amber-400 text-slate-950',
      icon: ShoppingBag,
    },
    {
      id: 'despacho',
      label: '2. Despacho Kanban',
      shortLabel: 'Despacho',
      badge: pedidosEmRotaCount,
      badgeClass: 'bg-sky-400 text-slate-950',
      icon: Truck,
    },
    {
      id: 'acerto',
      label: '3. Acerto & Fechamento',
      shortLabel: 'Acerto',
      badge: pedidosEntreguesCount,
      badgeClass: 'bg-emerald-400 text-slate-950',
      icon: DollarSign,
    },
    {
      id: 'vasilhames',
      label: '4. Estoque de Vasilhames',
      shortLabel: 'Estoque',
      icon: Layers,
    },
    {
      id: 'gerencia',
      label: '5. Gerência & Dashboard',
      shortLabel: 'Gerência',
      icon: TrendingUp,
    },
    {
      id: 'cadastros',
      label: '6. Central de Cadastros',
      shortLabel: 'Cadastros',
      icon: FolderKanban,
    },
    {
      id: 'usuarios',
      label: '7. Gestão de Usuários',
      shortLabel: 'Usuários',
      icon: Users,
    },
    {
      id: 'entregador',
      label: '📱 App do Entregador (Rua Offline)',
      shortLabel: 'App Entregador',
      icon: Smartphone,
      destaque: true,
    },
    {
      id: 'arquitetura',
      label: 'Schema SQL & Arquitetura',
      shortLabel: 'Schema SQL',
      icon: Database,
    },
  ];

  const opcaoAtual = opcoesMenu.find((o) => o.id === activeTab) || opcoesMenu[0];
  const IconeAtual = opcaoAtual.icon;

  useEffect(() => {
    const handleNetworkChange = () => {
      setOfflineMode(isDeviceOffline());
    };
    window.addEventListener('network-status-changed', handleNetworkChange);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    return () => {
      window.removeEventListener('network-status-changed', handleNetworkChange);
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuSuspensoAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOfflineSimulation = () => {
    const next = !offlineMode;
    setSimulatedOffline(next);
    setOfflineMode(next);
  };

  const selecionarAba = (tab: MainTab) => {
    setActiveTab(tab);
    setMenuSuspensoAberto(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 to-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <div className="flex items-center justify-center -space-x-1">
                <Flame className="w-4 h-4 text-amber-200" />
                <Droplet className="w-3.5 h-3.5 text-blue-100" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                  Disk Entrega & Conveniência
                </h1>
                <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Offline-First
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden lg:block truncate">
                Gás GLP, Água 20L e Bebidas • Base Operacional & Rota
              </p>
            </div>
          </div>

          {/* Center/Mobile: Dropdown Menu Suspenso Prominente */}
          <div className="relative flex-1 max-w-xs md:max-w-sm mx-1 sm:mx-2" ref={dropdownRef}>
            <button
              type="button"
              id="btn-menu-suspenso"
              onClick={() => setMenuSuspensoAberto(!menuSuspensoAberto)}
              className={`w-full py-1.5 px-2.5 sm:px-3 rounded-xl border text-left flex items-center justify-between transition-all shadow-xs ${
                menuSuspensoAberto
                  ? 'bg-slate-800 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <IconeAtual className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-black text-xs text-white truncate">
                  {opcaoAtual.label}
                </span>
                {Boolean(opcaoAtual.badge && opcaoAtual.badge > 0) && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-black shrink-0 ${opcaoAtual.badgeClass}`}
                  >
                    {opcaoAtual.badge}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 ml-1 transition-transform ${
                  menuSuspensoAberto ? 'rotate-180 text-blue-400' : ''
                }`}
              />
            </button>

            {/* Dropdown Options Popup */}
            {menuSuspensoAberto && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-slate-800/60 max-h-[80vh] overflow-y-auto">
                <div className="p-2 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Módulos do Sistema</span>
                  <span className="text-[10px] text-blue-400 lowercase">toque para abrir</span>
                </div>

                <div className="p-1.5 space-y-1">
                  {opcoesMenu.map((op) => {
                    const isSelected = activeTab === op.id;
                    const Icon = op.icon;

                    return (
                      <button
                        key={op.id}
                        onClick={() => selecionarAba(op.id)}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : op.destaque
                            ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-800/40'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                          <span>{op.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {Boolean(op.badge && op.badge > 0) && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                isSelected ? 'bg-white text-blue-700' : op.badgeClass
                              }`}
                            >
                              {op.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Status Badges & Active User */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Logged User Badge */}
            {usuarioLogado && (
              <button
                type="button"
                onClick={onAbrirTrocaUsuario}
                title="Clique para alternar operador ou ver permissões"
                className="hidden sm:flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${
                    usuarioLogado.perfil === 'ADMIN'
                      ? 'bg-purple-600'
                      : usuarioLogado.perfil === 'GERENTE'
                      ? 'bg-blue-600'
                      : usuarioLogado.perfil === 'ENTREGADOR'
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {usuarioLogado.nome[0]}
                </div>
                <span className="font-bold text-[11px] max-w-[90px] lg:max-w-[130px] truncate">
                  {usuarioLogado.nome.split(' ')[0]}
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-700 text-slate-300 font-semibold uppercase">
                  {usuarioLogado.perfil === 'ATENDENTE_PDV' ? 'PDV' : usuarioLogado.perfil}
                </span>
              </button>
            )}

            {/* Offline Simulation Switch */}
            <button
              id="btn-toggle-offline-mode"
              onClick={toggleOfflineSimulation}
              title="Alternar simulação de conectividade para testar o funcionamento Offline-First do entregador"
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all border ${
                offlineMode
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {offlineMode ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">Online</span>
                </>
              )}
            </button>

            {/* Refresh Button */}
            <button
              id="btn-refresh-data"
              onClick={onRefreshAll}
              title="Atualizar dados do servidor"
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
