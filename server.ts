import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import {
  INITIAL_BAIRROS,
  INITIAL_CLIENTES,
  INITIAL_EMPRESAS,
  INITIAL_ENTREGADORES,
  INITIAL_PEDIDOS,
  INITIAL_PRODUTOS,
  INITIAL_USUARIOS,
} from './src/data/initialData.js';
import { SQL_SCHEMA_POSTGRESQL, SQL_TRIGGER_ESTOQUE } from './src/data/schemaSql.js';
import {
  BairroTaxa,
  Cliente,
  Empresa,
  Entregador,
  FechamentoCaixaEntregador,
  ItemPedido,
  MovimentacaoEstoque,
  NotificacaoPush,
  PagamentoItem,
  Pedido,
  Produto,
  PushSubscriptionData,
  SyncQueueItem,
  TipoEntrega,
  TipoMovimentacaoEstoque,
  Usuario,
} from './src/types.js';

// In-Memory Relational Store
let empresas: Empresa[] = [...INITIAL_EMPRESAS];
let bairros: BairroTaxa[] = [...INITIAL_BAIRROS];
let produtos: Produto[] = [...INITIAL_PRODUTOS];
let clientes: Cliente[] = [...INITIAL_CLIENTES];
let entregadores: Entregador[] = [...INITIAL_ENTREGADORES];
let usuarios: Usuario[] = [...INITIAL_USUARIOS];
let pedidos: Pedido[] = [...INITIAL_PEDIDOS];
let fechamentos: FechamentoCaixaEntregador[] = [];
let movimentacoesEstoque: MovimentacaoEstoque[] = [
  {
    id: 'mov_init_1',
    produtoId: 'p1',
    produtoNome: 'Botijão de Gás P13 (Ultragaz)',
    tipoVasilhame: 'P13',
    tipoMovimentacao: 'ENTRADA',
    quantidadeCheio: 50,
    quantidadeVazio: 0,
    estoqueCheioAnterior: 0,
    estoqueCheioAtual: 50,
    estoqueVazioAnterior: 30,
    estoqueVazioAtual: 30,
    usuarioResponsavel: 'Administrador',
    motivo: 'Carga inicial de estoque da base',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'mov_init_2',
    produtoId: 'p2',
    produtoNome: 'Água Mineral 20L (Indaiá)',
    tipoVasilhame: 'P20L',
    tipoMovimentacao: 'ENTRADA',
    quantidadeCheio: 80,
    quantidadeVazio: 0,
    estoqueCheioAnterior: 0,
    estoqueCheioAtual: 80,
    estoqueVazioAnterior: 45,
    estoqueVazioAtual: 45,
    usuarioResponsavel: 'Administrador',
    motivo: 'Carga inicial de estoque da base',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];
let syncAuditLog: Array<{
  id: string;
  idempotencyKey: string;
  entregadorId: string;
  pedidoId: string;
  timestampOffline: string;
  timestampServidor: string;
}> = [];

// Helper para Registrar Movimentações de Estoque e Vasilhames (Atômico)
function registrarMovimentacaoEstoque(dados: {
  produtoId: string;
  tipoMovimentacao: TipoMovimentacaoEstoque;
  deltaCheio: number; // positivo aumenta, negativo reduz
  deltaVazio: number; // positivo aumenta, negativo reduz
  pedidoId?: string;
  pedidoCodigo?: string;
  entregadorId?: string;
  entregadorNome?: string;
  usuarioResponsavel?: string;
  motivo?: string;
}): MovimentacaoEstoque | null {
  const prod = produtos.find((p) => p.id === dados.produtoId);
  if (!prod) return null;

  const estoqueCheioAnterior = prod.estoqueCheio;
  const estoqueVazioAnterior = prod.estoqueVazio;

  prod.estoqueCheio = Math.max(0, prod.estoqueCheio + dados.deltaCheio);
  prod.estoqueVazio = Math.max(0, prod.estoqueVazio + dados.deltaVazio);

  const mov: MovimentacaoEstoque = {
    id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    produtoId: prod.id,
    produtoNome: prod.nome,
    tipoVasilhame: prod.tipoVasilhame,
    tipoMovimentacao: dados.tipoMovimentacao,
    quantidadeCheio: Math.abs(dados.deltaCheio),
    quantidadeVazio: Math.abs(dados.deltaVazio),
    estoqueCheioAnterior,
    estoqueCheioAtual: prod.estoqueCheio,
    estoqueVazioAnterior,
    estoqueVazioAtual: prod.estoqueVazio,
    pedidoId: dados.pedidoId,
    pedidoCodigo: dados.pedidoCodigo,
    entregadorId: dados.entregadorId,
    entregadorNome: dados.entregadorNome,
    usuarioResponsavel: dados.usuarioResponsavel || 'Sistema',
    motivo: dados.motivo,
    timestamp: new Date().toISOString(),
  };

  movimentacoesEstoque.unshift(mov);
  if (movimentacoesEstoque.length > 500) movimentacoesEstoque.pop();

  // Tenta sincronizar com Supabase se configurado
  try {
    const supabase = getSupabase();
    if (supabase) {
      Promise.resolve(supabase.from('movimentacoes_estoque').insert([mov])).catch(() => {});
      Promise.resolve(
        supabase
          .from('produtos')
          .update({
            estoque_cheio: prod.estoqueCheio,
            estoque_vazio: prod.estoqueVazio,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', prod.id)
      ).catch(() => {});
    }
  } catch (e) {}

  return mov;
}


// Supabase Lazy Client
let supabaseClient: any = null;

function getTargetEmpresaId(req: any): string | null {
  const header = req.headers ? (req.headers['x-empresa-id'] as string) : null;
  const query = req.query ? (req.query.empresaId as string) : null;
  const body = req.body ? (req.body.empresaId || req.body.empresa_id) : null;
  const val = header || query || body;
  return val ? String(val).trim() : null;
}

function mapEmpresaFromDb(r: any): Empresa {
  return {
    id: r.id,
    razaoSocial: r.razao_social || r.razaoSocial || r.nome_fantasia || '',
    nomeFantasia: r.nome_fantasia || r.nomeFantasia || '',
    cnpj: r.cnpj || '',
    telefone: r.telefone || '',
    email: r.email || '',
    cep: r.cep || '',
    cidade: r.cidade || 'São Paulo',
    estado: r.estado || 'SP',
    endereco: r.endereco || '',
    numero: r.numero || '',
    bairro: r.bairro || '',
    complemento: r.complemento || '',
    plano: r.plano || 'PRO',
    status: r.status || 'ATIVO',
    limiteUsuarios: Number(r.limite_usuarios ?? r.limiteUsuarios ?? 10),
    limitePedidosMes: Number(r.limite_pedidos_mes ?? r.limitePedidosMes ?? 5000),
    valorMensalidade: Number(r.valor_mensalidade ?? r.valorMensalidade ?? 199),
    totalPedidosRealizados: Number(r.total_pedidos_realizados ?? r.totalPedidosRealizados ?? 0),
    totalUsuariosAtivos: Number(r.total_usuarios_ativos ?? r.totalUsuariosAtivos ?? 1),
    observacoes: r.observacoes || '',
    criadoEm: r.criado_em || r.criadoEm || new Date().toISOString(),
    ultimoAcesso: r.ultimo_acesso || r.ultimoAcesso || new Date().toISOString(),
    configuracoes: r.configuracoes || {},
  };
}

function mapBairroFromDb(r: any): BairroTaxa {
  return {
    id: r.id,
    empresaId: r.empresa_id || r.empresaId || 'emp1',
    nome: r.nome || 'Bairro',
    taxaEntrega: Number(r.taxa_entrega ?? r.taxaEntrega ?? r.taxa ?? 0),
    tempoMedioMin: Number(r.tempo_medio_min ?? r.tempoMedioMin ?? r.prazo_estimado ?? 25),
    ativo: r.ativo !== undefined ? Boolean(r.ativo) : (r.status !== 'INATIVO'),
  };
}

function mapProdutoFromDb(r: any): Produto {
  const precoRecarga = Number(r.preco_recarga ?? r.precoRecarga ?? r.preco ?? 0);
  const precoCompleto = Number(r.preco_completo ?? r.precoCompleto ?? (r.tipo_vasilhame && r.tipo_vasilhame !== 'NENHUM' ? precoRecarga * 2.5 : precoRecarga));
  return {
    id: r.id,
    empresaId: r.empresa_id || r.empresaId || 'emp1',
    codigo: r.codigo || `PROD-${r.id}`,
    nome: r.nome || 'Produto',
    marca: r.marca || 'Conveniência',
    unidadeMedida: r.unidade_medida || r.unidadeMedida || 'UN',
    categoria: r.categoria || 'GAS',
    tipoVasilhame: r.tipo_vasilhame || r.tipoVasilhame || 'NENHUM',
    precoRecarga,
    precoCompleto,
    estoqueCheio: Number(r.estoque_cheio ?? r.estoqueCheio ?? r.estoque_atual ?? 0),
    estoqueVazio: Number(r.estoque_vazio ?? r.estoqueVazio ?? 0),
    estoqueMinimo: Number(r.estoque_minimo ?? r.estoqueMinimo ?? 5),
    imagemUrl: r.imagem_url || r.imagemUrl,
    permiteVendaCasco: r.permite_venda_casco ?? r.permiteVendaCasco ?? (r.tipo_vasilhame && r.tipo_vasilhame !== 'NENHUM'),
    maisUtilizado: Boolean(r.mais_utilizado ?? r.maisUtilizado ?? false),
    vendasCount: Number(r.vendas_count ?? r.vendasCount ?? 0),
  };
}

function mapClienteFromDb(r: any): Cliente {
  return {
    id: r.id,
    empresaId: r.empresa_id || r.empresaId || 'emp1',
    nome: r.nome || 'Cliente',
    telefone: r.telefone || '',
    cpfCnpj: r.cpf_cnpj || r.cpfCnpj || '',
    email: r.email || '',
    cep: r.cep || '',
    endereco: r.endereco || '',
    numero: r.numero || '',
    complemento: r.complemento || '',
    bairroId: r.bairro_id || r.bairroId || 'b1',
    bairroNome: r.bairro_nome || r.bairroNome || 'Centro',
    cidade: r.cidade || 'São Paulo',
    estado: r.estado || 'SP',
    referencia: r.referencia || '',
    lat: Number(r.lat ?? -23.55052),
    lng: Number(r.lng ?? -46.633308),
    saldoDevedor: Number(r.saldo_devedor ?? r.saldoDevedor ?? 0),
    totalPedidos: Number(r.total_pedidos ?? r.totalPedidos ?? 0),
    vasilhamesPendentes: r.vasilhames_com_cliente || r.vasilhamesPendentes || { P13: 0, P20L: 0 },
  };
}

function mapEntregadorFromDb(r: any): Entregador {
  return {
    id: r.id,
    empresaId: r.empresa_id || r.empresaId || 'emp1',
    nome: r.nome || 'Entregador',
    telefone: r.telefone || '',
    veiculo: r.veiculo || 'Moto',
    placa: r.placa || 'ABC-1234',
    status: r.status || 'DISPONIVEL',
    pedidosAtivosCount: Number(r.pedidos_ativos_count ?? r.pedidosAtivosCount ?? 0),
    bateriaNivel: Number(r.bateria ?? r.bateriaNivel ?? 100),
    ultimaSincronizacao: r.ultima_localizacao || r.ultimaSincronizacao || new Date().toISOString(),
    totalEntregasHoje: Number(r.total_entregas_hoje ?? r.totalEntregasHoje ?? 0),
  };
}

function mapPedidoFromDb(r: any): Pedido {
  let clienteObj: Cliente = r.cliente;
  if (!clienteObj || !clienteObj.nome) {
    const cliFound = clientes.find((c) => c.id === (r.cliente_id || r.clienteId));
    clienteObj = cliFound || {
      id: r.cliente_id || r.clienteId || 'c1',
      empresaId: r.empresa_id || r.empresaId || 'emp1',
      nome: 'Cliente ' + (r.cliente_id || ''),
      telefone: '',
      endereco: 'Endereço',
      numero: 'S/N',
      bairroId: 'b1',
      bairroNome: 'Centro',
      lat: -23.55052,
      lng: -46.633308,
      saldoDevedor: 0,
      totalPedidos: 1,
      vasilhamesPendentes: { P13: 0, P20L: 0 },
    };
  }

  return {
    id: r.id,
    empresaId: r.empresa_id || r.empresaId || 'emp1',
    codigo: r.codigo || r.numero_pedido || `#${r.id}`,
    clienteId: r.cliente_id || r.clienteId || clienteObj.id,
    cliente: clienteObj,
    entregadorId: r.entregador_id || r.entregadorId,
    entregadorNome: r.entregador_nome || r.entregadorNome,
    status: r.status || 'PENDENTE',
    itens: Array.isArray(r.itens) && r.itens.length > 0
      ? r.itens
      : Array.isArray(r.itens_pedido)
      ? r.itens_pedido.map((it: any) => ({
          id: it.id,
          pedidoId: it.pedido_id || r.id,
          produtoId: it.produto_id,
          produtoNome: it.nome_produto || it.produto_nome || 'Produto',
          quantidade: Number(it.quantidade || 1),
          tipoVenda: it.tipo_venda || 'RECARGA',
          precoUnitario: Number(it.preco_unitario || 0),
          subtotal: Number(it.subtotal || 0),
          vasilhamesRecolhidosEsperados: Number(it.vasilhames_recolhidos_esperados || 0),
          vasilhamesRecolhidosReais: Number(it.vasilhames_recolhidos_reais || 0),
          vasilhamesPendentes: Number(it.vasilhames_pendentes || 0),
        }))
      : [],
    subtotal: Number(r.subtotal || 0),
    taxaEntrega: Number(r.taxa_entrega ?? r.taxaEntrega ?? 0),
    desconto: Number(r.desconto || 0),
    total: Number(r.total || 0),
    formaPagamentoPrevista: r.forma_pagamento_prevista || r.formaPagamentoPrevista || 'PIX',
    trocoPara: r.troco_para ?? r.trocoPara,
    formaPagamentoRealizada: r.forma_pagamento_realizada || r.formaPagamentoRealizada,
    valorRecebido: r.valor_recebido ?? r.valorRecebido,
    observacoes: r.observacoes || '',
    emitidoPorId: r.emitido_por_id || r.emitidoPorId,
    emitidoPorNome: r.emitido_por_nome || r.emitidoPorNome,
    emitidoPorPerfil: r.emitido_por_perfil || r.emitidoPorPerfil,
    despachadoPor: r.despachado_por || r.despachadoPor,
    entreguePor: r.entregue_por || r.entreguePor,
    devolvidoParaCorrecao: Boolean(r.devolvido_para_correcao ?? r.devolvidoParaCorrecao),
    motivoDevolucao: r.motivo_devolucao || r.motivoDevolucao,
    devolvidoEm: r.devolvido_em || r.devolvidoEm,
    devolvidoPorId: r.devolvido_por_id || r.devolvidoPorId,
    devolvidoPorNome: r.devolvido_por_nome || r.devolvidoPorNome,
    criadoEm: r.criado_em || r.criadoEm || new Date().toISOString(),
    despachadoEm: r.despachado_em || r.despachadoEm,
    entregueEm: r.entregue_em || r.entregueEm,
    concluidoEm: r.concluido_em || r.concluidoEm,
    sincronizado: r.sincronizado !== undefined ? Boolean(r.sincronizado) : true,
    versao: Number(r.versao || 1),
  };
}

function mapUsuarioFromDb(r: any): Usuario {
  return {
    id: r.id,
    empresaId: r.empresa_id !== undefined ? r.empresa_id : r.empresaId,
    nome: r.nome || 'Usuário',
    login: r.login || '',
    email: r.email || '',
    senha: r.senha || '',
    telefone: r.telefone || '',
    perfil: r.perfil || 'ATENDENTE_PDV',
    cargo: r.cargo || 'Atendente',
    ativo: r.ativo !== undefined ? Boolean(r.ativo) : true,
    pinAcesso: r.pin_acesso || r.pinAcesso || '',
    entregadorIdVinculado: r.entregador_id_vinculado || r.entregadorIdVinculado,
    permissoes: r.permissoes || {
      emitirPedidos: true,
      despacharPedidos: false,
      cancelarPedidos: false,
      editarPedidos: true,
      devolverPedidos: false,
      realizarAcertoCaixa: false,
      ajustarEstoque: false,
      verDashboardGerencial: false,
      acessarCadastros: false,
      gerenciarUsuarios: false,
      importarErp: false,
    },
    criadoEm: r.criado_em || r.criadoEm || new Date().toISOString(),
    ultimoAcesso: r.ultimo_acesso || r.ultimoAcesso,
  };
}

async function syncFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase não configurado ou chaves ausentes' };
  try {
    console.log('[Supabase] Sincronizando dados do schema delivery com isolamento multi-tenant...');
    const tables = [
      { name: 'empresas', ref: empresas, mapper: mapEmpresaFromDb },
      { name: 'bairros_taxas', ref: bairros, mapper: mapBairroFromDb },
      { name: 'produtos', ref: produtos, mapper: mapProdutoFromDb },
      { name: 'clientes', ref: clientes, mapper: mapClienteFromDb },
      { name: 'entregadores', ref: entregadores, mapper: mapEntregadorFromDb },
      { name: 'pedidos', ref: pedidos, mapper: mapPedidoFromDb },
      { name: 'usuarios', ref: usuarios, mapper: mapUsuarioFromDb },
      { name: 'fechamentos_caixa', ref: fechamentos, mapper: (r: any) => ({ ...r, empresaId: r.empresa_id || r.empresaId || 'emp1' }) },
      { name: 'movimentacoes_estoque', ref: movimentacoesEstoque, mapper: (r: any) => ({ ...r, empresaId: r.empresa_id || r.empresaId || 'emp1' }) }
    ];
    const details: Record<string, any> = {};
    let hasError = false;
    let errorMessage = '';

    const summary: string[] = [];
    for (const t of tables) {
      try {
        const { data, error } = await supabase.from(t.name).select('*');
        if (error) {
          details[t.name] = { status: 'erro', message: error.message, code: error.code };
          // Don't break entire sync if optional auxiliary tables fail
          if (['bairros_taxas', 'produtos', 'clientes', 'pedidos'].includes(t.name)) {
            hasError = true;
            errorMessage = error.message;
          }
        } else if (data) {
          details[t.name] = { status: 'ok', count: data.length };
          if (data.length > 0) {
            const mapped = t.mapper ? data.map(t.mapper) : data;
            t.ref.splice(0, t.ref.length, ...mapped);
            summary.push(`${data.length} ${t.name}`);
          }
        }
      } catch (errInner: any) {
        details[t.name] = { status: 'erro', message: errInner.message };
      }
    }
    return {
      success: !hasError,
      schema: 'delivery',
      mensagem: summary.length > 0 ? `Sincronizados com sucesso: ${summary.join(', ')}.` : 'Dados sincronizados do Supabase.',
      error: hasError ? errorMessage : undefined,
      details,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    console.error('[Supabase] Erro na sincronizacao:', err);
    return { success: false, error: err.message };
  }
}

function getSupabase() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return null;
    }
    supabaseClient = createClient(url, key, {
      db: { schema: 'delivery' },
    });
  }
  return supabaseClient;
}

