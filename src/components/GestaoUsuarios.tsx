import React, { useState } from 'react';
import { Entregador, PerfilUsuario, PermissoesUsuario, Usuario } from '../types';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  KeyRound,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  FileCheck,
  Phone,
  Mail,
  Smartphone,
  Truck,
  RotateCcw,
  ShoppingBag,
  Database,
  BarChart3,
  Search,
  Filter,
  Check,
  AlertCircle,
} from 'lucide-react';

interface Props {
  usuarios: Usuario[];
  entregadores: Entregador[];
  usuarioLogado: Usuario;
  onSalvarUsuario: (usuario: Partial<Usuario> & { id?: string }) => Promise<void>;
  onToggleAtivo: (id: string) => Promise<void>;
  onExcluirUsuario: (id: string) => Promise<void>;
  onTrocarUsuarioAtivo?: (usuario: Usuario) => void;
}

const PERFIS_INFO: Record<
  PerfilUsuario,
  { label: string; badgeClass: string; desc: string; icon: React.ComponentType<any> }
> = {
  ADMIN: {
    label: 'Administrador Geral',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
    desc: 'Acesso irrestrito a todos os módulos, cadastros, relatórios e gestão de usuários.',
    icon: Shield,
  },
  GERENTE: {
    label: 'Gerente da Conveniência',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
    desc: 'Controle de vendas, estoque, acertos de caixa, despachos e auditoria de pedidos.',
    icon: Sliders,
  },
  ATENDENTE_PDV: {
    label: 'Atendente / Operador PDV',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    desc: 'Emissão ágil de pedidos, cadastro de novos clientes e correção de devoluções.',
    icon: ShoppingBag,
  },
  ENTREGADOR: {
    label: 'Entregador / Motorista',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    desc: 'Execução de entregas no app móvel, baixa offline e devolução de pedidos p/ correção.',
    icon: Truck,
  },
};

const LISTA_PERMISSOES_DETALHADAS: Array<{
  chave: keyof PermissoesUsuario;
  titulo: string;
  descricao: string;
  categoria: 'Vendas & PDV' | 'Operação & Frota' | 'Financeiro & Estoque' | 'Sistema & Cadastros';
}> = [
  {
    chave: 'emitirPedidos',
    titulo: 'Emitir Pedidos no PDV',
    descricao: 'Permite abrir novos pedidos rápidos e vincular itens e clientes.',
    categoria: 'Vendas & PDV',
  },
  {
    chave: 'editarPedidos',
    titulo: 'Editar e Corrigir Pedidos',
    descricao: 'Permite alterar endereços, itens, formas de pagamento e observações de pedidos.',
    categoria: 'Vendas & PDV',
  },
  {
    chave: 'cancelarPedidos',
    titulo: 'Cancelar Pedidos com Estorno',
    descricao: 'Permite cancelar pedidos e efetuar o estorno de mercadorias no estoque.',
    categoria: 'Vendas & PDV',
  },
  {
    chave: 'despacharPedidos',
    titulo: 'Despacho & Atribuição de Rotas',
    descricao: 'Permite atribuir pedidos a entregadores e emitir rotas no Kanban.',
    categoria: 'Operação & Frota',
  },
  {
    chave: 'devolverPedidos',
    titulo: 'Devolver Pedidos para Correção',
    descricao: 'Permite ao entregador/operador devolver pedidos divergentes para o emitente.',
    categoria: 'Operação & Frota',
  },
  {
    chave: 'realizarAcertoCaixa',
    titulo: 'Acerto de Caixa de Entregadores',
    descricao: 'Permite conferir valores recebidos, maquininhas PIX e fechar caixa de motoristas.',
    categoria: 'Financeiro & Estoque',
  },
  {
    chave: 'ajustarEstoque',
    titulo: 'Ajustar Estoque de Vasilhames & Gás',
    descricao: 'Permite alterar contagem de cascos cheios, vazios e produtos da conveniência.',
    categoria: 'Financeiro & Estoque',
  },
  {
    chave: 'verDashboardGerencial',
    titulo: 'Dashboard Gerencial & Métricas',
    descricao: 'Visualização de faturamento, ticket médio, gráficos e ranking de entregadores.',
    categoria: 'Financeiro & Estoque',
  },
  {
    chave: 'acessarCadastros',
    titulo: 'Acessar Central de Cadastros',
    descricao: 'Visualizar e gerenciar cadastros de produtos, clientes, bairros e colaboradores.',
    categoria: 'Sistema & Cadastros',
  },
  {
    chave: 'gerenciarUsuarios',
    titulo: 'Gestão de Usuários & Permissões',
    descricao: 'Criar novos usuários, alterar PINs e definir acessos de cada operador.',
    categoria: 'Sistema & Cadastros',
  },
  {
    chave: 'importarErp',
    titulo: 'Importação de Catálogo ERP',
    descricao: 'Importar planilhas e arquivos JSON de produtos do ERP da conveniência.',
    categoria: 'Sistema & Cadastros',
  },
];

