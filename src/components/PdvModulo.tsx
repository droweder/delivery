import React, { useState } from 'react';
import {
  BairroTaxa,
  CategoriaProduto,
  Cliente,
  FormaPagamento,
  Pedido,
  Produto,
  TipoVendaItem,
  Usuario,
} from '../types';
import { formatarMoeda } from '../lib/thermalPrinter';
import {
  Search,
  UserPlus,
  Phone,
  MapPin,
  Flame,
  Droplet,
  Beer,
  Package,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  DollarSign,
  AlertCircle,
  Clock,
  ArrowRight,
  Star,
  Sparkles,
  Database,
  FileSpreadsheet,
  X,
  Tag,
  Zap,
} from 'lucide-react';
import { ModalImportarProdutosErp } from './ModalImportarProdutosErp';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';

interface Props {
  clientes: Cliente[];
  produtos: Produto[];
  bairros: BairroTaxa[];
  usuarioLogado?: Usuario | null;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  onPedidoCriado: (novoPedido: Pedido, imprimirImediato?: boolean) => void;
  onNovoCliente: (cliente: Cliente) => void;
  onProdutosAtualizados?: () => void;
}

interface ItemCarrinho {
  produto: Produto;
  tipoVenda: TipoVendaItem;
  quantidade: number;
}

