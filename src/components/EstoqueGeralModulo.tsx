import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Package,
  Plus,
  Minus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  X,
  Layers,
  ArrowRight,
  ClipboardList,
  History,
  AlertTriangle,
  Flame,
  Droplet,
  Warehouse,
} from 'lucide-react';
import { Produto, Usuario, TipoItemProduto, MovimentacaoEstoque, TipoMovimentacaoEstoque } from '../types';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';
import { TopBarActions } from './TopBarPortal';
import { SegmentedTabs, TabItem } from './SegmentedTabs';
import { formatarMoeda, formatarDataHora } from '../lib/thermalPrinter';

interface Props {
  produtos: Produto[];
  usuarioLogado?: Usuario | null;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  onEstoqueAtualizado?: () => void;
}

export const EstoqueGeralModulo: React.FC<Props> = ({
  produtos,
  usuarioLogado,
  activeTab = 'estoque',
  setActiveTab = (_tab?: MainTab) => {},
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onEstoqueAtualizado,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Modal Movimentação
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoMovimento, setProdutoMovimento] = useState<Produto | null>(null);
  const [tipoMovimento, setTipoMovimento] = useState<TipoMovimentacaoEstoque>('ENTRADA');
  const [quantidadeMovimento, setQuantidadeMovimento] = useState<number>(1);
  const [motivoMovimento, setMotivoMovimento] = useState('');
  const [salvandoMovimento, setSalvandoMovimento] = useState(false);

  // Histórico de movimentações
  const [historicoMovimentos, setHistoricoMovimentos] = useState<MovimentacaoEstoque[]>([]);
  const [abaHistorico, setAbaHistorico] = useState(false);

  const carregarHistorico = async () => {
    try {
      const token = localStorage.getItem('delivery_token');
      const res = await fetch('/api/estoque/movimentacoes?limit=50', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoricoMovimentos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar movimentações:', err);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  const abrirModalMovimento = (produto: Produto, tipo: TipoMovimentacaoEstoque) => {
    setProdutoMovimento(produto);
    setTipoMovimento(tipo);
    setQuantidadeMovimento(1);
    setMotivoMovimento('');
    setModalAberto(true);
  };

  const handleSalvarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoMovimento) return;
    if (quantidadeMovimento <= 0) {
      alert('Informe uma quantidade válida superior a zero.');
      return;
    }

    setSalvandoMovimento(true);
    setErro(null);

    try {
      const token = localStorage.getItem('delivery_token');
      const res = await fetch('/api/estoque/movimentar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          produtoId: produtoMovimento.id,
          tipoMovimentacao: tipoMovimento,
          quantidade: Number(quantidadeMovimento),
          motivo: motivoMovimento.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.erro || 'Falha ao registrar movimentação de estoque');
      }

      setSucesso(
        `Movimentação registrada com sucesso para "${produtoMovimento.nome}"!`
      );
      setTimeout(() => setSucesso(null), 4000);

      setModalAberto(false);
      setProdutoMovimento(null);

      if (onEstoqueAtualizado) onEstoqueAtualizado();
      await carregarHistorico();
    } catch (err: any) {
      setErro(err.message || 'Erro ao movimentar estoque');
    } finally {
      setSalvandoMovimento(false);
    }
  };

  // Filtragem dos Produtos
  const produtosFiltrados = produtos.filter((p) => {
    if (filtroTipo === 'INSUMO' && p.tipoItem !== 'INSUMO_MATERIA_PRIMA') return false;
    if (filtroTipo === 'PRODUTO_FINAL' && p.tipoItem !== 'PRODUTO_FINAL') return false;
    if (filtroTipo === 'REVENDA' && p.tipoItem !== 'REVENDA' && p.tipoItem !== undefined) return false;
    if (filtroTipo === 'BAIXO' && (p.estoqueCheio ?? 0) > 5) return false;

    if (busca.trim()) {
      const q = busca.toLowerCase();
      const matchNome = p.nome.toLowerCase().includes(q);
      const matchMarca = p.marca?.toLowerCase().includes(q);
      const matchCat = p.categoria?.toLowerCase().includes(q);
      if (!matchNome && !matchMarca && !matchCat) return false;
    }
    return true;
  });

  // Estatísticas
  const totalInsumos = produtos.filter((p) => p.tipoItem === 'INSUMO_MATERIA_PRIMA').length;
  const totalProdutosFinais = produtos.filter((p) => p.tipoItem === 'PRODUTO_FINAL').length;
  const totalBaixoEstoque = produtos.filter((p) => (p.estoqueCheio ?? 0) <= 5).length;
  const totalItens = produtos.length;

  const tabsFiltro: TabItem<string>[] = [
    { id: 'TODOS', label: 'Todos os Itens', badge: totalItens },
    { id: 'INSUMO', label: '🌾 Insumos & Matérias-Primas', badge: totalInsumos },
    { id: 'PRODUTO_FINAL', label: '🥟 Produtos Finais / Salgados', badge: totalProdutosFinais },
    { id: 'REVENDA', label: '🛒 Revenda & Outros' },
    { id: 'BAIXO', label: '⚠️ Estoque Baixo / Zerado', badge: totalBaixoEstoque },
  ];

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      <TopBarActions>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar item, insumo, marca..."
              className="pl-8 pr-3 py-1 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 border border-slate-700/80 focus:border-amber-500 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none transition-all w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => {
              if (produtos.length > 0) {
                abrirModalMovimento(produtos[0], 'ENTRADA');
              } else {
                alert('Cadastre um produto antes de registrar movimentações.');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Lançar Movimento</span>
          </button>
        </div>
      </TopBarActions>

      {/* Header do Módulo */}
      <ModuloHeader
        titulo="Estoque Geral & Movimentações"
        descricao="Saldos físicos, matérias-primas industriais, produtos acabados e histórico de entradas/saídas"
        icone={Boxes}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pedidosPendentesCount={pedidosPendentesCount}
        pedidosEmRotaCount={pedidosEmRotaCount}
        pedidosEntreguesCount={pedidosEntreguesCount}
      />

      {/* Alerta informativo destacando separação de vasilhames */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 text-sm">
              Controle Especial de Vasilhames & Cascos (P13, P45, 20L)
            </div>
            <div className="text-slate-600 text-[11px]">
              O controle de botijões retornáveis, garrafeiros e comodatos de clientes possui módulo dedicado exclusivo.
            </div>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('vasilhames')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs shrink-0 active:scale-95"
        >
          <span>Abrir Módulo de Vasilhames</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Alertas */}
      {erro && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs animate-shake">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{erro}</span>
          </div>
          <button onClick={() => setErro(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {sucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{sucesso}</span>
          </div>
          <button onClick={() => setSucesso(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total de Itens</div>
            <div className="text-xl font-black text-slate-900">{totalItens}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Insumos & Matérias</div>
            <div className="text-xl font-black text-slate-900">{totalInsumos}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Produtos Finais</div>
            <div className="text-xl font-black text-slate-900">{totalProdutosFinais}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estoque Baixo</div>
            <div className="text-xl font-black text-slate-900">{totalBaixoEstoque}</div>
          </div>
        </div>
      </div>

      {/* Tabs de Filtro e Histórico */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <SegmentedTabs tabs={tabsFiltro} activeTab={filtroTipo} onChange={setFiltroTipo} />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setAbaHistorico(!abaHistorico)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              abaHistorico
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{abaHistorico ? 'Ver Grade de Produtos' : 'Histórico de Movimentos'}</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: Grade de Produtos ou Histórico de Movimentações */}
      {abaHistorico ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Histórico Recente de Movimentações</h3>
            </div>
            <button
              onClick={carregarHistorico}
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {historicoMovimentos.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhuma movimentação de estoque registrada até o momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <th className="p-3">Data/Hora</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Qtd</th>
                    <th className="p-3 text-right">Saldo Ant. ➔ Atual</th>
                    <th className="p-3">Motivo / Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicoMovimentos.map((mov) => {
                    const isEntrada = mov.tipoMovimentacao === 'ENTRADA' || mov.tipoMovimentacao === 'CANCELAMENTO_ESTORNO';
                    const isSaida = mov.tipoMovimentacao === 'SAIDA_VENDA' || mov.tipoMovimentacao === 'DEVOLUCAO_AVARIA';

                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-slate-600 font-mono">
                          {formatarDataHora(mov.timestamp)}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {mov.produtoNome}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                              isEntrada
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isSaida
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {mov.tipoMovimentacao}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black font-mono">
                          <span className={isEntrada ? 'text-emerald-600' : isSaida ? 'text-rose-600' : 'text-slate-900'}>
                            {isEntrada ? `+${mov.quantidadeCheio}` : `-${mov.quantidadeCheio}`}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {mov.estoqueCheioAnterior} ➔ <strong className="text-slate-900">{mov.estoqueCheioAtual}</strong>
                        </td>
                        <td className="p-3 text-slate-500 italic max-w-xs truncate">
                          {mov.motivo || mov.usuarioResponsavel || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {produtosFiltrados.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Nenhum item encontrado</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cadastre insumos, farinha, óleo, carnes ou produtos finais na Central de Cadastros para acompanhar o estoque.
              </p>
              <button
                onClick={() => setActiveTab('cadastros')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-xs"
              >
                <span>Ir para Central de Cadastros</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                    <th className="p-3">Produto / Insumo</th>
                    <th className="p-3">Tipo do Item</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3 text-center">Unidade</th>
                    <th className="p-3 text-right">Saldo em Estoque</th>
                    <th className="p-3 text-right">Preço / Custo</th>
                    <th className="p-3 text-center">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {produtosFiltrados.map((prod) => {
                    const saldo = prod.estoqueCheio ?? 0;
                    const isCritico = saldo <= 0;
                    const isAlerta = saldo > 0 && saldo <= 5;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900">{prod.nome}</div>
                          {prod.marca && <div className="text-[10px] text-slate-500">{prod.marca}</div>}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                              prod.tipoItem === 'INSUMO_MATERIA_PRIMA'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : prod.tipoItem === 'PRODUTO_FINAL'
                                ? 'bg-orange-50 text-orange-800 border-orange-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {prod.tipoItem === 'INSUMO_MATERIA_PRIMA'
                              ? '🌾 Insumo / Matéria-Prima'
                              : prod.tipoItem === 'PRODUTO_FINAL'
                              ? '🥟 Produto Final'
                              : '🛒 Revenda'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {prod.categoria}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {prod.unidadeMedida || 'UN'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className={`font-black font-mono text-sm ${
                                isCritico ? 'text-rose-600' : isAlerta ? 'text-amber-600' : 'text-slate-900'
                              }`}
                            >
                              {saldo}
                            </span>
                            {isCritico && (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1 rounded border border-rose-200">
                                Zerado
                              </span>
                            )}
                            {isAlerta && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                                Baixo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {prod.precoCusto
                            ? `Custo: ${formatarMoeda(prod.precoCusto)}`
                            : formatarMoeda(prod.precoCompleto || prod.precoRecarga || 0)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => abrirModalMovimento(prod, 'ENTRADA')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 active:scale-95"
                              title="Registrar Entrada de Estoque"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>Entrada</span>
                            </button>

                            <button
                              onClick={() => abrirModalMovimento(prod, 'SAIDA_VENDA')}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 active:scale-95"
                              title="Registrar Saída / Descarte"
                            >
                              <Minus className="w-3 h-3 stroke-[3]" />
                              <span>Saída</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Movimentação de Estoque */}
      {modalAberto && produtoMovimento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Movimentação Manual de Estoque</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{produtoMovimento.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarMovimentacao} className="p-4 space-y-4">
              {/* Produto Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Saldo Atual:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {produtoMovimento.estoqueCheio ?? 0} {produtoMovimento.unidadeMedida || 'UN'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tipo:</span>
                  <span className="font-bold text-slate-700">
                    {produtoMovimento.tipoItem || 'REVENDA'}
                  </span>
                </div>
              </div>

              {/* Tipo de Movimento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Movimentação *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoMovimento('ENTRADA')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                      tipoMovimento === 'ENTRADA'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400/30'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <div>
                      <div>Entrada</div>
                      <div className="text-[10px] font-normal text-slate-500">Compra / Abastecimento</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoMovimento('SAIDA_VENDA')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                      tipoMovimento === 'SAIDA_VENDA'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-400/30'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Minus className="w-4 h-4 text-rose-600 stroke-[3]" />
                    <div>
                      <div>Saída / Ajuste</div>
                      <div className="text-[10px] font-normal text-slate-500">Consumo ou Baixa</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantidade ({produtoMovimento.unidadeMedida || 'UN'}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={quantidadeMovimento}
                  onChange={(e) => setQuantidadeMovimento(Number(e.target.value))}
                  required
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo / Justificativa
                </label>
                <input
                  type="text"
                  value={motivoMovimento}
                  onChange={(e) => setMotivoMovimento(e.target.value)}
                  placeholder="Ex: Compra de insumos NF 1234, ajuste de balanço físico..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoMovimento}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-sm disabled:opacity-50"
                >
                  {salvandoMovimento ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirmar Movimentação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
