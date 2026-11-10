import React, { useState, useEffect } from 'react';
import {
  Factory,
  ChefHat,
  Flame,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Calendar,
  User,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Package,
  Layers,
  Trash2,
  X,
  FileText,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import {
  OrdemProducao,
  StatusOrdemProducao,
  TipoOrigemOP,
  Produto,
  Cliente,
  Usuario,
  ItemEstruturaProduto,
} from '../types';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';
import { TopBarActions } from './TopBarPortal';
import { SegmentedTabs, TabItem } from './SegmentedTabs';

interface Props {
  produtos: Produto[];
  clientes: Cliente[];
  usuarioLogado?: Usuario | null;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  onProducaoAtualizada?: () => void;
  onEstoqueAtualizado?: () => void;
}

export const OrdensProducaoModulo: React.FC<Props> = ({
  produtos,
  clientes,
  usuarioLogado,
  activeTab = 'producao',
  setActiveTab = (_tab?: MainTab) => {},
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onProducaoAtualizada,
  onEstoqueAtualizado,
}) => {
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS');
  const [busca, setBusca] = useState('');

  // Modal Nova OP
  const [modalNovaOpAberto, setModalNovaOpAberto] = useState(false);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidadePlanejada, setQuantidadePlanejada] = useState<number>(100);
  const [unidadeMedida, setUnidadeMedida] = useState('CENTO');
  const [tipoOrigem, setTipoOrigem] = useState<TipoOrigemOP>('SOB_ENCOMENDA');
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState('');
  const [dataPrevisao, setDataPrevisao] = useState('');
  const [horaPrevisao, setHoraPrevisao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [estruturaProduto, setEstruturaProduto] = useState<ItemEstruturaProduto[]>([]);
  const [carregandoEstrutura, setCarregandoEstrutura] = useState(false);
  const [salvandoOp, setSalvandoOp] = useState(false);

  // Carregar Ordens
  const carregarOrdens = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const token = localStorage.getItem('delivery_token');
      const res = await fetch('/api/producao/ordens', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Falha ao carregar ordens de produção');
      const data = await res.json();
      setOrdens(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setErro(err.message || 'Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarOrdens();
  }, []);

  // Quando o produto for selecionado no modal, buscar sua ficha técnica (receita)
  useEffect(() => {
    if (!produtoSelecionadoId) {
      setEstruturaProduto([]);
      return;
    }
    const prod = produtos.find((p) => p.id === produtoSelecionadoId);
    if (prod?.unidadeMedida) {
      setUnidadeMedida(prod.unidadeMedida);
    }

    const buscarEstrutura = async () => {
      setCarregandoEstrutura(true);
      try {
        const token = localStorage.getItem('delivery_token');
        const res = await fetch(`/api/produtos/${produtoSelecionadoId}/estrutura`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          setEstruturaProduto(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Erro ao buscar estrutura do produto:', err);
      } finally {
        setCarregandoEstrutura(false);
      }
    };

    buscarEstrutura();
  }, [produtoSelecionadoId, produtos]);

  // Transições de Status
  const handleAvancarStatus = async (op: OrdemProducao, novoStatus: StatusOrdemProducao) => {
    try {
      const token = localStorage.getItem('delivery_token');
      const res = await fetch(`/api/producao/ordens/${op.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erro || 'Falha ao atualizar status da OP');
      }

      setSucesso(
        novoStatus === 'CONCLUIDA'
          ? `OP #${op.numeroOp} concluída com sucesso! Insumos baixados e estoque atualizado.`
          : `OP #${op.numeroOp} atualizada para ${novoStatus}.`
      );
      setTimeout(() => setSucesso(null), 4000);

      await carregarOrdens();
      if (onProducaoAtualizada) onProducaoAtualizada();
      if (onEstoqueAtualizado) onEstoqueAtualizado();
    } catch (err: any) {
      setErro(err.message || 'Erro ao atualizar status');
      setTimeout(() => setErro(null), 5000);
    }
  };

  const handleExcluirOp = async (opId: string) => {
    if (!confirm('Deseja realmente cancelar/excluir esta Ordem de Produção?')) return;
    try {
      const token = localStorage.getItem('delivery_token');
      const res = await fetch(`/api/producao/ordens/${opId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erro || 'Falha ao excluir OP');
      }

      setSucesso('Ordem de Produção cancelada com sucesso.');
      setTimeout(() => setSucesso(null), 3000);
      await carregarOrdens();
    } catch (err: any) {
      setErro(err.message || 'Erro ao excluir OP');
      setTimeout(() => setErro(null), 5000);
    }
  };

  const handleCriarOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionadoId) {
      alert('Selecione um produto para produzir.');
      return;
    }
    if (quantidadePlanejada <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    setSalvandoOp(true);
    setErro(null);
    try {
      const token = localStorage.getItem('delivery_token');
      let dataPrevisaoFormatada: string | undefined = undefined;
      if (dataPrevisao) {
        dataPrevisaoFormatada = horaPrevisao ? `${dataPrevisao}T${horaPrevisao}:00` : `${dataPrevisao}T12:00:00`;
      }

      const payload = {
        produtoId: produtoSelecionadoId,
        quantidadePlanejada: Number(quantidadePlanejada),
        unidadeMedida,
        tipoOrigem,
        clienteId: tipoOrigem === 'SOB_ENCOMENDA' ? clienteSelecionadoId || undefined : undefined,
        dataPrevisaoEntrega: dataPrevisaoFormatada,
        observacoes: observacoes.trim() || undefined,
      };

      const res = await fetch('/api/producao/ordens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.erro || 'Falha ao criar ordem de produção');
      }

      setSucesso('Ordem de Produção criada com sucesso!');
      setTimeout(() => setSucesso(null), 4000);

      // Limpar formulário e fechar modal
      setModalNovaOpAberto(false);
      setProdutoSelecionadoId('');
      setQuantidadePlanejada(100);
      setClienteSelecionadoId('');
      setDataPrevisao('');
      setHoraPrevisao('');
      setObservacoes('');

      await carregarOrdens();
      if (onProducaoAtualizada) onProducaoAtualizada();
    } catch (err: any) {
      setErro(err.message || 'Erro ao criar ordem de produção');
    } finally {
      setSalvandoOp(false);
    }
  };

  // Filtragem
  const ordensFiltradas = ordens.filter((op) => {
    if (filtroStatus !== 'TODAS' && op.status !== filtroStatus) return false;
    if (filtroOrigem !== 'TODAS' && op.tipoOrigem !== filtroOrigem) return false;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      const matchNumero = op.numeroOp.toLowerCase().includes(q);
      const matchProduto = op.produtoNome.toLowerCase().includes(q);
      const matchCliente = op.clienteNome?.toLowerCase().includes(q);
      if (!matchNumero && !matchProduto && !matchCliente) return false;
    }
    return true;
  });

  // Estatísticas
  const totalPlanejadas = ordens.filter((o) => o.status === 'PLANEJADA').length;
  const totalPreparo = ordens.filter((o) => o.status === 'EM_PREPARO').length;
  const totalFritura = ordens.filter((o) => o.status === 'FRITURA').length;
  const totalConcluidas = ordens.filter((o) => o.status === 'CONCLUIDA').length;

  const tabsStatus: TabItem<string>[] = [
    { id: 'TODAS', label: 'Todas as OPs', badge: ordens.length },
    { id: 'PLANEJADA', label: '🕒 Planejadas', badge: totalPlanejadas },
    { id: 'EM_PREPARO', label: '🥣 Em Preparo', badge: totalPreparo },
    { id: 'FRITURA', label: '🔥 Na Fritadeira', badge: totalFritura },
    { id: 'CONCLUIDA', label: '✅ Concluídas', badge: totalConcluidas },
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
              placeholder="Buscar OP, produto, cliente..."
              className="pl-8 pr-3 py-1 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-900 border border-slate-700/80 focus:border-amber-500 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none transition-all w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => setModalNovaOpAberto(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Nova OP</span>
          </button>
        </div>
      </TopBarActions>

      {/* Header do Módulo */}
      <ModuloHeader
        titulo="Ordens de Produção & Fritura"
        descricao="Gestão industrial e sob encomenda: salgados fritos, receitas, controle de fritura e baixa automática de insumos"
        icone={Factory}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pedidosPendentesCount={pedidosPendentesCount}
        pedidosEmRotaCount={pedidosEmRotaCount}
        pedidosEntreguesCount={pedidosEntreguesCount}
      />

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

      {/* Cards de Resumo & Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Planejadas</div>
            <div className="text-xl font-black text-slate-900">{totalPlanejadas}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Em Preparo</div>
            <div className="text-xl font-black text-slate-900">{totalPreparo}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Na Fritadeira</div>
            <div className="text-xl font-black text-slate-900">{totalFritura}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Concluídas</div>
            <div className="text-xl font-black text-slate-900">{totalConcluidas}</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e SegmentedTabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <SegmentedTabs tabs={tabsStatus} activeTab={filtroStatus} onChange={setFiltroStatus} />

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-bold text-slate-500">Origem:</span>
          <select
            value={filtroOrigem}
            onChange={(e) => setFiltroOrigem(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="TODAS">Todas as Origens</option>
            <option value="SOB_ENCOMENDA">📦 Sob Encomenda (Cliente)</option>
            <option value="PARA_ESTOQUE">🏭 Para Estoque / Vitrine</option>
          </select>

          <button
            onClick={carregarOrdens}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Recarregar ordens"
          >
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista de Ordens de Produção */}
      {carregando && ordens.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Carregando ordens de produção...</p>
        </div>
      ) : ordensFiltradas.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <ChefHat className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhuma Ordem de Produção Encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {busca || filtroStatus !== 'TODAS' || filtroOrigem !== 'TODAS'
              ? 'Nenhum resultado corresponde aos filtros aplicados. Tente ajustar os termos de busca.'
              : 'Organize a produção de salgadinhos fritos e produtos artesanais. Planeje os lotes, acompanhe o preparo, a fritura e dê baixa automática nas matérias-primas.'}
          </p>
          <button
            onClick={() => setModalNovaOpAberto(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Criar Primeira Ordem de Produção</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordensFiltradas.map((op) => {
            const isPlanejada = op.status === 'PLANEJADA';
            const isPreparo = op.status === 'EM_PREPARO';
            const isFritura = op.status === 'FRITURA';
            const isConcluida = op.status === 'CONCLUIDA';
            const isCancelada = op.status === 'CANCELADA';

            return (
              <div
                key={op.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md ${
                  isFritura
                    ? 'border-orange-300 ring-2 ring-orange-400/30'
                    : isPreparo
                    ? 'border-sky-300 ring-1 ring-sky-300/30'
                    : isConcluida
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : 'border-slate-200'
                }`}
              >
                {/* Header do Card */}
                <div className="p-4 border-b border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      OP #{op.numeroOp}
                    </span>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isPlanejada
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : isPreparo
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : isFritura
                          ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse'
                          : isConcluida
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {isPlanejada && '🕒 Planejada'}
                      {isPreparo && '🥣 Em Preparo'}
                      {isFritura && '🔥 Fritando'}
                      {isConcluida && '✅ Concluída'}
                      {isCancelada && '❌ Cancelada'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{op.produtoNome}</span>
                    </h4>
                    <div className="text-xs font-bold text-slate-600 mt-0.5">
                      Lote: <span className="text-slate-900 font-extrabold">{op.quantidadePlanejada} {op.unidadeMedida}</span>
                    </div>
                  </div>

                  {/* Informações de Origem e Cliente */}
                  <div className="pt-1.5 border-t border-slate-100 text-[11px] space-y-1">
                    {op.tipoOrigem === 'SOB_ENCOMENDA' ? (
                      <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50/80 px-2 py-1 rounded-lg border border-blue-100 font-semibold">
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Cliente: <strong>{op.clienteNome || 'Cliente sob encomenda'}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 font-medium">
                        <Factory className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>Produção para Vitrine / Estoque</span>
                      </div>
                    )}

                    {op.dataPrevisaoEntrega && (
                      <div className="flex items-center gap-1 text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Previsão: {new Date(op.dataPrevisaoEntrega).toLocaleString('pt-BR')}</span>
                      </div>
                    )}

                    {op.observacoes && (
                      <div className="text-[11px] italic text-slate-500 bg-amber-50/50 p-1.5 rounded border border-amber-100/60 mt-1">
                        "{op.observacoes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Explosão de Insumos da Ficha Técnica */}
                <div className="p-3 bg-slate-50/60 text-xs border-b border-slate-100 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Insumos / Ingredientes da Receita:</span>
                    <span className="text-slate-400 font-normal">
                      {op.insumos?.length || 0} item(ns)
                    </span>
                  </div>

                  {op.insumos && op.insumos.length > 0 ? (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {op.insumos.map((insumo) => (
                        <div
                          key={insumo.id}
                          className="flex items-center justify-between text-[11px] bg-white p-1 rounded border border-slate-200/60"
                        >
                          <span className="text-slate-700 truncate max-w-[140px] font-medium" title={insumo.insumoNome}>
                            {insumo.insumoNome}
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            {insumo.quantidadeNecessaria} {insumo.unidadeMedida}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Nenhum insumo associado ou receita sem itens cadastrados.
                    </div>
                  )}
                </div>

                {/* Ações do Card */}
                <div className="p-3 bg-white flex items-center justify-between gap-2">
                  {!isConcluida && !isCancelada && (
                    <button
                      onClick={() => handleExcluirOp(op.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Cancelar Ordem de Produção"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex-1 flex justify-end gap-1.5">
                    {isPlanejada && (
                      <button
                        onClick={() => handleAvancarStatus(op, 'EM_PREPARO')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs transition-all shadow-xs active:scale-95"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Iniciar Preparo</span>
                      </button>
                    )}

                    {isPreparo && (
                      <button
                        onClick={() => handleAvancarStatus(op, 'FRITURA')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-all shadow-xs active:scale-95"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Fritar Salgados</span>
                      </button>
                    )}

                    {isFritura && (
                      <button
                        onClick={() => handleAvancarStatus(op, 'CONCLUIDA')}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluir & Baixar Insumos</span>
                      </button>
                    )}

                    {isConcluida && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Finalizado com baixa no estoque
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova Ordem de Produção */}
      {modalNovaOpAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Nova Ordem de Produção (OP)</h3>
                  <p className="text-[11px] text-slate-400">Planejamento de salgados fritos e produtos artesanais</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovaOpAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarOp} className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Seleção do Produto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Produto a Produzir *
                </label>
                <select
                  value={produtoSelecionadoId}
                  onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Selecione o produto final / salgado...</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} {p.tipoItem === 'PRODUTO_FINAL' ? '⭐ (Produto Final)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Selecione o salgadinho ou produto final que possui receita/ficha técnica cadastrada.
                </p>
              </div>

              {/* Quantidade e Unidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantidade a Produzir *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={quantidadePlanejada}
                    onChange={(e) => setQuantidadePlanejada(Number(e.target.value))}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={unidadeMedida}
                    onChange={(e) => setUnidadeMedida(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CENTO">CENTO (100 un)</option>
                    <option value="UN">UN (Unidade avulsa)</option>
                    <option value="KG">KG (Quilo)</option>
                    <option value="PACOTE">PACOTE</option>
                    <option value="BANDEJA">BANDEJA</option>
                  </select>
                </div>
              </div>

              {/* Tipo de Origem */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destino da Produção *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoOrigem('SOB_ENCOMENDA')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                      tipoOrigem === 'SOB_ENCOMENDA'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/30'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <div>
                      <div>Sob Encomenda</div>
                      <div className="text-[10px] font-normal text-slate-500">Para festa / cliente específico</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoOrigem('PARA_ESTOQUE')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                      tipoOrigem === 'PARA_ESTOQUE'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/30'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Factory className="w-4 h-4 text-amber-600" />
                    <div>
                      <div>Para Estoque</div>
                      <div className="text-[10px] font-normal text-slate-500">Vitrine, congelados ou revenda</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Se Sob Encomenda: Cliente e Data/Hora Prevista */}
              {tipoOrigem === 'SOB_ENCOMENDA' && (
                <div className="space-y-3 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Cliente da Encomenda
                    </label>
                    <select
                      value={clienteSelecionadoId}
                      onChange={(e) => setClienteSelecionadoId(e.target.value)}
                      className="w-full text-xs bg-white border border-blue-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione o cliente (opcional)...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({c.telefone}) - {c.bairroNome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-blue-900 mb-1">
                        Data de Entrega
                      </label>
                      <input
                        type="date"
                        value={dataPrevisao}
                        onChange={(e) => setDataPrevisao(e.target.value)}
                        className="w-full text-xs bg-white border border-blue-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-900 mb-1">
                        Horário da Fritura
                      </label>
                      <input
                        type="time"
                        value={horaPrevisao}
                        onChange={(e) => setHoraPrevisao(e.target.value)}
                        className="w-full text-xs bg-white border border-blue-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preview da Explosão de Insumos da Ficha Técnica */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    Insumos Calculados para este Lote:
                  </span>
                  {carregandoEstrutura && (
                    <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                      Carregando receita...
                    </span>
                  )}
                </div>

                {estruturaProduto.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {estruturaProduto.map((item) => {
                      const totalEstimado = (item.quantidadeNecessaria * quantidadePlanejada).toFixed(2);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs bg-white p-1.5 rounded border border-slate-200"
                        >
                          <span className="text-slate-700 font-medium truncate max-w-[180px]">
                            {item.insumoNome || 'Insumo'}
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {totalEstimado} {item.unidadeMedida}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    {produtoSelecionadoId
                      ? 'Este produto ainda não possui insumos na Ficha Técnica. A OP será criada sem baixa de receita pré-definida.'
                      : 'Selecione um produto acima para visualizar os insumos necessários.'}
                  </p>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observações de Preparo / Fritura
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Fritar bem douradinho, sem orégano, embalar em caixa térmica..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovaOpAberto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoOp || !produtoSelecionadoId}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-sm disabled:opacity-50"
                >
                  {salvandoOp ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Criar Ordem de Produção</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