export const GestaoUsuarios: React.FC<Props> = ({
  usuarios,
  entregadores,
  usuarioLogado,
  onSalvarUsuario,
  onToggleAtivo,
  onExcluirUsuario,
  onTrocarUsuarioAtivo,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('TODOS');
  const [usuarioModal, setUsuarioModal] = useState<Partial<Usuario> | null>(null);
  const [isEditando, setIsEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchBusca =
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.login.toLowerCase().includes(busca.toLowerCase()) ||
      (u.cargo && u.cargo.toLowerCase().includes(busca.toLowerCase()));
    const matchPerfil = filtroPerfil === 'TODOS' || u.perfil === filtroPerfil;
    return matchBusca && matchPerfil;
  });

  const abrirModalNovo = () => {
    setUsuarioModal({
      nome: '',
      login: '',
      email: '',
      telefone: '',
      cargo: 'Atendente',
      perfil: 'ATENDENTE_PDV',
      ativo: true,
      pinAcesso: '1234',
      permissoes: {
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
    });
    setIsEditando(false);
    setMensagemErro(null);
  };

  const abrirModalEditar = (u: Usuario) => {
    setUsuarioModal({ ...u, permissoes: { ...u.permissoes } });
    setIsEditando(true);
    setMensagemErro(null);
  };

  const fecharModal = () => {
    setUsuarioModal(null);
    setIsEditando(false);
    setMensagemErro(null);
  };

  const handlePerfilChange = (novoPerfil: PerfilUsuario) => {
    if (!usuarioModal) return;

    let novasPermissoes: PermissoesUsuario = {
      emitirPedidos: false,
      despacharPedidos: false,
      cancelarPedidos: false,
      editarPedidos: false,
      devolverPedidos: false,
      realizarAcertoCaixa: false,
      ajustarEstoque: false,
      verDashboardGerencial: false,
      acessarCadastros: false,
      gerenciarUsuarios: false,
      importarErp: false,
    };

    if (novoPerfil === 'ADMIN') {
      novasPermissoes = {
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
      };
    } else if (novoPerfil === 'GERENTE') {
      novasPermissoes = {
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
      };
    } else if (novoPerfil === 'ATENDENTE_PDV') {
      novasPermissoes = {
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
      };
    } else if (novoPerfil === 'ENTREGADOR') {
      novasPermissoes = {
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
      };
    }

    setUsuarioModal({
      ...usuarioModal,
      perfil: novoPerfil,
      cargo:
        novoPerfil === 'ADMIN'
          ? 'Administrador'
          : novoPerfil === 'GERENTE'
          ? 'Gerente Geral'
          : novoPerfil === 'ENTREGADOR'
          ? 'Entregador'
          : 'Atendente de Caixa',
      permissoes: novasPermissoes,
    });
  };

  const togglePermissao = (chave: keyof PermissoesUsuario) => {
    if (!usuarioModal || !usuarioModal.permissoes) return;
    setUsuarioModal({
      ...usuarioModal,
      permissoes: {
        ...usuarioModal.permissoes,
        [chave]: !usuarioModal.permissoes[chave],
      },
    });
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioModal?.nome || !usuarioModal?.login) {
      setMensagemErro('Nome e login são campos obrigatórios.');
      return;
    }

    try {
      setSalvando(true);
      setMensagemErro(null);
      await onSalvarUsuario(usuarioModal);
      setMensagemSucesso(
        isEditando ? 'Usuário atualizado com sucesso!' : 'Novo usuário cadastrado com sucesso!'
      );
      fecharModal();
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao salvar usuário');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Gestão de Usuários & Permissões
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Controle de acesso dos colaboradores, emissão de pedidos por atendente, entregas por motorista
              e trilha de auditoria completa em cada etapa do pedido.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={abrirModalNovo}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Colaborador / Usuário</span>
            </button>
          </div>
        </div>

        {/* Audit & Role Flow Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
              <ShoppingBag className="w-4 h-4" />
              <span>Quem Emitiu o Pedido</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Vinculado ao atendente/caixa logado no momento da venda.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              <Sliders className="w-4 h-4" />
              <span>Quem Despachou</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Registrado na atribuição da rota no Kanban pelo gerente.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              <Truck className="w-4 h-4" />
              <span>Quem Entregou</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Registrado na baixa de entrega com GPS e cascos recolhidos.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <RotateCcw className="w-4 h-4" />
              <span>Devolução p/ Correção</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Permite ao entregador devolver pedidos com motivo para o emitente.
            </p>
          </div>
        </div>
      </div>

      {mensagemSucesso && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, login ou cargo..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['TODOS', 'ADMIN', 'GERENTE', 'ATENDENTE_PDV', 'ENTREGADOR'] as const).map((perfil) => (
            <button
              key={perfil}
              onClick={() => setFiltroPerfil(perfil)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filtroPerfil === perfil
                  ? 'bg-slate-900 text-white dark:bg-blue-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {perfil === 'TODOS'
                ? 'Todos os Perfis'
                : perfil === 'ADMIN'
                ? 'Admins'
                : perfil === 'GERENTE'
                ? 'Gerentes'
                : perfil === 'ATENDENTE_PDV'
                ? 'Atendentes'
                : 'Entregadores'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usuariosFiltrados.map((u) => {
          const perfilInfo = PERFIS_INFO[u.perfil] || PERFIS_INFO.ATENDENTE_PDV;
          const PerfilIcon = perfilInfo.icon;
          const isCurrentUser = usuarioLogado?.id === u.id;

          const totalPermissoesAtivas = Object.values(u.permissoes || {}).filter(Boolean).length;

          return (
            <div
              key={u.id}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                isCurrentUser
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : u.ativo
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-rose-200 dark:border-rose-900/50 opacity-70 bg-rose-50/20'
              }`}
            >
              <div className="space-y-3">
                {/* User Top Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                        u.perfil === 'ADMIN'
                          ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
                          : u.perfil === 'GERENTE'
                          ? 'bg-gradient-to-br from-blue-600 to-cyan-700'
                          : u.perfil === 'ENTREGADOR'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                          : 'bg-gradient-to-br from-emerald-500 to-teal-700'
                      }`}
                    >
                      {u.nome
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">{u.nome}</h4>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-black">
                            VOCÊ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">@{u.login}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${perfilInfo.badgeClass}`}
                  >
                    {perfilInfo.label}
                  </span>
                </div>

                {/* Info Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Cargo / Função</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                      {u.cargo || 'Não especificado'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">PIN de Acesso</span>
                    <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                      •••• ({u.pinAcesso || '1234'})
                    </span>
                  </div>
                </div>

                {/* Permissions summary */}
                <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    <span>Permissões Habilitadas:</span>
                  </div>
                  <span className="font-black text-blue-600 dark:text-blue-400">
                    {totalPermissoesAtivas} de {LISTA_PERMISSOES_DETALHADAS.length}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onToggleAtivo(u.id)}
                    title={u.ativo ? 'Desativar usuário' : 'Ativar usuário'}
                    className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      u.ativo
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                  >
                    {u.ativo ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                    <span className="text-[11px]">{u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </button>

                  {onTrocarUsuarioAtivo && !isCurrentUser && u.ativo && (
                    <button
                      onClick={() => onTrocarUsuarioAtivo(u)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors"
                      title="Entrar como este usuário para teste"
                    >
                      Assumir Sessão
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => abrirModalEditar(u)}
                    className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                    title="Editar dados e permissões"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {usuarios.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente excluir o usuário "${u.nome}"?`)) {
                          onExcluirUsuario(u.id);
                        }
                      }}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Criação / Edição de Usuário */}
      {usuarioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    {isEditando ? `Editar Usuário: ${usuarioModal.nome}` : 'Cadastrar Novo Colaborador'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Defina o cargo, perfil de acesso e permissões operacionais
                  </p>
                </div>
              </div>
              <button
                onClick={fecharModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSalvar} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {mensagemErro && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mensagemErro}</span>
                </div>
              )}

              {/* Step 1: Basic Info */}
              <div className="space-y-3">
                <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  1. Dados Pessoais & Acesso
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={usuarioModal.nome || ''}
                      onChange={(e) => setUsuarioModal({ ...usuarioModal, nome: e.target.value })}
                      placeholder="Ex: João da Silva"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Login / Usuário de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={usuarioModal.login || ''}
                      onChange={(e) => setUsuarioModal({ ...usuarioModal, login: e.target.value })}
                      placeholder="Ex: joao.silva"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      value={usuarioModal.cargo || ''}
                      onChange={(e) => setUsuarioModal({ ...usuarioModal, cargo: e.target.value })}
                      placeholder="Ex: Caixa / Atendente PDV"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>PIN Rápido (4 dígitos)</span>
                      <span className="text-[10px] text-slate-400">Usado no caixa/móvel</span>
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={usuarioModal.pinAcesso || ''}
                      onChange={(e) => setUsuarioModal({ ...usuarioModal, pinAcesso: e.target.value })}
                      placeholder="1234"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={usuarioModal.telefone || ''}
                      onChange={(e) => setUsuarioModal({ ...usuarioModal, telefone: e.target.value })}
                      placeholder="(11) 98888-7777"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Vincular a Entregador da Frota (Opcional)
                    </label>
                    <select
                      value={usuarioModal.entregadorIdVinculado || ''}
                      onChange={(e) =>
                        setUsuarioModal({ ...usuarioModal, entregadorIdVinculado: e.target.value || undefined })
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    >
                      <option value="">Nenhum vínculo (Não é motorista)</option>
                      {entregadores.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.nome} - {ent.veiculo} ({ent.placa})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Perfil Selector */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  2. Perfil de Acesso Base
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['ATENDENTE_PDV', 'GERENTE', 'ADMIN', 'ENTREGADOR'] as PerfilUsuario[]).map((perfilKey) => {
                    const info = PERFIS_INFO[perfilKey];
                    const isSelected = usuarioModal.perfil === perfilKey;
                    const Icon = info.icon;

                    return (
                      <button
                        type="button"
                        key={perfilKey}
                        onClick={() => handlePerfilChange(perfilKey)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-black text-xs text-slate-900 dark:text-white block">
                            {info.label}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            {info.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Granular Permissions Checklist */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    3. Permissões Granulares
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Personalize os privilégios específicos
                  </span>
                </div>

                <div className="space-y-2">
                  {LISTA_PERMISSOES_DETALHADAS.map((perm) => {
                    const ativa = usuarioModal.permissoes?.[perm.chave] || false;
                    return (
                      <div
                        key={perm.chave}
                        onClick={() => togglePermissao(perm.chave)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          ativa
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {perm.titulo}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                              {perm.categoria}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{perm.descricao}</p>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            ativa ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={fecharModal}
                  disabled={salvando}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : isEditando ? 'Salvar Alterações' : 'Criar Colaborador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
