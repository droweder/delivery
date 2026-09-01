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
  Crown,
  LogOut,
  ArrowLeft,
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
  | 'entregador';

interface Props {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  pedidosPendentesCount: number;
  pedidosEmRotaCount: number;
  pedidosEntreguesCount: number;
  pedidosDevolvidosCount?: number;
  usuarioLogado?: Usuario;
  empresaNome?: string;
  isSuperAdmin?: boolean;
  onVoltarSuperAdmin?: () => void;
  onLogout?: () => void;
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
  empresaNome = 'Disk Entrega & Conveniência',
  isSuperAdmin = false,
  onVoltarSuperAdmin,
  onLogout,
  onAbrirTrocaUsuario,
  onRefreshAll,
}) => {
  const [offlineMode, setOfflineMode] = useState(isDeviceOffline());
  const [menuSuspensoAberto, setMenuSuspensoAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todasOpcoes: Array<MenuOption & { permitido: boolean }> = [
    {
      id: 'pdv',
      label: '1. PDV Express & Vendas',
      shortLabel: 'PDV',
      badge: pedidosPendentesCount,
      badgeClass: 'bg-amber-400 text-slate-950',
      icon: ShoppingBag,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.emitirPedidos),
    },
    {
      id: 'despacho',
      label: '2. Despacho Kanban',
      shortLabel: 'Despacho',
      badge: pedidosEmRotaCount,
      badgeClass: 'bg-sky-400 text-slate-950',
      icon: Truck,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.despacharPedidos),
    },
    {
      id: 'acerto',
      label: '3. Acerto & Fechamento',
      shortLabel: 'Acerto',
      badge: pedidosEntreguesCount,
      badgeClass: 'bg-emerald-400 text-slate-950',
      icon: DollarSign,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.realizarAcertoCaixa),
    },
    {
      id: 'vasilhames',
      label: '4. Estoque de Vasilhames',
      shortLabel: 'Estoque',
      icon: Layers,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.ajustarEstoque),
    },
    {
      id: 'gerencia',
      label: '5. Gerência & Dashboard',
      shortLabel: 'Gerência',
      icon: TrendingUp,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.verDashboardGerencial),
    },
    {
      id: 'cadastros',
      label: '6. Central de Cadastros',
      shortLabel: 'Cadastros',
      icon: FolderKanban,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.acessarCadastros),
    },
    {
      id: 'usuarios',
      label: '7. Gestão de Usuários & Permissões',
      shortLabel: 'Usuários & Permissões',
      icon: Users,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.gerenciarUsuarios),
    },
    {
      id: 'entregador',
      label: '📱 App do Entregador (Rua Offline)',
      shortLabel: 'App Entregador',
      icon: Smartphone,
      destaque: true,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        usuarioLogado?.perfil === 'ENTREGADOR' ||
        Boolean(usuarioLogado?.entregadorIdVinculado),
    },
  ];

  const opcoesMenu = todasOpcoes.filter((op) => op.permitido);
  const opcaoAtual = opcoesMenu.find((o) => o.id === activeTab) || opcoesMenu[0] || todasOpcoes[0];
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
        <div className="flex items-center justify-between h-14 gap-3">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 to-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <div className="flex items-center justify-center -space-x-1">
                <Flame className="w-4 h-4 text-amber-200" />
                <Droplet className="w-3.5 h-3.5 text-blue-100" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                  Delivery
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Offline-First
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-amber-400/95 truncate leading-tight">
                {empresaNome}
              </p>
            </div>
          </div>

          {/* Right Status Badges & Active User */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Super Admin Back to Management Button */}
            {isSuperAdmin && onVoltarSuperAdmin && (
              <button
                type="button"
                onClick={onVoltarSuperAdmin}
                title="Voltar ao Painel Geral de Super Admin"
                className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Painel Super Admin</span>
                <span className="sm:hidden">Admin</span>
              </button>
            )}

            {/* Logged User Badge */}
            {usuarioLogado && (
              <div
                title={`Usuário Conectado: ${usuarioLogado.nome} (${usuarioLogado.cargo || usuarioLogado.perfil})`}
                className="hidden sm:flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
              >
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${
                    usuarioLogado.perfil === 'SUPER_ADMIN'
                      ? 'bg-amber-500 text-slate-950'
                      : usuarioLogado.perfil === 'ADMIN'
                      ? 'bg-purple-600'
                      : usuarioLogado.perfil === 'GERENTE'
                      ? 'bg-blue-600'
                      : usuarioLogado.perfil === 'ENTREGADOR'
                      ? 'bg-amber-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  {usuarioLogado.perfil === 'SUPER_ADMIN' ? '👑' : usuarioLogado.nome[0]}
                </div>
                <span className="font-bold text-[11px] max-w-[90px] lg:max-w-[130px] truncate">
                  {usuarioLogado?.nome?.split(' ')[0]}
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-700 text-slate-300 font-semibold uppercase">
                  {usuarioLogado.perfil === 'SUPER_ADMIN'
                    ? 'SUPER'
                    : usuarioLogado.perfil === 'ATENDENTE_PDV'
                    ? 'PDV'
                    : usuarioLogado.perfil}
                </span>
              </div>
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

            {/* Logout Button */}
            {onLogout && (
              <button
                type="button"
                id="btn-logout"
                onClick={onLogout}
                title="Sair da Conta / Trocar Empresa"
                className="p-1.5 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-950/60 transition-colors border border-transparent hover:border-red-800/60"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
