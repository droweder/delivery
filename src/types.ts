export type CategoriaProduto = 'GAS' | 'AGUA' | 'BEBIDAS' | 'CONVENIENCIA';

export type TipoVasilhame = 'P13' | 'P45' | 'P20L' | 'NENHUM';

export type TipoVendaItem = 'RECARGA' | 'COMPLETO'; // Recarga = só o líquido/gás (devolve casco); Completo = compra o casco + líquido

export type StatusPedido = 'PENDENTE' | 'EM_ROTA' | 'ENTREGUE' | 'CONCLUIDO' | 'CANCELADO' | 'DEVOLVIDO_CORRECAO';

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'A_PRAZO_FIADO';

export type TipoEntrega = 'IMEDIATA' | 'AGENDADA';

export interface PagamentoItem {
  id?: string;
  forma: FormaPagamento;
  valor: number;
  trocoPara?: number;
  observacao?: string;
}

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
  cep?: string;
  cidade: string;
  estado: string;
  endereco: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
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
  empresaId?: string;
  nome: string;
  taxaEntrega: number;
  tempoMedioMin: number;
  ativo: boolean;
}

export interface Cliente {
  id: string;
  empresaId?: string;
  nome: string;
  telefone: string;
  cpfCnpj?: string;
  email?: string;
  cep?: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairroId: string;
  bairroNome: string;
  cidade?: string;
  estado?: string;
  referencia?: string;
  lat: number;
  lng: number;
  saldoDevedor: number;
  totalPedidos: number;
  saldoCashback?: number;
  pontosFidelidade?: number;
  vasilhamesPendentes: {
    P13: number;
    P20L: number;
  };
}

export interface Produto {
  id: string;
  empresaId?: string;
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
  empresaId?: string;
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

export type EstadoCasco = 'PERFEITO' | 'AVARIADO' | 'VENCIDO' | 'OUTRA_MARCA';

export interface CascoItemRecolhimento {
  id: string;
  itemId?: string;
  produtoId: string;
  nomeProduto: string;
  tipoVasilhame: TipoVasilhame | string;
  nomeCasco: string; // Ex: 'Botijão P13 (GLP 13kg)', 'Galão 20L Água Mineral', 'Cilindro P45'
  quantidadeEsperada: number;
  quantidadeRecolhida: number;
  quantidadePendente: number;
  estadoCasco: EstadoCasco;
  marcaCasco?: string; // Ex: Ultragaz, Liquigás, Nacional, Supergasbras, Consigaz, Indaiá, etc.
  motivoPendente?: string; // Ex: 'Vale-Casco gerado', 'Cliente devolverá na base', 'Pago valor avulso'
  valorCascoCobrado?: number; // Valor financeiro se o cliente comprou o casco no ato
}

export interface Pedido {
  id: string;
  empresaId?: string;
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
  pagamentosPrevistos?: PagamentoItem[];
  trocoPara?: number;
  formaPagamentoRealizada?: FormaPagamento;
  pagamentosRealizados?: PagamentoItem[];
  valorRecebido?: number;
  observacoes?: string;
  
  // Agendamento / Data e Hora de Entrega
  tipoEntrega?: TipoEntrega;
  dataHoraEntregaAgendada?: string; // Formato ISO ou YYYY-MM-DDTHH:mm
  previsaoMinutos?: number;

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

  // Dinâmica de Recolhimento de Cascos / Vasilhames
  cascosRecolhidos?: CascoItemRecolhimento[];
  totalCascosRecolhidos?: number;
  totalCascosPendentes?: number;
  valeCascoGerado?: boolean;

  // Fidelidade & WhatsApp
  cashbackGanho?: number;
  descontoCashbackUsado?: number;
  whatsappEnviado?: boolean;

