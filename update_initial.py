with open('src/data/initialData.ts', 'r') as f:
    text = f.read()

text = text.replace('export const INITIAL_USUARIOS: Usuario[] = [];', """export const INITIAL_USUARIOS: Usuario[] = [
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
];""")

with open('src/data/initialData.ts', 'w') as f:
    f.write(text)
