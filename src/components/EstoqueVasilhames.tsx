import React, { useState, useEffect } from 'react';
import { MovimentacaoEstoque, Produto, TipoMovimentacaoEstoque, Usuario } from '../types';
import { formatarMoeda, formatarDataHora } from '../lib/thermalPrinter';
import {
  Layers,
  Flame,
  Droplet,
  Truck,
  Users,
  Warehouse,
  Plus,
  Minus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Search,
  Star,
  Package,
  Beer,
  X,
  History,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';
import { ModalImportarProdutosErp } from './ModalImportarProdutosErp';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';

interface Props {
  produtos: Produto[];
  usuarioLogado?: Usuario | null;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  onEstoqueAtualizado: () => void;
}

export const EstoqueVasilhames: React.FC<Props> = ({
  produtos,
  usuarioLogado,
  activeTab = 'vasilhames',
  setActiveTab = () => {},
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onEstoqueAtualizado,
}) => {
  const [balanco, setBalanco] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [ajustandoId, setAjustandoId] = useState<string | null>(null);
  const [modalImportar, setModalImportar] = useState(false);
  const [modalAjusteAberto, setModalAjusteAberto] = useState(false);
  const [subTab, setSubTab] = useState<'catalogo' | 'historico'>('catalogo');
  const [buscaEstoque, setBuscaEstoque] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<'TODOS' | 'GAS' | 'AGUA' | 'BEBIDAS' | 'CONVENIENCIA'>('TODOS');

  // Ledger / Histórico State
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [carregandoMovs, setCarregandoMovs] = useState(false);
  const [filtroTipoMov, setFiltroTipoMov] = useState<string>('TODOS');

  // Form State para Novo Ajuste / Entrada
  const [formProdutoId, setFormProdutoId] = useState<string>(produtos[0]?.id || '');
  const [formTipoMov, setFormTipoMov] = useState<TipoMovimentacaoEstoque>('ENTRADA');
  const [formQtdCheio, setFormQtdCheio] = useState<number>(10);
  const [formQtdVazio, setFormQtdVazio] = useState<number>(0);
  const [formMotivo, setFormMotivo] = useState<string>('');
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);

  const carregarBalanco = async () => {
    setCarregando(true);
    try {
      const res = await fetch('/api/vasilhames/balanco');
      if (res.ok) {
        const data = await res.json();
        setBalanco(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  const carregarMovimentacoes = async () => {
    setCarregandoMovs(true);
    try {
      const res = await fetch('/api/estoque/movimentacoes');
      if (res.ok) {
        const data = await res.json();
        setMovimentacoes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoMovs(false);
    }
  };

  useEffect(() => {
    carregarBalanco();
    carregarMovimentacoes();
  }, [produtos]);

  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProdutoId) return;

    setSalvandoAjuste(true);
    try {
      const res = await fetch('/api/estoque/ajustar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: formProdutoId,
          tipoMovimentacao: formTipoMov,
          quantidadeCheio: formQtdCheio,
          quantidadeVazio: formQtdVazio,
          motivo: formMotivo || 'Ajuste manual registrado no módulo de estoque',
          usuarioResponsavel: usuarioLogado?.nome || 'Operador de Base',
        }),
      });

      if (res.ok) {
        setModalAjusteAberto(false);
        setFormMotivo('');
        onEstoqueAtualizado();
        await carregarBalanco();
        await carregarMovimentacoes();
      }
    } catch (err) {
      console.error('Erro ao salvar ajuste de estoque:', err);
    } finally {
      setSalvandoAjuste(false);
    }
  };

  const alterarEstoque = async (produto: Produto, campo: 'cheio' | 'vazio', delta: number) => {
    setAjustandoId(produto.id);
    try {
      const novoCheio = campo === 'cheio' ? Math.max(0, produto.estoqueCheio + delta) : produto.estoqueCheio;
      const novoVazio = campo === 'vazio' ? Math.max(0, produto.estoqueVazio + delta) : produto.estoqueVazio;

      const res = await fetch(`/api/produtos/${produto.id}/estoque`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estoqueCheio: novoCheio,
          estoqueVazio: novoVazio,
        }),
      });

      if (res.ok) {
        onEstoqueAtualizado();
        await carregarBalanco();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAjustandoId(null);
    }
  };

  const handleToggleFavorito = async (prodId: string) => {
    try {
      const res = await fetch(`/api/produtos/${prodId}/toggle-favorito`, {
        method: 'PUT',
      });
      if (res.ok) {
        onEstoqueAtualizado();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const produtosFiltrados = produtos.filter((p) => {
    if (categoriaFiltro !== 'TODOS' && p.categoria !== categoriaFiltro) return false;
    if (buscaEstoque.trim()) {
      const q = buscaEstoque.toLowerCase().trim();
      const matchNome = p.nome.toLowerCase().includes(q);
      const matchCodigo = p.codigo.toLowerCase().includes(q);
      const matchMarca = (p.marca || '').toLowerCase().includes(q);
      const matchUnidade = (p.unidadeMedida || '').toLowerCase().includes(q);
      return matchNome || matchCodigo || matchMarca || matchUnidade;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <ModuloHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        usuarioLogado={usuarioLogado}
        isSuperAdmin={isSuperAdmin}
        pedidosPendentesCount={pedidosPendentesCount}
        pedidosEmRotaCount={pedidosEmRotaCount}
        pedidosEntreguesCount={pedidosEntreguesCount}
        moduloNumero="4"
        moduloCor="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
        titulo="Controle de Vasilhames & Estoque Físico"
        subtitulo={
          <>
            Rastreamento contínuo da separação <strong>Líquido vs Casco</strong> e catálogo geral sincronizado com o ERP.
          </>
        }
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalAjusteAberto(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Entrada / Ajuste</span>
          </button>

          <button
            onClick={() => setModalImportar(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Importar do ERP</span>
          </button>

          <button
            onClick={() => {
              carregarBalanco();
              carregarMovimentacoes();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando || carregandoMovs ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </ModuloHeader>

      {/* Overview Balance Cards (P13 & Água 20L) */}
      {balanco && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card P13 */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{balanco.p13.tipo}</h3>
                  <span className="text-[10px] text-slate-500">Patrimônio Ativo Total</span>
                </div>
              </div>
              <span className="text-lg font-black text-amber-700 font-mono">
                {balanco.p13.totalPatrimonio} un
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                  <Warehouse className="w-3 h-3" /> Cheios Base
                </div>
                <div className="text-base font-black text-slate-900 font-mono">{balanco.p13.baseCheios}</div>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1 text-amber-700 font-bold text-[10px]">
                  <Layers className="w-3 h-3" /> Vazios Base
                </div>
                <div className="text-base font-black text-slate-900 font-mono">{balanco.p13.baseVazios}</div>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1 text-blue-700 font-bold text-[10px]">
                  <Truck className="w-3 h-3" /> Em Trânsito
                </div>
                <div className="text-base font-black text-slate-900 font-mono">
                  {balanco.p13.emTransitoEntregadores}
                </div>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1 text-rose-700 font-bold text-[10px]">
                  <Users className="w-3 h-3" /> C/ Clientes
                </div>
                <div className="text-base font-black text-slate-900 font-mono">{balanco.p13.pendenteClientes}</div>
              </div>
            </div>
          </div>

          {/* Card Água 20L */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{balanco.p20l.tipo}</h3>
                  <span className="text-[10px] text-slate-500">Patrimônio Ativo Total</span>
                </div>
              </div>
              <span className="text-lg font-black text-blue-700 font-mono">
                {balanco.p20l.totalPatrimonio} un
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                  <Warehouse className="w-3 h-3" /> Cheios Base
                </div>
                <div className="text-base font-black text-slate-900 font-mono">{balanco.p20l.baseCheios}</div>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1 text-amber-700 font-bold text-[10px]">
                  <Layers className="w-3 h-3" /> Vazios Base
                </div>
                <div className="text-base font-black text-slate-900 font-mono">{balanco.p20l.baseVazios}</div>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1 text-blue-700 font-bold text-[10px]">
                  <Truck className="w-3 h-3" /> Em Trânsito
                </div>
                <div className="text-base font-black text-slate-900 font-mono">
                  {balanco.p20l.emTransitoEntregadores}
                </div>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1 text-rose-700 font-bold text-[10px]">
                  <Users className="w-3 h-3" /> C/ Clientes
                </div>
                <div className="text-base font-black text-slate-900 font-mono">
                  {balanco.p20l.pendenteClientes}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tabs: Catálogo vs Livro-Razão */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setSubTab('catalogo')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            subTab === 'catalogo'
              ? 'border-amber-600 text-amber-800 dark:text-amber-400 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Catálogo & Estoque Físico</span>
        </button>

        <button
          onClick={() => setSubTab('historico')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            subTab === 'historico'
              ? 'border-amber-600 text-amber-800 dark:text-amber-400 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Livro-Razão & Movimentações ({movimentacoes.length})</span>
        </button>
      </div>

      {/* VIEW 1: Catálogo Geral de Produtos & Estoque */}
      {subTab === 'catalogo' && (
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                Catálogo Geral de Produtos & Estoque
              </h3>
              <p className="text-[11px] text-slate-500">
                Gerencie estoque físico, itens mais utilizados no PDV e sincronização ERP.
              </p>
            </div>

            {/* Categories Filters */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs overflow-x-auto">
              <button
                onClick={() => setCategoriaFiltro('TODOS')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  categoriaFiltro === 'TODOS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todos ({produtos.length})
              </button>
              <button
                onClick={() => setCategoriaFiltro('GAS')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  categoriaFiltro === 'GAS' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Gás
              </button>
              <button
                onClick={() => setCategoriaFiltro('AGUA')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  categoriaFiltro === 'AGUA' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Água
              </button>
              <button
                onClick={() => setCategoriaFiltro('BEBIDAS')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  categoriaFiltro === 'BEBIDAS' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Bebidas
              </button>
              <button
                onClick={() => setCategoriaFiltro('CONVENIENCIA')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  categoriaFiltro === 'CONVENIENCIA' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Conveniência
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buscaEstoque}
              onChange={(e) => setBuscaEstoque(e.target.value)}
              placeholder="Buscar por produto, marca, código ou medida..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs text-slate-800 font-medium"
            />
            {buscaEstoque && (
              <button
                onClick={() => setBuscaEstoque('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px]">
                  <th className="p-2.5">Destaque PDV</th>
                  <th className="p-2.5">Código / Produto</th>
                  <th className="p-2.5">Marca</th>
                  <th className="p-2.5">Unidade Medida</th>
                  <th className="p-2.5">Tipo Casco</th>
                  <th className="p-2.5 text-right">Preço Recarga</th>
                  <th className="p-2.5 text-right">Preço Completo</th>
                  <th className="p-2.5 text-center">Estoque Cheio (Base)</th>
                  <th className="p-2.5 text-center">Estoque Vazio (Base)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {produtosFiltrados.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => handleToggleFavorito(prod.id)}
                        className={`p-1 rounded-md transition-colors ${
                          prod.maisUtilizado
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-slate-300 hover:text-amber-500 hover:bg-slate-50'
                        }`}
                        title={prod.maisUtilizado ? 'Mais Utilizado no PDV (Clique para desmarcar)' : 'Marcar como Mais Utilizado'}
                      >
                        <Star className={`w-4 h-4 ${prod.maisUtilizado ? 'fill-amber-400' : ''}`} />
                      </button>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900 text-xs">{prod.nome}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{prod.codigo}</div>
                    </td>
                    <td className="p-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-700 text-[11px]">
                        {prod.marca || 'Conveniência'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
                        {prod.unidadeMedida || 'UN'}
                      </span>
                    </td>
                    <td className="p-2.5">
                      {prod.tipoVasilhame && prod.tipoVasilhame !== 'NENHUM' ? (
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-800">
                          {prod.tipoVasilhame}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-black font-mono text-blue-700">
                      {formatarMoeda(prod.precoRecarga)}
                    </td>
                    <td className="p-2.5 text-right font-black font-mono text-amber-700">
                      {prod.permiteVendaCasco ? formatarMoeda(prod.precoCompleto) : '--'}
                    </td>
                    {/* Estoque Cheio Counter */}
                    <td className="p-2.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-lg">
                        <button
                          onClick={() => alterarEstoque(prod, 'cheio', -1)}
                          className="p-0.5 text-emerald-800 hover:bg-emerald-200 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-black font-mono text-xs text-emerald-900 w-7 text-center">
                          {prod.estoqueCheio}
                        </span>
                        <button
                          onClick={() => alterarEstoque(prod, 'cheio', 1)}
                          className="p-0.5 text-emerald-800 hover:bg-emerald-200 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    {/* Estoque Vazio Counter */}
                    <td className="p-2.5 text-center">
                      {prod.tipoVasilhame !== 'NENHUM' ? (
                        <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-lg">
                          <button
                            onClick={() => alterarEstoque(prod, 'vazio', -1)}
                            className="p-0.5 text-amber-800 hover:bg-amber-200 rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-black font-mono text-xs text-amber-900 w-7 text-center">
                            {prod.estoqueVazio}
                          </span>
                          <button
                            onClick={() => alterarEstoque(prod, 'vazio', 1)}
                            className="p-0.5 text-amber-800 hover:bg-amber-200 rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Livro-Razão & Histórico de Movimentações */}
      {subTab === 'historico' && (
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                Histórico & Livro-Razão de Movimentações
              </h3>
              <p className="text-[11px] text-slate-500">
                Auditoria contínua de entradas de fornecedores, saídas por vendas, retorno de rotas e ajustes.
              </p>
            </div>

            {/* Filter by Type */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              {['TODOS', 'ENTRADA', 'SAIDA_VENDA', 'AJUSTE_MANUAL', 'DEVOLUCAO_AVARIA'].map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipoMov(tipo)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    filtroTipoMov === tipo ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {tipo.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold text-[11px]">
                  <th className="p-2.5">Data / Hora</th>
                  <th className="p-2.5">Tipo Movimentação</th>
                  <th className="p-2.5">Produto</th>
                  <th className="p-2.5 text-center">Cheios (Qtd / Saldo)</th>
                  <th className="p-2.5 text-center">Vazios (Qtd / Saldo)</th>
                  <th className="p-2.5">Responsável / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {movimentacoes
                  .filter((m) => filtroTipoMov === 'TODOS' || m.tipoMovimentacao === filtroTipoMov)
                  .map((mov) => {
                    const isEntrada = mov.tipoMovimentacao === 'ENTRADA' || mov.tipoMovimentacao === 'CANCELAMENTO_ESTORNO';
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-2.5 font-mono text-[11px] text-slate-600">
                          {formatarDataHora(mov.timestamp)}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              mov.tipoMovimentacao === 'ENTRADA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : mov.tipoMovimentacao === 'SAIDA_VENDA'
                                ? 'bg-blue-100 text-blue-800'
                                : mov.tipoMovimentacao === 'DEVOLUCAO_AVARIA'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {mov.tipoMovimentacao.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{mov.produtoNome}</div>
                          {mov.tipoVasilhame && (
                            <span className="text-[10px] text-slate-400 font-mono">Casco: {mov.tipoVasilhame}</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <span
                            className={`font-black ${
                              isEntrada ? 'text-emerald-700' : 'text-slate-800'
                            }`}
                          >
                            {mov.quantidadeCheio > 0 ? (isEntrada ? `+${mov.quantidadeCheio}` : `-${mov.quantidadeCheio}`) : '0'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            (Saldo: {mov.estoqueCheioAtual})
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <span className="font-black text-amber-700">
                            {mov.quantidadeVazio > 0 ? `${mov.quantidadeVazio}` : '0'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            (Saldo: {mov.estoqueVazioAtual})
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800 text-xs">
                            {mov.usuarioResponsavel || mov.entregadorNome || 'Sistema'}
                          </div>
                          <div className="text-[10px] text-slate-500 italic">
                            {mov.motivo || (mov.pedidoCodigo ? `Ref. Pedido #${mov.pedidoCodigo}` : '-')}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Novo Ajuste / Entrada Manual de Vasilhames e Gás */}
      {modalAjusteAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                <Warehouse className="w-4 h-4 text-emerald-600" />
                <span>Nova Entrada / Ajuste de Estoque</span>
              </div>
              <button
                onClick={() => setModalAjusteAberto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarAjuste} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Produto:</label>
                <select
                  value={formProdutoId}
                  onChange={(e) => setFormProdutoId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 font-bold text-slate-800"
                  required
                >
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Cheios: {p.estoqueCheio} | Vazios: {p.estoqueVazio})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Movimentação:</label>
                <select
                  value={formTipoMov}
                  onChange={(e) => setFormTipoMov(e.target.value as TipoMovimentacaoEstoque)}
                  className="w-full p-2 rounded-lg border border-slate-300 font-bold text-slate-800"
                >
                  <option value="ENTRADA">Entrada de Carga (Fornecedor / Envasadora)</option>
                  <option value="AJUSTE_MANUAL">Ajuste Manual de Inventário (Contagem)</option>
                  <option value="DEVOLUCAO_AVARIA">Descarte / Vasilhame Avariado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">Qtd. Cheios:</label>
                  <input
                    type="number"
                    min="0"
                    value={formQtdCheio}
                    onChange={(e) => setFormQtdCheio(Number(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg border border-emerald-300 font-mono font-black text-sm text-emerald-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-800 mb-1">Qtd. Vazios:</label>
                  <input
                    type="number"
                    min="0"
                    value={formQtdVazio}
                    onChange={(e) => setFormQtdVazio(Number(e.target.value) || 0)}
                    className="w-full p-2 rounded-lg border border-amber-300 font-mono font-black text-sm text-amber-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo / Nota Fiscal / Observação:</label>
                <input
                  type="text"
                  value={formMotivo}
                  onChange={(e) => setFormMotivo(e.target.value)}
                  placeholder="Ex: Carga NF-e 4589 Ultragaz / Troca de lote..."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAjusteAberto(false)}
                  className="px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoAjuste}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{salvandoAjuste ? 'Salvando...' : 'Confirmar Registro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação de Produtos do ERP */}
      <ModalImportarProdutosErp
        aberto={modalImportar}
        onFechar={() => setModalImportar(false)}
        onProdutosImportados={() => {
          onEstoqueAtualizado();
        }}
      />
    </div>
  );
};