  criadoEm: string;
  despachadoEm?: string;
  entregueEm?: string;
  concluidoEm?: string;
  origemOffline?: boolean;
  sincronizado: boolean;
  versao: number;
}

export type TipoVeiculo = 'MOTO' | 'CARRO' | 'TRICICLO' | 'CAMINHAO' | 'OUTRO';
export type StatusVeiculo = 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO';

export interface Veiculo {
  id: string;
  empresaId?: string;
  placa: string;
  modelo: string; // Ex: Honda Fan 160, Fiat Fiorino 1.4
  tipo: TipoVeiculo;
  ano?: number;
  cor?: string;
  kmAtual: number; // Odômetro atual
  kmUltimaRevisao?: number;
  status: StatusVeiculo;
  observacoes?: string;
  criadoEm?: string;
}

export interface Colaborador {
  id: string;
  empresaId?: string;
  nome: string;
  cpf?: string;
  rg?: string;
  cnh?: string;
  categoriaCnh?: string; // 'A', 'B', 'AB', 'C', 'D'
  validadeCnh?: string;
  telefone: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  dataNascimento?: string;
  dataAdmissao?: string;
  cargo: string; // Ex: 'Entregador', 'Motorista', 'Atendente'
  usuarioIdVinculado?: string; // ID da conta de Usuario do sistema
  veiculoIdAtual?: string;
  status: 'ATIVO' | 'INATIVO' | 'AFASTADO';
  observacoes?: string;
  criadoEm?: string;
}

export interface Entregador {
  id: string;
  empresaId?: string;
  nome: string;
  telefone: string;
  veiculo: string; // 'Moto 01 (Honda Fan)', 'Carro 01 (Fiorino)'
  placa: string;
  status: StatusEntregador;
  pedidosAtivosCount: number;
  bateriaNivel: number;
  ultimaSincronizacao: string;
  totalEntregasHoje: number;
  // Detalhes estendidos do colaborador
  cpf?: string;
  rg?: string;
  cnh?: string;
  categoriaCnh?: string;
  validadeCnh?: string;
  dataAdmissao?: string;
  usuarioIdVinculado?: string;
  colaboradorId?: string;
  veiculoIdAtual?: string;
  trocoInicialAtual?: number;
  kmInicialAtual?: number;
  turnoAtivoId?: string;
  latAtual?: number;
  lngAtual?: number;
  ultimaAtualizacaoGps?: string;
}

export interface ExtratoCashback {
  id: string;
  empresaId?: string;
  clienteId: string;
  pedidoId?: string;
  valor: number;
  tipo: 'CREDITO' | 'DEBITO';
  descricao: string;
  criadoEm: string;
}

export type StatusTurno = 'EM_ANDAMENTO' | 'FECHADO';

export interface TurnoEntregador {
  id: string;
  empresaId?: string;
  entregadorId: string;
  entregadorNome: string;
  colaboradorId?: string;
  usuarioId?: string;
  veiculoId: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  
  // Abertura de Turno
  dataHoraAbertura: string;
  trocoInicial: number; // Quantia em dinheiro concedida para troco
  kmInicial: number; // Odômetro inicial ao sair
  
  // Fechamento de Turno
  dataHoraFechamento?: string;
  kmFinal?: number; // Odômetro final ao retornar
  kmRodados?: number; // kmFinal - kmInicial
  
  totalEntregasRealizadas?: number;
  totalDinheiroVendas?: number;
  totalPixVendas?: number;
  totalCartaoVendas?: number;
  totalPrazoVendas?: number;
  totalDinheiroEsperadoComTroco?: number; // trocoInicial + totalDinheiroVendas
  totalDinheiroInformado?: number;
  diferencaDinheiro?: number;
  
  cascosP13Recolhidos?: number;
  cascosP20LRecolhidos?: number;
  status: StatusTurno;
  observacoes?: string;
  fechamentoCaixaId?: string;
}

export interface FechamentoCaixaEntregador {
  id: string;
  empresaId?: string;
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
    pagamentosRealizados?: PagamentoItem[];
    valorRecebido: number;
    trocoDevolvido: number;
    vasilhamesRecolhidos: {
      P13: number;
      P20L: number;
      [key: string]: number;
    };
    vasilhamesPendentes: {
      P13: number;
      P20L: number;
      [key: string]: number;
    };
    cascosDetalhados?: CascoItemRecolhimento[];
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

export type TipoMovimentacaoEstoque =
  | 'ENTRADA'
  | 'SAIDA_VENDA'
  | 'DESPACHO_ROTA'
  | 'RETORNO_ROTA'
  | 'AJUSTE_MANUAL'
  | 'CANCELAMENTO_ESTORNO'
  | 'DEVOLUCAO_AVARIA';

export interface MovimentacaoEstoque {
  id: string;
  empresaId?: string;
  produtoId: string;
  produtoNome: string;
  tipoVasilhame: TipoVasilhame;
  tipoMovimentacao: TipoMovimentacaoEstoque;
  quantidadeCheio: number;
  quantidadeVazio: number;
  estoqueCheioAnterior: number;
  estoqueCheioAtual: number;
  estoqueVazioAnterior: number;
  estoqueVazioAtual: number;
  pedidoId?: string;
  pedidoCodigo?: string;
  entregadorId?: string;
  entregadorNome?: string;
  usuarioResponsavel?: string;
  motivo?: string;
  timestamp: string;
}

export interface PontoLocalizacaoHistorico {
  id: string;
  empresaId?: string;
  entregadorId: string;
  entregadorNome?: string;
  lat: number;
  lng: number;
  velocidadeKmh?: number;
  bateriaNivel?: number;
  precisaoMetros?: number;
  pedidoIdEmAndamento?: string;
  pedidoCodigoEmAndamento?: string;
  statusEntregador?: StatusEntregador;
  timestamp: string;
}
