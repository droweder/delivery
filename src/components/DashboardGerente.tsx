import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  Layers,
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Ban,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Users,
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  BairroTaxa,
  Cliente,
  Entregador,
  FormaPagamento,
  Pedido,
  Produto,
  StatusPedido,
  Usuario,
} from '../types';
import { ModalEditarPedido } from './ModalEditarPedido';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';
import { TopBarActions } from './TopBarPortal';
import { SegmentedTabs, TabItem } from './SegmentedTabs';

interface Props {
  pedidos: Pedido[];
  produtos: Produto[];
  bairros: BairroTaxa[];
  entregadores: Entregador[];
  clientes: Cliente[];
  usuarioLogado?: Usuario | null;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  onPedidoAtualizado: () => void;
  onVisualizarComanda: (pedido: Pedido) => void;
  onNovoPedidoClick?: () => void;
}

type PeriodoFiltro = 'hoje' | 'ontem' | '7dias' | 'mes' | 'todos';
type TabGerente = 'dashboard' | 'pedidos' | 'entregadores' | 'financeiro';

const CORES_PAGAMENTO: Record<string, string> = {
  PIX: '#0ea5e9', // Sky blue
  DINHEIRO: '#10b981', // Emerald green
  CARTAO_DEBITO: '#f59e0b', // Amber
  CARTAO_CREDITO: '#8b5cf6', // Violet
  A_PRAZO_FIADO: '#ef4444', // Rose red
};

const CORES_CATEGORIAS: Record<string, string> = {
  GAS: '#ea580c', // Orange
  AGUA: '#0284c7', // Sky
  BEBIDAS: '#16a34a', // Green
  CONVENIENCIA: '#9333ea', // Purple
  OUTROS: '#64748b', // Slate
};

