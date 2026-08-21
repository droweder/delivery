import React, { useState } from 'react';
import { BairroTaxa, Cliente, Entregador, Produto, TipoVasilhame } from '../types';
import { formatarMoeda } from '../lib/thermalPrinter';
import {
  FolderKanban,
  Package,
  Users,
  Truck,
  MapPin,
  Search,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Star,
  StarOff,
  CheckCircle2,
  AlertTriangle,
  Phone,
  DollarSign,
  Clock,
  Battery,
  ShieldCheck,
  Tag,
  Check,
  X,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { ModalImportarProdutosErp } from './ModalImportarProdutosErp';

interface Props {
  produtos: Produto[];
  clientes: Cliente[];
  entregadores: Entregador[];
  bairros: BairroTaxa[];
  onSalvarProduto: (produto: Partial<Produto> & { id?: string }) => Promise<void>;
  onExcluirProduto: (id: string) => Promise<void>;
  onSalvarCliente: (cliente: Partial<Cliente> & { id?: string }) => Promise<void>;
  onExcluirCliente: (id: string) => Promise<void>;
  onSalvarEntregador: (entregador: Partial<Entregador> & { id?: string }) => Promise<void>;
  onExcluirEntregador: (id: string) => Promise<void>;
  onSalvarBairro: (bairro: Partial<BairroTaxa> & { id?: string }) => Promise<void>;
  onExcluirBairro: (id: string) => Promise<void>;
  onImportarProdutosErp?: (produtosImportados: any[]) => Promise<void>;
}

type AbaCadastro = 'PRODUTOS' | 'CLIENTES' | 'ENTREGADORES' | 'BAIRROS';

export const CadastrosHub: React.FC<Props> = ({
  produtos,
  clientes,
  entregadores,
  bairros,
  onSalvarProduto,
  onExcluirProduto,
  onSalvarCliente,
  onExcluirCliente,
  onSalvarEntregador,
  onExcluirEntregador,
  onSalvarBairro,
  onExcluirBairro,
  onImportarProdutosErp,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<AbaCadastro>('PRODUTOS');
  const [busca, setBusca] = useState('');
  const [modalErpAberto, setModalErpAberto] = useState(false);

  // Modals state
  const [produtoModal, setProdutoModal] = useState<Partial<Produto> | null>(null);
  const [clienteModal, setClienteModal] = useState<Partial<Cliente> | null>(null);
  const [entregadorModal, setEntregadorModal] = useState<Partial<Entregador> | null>(null);
  const [bairroModal, setBairroModal] = useState<Partial<BairroTaxa> | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [notificacao, setNotificacao] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const exibirNotificacao = (tipo: 'sucesso' | 'erro', texto: string) => {
    setNotificacao({ tipo, texto });
    setTimeout(() => setNotificacao(null), 4000);
  };

  // --------------------------------------------------------------------------
  // HANDLERS PRODUTOS
  // --------------------------------------------------------------------------
  const handleToggleMaisUtilizado = async (prod: Produto) => {
    try {
      await onSalvarProduto({ ...prod, maisUtilizado: !prod.maisUtilizado });
      exibirNotificacao(
        'sucesso',
        `Produto ${prod.nome} ${!prod.maisUtilizado ? 'marcado como Mais Utilizado ⭐' : 'desmarcado'}`
      );
    } catch (e: any) {
      exibirNotificacao('erro', e.message);
    }
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoModal?.nome) return;
    try {
      setSalvando(true);
      await onSalvarProduto(produtoModal);
      setProdutoModal(null);
      exibirNotificacao('sucesso', 'Produto salvo com sucesso!');
    } catch (e: any) {
      exibirNotificacao('erro', e.message || 'Erro ao salvar produto');
    } finally {
      setSalvando(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS CLIENTES
  // --------------------------------------------------------------------------
  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteModal?.nome || !clienteModal?.telefone) return;
    try {
      setSalvando(true);
      await onSalvarCliente(clienteModal);
      setClienteModal(null);
      exibirNotificacao('sucesso', 'Cliente salvo com sucesso!');
    } catch (e: any) {
      exibirNotificacao('erro', e.message || 'Erro ao salvar cliente');
    } finally {
      setSalvando(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS ENTREGADORES
  // --------------------------------------------------------------------------
  const handleSalvarEntregador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entregadorModal?.nome) return;
    try {
      setSalvando(true);
      await onSalvarEntregador(entregadorModal);
      setEntregadorModal(null);
      exibirNotificacao('sucesso', 'Colaborador salvo com sucesso!');
    } catch (e: any) {
      exibirNotificacao('erro', e.message || 'Erro ao salvar colaborador');
    } finally {
      setSalvando(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS BAIRROS
  // --------------------------------------------------------------------------
  const handleSalvarBairro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bairroModal?.nome) return;
    try {
      setSalvando(true);
      await onSalvarBairro(bairroModal);
      setBairroModal(null);
      exibirNotificacao('sucesso', 'Bairro/Taxa salvo com sucesso!');
    } catch (e: any) {
      exibirNotificacao('erro', e.message || 'Erro ao salvar bairro');
    } finally {
      setSalvando(false);
    }
  };

  // --------------------------------------------------------------------------
  // FILTERED DATA
  // --------------------------------------------------------------------------
  const produtosFiltrados = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.marca.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca) ||
      c.endereco.toLowerCase().includes(busca.toLowerCase()) ||
      c.bairroNome.toLowerCase().includes(busca.toLowerCase())
  );

  const entregadoresFiltrados = entregadores.filter(
    (e) =>
      e.nome.toLowerCase().includes(busca.toLowerCase()) ||
      e.veiculo.toLowerCase().includes(busca.toLowerCase()) ||
      e.placa.toLowerCase().includes(busca.toLowerCase())
  );

  const bairrosFiltrados = bairros.filter((b) => b.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FolderKanban className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Central de Cadastros
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gerencie o catálogo de produtos da conveniência, base de clientes, frota de entregadores e
              taxas de entrega por bairro.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {abaAtiva === 'PRODUTOS' && onImportarProdutosErp && (
              <button
                onClick={() => setModalErpAberto(true)}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Importar ERP</span>
              </button>
            )}

            {abaAtiva === 'PRODUTOS' && (
              <button
                onClick={() =>
                  setProdutoModal({
                    nome: '',
                    marca: 'Ultragaz',
                    categoria: 'GAS_P13',
                    tipoVasilhame: 'P13',
                    unidadeMedida: 'UN',
                    precoRecarga: 115.0,
                    precoCompleto: 295.0,
                    estoqueCheio: 20,
                    estoqueVazio: 10,
                    estoqueMinimo: 5,
                    permiteVendaCasco: true,
                    maisUtilizado: false,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Produto</span>
              </button>
            )}

            {abaAtiva === 'CLIENTES' && (
              <button
                onClick={() =>
                  setClienteModal({
                    nome: '',
                    telefone: '',
                    endereco: '',
                    numero: '',
                    complemento: '',
                    referencia: '',
                    bairroId: bairros[0]?.id || 'b1',
                    saldoDevedor: 0,
                    vasilhamesPendentes: { P13: 0, P20L: 0 },
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Cliente</span>
              </button>
            )}

            {abaAtiva === 'ENTREGADORES' && (
              <button
                onClick={() =>
                  setEntregadorModal({
                    nome: '',
                    telefone: '',
                    veiculo: 'Moto (Padrão)',
                    placa: '',
                    status: 'DISPONIVEL',
                    bateriaNivel: 100,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Entregador</span>
              </button>
            )}

            {abaAtiva === 'BAIRROS' && (
              <button
                onClick={() =>
                  setBairroModal({
                    nome: '',
                    taxaEntrega: 5.0,
                    tempoMedioMin: 25,
                    ativo: true,
                  })
                }
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Bairro</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setAbaAtiva('PRODUTOS')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              abaAtiva === 'PRODUTOS'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Produtos & Estoque ({produtos.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('CLIENTES')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              abaAtiva === 'CLIENTES'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes & Fiados ({clientes.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('ENTREGADORES')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              abaAtiva === 'ENTREGADORES'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Colaboradores / Frota ({entregadores.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('BAIRROS')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-black transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              abaAtiva === 'BAIRROS'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Bairros & Taxas ({bairros.length})</span>
          </button>
        </div>
      </div>

      {notificacao && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fade-in ${
            notificacao.tipo === 'sucesso'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {notificacao.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{notificacao.texto}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              abaAtiva === 'PRODUTOS'
                ? 'Buscar por nome, marca ou código...'
                : abaAtiva === 'CLIENTES'
                ? 'Buscar cliente por nome, telefone, rua ou bairro...'
                : abaAtiva === 'ENTREGADORES'
                ? 'Buscar entregador por nome, veículo ou placa...'
                : 'Buscar bairro atendido...'
            }
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden transition-colors"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: PRODUTOS & ESTOQUE                                                */}
      {/* ========================================================================= */}
      {abaAtiva === 'PRODUTOS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtosFiltrados.map((prod) => (
            <div
              key={prod.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono text-slate-500">
                        {prod.codigo}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-[9px]">
                        {prod.marca}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[9px]">
                        {prod.unidadeMedida}
                      </span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white mt-1">
                      {prod.nome}
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleMaisUtilizado(prod)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      prod.maisUtilizado
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                        : 'text-slate-300 hover:text-slate-400'
                    }`}
                    title={prod.maisUtilizado ? 'Item Mais Utilizado' : 'Marcar como Mais Utilizado'}
                  >
                    <Star className={`w-4 h-4 ${prod.maisUtilizado ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      {prod.permiteVendaCasco ? 'Preço Recarga / Troca' : 'Preço Venda'}
                    </span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatarMoeda(prod.precoRecarga)}
                    </span>
                  </div>
                  {prod.permiteVendaCasco && (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Preço Completo (+Casco)
                      </span>
                      <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                        {formatarMoeda(prod.precoCompleto)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stocks */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">Cheios</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-300">{prod.estoqueCheio}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold">Vazios</span>
                    <span className="font-black text-amber-700 dark:text-amber-300">{prod.estoqueVazio}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold">Mínimo</span>
                    <span className="font-black text-slate-700 dark:text-slate-300">{prod.estoqueMinimo}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Vendas: {prod.vendasCount || 0} unid.
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setProdutoModal({ ...prod })}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir produto "${prod.nome}"?`)) onExcluirProduto(prod.id);
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: CLIENTES & FIADOS                                                 */}
      {/* ========================================================================= */}
      {abaAtiva === 'CLIENTES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((cli) => (
            <div
              key={cli.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{cli.nome}</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{cli.telefone}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {cli.bairroNome}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>
                      {cli.endereco}, {cli.numero}
                      {cli.complemento ? ` (${cli.complemento})` : ''}
                    </span>
                  </div>
                  {cli.referencia && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 pl-5">
                      Ref: {cli.referencia}
                    </p>
                  )}
                </div>

                {/* Balance & Pending Bottles */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-bold">Saldo Devedor</span>
                    <span className="font-black text-rose-700 dark:text-rose-300 text-sm">
                      {formatarMoeda(cli.saldoDevedor || 0)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold">Cascos Pendentes</span>
                    <span className="font-black text-amber-700 dark:text-amber-300 text-xs">
                      P13: {cli.vasilhamesPendentes?.P13 || 0} | P20L: {cli.vasilhamesPendentes?.P20L || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold">
                  Total Pedidos: {cli.totalPedidos || 0}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setClienteModal({ ...cli })}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir cliente "${cli.nome}"?`)) onExcluirCliente(cli.id);
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: ENTREGADORES & FROTA                                              */}
      {/* ========================================================================= */}
      {abaAtiva === 'ENTREGADORES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entregadoresFiltrados.map((ent) => (
            <div
              key={ent.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{ent.nome}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{ent.telefone}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                      ent.status === 'EM_ROTA'
                        ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    {ent.status === 'EM_ROTA' ? 'EM ROTA' : 'DISPONÍVEL'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Veículo / Placa</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {ent.veiculo} ({ent.placa})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Entregas Hoje</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                      {ent.totalEntregasHoje || 0} finalizadas
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Bateria: {ent.bateriaNivel || 100}%</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEntregadorModal({ ...ent })}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Excluir colaborador "${ent.nome}"?`)) onExcluirEntregador(ent.id);
                    }}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: BAIRROS & TAXAS                                                   */}
      {/* ========================================================================= */}
      {abaAtiva === 'BAIRROS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {bairrosFiltrados.map((b) => (
            <div
              key={b.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">{b.nome}</h4>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                      b.ativo !== false
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {b.ativo !== false ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Taxa Entrega:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {formatarMoeda(b.taxaEntrega)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Tempo Médio:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {b.tempoMedioMin} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1">
                <button
                  onClick={() => setBairroModal({ ...b })}
                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir bairro "${b.nome}"?`)) onExcluirBairro(b.id);
                  }}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRODUTO                                                            */}
      {/* ========================================================================= */}
      {produtoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {produtoModal.id ? `Editar: ${produtoModal.nome}` : 'Cadastrar Novo Produto'}
              </h3>
              <button onClick={() => setProdutoModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarProduto} className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={produtoModal.nome || ''}
                    onChange={(e) => setProdutoModal({ ...produtoModal, nome: e.target.value })}
                    placeholder="Ex: Gás de Cozinha P13"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Marca</label>
                  <input
                    type="text"
                    value={produtoModal.marca || ''}
                    onChange={(e) => setProdutoModal({ ...produtoModal, marca: e.target.value })}
                    placeholder="Ex: Ultragaz, Liquigás, Lindoya"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={produtoModal.unidadeMedida || 'UN'}
                    onChange={(e) => setProdutoModal({ ...produtoModal, unidadeMedida: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="GL">GL (Galão)</option>
                    <option value="CX">CX (Caixa)</option>
                    <option value="FD">FD (Fardo)</option>
                    <option value="KG">KG (Quilo)</option>
                    <option value="L">L (Litro)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preço Recarga / Unitário (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={produtoModal.precoRecarga ?? ''}
                    onChange={(e) =>
                      setProdutoModal({ ...produtoModal, precoRecarga: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preço Completo (+Vasilhame R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={produtoModal.precoCompleto ?? ''}
                    onChange={(e) =>
                      setProdutoModal({ ...produtoModal, precoCompleto: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estoque Cheio Atual
                  </label>
                  <input
                    type="number"
                    value={produtoModal.estoqueCheio ?? ''}
                    onChange={(e) =>
                      setProdutoModal({ ...produtoModal, estoqueCheio: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estoque Vazios (Cascos)
                  </label>
                  <input
                    type="number"
                    value={produtoModal.estoqueVazio ?? ''}
                    onChange={(e) =>
                      setProdutoModal({ ...produtoModal, estoqueVazio: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="maisUtilizadoCheck"
                  checked={Boolean(produtoModal.maisUtilizado)}
                  onChange={(e) => setProdutoModal({ ...produtoModal, maisUtilizado: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="maisUtilizadoCheck" className="font-bold text-slate-700 dark:text-slate-300">
                  Fixar nos Mais Utilizados do Catálogo ⭐
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProdutoModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-black shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : 'Salvar Produto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CLIENTE                                                            */}
      {/* ========================================================================= */}
      {clienteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {clienteModal.id ? `Editar: ${clienteModal.nome}` : 'Cadastrar Novo Cliente'}
              </h3>
              <button onClick={() => setClienteModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarCliente} className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={clienteModal.nome || ''}
                    onChange={(e) => setClienteModal({ ...clienteModal, nome: e.target.value })}
                    placeholder="Ex: Maria Aparecida"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={clienteModal.telefone || ''}
                    onChange={(e) => setClienteModal({ ...clienteModal, telefone: e.target.value })}
                    placeholder="(11) 98765-4321"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Endereço (Rua/Av) *
                  </label>
                  <input
                    type="text"
                    required
                    value={clienteModal.endereco || ''}
                    onChange={(e) => setClienteModal({ ...clienteModal, endereco: e.target.value })}
                    placeholder="Rua das Palmeiras"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número *</label>
                  <input
                    type="text"
                    required
                    value={clienteModal.numero || ''}
                    onChange={(e) => setClienteModal({ ...clienteModal, numero: e.target.value })}
                    placeholder="123"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bairro de Entrega *
                  </label>
                  <select
                    value={clienteModal.bairroId || bairros[0]?.id}
                    onChange={(e) => {
                      const b = bairros.find((bx) => bx.id === e.target.value);
                      setClienteModal({
                        ...clienteModal,
                        bairroId: e.target.value,
                        bairroNome: b?.nome || '',
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {bairros.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome} ({formatarMoeda(b.taxaEntrega)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Complemento</label>
                  <input
                    type="text"
                    value={clienteModal.complemento || ''}
                    onChange={(e) => setClienteModal({ ...clienteModal, complemento: e.target.value })}
                    placeholder="Apto 42, Bloco B"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ponto de Referência
                  </label>
                  <input
                    type="text"
                    value={clienteModal.referencia || ''}
                    onChange={(e) => setClienteModal({ ...clienteModal, referencia: e.target.value })}
                    placeholder="Próximo à padaria central"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClienteModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-black shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : 'Salvar Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ENTREGADOR                                                         */}
      {/* ========================================================================= */}
      {entregadorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {entregadorModal.id ? `Editar: ${entregadorModal.nome}` : 'Novo Colaborador / Entregador'}
              </h3>
              <button onClick={() => setEntregadorModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEntregador} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={entregadorModal.nome || ''}
                  onChange={(e) => setEntregadorModal({ ...entregadorModal, nome: e.target.value })}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                <input
                  type="text"
                  value={entregadorModal.telefone || ''}
                  onChange={(e) => setEntregadorModal({ ...entregadorModal, telefone: e.target.value })}
                  placeholder="(11) 98888-1111"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Veículo</label>
                  <input
                    type="text"
                    value={entregadorModal.veiculo || ''}
                    onChange={(e) => setEntregadorModal({ ...entregadorModal, veiculo: e.target.value })}
                    placeholder="Ex: Moto Honda 160"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Placa</label>
                  <input
                    type="text"
                    value={entregadorModal.placa || ''}
                    onChange={(e) => setEntregadorModal({ ...entregadorModal, placa: e.target.value.toUpperCase() })}
                    placeholder="BRA2E19"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEntregadorModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-black shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BAIRRO                                                             */}
      {/* ========================================================================= */}
      {bairroModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {bairroModal.id ? `Editar: ${bairroModal.nome}` : 'Novo Bairro de Entrega'}
              </h3>
              <button onClick={() => setBairroModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarBairro} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Bairro *
                </label>
                <input
                  type="text"
                  required
                  value={bairroModal.nome || ''}
                  onChange={(e) => setBairroModal({ ...bairroModal, nome: e.target.value })}
                  placeholder="Ex: Jardim das Flores"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Taxa de Entrega (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={bairroModal.taxaEntrega ?? ''}
                    onChange={(e) =>
                      setBairroModal({ ...bairroModal, taxaEntrega: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tempo Médio (min)
                  </label>
                  <input
                    type="number"
                    value={bairroModal.tempoMedioMin ?? ''}
                    onChange={(e) =>
                      setBairroModal({ ...bairroModal, tempoMedioMin: parseInt(e.target.value) || 20 })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBairroModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-black shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : 'Salvar Bairro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação ERP */}
      {onImportarProdutosErp && (
        <ModalImportarProdutosErp
          isOpen={modalErpAberto}
          onClose={() => setModalErpAberto(false)}
          onImportar={onImportarProdutosErp}
        />
      )}
    </div>
  );
};
