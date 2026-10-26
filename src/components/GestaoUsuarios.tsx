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
import { ModuloHeader } from './ModuloHeader';
import { MainTab } from './Navbar';
import { TopBarActions } from './TopBarPortal';
import { SegmentedTabs, TabItem } from './SegmentedTabs';

interface Props {
  usuarios: Usuario[];
  entregadores: Entregador[];
  usuarioLogado: Usuario;
  activeTab?: MainTab;
  setActiveTab?: (tab: MainTab) => void;
  isSuperAdmin?: boolean;
  pedidosPendentesCount?: number;
  pedidosEmRotaCount?: number;
  pedidosEntreguesCount?: number;
  onSalvarUsuario: (usuario: Partial<Usuario> & { id?: string }) => Promise<void>;
  onToggleAtivo: (id: string) => Promise<void>;
  onExcluirUsuario: (id: string) => Promise<void>;
  onTrocarUsuarioAtivo?: (usuario: Usuario) => void;
}

const PERFIS_INFO: Record<
  PerfilUsuario,
  { label: string; badgeClass: string; desc: string; icon: React.ComponentType<any> }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin (Criador)',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40',
    desc: 'Criador da plataforma com acesso irrestrito global e gestão multi-tenant de todas as empresas.',
    icon: Shield,
  },
  ADMIN: {
    label: 'Administrador Geral',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
    desc: 'Acesso irrestrito a todos os módulos, cadastros, relatórios e gestão de usuários da empresa.',
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

export type AbaUsuarios = 'TODOS' | 'ADMIN' | 'GERENTE' | 'ATENDENTE_PDV' | 'ENTREGADOR' | 'MATRIZ_PERMISSOES';

const PERMISSOES_PADRAO_PERFIL: Record<PerfilUsuario, Partial<Record<keyof PermissoesUsuario, boolean>>> = {
  SUPER_ADMIN: {
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
    despacharPedidos: true,
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

export const GestaoUsuarios: React.FC<Props> = ({
  usuarios,
  entregadores,
  usuarioLogado,
  activeTab = 'usuarios',
  setActiveTab = () => {},
  isSuperAdmin = false,
  pedidosPendentesCount = 0,
  pedidosEmRotaCount = 0,
  pedidosEntreguesCount = 0,
  onSalvarUsuario,
  onToggleAtivo,
  onExcluirUsuario,
  onTrocarUsuarioAtivo,
}) => {
  const [busca, setBusca] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<AbaUsuarios>('TODOS');
  const [usuarioModal, setUsuarioModal] = useState<Partial<Usuario> | null>(null);
  const [isEditando, setIsEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchBusca =
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.login.toLowerCase().includes(busca.toLowerCase()) ||
      (u.cargo && u.cargo.toLowerCase().includes(busca.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(busca.toLowerCase())) ||
      (u.telefone && u.telefone.includes(busca));
    const matchPerfil = abaAtiva === 'TODOS' || u.perfil === abaAtiva;
    return matchBusca && matchPerfil;
  });

  const permissoesFiltradas = LISTA_PERMISSOES_DETALHADAS.filter(
    (p) =>
      p.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      p.categoria.toLowerCase().includes(busca.toLowerCase())
  );

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

  const tabsUsuarios: TabItem<AbaUsuarios>[] = [
    { id: 'TODOS', label: 'Todos os Usuários', badge: usuarios.length, icon: Users },
    { id: 'ADMIN', label: 'Admins', badge: usuarios.filter((u) => u.perfil === 'ADMIN').length, icon: Shield },
    { id: 'GERENTE', label: 'Gerentes', badge: usuarios.filter((u) => u.perfil === 'GERENTE').length, icon: Sliders },
    { id: 'ATENDENTE_PDV', label: 'Atendentes PDV', badge: usuarios.filter((u) => u.perfil === 'ATENDENTE_PDV').length, icon: ShoppingBag },
    { id: 'ENTREGADOR', label: 'Entregadores', badge: usuarios.filter((u) => u.perfil === 'ENTREGADOR').length, icon: Truck },
    { id: 'MATRIZ_PERMISSOES', label: 'Matriz de Permissões', icon: KeyRound },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Ações e Pesquisa Contextuais Montadas Diretamente na Barra Superior */}
      <TopBarActions>
        {/* Barra de Busca de Usuários na TopBar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              abaAtiva === 'MATRIZ_PERMISSOES'
                ? 'Buscar permissão...'
                : 'Buscar por nome, login, cargo...'
            }
            className="w-36 sm:w-56 pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 focus:border-blue-500 text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Botão Novo Colaborador */}
        <button
          onClick={abrirModalNovo}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Colaborador</span>
        </button>
      </TopBarActions>

      {/* Sub-Navegação Oficial em Pílulas (SegmentedTabs) por Perfil e Matriz */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <SegmentedTabs
          tabs={tabsUsuarios}
          activeTab={abaAtiva}
          onChange={(tab) => {
            setAbaAtiva(tab);
            setBusca('');
          }}
        />
      </div>

      {mensagemSucesso && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA: TABELA DE USUÁRIOS (TODOS OU FILTRADO POR PERFIL)                    */}
      {/* ========================================================================= */}
      {abaAtiva !== 'MATRIZ_PERMISSOES' && (
        usuariosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-[#eaecf0] dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-slate-800 p-8 shadow-xs">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">
              Nenhum colaborador encontrado
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ajuste os filtros de pesquisa ou cadastre um novo colaborador.
            </p>
          </div>
        ) : (
          <div className="bg-[#eaecf0] dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                    <th className="py-2 px-3">Colaborador / Acesso</th>
                    <th className="py-2 px-3">Perfil / Nível</th>
                    <th className="py-2 px-3">Cargo / Função</th>
                    <th className="py-2 px-3">Contato</th>
                    <th className="py-2 px-3 text-center">PIN Acesso</th>
                    <th className="py-2 px-3 text-center">Permissões</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {usuariosFiltrados.map((u) => {
                    const perfilInfo = PERFIS_INFO[u.perfil] || PERFIS_INFO.ATENDENTE_PDV;
                    const PerfilIcon = perfilInfo.icon;
                    const isCurrentUser = usuarioLogado?.id === u.id;
                    const totalPermissoesAtivas = Object.values(u.permissoes || {}).filter(Boolean).length;

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group ${
                          isCurrentUser ? 'bg-blue-50/20 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        {/* Colaborador / Acesso */}
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] text-white shadow-xs shrink-0 ${
                                u.perfil === 'SUPER_ADMIN'
                                  ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950'
                                  : u.perfil === 'ADMIN'
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
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {u.nome}
                                </span>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-black shrink-0">
                                    VOCÊ
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                @{u.login}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Perfil / Nível */}
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${perfilInfo.badgeClass}`}
                          >
                            <PerfilIcon className="w-3 h-3 shrink-0" />
                            <span>{perfilInfo.label}</span>
                          </span>
                        </td>

                        {/* Cargo / Função */}
                        <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-xs">{u.cargo || 'Não especificado'}</span>
                        </td>

                        {/* Contato */}
                        <td className="py-1.5 px-3 whitespace-nowrap">
                          {u.telefone || u.email ? (
                            <div className="space-y-0.5 text-[11px]">
                              {u.telefone && (
                                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{u.telefone}</span>
                                </div>
                              )}
                              {u.email && (
                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span className="truncate max-w-[150px]">{u.email}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* PIN Acesso */}
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                            <KeyRound className="w-3 h-3 text-slate-400" />
                            <span>•••• ({u.pinAcesso || '1234'})</span>
                          </span>
                        </td>

                        {/* Permissões */}
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                              totalPermissoesAtivas >= 10
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                : totalPermissoesAtivas >= 6
                                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <Shield className="w-3 h-3 shrink-0" />
                            <span>{totalPermissoesAtivas} de {LISTA_PERMISSOES_DETALHADAS.length}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onToggleAtivo(u.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all active:scale-95 ${
                              u.ativo
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                            title={u.ativo ? 'Clique para desativar acesso' : 'Clique para ativar acesso'}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-1.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {onTrocarUsuarioAtivo && !isCurrentUser && u.ativo && (
                              <button
                                type="button"
                                onClick={() => onTrocarUsuarioAtivo(u)}
                                className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Assumir sessão deste usuário para testes"
                              >
                                Assumir
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => abrirModalEditar(u)}
                              className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar usuário e permissões"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {usuarios.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Deseja realmente excluir o colaborador "${u.nome}"?`)) {
                                    onExcluirUsuario(u.id);
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Excluir colaborador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="py-3 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
              <span>
                Mostrando <strong>{usuariosFiltrados.length}</strong> de <strong>{usuarios.length}</strong> colaboradores cadastrados
              </span>
              <span className="text-[11px] text-slate-400">
                Dica: Clique no Status do usuário para ativar ou bloquear o acesso imediatamente.
              </span>
            </div>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* ABA: MATRIZ DE PERMISSÕES & AUDITORIA                                     */}
      {/* ========================================================================= */}
      {abaAtiva === 'MATRIZ_PERMISSOES' && (
        <div className="space-y-4">
          {/* Matriz Comparativa Table */}
          <div className="bg-[#eaecf0] dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-500" />
                  <span>Matriz de Acessos e Perfis do Sistema</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comparativo de regras padrão e permissões operacionais configuráveis por perfil.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 self-start sm:self-auto">
                {permissoesFiltradas.length} permissões auditáveis
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                    <th className="py-2 px-3">Funcionalidade / Regra</th>
                    <th className="py-2 px-3">Categoria</th>
                    <th className="py-2 px-3 text-center">Super Admin</th>
                    <th className="py-2 px-3 text-center">Admin</th>
                    <th className="py-2 px-3 text-center">Gerente</th>
                    <th className="py-2 px-3 text-center">Atendente PDV</th>
                    <th className="py-2 px-3 text-center">Entregador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {permissoesFiltradas.map((perm) => (
                    <tr
                      key={perm.chave}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-1.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{perm.titulo}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{perm.descricao}</div>
                      </td>
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {perm.categoria}
                        </span>
                      </td>

                      {/* Super Admin */}
                      <td className="py-1.5 px-3 text-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                      </td>

                      {/* Admin */}
                      <td className="py-1.5 px-3 text-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                      </td>

                      {/* Gerente */}
                      <td className="py-1.5 px-3 text-center">
                        {PERMISSOES_PADRAO_PERFIL.GERENTE[perm.chave] ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>

                      {/* Atendente PDV */}
                      <td className="py-1.5 px-3 text-center">
                        {PERMISSOES_PADRAO_PERFIL.ATENDENTE_PDV[perm.chave] ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>

                      {/* Entregador */}
                      <td className="py-1.5 px-3 text-center">
                        {PERMISSOES_PADRAO_PERFIL.ENTREGADOR[perm.chave] ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit & Role Flow Highlights */}
          <div className="bg-[#eaecf0] dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Trilha de Auditoria e Responsabilidades no Sistema
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        </div>
      )}

      {/* Modal de Criação / Edição de Usuário */}
      {usuarioModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
          <div className="bg-[#eaecf0] dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>E-mail de Acesso (Login Supabase) *</span>
                      <span className="text-[10px] text-blue-500 font-normal">Identificador único</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={usuarioModal.email || usuarioModal.login || ''}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().trim();
                        setUsuarioModal({ ...usuarioModal, email: val, login: val });
                      }}
                      placeholder="Ex: joao@empresa.com.br"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 font-mono text-xs"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:border-blue-500"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
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
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500"
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