export const PdvModulo: React.FC<Props> = ({
  clientes,
  produtos,
  bairros,
  usuarioLogado,
  activeTab = 'pdv',
  setActiveTab = () => {},
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onPedidoCriado,
  onNovoCliente,
  onProdutosAtualizados,
}) => {
  // Search & Client State
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [modalNovoCliente, setModalNovoCliente] = useState(false);

  // New Client Form State
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoEndereco, setNovoEndereco] = useState('');
  const [novoNumero, setNovoNumero] = useState('');
  const [novoComplemento, setNovoComplemento] = useState('');
  const [novoBairroId, setNovoBairroId] = useState(bairros[0]?.id || 'b1');
  const [novaReferencia, setNovaReferencia] = useState('');

  // Catalog, Search & ERP Modal State
  const [buscaProduto, setBuscaProduto] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaProduto | 'TODOS' | 'MAIS_UTILIZADOS'>('TODOS');
  const [modalImportarErp, setModalImportarErp] = useState(false);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [trocoPara, setTrocoPara] = useState<string>('');
  const [desconto, setDesconto] = useState<string>('0');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucessoFeedback, setSucessoFeedback] = useState<string | null>(null);

  // Client Search Filter
  const clientesFiltrados = clientes.filter((c) => {
    if (!buscaCliente.trim()) return false;
    const query = buscaCliente.toLowerCase().replace(/\D/g, '');
    const queryTexto = buscaCliente.toLowerCase();
    const telNumeros = c.telefone.replace(/\D/g, '');
    return (
      (query && telNumeros.includes(query)) ||
      c.nome.toLowerCase().includes(queryTexto) ||
      c.endereco.toLowerCase().includes(queryTexto) ||
      c.bairroNome.toLowerCase().includes(queryTexto)
    );
  });

  // Toggle favorite / most used status
  const handleToggleFavorito = async (e: React.MouseEvent, prodId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/produtos/${prodId}/toggle-favorito`, {
        method: 'PUT',
      });
      if (res.ok && onProdutosAtualizados) {
        onProdutosAtualizados();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // List of top frequently used products for the quick-access bar
  const produtosMaisUtilizados = produtos.filter((p) => p.maisUtilizado);

  // Products filtered by category and search
  const produtosFiltrados = produtos.filter((p) => {
    // 1. Categoria ou Mais Utilizados filter
    if (categoriaAtiva === 'MAIS_UTILIZADOS') {
      if (!p.maisUtilizado) return false;
    } else if (categoriaAtiva !== 'TODOS') {
      if (p.categoria !== categoriaAtiva) return false;
    }

    // 2. Campo de busca de produtos
    if (buscaProduto.trim()) {
      const q = buscaProduto.toLowerCase().trim();
      const matchNome = p.nome.toLowerCase().includes(q);
      const matchCodigo = p.codigo.toLowerCase().includes(q);
      const matchMarca = (p.marca || '').toLowerCase().includes(q);
      const matchUnidade = (p.unidadeMedida || '').toLowerCase().includes(q);
      const matchCategoria = p.categoria.toLowerCase().includes(q);
      return matchNome || matchCodigo || matchMarca || matchUnidade || matchCategoria;
    }

    return true;
  });

  // Taxa de entrega do bairro do cliente selecionado
  const bairroCliente = bairros.find((b) => b.id === clienteSelecionado?.bairroId);
  const taxaEntrega = clienteSelecionado ? bairroCliente?.taxaEntrega || 5.0 : 0;

  // Totais do Carrinho
  const subtotal = carrinho.reduce((acc, item) => {
    const preco =
      item.tipoVenda === 'COMPLETO' && item.produto.permiteVendaCasco
        ? item.produto.precoCompleto
        : item.produto.precoRecarga;
    return acc + preco * item.quantidade;
  }, 0);

  const valorDesconto = Math.max(0, Number(desconto) || 0);
  const total = Math.max(0, subtotal + (clienteSelecionado ? taxaEntrega : 0) - valorDesconto);

  // Cart operations
  const adicionarAoCarrinho = (produto: Produto, tipoVenda: TipoVendaItem = 'RECARGA') => {
    setCarrinho((prev) => {
      const idx = prev.findIndex(
        (it) => it.produto.id === produto.id && it.tipoVenda === tipoVenda
      );
      if (idx >= 0) {
        const novo = [...prev];
        novo[idx].quantidade += 1;
        return novo;
      }
      return [...prev, { produto, tipoVenda, quantidade: 1 }];
    });
  };

  const alterarQuantidade = (index: number, delta: number) => {
    setCarrinho((prev) => {
      const novo = [...prev];
      const novaQtd = novo[index].quantidade + delta;
      if (novaQtd <= 0) {
        novo.splice(index, 1);
      } else {
        novo[index].quantidade = novaQtd;
      }
      return novo;
    });
  };

  const removerDoCarrinho = (index: number) => {
    setCarrinho((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCadastrarNovoCliente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novoTelefone || !novoEndereco || !novoNumero) {
      alert('Preencha os campos obrigatórios do cliente!');
      return;
    }
    const bairro = bairros.find((b) => b.id === novoBairroId) || bairros[0];
    const novo: Cliente = {
      id: `c_${Date.now()}`,
      nome: novoNome,
      telefone: novoTelefone,
      endereco: novoEndereco,
      numero: novoNumero,
      complemento: novoComplemento,
      bairroId: bairro.id,
      bairroNome: bairro.nome,
      referencia: novaReferencia,
      lat: -23.55052 + (Math.random() - 0.5) * 0.02,
      lng: -46.633308 + (Math.random() - 0.5) * 0.02,
      saldoDevedor: 0,
      totalPedidos: 0,
      vasilhamesPendentes: { P13: 0, P20L: 0 },
    };

    onNovoCliente(novo);
    setClienteSelecionado(novo);
    setModalNovoCliente(false);
    setBuscaCliente(novo.telefone);
    // Limpar form
    setNovoNome('');
    setNovoTelefone('');
    setNovoEndereco('');
    setNovoNumero('');
    setNovoComplemento('');
    setNovaReferencia('');
  };

  const handleFinalizarPedido = async (imprimirDireto = false) => {
    if (!clienteSelecionado) {
      alert('Por favor, selecione ou cadastre o cliente antes de gerar o pedido!');
      return;
    }
    if (carrinho.length === 0) {
      alert('Adicione ao menos um produto ao pedido!');
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        clienteId: clienteSelecionado.id,
        itens: carrinho.map((it) => ({
          produtoId: it.produto.id,
          tipoVenda: it.tipoVenda,
          quantidade: it.quantidade,
        })),
        formaPagamentoPrevista: formaPagamento,
        trocoPara: formaPagamento === 'DINHEIRO' && trocoPara ? Number(trocoPara) : undefined,
        desconto: valorDesconto,
        observacoes,
        emitidoPorId: usuarioLogado?.id || 'u_pdv1',
        emitidoPorNome: usuarioLogado?.nome || 'Operador PDV',
        emitidoPorPerfil: usuarioLogado?.perfil || 'ATENDENTE_PDV',
      };

      const res = await fetch('/api/pdv/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Erro ao registrar pedido na base');
      const novoPedido = await res.json();

      setSucessoFeedback(`Pedido ${novoPedido.codigo} criado com sucesso! Status: PENDENTE`);
      onPedidoCriado(novoPedido, imprimirDireto);

      // Limpar formulário de pedido
      setCarrinho([]);
      setTrocoPara('');
      setDesconto('0');
      setObservacoes('');
      setTimeout(() => setSucessoFeedback(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert('Falha ao registrar pedido: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header com Botão de Menus Integrado */}
      <ModuloHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        usuarioLogado={usuarioLogado}
        isSuperAdmin={isSuperAdmin}
        pedidosPendentesCount={pedidosPendentesCount}
        pedidosEmRotaCount={pedidosEmRotaCount}
        pedidosEntreguesCount={pedidosEntreguesCount}
        moduloNumero="1"
        moduloCor="bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
        titulo="PDV Express • Entrada de Pedidos"
        subtitulo="Busca por telefone com auto-preenchimento, taxa de entrega por bairro e separação de recarga vs vasilhame."
      >
        {sucessoFeedback && (
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{sucessoFeedback}</span>
          </div>
        )}
      </ModuloHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Client Identification & Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. SEÇÃO DO CLIENTE */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-amber-100 text-amber-800">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">1. Identificação do Cliente</h3>
              </div>
              <button
                id="btn-open-new-client-modal"
                onClick={() => setModalNovoCliente(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Novo Cliente
              </button>
            </div>

            {/* Phone search input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="input-search-client"
                type="text"
                value={buscaCliente}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  if (!e.target.value) setClienteSelecionado(null);
                }}
                onBlur={() => {
                  if (buscaCliente.trim() && !clienteSelecionado && clientesFiltrados.length === 0) {
                    if (confirm('Cliente não encontrado. Deseja cadastrá-lo como novo cliente?')) {
                      setNovoTelefone(buscaCliente.replace(/\D/g, ''));
                      setModalNovoCliente(true);
                    }
                  }
                }}
                placeholder="Digite telefone com DDD ou nome do cliente..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/70"
              />
            </div>

            {/* Quick autocomplete dropdown results */}
            {buscaCliente && !clienteSelecionado && clientesFiltrados.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-md divide-y divide-slate-100 bg-white max-h-48 overflow-y-auto">
                {clientesFiltrados.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setClienteSelecionado(c);
                      setBuscaCliente(c.telefone);
                    }}
                    className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{c.nome}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.telefone} • {c.endereco}, {c.numero} ({c.bairroNome})
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-black text-[10px]">
                        {c.totalPedidos} pedidos
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Client Card */}
            {clienteSelecionado ? (
              <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1.5 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{clienteSelecionado.nome}</span>
                      <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold text-[9px]">
                        Identificado
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-blue-600" />
                      <span>{clienteSelecionado.telefone}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setClienteSelecionado(null);
                      setBuscaCliente('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold"
                  >
                    Trocar
                  </button>
                </div>

                <div className="text-[11px] text-slate-700 pt-1 border-t border-blue-200/60 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span>
                      {clienteSelecionado.endereco}, {clienteSelecionado.numero}
                      {clienteSelecionado.complemento ? ` (${clienteSelecionado.complemento})` : ''} -{' '}
                      <strong>{clienteSelecionado.bairroNome}</strong>
                    </span>
                    {clienteSelecionado.referencia && (
                      <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                        Ref: {clienteSelecionado.referencia}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1 text-slate-600">
                  <div className="flex items-center gap-1 text-emerald-700 font-bold">
                    <Clock className="w-3 h-3" />
                    <span>Taxa Entrega: {formatarMoeda(taxaEntrega)}</span>
                  </div>
                  {(clienteSelecionado.vasilhamesPendentes.P13 > 0 ||
                    clienteSelecionado.vasilhamesPendentes.P20L > 0) && (
                    <div className="text-rose-600 font-bold">
                      [!] Cascos Pendentes: {clienteSelecionado.vasilhamesPendentes.P13} P13,{' '}
                      {clienteSelecionado.vasilhamesPendentes.P20L} Água
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Digite o telefone acima para carregar o cliente ou clique em "Novo Cliente".</span>
              </div>
            )}
          </div>

          {/* 2. CATÁLOGO DE PRODUTOS */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            {/* Catalog Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">2. Catálogo de Produtos</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                  {produtosFiltrados.length} disponíveis
                </span>
              </div>
            </div>

            {/* Product Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-busca-produto"
                type="text"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Pesquisar produto por nome, marca, código, medida ou categoria..."
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs text-slate-800 transition-all font-medium"
              />
              {buscaProduto && (
                <button
                  type="button"
                  onClick={() => setBuscaProduto('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  title="Limpar pesquisa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Access Bar for Most Used Products (1-Click Add) */}
            {produtosMaisUtilizados.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    Acesso Rápido • Mais Utilizados (1 Clique para Adicionar)
                  </span>
                  <button
                    type="button"
                    onClick={() => setCategoriaAtiva('MAIS_UTILIZADOS')}
                    className="text-[10px] font-bold text-amber-800 hover:underline"
                  >
                    Ver todos ({produtosMaisUtilizados.length})
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {produtosMaisUtilizados.slice(0, 8).map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => adicionarAoCarrinho(prod, 'RECARGA')}
                      className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white hover:bg-amber-100/60 border border-amber-200 text-slate-800 hover:text-amber-950 font-semibold text-[11px] shadow-2xs transition-all"
                      title={`Adicionar 1x ${prod.nome} (${formatarMoeda(prod.precoRecarga)})`}
                    >
                      <span className="text-amber-500 text-xs">⭐</span>
                      <span className="truncate max-w-[130px] font-bold">{prod.nome.split('(')[0].trim()}</span>
                      <span className="text-emerald-700 font-bold">{formatarMoeda(prod.precoRecarga)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter Pills including ⭐ Mais Utilizados */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setCategoriaAtiva('TODOS')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                  categoriaAtiva === 'TODOS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({produtos.length})
              </button>

              <button
                type="button"
                onClick={() => setCategoriaAtiva('MAIS_UTILIZADOS')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                  categoriaAtiva === 'MAIS_UTILIZADOS'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-100/50'
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>Mais Utilizados ({produtosMaisUtilizados.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoriaAtiva('GAS')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                  categoriaAtiva === 'GAS' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-600" /> Gás
              </button>

              <button
                type="button"
                onClick={() => setCategoriaAtiva('AGUA')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                  categoriaAtiva === 'AGUA' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Droplet className="w-3 h-3 text-blue-600" /> Água
              </button>

              <button
                type="button"
                onClick={() => setCategoriaAtiva('BEBIDAS')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                  categoriaAtiva === 'BEBIDAS' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Beer className="w-3 h-3 text-indigo-600" /> Bebidas
              </button>

              <button
                type="button"
                onClick={() => setCategoriaAtiva('CONVENIENCIA')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                  categoriaAtiva === 'CONVENIENCIA' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3 h-3 text-slate-600" /> Conveniência
              </button>
            </div>

            {/* Products Grid */}
            {produtosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Package className="w-8 h-8 mx-auto stroke-1 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">Nenhum produto encontrado com os filtros atuais.</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {buscaProduto && (
                    <button
                      type="button"
                      onClick={() => setBuscaProduto('')}
                      className="px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold"
                    >
                      Limpar busca
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setModalImportarErp(true)}
                    className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold"
                  >
                    Importar do ERP
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
                {produtosFiltrados.map((prod) => {
                  const temCasco = prod.tipoVasilhame !== 'NENHUM';

                  return (
                    <div
                      key={prod.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        prod.maisUtilizado
                          ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300'
                          : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/20'
                      }`}
                    >
                      <div>
                        {/* Header: Title, Favorite Star, Code */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 text-xs sm:text-sm leading-tight">
                              {prod.nome}
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[10px]">
                              {prod.marca && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-bold">
                                  {prod.marca}
                                </span>
                              )}
                              {prod.unidadeMedida && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                  {prod.unidadeMedida}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorito(e, prod.id)}
                              className={`p-1 rounded-md transition-colors ${
                                prod.maisUtilizado
                                  ? 'text-amber-500 bg-amber-100/60 hover:bg-amber-200/60'
                                  : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                              }`}
                              title={prod.maisUtilizado ? 'Remover dos mais utilizados' : 'Marcar como mais utilizado'}
                            >
                              <Star className={`w-3.5 h-3.5 ${prod.maisUtilizado ? 'fill-amber-400' : ''}`} />
                            </button>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                              {prod.codigo}
                            </span>
                          </div>
                        </div>

                        {/* Stock & Casco details */}
                        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>
                              Cheio:{' '}
                              <strong className={`font-bold ${prod.estoqueCheio <= (prod.estoqueMinimo || 5) ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {prod.estoqueCheio}
                              </strong>
                            </span>
                            {temCasco && (
                              <span>
                                Vazios: <strong className="text-amber-700 font-bold">{prod.estoqueVazio}</strong>
                              </span>
                            )}
                          </div>
                          {prod.vendasCount ? (
                            <span className="text-[10px] text-slate-400 font-medium">{prod.vendasCount} vendas</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Action buttons (Recarga vs Completo) */}
                      <div className="space-y-1 pt-2 border-t border-slate-200/60">
                        {temCasco && prod.permiteVendaCasco ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              id={`btn-add-recarga-${prod.id}`}
                              onClick={() => adicionarAoCarrinho(prod, 'RECARGA')}
                              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs"
                            >
                              <span className="text-[9px] font-medium opacity-90">RECARGA (troca)</span>
                              <span className="font-mono font-black">{formatarMoeda(prod.precoRecarga)}</span>
                            </button>

                            <button
                              id={`btn-add-completo-${prod.id}`}
                              onClick={() => adicionarAoCarrinho(prod, 'COMPLETO')}
                              className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-2xs"
                            >
                              <span className="text-[9px] font-medium opacity-90">COMPLETO (+casco)</span>
                              <span className="font-mono font-black">{formatarMoeda(prod.precoCompleto)}</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`btn-add-item-${prod.id}`}
                            onClick={() => adicionarAoCarrinho(prod, 'RECARGA')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs"
                          >
                            <span>Adicionar Item</span>
                            <span className="font-mono font-black">{formatarMoeda(prod.precoRecarga)}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary / Cart / Payment (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4 sticky top-16">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">3. Resumo do Pedido</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {carrinho.reduce((acc, it) => acc + it.quantidade, 0)} itens
              </span>
            </div>

            {/* Cart Items List */}
            {carrinho.length === 0 ? (
              <div className="py-6 text-center text-slate-400 space-y-1.5 border border-dashed border-slate-200 rounded-lg">
                <Package className="w-6 h-6 mx-auto stroke-1" />
                <p className="text-xs font-medium">Carrinho vazio.</p>
                <p className="text-[10px] text-slate-400">Clique nos itens do catálogo para adicionar.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {carrinho.map((item, idx) => {
                  const precoUnit =
                    item.tipoVenda === 'COMPLETO' && item.produto.permiteVendaCasco
                      ? item.produto.precoCompleto
                      : item.produto.precoRecarga;
                  const itemSubtotal = precoUnit * item.quantidade;

                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-1.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate text-xs">{item.produto.nome}</div>
                        <div className="text-[10px] text-slate-500">
                          <span
                            className={`font-bold ${
                              item.tipoVenda === 'COMPLETO' ? 'text-amber-700' : 'text-blue-700'
                            }`}
                          >
                            {item.tipoVenda === 'COMPLETO' ? 'COMPLETO' : 'RECARGA'}
                          </span>{' '}
                          • {formatarMoeda(precoUnit)} un
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center border border-slate-300 rounded bg-white overflow-hidden">
                          <button
                            onClick={() => alterarQuantidade(idx, -1)}
                            className="px-1 py-0.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-1.5 font-bold text-slate-900 text-xs">{item.quantidade}</span>
                          <button
                            onClick={() => alterarQuantidade(idx, 1)}
                            className="px-1 py-0.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <span className="font-bold font-mono text-slate-900 w-14 text-right text-xs">
                          {formatarMoeda(itemSubtotal)}
                        </span>
                        <button
                          onClick={() => removerDoCarrinho(idx)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Payment Method & Delivery Totals */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Forma de Pagamento:</label>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ['DINHEIRO', 'Dinheiro'],
                      ['PIX', 'Pix'],
                      ['CARTAO_DEBITO', 'Débito'],
                      ['CARTAO_CREDITO', 'Crédito'],
                      ['A_PRAZO_FIADO', 'Fiado'],
                    ] as const
                  ).map(([tipo, label]) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setFormaPagamento(tipo)}
                      className={`px-1.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                        formaPagamento === tipo
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {formaPagamento === 'DINHEIRO' && (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                  <span className="text-emerald-900 font-bold text-xs">Troco para quanto?</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-emerald-800">R$</span>
                    <input
                      id="input-troco-para"
                      type="number"
                      value={trocoPara}
                      onChange={(e) => setTrocoPara(e.target.value)}
                      placeholder={total > 0 ? String(Math.ceil(total / 10) * 10) : '0'}
                      className="w-20 px-2 py-0.5 rounded border border-emerald-300 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Observações / Ponto de referência */}
              <div>
                <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">Observações da Entrega:</label>
                <input
                  id="input-observacoes-pedido"
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Tocar interfone 204, portão azul..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              {/* Totals Breakdown */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>Subtotal Itens:</span>
                  <span>{formatarMoeda(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>
                    Taxa ({clienteSelecionado ? clienteSelecionado.bairroNome : 'Sem cliente'}):
                  </span>
                  <span>{formatarMoeda(taxaEntrega)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span className="text-blue-700 font-black">{formatarMoeda(total)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 pt-1">
              <button
                id="btn-finalizar-pedido"
                disabled={salvando || !clienteSelecionado || carrinho.length === 0}
                onClick={() => handleFinalizarPedido(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs transition-all shadow-xs active:scale-98"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{salvando ? 'Gravando...' : 'Gravar Pedido (Status: Pendente)'}</span>
              </button>

              <button
                id="btn-finalizar-e-imprimir"
                disabled={salvando || !clienteSelecionado || carrinho.length === 0}
                onClick={() => handleFinalizarPedido(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition-all shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Gravar e Imprimir Comanda</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Cadastro Rápido de Novo Cliente */}
      {modalNovoCliente && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs"
          onClick={() => setModalNovoCliente(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm">Cadastro Rápido de Cliente</h3>
              </div>
              <button
                onClick={() => setModalNovoCliente(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCadastrarNovoCliente} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Telefone / WhatsApp *</label>
                  <input
                    id="input-novo-telefone"
                    type="text"
                    required
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Nome Completo *</label>
                  <input
                    id="input-novo-nome"
                    type="text"
                    required
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-0.5">Endereço (Rua / Av) *</label>
                  <input
                    id="input-novo-endereco"
                    type="text"
                    required
                    value={novoEndereco}
                    onChange={(e) => setNovoEndereco(e.target.value)}
                    placeholder="Rua das Palmeiras"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Número *</label>
                  <input
                    id="input-novo-numero"
                    type="text"
                    required
                    value={novoNumero}
                    onChange={(e) => setNovoNumero(e.target.value)}
                    placeholder="123"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Bairro (Calcula taxa) *</label>
                  <select
                    id="select-novo-bairro"
                    value={novoBairroId}
                    onChange={(e) => setNovoBairroId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold text-slate-800"
                  >
                    {bairros.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome} (+ {formatarMoeda(b.taxaEntrega)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Complemento / Apto</label>
                  <input
                    id="input-novo-complemento"
                    type="text"
                    value={novoComplemento}
                    onChange={(e) => setNovoComplemento(e.target.value)}
                    placeholder="Apto 42, Bloco B"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Ponto de Referência</label>
                <input
                  id="input-nova-referencia"
                  type="text"
                  value={novaReferencia}
                  onChange={(e) => setNovaReferencia(e.target.value)}
                  placeholder="Próximo à padaria, portão branco"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNovoCliente(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-new-client"
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação de Produtos do ERP */}
      <ModalImportarProdutosErp
        aberto={modalImportarErp}
        onFechar={() => setModalImportarErp(false)}
        onProdutosImportados={() => {
          if (onProdutosAtualizados) onProdutosAtualizados();
        }}
      />
    </div>
  );
};
