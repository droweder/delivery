import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  ChevronDown,
  ShoppingBag,
  Truck,
  DollarSign,
  Layers,
  TrendingUp,
  FolderKanban,
  Users,
  Smartphone,
  Database,
  Check,
  Sparkles,
} from 'lucide-react';
import { MainTab } from './Navbar';
import { Usuario } from '../types';

export interface ModuloHeaderProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  usuarioLogado?: Usuario | null;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  moduloNumero?: string | number;
  moduloCor?: string;
  titulo: string;
  subtitulo?: string | React.ReactNode;
  children?: React.ReactNode;
}

interface MenuOption {
  id: MainTab;
  label: string;
  numero: string;
  shortLabel: string;
  descricao: string;
  badge?: number;
  badgeClass?: string;
  icon: React.ComponentType<any>;
  destaque?: boolean;
  permitido: boolean;
}

export const ModuloHeader: React.FC<ModuloHeaderProps> = ({
  activeTab,
  setActiveTab,
  usuarioLogado,
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  moduloNumero,
  moduloCor = 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/50',
  titulo,
  subtitulo,
  children,
}) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const todasOpcoes: MenuOption[] = [
    {
      id: 'pdv',
      numero: '1',
      label: 'PDV Express & Vendas',
      shortLabel: 'PDV',
      descricao: 'Entrada ágil de pedidos, cliente e delivery',
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
      numero: '2',
      label: 'Despacho Kanban',
      shortLabel: 'Despacho',
      descricao: 'Atribuição de rotas, push e saída de motos',
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
      numero: '3',
      label: 'Acerto & Fechamento',
      shortLabel: 'Acerto',
      descricao: 'Conferência de caixa, PIX e vasilhames vazios',
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
      numero: '4',
      label: 'Estoque de Vasilhames',
      shortLabel: 'Estoque',
      descricao: 'Separação líquido vs casco e saldo geral ERP',
      icon: Layers,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.ajustarEstoque),
    },
    {
      id: 'gerencia',
      numero: '5',
      label: 'Gerência & Dashboard',
      shortLabel: 'Gerência',
      descricao: 'Auditoria de vendas, relatórios e BI em tempo real',
      icon: TrendingUp,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.verDashboardGerencial),
    },
    {
      id: 'cadastros',
      numero: '6',
      label: 'Central de Cadastros',
      shortLabel: 'Cadastros',
      descricao: 'Produtos, clientes, entregadores e bairros',
      icon: FolderKanban,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.acessarCadastros),
    },
    {
      id: 'usuarios',
      numero: '7',
      label: 'Gestão de Usuários & Permissões',
      shortLabel: 'Usuários',
      descricao: 'Operadores, senhas e controle granular de acessos',
      icon: Users,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        Boolean(usuarioLogado?.permissoes?.gerenciarUsuarios),
    },
    {
      id: 'entregador',
      numero: '📱',
      label: 'App do Entregador (Rua Offline)',
      shortLabel: 'App Entregador',
      descricao: 'Interface PWA móvel offline-first para entregas',
      icon: Smartphone,
      destaque: true,
      permitido:
        isSuperAdmin ||
        usuarioLogado?.perfil === 'ADMIN' ||
        usuarioLogado?.perfil === 'ENTREGADOR' ||
        Boolean(usuarioLogado?.entregadorIdVinculado),
    },
    {
      id: 'arquitetura',
      numero: '⚙️',
      label: 'Schema SQL & Arquitetura',
      shortLabel: 'Schema SQL',
      descricao: 'Estrutura relacional do banco de dados e auditoria',
      icon: Database,
      permitido: isSuperAdmin || usuarioLogado?.perfil === 'ADMIN',
    },
  ];

  const opcoesDisponiveis = todasOpcoes.filter((op) => op.permitido);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAberto(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const totalBadgesGeral =
    (pedidosPendentesCount > 0 ? pedidosPendentesCount : 0) +
    (pedidosEmRotaCount > 0 ? pedidosEmRotaCount : 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left Side: Menu Access Button + Title */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {/* Botão de Acesso aos Menus */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              id="btn-menu-modulos-segunda-barra"
              onClick={() => setMenuAberto(!menuAberto)}
              title="Acessar Menus e Módulos do Sistema"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all shadow-xs border select-none active:scale-95 ${
                menuAberto
                  ? 'bg-blue-600 text-white border-blue-500 ring-2 ring-blue-500/30'
                  : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-800 dark:border-slate-700 hover:border-slate-600'
              }`}
            >
              <LayoutGrid
                className={`w-4 h-4 transition-transform duration-200 ${
                  menuAberto ? 'rotate-90 text-white' : 'text-amber-400'
                }`}
              />
              <span className="tracking-tight">Menus</span>
              {totalBadgesGeral > 0 && !menuAberto && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                  {totalBadgesGeral}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  menuAberto ? 'rotate-180 text-white' : ''
                }`}
              />
            </button>

            {/* Menu Popover Dropdown */}
            {menuAberto && (
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-84 bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-slate-800/80 max-h-[82vh] overflow-y-auto">
                <div className="p-3 bg-slate-950/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                      Módulos do Sistema
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Escolha uma tela</span>
                </div>

                <div className="p-2 space-y-1">
                  {opcoesDisponiveis.map((op) => {
                    const isSelected = activeTab === op.id;
                    const Icon = op.icon;

                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(op.id);
                          setMenuAberto(false);
                        }}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-all group ${
                          isSelected
                            ? 'bg-blue-600 text-white font-black shadow-xs'
                            : op.destaque
                            ? 'bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60 border border-emerald-800/40 font-bold'
                            : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-800 text-blue-400 group-hover:bg-slate-700'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{op.label}</span>
                            </div>
                            <p
                              className={`text-[10px] truncate ${
                                isSelected ? 'text-blue-100' : 'text-slate-400'
                              }`}
                            >
                              {op.descricao}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {Boolean(op.badge && op.badge > 0) && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                                isSelected ? 'bg-white text-blue-700' : op.badgeClass
                              }`}
                            >
                              {op.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Divisor vertical sutil */}
          <div className="hidden sm:block h-7 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

          {/* Tag do Módulo + Título + Subtítulo */}
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              {moduloNumero && (
                <span
                  className={`px-2 py-0.5 rounded-md font-black text-[10px] tracking-wider uppercase border border-slate-200/60 dark:border-transparent shrink-0 ${moduloCor}`}
                >
                  MÓDULO {moduloNumero}
                </span>
              )}
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {titulo}
              </h2>
            </div>
            {subtitulo && (
              <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                {subtitulo}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Custom Actions / Filters */}
        {children && (
          <div className="flex items-center flex-wrap gap-2 shrink-0 md:self-center">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
