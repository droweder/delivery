import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Truck,
  DollarSign,
  Layers,
  Smartphone,
  TrendingUp,
  FolderKanban,
  Users,
  History,
  ChevronRight,
  Menu,
  X,
  Flame,
  Droplet,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Crown,
  Search,
  Sparkles,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { MainTab } from './Navbar';
import { Usuario } from '../types';

interface SidebarProps {
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
  onRefreshAll: () => void;
  offlineMode: boolean;
  toggleOfflineSimulation: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface MenuItem {
  id: MainTab;
  label: string;
  shortLabel: string;
  badge?: number;
  badgeClass?: string;
  icon: React.ComponentType<any>;
  group: 'operacional' | 'estoque' | 'gestao' | 'config' | 'campo';
  permitido: boolean;
  descricao?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pedidosPendentesCount,
  pedidosEmRotaCount,
  pedidosEntreguesCount,
  usuarioLogado,
  empresaNome = 'Disk Entrega & Conveniência',
  isSuperAdmin = false,
  onVoltarSuperAdmin,
  onLogout,
  onRefreshAll,
  offlineMode,
  toggleOfflineSimulation,
  collapsed: _collapsedProp,
  setCollapsed: _setCollapsedProp,
  mobileOpen,
  setMobileOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  // Auto expande ao passar o mouse e recolhe ao sair; no mobile expande quando aberto
  const isExpanded = mobileOpen || isHovered;
  const collapsed = !isExpanded;

  const menuItems: MenuItem[] = [
    {
      id: 'pdv',
      label: 'PDV Express & Vendas',
      shortLabel: 'PDV',
      badge: pedidosPendentesCount,
      badgeClass: 'bg-amber-400 text-slate-950 font-black',
      icon: ShoppingBag,
      group: 'operacional',
      descricao: 'Lançamento rápido de pedidos e vendas',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.emitirPedidos),
    },
    {
      id: 'despacho',
      label: 'Despacho Kanban',
      shortLabel: 'Despacho',
      badge: pedidosEmRotaCount,
      badgeClass: 'bg-sky-400 text-slate-950 font-black',
      icon: Truck,
      group: 'operacional',
      descricao: 'Monitoramento em tempo real de rotas',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.despacharPedidos),
    },
    {
      id: 'acerto',
      label: 'Acerto & Fechamento',
      shortLabel: 'Acerto',
      badge: pedidosEntreguesCount,
      badgeClass: 'bg-emerald-400 text-slate-950 font-black',
      icon: DollarSign,
      group: 'operacional',
      descricao: 'Conferência de troco e acertos de caixa',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.realizarAcertoCaixa),
    },
    {
      id: 'vasilhames',
      label: 'Estoque de Vasilhames',
      shortLabel: 'Estoque',
      icon: Layers,
      group: 'estoque',
      descricao: 'Controle P13, 20L e garrafeiros',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.ajustarEstoque),
    },
    {
      id: 'gerencia',
      label: 'Gerência & DRE',
      shortLabel: 'Gerência',
      icon: TrendingUp,
      group: 'gestao',
      descricao: 'Demonstrativo e relatórios de resultados',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.verDashboardGerencial),
    },
    {
      id: 'jornadas',
      label: 'Jornadas & Rastreio',
      shortLabel: 'Jornadas',
      icon: History,
      group: 'gestao',
      descricao: 'Abertura de turnos, KM e auditoria de jornadas',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        usuarioLogado?.perfil === 'GERENTE' ||
        Boolean(usuarioLogado?.permissoes?.verDashboardGerencial) ||
        Boolean(usuarioLogado?.permissoes?.acessarCadastros),
    },
    {
      id: 'cadastros',
      label: 'Central de Cadastros',
      shortLabel: 'Cadastros',
      icon: FolderKanban,
      group: 'config',
      descricao: 'Produtos, Clientes, Bairros e Frota',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.acessarCadastros),
    },
    {
      id: 'usuarios',
      label: 'Usuários & Permissões',
      shortLabel: 'Usuários',
      icon: Users,
      group: 'config',
      descricao: 'Controle de acesso por função e nível',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.gerenciarUsuarios),
    },
    {
      id: 'entregador',
      label: 'App do Entregador',
      shortLabel: 'App Entregador',
      icon: Smartphone,
      group: 'campo',
      descricao: 'Modo Rua Offline com sincronização',
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        usuarioLogado?.perfil === 'ENTREGADOR' ||
        Boolean(usuarioLogado?.entregadorIdVinculado),
    },
  ];

  const itensPermitidos = menuItems.filter((i) => i.permitido);
  const itensFiltrados = itensPermitidos.filter((i) =>
    i.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.shortLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.descricao && i.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const grupos = [
    { key: 'operacional', title: 'Operação' },
    { key: 'estoque', title: 'Estoque' },
    { key: 'gestao', title: 'Gestão' },
    { key: 'config', title: 'Configurações' },
    { key: 'campo', title: 'Campo' },
  ];

  const handleSelectTab = (tab: MainTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-100 select-none shadow-xl">
      {/* Sidebar Header / Logo */}
      <div
        className={`h-14 border-b border-slate-800 shrink-0 bg-slate-900/90 backdrop-blur-md flex items-center transition-all ${
          collapsed ? 'justify-center px-2' : 'justify-between px-3 sm:px-3.5 gap-2'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 min-w-0 flex-1'}`}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-blue-600 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <div className="flex items-center justify-center -space-x-1">
              <Flame className="w-4 h-4 text-amber-100 animate-pulse" />
              <Droplet className="w-3.5 h-3.5 text-blue-100" />
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <h1 className="text-xs sm:text-sm font-black tracking-tight text-white truncate" title={empresaNome}>
                  {empresaNome}
                </h1>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  ERP
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 truncate leading-tight">
                Gestão & Delivery
              </p>
            </div>
          )}
        </div>

        {/* Close Mobile Overlay Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Super Admin Switcher (If Super Admin) */}
      {isSuperAdmin && onVoltarSuperAdmin && !collapsed && (
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={onVoltarSuperAdmin}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 shrink-0" />
              <span className="truncate">Painel Super Admin</span>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      )}

      {/* Search Input (Awesomebar) - only when expanded */}
      {!collapsed && (
        <div className="px-3 pt-3 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar módulo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-500 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation Links Grouped */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {grupos.map((grupo) => {
          const itensDoGrupo = itensFiltrados.filter((i) => i.group === grupo.key);
          if (itensDoGrupo.length === 0) return null;

          return (
            <div key={grupo.key} className="space-y-1">
              {!collapsed && (
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>{grupo.title}</span>
                </div>
              )}

              <div className="space-y-1">
                {itensDoGrupo.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      title={collapsed ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : item.descricao}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all relative group ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-amber-400 rounded-r-full" />
                      )}

                      <div className="relative shrink-0 flex items-center justify-center">
                        <Icon
                          className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                          }`}
                        />
                        {/* Badge dot if collapsed */}
                        {collapsed && item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        )}
                      </div>

                      {!collapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0 text-left">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={`ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                                item.badgeClass || 'bg-slate-800 text-slate-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tooltip on collapsed hover */}
                      {collapsed && (
                        <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-white shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                          {item.label}
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-1.5 text-amber-400 font-extrabold">({item.badge})</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Controls & User Profile */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0 space-y-2">
        {/* Connection & Sync Tools */}
        <div className={`flex items-center ${collapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
          <button
            onClick={toggleOfflineSimulation}
            title={offlineMode ? 'Modo Offline Ativo (Clique para ficar Online)' : 'Modo Online Ativo (Clique para simular Offline)'}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
              offlineMode
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {offlineMode ? <WifiOff className="w-3.5 h-3.5 text-rose-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            {!collapsed && <span>{offlineMode ? 'Simular Offline' : 'Rede Conectada'}</span>}
          </button>

          <button
            onClick={onRefreshAll}
            title="Sincronizar dados do servidor"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User Badge */}
        {usuarioLogado && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm ${
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

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-tight">
                    {usuarioLogado.nome}
                  </p>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase">
                    {usuarioLogado.perfil === 'SUPER_ADMIN'
                      ? 'Super Admin'
                      : usuarioLogado.perfil === 'ATENDENTE_PDV'
                      ? 'PDV'
                      : usuarioLogado.perfil}
                  </span>
                </div>
              )}
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sair do sistema"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Sticky left) - Auto expande e recolhe no hover */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:block sticky top-0 h-screen shrink-0 transition-all duration-300 ease-in-out z-40 ${
          isHovered ? 'w-60 shadow-2xl' : 'w-16 shadow-lg'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