async function getFreshEmpresas(): Promise<Empresa[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('empresas').select('*');
      if (!error && data && data.length > 0) {
        const mapped = data.map(mapEmpresaFromDb);
        empresas.splice(0, empresas.length, ...mapped);
      }
    } catch (e) {}
  }
  return empresas;
}

async function getFreshBairros(): Promise<BairroTaxa[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('bairros_taxas').select('*');
      if (!error && data && data.length > 0) {
        const mapped = data.map(mapBairroFromDb);
        bairros.splice(0, bairros.length, ...mapped);
      }
    } catch (e) {}
  }
  return bairros;
}

async function getFreshProdutos(): Promise<Produto[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('produtos').select('*');
      if (!error && data && data.length > 0) {
        const mapped = data.map(mapProdutoFromDb);
        produtos.splice(0, produtos.length, ...mapped);
      }
    } catch (e) {}
  }
  return produtos;
}

async function getFreshClientes(): Promise<Cliente[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('clientes').select('*');
      if (!error && data && data.length > 0) {
        const mapped = data.map(mapClienteFromDb);
        clientes.splice(0, clientes.length, ...mapped);
      }
    } catch (e) {}
  }
  return clientes;
}

async function getFreshEntregadores(): Promise<Entregador[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('entregadores').select('*');
      if (!error && data && data.length > 0) {
        const mapped = data.map(mapEntregadorFromDb);
        entregadores.splice(0, entregadores.length, ...mapped);
      }
    } catch (e) {}
  }
  return entregadores;
}

async function getFreshUsuarios(): Promise<Usuario[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('usuarios').select('*');
      if (!error && data && data.length > 0) {
        const mapped = data.map(mapUsuarioFromDb);
        usuarios.splice(0, usuarios.length, ...mapped);
      }
    } catch (e) {}
  }
  return usuarios;
}

async function getFreshPedidos(): Promise<Pedido[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('pedidos').select('*, itens_pedido(*)').order('criado_em', { ascending: false });
      if (!error && data && data.length > 0) {
        const mapped = data.map(mapPedidoFromDb);
        pedidos.splice(0, pedidos.length, ...mapped);
      }
    } catch (e) {}
  }
  return pedidos;
}

// VAPID Web Push Keys Setup (Supabase / W3C Standard)
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  try {
    const generated = webpush.generateVAPIDKeys();
    vapidKeys = generated;
    console.log('[Web Push / Supabase] Chaves VAPID geradas automaticamente para Web Push W3C.');
  } catch (e) {
    console.warn('[Web Push] Aviso ao gerar chaves VAPID:', e);
  }


try {
  if (vapidKeys.publicKey && vapidKeys.privateKey) {
    webpush.setVapidDetails(
      'mailto:admin@diskentrega.com.br',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
    console.log('[Web Push / Supabase] VAPID Details configurados com sucesso.');
  }
} catch (e) {
  console.warn('[Web Push] Aviso ao configurar VAPID details:', e);


}

}
// Push Subscriptions & Push Notifications Log (Supabase / Web Push)
let pushSubscriptions: PushSubscriptionData[] = [];
let pushNotificationsLog: NotificacaoPush[] = [
  {
    id: 'notif_init_1',
    entregadorId: 'e1',
    titulo: '🔔 Novo Pedido #1041 Atribuído',
    corpo: 'Carlos Silva • Rua das Flores, 120 - Centro • Total: R$ 115,00 (1x Botijão P13)',
    tipo: 'NOVO_PEDIDO',
    pedidoId: 'p1',
    pedidoCodigo: '#1041',
    valorTotal: 115,
    bairroNome: 'Centro',
    endereco: 'Rua das Flores, 120',
    itensResumo: '1x Botijão P13 13kg',
    prioridade: 'ALTA',
    canal: 'SUPABASE_REALTIME',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    lida: true,
  },
  {
    id: 'notif_init_2',
    entregadorId: 'e1',
    titulo: '🔔 Novo Pedido #1042 Atribuído',
    corpo: 'Mariana Souza • Av. Brasil, 450 - Vila Nova • Total: R$ 52,00 (2x Galão Água 20L)',
    tipo: 'NOVO_PEDIDO',
    pedidoId: 'p2',
    pedidoCodigo: '#1042',
    valorTotal: 52,
    bairroNome: 'Vila Nova',
    endereco: 'Av. Brasil, 450',
    itensResumo: '2x Água Mineral 20L',
    prioridade: 'NORMAL',
    canal: 'WEB_PUSH',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    lida: false,
  },
];

const pushSSEClients: Array<{ entregadorId?: string; res: express.Response }> = [];

async function dispararNotificacaoPush(
  dados: Partial<NotificacaoPush> & { entregadorId: string; titulo: string; corpo: string }
): Promise<NotificacaoPush> {
  const notificacao: NotificacaoPush = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    entregadorId: dados.entregadorId,
    titulo: dados.titulo,
    corpo: dados.corpo,
    tipo: dados.tipo || 'NOVO_PEDIDO',
    pedidoId: dados.pedidoId,
    pedidoCodigo: dados.pedidoCodigo,
    valorTotal: dados.valorTotal,
    bairroNome: dados.bairroNome,
    endereco: dados.endereco,
    itensResumo: dados.itensResumo,
    prioridade: dados.prioridade || 'ALTA',
    canal: dados.canal || 'SUPABASE_REALTIME',
    timestamp: new Date().toISOString(),
    lida: false,
    acoes: dados.acoes || [
      { id: 'abrir', titulo: 'Ver Rota' },
      { id: 'dispensar', titulo: 'Dispensar' },
    ],
  };

  pushNotificationsLog.unshift(notificacao);
  if (pushNotificationsLog.length > 100) pushNotificationsLog.pop();

  // 1. Tenta persistir no Supabase (se configurado)
  try {
    const supabase = getSupabase();
    if (supabase) {
      Promise.resolve(supabase.from('notificacoes_push').insert([notificacao])).catch(() => {});
    }
  } catch (e) {
    // Modo fallback
  }

  // 2. Disparo Web Push Real (W3C Push via VAPID para os navegadores do entregador)
  const subsDoEntregador = pushSubscriptions.filter((s) => s.entregadorId === dados.entregadorId && s.ativo);
  const payloadPush = JSON.stringify({
    title: notificacao.titulo,
    body: notificacao.corpo,
    pedidoId: notificacao.pedidoId,
    pedidoCodigo: notificacao.pedidoCodigo,
    prioridade: notificacao.prioridade,
    url: `/entregador?pedido=${notificacao.pedidoId || ''}`,
    timestamp: notificacao.timestamp,
  });

  subsDoEntregador.forEach((sub) => {
    if (sub.endpoint && sub.p256dh && sub.authKey && !sub.endpoint.includes('supabase.push.gateway')) {
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.authKey,
            },
          },
          payloadPush
        )
        .then(() => {
          console.log(`[Web Push] Push entregue via W3C para endpoint: ${sub.endpoint.substring(0, 45)}...`);
        })
        .catch((err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`[Web Push] Inscrição expirada ou cancelada: ${sub.endpoint.substring(0, 45)}...`);
            sub.ativo = false;
          } else {
            console.warn('[Web Push] Falha ao entregar push nativo:', err.message || err);
          }
        });
    }
  });

  // 3. Envia via Server-Sent Events (SSE) para conexões abertas no navegador
  pushSSEClients.forEach((client) => {
    if (!client.entregadorId || client.entregadorId === notificacao.entregadorId) {
      try {
        client.res.write(`data: ${JSON.stringify(notificacao)}\n\n`);
      } catch (err) {
        // Ignora erros em sockets fechados
      }
    }
  });

  console.log(`[Push / Supabase] Notificação enviada para entregador ${notificacao.entregadorId}: ${notificacao.titulo}`);
  return notificacao;


}

