export type CategoriaProduto = 'GAS' | 'AGUA' | 'BEBIDAS' | 'CONVENIENCIA';

export type TipoVasilhame = 'P13' | 'P45' | 'P20L' | 'NENHUM';

export type TipoVendaItem = 'RECARGA' | 'COMPLETO'; // Recarga = só o líquido/gás (devolve casco); Completo = compra o casco + líquido

export type StatusPedido = 'PENDENTE' | 'EM_ROTA' | 'ENTREGUE' | 'CONCLUIDO' | 'CANCELADO' | 'DEVOLVIDO_CORRECAO';

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'A_PRAZO_FIADO';

export type StatusEntregador = 'DISPONIVEL' | 'EM_ROTA' | 'FOLGA';

export type PerfilUsuario = 'SUPER_ADMIN' | 'ADMIN' | 'GERENTE' | 'ATENDENTE_PDV' | 'ENTREGADOR';

export type PlanoEmpresa = 'BASICO' | 'PRO' | 'ENTERPRISE';

export type StatusEmpresa = 'ATIVO' | 'BLOQUEADO' | 'PENDENTE';

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
  endereco: string;
  plano: PlanoEmpresa;
  status: StatusEmpresa;
  limiteUsuarios: number;
  limitePedidosMes: number;
  valorMensalidade: number;
  totalPedidosRealizados?: number;
  totalUsuariosAtivos?: number;
  observacoes?: string;
  criadoEm: string;
  ultimoAcesso?: string;
  configuracoes?: {
    logoUrl?: string;
    corTema?: string;
    cobrarTaxaEntregaPadrao?: number;
  };
}

export interface PermissoesUsuario {
  emitirPedidos: boolean;
  despacharPedidos: boolean;
  cancelarPedidos: boolean;
  editarPedidos: boolean;
  devolverPedidos: boolean;
  realizarAcertoCaixa: boolean;
  ajustarEstoque: boolean;
  verDashboardGerencial: boolean;
  acessarCadastros: boolean;
  gerenciarUsuarios: boolean;
  importarErp: boolean;
}

export interface Usuario {
  id: string;
  empresaId?: string | null; // null para SUPER_ADMIN (Acesso global a todas as empresas)
  nome: string;
  login: string;
  email?: string;
  senha?: string;
  telefone?: string;
  perfil: PerfilUsuario;
  cargo: string;
  ativo: boolean;
  pinAcesso?: string;
  entregadorIdVinculado?: string;
  permissoes: PermissoesUsuario;
  criadoEm: string;
  ultimoAcesso?: string;
}

export interface BairroTaxa {
  id: string;
  nome: string;
  taxaEntrega: number;
  tempoMedioMin: number;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairroId: string;
  bairroNome: string;
  referencia?: string;
  lat: number;
  lng: number;
  saldoDevedor: number;
  totalPedidos: number;
  vasilhamesPendentes: {
    P13: number;
    P20L: number;
  };
}

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  marca?: string;
  unidadeMedida?: string; // UN, L, KG, PACK, CX, GL, etc.
  categoria: CategoriaProduto;
  tipoVasilhame: TipoVasilhame;
  precoRecarga: number;
  precoCompleto: number; // Preço com o casco
  estoqueCheio: number;
  estoqueVazio: number;
  estoqueMinimo: number;
  imagemUrl?: string;
  permiteVendaCasco: boolean;
  maisUtilizado?: boolean;
  vendasCount?: number;
}

export interface ItemPedido {
  id: string;
  produtoId: string;
  nomeProduto: string;
  categoria: CategoriaProduto;
  tipoVasilhame: TipoVasilhame;
  tipoVenda: TipoVendaItem;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  vasilhamesRecolhidosEsperados: number;
  vasilhamesRecolhidosReais?: number;
  vasilhamesPendentes?: number;
}

