import { BairroTaxa, Cliente, Empresa, Entregador, Pedido, Produto, Usuario } from '../types.js';

export const INITIAL_EMPRESAS: Empresa[] = [];
export const INITIAL_BAIRROS: BairroTaxa[] = [];
export const INITIAL_PRODUTOS: Produto[] = [];
export const INITIAL_CLIENTES: Cliente[] = [];
export const INITIAL_ENTREGADORES: Entregador[] = [];
export const INITIAL_PEDIDOS: Pedido[] = [];
export const INITIAL_USUARIOS: Usuario[] = [
  {
    id: 'super_admin_master',
    nome: 'Super Admin',
    login: 'admin@droweder.com.br',
    email: 'admin@droweder.com.br',
    senha: '',
    pinAcesso: '1234',
    perfil: 'SUPER_ADMIN',
    cargo: 'Proprietário',
    ativo: true,
    empresaId: undefined,
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
  }
];
