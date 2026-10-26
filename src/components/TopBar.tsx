import React from 'react';
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
  Menu,
} from 'lucide-react';
import { MainTab } from './Navbar';

interface TopBarProps {
  activeTab: MainTab;
  empresaNome?: string;
  setMobileSidebarOpen: (open: boolean) => void;
  pedidosPendentesCount: number;
  pedidosEmRotaCount: number;
  pedidosEntreguesCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  empresaNome = 'Disk Entrega & Conveniência',
  setMobileSidebarOpen,
  pedidosPendentesCount,
  pedidosEmRotaCount,
  pedidosEntreguesCount,
}) => {
  const getTabDetails = (tab: MainTab) => {
    switch (tab) {
      case 'pdv':
        return {
          title: 'PDV Express & Vendas',
          subtitle: 'Lançamento e emissão ágil de pedidos',
          icon: ShoppingBag,
          color: 'text-amber-400',
          badge: pedidosPendentesCount > 0 ? `${pedidosPendentesCount} Pendentes` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      case 'despacho':
        return {
          title: 'Despacho Kanban',
          subtitle: 'Controle de entregadores e expedição em rota',
          icon: Truck,
          color: 'text-sky-400',
          badge: pedidosEmRotaCount > 0 ? `${pedidosEmRotaCount} Em Rota` : null,
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        };
      case 'acerto':
        return {
          title: 'Acerto & Fechamento de Caixa',
          subtitle: 'Conferência de valores, trocos e prestação de contas',
          icon: DollarSign,
          color: 'text-emerald-400',
          badge: pedidosEntreguesCount > 0 ? `${pedidosEntreguesCount} Para Acerto` : null,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'vasilhames':
        return {
          title: 'Estoque de Vasilhames & Balanço',
          subtitle: 'Controle de garrafeiros, botijões P13 e 20L',
          icon: Layers,
          color: 'text-indigo-400',
          badge: null,
          badgeColor: '',
        };
      case 'gerencia':
        return {
          title: 'Gerência & Dashboard DRE',
          subtitle: 'Demonstrativo de resultados e indicadores de desempenho',
          icon: TrendingUp,
          color: 'text-purple-400',
          badge: null,
          badgeColor: '',
        };
      case 'jornadas':
        return {
          title: 'Jornadas & Rastreio de Entregadores',
          subtitle: 'Abertura de turnos, controle de KM e auditoria de frotas',
          icon: History,
          color: 'text-cyan-400',
          badge: null,
          badgeColor: '',
        };
      case 'cadastros':
        return {
          title: 'Central de Cadastros',
          subtitle: 'Produtos, Clientes, Bairros, Veículos e Fornecedores',
          icon: FolderKanban,
          color: 'text-blue-400',
          badge: null,
          badgeColor: '',
        };
      case 'usuarios':
        return {
          title: 'Gestão de Usuários & Permissões',
          subtitle: 'Controle de acessos, perfis e funções da equipe',
          icon: Users,
          color: 'text-pink-400',
          badge: null,
          badgeColor: '',
        };
      case 'entregador':
        return {
          title: 'App do Entregador (Rua Offline)',
          subtitle: 'Interface mobile otimizada para campo e entregas',
          icon: Smartphone,
          color: 'text-amber-400',
          badge: 'Modo Campo',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        };
      default:
        return {
          title: 'Sistema de Delivery',
          subtitle: empresaNome,
          icon: ShoppingBag,
          color: 'text-white',
          badge: null,
          badgeColor: '',
        };
    }
  };

  const tabInfo = getTabDetails(activeTab);
  const TabIcon = tabInfo.icon;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md">
      <div className="w-full px-3 sm:px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left Side: Mobile Menu Button + Current Active Module Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Toggle Mobile Menu Button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            title="Abrir Menu Lateral"
            className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 shrink-0 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Active Module Header Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/80 shadow-xs shrink-0">
              <TabIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${tabInfo.color}`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                  {tabInfo.title}
                </h2>
                {tabInfo.badge && (
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${tabInfo.badgeColor}`}
                  >
                    {tabInfo.badge}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">
                {tabInfo.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Contextual Screen Actions & Search Slot */}
        <div
          id="topbar-actions-slot"
          className="flex items-center gap-2 justify-end min-w-0 flex-1 ml-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        />
      </div>
    </header>
  );
};