export interface Pedido {
  id: string;
  codigo: string; // Ex: #1042
  clienteId: string;
  cliente: Cliente;
  entregadorId?: string;
  entregadorNome?: string;
  status: StatusPedido;
  itens: ItemPedido[];
  subtotal: number;
  taxaEntrega: number;
  desconto: number;
  total: number;
  formaPagamentoPrevista: FormaPagamento;
  trocoPara?: number;
  formaPagamentoRealizada?: FormaPagamento;
  valorRecebido?: number;
  observacoes?: string;
  
  // Auditoria de Controle de Usuário
  emitidoPorId?: string;
  emitidoPorNome?: string;
  emitidoPorPerfil?: PerfilUsuario;
  despachadoPor?: string;
  entreguePor?: string;
  
  // Devolução para Correção
  devolvidoParaCorrecao?: boolean;
  motivoDevolucao?: string;
  devolvidoEm?: string;
  devolvidoPorId?: string;
  devolvidoPorNome?: string;

  criadoEm: string;
  despachadoEm?: string;
  entregueEm?: string;
  concluidoEm?: string;
  origemOffline?: boolean;
  sincronizado: boolean;
  versao: number;
}

export interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  veiculo: string; // 'Moto 01 (Honda Fan)', 'Carro 01 (Fiorino)'
  placa: string;
  status: StatusEntregador;
  pedidosAtivosCount: number;
  bateriaNivel: number;
  ultimaSincronizacao: string;
  totalEntregasHoje: number;
}

export interface FechamentoCaixaEntregador {
  id: string;
  entregadorId: string;
  entregadorNome: string;
  data: string;
  pedidosIds: string[];
  totalDinheiroEsperado: number;
  totalDinheiroInformado: number;
  totalPix: number;
  totalCartao: number;
  diferenca: number;
  cascosP13Recolhidos: number;
  cascosP20LRecolhidos: number;
  cascosP13Pendentes: number;
  cascosP20LPendentes: number;
  status: 'ABERTO' | 'CONCLUIDO';
  observacoes?: string;
}

export interface SyncQueueItem {
  id: string;
  idempotencyKey: string;
  tipoAcao: 'BAIXA_ENTREGA' | 'ATUALIZAR_PAGAMENTO' | 'REGISTRO_VASILHAME';
  pedidoId: string;
  entregadorId: string;
  timestampOffline: string;
  payload: {
    formaPagamentoRealizada: FormaPagamento;
    valorRecebido: number;
    trocoDevolvido: number;
    vasilhamesRecolhidos: {
      P13: number;
      P20L: number;
    };
    vasilhamesPendentes: {
      P13: number;
      P20L: number;
    };
    observacaoEntrega?: string;
    latConfirmacao?: number;
    lngConfirmacao?: number;
  };
  tentativas: number;
  erro?: string;
}

export type TipoNotificacaoPush = 'NOVO_PEDIDO' | 'ATUALIZACAO_ROTA' | 'CANCELAMENTO' | 'TESTE' | 'ALERTA_ESTOQUE';
export type PrioridadeNotificacao = 'NORMAL' | 'ALTA' | 'URGENTE';
export type CanalNotificacao = 'SUPABASE_REALTIME' | 'WEB_PUSH' | 'FIREBASE_FCM';

export interface NotificacaoPush {
  id: string;
  entregadorId: string;
  titulo: string;
  corpo: string;
  tipo: TipoNotificacaoPush;
  pedidoId?: string;
  pedidoCodigo?: string;
  valorTotal?: number;
  bairroNome?: string;
  endereco?: string;
  itensResumo?: string;
  prioridade: PrioridadeNotificacao;
  canal: CanalNotificacao;
  timestamp: string;
  lida: boolean;
  acoes?: Array<{
    id: string;
    titulo: string;
    url?: string;
  }>;
}

export interface PushSubscriptionData {
  id: string;
  entregadorId: string;
  endpoint: string;
  p256dh?: string;
  authKey?: string;
  userAgent?: string;
  plataforma: 'WEB' | 'ANDROID' | 'IOS';
  ativo: boolean;
  criadoEm: string;
}