let orderCounter = 1045;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// --------------------------------------------------------------------------
  // API ROUTES
  // --------------------------------------------------------------------------

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // 1.1 Multi-Tenant Empresas (Super Admin)
  app.get('/api/empresas', async (req, res) => {
    const emps = await getFreshEmpresas();
    res.json(emps);
  });

  app.get('/api/empresas/:id', async (req, res) => {
    const { id } = req.params;
    const emps = await getFreshEmpresas();
    const emp = emps.find((e) => e.id === id);
    if (!emp) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json(emp);
  });

  app.post('/api/empresas', async (req, res) => {
    const dados = req.body;
    if (!dados.nomeFantasia || !dados.cnpj) {
      return res.status(400).json({ error: 'Nome fantasia e CNPJ são obrigatórios' });
    }

    const empresaId = dados.id || `emp_${Date.now()}`;
    const novaEmpresa: Empresa = {
      id: empresaId,
      razaoSocial: dados.razaoSocial || dados.nomeFantasia,
      nomeFantasia: dados.nomeFantasia,
      cnpj: dados.cnpj,
      telefone: dados.telefone || '',
      email: dados.email || '',
      cep: dados.cep || '',
      cidade: dados.cidade || 'São Paulo',
      estado: dados.estado || 'SP',
      endereco: dados.endereco || '',
      numero: dados.numero || '',
      bairro: dados.bairro || '',
      complemento: dados.complemento || '',
      plano: dados.plano || 'PRO',
      status: dados.status || 'ATIVO',
      limiteUsuarios: Number(dados.limiteUsuarios) || 10,
      limitePedidosMes: Number(dados.limitePedidosMes) || 5000,
      valorMensalidade: Number(dados.valorMensalidade) || 199.0,
      totalPedidosRealizados: 0,
      totalUsuariosAtivos: 1,
      observacoes: dados.observacoes || '',
      criadoEm: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString(),
      configuracoes: dados.configuracoes || {},
    };

    empresas.push(novaEmpresa);

    // 1. Criação Automática do Usuário Administrador (Master) da Empresa (Supabase Auth Ready)
    const adminData = dados.adminInicial || {};
    const adminNome = adminData.nome?.trim() || `Admin ${novaEmpresa.nomeFantasia}`;
    const cleanFantasia = novaEmpresa.nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '');
    let adminEmail = (adminData.email || adminData.login || dados.email || '').trim().toLowerCase();
    if (!adminEmail || !adminEmail.includes('@')) {
      adminEmail = `admin@${cleanFantasia || novaEmpresa.id}.com.br`;
    }
    const adminLogin = adminEmail;
    const adminSenha = adminData.senha?.trim() || 'Admin@123';
    const adminPin = adminData.pinAcesso?.trim() || Math.floor(1000 + Math.random() * 9000).toString();
    const adminTelefone = adminData.telefone?.trim() || dados.telefone?.trim() || '';

    const novoUsuarioAdmin: Usuario = {
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      empresaId: novaEmpresa.id,
      nome: adminNome,
      login: adminLogin,
      email: adminEmail,
      senha: adminSenha,
      pinAcesso: adminPin,
      telefone: adminTelefone,
      perfil: 'ADMIN',
      cargo: 'Diretor / Administrador',
      ativo: true,
      permissoes: {
        emitirPedidos: true,
        despacharPedidos: true,
        cancelarPedidos: true,
        editarPedidos: true,
        devolverPedidos: true,
        realizarAcertoCaixa: true,
        ajustarEstoque: true,
        verDashboardGerencial: true,
        acessarCadastros: true,
        gerenciarUsuarios: true,
        importarErp: true,
      },
      criadoEm: new Date().toISOString(),
    };

    usuarios.push(novoUsuarioAdmin);

    // 2. Seeding básico para a nova empresa (Produtos e Bairros iniciais)
    const bairroCentro: BairroTaxa = {
      id: `b_${Date.now()}_1`,
      empresaId: novaEmpresa.id,
      nome: 'Centro',
      taxaEntrega: 5.0,
      tempoMedioMin: 25,
      ativo: true,
    };
    bairros.push(bairroCentro);

    const prodGas: Produto = {
      id: `p_${Date.now()}_gas`,
      empresaId: novaEmpresa.id,
      codigo: 'GAS-P13',
      nome: 'Gás de Cozinha P13 (GLP 13kg)',
      marca: 'Ultragaz / Nacional',
      unidadeMedida: 'UN',
      categoria: 'GAS',
      tipoVasilhame: 'P13',
      precoRecarga: 115.0,
      precoCompleto: 280.0,
      estoqueCheio: 50,
      estoqueVazio: 30,
      estoqueMinimo: 10,
      permiteVendaCasco: true,
      maisUtilizado: true,
      vendasCount: 0,
    };
    const prodAgua: Produto = {
      id: `p_${Date.now()}_agua`,
      empresaId: novaEmpresa.id,
      codigo: 'AGUA-20L',
      nome: 'Água Mineral Galão 20L',
      marca: 'Fonte Natural',
      unidadeMedida: 'UN',
      categoria: 'AGUA',
      tipoVasilhame: 'P20L',
      precoRecarga: 15.0,
      precoCompleto: 45.0,
      estoqueCheio: 40,
      estoqueVazio: 20,
      estoqueMinimo: 8,
      permiteVendaCasco: true,
      maisUtilizado: true,
      vendasCount: 0,
    };
    produtos.push(prodGas, prodAgua);

    // 3. Sincronização com Supabase se configurado
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('empresas')
          .insert([
            {
              id: novaEmpresa.id,
              razao_social: novaEmpresa.razaoSocial,
              nome_fantasia: novaEmpresa.nomeFantasia,
              cnpj: novaEmpresa.cnpj,
              telefone: novaEmpresa.telefone,
              email: novaEmpresa.email,
              cep: novaEmpresa.cep,
              cidade: novaEmpresa.cidade,
              estado: novaEmpresa.estado,
              endereco: novaEmpresa.endereco,
              numero: novaEmpresa.numero,
              bairro: novaEmpresa.bairro,
              complemento: novaEmpresa.complemento,
              plano: novaEmpresa.plano,
              status: novaEmpresa.status,
              limite_usuarios: novaEmpresa.limiteUsuarios,
              limite_pedidos_mes: novaEmpresa.limitePedidosMes,
              valor_mensalidade: novaEmpresa.valorMensalidade,
              observacoes: novaEmpresa.observacoes,
              configuracoes: novaEmpresa.configuracoes,
            },
          ]);

        await supabase
          .from('usuarios')
          .insert([
            {
              id: novoUsuarioAdmin.id,
              empresa_id: novaEmpresa.id,
              nome: novoUsuarioAdmin.nome,
              login: novoUsuarioAdmin.login,
              email: novoUsuarioAdmin.email,
              senha: novoUsuarioAdmin.senha,
              pin_acesso: novoUsuarioAdmin.pinAcesso,
              telefone: novoUsuarioAdmin.telefone,
              perfil: novoUsuarioAdmin.perfil,
              cargo: novoUsuarioAdmin.cargo,
              ativo: true,
              permissoes: novoUsuarioAdmin.permissoes,
            },
          ]);

        await supabase
          .from('bairros_taxas')
          .insert([
            {
              id: bairroCentro.id,
              empresa_id: novaEmpresa.id,
              nome: bairroCentro.nome,
              taxa_entrega: bairroCentro.taxaEntrega,
              tempo_medio_min: bairroCentro.tempoMedioMin,
              ativo: true,
            },
          ]);

        await supabase
          .from('produtos')
          .insert([
            {
              id: prodGas.id,
              empresa_id: novaEmpresa.id,
              codigo: prodGas.codigo,
              nome: prodGas.nome,
              marca: prodGas.marca,
              unidade_medida: prodGas.unidadeMedida,
              categoria: prodGas.categoria,
              tipo_vasilhame: prodGas.tipoVasilhame,
              preco_recarga: prodGas.precoRecarga,
              preco_completo: prodGas.precoCompleto,
              estoque_cheio: prodGas.estoqueCheio,
              estoque_vazio: prodGas.estoqueVazio,
              estoque_minimo: prodGas.estoqueMinimo,
              permite_venda_casco: prodGas.permiteVendaCasco,
              mais_utilizado: true,
            },
            {
              id: prodAgua.id,
              empresa_id: novaEmpresa.id,
              codigo: prodAgua.codigo,
              nome: prodAgua.nome,
              marca: prodAgua.marca,
              unidade_medida: prodAgua.unidadeMedida,
              categoria: prodAgua.categoria,
              tipo_vasilhame: prodAgua.tipoVasilhame,
              preco_recarga: prodAgua.precoRecarga,
              preco_completo: prodAgua.precoCompleto,
              estoque_cheio: prodAgua.estoqueCheio,
              estoque_vazio: prodAgua.estoqueVazio,
              estoque_minimo: prodAgua.estoqueMinimo,
              permite_venda_casco: prodAgua.permiteVendaCasco,
              mais_utilizado: true,
            },
          ]);
      }
    } catch (err: any) {
      console.warn('[Supabase Sync Error]:', err?.message || err);
    }

    res.status(201).json({
      sucesso: true,
      ...novaEmpresa,
      usuarioAdmin: novoUsuarioAdmin,
      credenciais: {
        nome: novoUsuarioAdmin.nome,
        login: novoUsuarioAdmin.login,
        email: novoUsuarioAdmin.email,
        senha: novoUsuarioAdmin.senha,
        pinAcesso: novoUsuarioAdmin.pinAcesso,
        perfil: 'ADMIN',
        cargo: novoUsuarioAdmin.cargo,
        empresaNome: novaEmpresa.nomeFantasia,
        empresaCnpj: novaEmpresa.cnpj,
        empresaId: novaEmpresa.id,
      },
    });
  });

  app.put('/api/empresas/:id', async (req, res) => {
    const { id } = req.params;
    const emp = empresas.find((e) => e.id === id);
    if (!emp) return res.status(404).json({ error: 'Empresa não encontrada' });

    const dados = req.body;
    if (dados.razaoSocial !== undefined) emp.razaoSocial = dados.razaoSocial;
    if (dados.nomeFantasia !== undefined) emp.nomeFantasia = dados.nomeFantasia;
    if (dados.cnpj !== undefined) emp.cnpj = dados.cnpj;
    if (dados.telefone !== undefined) emp.telefone = dados.telefone;
    if (dados.email !== undefined) emp.email = dados.email;
    if (dados.cep !== undefined) emp.cep = dados.cep;
    if (dados.cidade !== undefined) emp.cidade = dados.cidade;
    if (dados.estado !== undefined) emp.estado = dados.estado;
    if (dados.endereco !== undefined) emp.endereco = dados.endereco;
    if (dados.numero !== undefined) emp.numero = dados.numero;
    if (dados.bairro !== undefined) emp.bairro = dados.bairro;
    if (dados.complemento !== undefined) emp.complemento = dados.complemento;
    if (dados.plano !== undefined) emp.plano = dados.plano;
    if (dados.status !== undefined) emp.status = dados.status;
    if (dados.limiteUsuarios !== undefined) emp.limiteUsuarios = Number(dados.limiteUsuarios);
    if (dados.limitePedidosMes !== undefined) emp.limitePedidosMes = Number(dados.limitePedidosMes);
    if (dados.valorMensalidade !== undefined) emp.valorMensalidade = Number(dados.valorMensalidade);
    if (dados.observacoes !== undefined) emp.observacoes = dados.observacoes;
    if (dados.configuracoes !== undefined) emp.configuracoes = { ...emp.configuracoes, ...dados.configuracoes };
    emp.ultimoAcesso = new Date().toISOString();

    // Atualização opcional do Administrador Master da Empresa existente
    let usuarioAdminAtualizado: Usuario | null = null;
    let credenciaisGeradas: any = null;
    const adminData = dados.adminData || dados.adminInicial || dados.adminAtual;

    if (adminData) {
      let adminUsr = usuarios.find((u) => u.empresaId === emp.id && (u.perfil === 'ADMIN' || u.perfil === 'GERENTE'));
      const adminNome = adminData.nome?.trim();
      const adminEmail = (adminData.email || adminData.login || '').trim().toLowerCase();
      const adminLogin = adminEmail || adminData.login?.trim().toLowerCase();
      const adminSenha = adminData.senha?.trim();
      const adminPin = adminData.pinAcesso?.trim();
      const adminTelefone = adminData.telefone?.trim();

      if (!adminUsr) {
        // Se a empresa ainda não tinha um admin cadastrado, cria um agora
        const cleanFantasia = emp.nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '');
        const emailFinal = adminEmail || emp.email || `admin@${cleanFantasia || emp.id}.com.br`;
        adminUsr = {
          id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          empresaId: emp.id,
          nome: adminNome || `Admin ${emp.nomeFantasia}`,
          login: emailFinal,
          email: emailFinal,
          senha: adminSenha || 'Admin@123',
          pinAcesso: adminPin || '1234',
          telefone: adminTelefone || emp.telefone || '',
          perfil: 'ADMIN',
          cargo: 'Diretor / Administrador',
          ativo: true,
          permissoes: {
            emitirPedidos: true,
            despacharPedidos: true,
            cancelarPedidos: true,
            editarPedidos: true,
            devolverPedidos: true,
            realizarAcertoCaixa: true,
            ajustarEstoque: true,
            verDashboardGerencial: true,
            acessarCadastros: true,
            gerenciarUsuarios: true,
            importarErp: true,
          },
          criadoEm: new Date().toISOString(),
        };
        usuarios.push(adminUsr);
      } else {
        if (adminNome) adminUsr.nome = adminNome;
        if (adminEmail) {
          adminUsr.email = adminEmail;
          adminUsr.login = adminEmail;
        } else if (adminLogin) {
          adminUsr.login = adminLogin;
        }
        if (adminTelefone !== undefined) adminUsr.telefone = adminTelefone;
        if (adminPin) adminUsr.pinAcesso = adminPin;
        if (adminSenha) adminUsr.senha = adminSenha;
        adminUsr.ativo = true;
      }

      usuarioAdminAtualizado = adminUsr;

      // Se foi fornecida senha ou solicitação explícita, inclui credenciais no retorno
      credenciaisGeradas = {
        nome: adminUsr.nome,
        login: adminUsr.login,
        email: adminUsr.email,
        senha: adminSenha || adminUsr.senha || '(Mantida anterior)',
        pinAcesso: adminUsr.pinAcesso || '1234',
        telefone: adminUsr.telefone || emp.telefone || '',
        perfil: 'ADMIN',
        cargo: adminUsr.cargo || 'Diretor / Administrador',
        empresaNome: emp.nomeFantasia,
        empresaCnpj: emp.cnpj,
        empresaId: emp.id,
      };

      // Sincroniza atualização do usuário no Supabase
      try {
        const supabase = getSupabase();
        if (supabase) {
          await supabase
            .from('usuarios')
            .upsert([
              {
                id: adminUsr.id,
                empresa_id: emp.id,
                nome: adminUsr.nome,
                login: adminUsr.login,
                email: adminUsr.email,
                senha: adminUsr.senha,
                pin_acesso: adminUsr.pinAcesso,
                telefone: adminUsr.telefone,
                perfil: adminUsr.perfil,
                cargo: adminUsr.cargo,
                ativo: adminUsr.ativo,
                permissoes: adminUsr.permissoes,
              },
            ]);
        }
      } catch (e: any) {
        console.warn('[Supabase] Erro ao atualizar admin da empresa:', e.message);
      }
    }

    // Sincroniza empresa no Supabase com resiliência
    try {
      const supabase = getSupabase();
      if (supabase) {
        const payloadCompleto: any = {
          razao_social: emp.razaoSocial,
          nome_fantasia: emp.nomeFantasia,
          cnpj: emp.cnpj,
          telefone: emp.telefone,
          email: emp.email,
          cep: emp.cep,
          cidade: emp.cidade,
          estado: emp.estado,
          endereco: emp.endereco,
          numero: emp.numero,
          bairro: emp.bairro,
          complemento: emp.complemento,
          plano: emp.plano,
          status: emp.status,
          limite_usuarios: emp.limiteUsuarios,
          limite_pedidos_mes: emp.limitePedidosMes,
          valor_mensalidade: emp.valorMensalidade,
          observacoes: emp.observacoes,
          configuracoes: emp.configuracoes,
          ultimo_acesso: emp.ultimoAcesso,
        };

        const { error: updateError } = await supabase
          .from('empresas')
          .update(payloadCompleto)
          .eq('id', emp.id);

        if (updateError) {
          console.warn('[Supabase] Tentando update com campos essenciais:', updateError.message);
          // Fallback para schema anterior caso alguma coluna customizada não exista ainda
          await supabase
            .from('empresas')
            .update({
              razao_social: emp.razaoSocial,
              nome_fantasia: emp.nomeFantasia,
              cnpj: emp.cnpj,
              telefone: emp.telefone,
              email: emp.email,
              cidade: emp.cidade,
              estado: emp.estado,
              endereco: emp.endereco,
              plano: emp.plano,
              status: emp.status,
              limite_usuarios: emp.limiteUsuarios,
              limite_pedidos_mes: emp.limitePedidosMes,
              valor_mensalidade: emp.valorMensalidade,
            })
            .eq('id', emp.id);
        }
      }
    } catch (e: any) {
      console.warn('[Supabase] Erro ao sincronizar empresa:', e.message);
    }

    res.json({
      sucesso: true,
      ...emp,
      empresa: emp,
      usuarioAdmin: usuarioAdminAtualizado,
      credenciais: credenciaisGeradas,
    });
  });

  // 1.2.3 Obter Administrador Master de uma Empresa Específica
  app.get('/api/empresas/:id/admin', (req, res) => {
    const { id } = req.params;
    const emp = empresas.find((e) => e.id === id);
    if (!emp) return res.status(404).json({ error: 'Empresa não encontrada' });

    let admin = usuarios.find((u) => u.empresaId === id && (u.perfil === 'ADMIN' || u.perfil === 'GERENTE'));
    if (!admin) {
      // Fallback: se ainda não existir, cria representação inicial
      admin = {
        id: `usr_${Date.now()}`,
        empresaId: emp.id,
        nome: `Administrador - ${emp.nomeFantasia}`,
        login: `admin_${emp.nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '') || emp.id}`,
        email: emp.email || '',
        senha: 'Admin@123',
        pinAcesso: '1234',
        telefone: emp.telefone || '',
        perfil: 'ADMIN',
        cargo: 'Diretor / Administrador',
        ativo: true,
        permissoes: {
          emitirPedidos: true,
          despacharPedidos: true,
          cancelarPedidos: true,
          editarPedidos: true,
          devolverPedidos: true,
          realizarAcertoCaixa: true,
          ajustarEstoque: true,
          verDashboardGerencial: true,
          acessarCadastros: true,
          gerenciarUsuarios: true,
          importarErp: true,
        },
        criadoEm: new Date().toISOString(),
      };
      usuarios.push(admin);
    }

    res.json({
      sucesso: true,
      empresaId: emp.id,
      empresaNome: emp.nomeFantasia,
      empresaCnpj: emp.cnpj,
      usuario: {
        id: admin.id,
        nome: admin.nome,
        login: admin.login,
        email: admin.email,
        telefone: admin.telefone || emp.telefone || '',
        pinAcesso: admin.pinAcesso || '1234',
        perfil: admin.perfil,
        cargo: admin.cargo,
        ativo: admin.ativo,
        temSenhaDefinida: Boolean(admin.senha),
      },
    });
  });

  // 1.2.4 Redefinir Acesso / Senha do Administrador de uma Empresa
  app.post('/api/empresas/:id/redefinir-acesso', async (req, res) => {
    const { id } = req.params;
    const emp = empresas.find((e) => e.id === id);
    if (!emp) return res.status(404).json({ error: 'Empresa não encontrada' });

    const { nome, login, email, senha, pinAcesso, telefone } = req.body;
    let admin = usuarios.find((u) => u.empresaId === id && (u.perfil === 'ADMIN' || u.perfil === 'GERENTE'));

    const novaSenha = senha?.trim() || Math.random().toString(36).slice(-8) + '!';
    const novoPin = pinAcesso?.trim() || Math.floor(1000 + Math.random() * 9000).toString();
    const emailFinal = (email || login || emp.email || '').trim().toLowerCase();

    if (!admin) {
      admin = {
        id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        empresaId: emp.id,
        nome: nome?.trim() || `Admin ${emp.nomeFantasia}`,
        login: emailFinal || `admin_${emp.nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        email: emailFinal || emp.email || '',
        senha: novaSenha,
        pinAcesso: novoPin,
        telefone: telefone?.trim() || emp.telefone || '',
        perfil: 'ADMIN',
        cargo: 'Diretor / Administrador',
        ativo: true,
        permissoes: {
          emitirPedidos: true,
          despacharPedidos: true,
          cancelarPedidos: true,
          editarPedidos: true,
          devolverPedidos: true,
          realizarAcertoCaixa: true,
          ajustarEstoque: true,
          verDashboardGerencial: true,
          acessarCadastros: true,
          gerenciarUsuarios: true,
          importarErp: true,
        },
        criadoEm: new Date().toISOString(),
      };
      usuarios.push(admin);
    } else {
      if (nome) admin.nome = nome.trim();
      if (emailFinal) {
        admin.email = emailFinal;
        admin.login = emailFinal;
      }
      if (telefone !== undefined) admin.telefone = telefone.trim();
      admin.senha = novaSenha;
      admin.pinAcesso = novoPin;
      admin.ativo = true;
    }

    // Sincroniza com Supabase se ativo
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('usuarios')
          .upsert([
            {
              id: admin.id,
              empresa_id: emp.id,
              nome: admin.nome,
              login: admin.login,
              email: admin.email,
              senha: admin.senha,
              pin_acesso: admin.pinAcesso,
              telefone: admin.telefone,
              perfil: admin.perfil,
              cargo: admin.cargo,
              ativo: true,
              permissoes: admin.permissoes,
            },
          ]);
      }
    } catch (e: any) {
      console.warn('[Supabase] Erro ao redefinir acesso:', e?.message || e);
    }

    res.json({
      sucesso: true,
      mensagem: 'Credenciais de acesso redefinidas com sucesso!',
      empresa: emp,
      usuarioAdmin: admin,
      credenciais: {
        nome: admin.nome,
        login: admin.login,
        email: admin.email,
        senha: novaSenha,
        pinAcesso: novoPin,
        telefone: admin.telefone || emp.telefone || '',
        perfil: 'ADMIN',
        cargo: admin.cargo || 'Diretor / Administrador',
        empresaNome: emp.nomeFantasia,
        empresaCnpj: emp.cnpj,
        empresaId: emp.id,
      },
    });
  });

  app.delete('/api/empresas/:id', (req, res) => {
    const { id } = req.params;
    const index = empresas.findIndex((e) => e.id === id);
    if (index === -1) return res.status(404).json({ error: 'Empresa não encontrada' });

    const [removida] = empresas.splice(index, 1);
    res.json({ sucesso: true, empresa: removida });
  });

  // --------------------------------------------------------------------------
  // CONSULTA EXTERNA: CNPJ, CEP E ENDEREÇOS (BrasilAPI + ReceitaWS + ViaCEP)
  // --------------------------------------------------------------------------
  app.get('/api/consulta/cnpj/:cnpj', async (req, res) => {
    const rawCnpj = String(req.params.cnpj || '').replace(/\D/g, '');
    if (rawCnpj.length !== 14) {
      return res.status(400).json({ sucesso: false, mensagem: 'CNPJ inválido. Forneça exatamente 14 dígitos numéricos.' });
    }

    try {
      // 1. Tenta BrasilAPI primeiro
      let data: any = null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${rawCnpj}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'DeliverySaas-App/1.0' },
        });
        clearTimeout(timeout);
        if (resp.ok) {
          data = await resp.json();
        }
      } catch (err) {
        // Fallback para ReceitaWS se timeout/erro
      }

      // 2. Se BrasilAPI falhar, tenta ReceitaWS
      if (!data || !data.razao_social) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 7000);
          const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${rawCnpj}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'DeliverySaas-App/1.0' },
          });
          clearTimeout(timeout);
          if (resp.ok) {
            const rawReceita = await resp.json();
            if (rawReceita && rawReceita.status !== 'ERROR') {
              data = {
                cnpj: rawReceita.cnpj?.replace(/\D/g, '') || rawCnpj,
                razao_social: rawReceita.nome,
                nome_fantasia: rawReceita.fantasia || rawReceita.nome,
                ddd_telefone_1: rawReceita.telefone,
                email: rawReceita.email,
                cep: rawReceita.cep?.replace(/\D/g, ''),
                logradouro: rawReceita.logradouro,
                numero: rawReceita.numero,
                complemento: rawReceita.complemento,
                bairro: rawReceita.bairro,
                municipio: rawReceita.municipio,
                uf: rawReceita.uf,
                descricao_situacao_cadastral: rawReceita.situacao,
                cnae_fiscal_descricao: rawReceita.atividade_principal?.[0]?.text,
                data_inicio_atividade: rawReceita.abertura,
              };
            }
          }
        } catch (err) {
          // Erro de rede no fallback
        }
      }

      if (!data || (!data.razao_social && !data.nome)) {
        return res.status(404).json({
          sucesso: false,
          mensagem: `CNPJ ${rawCnpj} não foi localizado na Receita Federal. Verifique os dígitos e tente novamente.`,
        });
      }

      const cnpjFormatado = `${rawCnpj.slice(0, 2)}.${rawCnpj.slice(2, 5)}.${rawCnpj.slice(5, 8)}/${rawCnpj.slice(8, 12)}-${rawCnpj.slice(12)}`;
      const cepClean = (data.cep || '').replace(/\D/g, '');
      const cepFormatado = cepClean.length === 8 ? `${cepClean.slice(0, 5)}-${cepClean.slice(5)}` : cepClean;

      let logradouroFinal = '';
      if (data.descricao_tipo_de_logradouro && data.logradouro) {
        logradouroFinal = `${data.descricao_tipo_de_logradouro} ${data.logradouro}`.trim();
      } else {
        logradouroFinal = (data.logradouro || data.descricao_tipo_de_logradouro || '').trim();
      }

      res.json({
        sucesso: true,
        cnpj: rawCnpj,
        cnpjFormatado,
        razaoSocial: data.razao_social || data.nome || '',
        nomeFantasia: data.nome_fantasia || data.fantasia || data.razao_social || data.nome || '',
        telefone: data.ddd_telefone_1 || data.telefone || data.ddd_telefone_2 || '',
        email: data.email || '',
        cep: cepClean,
        cepFormatado,
        logradouro: logradouroFinal,
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.municipio || data.cidade || '',
        estado: (data.uf || data.estado || '').toUpperCase(),
        situacao: data.descricao_situacao_cadastral || data.situacao || 'ATIVA',
        cnae: data.cnae_fiscal_descricao || '',
        abertura: data.data_inicio_atividade || data.abertura || '',
      });
    } catch (err: any) {
      console.error('[API Consulta CNPJ] Erro:', err);
      res.status(500).json({ sucesso: false, mensagem: 'Erro interno ao consultar serviço de CNPJ.' });
    }
  });

  app.get('/api/consulta/cep/:cep', async (req, res) => {
    const rawCep = String(req.params.cep || '').replace(/\D/g, '');
    if (rawCep.length !== 8) {
      return res.status(400).json({ sucesso: false, mensagem: 'CEP inválido. Forneça exatamente 8 dígitos numéricos.' });
    }

    const cepFormatado = `${rawCep.slice(0, 5)}-${rawCep.slice(5)}`;

    try {
      let data: any = null;

      // 1. Tenta BrasilAPI v2 (com coordenadas geográficas)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(`https://brasilapi.com.br/api/cep/v2/${rawCep}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'DeliverySaas-App/1.0' },
        });
        clearTimeout(timeout);
        if (resp.ok) {
          data = await resp.json();
        }
      } catch (err) {
        // Fallback
      }

      // 2. Tenta BrasilAPI v1 se v2 falhar
      if (!data || (!data.street && !data.city)) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const resp = await fetch(`https://brasilapi.com.br/api/cep/v1/${rawCep}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'DeliverySaas-App/1.0' },
          });
          clearTimeout(timeout);
          if (resp.ok) {
            data = await resp.json();
          }
        } catch (err) {
          // Fallback
        }
      }

      // 3. Fallback para ViaCEP
      if (!data || (!data.street && !data.city)) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const resp = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (resp.ok) {
            const rawViaCep = await resp.json();
            if (!rawViaCep.erro) {
              data = {
                cep: rawViaCep.cep?.replace(/\D/g, '') || rawCep,
                state: rawViaCep.uf,
                city: rawViaCep.localidade,
                neighborhood: rawViaCep.bairro,
                street: rawViaCep.logradouro,
                complemento: rawViaCep.complemento,
              };
            }
          }
        } catch (err) {
          // Erro de rede
        }
      }

      // 4. Fallback para AwesomeAPI CEP
      if (!data || (!data.street && !data.city && !data.localidade)) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const resp = await fetch(`https://cep.awesomeapi.com.br/json/${rawCep}`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (resp.ok) {
            const rawAwesome = await resp.json();
            if (rawAwesome.cep) {
              data = {
                cep: rawAwesome.cep.replace(/\D/g, ''),
                state: rawAwesome.state,
                city: rawAwesome.city,
                neighborhood: rawAwesome.district,
                street: rawAwesome.address,
                location: {
                  coordinates: {
                    latitude: rawAwesome.lat,
                    longitude: rawAwesome.lng,
                  }
                }
              };
            }
          }
        } catch (err) {
          // Erro de rede
        }
      }

      // 5. Fallback para CEP geral do município (ex: 89370-000 ou 89300-000)
      if (!data || (!data.street && !data.city && !data.localidade && !data.neighborhood)) {
        const baseCep5 = `${rawCep.slice(0, 5)}000`;
        const baseCep2 = `${rawCep.slice(0, 2)}000000`;

        for (const fallbackCep of [baseCep5, baseCep2]) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            const resp = await fetch(`https://viacep.com.br/ws/${fallbackCep}/json/`, { signal: controller.signal });
            clearTimeout(timeout);
            if (resp.ok) {
              const rawFallback = await resp.json();
              if (!rawFallback.erro && rawFallback.localidade) {
                data = {
                  cep: rawCep,
                  state: rawFallback.uf,
                  city: rawFallback.localidade,
                  neighborhood: rawFallback.bairro || '',
                  street: '',
                  aviso: 'Cidade identificada por aproximação regional. Preencha rua e número.',
                };
                break;
              }
            }
          } catch (err) {
            // Continua
          }
        }
      }

      // Se mesmo assim não for encontrado em nenhuma base oficial
      if (!data || (!data.street && !data.city && !data.localidade && !data.neighborhood && !data.state)) {
        return res.json({
          sucesso: true,
          localizado: false,
          cep: rawCep,
          cepFormatado,
          logradouro: '',
          bairro: '',
          cidade: '',
          estado: '',
          mensagem: `CEP ${cepFormatado} não foi localizado automaticamente nas bases dos Correios. Preencha os campos de endereço manualmente.`,
        });
      }

      const lat = data.location?.coordinates?.latitude ? Number(data.location.coordinates.latitude) : undefined;
      const lng = data.location?.coordinates?.longitude ? Number(data.location.coordinates.longitude) : undefined;

      res.json({
        sucesso: true,
        localizado: true,
        cep: rawCep,
        cepFormatado,
        logradouro: data.street || data.logradouro || data.address || '',
        bairro: data.neighborhood || data.bairro || data.district || '',
        cidade: data.city || data.localidade || '',
        estado: (data.state || data.uf || '').toUpperCase(),
        complemento: data.complemento || '',
        aviso: data.aviso || undefined,
        lat,
        lng,
      });
    } catch (err: any) {
      console.error('[API Consulta CEP] Erro:', err);
      res.json({
        sucesso: true,
        localizado: false,
        cep: rawCep,
        cepFormatado,
        logradouro: '',
        bairro: '',
        cidade: '',
        estado: '',
        mensagem: `CEP ${cepFormatado} não localizado no momento. Preencha o endereço manualmente.`,
      });
    }
  });

  app.get('/api/consulta/endereco', async (req, res) => {
    const { uf, cidade, logradouro } = req.query as { uf?: string; cidade?: string; logradouro?: string };
    if (!uf || !cidade || !logradouro || logradouro.length < 3) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Parâmetros uf, cidade e logradouro (min 3 letras) são obrigatórios.',
      });
    }

    try {
      const resp = await fetch(
        `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(cidade)}/${encodeURIComponent(logradouro)}/json/`
      );
      if (resp.ok) {
        const list = await resp.json();
        return res.json({ sucesso: true, resultados: Array.isArray(list) ? list : [] });
      }
      res.json({ sucesso: true, resultados: [] });
    } catch (err) {
      res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar endereços.' });
    }
  });

  // Geocoding Proxy (Google Maps API + Fallbacks)
  app.get('/api/geocode', async (req, res) => {
    const address = ((req.query.address as string) || '').trim();
    if (!address) {
      return res.status(400).json({ sucesso: false, mensagem: 'Endereço é obrigatório.' });
    }

    const mapsKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (mapsKey) {
      try {
        const resp = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsKey}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const loc = data.results[0].geometry.location;
            return res.json({ sucesso: true, lat: loc.lat, lng: loc.lng, formatado: data.results[0].formatted_address });
          }
        }
      } catch (e) {
        // Continuar para fallback
      }
    }

    // Fallback gratuito OpenStreetMap Nominatim
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
        headers: { 'User-Agent': 'DeliveryApp/1.0 (contact@droweder.com.br)' },
      });
      if (resp.ok) {
        const list = await resp.json();
        if (Array.isArray(list) && list.length > 0) {
          return res.json({
            sucesso: true,
            lat: parseFloat(list[0].lat),
            lng: parseFloat(list[0].lon),
            formatado: list[0].display_name,
          });
        }
      }
    } catch (e) {}

    return res.json({ sucesso: false, mensagem: 'Coordenadas não encontradas para o endereço.' });
  });

  // 1.2 Status de Integração Supabase & Servidor
  app.get('/api/status/supabase', async (req, res) => {
    const supabase = getSupabase();
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    let schemaStatus = 'unknown';
    let schemaError = null;
    if (supabase) {
      try {
        const { error } = await supabase.from('produtos').select('id', { count: 'exact', head: true });
        if (error) {
          schemaStatus = 'erro';
          schemaError = error.message;
        } else {
          schemaStatus = 'ok';
        }
      } catch (e: any) {
        schemaStatus = 'erro';
        schemaError = e.message;
      }
    }
    res.json({
      conectado: Boolean(supabase),
      schema: 'delivery',
      schemaStatus,
      schemaError,
      url: url ? `${url.substring(0, 25)}...` : 'Não configurado (Usando modo Local/Demo)',
      pushVapidAtivo: Boolean(vapidKeys.publicKey),
      tabelasDisponiveis: [
        'empresas',
        'usuarios',
        'bairros_taxas',
        'produtos',
        'clientes',
        'entregadores',
        'pedidos',
        'itens_pedido',
        'fechamentos_caixa',
        'movimentacoes_estoque',
        'push_subscriptions',
        'notificacoes_push',
      ],
      totalProdutos: produtos.length,
      totalClientes: clientes.length,
      totalPedidos: pedidos.length,
      totalMovimentacoesEstoque: movimentacoesEstoque.length,
    });
  });

  // 1.2.1 Sincronização Manual / Re-sincronização do Supabase
  app.get('/api/supabase/sync', async (req, res) => {
    const result = await syncFromSupabase();
    res.json(result);
  });

  app.post('/api/supabase/sync', async (req, res) => {
    const result = await syncFromSupabase();
    res.json(result);
  });

  // 1.3 Autenticação Unificada (Supabase Ready + Local Fallback)
  app.post('/api/auth/login', async (req, res) => {
    const { login, senha, pin } = req.body;
    const loginFormatado = String(login || '').toLowerCase().trim();

    try {
      const supabase = getSupabase();
      if (supabase && (loginFormatado.includes('@') || senha)) {
        // Tenta autenticação real no Supabase Auth se houver e-mail
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginFormatado,
          password: senha || pin || '',
        });

        if (!error && data?.user) {
          let usuarioEncontrado = usuarios.find((u) => u.email === loginFormatado || u.id === data.user.id);
          if (!usuarioEncontrado) {
            usuarioEncontrado = {
              id: data.user.id,
              nome: data.user.user_metadata?.nome || data.user.email?.split('@')[0] || 'Usuário Supabase',
              login: loginFormatado,
              email: data.user.email,
              perfil: loginFormatado === 'admin@droweder.com.br' ? 'SUPER_ADMIN' : ((data.user.user_metadata?.perfil as any) || 'ADMIN'),
              cargo: data.user.user_metadata?.cargo || 'Administrador',
              ativo: true,
              permissoes: {
                emitirPedidos: true,
                despacharPedidos: true,
                cancelarPedidos: true,
                editarPedidos: true,
                devolverPedidos: true,
                realizarAcertoCaixa: true,
                ajustarEstoque: true,
                verDashboardGerencial: true,
                acessarCadastros: true,
                gerenciarUsuarios: true,
                importarErp: true,
              },
              criadoEm: new Date().toISOString(),
            };
            usuarios.push(usuarioEncontrado);
          }

          return res.json({
            sucesso: true,
            usuario: usuarioEncontrado,
            token: data.session?.access_token,
            modo: 'SUPABASE_AUTH',
          });
        }
      }

      // Fallback em memória para PIN / credenciais locais de desenvolvimento
      const usuarioLocal = usuarios.find(
        (u) =>
          u.ativo &&
          (u.login.toLowerCase() === loginFormatado ||
            (u.pinAcesso && (u.pinAcesso === pin || u.pinAcesso === senha || u.pinAcesso === loginFormatado)) ||
            (u.email && u.email.toLowerCase() === loginFormatado))
      );

      if (usuarioLocal) {
        usuarioLocal.ultimoAcesso = new Date().toISOString();
        return res.json({
          sucesso: true,
          usuario: usuarioLocal,
          token: `jwt_local_demo_${usuarioLocal.id}_${Date.now()}`,
          modo: 'LOCAL_DEV',
        });
      }

      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu login, e-mail ou PIN.' });
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      res.status(500).json({ error: 'Erro interno na autenticação.' });
    }
  });

  app.post('/api/auth/esqueci-senha', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório para recuperação' });
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.APP_URL}/auth/reset-password`, // Assumindo uma rota de reset
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({
        sucesso: true,
        mensagem: `Um link seguro de redefinição de senha foi enviado para ${email}. Verifique sua caixa de entrada e spam.`,
      });
    } catch (err: any) {
      console.error('[Auth] Reset password error:', err);
      res.status(500).json({ error: 'Erro interno ao processar recuperação de senha.' });
    }
  });

  // 2. Bairros e Taxas de Entrega
  app.get('/api/bairros', async (req, res) => {
    const bList = await getFreshBairros();
    const empId = getTargetEmpresaId(req);
    const resultado = empId ? bList.filter((b) => (b.empresaId || 'emp1') === empId) : bList;
    res.json(resultado);
  });

  app.post('/api/bairros', async (req, res) => {
    const empId = getTargetEmpresaId(req) || 'emp1';
    const { nome, taxaEntrega, tempoMedioMin, ativo = true } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome do bairro é obrigatório' });

    const novoBairro: BairroTaxa = {
      id: `b_${Date.now()}`,
      empresaId: empId,
      nome: String(nome).trim(),
      taxaEntrega: Number(taxaEntrega) || 0,
      tempoMedioMin: Number(tempoMedioMin) || 20,
      ativo: Boolean(ativo),
    };
    bairros.push(novoBairro);

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('bairros_taxas').upsert([{
          id: novoBairro.id,
          empresa_id: novoBairro.empresaId,
          nome: novoBairro.nome,
          taxa_entrega: novoBairro.taxaEntrega,
          taxa: novoBairro.taxaEntrega,
          tempo_medio_min: novoBairro.tempoMedioMin,
          prazo_estimado: novoBairro.tempoMedioMin,
          ativo: novoBairro.ativo,
          status: novoBairro.ativo ? 'ATIVO' : 'INATIVO'
        }]);
        
      }
    } catch (err: any) {
      console.warn('[Supabase Sync] Erro bairro:', err?.message || err);
    }

    res.status(201).json(novoBairro);
  });

  app.put('/api/bairros/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const bairro = bairros.find((b) => b.id === id);
    if (!bairro) return res.status(404).json({ error: 'Bairro não encontrado' });
    if (empId && bairro.empresaId && bairro.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este bairro pertence a outra empresa.' });
    }

    const { nome, taxaEntrega, tempoMedioMin, ativo } = req.body;
    if (nome !== undefined) bairro.nome = String(nome).trim();
    if (taxaEntrega !== undefined) bairro.taxaEntrega = Number(taxaEntrega);
    if (tempoMedioMin !== undefined) bairro.tempoMedioMin = Number(tempoMedioMin);
    if (ativo !== undefined) bairro.ativo = Boolean(ativo);

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('bairros_taxas').update({
          nome: bairro.nome,
          taxa_entrega: bairro.taxaEntrega,
          taxa: bairro.taxaEntrega,
          tempo_medio_min: bairro.tempoMedioMin,
          prazo_estimado: bairro.tempoMedioMin,
          ativo: bairro.ativo,
          status: bairro.ativo ? 'ATIVO' : 'INATIVO'
        }).eq('id', id);
      }
    } catch (err: any) {
      console.warn('[Supabase Sync] Erro update bairro:', err?.message || err);
    }

    res.json(bairro);
  });

  app.delete('/api/bairros/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const index = bairros.findIndex((b) => b.id === id);
    if (index === -1) return res.status(404).json({ error: 'Bairro não encontrado' });
    if (empId && bairros[index].empresaId && bairros[index].empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este bairro pertence a outra empresa.' });
    }

    const [removido] = bairros.splice(index, 1);
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('bairros_taxas').delete().eq('id', id);
      }
    } catch (err: any) {}
    res.json({ sucesso: true, bairro: removido });
  });

  // 3. Produtos e Estoque de Vasilhames
  app.get('/api/produtos', async (req, res) => {
    const pList = await getFreshProdutos();
    const empId = getTargetEmpresaId(req);
    const resultado = empId ? pList.filter((p) => (p.empresaId || 'emp1') === empId) : pList;
    res.json(resultado);
  });

  app.post('/api/produtos', async (req, res) => {
    const dados = req.body;
    if (!dados.nome) {
      return res.status(400).json({ error: 'Nome do produto é obrigatório' });
    }
    const empId = getTargetEmpresaId(req) || dados.empresaId || 'emp1';

    const novoProduto: Produto = {
      id: dados.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      empresaId: empId,
      codigo: dados.codigo || `PROD-${Math.floor(1000 + Math.random() * 9000)}`,
      nome: dados.nome,
      marca: dados.marca || 'Genérica',
      unidadeMedida: dados.unidadeMedida || 'UN',
      categoria: dados.categoria || 'CONVENIENCIA',
      tipoVasilhame: dados.tipoVasilhame || 'NENHUM',
      precoRecarga: typeof dados.precoRecarga === 'number' ? dados.precoRecarga : Number(dados.preco) || 0,
      precoCompleto:
        typeof dados.precoCompleto === 'number'
          ? dados.precoCompleto
          : typeof dados.precoRecarga === 'number'
          ? dados.precoRecarga
          : Number(dados.preco) || 0,
      estoqueCheio: Number(dados.estoqueCheio) || 0,
      estoqueVazio: Number(dados.estoqueVazio) || 0,
      estoqueMinimo: Number(dados.estoqueMinimo) || 5,
      permiteVendaCasco: dados.permiteVendaCasco ?? (dados.tipoVasilhame && dados.tipoVasilhame !== 'NENHUM'),
      maisUtilizado: Boolean(dados.maisUtilizado),
      vendasCount: Number(dados.vendasCount) || 0,
    };

    produtos.push(novoProduto);

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('produtos').upsert([{
          id: novoProduto.id,
          empresa_id: novoProduto.empresaId,
          codigo: novoProduto.codigo,
          nome: novoProduto.nome,
          marca: novoProduto.marca,
          unidade_medida: novoProduto.unidadeMedida,
          categoria: novoProduto.categoria,
          tipo_vasilhame: novoProduto.tipoVasilhame,
          preco_recarga: novoProduto.precoRecarga,
          preco_completo: novoProduto.precoCompleto,
          estoque_cheio: novoProduto.estoqueCheio,
          estoque_atual: novoProduto.estoqueCheio,
          estoque_vazio: novoProduto.estoqueVazio,
          estoque_minimo: novoProduto.estoqueMinimo,
          ativo: true
        }]);
        
      }
    } catch (err: any) {
      console.warn('[Supabase Sync] Erro produto:', err?.message || err);
    }

    res.status(201).json(novoProduto);
  });

  app.put('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const dados = req.body;
    const prod = produtos.find((p) => p.id === id);
    if (!prod) return res.status(404).json({ error: 'Produto não encontrado' });
    if (empId && prod.empresaId && prod.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este produto pertence a outra empresa.' });
    }

    if (dados.nome !== undefined) prod.nome = dados.nome;
    if (dados.codigo !== undefined) prod.codigo = dados.codigo;
    if (dados.marca !== undefined) prod.marca = dados.marca;
    if (dados.unidadeMedida !== undefined) prod.unidadeMedida = dados.unidadeMedida;
    if (dados.categoria !== undefined) prod.categoria = dados.categoria;
    if (dados.tipoVasilhame !== undefined) prod.tipoVasilhame = dados.tipoVasilhame;
    if (dados.precoRecarga !== undefined) prod.precoRecarga = Number(dados.precoRecarga);
    if (dados.precoCompleto !== undefined) prod.precoCompleto = Number(dados.precoCompleto);
    if (dados.estoqueCheio !== undefined) prod.estoqueCheio = Math.max(0, Number(dados.estoqueCheio));
    if (dados.estoqueVazio !== undefined) prod.estoqueVazio = Math.max(0, Number(dados.estoqueVazio));
    if (dados.estoqueMinimo !== undefined) prod.estoqueMinimo = Math.max(0, Number(dados.estoqueMinimo));
    if (dados.permiteVendaCasco !== undefined) prod.permiteVendaCasco = Boolean(dados.permiteVendaCasco);
    if (dados.maisUtilizado !== undefined) prod.maisUtilizado = Boolean(dados.maisUtilizado);

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('produtos').update({
          nome: prod.nome,
          codigo: prod.codigo,
          marca: prod.marca,
          unidade_medida: prod.unidadeMedida,
          categoria: prod.categoria,
          tipo_vasilhame: prod.tipoVasilhame,
          preco_recarga: prod.precoRecarga,
          preco_completo: prod.precoCompleto,
          estoque_cheio: prod.estoqueCheio,
          estoque_atual: prod.estoqueCheio,
          estoque_vazio: prod.estoqueVazio,
          estoque_minimo: prod.estoqueMinimo,
        }).eq('id', id);
      }
    } catch (err: any) {}

    res.json(prod);
  });

  app.put('/api/produtos/:id/toggle-favorito', (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const prod = produtos.find((p) => p.id === id);
    if (!prod) return res.status(404).json({ error: 'Produto não encontrado' });
    if (empId && prod.empresaId && prod.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este produto pertence a outra empresa.' });
    }

    prod.maisUtilizado = !prod.maisUtilizado;
    res.json(prod);
  });

  // Batch ERP Product Import API
  const handleImportacaoProdutos = (req: any, res: any) => {
    const itens = req.body.itens || req.body.produtos;
    const modoSubstituir = req.body.modoSubstituir;
    const empId = getTargetEmpresaId(req) || 'emp1';

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Lista de produtos para importação está vazia ou inválida.' });
    }

    if (modoSubstituir) {
      // Se solicitado modo substituir, remove apenas produtos da empresa ativa
      for (let i = produtos.length - 1; i >= 0; i--) {
        if ((produtos[i].empresaId || 'emp1') === empId) {
          produtos.splice(i, 1);
        }
      }
    }

    let adicionados = 0;
    let atualizados = 0;

    itens.forEach((item: any) => {
      if (!item.nome) return;

      const nomeLimpo = String(item.nome).trim();
      const codigoLimpo = item.codigo ? String(item.codigo).trim().toUpperCase() : '';

      // Tenta achar por código ou nome aproximado dentro da mesma empresa
      const prodExistente = produtos.find(
        (p) => (p.empresaId || 'emp1') === empId && ((codigoLimpo && p.codigo.toUpperCase() === codigoLimpo) || p.nome.toLowerCase() === nomeLimpo.toLowerCase())
      );

      const precoRecarga =
        typeof item.precoRecarga === 'number'
          ? item.precoRecarga
          : typeof item.preco === 'number'
          ? item.preco
          : parseFloat(String(item.preco || item.precoRecarga || 0).replace(',', '.')) || 0;

      const precoCompleto =
        typeof item.precoCompleto === 'number'
          ? item.precoCompleto
          : item.permiteVendaCasco || item.tipoVasilhame === 'P13' || item.tipoVasilhame === 'P20L'
          ? precoRecarga * 2.5
          : precoRecarga;

      const categoria = item.categoria || 'CONVENIENCIA';
      const tipoVasilhame = item.tipoVasilhame || 'NENHUM';
      const unidadeMedida = item.unidadeMedida || 'UN';
      const marca = item.marca || 'Conveniência';

      if (prodExistente) {
        prodExistente.nome = nomeLimpo;
        if (item.marca) prodExistente.marca = marca;
        if (item.unidadeMedida) prodExistente.unidadeMedida = unidadeMedida;
        if (item.categoria) prodExistente.categoria = categoria;
        if (item.tipoVasilhame) prodExistente.tipoVasilhame = tipoVasilhame;
        prodExistente.precoRecarga = precoRecarga;
        prodExistente.precoCompleto = precoCompleto;
        if (typeof item.estoqueCheio === 'number') prodExistente.estoqueCheio = item.estoqueCheio;
        if (typeof item.estoqueVazio === 'number') prodExistente.estoqueVazio = item.estoqueVazio;
        if (typeof item.estoqueMinimo === 'number') prodExistente.estoqueMinimo = item.estoqueMinimo;
        if (typeof item.maisUtilizado === 'boolean') prodExistente.maisUtilizado = item.maisUtilizado;
        atualizados++;
      } else {
        const novoProduto: Produto = {
          id: `prod_erp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          empresaId: empId,
          codigo: codigoLimpo || `ERP-${Math.floor(10000 + Math.random() * 90000)}`,
          nome: nomeLimpo,
          marca,
          unidadeMedida,
          categoria,
          tipoVasilhame,
          precoRecarga,
          precoCompleto,
          estoqueCheio: Number(item.estoqueCheio ?? item.estoque ?? 20),
          estoqueVazio: Number(item.estoqueVazio ?? 0),
          estoqueMinimo: Number(item.estoqueMinimo ?? 5),
          permiteVendaCasco: item.permiteVendaCasco ?? (tipoVasilhame !== 'NENHUM'),
          maisUtilizado: Boolean(item.maisUtilizado),
          vendasCount: 0,
        };
        produtos.push(novoProduto);
        adicionados++;
      }
    });

    const prodsTenant = produtos.filter((p) => (p.empresaId || 'emp1') === empId);
    res.json({
      sucesso: true,
      mensagem: `Importação concluída: ${adicionados} adicionados, ${atualizados} atualizados.`,
      adicionados,
      atualizados,
      totalCatalogo: prodsTenant.length,
      produtos: prodsTenant,
    });
  };

  app.post('/api/produtos/importar', handleImportacaoProdutos);
  app.post('/api/produtos/importar-erp', handleImportacaoProdutos);

  app.delete('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const index = produtos.findIndex((p) => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Produto não encontrado' });
    if (empId && produtos[index].empresaId && produtos[index].empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este produto pertence a outra empresa.' });
    }

    produtos.splice(index, 1);
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('produtos').delete().eq('id', id);
      }
    } catch (err: any) {}
    res.json({ sucesso: true });
  });

  app.put('/api/produtos/:id/estoque', (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const { estoqueCheio, estoqueVazio, motivo, usuarioResponsavel } = req.body;
    const prod = produtos.find((p) => p.id === id);
    if (!prod) return res.status(404).json({ error: 'Produto não encontrado' });
    if (empId && prod.empresaId && prod.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este produto pertence a outra empresa.' });
    }

    const deltaCheio = typeof estoqueCheio === 'number' ? estoqueCheio - prod.estoqueCheio : 0;
    const deltaVazio = typeof estoqueVazio === 'number' ? estoqueVazio - prod.estoqueVazio : 0;

    registrarMovimentacaoEstoque({
      produtoId: prod.id,
      tipoMovimentacao: 'AJUSTE_MANUAL',
      deltaCheio,
      deltaVazio,
      usuarioResponsavel: usuarioResponsavel || 'Gerência',
      motivo: motivo || 'Ajuste direto no painel de produtos',
    });

    res.json(prod);
  });

  // 3.1 Histórico & Ledger de Movimentações de Estoque e Vasilhames
  app.get('/api/estoque/movimentacoes', (req, res) => {
    const empId = getTargetEmpresaId(req);
    const { produtoId, tipoVasilhame, tipoMovimentacao } = req.query as {
      produtoId?: string;
      tipoVasilhame?: string;
      tipoMovimentacao?: string;
    };

    let lista = empId ? movimentacoesEstoque.filter((m) => (m.empresaId || 'emp1') === empId) : [...movimentacoesEstoque];
    if (produtoId) lista = lista.filter((m) => m.produtoId === produtoId);
    if (tipoVasilhame) lista = lista.filter((m) => m.tipoVasilhame === tipoVasilhame);
    if (tipoMovimentacao) lista = lista.filter((m) => m.tipoMovimentacao === tipoMovimentacao);

    res.json(lista);
  });

  // 3.2 Ajuste Manual / Entrada de Carga de Vasilhames & Gás
  app.post('/api/estoque/ajustar', (req, res) => {
    const { produtoId, tipoMovimentacao, quantidadeCheio, quantidadeVazio, motivo, usuarioResponsavel } = req.body;
    const empId = getTargetEmpresaId(req);
    const prod = produtos.find((p) => p.id === produtoId);
    if (!prod) return res.status(404).json({ error: 'Produto não encontrado' });
    if (empId && prod.empresaId && prod.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este produto pertence a outra empresa.' });
    }

    const qtdCheio = Number(quantidadeCheio) || 0;
    const qtdVazio = Number(quantidadeVazio) || 0;

    const deltaCheio = tipoMovimentacao === 'ENTRADA' ? qtdCheio : -qtdCheio;
    const deltaVazio = tipoMovimentacao === 'ENTRADA' ? -qtdVazio : qtdVazio;

    const mov = registrarMovimentacaoEstoque({
      produtoId: prod.id,
      tipoMovimentacao: tipoMovimentacao || 'AJUSTE_MANUAL',
      deltaCheio,
      deltaVazio,
      usuarioResponsavel: usuarioResponsavel || 'Gerência',
      motivo: motivo || 'Ajuste manual de estoque',
    });

    res.json({ sucesso: true, produto: prod, movimentacao: mov });
  });

  // 4. Clientes (Busca rápida por telefone/nome no PDV)
  app.get('/api/clientes', async (req, res) => {
    const cList = await getFreshClientes();
    const empId = getTargetEmpresaId(req);
    const resultado = empId ? cList.filter((c) => (c.empresaId || 'emp1') === empId) : cList;
    res.json(resultado);
  });

  app.get('/api/clientes/buscar', async (req, res) => {
    const cList = await getFreshClientes();
    const empId = getTargetEmpresaId(req);
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    let base = empId ? cList.filter((c) => (c.empresaId || 'emp1') === empId) : cList;
    if (!q) return res.json(base);

    const filtrados = base.filter(
      (c) =>
        c.telefone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        c.nome.toLowerCase().includes(q) ||
        c.endereco.toLowerCase().includes(q)
    );
    res.json(filtrados);
  });

  app.post('/api/clientes', async (req, res) => {
    const dados = req.body;
    const empId = getTargetEmpresaId(req) || dados.empresaId || 'emp1';
    const bairro = bairros.find((b) => b.id === dados.bairroId) || bairros[0];
    const novoCliente: Cliente = {
      id: dados.id || `c_${Date.now()}`,
      empresaId: empId,
      nome: dados.nome,
      telefone: dados.telefone,
      cpfCnpj: dados.cpfCnpj || '',
      email: dados.email || '',
      cep: dados.cep || '',
      endereco: dados.endereco,
      numero: dados.numero,
      complemento: dados.complemento || '',
      bairroId: bairro ? bairro.id : 'b1',
      bairroNome: bairro ? bairro.nome : 'Centro',
      cidade: dados.cidade || 'São Paulo',
      estado: dados.estado || 'SP',
      referencia: dados.referencia || '',
      lat: dados.lat || -23.55052,
      lng: dados.lng || -46.633308,
      saldoDevedor: 0,
      totalPedidos: 0,
      vasilhamesPendentes: { P13: 0, P20L: 0 },
    };
    clientes.push(novoCliente);

    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error: upsertErr } = await supabase.from('clientes').upsert([{
          id: novoCliente.id,
          empresa_id: novoCliente.empresaId,
          nome: novoCliente.nome,
          telefone: novoCliente.telefone,
          cpf_cnpj: novoCliente.cpfCnpj,
          email: novoCliente.email,
          cep: novoCliente.cep,
          endereco: novoCliente.endereco,
          numero: novoCliente.numero,
          complemento: novoCliente.complemento,
          bairro_id: novoCliente.bairroId,
          bairro_nome: novoCliente.bairroNome,
          cidade: novoCliente.cidade,
          estado: novoCliente.estado,
          referencia: novoCliente.referencia,
          lat: novoCliente.lat,
          lng: novoCliente.lng,
        }]);
        if (upsertErr) console.error("[Supabase Sync] Erro no UPSERT Cliente:", upsertErr);
      }
    } catch (err: any) {
      console.warn('[Supabase Sync] Erro cliente:', err?.message || err);
    }

    res.status(201).json(novoCliente);
  });

  app.put('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const cliente = clientes.find((c) => c.id === id);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    if (empId && cliente.empresaId && cliente.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este cliente pertence a outra empresa.' });
    }

    const dados = req.body;
    if (dados.nome !== undefined) cliente.nome = dados.nome;
    if (dados.telefone !== undefined) cliente.telefone = dados.telefone;
    if (dados.cpfCnpj !== undefined) cliente.cpfCnpj = dados.cpfCnpj;
    if (dados.email !== undefined) cliente.email = dados.email;
    if (dados.cep !== undefined) cliente.cep = dados.cep;
    if (dados.endereco !== undefined) cliente.endereco = dados.endereco;
    if (dados.numero !== undefined) cliente.numero = dados.numero;
    if (dados.complemento !== undefined) cliente.complemento = dados.complemento;
    if (dados.cidade !== undefined) cliente.cidade = dados.cidade;
    if (dados.estado !== undefined) cliente.estado = dados.estado;
    if (dados.bairroId !== undefined) {
      const b = bairros.find((bx) => bx.id === dados.bairroId);
      if (b) {
        cliente.bairroId = b.id;
        cliente.bairroNome = b.nome;
      }
    }
    if (dados.referencia !== undefined) cliente.referencia = dados.referencia;
    if (dados.lat !== undefined) cliente.lat = dados.lat;
    if (dados.lng !== undefined) cliente.lng = dados.lng;
    if (dados.saldoDevedor !== undefined) cliente.saldoDevedor = Number(dados.saldoDevedor);
    if (dados.vasilhamesPendentes !== undefined) {
      cliente.vasilhamesPendentes = {
        P13: Number(dados.vasilhamesPendentes.P13 || 0),
        P20L: Number(dados.vasilhamesPendentes.P20L || 0),
      };
    }

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('clientes').update({
          nome: cliente.nome,
          telefone: cliente.telefone,
          cpf_cnpj: cliente.cpfCnpj,
          email: cliente.email,
          cep: cliente.cep,
          endereco: cliente.endereco,
          numero: cliente.numero,
          complemento: cliente.complemento,
          bairro_id: cliente.bairroId,
          bairro_nome: cliente.bairroNome,
          cidade: cliente.cidade,
          estado: cliente.estado,
          referencia: cliente.referencia,
          lat: cliente.lat,
          lng: cliente.lng,
        }).eq('id', id);
      }
    } catch (err: any) {}

    res.json(cliente);
  });

  app.delete('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const index = clientes.findIndex((c) => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Cliente não encontrado' });
    if (empId && clientes[index].empresaId && clientes[index].empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este cliente pertence a outra empresa.' });
    }

    const [removido] = clientes.splice(index, 1);
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('clientes').delete().eq('id', id);
      }
    } catch (err: any) {}
    res.json({ sucesso: true, cliente: removido });
  });

  // 5. Entregadores / Colaboradores
  app.get('/api/entregadores', async (req, res) => {
    const [eList, pList] = await Promise.all([getFreshEntregadores(), getFreshPedidos()]);
    const empId = getTargetEmpresaId(req);
    const lista = empId ? eList.filter((e) => (e.empresaId || 'emp1') === empId) : eList;
    // Recalcular contador de pedidos ativos
    lista.forEach((ent) => {
      ent.pedidosAtivosCount = pList.filter(
        (p) => (!empId || (p.empresaId || 'emp1') === empId) && p.entregadorId === ent.id && (p.status === 'EM_ROTA' || p.status === 'ENTREGUE')
      ).length;
    });
    res.json(lista);
  });

  app.post('/api/entregadores', async (req, res) => {
    const dados = req.body;
    if (!dados.nome) return res.status(400).json({ error: 'Nome do entregador é obrigatório' });
    const empId = getTargetEmpresaId(req) || dados.empresaId || 'emp1';

    const novoEntregador: Entregador = {
      id: dados.id || `e_${Date.now()}`,
      empresaId: empId,
      nome: dados.nome,
      telefone: dados.telefone || '(11) 90000-0000',
      veiculo: dados.veiculo || 'Moto (Padrão)',
      placa: (dados.placa || 'ABC-1234').toUpperCase(),
      status: dados.status || 'DISPONIVEL',
      pedidosAtivosCount: 0,
      bateriaNivel: Number(dados.bateriaNivel) || 100,
      ultimaSincronizacao: new Date().toISOString(),
      totalEntregasHoje: 0,
    };

    entregadores.push(novoEntregador);

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('entregadores').upsert([{
          id: novoEntregador.id,
          empresa_id: novoEntregador.empresaId,
          nome: novoEntregador.nome,
          telefone: novoEntregador.telefone,
          veiculo: novoEntregador.veiculo,
          placa: novoEntregador.placa,
          ativo: true
        }]);
        
      }
    } catch (err: any) {
      console.warn('[Supabase Sync] Erro entregador:', err?.message || err);
    }

    res.status(201).json(novoEntregador);
  });

  app.put('/api/entregadores/:id', (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const ent = entregadores.find((e) => e.id === id);
    if (!ent) return res.status(404).json({ error: 'Entregador não encontrado' });
    if (empId && ent.empresaId && ent.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este entregador pertence a outra empresa.' });
    }

    const dados = req.body;
    if (dados.nome !== undefined) ent.nome = dados.nome;
    if (dados.telefone !== undefined) ent.telefone = dados.telefone;
    if (dados.veiculo !== undefined) ent.veiculo = dados.veiculo;
    if (dados.placa !== undefined) ent.placa = dados.placa.toUpperCase();
    if (dados.status !== undefined) ent.status = dados.status;
    if (dados.bateriaNivel !== undefined) ent.bateriaNivel = Number(dados.bateriaNivel);

    res.json(ent);
  });

  app.delete('/api/entregadores/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const index = entregadores.findIndex((e) => e.id === id);
    if (index === -1) return res.status(404).json({ error: 'Entregador não encontrado' });
    if (empId && entregadores[index].empresaId && entregadores[index].empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este entregador pertence a outra empresa.' });
    }

    const [removido] = entregadores.splice(index, 1);
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('entregadores').delete().eq('id', id);
      }
    } catch (err: any) {}
    res.json({ sucesso: true, entregador: removido });
  });

  // 5.1 Usuários e Gestão de Permissões
  app.get('/api/usuarios', async (req, res) => {
    const uList = await getFreshUsuarios();
    const empId = getTargetEmpresaId(req);
    if (empId) {
      res.json(uList.filter((u) => u.perfil === 'SUPER_ADMIN' || (u.empresaId || 'emp1') === empId));
    } else {
      res.json(uList);
    }
  });

  app.post('/api/usuarios', async (req, res) => {
    const dados = req.body;
    if (!dados.nome || !dados.login) {
      return res.status(400).json({ error: 'Nome e login são obrigatórios' });
    }
    const empId = getTargetEmpresaId(req);

    const defaultPermissoes = {
      ADMIN: {
        emitirPedidos: true,
        despacharPedidos: true,
        cancelarPedidos: true,
        editarPedidos: true,
        devolverPedidos: true,
        realizarAcertoCaixa: true,
        ajustarEstoque: true,
        verDashboardGerencial: true,
        acessarCadastros: true,
        gerenciarUsuarios: true,
        importarErp: true,
      },
      GERENTE: {
        emitirPedidos: true,
        despacharPedidos: true,
        cancelarPedidos: true,
        editarPedidos: true,
        devolverPedidos: true,
        realizarAcertoCaixa: true,
        ajustarEstoque: true,
        verDashboardGerencial: true,
        acessarCadastros: true,
        gerenciarUsuarios: false,
        importarErp: true,
      },
      ATENDENTE_PDV: {
        emitirPedidos: true,
        despacharPedidos: false,
        cancelarPedidos: false,
        editarPedidos: true,
        devolverPedidos: false,
        realizarAcertoCaixa: false,
        ajustarEstoque: false,
        verDashboardGerencial: false,
        acessarCadastros: true,
        gerenciarUsuarios: false,
        importarErp: false,
      },
      ENTREGADOR: {
        emitirPedidos: false,
        despacharPedidos: false,
        cancelarPedidos: false,
        editarPedidos: false,
        devolverPedidos: true,
        realizarAcertoCaixa: false,
        ajustarEstoque: false,
        verDashboardGerencial: false,
        acessarCadastros: false,
        gerenciarUsuarios: false,
        importarErp: false,
      },
    };

    const perfil = dados.perfil || 'ATENDENTE_PDV';
    const permissoesBase = defaultPermissoes[perfil as keyof typeof defaultPermissoes] || defaultPermissoes.ATENDENTE_PDV;

    const novoUsuario: Usuario = {
      id: dados.id || `u_${Date.now()}`,
      empresaId: perfil === 'SUPER_ADMIN' ? undefined : (empId || dados.empresaId || 'emp1'),
      nome: dados.nome,
      login: dados.login.toLowerCase().trim(),
      email: dados.email || '',
      telefone: dados.telefone || '',
      perfil,
      cargo: dados.cargo || (perfil === 'ADMIN' ? 'Administrador' : perfil === 'GERENTE' ? 'Gerente' : perfil === 'ENTREGADOR' ? 'Entregador' : 'Atendente'),
      ativo: dados.ativo ?? true,
      pinAcesso: dados.pinAcesso || '1234',
      entregadorIdVinculado: dados.entregadorIdVinculado,
      permissoes: dados.permissoes ? { ...permissoesBase, ...dados.permissoes } : permissoesBase,
      criadoEm: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString(),
    };

    usuarios.push(novoUsuario);

    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('usuarios').upsert([{
          id: novoUsuario.id,
          empresa_id: novoUsuario.empresaId,
          nome: novoUsuario.nome,
          login: novoUsuario.login,
          email: novoUsuario.email,
          perfil: novoUsuario.perfil,
          cargo: novoUsuario.cargo,
          ativo: novoUsuario.ativo,
          pin_acesso: novoUsuario.pinAcesso,
        }]);
        
      }
    } catch (err: any) {
      console.warn('[Supabase Sync] Erro usuario:', err?.message || err);
    }

    res.status(201).json(novoUsuario);
  });

  app.put('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const user = usuarios.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (empId && user.empresaId && user.empresaId !== empId && user.perfil !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso negado: este usuário pertence a outra empresa.' });
    }

    const dados = req.body;
    if (dados.nome !== undefined) user.nome = dados.nome;
    if (dados.login !== undefined) user.login = dados.login.toLowerCase().trim();
    if (dados.email !== undefined) user.email = dados.email;
    if (dados.telefone !== undefined) user.telefone = dados.telefone;
    if (dados.cargo !== undefined) user.cargo = dados.cargo;
    if (dados.perfil !== undefined) user.perfil = dados.perfil;
    if (dados.ativo !== undefined) user.ativo = Boolean(dados.ativo);
    if (dados.pinAcesso !== undefined) user.pinAcesso = dados.pinAcesso;
    if (dados.entregadorIdVinculado !== undefined) user.entregadorIdVinculado = dados.entregadorIdVinculado;
    if (dados.permissoes !== undefined) {
      user.permissoes = { ...user.permissoes, ...dados.permissoes };
    }

    res.json(user);
  });

  app.put('/api/usuarios/:id/toggle-ativo', (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const user = usuarios.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (empId && user.empresaId && user.empresaId !== empId && user.perfil !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso negado: este usuário pertence a outra empresa.' });
    }

    user.ativo = !user.ativo;
    res.json(user);
  });

  app.delete('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const index = usuarios.findIndex((u) => u.id === id);
    if (index === -1) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (empId && usuarios[index].empresaId && usuarios[index].empresaId !== empId && usuarios[index].perfil !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Acesso negado: este usuário pertence a outra empresa.' });
    }

    const [removido] = usuarios.splice(index, 1);
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('usuarios').delete().eq('id', id);
      }
    } catch (err: any) {}
    res.json({ sucesso: true, usuario: removido });
  });

  app.post('/api/usuarios/login-pin', (req, res) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN não informado' });

    const user = usuarios.find((u) => u.ativo && u.pinAcesso === String(pin).trim());
    if (!user) {
      return res.status(401).json({ error: 'PIN inválido ou usuário inativo' });
    }

    user.ultimoAcesso = new Date().toISOString();
    res.json({ sucesso: true, usuario: user });
  });

  // 6. Pedidos
  app.get('/api/pedidos', async (req, res) => {
    const pList = await getFreshPedidos();
    const empId = getTargetEmpresaId(req);
    const status = req.query.status as string;
    const entregadorId = req.query.entregadorId as string;

    let resultado = empId ? pList.filter((p) => (p.empresaId || 'emp1') === empId) : [...pList];
    if (status) {
      resultado = resultado.filter((p) => p.status === status);
    }
    if (entregadorId) {
      resultado = resultado.filter((p) => p.entregadorId === entregadorId);
    }

    res.json(resultado);
  });

  // 6.1 Obter Detalhes de um Pedido Específico
  app.get('/api/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    const pList = await getFreshPedidos();
    const empId = getTargetEmpresaId(req);
    const pedido = pList.find((p) => p.id === id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (empId && pedido.empresaId && pedido.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este pedido pertence a outra empresa.' });
    }
    res.json(pedido);
  });

  // 6.2 Gerência: Atualizar e Corrigir Pedido (Edição pelo Gerente)
  app.put('/api/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (empId && pedido.empresaId && pedido.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este pedido pertence a outra empresa.' });
    }

    const {
      cliente,
      clienteId,
      itens,
      taxaEntrega,
      desconto,
      formaPagamentoPrevista,
      pagamentosPrevistos,
      formaPagamentoRealizada,
      pagamentosRealizados,
      trocoPara,
      valorRecebido,
      observacoes,
      tipoEntrega,
      dataHoraEntregaAgendada,
      previsaoMinutos,
      status,
      entregadorId,
      motivoAjuste,
    } = req.body;

    // Atualiza cliente se fornecido
    if (cliente) {
      pedido.cliente = { ...pedido.cliente, ...cliente };
      pedido.clienteId = cliente.id || pedido.clienteId;
      const cliIndex = clientes.findIndex((c) => c.id === pedido.clienteId);
      if (cliIndex !== -1) {
        clientes[cliIndex] = { ...clientes[cliIndex], ...cliente };
      }
    } else if (clienteId) {
      const cli = clientes.find((c) => c.id === clienteId);
      if (cli) {
        pedido.clienteId = cli.id;
        pedido.cliente = cli;
      }
    }

    // Se itens foram alterados, recalcula
    if (Array.isArray(itens)) {
      let subtotal = 0;
      const itensProcessados: ItemPedido[] = itens.map((item: any, idx: number) => {
        const prod = produtos.find((p) => p.id === item.produtoId);
        const precoUnit = typeof item.precoUnitario === 'number' ? item.precoUnitario : (prod?.precoRecarga || 0);
        const qtd = Number(item.quantidade) || 1;
        const itemSubtotal = precoUnit * qtd;
        subtotal += itemSubtotal;

        const precisaCasco = item.tipoVenda === 'RECARGA' && prod && prod.tipoVasilhame !== 'NENHUM';

        return {
          id: item.id || `it_${Date.now()}_${idx}`,
          produtoId: item.produtoId,
          nomeProduto: item.nomeProduto || prod?.nome || 'Item',
          categoria: item.categoria || prod?.categoria || 'OUTROS',
          tipoVasilhame: item.tipoVasilhame || prod?.tipoVasilhame || 'NENHUM',
          tipoVenda: item.tipoVenda || 'RECARGA',
          quantidade: qtd,
          precoUnitario: precoUnit,
          subtotal: itemSubtotal,
          vasilhamesRecolhidosEsperados: precisaCasco ? qtd : 0,
          vasilhamesRecolhidosReais: item.vasilhamesRecolhidosReais ?? 0,
          vasilhamesPendentes: item.vasilhamesPendentes ?? 0,
        };
      });

      pedido.itens = itensProcessados;
      pedido.subtotal = subtotal;
    }

    if (typeof taxaEntrega === 'number') pedido.taxaEntrega = Math.max(0, taxaEntrega);
    if (typeof desconto === 'number') pedido.desconto = Math.max(0, desconto);
    pedido.total = Math.max(0, pedido.subtotal + pedido.taxaEntrega - pedido.desconto);

    if (formaPagamentoPrevista) pedido.formaPagamentoPrevista = formaPagamentoPrevista;
    if (pagamentosPrevistos !== undefined) pedido.pagamentosPrevistos = pagamentosPrevistos;
    if (formaPagamentoRealizada) pedido.formaPagamentoRealizada = formaPagamentoRealizada;
    if (pagamentosRealizados !== undefined) pedido.pagamentosRealizados = pagamentosRealizados;
    if (trocoPara !== undefined) pedido.trocoPara = trocoPara ? Number(trocoPara) : undefined;
    if (valorRecebido !== undefined) pedido.valorRecebido = valorRecebido ? Number(valorRecebido) : undefined;
    if (observacoes !== undefined) pedido.observacoes = observacoes;
    if (tipoEntrega !== undefined) pedido.tipoEntrega = tipoEntrega;
    if (dataHoraEntregaAgendada !== undefined) pedido.dataHoraEntregaAgendada = dataHoraEntregaAgendada;
    if (previsaoMinutos !== undefined) pedido.previsaoMinutos = previsaoMinutos;

    // Atualização de status e entregador
    const statusAnterior = pedido.status;
    if (status && status !== pedido.status) {
      pedido.status = status;
      if (status === 'EM_ROTA' && !pedido.despachadoEm) {
        pedido.despachadoEm = new Date().toISOString();
      } else if (status === 'ENTREGUE' && !pedido.entregueEm) {
        pedido.entregueEm = new Date().toISOString();
      } else if (status === 'CONCLUIDO' && !pedido.concluidoEm) {
        pedido.concluidoEm = new Date().toISOString();
      } else if (status === 'CANCELADO') {
        if (statusAnterior === 'EM_ROTA') {
          pedido.itens.forEach((it) => {
            const prod = produtos.find((pr) => pr.id === it.produtoId);
            if (prod) prod.estoqueCheio += it.quantidade;
          });
        }
      }
    }

    if (entregadorId !== undefined) {
      if (!entregadorId || entregadorId === '') {
        pedido.entregadorId = undefined;
        pedido.entregadorNome = undefined;
      } else {
        const ent = entregadores.find((e) => e.id === entregadorId);
        if (ent) {
          pedido.entregadorId = ent.id;
          pedido.entregadorNome = `${ent.nome} (${ent.veiculo})`;
        }
      }
    }

    pedido.versao += 1;

    if (motivoAjuste) {
      const dataHoraStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const registroAudit = `\n[Ajuste Gerencial ${dataHoraStr}]: ${motivoAjuste}`;
      pedido.observacoes = (pedido.observacoes || '') + registroAudit;
    }

    console.log(`[Gerência] Pedido ${pedido.codigo} atualizado pelo gerente.`);
    try {
      const supabase = getSupabase();
      if (supabase) {
         await supabase.from('pedidos').update({
            status: pedido.status,
            entregador_id: pedido.entregadorId || null,
            subtotal: pedido.subtotal,
            taxa_entrega: pedido.taxaEntrega,
            desconto: pedido.desconto,
            total: pedido.total,
            forma_pagamento_prevista: pedido.formaPagamentoPrevista,
            troco_para: pedido.trocoPara || null,
            observacoes: pedido.observacoes,
            versao: pedido.versao,
         }).eq('id', pedido.id);
      }
    } catch(e) {}
    res.json({ sucesso: true, pedido });
  });

  // 6.3 Cancelar Pedido (com estorno de estoque)
  app.post('/api/pedidos/:id/cancelar', (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const { motivo } = req.body;
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (empId && pedido.empresaId && pedido.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este pedido pertence a outra empresa.' });
    }

    const statusAnterior = pedido.status;
    pedido.status = 'CANCELADO';
    pedido.versao += 1;

    if (statusAnterior === 'EM_ROTA') {
      pedido.itens.forEach((it) => {
        const prod = produtos.find((pr) => pr.id === it.produtoId);
        if (prod) prod.estoqueCheio += it.quantidade;
      });
    }

    const registroCancel = `\n[CANCELADO GERENTE ${new Date().toLocaleTimeString()}]: ${motivo || 'Cancelado pelo gerente'}`;
    pedido.observacoes = (pedido.observacoes || '') + registroCancel;

    if (pedido.entregadorId) {
      dispararNotificacaoPush({
        entregadorId: pedido.entregadorId,
        titulo: `⚠️ Pedido ${pedido.codigo} Cancelado`,
        corpo: `O gerente cancelou o pedido de ${pedido.cliente.nome}. Não prossiga com a entrega.`,
        tipo: 'CANCELAMENTO',
        pedidoId: pedido.id,
        pedidoCodigo: pedido.codigo,
        prioridade: 'ALTA',
      });
    }

    try {
      const supabase = getSupabase();
      if (supabase) {
         supabase.from('pedidos').update({
            status: pedido.status,
            versao: pedido.versao,
            observacoes: pedido.observacoes
         }).eq('id', pedido.id).then(({error}) => { if(error) console.log(error); });
      }
    } catch(e) {}

    res.json({ sucesso: true, pedido });
  });

  // 6.4 Reabrir Pedido Cancelado
  app.post('/api/pedidos/:id/reabrir', (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (empId && pedido.empresaId && pedido.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este pedido pertence a outra empresa.' });
    }

    pedido.status = 'PENDENTE';
    pedido.entregadorId = undefined;
    pedido.entregadorNome = undefined;
    pedido.versao += 1;
    pedido.observacoes = (pedido.observacoes || '') + `\n[REABERTO GERENTE ${new Date().toLocaleTimeString()}]`;

    res.json({ sucesso: true, pedido });
  });

  // 6.5 Excluir Pedido
  app.delete('/api/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const index = pedidos.findIndex((p) => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (empId && pedidos[index].empresaId && pedidos[index].empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este pedido pertence a outra empresa.' });
    }

    const [removido] = pedidos.splice(index, 1);
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('pedidos').delete().eq('id', id);
      }
    } catch (err: any) {}
    res.json({ sucesso: true, pedido: removido });
  });

  // 7. PDV: Criar Novo Pedido
  app.post('/api/pdv/pedidos', async (req, res) => {
    try {
      const empId = getTargetEmpresaId(req) || req.body.empresaId || 'emp1';
      const {
        clienteId,
        clienteNovo,
        itens,
        taxaEntrega: taxaRecebida,
        formaPagamentoPrevista,
        pagamentosPrevistos,
        trocoPara,
        observacoes,
        tipoEntrega = 'IMEDIATA',
        dataHoraEntregaAgendada,
        previsaoMinutos,
        desconto = 0,
        emitidoPorId,
        emitidoPorNome,
        emitidoPorPerfil,
      } = req.body;

      let cliente = clientes.find((c) => c.id === clienteId && (c.empresaId || 'emp1') === empId);
      if (!cliente && clienteNovo) {
        const bairro = bairros.find((b) => b.id === clienteNovo.bairroId && (b.empresaId || 'emp1') === empId) || bairros.find((b) => (b.empresaId || 'emp1') === empId) || bairros[0];
        cliente = {
          id: `c_${Date.now()}`,
          empresaId: empId,
          nome: clienteNovo.nome,
          telefone: clienteNovo.telefone,
          endereco: clienteNovo.endereco,
          numero: clienteNovo.numero,
          complemento: clienteNovo.complemento || '',
          bairroId: bairro ? bairro.id : 'b1',
          bairroNome: bairro ? bairro.nome : 'Centro',
          referencia: clienteNovo.referencia || '',
          lat: clienteNovo.lat || -23.55052 + (Math.random() - 0.5) * 0.02,
          lng: clienteNovo.lng || -46.633308 + (Math.random() - 0.5) * 0.02,
          saldoDevedor: 0,
          totalPedidos: 1,
          vasilhamesPendentes: { P13: 0, P20L: 0 },
        };
        clientes.push(cliente);
      } else if (cliente) {
        cliente.totalPedidos += 1;
      }

      if (!cliente) {
        return res.status(400).json({ error: 'Cliente inválido ou não informado' });
      }

      const bairro = bairros.find((b) => b.id === cliente.bairroId) || bairros[0];
      const taxaEntrega = typeof taxaRecebida === 'number'
        ? Math.max(0, taxaRecebida)
        : (taxaRecebida !== undefined && taxaRecebida !== null
            ? Math.max(0, Number(taxaRecebida) || 0)
            : 0);

      let subtotal = 0;
      const itensProcessados: ItemPedido[] = (itens || []).map((item: any, idx: number) => {
        const prod = produtos.find((p) => p.id === item.produtoId);
        const precoUnit =
          item.tipoVenda === 'COMPLETO' && prod?.permiteVendaCasco
            ? prod.precoCompleto
            : prod?.precoRecarga || 0;
        const itemSubtotal = precoUnit * item.quantidade;
        subtotal += itemSubtotal;

        const precisaCasco = item.tipoVenda === 'RECARGA' && prod && prod.tipoVasilhame !== 'NENHUM';

        return {
          id: `it_${Date.now()}_${idx}`,
          produtoId: item.produtoId,
          nomeProduto: prod?.nome || 'Item',
          categoria: prod?.categoria || 'OUTROS',
          tipoVasilhame: prod?.tipoVasilhame || 'NENHUM',
          tipoVenda: item.tipoVenda,
          quantidade: item.quantidade,
          precoUnitario: precoUnit,
          subtotal: itemSubtotal,
          vasilhamesRecolhidosEsperados: precisaCasco ? item.quantidade : 0,
          vasilhamesRecolhidosReais: 0,
        };
      });

      const total = subtotal + taxaEntrega - desconto;

      const novoPedido: Pedido = {
        id: `ped_${Date.now()}`,
        empresaId: empId,
        codigo: `#${orderCounter++}`,
        clienteId: cliente.id,
        cliente,
        status: 'PENDENTE',
        itens: itensProcessados,
        subtotal,
        taxaEntrega,
        desconto,
        total,
        formaPagamentoPrevista: formaPagamentoPrevista || (pagamentosPrevistos && pagamentosPrevistos[0]?.forma) || 'DINHEIRO',
        pagamentosPrevistos: pagamentosPrevistos && pagamentosPrevistos.length > 0 ? pagamentosPrevistos : undefined,
        trocoPara: trocoPara ? Number(trocoPara) : undefined,
        observacoes,
        tipoEntrega,
        dataHoraEntregaAgendada,
        previsaoMinutos,
        emitidoPorId: emitidoPorId || 'u3',
        emitidoPorNome: emitidoPorNome || 'Atendente PDV',
        emitidoPorPerfil: emitidoPorPerfil || 'ATENDENTE_PDV',
        criadoEm: new Date().toISOString(),
        sincronizado: true,
        versao: 1,
      };

      pedidos.unshift(novoPedido);

      try {
        const supabase = getSupabase();
        if (supabase) {
          await supabase.from('pedidos').upsert([{
            id: novoPedido.id,
            empresa_id: novoPedido.empresaId,
            codigo: novoPedido.codigo,
            numero_pedido: novoPedido.codigo,
            cliente_id: novoPedido.clienteId,
            status: novoPedido.status,
            subtotal: novoPedido.subtotal,
            taxa_entrega: novoPedido.taxaEntrega,
            desconto: novoPedido.desconto,
            total: novoPedido.total,
            forma_pagamento_prevista: novoPedido.formaPagamentoPrevista,
            troco_para: novoPedido.trocoPara,
            observacoes: novoPedido.observacoes,
            emitido_por_id: novoPedido.emitidoPorId,
            emitido_por_nome: novoPedido.emitidoPorNome,
            emitido_por_perfil: novoPedido.emitidoPorPerfil,
            criado_em: novoPedido.criadoEm,
            sincronizado: true,
            versao: novoPedido.versao
          }]);
        
        }
      } catch (err: any) {
        console.warn('[Supabase Sync] Erro pedido:', err?.message || err);
      }

      res.status(201).json(novoPedido);
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 7.1 Devolução do Pedido pelo Entregador para Correção pelo Emitente
  app.post('/api/entregador/devolver-pedido', (req, res) => {
    const { pedidoId, entregadorId, motivoDevolucao, observacao } = req.body;
    const empId = getTargetEmpresaId(req);
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (empId && pedido.empresaId && pedido.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este pedido pertence a outra empresa.' });
    }

    const entregador = entregadores.find((e) => e.id === entregadorId) || {
      id: entregadorId || 'e1',
      nome: 'Entregador',
      veiculo: 'Moto',
    };

    // Estorna itens de volta ao estoque da base
    pedido.itens.forEach((item) => {
      const prod = produtos.find((pr) => pr.id === item.produtoId);
      if (prod) {
        prod.estoqueCheio += item.quantidade;
      }
    });

    pedido.status = 'DEVOLVIDO_CORRECAO';
    pedido.devolvidoParaCorrecao = true;
    pedido.motivoDevolucao = motivoDevolucao || 'Pedido devolvido pelo entregador para correção.';
    pedido.devolvidoEm = new Date().toISOString();
    pedido.devolvidoPorId = entregador.id;
    pedido.devolvidoPorNome = entregador.nome;
    pedido.versao += 1;

    const dataHoraStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const registroDevolucao = `\n[DEVOLVIDO P/ CORREÇÃO ${dataHoraStr} por ${entregador.nome}]: Motivo: ${pedido.motivoDevolucao}${
      observacao ? ` • Obs: ${observacao}` : ''
    }`;
    pedido.observacoes = (pedido.observacoes || '') + registroDevolucao;

    // Atualiza contagem do entregador
    const entObj = entregadores.find((e) => e.id === entregador.id);
    if (entObj) {
      entObj.pedidosAtivosCount = pedidos.filter(
        (p) => p.entregadorId === entObj.id && (p.status === 'EM_ROTA' || p.status === 'ENTREGUE')
      ).length;
    }

    try {
      const supabase = getSupabase();
      if (supabase) {
        supabase.from('pedidos').update({
          status: pedido.status,
          devolvido_para_correcao: pedido.devolvidoParaCorrecao,
          motivo_devolucao: pedido.motivoDevolucao,
          devolvido_em: pedido.devolvidoEm,
          devolvido_por_id: pedido.devolvidoPorId,
          devolvido_por_nome: pedido.devolvidoPorNome,
          observacoes: pedido.observacoes,
          versao: pedido.versao,
        }).eq('id', pedido.id).then(({error}) => { if(error) console.warn('[Supabase] Erro ao atualizar devolvido:', error); });

        // Atualiza estoque devolvido
        pedido.itens.forEach((item) => {
          const prod = produtos.find((pr) => pr.id === item.produtoId);
          if (prod) {
            supabase.from('produtos').update({ estoque_cheio: prod.estoqueCheio }).eq('id', prod.id).then();
          }
        });

        if (entObj) {
          supabase.from('entregadores').update({ pedidos_ativos_count: entObj.pedidosAtivosCount }).eq('id', entObj.id).then();
        }
      }
    } catch(e) {}

    console.log(`[Devolução] Pedido ${pedido.codigo} devolvido por ${entregador.nome}: ${motivoDevolucao}`);

    res.json({
      sucesso: true,
      mensagem: `Pedido ${pedido.codigo} devolvido com sucesso para correção pelo emitente.`,
      pedido,
    });
  });

  // 7.2 Correção e Reenvio do Pedido pelo Emitente / PDV / Gerente
  app.post('/api/pedidos/:id/corrigir-reenviar', (req, res) => {
    const { id } = req.params;
    const empId = getTargetEmpresaId(req);
    const pedido = pedidos.find((p) => p.id === id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (empId && pedido.empresaId && pedido.empresaId !== empId) {
      return res.status(403).json({ error: 'Acesso negado: este pedido pertence a outra empresa.' });
    }

    const {
      cliente,
      itens,
      taxaEntrega,
      desconto,
      formaPagamentoPrevista,
      trocoPara,
      observacoes,
      despacharDireto,
      entregadorId,
      corrigidoPorNome,
    } = req.body;

    if (cliente) {
      pedido.cliente = { ...pedido.cliente, ...cliente };
      const cliIdx = clientes.findIndex((c) => c.id === pedido.clienteId);
      if (cliIdx !== -1) {
        clientes[cliIdx] = { ...clientes[cliIdx], ...cliente };
      }
    }

    if (Array.isArray(itens)) {
      let subtotal = 0;
      pedido.itens = itens.map((item: any, idx: number) => {
        const prod = produtos.find((p) => p.id === item.produtoId);
        const precoUnit = typeof item.precoUnitario === 'number' ? item.precoUnitario : (prod?.precoRecarga || 0);
        const qtd = Number(item.quantidade) || 1;
        const itemSubtotal = precoUnit * qtd;
        subtotal += itemSubtotal;
        const precisaCasco = item.tipoVenda === 'RECARGA' && prod && prod.tipoVasilhame !== 'NENHUM';

        return {
          id: item.id || `it_${Date.now()}_${idx}`,
          produtoId: item.produtoId,
          nomeProduto: item.nomeProduto || prod?.nome || 'Item',
          categoria: item.categoria || prod?.categoria || 'OUTROS',
          tipoVasilhame: item.tipoVasilhame || prod?.tipoVasilhame || 'NENHUM',
          tipoVenda: item.tipoVenda || 'RECARGA',
          quantidade: qtd,
          precoUnitario: precoUnit,
          subtotal: itemSubtotal,
          vasilhamesRecolhidosEsperados: precisaCasco ? qtd : 0,
          vasilhamesRecolhidosReais: 0,
        };
      });
      pedido.subtotal = subtotal;
    }

    if (typeof taxaEntrega === 'number') pedido.taxaEntrega = Math.max(0, taxaEntrega);
    if (typeof desconto === 'number') pedido.desconto = Math.max(0, desconto);
    pedido.total = Math.max(0, pedido.subtotal + pedido.taxaEntrega - pedido.desconto);

    if (formaPagamentoPrevista) pedido.formaPagamentoPrevista = formaPagamentoPrevista;
    if (trocoPara !== undefined) pedido.trocoPara = trocoPara ? Number(trocoPara) : undefined;
    if (observacoes !== undefined) pedido.observacoes = observacoes;

    pedido.devolvidoParaCorrecao = false;
    pedido.versao += 1;

    const dataHoraStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const logCorrecao = `\n[CORRIGIDO PELO EMITENTE ${dataHoraStr} (${corrigidoPorNome || 'Atendente'})]: Dados ajustados e liberados.`;
    pedido.observacoes = (pedido.observacoes || '') + logCorrecao;

    if (despacharDireto && entregadorId) {
      const ent = entregadores.find((e) => e.id === entregadorId);
      if (ent) {
        pedido.entregadorId = ent.id;
        pedido.entregadorNome = `${ent.nome} (${ent.veiculo})`;
        pedido.status = 'EM_ROTA';
        pedido.despachadoEm = new Date().toISOString();
        // Deduz estoque
        pedido.itens.forEach((it) => {
          const pr = produtos.find((p) => p.id === it.produtoId);
          if (pr) pr.estoqueCheio = Math.max(0, pr.estoqueCheio - it.quantidade);
        });
      } else {
        pedido.status = 'PENDENTE';
        pedido.entregadorId = undefined;
        pedido.entregadorNome = undefined;
      }
    } else {
      pedido.status = 'PENDENTE';
      pedido.entregadorId = undefined;
      pedido.entregadorNome = undefined;
    }

    try {
      const supabase = getSupabase();
      if (supabase) {
        supabase.from('pedidos').update({
          status: pedido.status,
          entregador_id: pedido.entregadorId || null,
          subtotal: pedido.subtotal,
          taxa_entrega: pedido.taxaEntrega,
          desconto: pedido.desconto,
          total: pedido.total,
          forma_pagamento_prevista: pedido.formaPagamentoPrevista,
          troco_para: pedido.trocoPara,
          observacoes: pedido.observacoes,
          devolvido_para_correcao: false,
          despachado_em: pedido.despachadoEm || null,
          versao: pedido.versao,
        }).eq('id', pedido.id).then(({error}) => { if(error) console.warn('[Supabase] Erro ao atualizar pedido corrigido:', error); });

        if (pedido.status === 'EM_ROTA') {
          pedido.itens.forEach((it) => {
            const pr = produtos.find((p) => p.id === it.produtoId);
            if (pr) {
              supabase.from('produtos').update({ estoque_cheio: pr.estoqueCheio }).eq('id', pr.id).then();
            }
          });
        }
      }
    } catch(e) {}

    res.json({ sucesso: true, mensagem: 'Pedido corrigido com sucesso!', pedido });
  });

  // 8. Despacho: Atribuir Pedidos ao Entregador e Mudar para "EM_ROTA"
  app.post('/api/despacho/atribuir', async (req, res) => {
    const { pedidosIds, entregadorId, despachadoPor } = req.body;
    const empId = getTargetEmpresaId(req);
    const entregador = entregadores.find((e) => e.id === entregadorId && (!empId || (e.empresaId || 'emp1') === empId));

    if (!entregador) {
      return res.status(404).json({ error: 'Entregador não encontrado' });
    }

    const pedidosAtualizados: Pedido[] = [];

    pedidos.forEach((p) => {
      if (pedidosIds.includes(p.id) && (!empId || (p.empresaId || 'emp1') === empId)) {
        p.entregadorId = entregador.id;
        p.entregadorNome = `${entregador.nome} (${entregador.veiculo})`;
        p.status = 'EM_ROTA';
        p.despachadoEm = new Date().toISOString();
        p.despachadoPor = despachadoPor || 'Gerência';
        p.devolvidoParaCorrecao = false;
        p.versao += 1;

        // Deduz estoque cheio na base (passa para posse do entregador em trânsito)
        p.itens.forEach((item) => {
          const prod = produtos.find((pr) => pr.id === item.produtoId);
          if (prod) {
            prod.estoqueCheio = Math.max(0, prod.estoqueCheio - item.quantidade);
          }
        });

        pedidosAtualizados.push(p);
      }
    });

    entregador.status = 'EM_ROTA';
    entregador.pedidosAtivosCount = pedidos.filter(
      (p) => (!empId || (p.empresaId || 'emp1') === empId) && p.entregadorId === entregador.id && (p.status === 'EM_ROTA' || p.status === 'ENTREGUE')
    ).length;

    try {
      const supabase = getSupabase();
      if (supabase && pedidosAtualizados.length > 0) {
        // Atualiza pedidos em lote no supabase (apenas os campos necessários ou usar upsert)
        for (const p of pedidosAtualizados) {
           supabase.from('pedidos').update({
             entregador_id: p.entregadorId,
             status: p.status,
             despachado_em: p.despachadoEm,
             despachado_por: p.despachadoPor,
             devolvido_para_correcao: p.devolvidoParaCorrecao,
             versao: p.versao
           }).eq('id', p.id).then(({error}) => {
             if (error) console.warn('[Supabase] Erro ao atribuir pedido:', error);
           });
           
           // Se quiser abater estoque no db
           p.itens.forEach(item => {
             const prod = produtos.find(pr => pr.id === item.produtoId);
             if (prod) {
               supabase.from('produtos').update({ estoque_cheio: prod.estoqueCheio }).eq('id', prod.id).then();
             }
           });
        }
        
        // Update entregador
        supabase.from('entregadores').update({
           status: entregador.status,
           pedidos_ativos_count: entregador.pedidosAtivosCount
        }).eq('id', entregador.id).then();
      }
    } catch(e) {
      console.warn(e);
    }

    // Dispara Notificação Push para o Celular do Entregador (Supabase Realtime / Web Push)
    let notificacoesGeradas: NotificacaoPush[] = [];
    if (pedidosAtualizados.length > 0) {
      const primeiro = pedidosAtualizados[0];
      const bairrosUnicos = Array.from(new Set(pedidosAtualizados.map((p) => p.cliente.bairroNome))).join(', ');
      const totalValor = pedidosAtualizados.reduce((acc, p) => acc + p.total, 0);
      const resumoItens = pedidosAtualizados
        .flatMap((p) => p.itens.map((i) => `${i.quantidade}x ${i.nomeProduto}`))
        .slice(0, 3)
        .join(', ');

      const titulo =
        pedidosAtualizados.length === 1
          ? `🔔 Novo Pedido ${primeiro.codigo} Atribuído!`
          : `🔔 ${pedidosAtualizados.length} Novos Pedidos na sua Rota!`;

      const corpo =
        pedidosAtualizados.length === 1
          ? `${primeiro.cliente.nome} • ${primeiro.cliente.endereco}, ${primeiro.cliente.numero} (${primeiro.cliente.bairroNome}) • Total: R$ ${primeiro.total.toFixed(2)}`
          : `Total: R$ ${totalValor.toFixed(2)} • Bairros: ${bairrosUnicos} • ${resumoItens}...`;

      const notif = await dispararNotificacaoPush({
        entregadorId: entregador.id,
        titulo,
        corpo,
        tipo: 'NOVO_PEDIDO',
        pedidoId: primeiro.id,
        pedidoCodigo: primeiro.codigo,
        valorTotal: totalValor,
        bairroNome: bairrosUnicos,
        endereco: primeiro.cliente.endereco,
        itensResumo: resumoItens,
        prioridade: 'ALTA',
        canal: 'SUPABASE_REALTIME',
      });
      notificacoesGeradas.push(notif);
    }

    res.json({
      sucesso: true,
      mensagem: `${pedidosAtualizados.length} pedidos despachados para ${entregador.nome}`,
      pedidos: pedidosAtualizados,
      entregador,
      pushNotificacoes: notificacoesGeradas,
    });
  });

  // --------------------------------------------------------------------------
  // ROTAS DE NOTIFICAÇÕES PUSH (SUPABASE & WEB PUSH)
  // --------------------------------------------------------------------------

  // Obter Chave Pública VAPID para Inscrição no PWA (W3C Web Push)
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({
      publicKey: vapidKeys.publicKey,
      servidorPronto: Boolean(vapidKeys.publicKey),
    });
  });

  // Registrar Token de Notificação / Subscrição do Dispositivo
  app.post('/api/push/inscrever', async (req, res) => {
    const { entregadorId, endpoint, p256dh, authKey, plataforma, userAgent } = req.body;
    if (!entregadorId || !endpoint) {
      return res.status(400).json({ error: 'entregadorId e endpoint são obrigatórios' });
    }

    // Remove subscrição anterior duplicada se houver
    pushSubscriptions = pushSubscriptions.filter((s) => s.endpoint !== endpoint);

    const novaSub: PushSubscriptionData = {
      id: `sub_${Date.now()}`,
      entregadorId,
      endpoint,
      p256dh,
      authKey,
      userAgent: userAgent || '',
      plataforma: plataforma || 'WEB',
      ativo: true,
      criadoEm: new Date().toISOString(),
    };

    pushSubscriptions.push(novaSub);

    // Tenta persistir no Supabase
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('push_subscriptions').upsert([
          {
            id: novaSub.id,
            entregador_id: entregadorId,
            endpoint,
            p256dh,
            auth_key: authKey,
            user_agent: userAgent,
            plataforma: plataforma || 'WEB',
            ativo: true,
            atualizado_em: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      // Ignora erro em modo offline/demo
    }

    console.log(`[Push] Dispositivo registrado com sucesso para entregador ${entregadorId}`);
    res.json({ sucesso: true, subscription: novaSub });
  });
// Obter Histórico de Notificações Push do Entregador
  app.get('/api/push/historico/:entregadorId', (req, res) => {
    const { entregadorId } = req.params;
    const historico = pushNotificationsLog.filter((n) => n.entregadorId === entregadorId);
    res.json(historico);
  });

  // Marcar Notificação como Lida
  app.post('/api/push/marcar-lida/:id', (req, res) => {
    const { id } = req.params;
    const notif = pushNotificationsLog.find((n) => n.id === id);
    if (notif) {
      notif.lida = true;
    }
    res.json({ sucesso: true });
  });

  // Stream Server-Sent Events (SSE) para Notificações em Tempo Real no Navegador
  app.get('/api/push/stream', (req, res) => {
    const entregadorId = req.query.entregadorId as string;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Mensagem de boas-vindas na conexão
    res.write(`data: ${JSON.stringify({ tipo: 'CONECTADO', timestamp: new Date().toISOString() })}\n\n`);

    const client = { entregadorId, res };
    pushSSEClients.push(client);

    req.on('close', () => {
      const idx = pushSSEClients.indexOf(client);
      if (idx !== -1) pushSSEClients.splice(idx, 1);
    });
  });

  // 9. ROTA DE CARGA OFFLINE PARA O ENTREGADOR
  // Essa rota é chamada via Wi-Fi na base ou quando o entregador conecta.
  // Retorna os dados completos necessários para o app funcionar 100% offline.
  app.get('/api/entregador/:id/carga', (req, res) => {
    const { id } = req.params;
    const entregador = entregadores.find((e) => e.id === id);

    if (!entregador) {
      return res.status(404).json({ error: 'Entregador não encontrado' });
    }

    entregador.ultimaSincronizacao = new Date().toISOString();

    // Filtra pedidos em rota ou já entregues no turno ativo
    const pedidosCarga = pedidos.filter(
      (p) => p.entregadorId === id && (p.status === 'EM_ROTA' || p.status === 'ENTREGUE')
    );

    const payload = {
      entregador: {
        id: entregador.id,
        nome: entregador.nome,
        veiculo: entregador.veiculo,
        placa: entregador.placa,
      },
      pedidos: pedidosCarga,
      catalogoResumido: produtos.map((p) => ({
        id: p.id,
        nome: p.nome,
        tipoVasilhame: p.tipoVasilhame,
        precoRecarga: p.precoRecarga,
        precoCompleto: p.precoCompleto,
      })),
      timestampGeracao: new Date().toISOString(),
      versaoApi: '1.0.0',
    };

    res.json(payload);
  });

  // 10. ROTA DE SINCRONIZAÇÃO DE BAIXAS OFFLINE
  // Recebe um array de ações executadas offline pelo entregador na rua.
  // Garante idempotência e atualiza pedidos, pagamentos e vasilhames recolhidos.
  app.post('/api/entregador/sincronizar-baixas', async (req, res) => {
    const { entregadorId, itensSincronizacao } = req.body as {
      entregadorId: string;
      itensSincronizacao: SyncQueueItem[];
    };

    if (!Array.isArray(itensSincronizacao)) {
      return res.status(400).json({ error: 'Formato inválido de itens de sincronização' });
    }

    const entregador = entregadores.find((e) => e.id === entregadorId);
    if (entregador) {
      entregador.ultimaSincronizacao = new Date().toISOString();
    }

    const processados: Array<{ id: string; pedidoId: string; status: string; erro?: string }> = [];

    for (const syncItem of itensSincronizacao) {
      // 1. Verificar idempotência (evitar processar duas vezes a mesma ação offline)
      const jaProcessado = syncAuditLog.some((log) => log.idempotencyKey === syncItem.idempotencyKey);
      if (jaProcessado) {
        processados.push({ id: syncItem.id, pedidoId: syncItem.pedidoId, status: 'OK' });
        return;
      }

      const pedido = pedidos.find((p) => p.id === syncItem.pedidoId);
      if (!pedido) {
        processados.push({
          id: syncItem.id,
          pedidoId: syncItem.pedidoId,
          status: 'ERRO',
          erro: 'Pedido não encontrado no banco de dados',
        });
        return;
      }

      // 2. Aplicar as baixas nos pedidos
      pedido.status = 'ENTREGUE';
      pedido.formaPagamentoRealizada = syncItem.payload.formaPagamentoRealizada;
      if (syncItem.payload.pagamentosRealizados && syncItem.payload.pagamentosRealizados.length > 0) {
        pedido.pagamentosRealizados = syncItem.payload.pagamentosRealizados;
      }
      pedido.valorRecebido = syncItem.payload.valorRecebido;
      pedido.entregueEm = syncItem.timestampOffline;
      pedido.origemOffline = true;
      pedido.sincronizado = true;
      pedido.versao += 1;

      // 3. Atualizar vasilhames recolhidos nos itens
      pedido.itens.forEach((it) => {
        if (it.tipoVasilhame === 'P13') {
          it.vasilhamesRecolhidosReais = syncItem.payload.vasilhamesRecolhidos.P13;
          it.vasilhamesPendentes = syncItem.payload.vasilhamesPendentes.P13;
        } else if (it.tipoVasilhame === 'P20L') {
          it.vasilhamesRecolhidosReais = syncItem.payload.vasilhamesRecolhidos.P20L;
          it.vasilhamesPendentes = syncItem.payload.vasilhamesPendentes.P20L;
        }
      });

      // 4. Se houver vasilhames pendentes (fiado de casco), registra no cliente
      if (pedido.cliente) {
        pedido.cliente.vasilhamesPendentes.P13 += syncItem.payload.vasilhamesPendentes.P13 || 0;
        pedido.cliente.vasilhamesPendentes.P20L += syncItem.payload.vasilhamesPendentes.P20L || 0;
      }

      // 5. Registrar no log de auditoria
      syncAuditLog.push({
        id: syncItem.id,
        idempotencyKey: syncItem.idempotencyKey,
        entregadorId: syncItem.entregadorId,
        pedidoId: syncItem.pedidoId,
        timestampOffline: syncItem.timestampOffline,
        timestampServidor: new Date().toISOString(),
      });

      try {
        const supabase = getSupabase();
        if (supabase) {
          // Atualiza pedido no Supabase
          const { error: errUpdate } = await supabase.from('pedidos').update({
            status: pedido.status,
            entregue_em: pedido.entregueEm,
            sincronizado: true,
            versao: pedido.versao,
            observacoes: pedido.observacoes,
          }).eq('id', pedido.id);
          if (errUpdate) console.warn("[Supabase] Erro ao sincronizar baixa:", errUpdate);

          // Se houver clientes com fiado
          if (pedido.cliente && (syncItem.payload.vasilhamesPendentes.P13 > 0 || syncItem.payload.vasilhamesPendentes.P20L > 0)) {
             await supabase.from('clientes').update({
               vasilhames_pendentes: pedido.cliente.vasilhamesPendentes
             }).eq('id', pedido.cliente.id);
          }
        }
      } catch (e) {
        console.warn("[Supabase] Fallback ao DB offline", e);
      }

      processados.push({ id: syncItem.id, pedidoId: syncItem.pedidoId, status: 'OK' });
    }

    res.json({
      sucesso: true,
      timestampServidor: new Date().toISOString(),
      processados,
    });
  });

  // 11. Fechamento e Acerto de Caixa do Entregador
  app.post('/api/acerto/fechamento', async (req, res) => {
    const {
      entregadorId,
      pedidosIds,
      totalDinheiroInformado,
      observacoes,
      cascosP13Recolhidos,
      cascosP20LRecolhidos,
    } = req.body;
    const empId = getTargetEmpresaId(req);

    const entregador = entregadores.find((e) => e.id === entregadorId && (!empId || (e.empresaId || 'emp1') === empId));
    if (!entregador) return res.status(404).json({ error: 'Entregador não encontrado' });

    const pedidosFechamento = pedidos.filter((p) => pedidosIds.includes(p.id) && (!empId || (p.empresaId || 'emp1') === empId));

    let totalDinheiroEsperado = 0;
    let totalPix = 0;
    let totalCartao = 0;
    let cascosP13Calculados = 0;
    let cascosP20LCalculados = 0;

    pedidosFechamento.forEach((p) => {
      p.status = 'CONCLUIDO';
      p.concluidoEm = new Date().toISOString();

      const pagamentos: PagamentoItem[] =
        p.pagamentosRealizados && p.pagamentosRealizados.length > 0
          ? p.pagamentosRealizados
          : p.pagamentosPrevistos && p.pagamentosPrevistos.length > 0
          ? p.pagamentosPrevistos
          : [
              {
                forma: p.formaPagamentoRealizada || p.formaPagamentoPrevista,
                valor: p.valorRecebido || p.total,
              },
            ];

      pagamentos.forEach((pg) => {
        const f = pg.forma;
        const v = Number(pg.valor) || 0;
        if (f === 'DINHEIRO') {
          totalDinheiroEsperado += v;
        } else if (f === 'PIX') {
          totalPix += v;
        } else if (f === 'CARTAO_DEBITO' || f === 'CARTAO_CREDITO') {
          totalCartao += v;
        }
      });

      p.itens.forEach((it) => {
        if (it.tipoVasilhame === 'P13') {
          cascosP13Calculados += it.vasilhamesRecolhidosReais || 0;
        } else if (it.tipoVasilhame === 'P20L') {
          cascosP20LCalculados += it.vasilhamesRecolhidosReais || 0;
        }
      });
    });

    // Atualiza o estoque físico de cascos vazios na base
    const p13Prod = produtos.find((pr) => pr.tipoVasilhame === 'P13' && (!empId || (pr.empresaId || 'emp1') === empId));
    if (p13Prod) {
      p13Prod.estoqueVazio += cascosP13Recolhidos ?? cascosP13Calculados;
    }
    const p20Prod = produtos.find((pr) => pr.tipoVasilhame === 'P20L' && (!empId || (pr.empresaId || 'emp1') === empId));
    if (p20Prod) {
      p20Prod.estoqueVazio += cascosP20LRecolhidos ?? cascosP20LCalculados;
    }

    const diferenca = (totalDinheiroInformado || 0) - totalDinheiroEsperado;

    const fechamento: FechamentoCaixaEntregador = {
      id: `fech_${Date.now()}`,
      empresaId: empId || entregador.empresaId || 'emp1',
      entregadorId: entregador.id,
      entregadorNome: entregador.nome,
      data: new Date().toISOString(),
      pedidosIds,
      totalDinheiroEsperado,
      totalDinheiroInformado: Number(totalDinheiroInformado) || 0,
      totalPix,
      totalCartao,
      diferenca,
      cascosP13Recolhidos: cascosP13Recolhidos ?? cascosP13Calculados,
      cascosP20LRecolhidos: cascosP20LRecolhidos ?? cascosP20LCalculados,
      cascosP13Pendentes: 0,
      cascosP20LPendentes: 0,
      status: 'CONCLUIDO',
      observacoes,
    };

    fechamentos.push(fechamento);

    // Tenta persistir no Supabase
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.from('fechamentos_caixa').insert([fechamento]);

        // Atualiza todos os pedidos para CONCLUIDO no Supabase
        for (const p of pedidosFechamento) {
          const { error: errConc } = await supabase.from('pedidos').update({
            status: 'CONCLUIDO',
            concluido_em: p.concluidoEm,
          }).eq('id', p.id);
          if (errConc) console.warn('[Supabase] Erro ao concluir pedido:', errConc);
        }

        // Atualiza status do entregador no Supabase
        supabase.from('entregadores').update({
          status: 'DISPONIVEL',
          pedidos_ativos_count: 0,
          total_entregas_hoje: entregador.totalEntregasHoje,
        }).eq('id', entregador.id).then();

        // Atualiza vasilhames em estoque no Supabase
        if (p13Prod) {
          supabase.from('produtos').update({ estoque_vazio: p13Prod.estoqueVazio }).eq('id', p13Prod.id).then();
        }
        if (p20Prod) {
          supabase.from('produtos').update({ estoque_vazio: p20Prod.estoqueVazio }).eq('id', p20Prod.id).then();
        }
      }
    } catch (e) {}

    // Libera o entregador para status DISPONIVEL
    entregador.status = 'DISPONIVEL';
    entregador.pedidosAtivosCount = 0;
    entregador.totalEntregasHoje += pedidosFechamento.length;

    res.json({
      sucesso: true,
      fechamento,
      entregador,
    });
  });

  // Histórico de Fechamentos de Caixa Realizados
  app.get('/api/acerto/fechamentos', (req, res) => {
    const empId = getTargetEmpresaId(req);
    const { entregadorId } = req.query as { entregadorId?: string };
    let lista = empId ? fechamentos.filter((f) => (f.empresaId || 'emp1') === empId) : [...fechamentos];
    if (entregadorId) {
      lista = lista.filter((f) => f.entregadorId === entregadorId);
    }
    res.json(lista);
  });

  app.get('/api/acerto/historico', (req, res) => {
    const empId = getTargetEmpresaId(req);
    const lista = empId ? fechamentos.filter((f) => (f.empresaId || 'emp1') === empId) : fechamentos;
    res.json(lista);
  });

  // 12. Balanço Geral de Vasilhames (Cheios, Vazios, Em Trânsito, Pendentes c/ Clientes)
  app.get('/api/vasilhames/balanco', (req, res) => {
    const empId = getTargetEmpresaId(req);
    const pedidosEmRota = pedidos.filter((p) => (!empId || (p.empresaId || 'emp1') === empId) && p.status === 'EM_ROTA');

    let transitoP13 = 0;
    let transitoP20L = 0;
    pedidosEmRota.forEach((p) => {
      p.itens.forEach((it) => {
        if (it.tipoVasilhame === 'P13') transitoP13 += it.quantidade;
        if (it.tipoVasilhame === 'P20L') transitoP20L += it.quantidade;
      });
    });

    let pendentesP13Clientes = 0;
    let pendentesP20LClientes = 0;
    const clientesEmpresa = empId ? clientes.filter((c) => (c.empresaId || 'emp1') === empId) : clientes;
    clientesEmpresa.forEach((c) => {
      pendentesP13Clientes += c.vasilhamesPendentes?.P13 || 0;
      pendentesP20LClientes += c.vasilhamesPendentes?.P20L || 0;
    });

    const p13Prod = produtos.find((p) => (!empId || (p.empresaId || 'emp1') === empId) && p.tipoVasilhame === 'P13');
    const p20Prod = produtos.find((p) => (!empId || (p.empresaId || 'emp1') === empId) && p.tipoVasilhame === 'P20L');

    res.json({
      p13: {
        tipo: 'P13 (Botijão de Gás 13kg)',
        baseCheios: p13Prod?.estoqueCheio || 0,
        baseVazios: p13Prod?.estoqueVazio || 0,
        emTransitoEntregadores: transitoP13,
        pendenteClientes: pendentesP13Clientes,
        totalPatrimonio:
          (p13Prod?.estoqueCheio || 0) +
          (p13Prod?.estoqueVazio || 0) +
          transitoP13 +
          pendentesP13Clientes,
      },
      p20l: {
        tipo: 'P20L (Galão de Água 20L)',
        baseCheios: p20Prod?.estoqueCheio || 0,
        baseVazios: p20Prod?.estoqueVazio || 0,
        emTransitoEntregadores: transitoP20L,
        pendenteClientes: pendentesP20LClientes,
        totalPatrimonio:
          (p20Prod?.estoqueCheio || 0) +
          (p20Prod?.estoqueVazio || 0) +
          transitoP20L +
          pendentesP20LClientes,
      },
    });
  });

  // 13. Download / Exibição do Script SQL
  app.get('/api/schema/sql', (req, res) => {
    res.type('text/plain').send(SQL_SCHEMA_POSTGRESQL + '\n\n' + SQL_TRIGGER_ESTOQUE);
  });


  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message, stack: err.stack });
  });

  // --------------------------------------------------------------------------
  // VITE & STATIC SPA MIDDLEWARE
  // --------------------------------------------------------------------------
  if (!process.env.VERCEL) {
    (async () => {
      if (process.env.NODE_ENV !== 'production') {
        const { createServer } = await import('v' + 'ite');
        const vite = await createServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
      app.listen(PORT, '0.0.0.0', async () => {
  await syncFromSupabase();
        console.log(`🚀 Disk Entrega Server rodando em http://localhost:${PORT}`);
      });
    })();
  }
export default app;
