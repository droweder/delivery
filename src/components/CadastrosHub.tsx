import React, { useState, useRef, useEffect } from 'react';
import { LocationPickerMap } from './LocationPickerMap';
import { BairroTaxa, Cliente, Entregador, Produto, TipoVasilhame, Usuario } from '../types';
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
  Building2,
  Globe,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ModalImportarProdutosErp } from './ModalImportarProdutosErp';
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';
import {
  apenasDigitos,
  consultarCep,
  consultarCnpj,
  formatarCep,
  formatarCpfCnpj,
  formatarTelefone,
  isCepValido, buscarEnderecosPorRua, ViaCepEndereco,
  isCnpj,
  isCpf,
  tipoDocumento,
} from '../services/consultaApi';

interface Props {
  produtos: Produto[];
  clientes: Cliente[];
  entregadores: Entregador[];
  bairros: BairroTaxa[];
  usuarioLogado?: Usuario | null;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
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
  usuarioLogado,
  activeTab = 'cadastros',
  setActiveTab = () => {},
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
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
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [consultandoCepBairro, setConsultandoCepBairro] = useState(false);
  const [cepBairroBusca, setCepBairroBusca] = useState('');
  const [statusCnpjInfo, setStatusCnpjInfo] = useState<string | null>(null);
  const [erroCnpjInfo, setErroCnpjInfo] = useState<string | null>(null);
  const [sugestoesEndereco, setSugestoesEndereco] = useState<ViaCepEndereco[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRuaChange = (rua: string) => {
    setClienteModal({ ...clienteModal, endereco: rua.toUpperCase() });
    if (rua.length < 3) {
      setSugestoesEndereco([]);
      setMostrarSugestoes(false);
      return;
    }
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      setBuscandoSugestoes(true);
      const estadoStr = clienteModal?.estado || 'SP';
      const cidadeStr = clienteModal?.cidade || 'São Paulo';
      const res = await buscarEnderecosPorRua(estadoStr, cidadeStr, rua);
      setSugestoesEndereco(res);
      setMostrarSugestoes(res.length > 0);
      setBuscandoSugestoes(false);
    }, 500);
  };

  const selecionarSugestaoEndereco = (end: ViaCepEndereco) => {
    const cepFormatado = formatarCep(end.cep);
    const bairroMatch = bairros.find(b => end.bairro && (b.nome.toLowerCase().includes(end.bairro.toLowerCase()) || end.bairro.toLowerCase().includes(b.nome.toLowerCase())));
    
    setClienteModal({
      ...clienteModal,
      endereco: end.logradouro.toUpperCase(),
      cep: cepFormatado,
      bairroId: bairroMatch ? bairroMatch.id : clienteModal?.bairroId,
      bairroNome: bairroMatch ? bairroMatch.nome : (clienteModal?.bairroNome || end.bairro)
    });
    setMostrarSugestoes(false);
  };
  const [notificacao, setNotificacao] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; texto: string } | null>(null);

  const exibirNotificacao = (tipo: 'sucesso' | 'erro' | 'aviso', texto: string) => {
    setNotificacao({ tipo, texto });
    setTimeout(() => setNotificacao(null), 5000);
  };

  // --------------------------------------------------------------------------
  // CONSULTAS EXTERNAS DE CNPJ E CEP
  // --------------------------------------------------------------------------
  const handleConsultarCnpjCliente = async (docCnpjParam?: string) => {
    const raw = docCnpjParam || clienteModal?.cpfCnpj || '';
    const clean = apenasDigitos(raw);

    if (clean.length !== 14) {
      return;
    }

    try {
      setConsultandoCnpj(true);
      setStatusCnpjInfo(null);
      setErroCnpjInfo(null);
      const res = await consultarCnpj(clean);

      // Tenta achar bairro correspondente
      let bairroCorrespondente = bairros.find(
        (b) => res.bairro && (b.nome.toLowerCase().includes(res.bairro.toLowerCase()) || res.bairro.toLowerCase().includes(b.nome.toLowerCase()))
      );

      setClienteModal((prev) => ({
        ...prev,
        nome: res.nomeFantasia || res.razaoSocial || prev?.nome || '',
        telefone: res.telefone ? formatarTelefone(res.telefone) : prev?.telefone || '',
        email: res.email || prev?.email || '',
        cpfCnpj: res.cnpjFormatado,
        cep: res.cepFormatado || prev?.cep || '',
        endereco: res.logradouro || prev?.endereco || '',
        numero: res.numero || prev?.numero || '',
        complemento: res.complemento || prev?.complemento || '',
        cidade: res.cidade || prev?.cidade || '',
        estado: res.estado || prev?.estado || '',
        bairroId: bairroCorrespondente ? bairroCorrespondente.id : prev?.bairroId || bairros[0]?.id,
        bairroNome: bairroCorrespondente ? bairroCorrespondente.nome : res.bairro || prev?.bairroNome || '',
      }));

      setStatusCnpjInfo(`${res.situacao || 'ATIVO'} • ${res.cidade}/${res.estado}`);
      setErroCnpjInfo(null);
      exibirNotificacao('sucesso', `CNPJ de ${res.nomeFantasia || res.razaoSocial} localizado e preenchido automaticamente!`);

      // Foco automático no número ou complemento após carregar dados
      setTimeout(() => {
        const el = document.getElementById('input-cliente-numero');
        if (el) el.focus();
      }, 100);
    } catch (e: any) {
      const msg = e.message || 'CNPJ não localizado na Receita Federal.';
      setErroCnpjInfo(msg);
      setStatusCnpjInfo(null);
      exibirNotificacao('erro', `Aviso: ${msg}`);
    } finally {
      setConsultandoCnpj(false);
    }
  };

  const handleConsultarCepCliente = async (cepParam?: string) => {
    const raw = cepParam || clienteModal?.cep || '';
    const clean = apenasDigitos(raw);

    if (clean.length !== 8) {
      if (!cepParam) {
        exibirNotificacao('erro', 'CEP deve conter 8 dígitos numéricos.');
      }
      return;
    }

    try {
      setConsultandoCep(true);
      const res = await consultarCep(clean);

      if (res.localizado === false) {
        setClienteModal((prev) => ({
          ...prev,
          cep: res.cepFormatado,
        }));
        exibirNotificacao('aviso', res.mensagem || `CEP ${res.cepFormatado} não localizado nos Correios. Preencha o endereço manualmente.`);
        return;
      }

      let bairroCorrespondente = bairros.find(
        (b) => res.bairro && (b.nome.toLowerCase().includes(res.bairro.toLowerCase()) || res.bairro.toLowerCase().includes(b.nome.toLowerCase()))
      );

      setClienteModal((prev) => ({
        ...prev,
        cep: res.cepFormatado,
        endereco: res.logradouro || prev?.endereco || '',
        complemento: res.complemento || prev?.complemento || '',
        cidade: res.cidade || prev?.cidade || '',
        estado: res.estado || prev?.estado || '',
        bairroId: bairroCorrespondente ? bairroCorrespondente.id : prev?.bairroId || bairros[0]?.id,
        bairroNome: bairroCorrespondente ? bairroCorrespondente.nome : res.bairro || prev?.bairroNome || '',
        lat: res.lat || prev?.lat || -23.55052,
        lng: res.lng || prev?.lng || -46.633308,
      }));

      exibirNotificacao('sucesso', `Endereço preenchido via CEP: ${res.logradouro || 'Rua'}, ${res.bairro || ''} - ${res.cidade}/${res.estado}`);

      // Foco no número
      setTimeout(() => {
        const el = document.getElementById('input-cliente-numero');
        if (el) el.focus();
      }, 100);
    } catch (e: any) {
      exibirNotificacao('aviso', e.message || 'Não foi possível consultar este CEP. Preencha o endereço manualmente.');
    } finally {
      setConsultandoCep(false);
    }
  };

  const handleConsultarCepBairro = async () => {
    if (!cepBairroBusca) return;
    const clean = cepBairroBusca.replace(/\D/g, '');
    if (clean.length !== 8) {
      exibirNotificacao('erro', 'Informe um CEP válido com 8 dígitos.');
      return;
    }

    try {
      setConsultandoCepBairro(true);
      const res = await consultarCep(clean);
      if (res.bairro) {
        setBairroModal((prev) => ({
          ...prev,
          nome: res.bairro,
        }));
        exibirNotificacao('sucesso', `Bairro "${res.bairro}" identificado para ${res.cidade}/${res.estado}!`);
      } else {
        exibirNotificacao('erro', `Não foi possível identificar o nome do bairro pelo CEP ${res.cepFormatado}.`);
      }
    } catch (e: any) {
      exibirNotificacao('erro', e.message || 'Erro ao consultar CEP do bairro.');
    } finally {
      setConsultandoCepBairro(false);
    }
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
    <div className="space-y-4 animate-fade-in">
      {/* Top Header com Botão de Menus Integrado */}
      <ModuloHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        usuarioLogado={usuarioLogado}
        isSuperAdmin={isSuperAdmin}
        pedidosPendentesCount={pedidosPendentesCount}
        pedidosEmRotaCount={pedidosEmRotaCount}
        pedidosEntreguesCount={pedidosEntreguesCount}
        moduloNumero="5"
        moduloCor="bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300"
        titulo="Central de Cadastros"
        subtitulo="Gerencie o catálogo de produtos da conveniência, base de clientes, frota de entregadores e taxas de entrega por bairro."
      >
        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {abaAtiva === 'PRODUTOS' && (
            <button
              type="button"
              onClick={() => setModalErpAberto(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
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
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
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
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
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
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
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
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Bairro</span>
            </button>
          )}
        </div>
      </ModuloHeader>

      {/* Container Principal dos Cadastros com Sub-Abas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
        {/* Section Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800">
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
              : notificacao.tipo === 'aviso'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {notificacao.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : notificacao.tipo === 'aviso' ? (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                      <span>{cli.nome}</span>
                      {cli.cpfCnpj && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          {cli.cpfCnpj}
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{cli.telefone}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                    {cli.bairroNome}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>
                      {cli.endereco}, {cli.numero}
                      {cli.complemento ? ` (${cli.complemento})` : ''}
                      {cli.cidade ? ` • ${cli.cidade}/${cli.estado || 'SP'}` : ''}
                    </span>
                  </div>
                  {cli.cep && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5 font-mono">
                      CEP: {cli.cep}
                    </p>
                  )}
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
                    onClick={() => {
                      setStatusCnpjInfo(null);
                      setClienteModal({ ...cli });
                    }}
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
                    onChange={(e) => setProdutoModal({ ...produtoModal, nome: e.target.value.toUpperCase() })}
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    {clienteModal.id ? `Editar: ${clienteModal.nome}` : 'Cadastrar Novo Cliente / Empresa'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Com preenchimento automático por CNPJ (Receita) e CEP (Correios)
                  </p>
                </div>
              </div>
              <button onClick={() => setClienteModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarCliente} className="p-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col md:flex-row gap-5">
                
                {/* ESQUERDA: DADOS E ENDEREÇO (2/3) */}
                <div className="w-full md:w-[60%] space-y-4">
                  
                  {/* Bloco 1: Identificação */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50 shadow-xs">
                    <label className="font-black text-blue-950 dark:text-blue-200 flex items-center gap-1.5 text-xs mb-2.5">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Identificação do Cliente</span>
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="relative">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CPF / CNPJ</label>
                        <input
                          type="text"
                          value={clienteModal.cpfCnpj || ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const formatted = formatarCpfCnpj(raw);
                            setClienteModal({ ...clienteModal, cpfCnpj: formatted });
                            const clean = apenasDigitos(raw);
                            if (erroCnpjInfo) setErroCnpjInfo(null);
                            if (clean.length === 14 && !consultandoCnpj) {
                              handleConsultarCnpjCliente(clean);
                            }
                          }}
                          placeholder="CPF ou CNPJ"
                          className="w-full p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500"
                        />
                        {consultandoCnpj && (
                          <div className="absolute right-2 top-7 flex items-center gap-1 text-blue-600">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      <div className="sm:col-span-1 lg:col-span-2">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo / Razão Social *</label>
                        <input
                          type="text"
                          required
                          value={clienteModal.nome || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, nome: e.target.value.toUpperCase() })}
                          placeholder="Ex: Maria Aparecida"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone *</label>
                        <input
                          type="text"
                          required
                          value={clienteModal.telefone || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, telefone: formatarTelefone(e.target.value) })}
                          placeholder="(11) 98765-4321"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                      
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail (Opcional)</label>
                        <input
                          type="email"
                          value={clienteModal.email || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, email: e.target.value.toUpperCase() })}
                          placeholder="cliente@empresa.com.br"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                        <select
                          value={clienteModal.status || 'ATIVO'}
                          onChange={(e) => setClienteModal({ ...clienteModal, status: e.target.value as 'ATIVO' | 'INATIVO' })}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black"
                        >
                          <option value="ATIVO">✅ ATIVO</option>
                          <option value="INATIVO">❌ INATIVO</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Endereço */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span>CEP</span>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">Auto</span>
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={clienteModal.cep || ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const formatted = formatarCep(raw);
                              setClienteModal({ ...clienteModal, cep: formatted });
                              const clean = apenasDigitos(raw);
                              if (clean.length === 8 && !consultandoCep) {
                                handleConsultarCepCliente(clean);
                              }
                            }}
                            placeholder="01001-000"
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleConsultarCepCliente(apenasDigitos(clienteModal.cep || ''))}
                            disabled={consultandoCep}
                            className="px-2.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                          >
                            {consultandoCep ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Search className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-12 sm:col-span-8 relative">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço (Rua / Av) *</label>
                        <input
                          type="text"
                          required
                          value={clienteModal?.endereco || ""}
                          onChange={(e) => handleRuaChange(e.target.value)}
                          onFocus={() => { if (sugestoesEndereco.length > 0) setMostrarSugestoes(true); }}
                          onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                          placeholder="Rua das Palmeiras"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        />
                        {buscandoSugestoes && (
                          <div className="absolute right-3 top-10">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          </div>
                        )}
                        {mostrarSugestoes && (
                          <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                            {sugestoesEndereco.map((sug, i) => (
                              <li 
                                key={i}
                                onClick={() => selecionarSugestaoEndereco(sug)}
                                className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex flex-col"
                              >
                                <span className="font-bold text-slate-800 dark:text-slate-200">{sug.logradouro}</span>
                                <span className="text-slate-500 dark:text-slate-400">{sug.bairro} - {sug.cep}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4 sm:col-span-3">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número *</label>
                        <input
                          type="text"
                          required
                          value={clienteModal.numero || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, numero: e.target.value.toUpperCase() })}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                        />
                      </div>
                      <div className="col-span-8 sm:col-span-5">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bairro de Entrega *</label>
                        <select
                          value={clienteModal.bairroId || bairros[0]?.id}
                          onChange={(e) => {
                            const b = bairros.find((bx) => bx.id === e.target.value);
                            setClienteModal({ ...clienteModal, bairroId: e.target.value, bairroNome: b?.nome || '' });
                          }}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          {bairros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                        </select>
                      </div>
                      <div className="col-span-8 sm:col-span-4">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cidade / UF</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={clienteModal.cidade || 'São Paulo'}
                            onChange={(e) => setClienteModal({ ...clienteModal, cidade: e.target.value.toUpperCase() })}
                            className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium min-w-0"
                          />
                          <input
                            type="text"
                            maxLength={2}
                            value={clienteModal.estado || 'SP'}
                            onChange={(e) => setClienteModal({ ...clienteModal, estado: e.target.value.toUpperCase() })}
                            className="w-10 px-1 py-2.5 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-bold shrink-0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Complemento</label>
                        <input
                          type="text"
                          value={clienteModal.complemento || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, complemento: e.target.value.toUpperCase() })}
                          placeholder="APTO 42"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-7">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ponto de Referência</label>
                        <input
                          type="text"
                          value={clienteModal.referencia || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, referencia: e.target.value.toUpperCase() })}
                          placeholder="Ex: Em frente ao mercado..."
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                </div>
                
                {/* DIREITA: MAPA E AVISOS (1/3) */}
                <div className="w-full md:w-[40%] flex flex-col gap-3">
                  
                  {/* Alertas CNPJ */}
                  {clienteModal.cpfCnpj && isCnpj(clienteModal.cpfCnpj) && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex gap-2 items-start">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 mt-0.5 shrink-0" />
                      <span><strong>CNPJ:</strong> Preenchimento da Receita.</span>
                    </div>
                  )}
                  {clienteModal.cpfCnpj && isCpf(clienteModal.cpfCnpj) && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex gap-2 items-start">
                      <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-500 mt-0.5 shrink-0" />
                      <span><strong>CPF:</strong> Nome/Tel manuais. Preencha o CEP para o endereço.</span>
                    </div>
                  )}
                  {erroCnpjInfo && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex gap-2 items-start">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>CNPJ não localizado. Preencha manualmente.</span>
                    </div>
                  )}

                  {/* Mapa */}
                  <div className="flex-1 min-h-[220px] flex flex-col">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Localização Exata</label>
                    <div className="flex-1 w-full relative">
                      <LocationPickerMap
                        lat={clienteModal.lat || -23.55052}
                        lng={clienteModal.lng || -46.633308}
                        enderecoCompleto={`${clienteModal.endereco || ''}, ${clienteModal.numero || ''}, ${bairros.find(b => b.id === clienteModal.bairroId)?.nome || ''}, ${clienteModal.cidade || ''} - ${clienteModal.estado || ''}`}
                        onChangeLocation={(lat, lng) => {
                          setClienteModal({ ...clienteModal, lat, lng });
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 mt-1">
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
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md flex items-center gap-1.5 transition-colors"
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
                  onChange={(e) => setEntregadorModal({ ...entregadorModal, nome: e.target.value.toUpperCase() })}
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
                    onChange={(e) => setEntregadorModal({ ...entregadorModal, veiculo: e.target.value.toUpperCase() })}
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
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  {bairroModal.id ? `Editar: ${bairroModal.nome}` : 'Novo Bairro de Entrega'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Defina o raio de atendimento e taxa de frete
                </p>
              </div>
              <button onClick={() => setBairroModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarBairro} className="p-4 sm:p-6 space-y-4 text-xs">
              {/* Assistente de busca de bairro por CEP */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Preencher Nome via CEP</span>
                  <span className="text-[10px] text-blue-600 font-normal">Consulta Correios</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={cepBairroBusca}
                    onChange={(e) => setCepBairroBusca(formatarCep(e.target.value))}
                    placeholder="Ex: 01001-000"
                    className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleConsultarCepBairro}
                    disabled={consultandoCepBairro}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold flex items-center gap-1"
                  >
                    {consultandoCepBairro ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Bairro *
                </label>
                <input
                  type="text"
                  required
                  value={bairroModal.nome || ''}
                  onChange={(e) => setBairroModal({ ...bairroModal, nome: e.target.value.toUpperCase() })}
                  placeholder="Ex: Jardim das Flores"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
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
      <ModalImportarProdutosErp
        isOpen={modalErpAberto}
        aberto={modalErpAberto}
        onClose={() => setModalErpAberto(false)}
        onFechar={() => setModalErpAberto(false)}
        onImportar={onImportarProdutosErp}
      />
    </div>
  );
};
