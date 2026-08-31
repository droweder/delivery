import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Crown,
  DollarSign,
  Edit,
  ExternalLink,
  Flame,
  Globe,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Unlock,
  Users,
} from 'lucide-react';
import { Empresa, PlanoEmpresa, StatusEmpresa, Usuario } from '../types';

interface SuperAdminHubProps {
  usuarioSuperAdmin: Usuario;
  empresas: Empresa[];
  onSelecionarEmpresa: (empresa: Empresa) => void;
  onSalvarEmpresa: (empresa: Partial<Empresa> & { id?: string }) => Promise<void>;
  onExcluirEmpresa: (id: string) => Promise<void>;
  onLogout: () => void;
  onRecarregar: () => void;
}

export const SuperAdminHub: React.FC<SuperAdminHubProps> = ({
  usuarioSuperAdmin,
  empresas,
  onSelecionarEmpresa,
  onSalvarEmpresa,
  onExcluirEmpresa,
  onLogout,
  onRecarregar,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroPlano, setFiltroPlano] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  // Modal Cadastro / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  // Form State
  const [formRazaoSocial, setFormRazaoSocial] = useState('');
  const [formNomeFantasia, setFormNomeFantasia] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formEstado, setFormEstado] = useState('SP');
  const [formEndereco, setFormEndereco] = useState('');
  const [formPlano, setFormPlano] = useState<PlanoEmpresa>('PRO');
  const [formStatus, setFormStatus] = useState<StatusEmpresa>('ATIVO');
  const [formLimiteUsuarios, setFormLimiteUsuarios] = useState(10);
  const [formLimitePedidosMes, setFormLimitePedidosMes] = useState(5000);
  const [formValorMensalidade, setFormValorMensalidade] = useState(199);
  const [formObservacoes, setFormObservacoes] = useState('');

  const abrirModalNovo = () => {
    setEmpresaEditando(null);
    setFormRazaoSocial('');
    setFormNomeFantasia('');
    setFormCnpj('');
    setFormTelefone('');
    setFormEmail('');
    setFormCidade('São Paulo');
    setFormEstado('SP');
    setFormEndereco('');
    setFormPlano('PRO');
    setFormStatus('ATIVO');
    setFormLimiteUsuarios(10);
    setFormLimitePedidosMes(5000);
    setFormValorMensalidade(199);
    setFormObservacoes('');
    setModalAberto(true);
  };

  const abrirModalEdicao = (emp: Empresa) => {
    setEmpresaEditando(emp);
    setFormRazaoSocial(emp.razaoSocial);
    setFormNomeFantasia(emp.nomeFantasia);
    setFormCnpj(emp.cnpj);
    setFormTelefone(emp.telefone);
    setFormEmail(emp.email);
    setFormCidade(emp.cidade);
    setFormEstado(emp.estado);
    setFormEndereco(emp.endereco);
    setFormPlano(emp.plano);
    setFormStatus(emp.status);
    setFormLimiteUsuarios(emp.limiteUsuarios || 10);
    setFormLimitePedidosMes(emp.limitePedidosMes || 5000);
    setFormValorMensalidade(emp.valorMensalidade || 199);
    setFormObservacoes(emp.observacoes || '');
    setModalAberto(true);
  };

  const handleSubmeterForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNomeFantasia.trim() || !formCnpj.trim()) {
      alert('Preencha pelo menos o Nome Fantasia e o CNPJ da empresa.');
      return;
    }

    setSalvando(true);
    try {
      await onSalvarEmpresa({
        id: empresaEditando?.id,
        razaoSocial: formRazaoSocial.trim() || formNomeFantasia.trim(),
        nomeFantasia: formNomeFantasia.trim(),
        cnpj: formCnpj.trim(),
        telefone: formTelefone.trim(),
        email: formEmail.trim(),
        cidade: formCidade.trim(),
        estado: formEstado.trim(),
        endereco: formEndereco.trim(),
        plano: formPlano,
        status: formStatus,
        limiteUsuarios: Number(formLimiteUsuarios),
        limitePedidosMes: Number(formLimitePedidosMes),
        valorMensalidade: Number(formValorMensalidade),
        observacoes: formObservacoes.trim(),
      });
      setModalAberto(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar dados da empresa');
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleStatus = async (emp: Empresa) => {
    const novoStatus: StatusEmpresa = emp.status === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO';
    try {
      await onSalvarEmpresa({ id: emp.id, status: novoStatus });
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status da empresa');
    }
  };

  const handleExcluir = async (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja excluir permanentemente a empresa "${nome}"?`)) {
      setExcluindoId(id);
      try {
        await onExcluirEmpresa(id);
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir empresa');
      } finally {
        setExcluindoId(null);
      }
    }
  };

  // Filtros
  const empresasFiltradas = empresas.filter((e) => {
    const matchBusca =
      !busca.trim() ||
      e.nomeFantasia.toLowerCase().includes(busca.toLowerCase()) ||
      e.razaoSocial.toLowerCase().includes(busca.toLowerCase()) ||
      e.cnpj.includes(busca) ||
      e.cidade.toLowerCase().includes(busca.toLowerCase()) ||
      e.email.toLowerCase().includes(busca.toLowerCase());

    const matchPlano = filtroPlano === 'TODOS' || e.plano === filtroPlano;
    const matchStatus = filtroStatus === 'TODOS' || e.status === filtroStatus;

    return matchBusca && matchPlano && matchStatus;
  });

  // Estatísticas do Painel
  const totalEmpresas = empresas.length;
  const empresasAtivas = empresas.filter((e) => e.status === 'ATIVO').length;
  const mrrTotal = empresas
    .filter((e) => e.status === 'ATIVO')
    .reduce((acc, e) => acc + (e.valorMensalidade || 0), 0);
  const totalPedidosSaaS = empresas.reduce((acc, e) => acc + (e.totalPedidosRealizados || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header Super Admin */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  Delivery SaaS
                  <span className="text-amber-400 font-bold">• Painel Super Admin</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Criador do Sistema
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestão Global de Empresas Clientes & Acesso Direto com Permissão Total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onRecarregar}
              title="Atualizar Dados"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={abrirModalNovo}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Empresa / Cliente</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:text-red-300 text-slate-400 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Empresas Cadastradas</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{totalEmpresas}</div>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">
              {empresasAtivas} empresas ativas
            </p>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Faturamento SaaS (MRR)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              R$ {mrrTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Receita recorrente mensal</p>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Pedidos Transacionados</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300">
              {totalPedidosSaaS.toLocaleString('pt-BR')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total acumulado na plataforma</p>
          </div>

          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Status da Infra</span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-sm font-black text-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Supabase + Vercel Ready</span>
            </div>
            <p className="text-[11px] text-purple-300 mt-1">RLS & Multi-Tenant Isolado</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CNPJ, cidade ou email..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 text-[11px] px-2 font-bold">Plano:</span>
              {(['TODOS', 'BASICO', 'PRO', 'ENTERPRISE'] as const).map((plano) => (
                <button
                  key={plano}
                  type="button"
                  onClick={() => setFiltroPlano(plano)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    filtroPlano === plano
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {plano === 'TODOS' ? 'Todos' : plano}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 text-[11px] px-2 font-bold">Status:</span>
              {(['TODOS', 'ATIVO', 'BLOQUEADO'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFiltroStatus(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    filtroStatus === st
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'TODOS' ? 'Todos' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empresas Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Exibindo <strong className="text-white">{empresasFiltradas.length}</strong> de{' '}
              {empresas.length} empresas cadastradas
            </span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              Clique em "Acessar Sistema" para entrar como administrador total
            </span>
          </div>

          {empresasFiltradas.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-3">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <p className="text-sm font-bold text-slate-400">Nenhuma empresa encontrada com os filtros atuais.</p>
              <button
                type="button"
                onClick={abrirModalNovo}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all"
              >
                Cadastrar Nova Empresa
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {empresasFiltradas.map((emp) => {
                const isBloqueado = emp.status === 'BLOQUEADO';

                return (
                  <div
                    key={emp.id}
                    className={`bg-slate-900/90 border rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between hover:border-slate-700 ${
                      isBloqueado ? 'border-red-800/60 bg-red-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Card Top: Nome Fantasia & Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-white truncate flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{emp.nomeFantasia}</span>
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{emp.razaoSocial}</p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                              emp.plano === 'ENTERPRISE'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                : emp.plano === 'PRO'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {emp.plano}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              isBloqueado
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </div>
                      </div>

                      {/* Informações Cadastrais */}
                      <div className="space-y-1.5 py-3 border-y border-slate-800/80 text-xs text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-bold w-12">CNPJ:</span>
                          <span className="font-mono text-slate-200">{emp.cnpj}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">
                            {emp.cidade} - {emp.estado} {emp.endereco ? `• ${emp.endereco}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{emp.telefone || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{emp.email || 'Não informado'}</span>
                        </div>
                      </div>

                      {/* Métricas do Tenant */}
                      <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60 text-center">
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Mensalidade</div>
                          <div className="text-sm font-black text-emerald-400">
                            R$ {(emp.valorMensalidade || 0).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Limites</div>
                          <div className="text-xs font-bold text-slate-300">
                            {emp.limiteUsuarios || 10} users • {emp.limitePedidosMes || 5000} ped/mês
                          </div>
                        </div>
                      </div>

                      {emp.observacoes && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-2 mb-3 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
                          "{emp.observacoes}"
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                      {/* Botão Primário: Acessar como Empresa */}
                      <button
                        type="button"
                        onClick={() => onSelecionarEmpresa(emp)}
                        className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                      >
                        <Crown className="w-4 h-4" />
                        <span>Acessar Sistema da Empresa</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>

                      {/* Ações Secundárias */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModalEdicao(emp)}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 border border-slate-700"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          title={isBloqueado ? 'Desbloquear Empresa' : 'Bloquear Empresa'}
                          className={`p-1.5 rounded-lg border font-bold text-xs transition-colors flex items-center justify-center ${
                            isBloqueado
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-900/80'
                              : 'bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900/80'
                          }`}
                        >
                          {isBloqueado ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          disabled={excluindoId === emp.id}
                          onClick={() => handleExcluir(emp.id, emp.nomeFantasia)}
                          title="Excluir Empresa"
                          className="p-1.5 bg-red-950/40 hover:bg-red-900/80 text-red-300 border border-red-800/80 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Cadastro e Edição de Empresa */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {empresaEditando ? 'Editar Empresa / Cliente' : 'Cadastrar Nova Empresa'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configuração multi-tenant para cliente da plataforma Delivery
                  </p>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmeterForm} className="space-y-4 py-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nome Fantasia */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNomeFantasia}
                    onChange={(e) => setFormNomeFantasia(e.target.value)}
                    placeholder="ex: Disk Gás & Água Express"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Razão Social */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={formRazaoSocial}
                    onChange={(e) => setFormRazaoSocial(e.target.value)}
                    placeholder="ex: Disk Gás Comércio Ltda"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* CNPJ */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCnpj}
                    onChange={(e) => setFormCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    placeholder="(11) 98888-0000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    E-mail de Contato / Financeiro
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Cidade / Estado */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formCidade}
                      onChange={(e) => setFormCidade(e.target.value)}
                      placeholder="São Paulo"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formEstado}
                      onChange={(e) => setFormEstado(e.target.value.toUpperCase())}
                      placeholder="SP"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-center font-bold"
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Endereço Completo (Rua, Número, Bairro)
                  </label>
                  <input
                    type="text"
                    value={formEndereco}
                    onChange={(e) => setFormEndereco(e.target.value)}
                    placeholder="Av. Paulista, 1000 - Bela Vista"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Plano */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Plano SaaS</label>
                  <select
                    value={formPlano}
                    onChange={(e) => setFormPlano(e.target.value as PlanoEmpresa)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="BASICO">Básico (Até 5 usuários / R$ 99/mês)</option>
                    <option value="PRO">Pro (Até 10 usuários / R$ 199/mês)</option>
                    <option value="ENTERPRISE">Enterprise (Até 25 usuários / R$ 399/mês)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status da Conta</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as StatusEmpresa)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ATIVO">Ativo (Acesso Liberado)</option>
                    <option value="BLOQUEADO">Bloqueado (Inadimplente / Pausado)</option>
                    <option value="PENDENTE">Pendente (Aguardando Aprovação)</option>
                  </select>
                </div>

                {/* Valor Mensalidade */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Valor Mensalidade (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formValorMensalidade}
                    onChange={(e) => setFormValorMensalidade(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                {/* Limite de Usuários */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Limite de Usuários
                  </label>
                  <input
                    type="number"
                    value={formLimiteUsuarios}
                    onChange={(e) => setFormLimiteUsuarios(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Observações */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Observações Internas (Super Admin)
                  </label>
                  <textarea
                    rows={2}
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    placeholder="Notas sobre o cliente, particularidades de faturamento ou contatos..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {salvando ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando Empresa...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{empresaEditando ? 'Salvar Alterações' : 'Cadastrar Empresa'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
