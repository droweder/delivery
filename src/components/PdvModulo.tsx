import React, { useState, useRef, useEffect } from 'react';
import { LocationPickerMap } from './LocationPickerMap';
import {
  BairroTaxa,
  CategoriaProduto,
  Cliente,
  Entregador,
  FormaPagamento,
  PagamentoItem,
  Pedido,
  Produto,
  TipoEntrega,
  TipoVendaItem,
  Usuario,
} from '../types';
import {  formatarMoeda,
  formatarDataHora,
} from '../lib/thermalPrinter';
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
  AlertTriangle,
  Clock,
  ArrowRight,
  Star,
  Sparkles,
  Database,
  FileSpreadsheet,
  X,
  Tag,
  Zap,
  Building2,
  Loader2,
  Users,
  Calendar,
  CalendarClock,
  Split,
  Coins,
  CreditCard,
  Pencil,
  MessageCircle,
  ShoppingCart,
  Truck,
  Send,
  Timer,
  Columns,
  Eye,
  EyeOff,
} from 'lucide-react';
import { abrirWhatsApp, gerarMensagemWhatsApp } from '../utils/whatsapp';
import { ModalImportarProdutosErp } from './ModalImportarProdutosErp';
import { MainTab } from './Navbar';
import { TopBarActions } from './TopBarPortal';
import { SegmentedTabs, TabItem } from './SegmentedTabs';
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
  onSalvarCliente?: (cliente: Cliente) => Promise<void> | void;
  onProdutosAtualizados?: () => void;
  pedidos?: Pedido[];
  entregadores?: Entregador[];
  onDespacharPedidos?: (pedidosIds: string[], entregadorId: string, imprimir?: boolean) => Promise<void>;
  onVisualizarComanda?: (pedido: Pedido) => void;
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
  onSalvarCliente,
  onProdutosAtualizados,
  pedidos = [],
  entregadores = [],
  onDespacharPedidos,
  onVisualizarComanda,
}) => {
  // Search & Client State
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [clienteEmEdicaoId, setClienteEmEdicaoId] = useState<string | null>(null);
  const [salvandoCliente, setSalvandoCliente] = useState(false);

  // New Client Form State
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoCpfCnpj, setNovoCpfCnpj] = useState('');
  const [novoCep, setNovoCep] = useState('');
  const [novoEndereco, setNovoEndereco] = useState('');
  const [bairrosExtras, setBairrosExtras] = useState<BairroTaxa[]>([]);
  const [sugestoesEndereco, setSugestoesEndereco] = useState<ViaCepEndereco[]>([]);
  const [buscandoSugestoes, setBuscandoSugestoes] = useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [novoNumero, setNovoNumero] = useState('');
  const [novoComplemento, setNovoComplemento] = useState('');
  const [novoBairroId, setNovoBairroId] = useState(bairros[0]?.id || 'b1');
  const [novoCidade, setNovoCidade] = useState('São Paulo');
  const [novoEstado, setNovoEstado] = useState('SP');
  const [novoLat, setNovoLat] = useState<number>(-23.55052);
  const [novoLng, setNovoLng] = useState<number>(-46.633308);
  const [novaReferencia, setNovaReferencia] = useState('');
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [statusCnpjInfo, setStatusCnpjInfo] = useState<string | null>(null);
  const [erroCnpjInfo, setErroCnpjInfo] = useState<string | null>(null);
  const [erroCepInfo, setErroCepInfo] = useState<string | null>(null);
  const [statusCepInfo, setStatusCepInfo] = useState<string | null>(null);

  // Catalog, Search & ERP Modal State
  const [buscaProduto, setBuscaProduto] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaProduto | 'TODOS' | 'MAIS_UTILIZADOS'>('TODOS');
  const [modalImportarErp, setModalImportarErp] = useState(false);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  
  // Pagamentos (Único ou Múltiplo)
  const [modoMultiploPagamento, setModoMultiploPagamento] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('DINHEIRO');
  const [pagamentosMultiplos, setPagamentosMultiplos] = useState<PagamentoItem[]>([
    { id: 'pg_1', forma: 'DINHEIRO', valor: 0, trocoPara: undefined },
  ]);
  const [taxaEntrega, setTaxaEntrega] = useState<string>('0');
  const [trocoPara, setTrocoPara] = useState<string>('');
  const [desconto, setDesconto] = useState<string>('0');
  const [observacoes, setObservacoes] = useState('');

  // Agendamento de Entrega (Imediata vs Agendada)
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('IMEDIATA');
  const [dataEntregaAgendada, setDataEntregaAgendada] = useState<string>(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [horaEntregaAgendada, setHoraEntregaAgendada] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(Math.ceil(d.getMinutes() / 15) * 15 % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  const [salvando, setSalvando] = useState(false);
  const [sucessoFeedback, setSucessoFeedback] = useState<string | null>(null);
  const [ultimoPedidoCriado, setUltimoPedidoCriado] = useState<Pedido | null>(null);

  // Estados do Kanban Integrado na mesma tela do PDV
  const [exibirKanban, setExibirKanban] = useState(true);
  const [pedidosSelecionadosKanban, setPedidosSelecionadosKanban] = useState<string[]>([]);
  const [entregadorDestinoKanban, setEntregadorDestinoKanban] = useState<string>(() => entregadores[0]?.id || '');
  const [despachandoKanban, setDespachandoKanban] = useState(false);

  // Sincronizar entregador destino padrão se carregado após o mount
  useEffect(() => {
    if (!entregadorDestinoKanban && entregadores.length > 0) {
      setEntregadorDestinoKanban(entregadores[0].id);
    }
  }, [entregadores, entregadorDestinoKanban]);

  // Pedidos por status para o Kanban integrado
  const pedidosPendentes = pedidos.filter((p) => p.status === 'PENDENTE');
  const pedidosEmRota = pedidos.filter((p) => p.status === 'EM_ROTA');
  const entregadoresAtivos = entregadores.filter((e) => e.ativo);

  // Cálculo Dinâmico da Estimativa de Tempo de Entrega com base nas entregas pendentes
  const calcularPrevisaoEntrega = () => {
    const qtdPendentes = pedidosPendentes.length;
    if (qtdPendentes === 0) {
      return { min: 15, max: 25, status: 'LIVRE', label: 'Fila Livre • Despacho Imediato' };
    }
    if (qtdPendentes <= 3) {
      return { min: 25, max: 35, status: 'NORMAL', label: 'Fluxo Normal' };
    }
    if (qtdPendentes <= 6) {
      return { min: 35, max: 50, status: 'MODERADO', label: 'Fluxo Moderado' };
    }
    return { min: 50, max: 75, status: 'ALTO', label: 'Fila Alta (Sugerir Agendamento)' };
  };

  const previsao = calcularPrevisaoEntrega();

  const handleAplicarPrevisaoObservacao = () => {
    const textoPrevisao = `PREVISÃO ENTREGA: ~${previsao.min}-${previsao.max} MIN`;
    if (observacoes.includes(textoPrevisao)) return;
    setObservacoes((prev) => (prev ? `${prev} | ${textoPrevisao}` : textoPrevisao));
  };

  const toggleSelecionarPedidoKanban = (id: string) => {
    setPedidosSelecionadosKanban((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDespacharKanban = async (imprimir: boolean) => {
    if (!onDespacharPedidos || pedidosSelecionadosKanban.length === 0 || !entregadorDestinoKanban) return;
    try {
      setDespachandoKanban(true);
      await onDespacharPedidos(pedidosSelecionadosKanban, entregadorDestinoKanban, imprimir);
      setPedidosSelecionadosKanban([]);
      if (onProdutosAtualizados) onProdutosAtualizados();
    } catch (err: any) {
      alert('Erro ao despachar: ' + err.message);
    } finally {
      setDespachandoKanban(false);
    }
  };

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

  // Totais do Carrinho
  const subtotal = carrinho.reduce((acc, item) => {
    const preco =
      item.tipoVenda === 'COMPLETO' && item.produto.permiteVendaCasco
        ? item.produto.precoCompleto
        : item.produto.precoRecarga;
    return acc + preco * item.quantidade;
  }, 0);

  const valorTaxaEntrega = Math.max(0, parseFloat(String(taxaEntrega).replace(',', '.')) || 0);
  const valorDesconto = Math.max(0, parseFloat(String(desconto).replace(',', '.')) || 0);
  const total = Math.max(0, subtotal + (clienteSelecionado ? valorTaxaEntrega : 0) - valorDesconto);

  // Multi-Payment Helpers
  const somaPagamentosMultiplos = pagamentosMultiplos.reduce(
    (acc, p) => acc + (Number(p.valor) || 0),
    0
  );
  const diferencaPagamento = total - somaPagamentosMultiplos;

  const handleAddFormaPagamento = (formaPadrao: FormaPagamento = 'PIX') => {
    const valorSugerido = Math.max(0, parseFloat(diferencaPagamento.toFixed(2)));
    setPagamentosMultiplos((prev) => [
      ...prev,
      {
        id: `pg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        forma: formaPadrao,
        valor: valorSugerido,
        trocoPara: undefined,
      },
    ]);
  };

  const handleRemoverFormaPagamento = (index: number) => {
    if (pagamentosMultiplos.length <= 1) return;
    setPagamentosMultiplos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAlterarPagamentoItem = (
    index: number,
    campo: keyof PagamentoItem,
    valor: any
  ) => {
    setPagamentosMultiplos((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [campo]: valor };
      return clone;
    });
  };

  const handlePreencherRestante = (index: number) => {
    const outrosSoma = pagamentosMultiplos.reduce(
      (acc, p, i) => (i === index ? acc : acc + (Number(p.valor) || 0)),
      0
    );
    const restante = Math.max(0, total - outrosSoma);
    handleAlterarPagamentoItem(index, 'valor', parseFloat(restante.toFixed(2)));
  };

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


  const autoCadastrarBairro = async (nomeBairro: string) => {
    if (!nomeBairro) return;
    const todosBairros = [...bairros, ...bairrosExtras];
    const found = todosBairros.find(
      (b) => b.nome.toLowerCase().includes(nomeBairro.toLowerCase()) || nomeBairro.toLowerCase().includes(b.nome.toLowerCase())
    );
    if (found) {
      setNovoBairroId(found.id);
    } else {
      try {
        const resp = await fetch('/api/bairros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nomeBairro, taxaEntrega: 5, tempoMedioMin: 20 })
        });
        if (resp.ok) {
          const novo = await resp.json();
          setBairrosExtras(prev => [...prev, novo]);
          setNovoBairroId(novo.id);
          if (onProdutosAtualizados) onProdutosAtualizados();
        }
      } catch (e) {
        console.warn("Erro ao cadastrar bairro:", e);
      }
    }
  };

  const handleConsultarCnpjClientePdv = async (docParam?: string) => {
    const raw = docParam || novoCpfCnpj;
    const clean = apenasDigitos(raw);
    if (clean.length !== 14) {
      return;
    }
    try {
      setConsultandoCnpj(true);
      setStatusCnpjInfo(null);
      setErroCnpjInfo(null);
      
      const res = await consultarCnpj(clean);

            setNovoCpfCnpj(res.cnpjFormatado);

      const nomeFinal = res.nomeFantasia || res.razaoSocial || '';
      if (nomeFinal) {
        setNovoNome(nomeFinal);
      }
      if (res.telefone) {
        setNovoTelefone(formatarTelefone(res.telefone));
      }
      if (res.cepFormatado || res.cep) {
        setNovoCep(res.cepFormatado || res.cep || '');
      }
      if (res.logradouro) {
        setNovoEndereco(res.logradouro);
      }
      if (res.numero) {
        setNovoNumero(res.numero);
      }
      if (res.complemento) {
        setNovoComplemento(res.complemento);
      }
      if (res.cidade) {
        setNovoCidade(res.cidade);
      }
      if (res.estado) {
        setNovoEstado(res.estado);
      }

      // Auto-match bairro if possible
      if (res.bairro) { await autoCadastrarBairro(res.bairro); }
      setStatusCnpjInfo(`${res.razaoSocial || res.nomeFantasia} • ${res.cidade}/${res.estado} (${res.situacao || 'ATIVA'})`);
      setErroCnpjInfo(null);

      // Foco automático no número ou complemento
      setTimeout(() => {
        const el = document.getElementById('input-novo-numero');
        if (el) el.focus();
      }, 150);
    } catch (err: any) {
      const msg = err.message || 'CNPJ não localizado na Receita Federal.';
      setErroCnpjInfo(msg);
      setStatusCnpjInfo(null);
          } finally {
      setConsultandoCnpj(false);
    }
  };

  const handleConsultarCepClientePdv = async (cepParam?: string) => {
    const raw = cepParam || novoCep;
    const clean = apenasDigitos(raw);
    if (clean.length !== 8) return;
    try {
      setConsultandoCep(true);
      setErroCepInfo(null);
      setStatusCepInfo(null);

      const res = await consultarCep(clean);
      setNovoCep(res.cepFormatado);
      if (res.lat && res.lng) {
        setNovoLat(res.lat);
        setNovoLng(res.lng);
      }

      if (res.localizado === false) {
        setErroCepInfo(res.mensagem || `CEP ${res.cepFormatado} não localizado automaticamente nos Correios. Preencha os campos abaixo manualmente.`);
        return;
      }

      if (res.logradouro) setNovoEndereco(res.logradouro);
      if (res.cidade) setNovoCidade(res.cidade);
      if (res.estado) setNovoEstado(res.estado);

      if (res.bairro) { await autoCadastrarBairro(res.bairro); }

      if (res.aviso) {
        setStatusCepInfo(res.aviso);
      }

      // Foco no número
      setTimeout(() => {
        const el = document.getElementById('input-novo-numero');
        if (el) el.focus();
      }, 100);
    } catch (err: any) {
      console.warn('[PDV CEP]', err);
      setErroCepInfo(err.message || 'Não foi possível consultar este CEP. Preencha o endereço manualmente.');
    } finally {
      setConsultandoCep(false);
    }
  };

  const handleRuaChange = (rua: string) => {
    setNovoEndereco(rua.toUpperCase());
    if (rua.length < 3) {
      setSugestoesEndereco([]);
      setMostrarSugestoes(false);
      return;
    }
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      setBuscandoSugestoes(true);
      const res = await buscarEnderecosPorRua(novoEstado, novoCidade, rua);
      setSugestoesEndereco(res);
      setMostrarSugestoes(res.length > 0);
      setBuscandoSugestoes(false);
    }, 500);
  };

  const selecionarSugestaoEndereco = (end: ViaCepEndereco) => {
    setNovoEndereco(end.logradouro.toUpperCase());
    setNovoCep(formatarCep(end.cep));
    
    // Tenta encontrar o bairro pelo nome para selecionar no dropdown
    const bairroMatch = bairros.find(b => end.bairro && (b.nome.toLowerCase().includes(end.bairro.toLowerCase()) || end.bairro.toLowerCase().includes(b.nome.toLowerCase())));
    if (bairroMatch) setNovoBairroId(bairroMatch.id);
    
    setMostrarSugestoes(false);
  };

  const handleAbrirNovoCliente = () => {
    setClienteEmEdicaoId(null);
    setNovoNome('');
    setNovoTelefone(buscaCliente ? formatarTelefone(buscaCliente) : '');
    setNovoCpfCnpj('');
    setNovoCep('');
    setNovoEndereco('');
    setNovoNumero('');
    setNovoComplemento('');
    setNovoBairroId(bairros[0]?.id || 'b1');
    setNovoCidade('São Paulo');
    setNovoEstado('SP');
    setNovoLat(-23.55052);
    setNovoLng(-46.633308);
    setNovaReferencia('');
    setStatusCnpjInfo(null);
    setErroCnpjInfo(null);
    setErroCepInfo(null);
    setStatusCepInfo(null);
    setModalNovoCliente(true);
  };

  const handleAbrirEdicaoCliente = (cliente: Cliente) => {
    setClienteEmEdicaoId(cliente.id);
    setNovoNome(cliente.nome || '');
    setNovoTelefone(cliente.telefone || '');
    setNovoCpfCnpj(cliente.cpfCnpj || '');
    setNovoCep(cliente.cep || '');
    setNovoEndereco(cliente.endereco || '');
    setNovoNumero(cliente.numero || '');
    setNovoComplemento(cliente.complemento || '');
    setNovoBairroId(cliente.bairroId || bairros[0]?.id || 'b1');
    setNovoCidade(cliente.cidade || 'São Paulo');
    setNovoEstado(cliente.estado || 'SP');
    setNovoLat(cliente.lat || -23.55052);
    setNovoLng(cliente.lng || -46.633308);
    setNovaReferencia(cliente.referencia || '');
    setStatusCnpjInfo(null);
    setErroCnpjInfo(null);
    setErroCepInfo(null);
    setStatusCepInfo(null);
    setModalNovoCliente(true);
  };

  const handleSalvarClienteForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novoTelefone || !novoEndereco || !novoNumero) {
      alert('Preencha os campos obrigatórios do cliente (Nome, Telefone, Rua e Número)!');
      return;
    }
    const bairro = bairros.find((b) => b.id === novoBairroId) || bairros[0];
    setSalvandoCliente(true);

    try {
      if (clienteEmEdicaoId) {
        // Modo Edição
        const clienteExistente = clientes.find((c) => c.id === clienteEmEdicaoId) || clienteSelecionado;
        const clienteAtualizado: Cliente = {
          id: clienteEmEdicaoId,
          empresaId: clienteExistente?.empresaId,
          nome: novoNome.trim(),
          telefone: novoTelefone.trim(),
          cpfCnpj: novoCpfCnpj ? novoCpfCnpj.trim() : undefined,
          cep: novoCep ? novoCep.trim() : undefined,
          cidade: novoCidade || 'São Paulo',
          estado: novoEstado || 'SP',
          endereco: novoEndereco.trim(),
          numero: novoNumero.trim(),
          complemento: novoComplemento ? novoComplemento.trim() : undefined,
          bairroId: bairro?.id || 'bairro_padrao',
          bairroNome: bairro?.nome || 'Bairro Genérico',
          referencia: novaReferencia ? novaReferencia.trim() : undefined,
          lat: novoLat,
          lng: novoLng,
          saldoDevedor: clienteExistente?.saldoDevedor || 0,
          totalPedidos: clienteExistente?.totalPedidos || 0,
          vasilhamesPendentes: clienteExistente?.vasilhamesPendentes || { P13: 0, P20L: 0 },
        };

        if (onSalvarCliente) {
          await onSalvarCliente(clienteAtualizado);
        } else {
          onNovoCliente(clienteAtualizado);
        }

        setClienteSelecionado(clienteAtualizado);
        setBuscaCliente(clienteAtualizado.telefone);

        // Se o bairro mudou e tem taxa, atualiza taxa do PDV
        if (bairro && typeof bairro.taxa === 'number' && bairro.taxa >= 0) {
          setTaxaEntrega(String(bairro.taxa));
        }

        setModalNovoCliente(false);
      } else {
        // Modo Criação
        const novo: Cliente = {
          id: `c_${Date.now()}`,
          nome: novoNome.trim(),
          telefone: novoTelefone.trim(),
          cpfCnpj: novoCpfCnpj ? novoCpfCnpj.trim() : undefined,
          cep: novoCep ? novoCep.trim() : undefined,
          cidade: novoCidade || 'São Paulo',
          estado: novoEstado || 'SP',
          endereco: novoEndereco.trim(),
          numero: novoNumero.trim(),
          complemento: novoComplemento ? novoComplemento.trim() : undefined,
          bairroId: bairro?.id || 'bairro_padrao',
          bairroNome: bairro?.nome || 'Bairro Genérico',
          referencia: novaReferencia ? novaReferencia.trim() : undefined,
          lat: novoLat,
          lng: novoLng,
          saldoDevedor: 0,
          totalPedidos: 0,
          vasilhamesPendentes: { P13: 0, P20L: 0 },
        };

        if (onSalvarCliente) {
          await onSalvarCliente(novo);
        } else {
          onNovoCliente(novo);
        }

        setClienteSelecionado(novo);
        setBuscaCliente(novo.telefone);
        if (bairro && typeof bairro.taxa === 'number' && bairro.taxa >= 0) {
          setTaxaEntrega(String(bairro.taxa));
        }
        setModalNovoCliente(false);
      }

      // Limpar formulário
      setClienteEmEdicaoId(null);
      setNovoNome('');
      setNovoTelefone('');
      setNovoCpfCnpj('');
      setNovoCep('');
      setNovoEndereco('');
      setNovoNumero('');
      setNovoComplemento('');
      setNovaReferencia('');
      setStatusCnpjInfo(null);
      setErroCnpjInfo(null);
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      alert(err.message || 'Ocorreu um erro ao salvar o cliente.');
    } finally {
      setSalvandoCliente(false);
    }
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

    // Se estiver em modo múltiplo pagamento, valida se tem pagamentos preenchidos
    let pagamentosPrevistosPayload: PagamentoItem[] | undefined = undefined;
    let formaPrincipal: FormaPagamento = formaPagamento;
    let trocoParaPayload: number | undefined = undefined;

    if (modoMultiploPagamento) {
      const pagamentosValidos = pagamentosMultiplos.filter(
        (p) => Number(p.valor) > 0
      );
      if (pagamentosValidos.length === 0) {
        alert('Informe ao menos uma forma de pagamento com valor maior que zero!');
        return;
      }
      pagamentosPrevistosPayload = pagamentosValidos.map((p) => ({
        forma: p.forma,
        valor: Number(p.valor),
        trocoPara: p.forma === 'DINHEIRO' && p.trocoPara ? Number(p.trocoPara) : undefined,
        observacao: p.observacao,
      }));
      formaPrincipal = pagamentosPrevistosPayload[0]?.forma || 'DINHEIRO';
      trocoParaPayload = pagamentosPrevistosPayload.find((p) => p.forma === 'DINHEIRO')?.trocoPara;
    } else {
      formaPrincipal = formaPagamento;
      trocoParaPayload = formaPagamento === 'DINHEIRO' && trocoPara ? Number(trocoPara) : undefined;
      pagamentosPrevistosPayload = [
        {
          forma: formaPagamento,
          valor: total,
          trocoPara: trocoParaPayload,
        },
      ];
    }

    // Agendamento de entrega
    let dataHoraEntregaAgendadaPayload: string | undefined = undefined;
    if (tipoEntrega === 'AGENDADA') {
      if (!dataEntregaAgendada || !horaEntregaAgendada) {
        alert('Selecione a data e a hora da entrega agendada!');
        return;
      }
      dataHoraEntregaAgendadaPayload = `${dataEntregaAgendada}T${horaEntregaAgendada}:00`;
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
        taxaEntrega: valorTaxaEntrega,
        formaPagamentoPrevista: formaPrincipal,
        pagamentosPrevistos: pagamentosPrevistosPayload,
        trocoPara: trocoParaPayload,
        tipoEntrega,
        dataHoraEntregaAgendada: dataHoraEntregaAgendadaPayload,
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Erro ao registrar pedido na base');
      }
      const novoPedido = await res.json();

      setSucessoFeedback(`Pedido ${novoPedido.codigo} criado com sucesso! Status: PENDENTE`);
      setUltimoPedidoCriado(novoPedido);
      onPedidoCriado(novoPedido, imprimirDireto);

      // Limpar formulário de pedido
      setCarrinho([]);
      setTrocoPara('');
      setDesconto('0');
      setObservacoes('');
      setModoMultiploPagamento(false);
      setPagamentosMultiplos([{ id: 'pg_1', forma: 'DINHEIRO', valor: 0 }]);
      setTipoEntrega('IMEDIATA');
      setTimeout(() => {
        setSucessoFeedback(null);
        setUltimoPedidoCriado(null);
      }, 10000);
    } catch (err: any) {
      console.error(err);
      alert('Falha ao registrar pedido: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const tabsCategorias: TabItem<CategoriaProduto | 'TODOS' | 'MAIS_UTILIZADOS'>[] = [
    { id: 'TODOS', label: 'Todos', badge: produtos.length },
    { id: 'MAIS_UTILIZADOS', label: 'Mais Utilizados', icon: Star, badge: produtosMaisUtilizados.length },
    { id: 'GAS', label: 'Gás', icon: Flame },
    { id: 'AGUA', label: 'Água', icon: Droplet },
    { id: 'BEBIDAS', label: 'Bebidas', icon: Beer },
    { id: 'CONVENIENCIA', label: 'Conveniência', icon: Package },
  ];

  return (
    <div className="space-y-4">
      {/* Ações e Atalhos no TopBar */}
      <TopBarActions>
        <button
          type="button"
          onClick={() => setExibirKanban(!exibirKanban)}
          className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer ${
            exibirKanban
              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
          }`}
          title="Exibir ou ocultar visão Kanban em tempo real na mesma tela"
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{exibirKanban ? 'Kanban Integrado: ON' : 'Exibir Kanban'}</span>
        </button>
        <button
          type="button"
          onClick={() => setModalImportarErp(true)}
          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
          title="Importar Catálogo de Produtos ERP"
        >
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Importar ERP</span>
        </button>
        <button
          id="btn-open-new-client-modal"
          onClick={handleAbrirNovoCliente}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Novo Cliente</span>
        </button>
      </TopBarActions>

      {/* Alerta de Sucesso / Feedback de Pedido */}
      {sucessoFeedback && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs font-bold animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{sucessoFeedback}</span>
          </div>
          {ultimoPedidoCriado && ultimoPedidoCriado.cliente?.telefone && (
            <button
              onClick={() => abrirWhatsApp(ultimoPedidoCriado.cliente.telefone, gerarMensagemWhatsApp(ultimoPedidoCriado, 'CONFIRMACAO'))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95"
              title="Disparar confirmação e resumo completo no WhatsApp do cliente"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enviar Confirmação WhatsApp</span>
            </button>
          )}
        </div>
      )}

            <div className={`grid grid-cols-1 ${exibirKanban ? 'lg:grid-cols-12 gap-3.5' : 'lg:grid-cols-12 gap-4'}`}>
        
        {/* COLUNA 1: ATENDIMENTO / IDENTIFICAÇÃO DO CLIENTE & RESUMO DO PEDIDO */}
        <div className={`${exibirKanban ? 'lg:col-span-4 xl:col-span-4' : 'lg:col-span-5'} space-y-3.5`}>
          {/* 1. SEÇÃO DO CLIENTE */}
          <div className="bg-[#eaecf0] p-3.5 rounded-2xl border border-slate-300/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-lg bg-amber-100 text-amber-800">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">1. Identificação do Cliente</h3>
              </div>
              <button
                id="btn-open-new-client-modal"
                onClick={handleAbrirNovoCliente}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-100/80 hover:bg-blue-200 transition-colors border border-blue-300 cursor-pointer shadow-2xs"
              >
                <UserPlus className="w-3 h-3" />
                Novo
              </button>
            </div>

            {/* Phone search input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
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
                      handleAbrirNovoCliente();
                    }
                  }
                }}
                placeholder="Telefone ou nome do cliente..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>

            {/* Quick autocomplete dropdown results */}
            {buscaCliente && !clienteSelecionado && clientesFiltrados.length > 0 && (
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-lg divide-y divide-slate-200 bg-[#eaecf0] max-h-40 overflow-y-auto">
                {clientesFiltrados.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setClienteSelecionado(c);
                      setBuscaCliente(c.telefone);
                      const b = bairros.find((b) => b.id === c.bairroId || b.nome.toLowerCase() === c.bairroNome?.toLowerCase());
                      if (b && typeof b.taxa === 'number' && b.taxa >= 0) {
                        setTaxaEntrega(String(b.taxa));
                      }
                    }}
                    className="p-2 hover:bg-slate-200/80 cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{c.nome}</div>
                      <div className="text-[10px] text-slate-600">
                        {c.telefone} • {c.bairroNome}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-black text-[9px]">
                        {c.totalPedidos} ped.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Client Card */}
            {clienteSelecionado ? (
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 shadow-xs space-y-1.5 text-xs">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs truncate">{clienteSelecionado.nome}</span>
                      <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold text-[9px] shrink-0">
                        Identificado
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-blue-600" />
                      <span>{clienteSelecionado.telefone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id="btn-edit-client-pdv"
                      type="button"
                      onClick={() => handleAbrirEdicaoCliente(clienteSelecionado)}
                      className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors border border-blue-300 shadow-2xs cursor-pointer"
                      title="Editar dados cadastrais deste cliente"
                    >
                      <Pencil className="w-2.5 h-2.5 text-blue-600" />
                      <span>Editar</span>
                    </button>
                    <button
                      id="btn-change-client-pdv"
                      type="button"
                      onClick={() => {
                        setClienteSelecionado(null);
                        setBuscaCliente('');
                      }}
                      className="text-[10px] text-slate-500 hover:text-rose-600 font-semibold px-1 py-0.5 transition-colors cursor-pointer"
                      title="Desmarcar cliente"
                    >
                      Trocar
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-700 pt-1 border-t border-blue-200/60 flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-blue-600 shrink-0 mt-0.5" />
                  <div className="leading-tight">
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

                {(clienteSelecionado.vasilhamesPendentes.P13 > 0 ||
                  clienteSelecionado.vasilhamesPendentes.P20L > 0) && (
                  <div className="text-rose-600 font-bold text-[10px] pt-0.5 border-t border-rose-200">
                    [!] Cascos Pendentes: {clienteSelecionado.vasilhamesPendentes.P13} P13,{' '}
                    {clienteSelecionado.vasilhamesPendentes.P20L} Água
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2 bg-amber-50/80 border border-amber-200/90 rounded-xl text-[11px] text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>Busque o cliente pelo telefone para iniciar o pedido.</span>
              </div>
            )}
          </div>

          {/* 3. RESUMO DO PEDIDO / PAGAMENTO */}
          <div className="bg-[#eaecf0] p-3.5 rounded-2xl border border-slate-300/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-300/60">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">3. Resumo do Pedido</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.2 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {carrinho.reduce((acc, it) => acc + it.quantidade, 0)} itens
                </span>
                {carrinho.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Deseja limpar todos os itens do carrinho?')) {
                        setCarrinho([]);
                      }
                    }}
                    className="text-[10px] text-slate-500 hover:text-rose-600 font-semibold transition-colors px-1 cursor-pointer"
                    title="Limpar carrinho"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            {carrinho.length === 0 ? (
              <div className="py-5 text-center text-slate-400 space-y-1 border border-dashed border-slate-300 rounded-xl bg-slate-100/60">
                <Package className="w-5 h-5 mx-auto stroke-1" />
                <p className="text-xs font-medium text-slate-600">Carrinho vazio.</p>
                <p className="text-[10px] text-slate-500">Selecione produtos na coluna ao lado.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {carrinho.map((item, idx) => {
                  const precoUnit =
                    item.tipoVenda === 'COMPLETO' && item.produto.permiteVendaCasco
                      ? item.produto.precoCompleto
                      : item.produto.precoRecarga;
                  const itemSubtotal = precoUnit * item.quantidade;

                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-100 border border-slate-300/80 flex items-center justify-between gap-1 text-xs shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate text-[11px]">{item.produto.nome}</div>
                        <div className="text-[10px] text-slate-500">
                          <span
                            className={`font-bold ${
                              item.tipoVenda === 'COMPLETO' ? 'text-amber-700' : 'text-blue-700'
                            }`}
                          >
                            {item.tipoVenda === 'COMPLETO' ? 'COMPLETO' : 'RECARGA'}
                          </span>{' '}
                          • {formatarMoeda(precoUnit)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex items-center border border-slate-300 rounded-lg bg-[#eaecf0] overflow-hidden">
                          <button
                            onClick={() => alterarQuantidade(idx, -1)}
                            className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="px-1.5 font-bold text-slate-900 text-xs">{item.quantidade}</span>
                          <button
                            onClick={() => alterarQuantidade(idx, 1)}
                            className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <span className="font-bold font-mono text-slate-900 w-12 text-right text-[11px]">
                          {formatarMoeda(itemSubtotal)}
                        </span>
                        <button
                          onClick={() => removerDoCarrinho(idx)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                          title="Remover item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Agendamento de Entrega */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-300/60 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Entrega:</span>
                </label>
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/70">
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('IMEDIATA')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      tipoEntrega === 'IMEDIATA'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    ⚡ Imediata
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoEntrega('AGENDADA')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      tipoEntrega === 'AGENDADA'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    ⏰ Agendada
                  </button>
                </div>
              </div>

              {tipoEntrega === 'IMEDIATA' ? (
                <div className="p-2 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between text-[11px] text-blue-900 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>Despacho imediato</span>
                  </div>
                  <span className="font-bold text-[10px] bg-blue-100 border border-blue-200 px-2 py-0.2 rounded text-blue-800 font-mono">
                    ~{previsao.min}-{previsao.max} min
                  </span>
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-1.5 text-xs shadow-2xs">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Data:</label>
                      <input
                        id="input-data-entrega-agendada"
                        type="date"
                        value={dataEntregaAgendada}
                        onChange={(e) => setDataEntregaAgendada(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-amber-300 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 focus:bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-amber-900 mb-0.5">Horário:</label>
                      <input
                        id="input-hora-entrega-agendada"
                        type="time"
                        value={horaEntregaAgendada}
                        onChange={(e) => setHoraEntregaAgendada(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-amber-300 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Formas de Pagamento */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-300/60 text-xs">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pagamento:</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const novoModo = !modoMultiploPagamento;
                    setModoMultiploPagamento(novoModo);
                    if (novoModo && pagamentosMultiplos.length === 0) {
                      setPagamentosMultiplos([
                        { id: 'pg_1', forma: formaPagamento, valor: total, trocoPara: trocoPara ? Number(trocoPara) : undefined },
                      ]);
                    }
                  }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                    modoMultiploPagamento
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Split className="w-2.5 h-2.5" />
                  <span>{modoMultiploPagamento ? '✓ Dividido' : '+ Dividir'}</span>
                </button>
              </div>

              {!modoMultiploPagamento ? (
                <div className="space-y-1.5">
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
                        className={`px-1 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                          formaPagamento === tipo
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {formaPagamento === 'DINHEIRO' && (
                    <div className="p-2 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between gap-1 shadow-2xs">
                      <span className="text-emerald-900 font-bold text-[11px]">Troco p/:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-emerald-800">R$</span>
                        <input
                          id="input-troco-para"
                          type="number"
                          value={trocoPara}
                          onChange={(e) => setTrocoPara(e.target.value)}
                          placeholder={total > 0 ? String(Math.ceil(total / 10) * 10) : '0'}
                          className="w-16 px-1.5 py-0.5 rounded-lg border border-emerald-300 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 focus:bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 p-2 rounded-xl bg-purple-50/70 border border-purple-200 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-purple-900">
                    <span>Valores:</span>
                    <span className="font-mono">{formatarMoeda(total)}</span>
                  </div>
                  {pagamentosMultiplos.map((item, idx) => (
                    <div key={item.id || idx} className="p-1.5 rounded-lg bg-[#eaecf0] border border-purple-200 flex items-center gap-1">
                      <select
                        value={item.forma}
                        onChange={(e) => handleAlterarPagamentoItem(idx, 'forma', e.target.value as FormaPagamento)}
                        className="px-1 py-0.5 rounded border border-slate-300 text-[10px] font-bold bg-slate-50 text-slate-900"
                      >
                        <option value="DINHEIRO">Dinheiro</option>
                        <option value="PIX">Pix</option>
                        <option value="CARTAO_DEBITO">Débito</option>
                        <option value="CARTAO_CREDITO">Crédito</option>
                        <option value="A_PRAZO_FIADO">Fiado</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={item.valor || ''}
                        onChange={(e) => handleAlterarPagamentoItem(idx, 'valor', parseFloat(e.target.value) || 0)}
                        placeholder="0,00"
                        className="flex-1 px-1 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-900 text-[10px] font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => handlePreencherRestante(idx)}
                        className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 text-[9px] font-bold border border-purple-300"
                      >
                        Resto
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddFormaPagamento('PIX')}
                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900"
                  >
                    + Adicionar forma
                  </button>
                </div>
              )}
            </div>

            {/* Taxa de Entrega, Desconto e Observações */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-300/60">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-700">Taxa Entrega:</span>
                <div className="flex items-center gap-1">
                  <input
                    id="input-taxa-entrega"
                    type="number"
                    step="0.5"
                    min="0"
                    value={taxaEntrega}
                    onChange={(e) => setTaxaEntrega(e.target.value)}
                    className="w-16 px-1.5 py-0.5 rounded border border-slate-300 text-[11px] font-mono font-bold bg-slate-50 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setTaxaEntrega('0')}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-slate-100 text-slate-700 border-slate-300"
                  >
                    Grátis
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 text-[10px]">Desconto (R$):</label>
                  <input
                    id="input-desconto-pedido"
                    type="number"
                    min="0"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-mono font-bold bg-slate-50 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5 text-[10px]">Obs:</label>
                  <input
                    id="input-observacoes-pedido"
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value.toUpperCase())}
                    placeholder="Ex: interfone..."
                    className="w-full px-1.5 py-0.5 rounded border border-slate-300 text-[10px] bg-slate-50 text-slate-900"
                  />
                </div>
              </div>

              {/* Totais Breakdown */}
              <div className="p-2.5 rounded-xl bg-slate-100/90 border border-slate-300/80 space-y-1 font-mono text-xs shadow-2xs">
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800">{formatarMoeda(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Taxa:</span>
                  <span className={valorTaxaEntrega === 0 ? 'text-emerald-700 font-bold' : 'text-slate-900 font-bold'}>
                    {valorTaxaEntrega === 0 ? 'Grátis' : `+ ${formatarMoeda(valorTaxaEntrega)}`}
                  </span>
                </div>
                {valorDesconto > 0 && (
                  <div className="flex justify-between text-rose-600 text-[10px] font-bold">
                    <span>Desconto:</span>
                    <span>- {formatarMoeda(valorDesconto)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span className="text-base text-blue-700 font-black">{formatarMoeda(total)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 pt-1">
              <button
                id="btn-finalizar-pedido"
                disabled={salvando || !clienteSelecionado || carrinho.length === 0}
                onClick={() => handleFinalizarPedido(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs transition-all shadow-xs active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{salvando ? 'Gravando...' : 'Gravar Pedido (Pendente)'}</span>
              </button>

              <button
                id="btn-finalizar-e-imprimir"
                disabled={salvando || !clienteSelecionado || carrinho.length === 0}
                onClick={() => handleFinalizarPedido(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs transition-all shadow-xs active:scale-98 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Gravar e Imprimir Comanda</span>
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA 2: COLUNA DEDICADA DE PRODUTOS (CATÁLOGO VERTICAL) */}
        <div className={`${exibirKanban ? 'lg:col-span-3 xl:col-span-3' : 'lg:col-span-7'} space-y-3.5`}>
          <div className="bg-[#eaecf0] p-3.5 rounded-2xl border border-slate-300/80 shadow-xs space-y-3">
            {/* Catalog Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-300/60">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">2. Coluna de Produtos</h3>
              </div>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                {produtosFiltrados.length} disp.
              </span>
            </div>

            {/* Product Search Input Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-busca-produto"
                type="text"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                placeholder="Buscar produto ou código..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-medium"
              />
              {buscaProduto && (
                <button
                  type="button"
                  onClick={() => setBuscaProduto('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  title="Limpar pesquisa"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="overflow-x-auto pb-1">
              <SegmentedTabs
                tabs={tabsCategorias}
                activeTab={categoriaAtiva}
                onChange={(tab) => setCategoriaAtiva(tab)}
                size="sm"
              />
            </div>

            {/* Products Vertical List */}
            {produtosFiltrados.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1.5 border border-dashed border-slate-300 rounded-2xl bg-slate-100/60">
                <Package className="w-6 h-6 mx-auto stroke-1 text-slate-400" />
                <p className="text-xs font-semibold text-slate-600">Nenhum produto encontrado.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                {produtosFiltrados.map((prod) => {
                  const temCasco = prod.tipoVasilhame !== 'NENHUM';

                  return (
                    <div
                      key={prod.id}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 shadow-2xs ${
                        prod.maisUtilizado
                          ? 'border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:bg-amber-50/60'
                          : 'border-slate-300/80 bg-slate-100/90 hover:border-blue-400 hover:bg-slate-200/60'
                      }`}
                    >
                      <div>
                        {/* Header: Title, Favorite Star, Code */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-slate-900 text-xs leading-tight truncate">
                              {prod.nome}
                            </div>
                            <div className="flex items-center flex-wrap gap-1 mt-0.5 text-[9px]">
                              {prod.marca && (
                                <span className="px-1 py-0.2 rounded bg-slate-200 text-slate-700 font-bold border border-slate-300/60">
                                  {prod.marca}
                                </span>
                              )}
                              {prod.unidadeMedida && (
                                <span className="px-1 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                                  {prod.unidadeMedida}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorito(e, prod.id)}
                              className={`p-0.5 rounded transition-colors ${
                                prod.maisUtilizado
                                  ? 'text-amber-500 bg-amber-100/80'
                                  : 'text-slate-400 hover:text-amber-500'
                              }`}
                              title={prod.maisUtilizado ? 'Favorito' : 'Marcar favorito'}
                            >
                              <Star className={`w-3 h-3 ${prod.maisUtilizado ? 'fill-amber-400' : ''}`} />
                            </button>
                            <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-200 text-slate-700">
                              {prod.codigo}
                            </span>
                          </div>
                        </div>

                        {/* Stock details */}
                        <div className="text-[10px] text-slate-600 mt-1 flex items-center justify-between">
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
                      </div>

                      {/* Action buttons (Recarga vs Completo) */}
                      <div className="pt-1.5 border-t border-slate-300/60">
                        {temCasco && prod.permiteVendaCasco ? (
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              id={`btn-add-recarga-${prod.id}`}
                              onClick={() => adicionarAoCarrinho(prod, 'RECARGA')}
                              className="flex flex-col items-center justify-center p-1 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[11px] transition-all shadow-2xs cursor-pointer"
                            >
                              <span className="text-[8px] font-medium opacity-90">RECARGA</span>
                              <span className="font-mono font-black">{formatarMoeda(prod.precoRecarga)}</span>
                            </button>

                            <button
                              id={`btn-add-completo-${prod.id}`}
                              onClick={() => adicionarAoCarrinho(prod, 'COMPLETO')}
                              className="flex flex-col items-center justify-center p-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-[11px] transition-all shadow-2xs cursor-pointer"
                            >
                              <span className="text-[8px] font-medium opacity-90">+CASCO</span>
                              <span className="font-mono font-black">{formatarMoeda(prod.precoCompleto)}</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`btn-add-item-${prod.id}`}
                            onClick={() => adicionarAoCarrinho(prod, 'RECARGA')}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[11px] transition-all shadow-2xs cursor-pointer"
                          >
                            <span>+ Adicionar</span>
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

        {/* COLUNA 3: KANBAN EM TEMPO REAL & ESTIMATIVA DE TEMPO DE ENTREGA */}
        {exibirKanban && (
          <div className="lg:col-span-5 xl:col-span-5 space-y-3.5">
            {/* WIDGET ESTIMATIVA DE TEMPO DE ENTREGA */}
            <div className="p-3.5 rounded-2xl border border-amber-300 bg-amber-50/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-amber-200 text-amber-900 animate-pulse">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                      Previsão de Entrega (Tempo Real)
                    </h4>
                    <span className="text-[10px] text-amber-800 font-medium">
                      Estimativa automática calculada pela fila da base
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm sm:text-base font-black text-amber-950 font-mono">
                    ~{previsao.min} a {previsao.max} min
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                    previsao.status === 'LIVRE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : previsao.status === 'NORMAL'
                      ? 'bg-blue-100 text-blue-800'
                      : previsao.status === 'MODERADO'
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {previsao.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/80 text-[10px] text-amber-900">
                <div className="flex items-center gap-2">
                  <span><strong>{pedidosPendentes.length}</strong> pendentes na base</span>
                  <span>•</span>
                  <span><strong>{pedidosEmRota.length}</strong> em rota</span>
                  <span>•</span>
                  <span><strong>{entregadoresAtivos.length}</strong> entregadores</span>
                </div>

                <button
                  type="button"
                  onClick={handleAplicarPrevisaoObservacao}
                  className="px-2 py-0.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[10px] border border-amber-400 transition-colors cursor-pointer"
                  title="Inserir previsão calculada nas observações do pedido"
                >
                  + Inserir na Obs
                </button>
              </div>
            </div>

            {/* QUADROS KANBAN INTEGRADOS (Pendentes e Em Rota) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Quadro 1: Pendentes na Base */}
              <div className="bg-slate-100/90 p-3 rounded-2xl border border-slate-300/80 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-300/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <h4 className="font-extrabold text-slate-900 text-xs">1. Pendentes</h4>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px] font-black">
                    {pedidosPendentes.length}
                  </span>
                </div>

                {/* Barra de despacho rápido se houver pedidos selecionados */}
                {onDespacharPedidos && pedidosSelecionadosKanban.length > 0 && (
                  <div className="p-2 rounded-xl bg-blue-100/80 border border-blue-300 space-y-1.5 text-xs animate-fade-in">
                    <div className="text-[10px] font-bold text-blue-900 flex justify-between">
                      <span>{pedidosSelecionadosKanban.length} selecionado(s)</span>
                      <button
                        type="button"
                        onClick={() => setPedidosSelecionadosKanban([])}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={entregadorDestinoKanban}
                        onChange={(e) => setEntregadorDestinoKanban(e.target.value)}
                        className="flex-1 px-1.5 py-1 rounded border border-blue-300 text-[10px] font-bold bg-[#eaecf0] text-slate-800"
                      >
                        {entregadores.map((ent) => (
                          <option key={ent.id} value={ent.id}>
                            🛵 {ent.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={despachandoKanban || !entregadorDestinoKanban}
                        onClick={() => handleDespacharKanban(false)}
                        className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] disabled:opacity-50"
                      >
                        {despachandoKanban ? '...' : 'Despachar'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de pedidos pendentes */}
                <div className="space-y-1.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-0.5">
                  {pedidosPendentes.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <Clock className="w-5 h-5 mx-auto mb-1 opacity-40" />
                      Nenhum pedido pendente.
                    </div>
                  ) : (
                    pedidosPendentes.map((pedido) => {
                      const isSelected = pedidosSelecionadosKanban.includes(pedido.id);

                      return (
                        <div
                          key={pedido.id}
                          className={`p-2 rounded-xl bg-[#eaecf0] border transition-all shadow-2xs space-y-1 text-xs ${
                            isSelected
                              ? 'border-blue-500 ring-1 ring-blue-500/20'
                              : 'border-slate-300/80 hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-1">
                              {onDespacharPedidos && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelecionarPedidoKanban(pedido.id)}
                                  className="w-3 h-3 rounded text-blue-600 cursor-pointer"
                                />
                              )}
                              <span className="font-black text-slate-900 text-[11px]">{pedido.codigo}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {formatarDataHora(pedido.criadoEm).split(' ')[1] || ''}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-slate-900 text-[11px] truncate">{pedido.cliente?.nome}</div>
                            <div className="text-[10px] text-slate-600 truncate flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span>{pedido.cliente?.bairroNome}</span>
                            </div>
                          </div>

                          <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                            <span className="font-mono font-bold text-blue-700">{formatarMoeda(pedido.total)}</span>
                            <div className="flex items-center gap-1">
                              {pedido.cliente?.telefone && (
                                <button
                                  type="button"
                                  onClick={() => abrirWhatsApp(pedido.cliente.telefone, gerarMensagemWhatsApp(pedido, 'CONFIRMACAO'))}
                                  className="text-emerald-700 hover:text-emerald-900 font-bold"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </button>
                              )}
                              {onVisualizarComanda && (
                                <button
                                  type="button"
                                  onClick={() => onVisualizarComanda(pedido)}
                                  className="text-slate-600 hover:text-slate-900"
                                  title="Comanda"
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quadro 2: Em Rota (Na Rua) */}
              <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-blue-200">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <h4 className="font-extrabold text-slate-900 text-xs">2. Em Rota</h4>
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-blue-200 text-blue-900 text-[10px] font-black">
                    {pedidosEmRota.length}
                  </span>
                </div>

                {/* Lista de pedidos em rota */}
                <div className="space-y-1.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-0.5">
                  {pedidosEmRota.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <Truck className="w-5 h-5 mx-auto mb-1 opacity-40" />
                      Nenhum pedido em rota.
                    </div>
                  ) : (
                    pedidosEmRota.map((pedido) => (
                      <div
                        key={pedido.id}
                        className="p-2 rounded-xl bg-[#eaecf0] border border-blue-200 transition-all shadow-2xs space-y-1 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-black text-slate-900 text-[11px]">{pedido.codigo}</span>
                          <span className="px-1 py-0.2 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">
                            {pedido.entregadorNome?.split(' ')[0] || 'Entregador'}
                          </span>
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 text-[11px] truncate">{pedido.cliente?.nome}</div>
                          <div className="text-[10px] text-slate-600 truncate flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                            <span>{pedido.cliente?.bairroNome}</span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                          <span className="font-mono font-bold text-blue-700">{formatarMoeda(pedido.total)}</span>
                          <div className="flex items-center gap-1">
                            {pedido.cliente?.telefone && (
                              <button
                                type="button"
                                onClick={() => abrirWhatsApp(pedido.cliente.telefone, gerarMensagemWhatsApp(pedido, 'DESPACHADO'))}
                                className="text-emerald-700 hover:text-emerald-900 font-bold"
                                title="Avisar cliente no WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                              </button>
                            )}
                            {onVisualizarComanda && (
                              <button
                                type="button"
                                onClick={() => onVisualizarComanda(pedido)}
                                className="text-slate-600 hover:text-slate-900"
                                title="Comanda"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

{/* Modal: Cadastro Rápido / Edição de Cliente */}
      {modalNovoCliente && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-xs"
          onClick={() => setModalNovoCliente(false)}
        >
          <div
            className="bg-[#eaecf0] border border-slate-300 text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {clienteEmEdicaoId ? (
                  <Pencil className="w-4 h-4 text-blue-400" />
                ) : (
                  <UserPlus className="w-4 h-4 text-blue-400" />
                )}
                <h3 className="font-bold text-sm">
                  {clienteEmEdicaoId ? 'Editar Dados do Cliente' : 'Cadastro Rápido de Cliente'}
                </h3>
              </div>
              <button
                onClick={() => setModalNovoCliente(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarClienteForm} className="p-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col md:flex-row gap-5">
                
                {/* ESQUERDA: DADOS E ENDEREÇO (2/3) */}
                <div className="w-full md:w-[60%] space-y-4">
                  
                  {/* Bloco 1: Identificação */}
                  <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 shadow-xs">
                    <label className="font-bold text-blue-950 text-xs flex items-center gap-1.5 mb-2.5">
                      <Building2 className="w-4 h-4 text-blue-700" />
                      <span>Identificação do Cliente</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="block font-bold text-blue-900 mb-1">CPF / CNPJ</label>
                        <input
                          type="text"
                          value={novoCpfCnpj}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const formatted = formatarCpfCnpj(raw);
                            setNovoCpfCnpj(formatted);
                            const clean = apenasDigitos(raw);
                            if (erroCnpjInfo) setErroCnpjInfo(null);
                            if (clean.length === 14 && !consultandoCnpj) {
                              handleConsultarCnpjClientePdv(clean);
                            }
                          }}
                          placeholder="CPF ou CNPJ"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold text-xs shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                        {consultandoCnpj && (
                          <div className="absolute right-2 top-6 flex items-center gap-1 text-blue-700 font-bold bg-[#eaecf0] px-1 py-0.5 rounded">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block font-bold text-blue-900 mb-1">Telefone *</label>
                        <input
                          type="text"
                          required
                          value={novoTelefone}
                          onChange={(e) => setNovoTelefone(formatarTelefone(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold text-xs shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-blue-900 mb-1">Nome / Razão Social *</label>
                        <input
                          type="text"
                          required
                          value={novoNome}
                          onChange={(e) => setNovoNome(e.target.value.toUpperCase())}
                          placeholder="Nome do cliente ou empresa"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold text-xs shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Endereço */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block font-bold text-slate-900 mb-1 flex items-center justify-between">
                          <span>CEP</span>
                          <span className="text-[9px] text-blue-700 font-bold">Auto</span>
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={novoCep}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const formatted = formatarCep(raw);
                              setNovoCep(formatted);
                              if (erroCepInfo) setErroCepInfo(null);
                              if (statusCepInfo) setStatusCepInfo(null);
                              const clean = apenasDigitos(raw);
                              if (clean.length === 8 && !consultandoCep) {
                                handleConsultarCepClientePdv(clean);
                              }
                            }}
                            onBlur={() => {
                              if (novoCep && isCepValido(novoCep)) handleConsultarCepClientePdv();
                            }}
                            placeholder="01001-000"
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleConsultarCepClientePdv()}
                            disabled={consultandoCep}
                            className="px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 shrink-0 transition-colors cursor-pointer"
                          >
                            {consultandoCep ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Search className="w-4 h-4 text-slate-700" />}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-12 sm:col-span-8 relative">
                        <label className="block font-bold text-slate-900 mb-1">Rua / Avenida *</label>
                        <input
                          type="text"
                          required
                          value={novoEndereco}
                          onChange={(e) => handleRuaChange(e.target.value)}
                          onFocus={() => { if (sugestoesEndereco.length > 0) setMostrarSugestoes(true); }}
                          onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                        {buscandoSugestoes && (
                          <div className="absolute right-3 top-9">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          </div>
                        )}
                        {mostrarSugestoes && (
                          <ul className="absolute z-50 mt-1 w-full bg-[#eaecf0] border border-slate-300 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-200 text-xs">
                            {sugestoesEndereco.map((sug, i) => (
                              <li 
                                key={i}
                                onClick={() => selecionarSugestaoEndereco(sug)}
                                className="px-3 py-2 hover:bg-slate-200/80 cursor-pointer flex flex-col"
                              >
                                <span className="font-bold text-slate-800">{sug.logradouro}</span>
                                <span className="text-slate-500">{sug.bairro} - {sug.cep}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4 sm:col-span-3">
                        <label className="block font-bold text-slate-900 mb-1">Número *</label>
                        <input
                          type="text"
                          required
                          value={novoNumero}
                          onChange={(e) => setNovoNumero(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div className="col-span-8 sm:col-span-5">
                        <label className="block font-bold text-slate-900 mb-1">Bairro *</label>
                        <select
                          value={novoBairroId}
                          onChange={(e) => setNovoBairroId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        >
                          {[...bairros, ...bairrosExtras].map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                        </select>
                      </div>
                      <div className="col-span-8 sm:col-span-4">
                        <label className="block font-bold text-slate-900 mb-1">Cidade / UF</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={novoCidade}
                            onChange={(e) => setNovoCidade(e.target.value.toUpperCase())}
                            className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold shadow-xs min-w-0"
                          />
                          <input
                            type="text"
                            maxLength={2}
                            value={novoEstado}
                            onChange={(e) => setNovoEstado(e.target.value.toUpperCase())}
                            className="w-10 px-1 py-2 text-center rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold shadow-xs shrink-0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block font-bold text-slate-900 mb-1">Complemento</label>
                        <input
                          type="text"
                          value={novoComplemento}
                          onChange={(e) => setNovoComplemento(e.target.value.toUpperCase())}
                          placeholder="Apto, Bloco..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-7">
                        <label className="block font-bold text-slate-900 mb-1">Referência</label>
                        <input
                          type="text"
                          value={novaReferencia}
                          onChange={(e) => setNovaReferencia(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                </div>
                
                {/* DIREITA: MAPA E AVISOS (1/3) */}
                <div className="w-full md:w-[40%] flex flex-col gap-3">
                  
                  {/* Alertas */}
                  {novoCpfCnpj && isCnpj(novoCpfCnpj) && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-xs flex gap-2 items-start">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span><strong>CNPJ:</strong> Preenchimento da Receita.</span>
                    </div>
                  )}
                  {novoCpfCnpj && isCpf(novoCpfCnpj) && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 shadow-xs flex gap-2 items-start">
                      <Users className="w-3.5 h-3.5 text-sky-600 mt-0.5 shrink-0" />
                      <span><strong>CPF:</strong> Nome/Tel manuais. Preencha o CEP para o endereço.</span>
                    </div>
                  )}
                  {erroCnpjInfo && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 shadow-xs flex gap-2 items-start">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>CNPJ não localizado. Preencha manualmente.</span>
                    </div>
                  )}
                  {erroCepInfo && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 shadow-xs flex gap-2 items-start">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>CEP não localizado. Preencha manualmente.</span>
                    </div>
                  )}
                  {statusCepInfo && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 shadow-xs flex gap-2 items-start">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <span>{statusCepInfo}</span>
                    </div>
                  )}

                  {/* Mapa */}
                  <div className="flex-1 min-h-[220px] flex flex-col">
                    <label className="block font-bold text-slate-900 mb-1.5">Localização Exata</label>
                    <div className="flex-1 w-full relative">
                      <LocationPickerMap
                        lat={novoLat}
                        lng={novoLng}
                        enderecoCompleto={`${novoEndereco}, ${novoNumero}, ${bairros.find(b => b.id === novoBairroId)?.nome || ''}, ${novoCidade} - ${novoEstado}`}
                        onChangeLocation={(lat, lng) => {
                          setNovoLat(lat);
                          setNovoLng(lng);
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-300 mt-1">
                <button
                  type="button"
                  onClick={() => setModalNovoCliente(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 font-bold transition-colors cursor-pointer"
                  disabled={salvandoCliente}
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-new-client"
                  type="submit"
                  disabled={salvandoCliente}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {salvandoCliente ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : clienteEmEdicaoId ? (
                    <Pencil className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {salvandoCliente ? 'Salvando...' : clienteEmEdicaoId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