export const DashboardGerente: React.FC<Props> = ({
  pedidos,
  produtos,
  bairros,
  entregadores,
  clientes,
  usuarioLogado,
  activeTab = 'gerente',
  setActiveTab = () => {},
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onPedidoAtualizado,
  onVisualizarComanda,
  onNovoPedidoClick,
}) => {
  // Aba interna do gerente
  const [gerenteSubTab, setGerenteSubTab] = useState<TabGerente>('dashboard');
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoje');

  // Filtros da Tabela de Pedidos
  const [buscaTexto, setBuscaTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroPagamento, setFiltroPagamento] = useState<string>('TODOS');
  const [filtroEntregador, setFiltroEntregador] = useState<string>('TODOS');

  // Modal de Edição de Pedido
  const [pedidoParaEditar, setPedidoParaEditar] = useState<Pedido | null>(null);
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);

  // Filtragem de Pedidos por Período
  const pedidosFiltradosPeriodo = useMemo(() => {
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const inicioOntem = new Date(inicioHoje.getTime() - 24 * 60 * 60 * 1000);
    const inicio7Dias = new Date(inicioHoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    return pedidos.filter((p) => {
      const dataPed = new Date(p.criadoEm);
      if (periodo === 'hoje') return dataPed >= inicioHoje;
      if (periodo === 'ontem') return dataPed >= inicioOntem && dataPed < inicioHoje;
      if (periodo === '7dias') return dataPed >= inicio7Dias;
      if (periodo === 'mes') return dataPed >= inicioMes;
      return true; // 'todos'
    });
  }, [pedidos, periodo]);

  // Pedidos válidos (não cancelados) para estatísticas financeiras
  const pedidosValidos = useMemo(() => {
    return pedidosFiltradosPeriodo.filter((p) => p.status !== 'CANCELADO');
  }, [pedidosFiltradosPeriodo]);

  // Métricas Gerais (KPIs)
  const kpis = useMemo(() => {
    const totalVendas = pedidosValidos.reduce((acc, p) => acc + p.total, 0);
    const totalSubtotal = pedidosValidos.reduce((acc, p) => acc + p.subtotal, 0);
    const totalTaxas = pedidosValidos.reduce((acc, p) => acc + p.taxaEntrega, 0);
    const totalDescontos = pedidosValidos.reduce((acc, p) => acc + p.desconto, 0);
    const totalPedidosConcluidosOuEntregues = pedidosValidos.filter(
      (p) => p.status === 'CONCLUIDO' || p.status === 'ENTREGUE'
    ).length;

    const concluidos = pedidosFiltradosPeriodo.filter((p) => p.status === 'CONCLUIDO').length;
    const entregues = pedidosFiltradosPeriodo.filter((p) => p.status === 'ENTREGUE').length;
    const emRota = pedidosFiltradosPeriodo.filter((p) => p.status === 'EM_ROTA').length;
    const pendentes = pedidosFiltradosPeriodo.filter((p) => p.status === 'PENDENTE').length;
    const cancelados = pedidosFiltradosPeriodo.filter((p) => p.status === 'CANCELADO').length;

    const ticketMedio = pedidosValidos.length > 0 ? totalVendas / pedidosValidos.length : 0;

    // Vasilhames no período
    let cascosP13Recolhidos = 0;
    let cascosP13Pendentes = 0;
    let cascosP20LRecolhidos = 0;
    let cascosP20LPendentes = 0;

    pedidosValidos.forEach((p) => {
      p.itens.forEach((it) => {
        if (it.tipoVasilhame === 'P13') {
          cascosP13Recolhidos += it.vasilhamesRecolhidosReais || 0;
          cascosP13Pendentes += it.vasilhamesPendentes || 0;
        } else if (it.tipoVasilhame === 'P20L') {
          cascosP20LRecolhidos += it.vasilhamesRecolhidosReais || 0;
          cascosP20LPendentes += it.vasilhamesPendentes || 0;
        }
      });
    });

    // Formas de Pagamento
    const porFormaPagamento: Record<string, { total: number; count: number }> = {
      PIX: { total: 0, count: 0 },
      DINHEIRO: { total: 0, count: 0 },
      CARTAO_DEBITO: { total: 0, count: 0 },
      CARTAO_CREDITO: { total: 0, count: 0 },
      A_PRAZO_FIADO: { total: 0, count: 0 },
    };

    pedidosValidos.forEach((p) => {
      const forma = p.formaPagamentoRealizada || p.formaPagamentoPrevista || 'DINHEIRO';
      const valor = p.valorRecebido || p.total;
      if (!porFormaPagamento[forma]) {
        porFormaPagamento[forma] = { total: 0, count: 0 };
      }
      porFormaPagamento[forma].total += valor;
      porFormaPagamento[forma].count += 1;
    });

    return {
      totalVendas,
      totalSubtotal,
      totalTaxas,
      totalDescontos,
      totalPedidosCount: pedidosFiltradosPeriodo.length,
      totalPedidosValidos: pedidosValidos.length,
      totalPedidosConcluidosOuEntregues,
      concluidos,
      entregues,
      emRota,
      pendentes,
      cancelados,
      ticketMedio,
      cascosP13Recolhidos,
      cascosP13Pendentes,
      cascosP20LRecolhidos,
      cascosP20LPendentes,
      porFormaPagamento,
    };
  }, [pedidosFiltradosPeriodo, pedidosValidos]);

  // 1. Gráfico de Vendas por Hora/Período
  const dadosVendasPorHora = useMemo(() => {
    const horasMap: Record<string, { hora: string; faturamento: number; pedidos: number }> = {};

    // Inicializa horas das 06:00 às 22:00
    for (let h = 6; h <= 21; h++) {
      const chave = `${String(h).padStart(2, '0')}:00`;
      horasMap[chave] = { hora: chave, faturamento: 0, pedidos: 0 };
    }

    pedidosValidos.forEach((p) => {
      const d = new Date(p.criadoEm);
      const h = d.getHours();
      const chave = `${String(h).padStart(2, '0')}:00`;
      if (horasMap[chave]) {
        horasMap[chave].faturamento += p.total;
        horasMap[chave].pedidos += 1;
      } else {
        horasMap[chave] = { hora: chave, faturamento: p.total, pedidos: 1 };
      }
    });

    return Object.values(horasMap).sort((a, b) => a.hora.localeCompare(b.hora));
  }, [pedidosValidos]);

  // 2. Gráfico de Faturamento por Categoria de Produto
  const dadosPorCategoria = useMemo(() => {
    const catMap: Record<string, { nome: string; faturamento: number; itensQtd: number; cor: string }> = {
      GAS: { nome: 'Gás GLP (P13/P45)', faturamento: 0, itensQtd: 0, cor: '#ea580c' },
      AGUA: { nome: 'Água Mineral 20L', faturamento: 0, itensQtd: 0, cor: '#0284c7' },
      BEBIDAS: { nome: 'Bebidas & Cervejas', faturamento: 0, itensQtd: 0, cor: '#16a34a' },
      CONVENIENCIA: { nome: 'Conveniência (Gelo/Carvão)', faturamento: 0, itensQtd: 0, cor: '#9333ea' },
    };

    pedidosValidos.forEach((p) => {
      p.itens.forEach((it) => {
        const cat = it.categoria || 'CONVENIENCIA';
        if (!catMap[cat]) {
          catMap[cat] = { nome: cat, faturamento: 0, itensQtd: 0, cor: '#64748b' };
        }
        catMap[cat].faturamento += it.subtotal;
        catMap[cat].itensQtd += it.quantidade;
      });
    });

    return Object.values(catMap);
  }, [pedidosValidos]);

  // 3. Gráfico de Meios de Pagamento (Donut)
  const dadosMeiosPagamento = useMemo(() => {
    const dados = [
      { name: 'PIX', valor: kpis.porFormaPagamento.PIX.total, pedidos: kpis.porFormaPagamento.PIX.count, color: CORES_PAGAMENTO.PIX },
      { name: 'Dinheiro', valor: kpis.porFormaPagamento.DINHEIRO.total, pedidos: kpis.porFormaPagamento.DINHEIRO.count, color: CORES_PAGAMENTO.DINHEIRO },
      { name: 'Cartão Débito', valor: kpis.porFormaPagamento.CARTAO_DEBITO.total, pedidos: kpis.porFormaPagamento.CARTAO_DEBITO.count, color: CORES_PAGAMENTO.CARTAO_DEBITO },
      { name: 'Cartão Crédito', valor: kpis.porFormaPagamento.CARTAO_CREDITO.total, pedidos: kpis.porFormaPagamento.CARTAO_CREDITO.count, color: CORES_PAGAMENTO.CARTAO_CREDITO },
      { name: 'A Prazo / Fiado', valor: kpis.porFormaPagamento.A_PRAZO_FIADO.total, pedidos: kpis.porFormaPagamento.A_PRAZO_FIADO.count, color: CORES_PAGAMENTO.A_PRAZO_FIADO },
    ].filter((item) => item.valor > 0 || item.pedidos > 0);

    return dados;
  }, [kpis]);

  // 4. Gráfico de Vendas por Bairro
  const dadosPorBairro = useMemo(() => {
    const bairroMap: Record<string, { bairro: string; faturamento: number; pedidos: number }> = {};

    pedidosValidos.forEach((p) => {
      const bNome = p.cliente?.bairroNome || 'Outros';
      if (!bairroMap[bNome]) {
        bairroMap[bNome] = { bairro: bNome, faturamento: 0, pedidos: 0 };
      }
      bairroMap[bNome].faturamento += p.total;
      bairroMap[bNome].pedidos += 1;
    });

    return Object.values(bairroMap).sort((a, b) => b.faturamento - a.faturamento);
  }, [pedidosValidos]);

  // 5. Produtividade dos Entregadores
  const dadosProdutividadeEntregadores = useMemo(() => {
    return entregadores.map((ent) => {
      const pedidosDoEnt = pedidosValidos.filter((p) => p.entregadorId === ent.id);
      const concluidosOuEntregues = pedidosDoEnt.filter((p) => p.status === 'CONCLUIDO' || p.status === 'ENTREGUE');
      const faturamentoTotal = concluidosOuEntregues.reduce((acc, p) => acc + p.total, 0);
      const totalDinheiro = concluidosOuEntregues
        .filter((p) => (p.formaPagamentoRealizada || p.formaPagamentoPrevista) === 'DINHEIRO')
        .reduce((acc, p) => acc + p.total, 0);

      let cascosP13 = 0;
      let cascosP20L = 0;
      concluidosOuEntregues.forEach((p) => {
        p.itens.forEach((it) => {
          if (it.tipoVasilhame === 'P13') cascosP13 += it.vasilhamesRecolhidosReais || 0;
          if (it.tipoVasilhame === 'P20L') cascosP20L += it.vasilhamesRecolhidosReais || 0;
        });
      });

      return {
        id: ent.id,
        nome: ent.nome,
        veiculo: ent.veiculo,
        totalEntregas: concluidosOuEntregues.length,
        emRotaCount: pedidosDoEnt.filter((p) => p.status === 'EM_ROTA').length,
        faturamentoTotal,
        totalDinheiro,
        cascosP13,
        cascosP20L,
      };
    });
  }, [entregadores, pedidosValidos]);

  // Tabela de Pedidos com Filtros Aplicados
  const pedidosTabela = useMemo(() => {
    return pedidosFiltradosPeriodo.filter((p) => {
      // Filtro por texto
      if (buscaTexto.trim()) {
        const q = buscaTexto.toLowerCase().trim();
        const matchCodigo = p.codigo.toLowerCase().includes(q);
        const matchCliente = p.cliente?.nome?.toLowerCase().includes(q);
        const matchEndereco = p.cliente?.endereco?.toLowerCase().includes(q);
        const matchTelefone = p.cliente?.telefone?.includes(q);
        const matchBairro = p.cliente?.bairroNome?.toLowerCase().includes(q);
        if (!matchCodigo && !matchCliente && !matchEndereco && !matchTelefone && !matchBairro) {
          return false;
        }
      }

      // Filtro por status
      if (filtroStatus !== 'TODOS' && p.status !== filtroStatus) {
        return false;
      }

      // Filtro por forma de pagamento
      if (filtroPagamento !== 'TODOS') {
        const forma = p.formaPagamentoRealizada || p.formaPagamentoPrevista;
        if (forma !== filtroPagamento) return false;
      }

      // Filtro por entregador
      if (filtroEntregador !== 'TODOS') {
        if (filtroEntregador === 'SEM_ENTREGADOR') {
          if (p.entregadorId) return false;
        } else if (p.entregadorId !== filtroEntregador) {
          return false;
        }
      }

      return true;
    });
  }, [pedidosFiltradosPeriodo, buscaTexto, filtroStatus, filtroPagamento, filtroEntregador]);

  // Ações de Gestão de Pedidos
  const handleAbrirEdicao = (pedido: Pedido) => {
    setPedidoParaEditar(pedido);
    setModalEdicaoAberto(true);
  };

  const handleSalvarEdicaoPedido = async (
    pedidoAtualizado: Partial<Pedido> & { id: string; motivoAjuste?: string }
  ) => {
    const res = await fetch(`/api/pedidos/${pedidoAtualizado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedidoAtualizado),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao atualizar pedido');
    }

    onPedidoAtualizado();
  };

  const handleCancelarPedido = async (pedidoId: string, motivo: string) => {
    const res = await fetch(`/api/pedidos/${pedidoId}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao cancelar pedido');
    }

    onPedidoAtualizado();
  };

  const handleReabrirPedido = async (pedidoId: string) => {
    const res = await fetch(`/api/pedidos/${pedidoId}/reabrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao reabrir pedido');
    }

    onPedidoAtualizado();
  };

  const handleExcluirPedido = async (pedido: Pedido) => {
    if (
      confirm(
        `ATENÇÃO: Deseja realmente excluir o pedido ${pedido.codigo} do cliente ${pedido.cliente?.nome}? Esta ação é irreversível.`
      )
    ) {
      try {
        const res = await fetch(`/api/pedidos/${pedido.id}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Erro ao excluir pedido');
        onPedidoAtualizado();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Exportar Relatório em CSV
  const exportarCSV = () => {
    const cabecalho = [
      'Codigo',
      'Data_Hora',
      'Cliente',
      'Telefone',
      'Endereco',
      'Bairro',
      'Status',
      'Entregador',
      'Forma_Pagamento',
      'Subtotal',
      'Taxa_Entrega',
      'Desconto',
      'Total',
      'Itens_Descricao',
    ];

    const linhas = pedidosFiltradosPeriodo.map((p) => {
      const itensStr = p.itens.map((it) => `${it.quantidade}x ${it.nomeProduto}`).join(' | ');
      return [
        p.codigo,
        new Date(p.criadoEm).toLocaleString('pt-BR'),
        `"${p.cliente?.nome || ''}"`,
        `"${p.cliente?.telefone || ''}"`,
        `"${p.cliente?.endereco || ''}, ${p.cliente?.numero || ''}"`,
        `"${p.cliente?.bairroNome || ''}"`,
        p.status,
        `"${p.entregadorNome || 'Nenhum'}"`,
        p.formaPagamentoRealizada || p.formaPagamentoPrevista,
        p.subtotal.toFixed(2),
        p.taxaEntrega.toFixed(2),
        p.desconto.toFixed(2),
        p.total.toFixed(2),
        `"${itensStr}"`,
      ].join(';');
    });

    const conteudoCSV = '\uFEFF' + [cabecalho.join(';'), ...linhas].join('\n');
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_vendas_${periodo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabsGerente: TabItem<TabGerente>[] = [
    { id: 'dashboard', label: 'Dashboard & Indicadores', icon: TrendingUp },
    { id: 'pedidos', label: 'Gestão de Pedidos', badge: pedidosFiltradosPeriodo.length, icon: ShoppingBag },
    { id: 'entregadores', label: 'Produtividade Entregadores', icon: Truck },
    { id: 'financeiro', label: 'DRE & Fechamento', icon: DollarSign },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Controles do Gerente Montados na Barra Superior */}
      <TopBarActions>
        {/* Seletor de Período Rápido */}
        <div className="inline-flex bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 shrink-0">
          {(['hoje', 'ontem', '7dias', 'mes', 'todos'] as PeriodoFiltro[]).map((p) => {
            const labels: Record<PeriodoFiltro, string> = {
              hoje: 'Hoje',
              ontem: 'Ontem',
              '7dias': '7D',
              mes: 'Mês',
              todos: 'Todos',
            };
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodo(p)}
                className={`px-2 py-1 rounded-lg text-xs transition-all ${
                  periodo === p
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Botão Exportar CSV */}
        <button
          type="button"
          onClick={exportarCSV}
          title="Exportar todos os pedidos filtrados em arquivo Excel/CSV"
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">CSV</span>
        </button>

        {/* Botão Novo Pedido */}
        {onNovoPedidoClick && (
          <button
            type="button"
            onClick={onNovoPedidoClick}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Novo Pedido</span>
          </button>
        )}
      </TopBarActions>

      {/* Sub-Navegação Oficial em Pílulas (SegmentedTabs) */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <SegmentedTabs
          tabs={tabsGerente}
          activeTab={gerenteSubTab}
          onChange={(tab) => setGerenteSubTab(tab)}
        />
      </div>

      {/* KPI CARDS (Executivo) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Faturamento Total */}
        <div className="bg-[#eaecf0] rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Faturamento Bruto</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              R$ {kpis.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 font-medium">
              <span>{kpis.totalPedidosValidos} pedidos faturados</span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">Ticket R$ {kpis.ticketMedio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Pedidos Concluídos e Taxa de Sucesso */}
        <div className="bg-[#eaecf0] rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Entregas Realizadas</span>
            <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {kpis.concluidos + kpis.entregues}
              </span>
              <span className="text-xs text-slate-500 font-bold">/ {kpis.totalPedidosCount} pedidos</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
              <span className="text-sky-600 font-bold">{kpis.emRota} em rota</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">{kpis.pendentes} base</span>
              <span>•</span>
              <span className="text-rose-600 font-bold">{kpis.cancelados} canc.</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Vasilhames Recolhidos no Período */}
        <div className="bg-[#eaecf0] rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cascos Recolhidos</span>
            <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {kpis.cascosP13Recolhidos + kpis.cascosP20LRecolhidos}
              </span>
              <span className="text-xs text-amber-700 font-bold">vasilhames</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-medium">
              <span>P13 Gás: <strong>{kpis.cascosP13Recolhidos}</strong></span>
              <span>•</span>
              <span>Água 20L: <strong>{kpis.cascosP20LRecolhidos}</strong></span>
            </div>
          </div>
        </div>

        {/* KPI 4: Arrecadação em Dinheiro na Mão */}
        <div className="bg-[#eaecf0] rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dinheiro em Caixa</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              R$ {kpis.porFormaPagamento.DINHEIRO.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
              <span>PIX: <strong className="text-slate-800">R$ {kpis.porFormaPagamento.PIX.total.toFixed(0)}</strong></span>
              <span>•</span>
              <span>Cartões: <strong className="text-slate-800">R$ {(kpis.porFormaPagamento.CARTAO_DEBITO.total + kpis.porFormaPagamento.CARTAO_CREDITO.total).toFixed(0)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEÚDO DA ABA 1: DASHBOARD & GRÁFICOS INTERATIVOS */}
      {gerenteSubTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Linha 1 de Gráficos: Vendas por Hora e Mix de Pagamento */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfico 1: Evolução de Vendas por Hora */}
            <div className="lg:col-span-2 bg-[#eaecf0] rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Evolução do Faturamento por Horário</h3>
                  <p className="text-[11px] text-slate-500">Picos de pedidos e faturamento ao longo do expediente</p>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Faturamento (R$)
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dadosVendasPorHora} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="corFaturamento" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        name === 'faturamento' ? `R$ ${Number(val).toFixed(2)}` : val,
                        name === 'faturamento' ? 'Faturamento' : 'Pedidos',
                      ]}
                      labelFormatter={(label) => `Horário: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="faturamento"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#corFaturamento)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Meios de Pagamento (Donut Pie) */}
            <div className="bg-[#eaecf0] rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Distribuição por Forma de Pagamento</h3>
                <p className="text-[11px] text-slate-500">Participação de cada meio no faturamento</p>
              </div>
              <div className="h-52 w-full my-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosMeiosPagamento}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="valor"
                    >
                      {dadosMeiosPagamento.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Total']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
                {dadosMeiosPagamento.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                    <span className="text-slate-600 truncate">{d.name}:</span>
                    <strong className="text-slate-900 ml-auto">R$ {d.valor.toFixed(0)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Linha 2 de Gráficos: Faturamento por Categoria e Vendas por Bairro */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 3: Vendas por Categoria de Produto */}
            <div className="bg-[#eaecf0] rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Faturamento por Categoria de Produto</h3>
                  <p className="text-[11px] text-slate-500">Volume financeiro gerado por linha de produtos</p>
                </div>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPorCategoria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="nome" stroke="#94a3b8" fontSize={9} tickLine={false} interval={0} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                    />
                    <Bar dataKey="faturamento" radius={[4, 4, 0, 0]}>
                      {dadosPorCategoria.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 4: Faturamento por Bairro / Região */}
            <div className="bg-[#eaecf0] rounded-xl p-4 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Demanda por Bairro de Entrega</h3>
                  <p className="text-[11px] text-slate-500">Bairros com maior concentração de faturamento</p>
                </div>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={dadosPorBairro.slice(0, 6)}
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `R$${v}`} />
                    <YAxis dataKey="bairro" type="category" stroke="#475569" fontSize={10} width={90} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Faturamento']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                    />
                    <Bar dataKey="faturamento" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: CENTRAL DE GESTÃO & CORREÇÃO DE PEDIDOS */}
      {gerenteSubTab === 'pedidos' && (
        <div className="bg-[#eaecf0] rounded-xl shadow-xs border border-slate-200 p-4 space-y-4">
          
          {/* Barra de Filtros e Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            {/* Campo de Busca */}
            <div className="relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buscar Pedido</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Código #1041, Cliente, Rua..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="w-full bg-[#eaecf0] border border-slate-300 rounded-md pl-8 pr-3 py-1.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Filtro Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full bg-[#eaecf0] border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="PENDENTE">🟡 PENDENTE</option>
                <option value="EM_ROTA">🔵 EM ROTA</option>
                <option value="ENTREGUE">🟢 ENTREGUE</option>
                <option value="CONCLUIDO">🏁 CONCLUÍDO</option>
                <option value="CANCELADO">🔴 CANCELADO</option>
              </select>
            </div>

            {/* Filtro Pagamento */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Forma de Pagamento</label>
              <select
                value={filtroPagamento}
                onChange={(e) => setFiltroPagamento(e.target.value)}
                className="w-full bg-[#eaecf0] border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todas as Formas</option>
                <option value="PIX">⚡ PIX</option>
                <option value="DINHEIRO">💵 Dinheiro</option>
                <option value="CARTAO_DEBITO">💳 Cartão Débito</option>
                <option value="CARTAO_CREDITO">💳 Cartão Crédito</option>
                <option value="A_PRAZO_FIADO">📝 A Prazo / Fiado</option>
              </select>
            </div>

            {/* Filtro Entregador */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Entregador</label>
              <select
                value={filtroEntregador}
                onChange={(e) => setFiltroEntregador(e.target.value)}
                className="w-full bg-[#eaecf0] border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos os Entregadores</option>
                <option value="SEM_ENTREGADOR">-- Sem Entregador (Base) --</option>
                {entregadores.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabela de Pedidos */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="py-2 px-3">Código / Data</th>
                  <th className="py-2 px-3">Cliente & Bairro</th>
                  <th className="py-2 px-3">Itens do Pedido</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Entregador</th>
                  <th className="py-2 px-3">Pagamento</th>
                  <th className="py-2 px-3 text-right">Total (R$)</th>
                  <th className="py-2 px-3 text-center w-32">Ações Gerente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-[#eaecf0]">
                {pedidosTabela.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 px-3 text-center text-slate-500 font-medium">
                      Nenhum pedido encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  pedidosTabela.map((p) => {
                    const horaFormatada = new Date(p.criadoEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const forma = p.formaPagamentoRealizada || p.formaPagamentoPrevista;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        {/* Código / Data */}
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <div className="font-black text-slate-900">{p.codigo}</div>
                          <span className="text-[10px] text-slate-500 font-semibold">{horaFormatada} • v#{p.versao}</span>
                        </td>

                        {/* Cliente & Bairro */}
                        <td className="py-1.5 px-3">
                          <div className="font-bold text-slate-900">{p.cliente?.nome}</div>
                          <div className="text-[11px] text-slate-600 truncate max-w-[200px]">
                            {p.cliente?.endereco}, {p.cliente?.numero} ({p.cliente?.bairroNome})
                          </div>
                        </td>

                        {/* Itens */}
                        <td className="py-1.5 px-3">
                          <div className="text-[11px] text-slate-800 font-medium line-clamp-2 max-w-[220px]">
                            {p.itens.map((it) => `${it.quantidade}x ${it.nomeProduto}`).join(', ')}
                          </div>
                          {p.itens.some((it) => it.vasilhamesRecolhidosEsperados > 0) && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold mt-0.5">
                              <Layers className="w-3 h-3" /> Exige recolhimento de casco
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              p.status === 'CONCLUIDO'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : p.status === 'EM_ROTA'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : p.status === 'ENTREGUE'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : p.status === 'CANCELADO'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        {/* Entregador */}
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          {p.entregadorNome ? (
                            <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                              <Truck className="w-3 h-3 text-blue-600" />
                              {p.entregadorNome.split('(')[0]}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic font-medium">Não atribuído</span>
                          )}
                        </td>

                        {/* Pagamento */}
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900 text-[11px]">
                            {forma === 'PIX'
                              ? '⚡ PIX'
                              : forma === 'DINHEIRO'
                              ? '💵 Dinheiro'
                              : forma === 'CARTAO_DEBITO'
                              ? '💳 Débito'
                              : forma === 'CARTAO_CREDITO'
                              ? '💳 Crédito'
                              : '📝 Fiado'}
                          </span>
                          {p.trocoPara && (
                            <div className="text-[10px] text-amber-700 font-semibold">
                              Troco p/ R$ {p.trocoPara.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Total */}
                        <td className="py-1.5 px-3 text-right whitespace-nowrap">
                          <strong className="text-slate-950 text-sm font-black">
                            R$ {p.total.toFixed(2)}
                          </strong>
                          {p.desconto > 0 && (
                            <div className="text-[10px] text-rose-600 font-bold">
                              Desc: -R$ {p.desconto.toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Ações do Gerente */}
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Botão Editar / Corrigir */}
                            <button
                              type="button"
                              onClick={() => handleAbrirEdicao(p)}
                              title="Corrigir / Editar Pedido"
                              className="p-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors border border-blue-200"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Imprimir */}
                            <button
                              type="button"
                              onClick={() => onVisualizarComanda(p)}
                              title="Reimprimir Comanda Térmica"
                              className="p-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-colors border border-slate-200"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Excluir */}
                            <button
                              type="button"
                              onClick={() => handleExcluirPedido(p)}
                              title="Excluir Registro"
                              className="p-1.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors border border-rose-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: PRODUTIVIDADE DOS ENTREGADORES */}
      {gerenteSubTab === 'entregadores' && (
        <div className="bg-[#eaecf0] rounded-xl shadow-xs border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Produtividade e Auditoria de Entregadores</h3>
              <p className="text-xs text-slate-500">Controle de entregas, faturamento e prestação de contas de dinheiro e cascos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dadosProdutividadeEntregadores.map((ent) => (
              <div key={ent.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{ent.nome}</h4>
                      <p className="text-[11px] text-slate-500">{ent.veiculo}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    {ent.totalEntregas} entregas
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div className="bg-[#eaecf0] p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Faturamento Gerado</span>
                    <strong className="text-slate-900 text-sm">R$ {ent.faturamentoTotal.toFixed(2)}</strong>
                  </div>
                  <div className="bg-[#eaecf0] p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Dinheiro Vivo na Mão</span>
                    <strong className="text-emerald-700 text-sm">R$ {ent.totalDinheiro.toFixed(2)}</strong>
                  </div>
                  <div className="bg-[#eaecf0] p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Cascos P13 Recolhidos</span>
                    <strong className="text-amber-800 text-sm">{ent.cascosP13} botijões</strong>
                  </div>
                  <div className="bg-[#eaecf0] p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Cascos 20L Recolhidos</span>
                    <strong className="text-sky-800 text-sm">{ent.cascosP20L} galões</strong>
                  </div>
                </div>

                {ent.emRotaCount > 0 && (
                  <div className="bg-sky-50 border border-sky-200 p-2 rounded text-[11px] text-sky-800 font-bold flex items-center justify-between">
                    <span>Atualmente em rota na rua:</span>
                    <span>{ent.emRotaCount} pedidos ativos</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: DRE & FECHAMENTO DE CAIXA */}
      {gerenteSubTab === 'financeiro' && (
        <div className="bg-[#eaecf0] rounded-xl shadow-xs border border-slate-200 p-4 sm:p-6 space-y-6">
          <div>
            <h3 className="font-bold text-base text-slate-900">Demonstrativo Financeiro & Fechamento de Caixa</h3>
            <p className="text-xs text-slate-500">Conciliação de recebimentos por modalidade e composição da receita da conveniência</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tabela DRE */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                1. Composição da Receita Bruta
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">(+) Venda de Mercadorias (Produtos/Gás/Água)</span>
                  <span className="font-bold text-slate-900">R$ {kpis.totalSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">(+) Receita de Taxas de Entrega (Fretes)</span>
                  <span className="font-bold text-slate-900">R$ {kpis.totalTaxas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>(-) Descontos e Abatimentos Concedidos</span>
                  <span className="font-bold">- R$ {kpis.totalDescontos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-black text-slate-950">
                  <span>(=) FATURAMENTO LÍQUIDO DO PERÍODO</span>
                  <span>R$ {kpis.totalVendas.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Conciliação de Canais de Pagamento */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                2. Conciliação por Meio de Recebimento
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Dinheiro em Espécie (Caixa Físico)
                  </span>
                  <span className="font-bold text-slate-900">R$ {kpis.porFormaPagamento.DINHEIRO.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    PIX (Conta Bancária Instantânea)
                  </span>
                  <span className="font-bold text-slate-900">R$ {kpis.porFormaPagamento.PIX.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Cartão de Débito (Maquininha)
                  </span>
                  <span className="font-bold text-slate-900">R$ {kpis.porFormaPagamento.CARTAO_DEBITO.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    Cartão de Crédito (Maquininha)
                  </span>
                  <span className="font-bold text-slate-900">R$ {kpis.porFormaPagamento.CARTAO_CREDITO.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    Contas a Receber (Fiado Clientes)
                  </span>
                  <span className="font-bold text-rose-700">R$ {kpis.porFormaPagamento.A_PRAZO_FIADO.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-black text-slate-950">
                  <span>TOTAL CONCILIADO</span>
                  <span>R$ {kpis.totalVendas.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Pedido */}
      {pedidoParaEditar && (
        <ModalEditarPedido
          pedido={pedidoParaEditar}
          produtos={produtos}
          bairros={bairros}
          entregadores={entregadores}
          clientes={clientes}
          isOpen={modalEdicaoAberto}
          onClose={() => {
            setModalEdicaoAberto(false);
            setPedidoParaEditar(null);
          }}
          onSalvar={handleSalvarEdicaoPedido}
          onCancelarPedido={handleCancelarPedido}
          onReabrirPedido={handleReabrirPedido}
          onImprimirComanda={onVisualizarComanda}
        />
      )}
    </div>
  );
};
