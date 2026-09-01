import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  DollarSign,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Trash2,
  TrendingUp,
  Unlock,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Empresa, PlanoEmpresa, StatusEmpresa, Usuario } from '../types';
import {
  apenasDigitos,
  consultarCep,
  consultarCnpj,
  formatarCep,
  formatarCnpj,
  formatarTelefone,
  isCepValido,
} from '../services/consultaApi';

interface SuperAdminHubProps {
  usuarioSuperAdmin: Usuario;
  empresas: Empresa[];
  onSelecionarEmpresa: (empresa: Empresa) => void;
  onSalvarEmpresa: (empresa: any) => Promise<any>;
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

  // Form State da Empresa
  const [formRazaoSocial, setFormRazaoSocial] = useState('');
  const [formNomeFantasia, setFormNomeFantasia] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCep, setFormCep] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formEstado, setFormEstado] = useState('SP');
  const [formEndereco, setFormEndereco] = useState('');
  const [formNumero, setFormNumero] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formComplemento, setFormComplemento] = useState('');
  const [formPlano, setFormPlano] = useState<PlanoEmpresa>('PRO');
  const [formStatus, setFormStatus] = useState<StatusEmpresa>('ATIVO');
  const [formLimiteUsuarios, setFormLimiteUsuarios] = useState(10);
  const [formLimitePedidosMes, setFormLimitePedidosMes] = useState(5000);
  const [formValorMensalidade, setFormValorMensalidade] = useState(199);
  const [formObservacoes, setFormObservacoes] = useState('');

  // Form State do Administrador (Acesso da Empresa)
  const [formAdminNome, setFormAdminNome] = useState('');
  const [formAdminLogin, setFormAdminLogin] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');
  const [formAdminSenha, setFormAdminSenha] = useState('Admin@123');
  const [formAdminPin, setFormAdminPin] = useState('1234');
  const [formAdminTelefone, setFormAdminTelefone] = useState('');
  const [mostrarSenhaAdmin, setMostrarSenhaAdmin] = useState(false);
  const [carregandoAdminEdicao, setCarregandoAdminEdicao] = useState(false);

  // Guia / Aba Ativa no Modal de Empresa
  type AbaModalEmpresa = 'empresa' | 'endereco' | 'plano' | 'admin';
  const [abaAtivaModal, setAbaAtivaModal] = useState<AbaModalEmpresa>('empresa');

  // Modal de Credenciais de Acesso da Empresa Criada / Atualizada
  const [credenciaisModal, setCredenciaisModal] = useState<{
    empresa: Empresa;
    usuarioAdmin?: any;
    credenciais: {
      nome: string;
      login: string;
      email: string;
      senha: string;
      pinAcesso: string;
      perfil: string;
      cargo: string;
      empresaNome: string;
      empresaCnpj: string;
      empresaId: string;
    };
  } | null>(null);

  const [copiadoFeedback, setCopiadoFeedback] = useState(false);
  const [toastMensagem, setToastMensagem] = useState<string | null>(null);

  // Status de Consulta Externa
  const [consultandoCnpj, setConsultandoCnpj] = useState(false);
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [cnpjInfo, setCnpjInfo] = useState<{ situacao?: string; cnae?: string; abertura?: string } | null>(null);
  const [erroCnpj, setErroCnpj] = useState<string | null>(null);

  const gerarSenhaForte = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const gerarSenhaAleatoria = () => {
    const pass = gerarSenhaForte();
    setFormAdminSenha(pass);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormAdminPin(pin);
  };

  const abrirModalNovo = () => {
    setEmpresaEditando(null);
    setFormRazaoSocial('');
    setFormNomeFantasia('');
    setFormCnpj('');
    setFormTelefone('');
    setFormEmail('');
    setFormCep('');
    setFormCidade('São Paulo');
    setFormEstado('SP');
    setFormEndereco('');
    setFormNumero('');
    setFormBairro('');
    setFormComplemento('');
    setFormPlano('PRO');
    setFormStatus('ATIVO');
    setFormLimiteUsuarios(10);
    setFormLimitePedidosMes(5000);
    setFormValorMensalidade(199);
    setFormObservacoes('');
    
    // Reset Admin Inicial
    setFormAdminNome('');
    setFormAdminLogin('');
    setFormAdminEmail('');
    setFormAdminSenha('Admin@123');
    setFormAdminPin('1234');
    setFormAdminTelefone('');
    setMostrarSenhaAdmin(false);

    setCnpjInfo(null);
    setErroCnpj(null);
    setAbaAtivaModal('empresa');
    setModalAberto(true);
  };

  const abrirModalEdicao = async (emp: Empresa) => {
    setEmpresaEditando(emp);
    setAbaAtivaModal('empresa');
    setFormRazaoSocial(emp.razaoSocial || emp.nomeFantasia);
    setFormNomeFantasia(emp.nomeFantasia);
    setFormCnpj(emp.cnpj);
    setFormTelefone(emp.telefone || '');
    setFormEmail(emp.email || '');
    setFormCep(emp.cep || '');
    setFormCidade(emp.cidade || 'São Paulo');
    setFormEstado(emp.estado || 'SP');
    setFormEndereco(emp.endereco || '');
    setFormNumero(emp.numero || '');
    setFormBairro(emp.bairro || '');
    setFormComplemento(emp.complemento || '');
    setFormPlano(emp.plano || 'PRO');
    setFormStatus(emp.status || 'ATIVO');
    setFormLimiteUsuarios(emp.limiteUsuarios || 10);
    setFormLimitePedidosMes(emp.limitePedidosMes || 5000);
    setFormValorMensalidade(emp.valorMensalidade || 199);
    setFormObservacoes(emp.observacoes || '');
    setCnpjInfo(null);
    setErroCnpj(null);

    // Carrega dados atuais do Administrador Master desta empresa
    const cleanFantasia = emp.nomeFantasia.toLowerCase().replace(/[^a-z0-9]/g, '');
    const emailSugestao = emp.email?.includes('@') ? emp.email : `admin@${cleanFantasia || emp.id}.com.br`;
    setFormAdminNome(`Admin ${emp.nomeFantasia}`);
    setFormAdminLogin(emailSugestao);
    setFormAdminEmail(emailSugestao);
    setFormAdminSenha(''); // Vazio por padrão na edição: indica manter a mesma se não preenchido
    setFormAdminPin('1234');
    setFormAdminTelefone(emp.telefone || '');
    setMostrarSenhaAdmin(false);

    setModalAberto(true);

    try {
      setCarregandoAdminEdicao(true);
      const res = await fetch(`/api/empresas/${emp.id}/admin`);
      if (res.ok) {
        const json = await res.json();
        if (json.usuario) {
          if (json.usuario.nome) setFormAdminNome(json.usuario.nome);
          const emailEncontrado = json.usuario.email || (json.usuario.login?.includes('@') ? json.usuario.login : '');
          if (emailEncontrado) {
            setFormAdminEmail(emailEncontrado);
            setFormAdminLogin(emailEncontrado);
          } else if (json.usuario.login) {
            setFormAdminLogin(json.usuario.login);
          }
          if (json.usuario.telefone) setFormAdminTelefone(json.usuario.telefone);
          if (json.usuario.pinAcesso) setFormAdminPin(json.usuario.pinAcesso);
        }
      }
    } catch (e) {
      console.warn('Não foi possível carregar dados do admin:', e);
    } finally {
      setCarregandoAdminEdicao(false);
    }
  };

  const handleConsultarCnpjEmpresa = async (cnpjParam?: string) => {
    const raw = cnpjParam || formCnpj;
    const clean = apenasDigitos(raw);
    if (clean.length !== 14) {
      return;
    }

    try {
      setConsultandoCnpj(true);
      setCnpjInfo(null);
      setErroCnpj(null);
      const res = await consultarCnpj(clean);

      setFormCnpj(res.cnpjFormatado);
      if (res.razaoSocial) setFormRazaoSocial(res.razaoSocial);
      if (res.nomeFantasia) setFormNomeFantasia(res.nomeFantasia);
      if (res.telefone) setFormTelefone(formatarTelefone(res.telefone));
      if (res.email) setFormEmail(res.email);
      if (res.cepFormatado) setFormCep(res.cepFormatado);
      if (res.logradouro) setFormEndereco(res.logradouro);
      if (res.numero) setFormNumero(res.numero);
      if (res.complemento) setFormComplemento(res.complemento);
      if (res.bairro) setFormBairro(res.bairro);
      if (res.cidade) setFormCidade(res.cidade);
      if (res.estado) setFormEstado(res.estado);

      // Preenche sugestões para o Administrador Inicial caso ainda estejam vazios
      if (!formAdminNome) {
        setFormAdminNome(`Administrador - ${res.nomeFantasia || res.razaoSocial || 'Empresa'}`);
      }
      if (!formAdminEmail && res.email) {
        setFormAdminEmail(res.email);
      }
      if (!formAdminTelefone && res.telefone) {
        setFormAdminTelefone(formatarTelefone(res.telefone));
      }
      if (!formAdminLogin) {
        const cleanNome = (res.nomeFantasia || res.razaoSocial || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        setFormAdminLogin(cleanNome ? `admin_${cleanNome}` : 'admin');
      }

      setCnpjInfo({
        situacao: res.situacao,
        cnae: res.cnae,
        abertura: res.abertura,
      });
      setErroCnpj(null);
    } catch (err: any) {
      const msg = err.message || 'CNPJ não localizado na Receita Federal.';
      setErroCnpj(msg);
      setCnpjInfo(null);
    } finally {
      setConsultandoCnpj(false);
    }
  };

  const handleConsultarCepEmpresa = async (cepParam?: string) => {
    const raw = cepParam || formCep;
    const clean = apenasDigitos(raw);
    if (clean.length !== 8) {
      if (!cepParam) alert('Informe um CEP com 8 dígitos.');
      return;
    }

    try {
      setConsultandoCep(true);
      const res = await consultarCep(clean);
      setFormCep(res.cepFormatado);
      if (res.localizado === false) {
        alert(res.mensagem || 'CEP não localizado nos Correios. Preencha os campos manualmente.');
        return;
      }
      if (res.logradouro) setFormEndereco(res.logradouro);
      if (res.bairro) setFormBairro(res.bairro);
      if (res.cidade) setFormCidade(res.cidade);
      if (res.estado) setFormEstado(res.estado);
    } catch (err: any) {
      alert(err.message || 'Erro ao consultar CEP. Preencha os campos manualmente.');
    } finally {
      setConsultandoCep(false);
    }
  };

  const handleSubmeterForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNomeFantasia.trim() || !formCnpj.trim()) {
      alert('Preencha pelo menos o Nome Fantasia e o CNPJ da empresa.');
      return;
    }

    // Validação do E-mail de Acesso do Administrador Master (Supabase Auth)
    const cleanFantasia = formNomeFantasia.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const emailAdminFinal = (
      formAdminEmail.trim() ||
      formEmail.trim() ||
      formAdminLogin.trim() ||
      `admin@${cleanFantasia || 'empresa'}.com.br`
    ).toLowerCase();

    if (!empresaEditando && (!emailAdminFinal || !emailAdminFinal.includes('@') || !emailAdminFinal.includes('.'))) {
      alert('O login do sistema exige um e-mail válido para autenticação no Supabase Auth (ex: admin@empresa.com.br ou contato@dominio.com). Por favor, preencha o E-mail de Acesso na aba "Acesso Master".');
      setAbaAtivaModal('admin');
      return;
    }

    setSalvando(true);
    try {
      const payload: any = {
        id: empresaEditando?.id,
        razaoSocial: formRazaoSocial.trim() || formNomeFantasia.trim(),
        nomeFantasia: formNomeFantasia.trim(),
        cnpj: formCnpj.trim(),
        telefone: formTelefone.trim(),
        email: formEmail.trim().toLowerCase(),
        cep: formCep.trim(),
        cidade: formCidade.trim(),
        estado: formEstado.trim(),
        endereco: formEndereco.trim(),
        numero: formNumero.trim(),
        bairro: formBairro.trim(),
        complemento: formComplemento.trim(),
        plano: formPlano,
        status: formStatus,
        limiteUsuarios: Number(formLimiteUsuarios),
        limitePedidosMes: Number(formLimitePedidosMes),
        valorMensalidade: Number(formValorMensalidade),
        observacoes: formObservacoes.trim(),
      };

      if (!empresaEditando) {
        payload.adminInicial = {
          nome: formAdminNome.trim() || `Admin ${formNomeFantasia.trim()}`,
          login: emailAdminFinal,
          email: emailAdminFinal,
          senha: formAdminSenha.trim() || 'Admin@123',
          pinAcesso: formAdminPin.trim() || '1234',
          telefone: formAdminTelefone.trim() || formTelefone.trim(),
        };
      } else {
        // Na edição, envia dados do admin se houver alterações ou nova senha informada
        payload.adminData = {
          nome: formAdminNome.trim() || `Admin ${formNomeFantasia.trim()}`,
          login: emailAdminFinal,
          email: emailAdminFinal,
          senha: formAdminSenha.trim() || undefined, // undefined se vazio para não sobrescrever
          pinAcesso: formAdminPin.trim() || '1234',
          telefone: formAdminTelefone.trim() || formTelefone.trim(),
        };
      }

      const res = await onSalvarEmpresa(payload);
      setModalAberto(false);
      setToastMensagem(empresaEditando ? `Dados da empresa "${formNomeFantasia.trim()}" gravados com sucesso!` : `Empresa "${formNomeFantasia.trim()}" cadastrada com sucesso!`);
      setTimeout(() => setToastMensagem(null), 4000);

      if (res?.credenciais && (!empresaEditando || Boolean(formAdminSenha.trim()))) {
        setCredenciaisModal({
          empresa: res.empresa || res,
          usuarioAdmin: res.usuarioAdmin,
          credenciais: res.credenciais,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar dados da empresa');
    } finally {
      setSalvando(false);
    }
  };

  const gerarTextoCredenciais = (cred: any) => {
    const urlSistema = window.location.origin;
    const emailLogin = cred.email || cred.login;
    return `🚀 *ACESSO AO SISTEMA DELIVERY & CONVENIÊNCIA*

Olá *${cred.nome}*, seu acesso de Administrador Master para a empresa *${cred.empresaNome}* foi liberado com sucesso!

📍 *Dados da Conta:*
• *Empresa:* ${cred.empresaNome} (CNPJ: ${cred.empresaCnpj})
• *Perfil:* Administrador Master
• *Painel de Acesso:* ${urlSistema}

🔑 *Credenciais de Acesso (Supabase Auth):*
• *E-mail de Login:* ${emailLogin}
• *Senha Inicial:* ${cred.senha}
• *PIN Rápido (PDV/Balcão):* ${cred.pinAcesso}

💡 *Primeiros Passos:*
1. Acesse o endereço acima no navegador do seu computador ou celular.
2. Faça login com seu e-mail (*${emailLogin}*) e a senha informada.
3. No painel, você já pode emitir pedidos, gerenciar seu estoque de gás/água, cadastrar entregadores e configurar taxas de entrega.

Em caso de dúvidas, estamos à disposição!`;
  };

  const handleCopiarCredenciais = (cred: any) => {
    const texto = gerarTextoCredenciais(cred);
    navigator.clipboard.writeText(texto);
    setCopiadoFeedback(true);
    setTimeout(() => setCopiadoFeedback(false), 3000);
  };

  const handleEnviarWhatsApp = (cred: any) => {
    const tel = formAdminTelefone || formTelefone || cred.telefone || '';
    const numLimpo = apenasDigitos(tel);
    const texto = encodeURIComponent(gerarTextoCredenciais(cred));
    const url = numLimpo ? `https://wa.me/55${numLimpo}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, '_blank');
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
        {/* Toast / Feedback de Sucesso */}
        {toastMensagem && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center justify-between text-emerald-200 text-sm shadow-xl animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white">{toastMensagem}</p>
                <p className="text-xs text-emerald-400/80">Dados gravados e sincronizados com sucesso no sistema.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToastMensagem(null)}
              className="p-1.5 rounded-lg hover:bg-emerald-900/50 text-emerald-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

      {/* Modal de Cadastro e Edição de Empresa com Abas (Sem rolagem) */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>{empresaEditando ? 'Editar Empresa / Cliente' : 'Cadastrar Nova Empresa'}</span>
                    {empresaEditando && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {empresaEditando.cnpj}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configuração multi-tenant para cliente da plataforma Delivery
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB NAVIGATION BAR */}
            <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl my-3 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setAbaAtivaModal('empresa')}
                className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  abaAtivaModal === 'empresa'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">1. Empresa</span>
              </button>

              <button
                type="button"
                onClick={() => setAbaAtivaModal('endereco')}
                className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  abaAtivaModal === 'endereco'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">2. Endereço</span>
              </button>

              <button
                type="button"
                onClick={() => setAbaAtivaModal('plano')}
                className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  abaAtivaModal === 'plano'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="truncate">3. Plano SaaS</span>
              </button>

              <button
                type="button"
                onClick={() => setAbaAtivaModal('admin')}
                className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                  abaAtivaModal === 'admin'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="truncate">4. Acesso Master</span>
              </button>
            </div>

            {/* Form Body - Conteúdo das Abas */}
            <form onSubmit={handleSubmeterForm} className="space-y-3 flex-1 text-xs">
              {/* ABA 1: IDENTIFICAÇÃO E CNPJ */}
              {abaAtivaModal === 'empresa' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {/* Bloco de Consulta Automática por CNPJ */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>CNPJ da Empresa (Preenchimento Automático pela Receita)</span>
                      </label>
                      {cnpjInfo?.situacao && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {cnpjInfo.situacao} {cnpjInfo.abertura ? `• Desde ${cnpjInfo.abertura}` : ''}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={formCnpj}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const formatted = formatarCnpj(raw);
                          setFormCnpj(formatted);
                          const clean = apenasDigitos(raw);
                          if (erroCnpj) setErroCnpj(null);
                          if (clean.length === 14 && !consultandoCnpj) {
                            handleConsultarCnpjEmpresa(clean);
                          }
                        }}
                        placeholder="Digite CNPJ (14 dígitos) para preenchimento automático"
                        className="w-full px-3 py-2 pr-12 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                      />
                      {consultandoCnpj && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-amber-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[10px] font-bold">Consultando Receita...</span>
                        </div>
                      )}
                    </div>

                    {erroCnpj && (
                      <div className="p-2 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-200 flex items-center gap-2 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{erroCnpj}</span>
                      </div>
                    )}
                    {cnpjInfo?.cnae && (
                      <p className="text-[10px] text-slate-400 truncate">
                        <span className="font-semibold text-slate-300">Atividade Principal:</span> {cnpjInfo.cnae}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Nome Fantasia *
                      </label>
                      <input
                        type="text"
                        required
                        value={formNomeFantasia}
                        onChange={(e) => setFormNomeFantasia(e.target.value.toUpperCase())}
                        placeholder="ex: Disk Gás & Água Express"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Razão Social
                      </label>
                      <input
                        type="text"
                        value={formRazaoSocial}
                        onChange={(e) => setFormRazaoSocial(e.target.value.toUpperCase())}
                        placeholder="ex: Disk Gás Comércio Ltda"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Telefone / WhatsApp Principal
                      </label>
                      <input
                        type="text"
                        value={formTelefone}
                        onChange={(e) => setFormTelefone(formatarTelefone(e.target.value))}
                        placeholder="(11) 98888-0000"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        E-mail de Contato / Financeiro
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().trim();
                          setFormEmail(val);
                          if (!empresaEditando && (!formAdminEmail || formAdminEmail.includes('@'))) {
                            setFormAdminEmail(val);
                            setFormAdminLogin(val);
                          }
                        }}
                        placeholder="contato@empresa.com.br"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: ENDEREÇO */}
              {abaAtivaModal === 'endereco' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                        <span>CEP</span>
                        <span className="text-[9px] text-amber-400 font-normal">Automático</span>
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={formCep}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const formatted = formatarCep(raw);
                            setFormCep(formatted);
                            const clean = apenasDigitos(raw);
                            if (clean.length === 8 && !consultandoCep) {
                              handleConsultarCepEmpresa(clean);
                            }
                          }}
                          onBlur={() => {
                            if (formCep && isCepValido(formCep)) {
                              handleConsultarCepEmpresa();
                            }
                          }}
                          placeholder="01001-000"
                          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleConsultarCepEmpresa()}
                          disabled={consultandoCep}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl transition-colors shrink-0"
                          title="Buscar CEP"
                        >
                          {consultandoCep ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Search className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={formCidade}
                        onChange={(e) => setFormCidade(e.target.value.toUpperCase())}
                        placeholder="São Paulo"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">UF (Estado)</label>
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

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Logradouro / Rua / Avenida
                    </label>
                    <input
                      type="text"
                      value={formEndereco}
                      onChange={(e) => setFormEndereco(e.target.value.toUpperCase())}
                      placeholder="Av. Paulista"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Número</label>
                      <input
                        type="text"
                        value={formNumero}
                        onChange={(e) => setFormNumero(e.target.value.toUpperCase())}
                        placeholder="1000"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={formBairro}
                        onChange={(e) => setFormBairro(e.target.value.toUpperCase())}
                        placeholder="Bela Vista"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Complemento</label>
                      <input
                        type="text"
                        value={formComplemento}
                        onChange={(e) => setFormComplemento(e.target.value.toUpperCase())}
                        placeholder="Sala 102"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: PLANO SAAS E CONTRATO */}
              {abaAtivaModal === 'plano' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Plano SaaS</label>
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

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Status da Conta</label>
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

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Valor Mensalidade (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formValorMensalidade}
                        onChange={(e) => setFormValorMensalidade(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">
                        Limite de Usuários
                      </label>
                      <input
                        type="number"
                        value={formLimiteUsuarios}
                        onChange={(e) => setFormLimiteUsuarios(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      Observações Internas (Super Admin)
                    </label>
                    <textarea
                      rows={2}
                      value={formObservacoes}
                      onChange={(e) => setFormObservacoes(e.target.value.toUpperCase())}
                      placeholder="Notas sobre faturamento, contatos de emergência, particularidades..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ABA 4: ACESSO & ADMINISTRADOR MASTER */}
              {abaAtivaModal === 'admin' && (
                <div className="p-3.5 bg-gradient-to-br from-slate-950 to-amber-950/20 border border-amber-500/40 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <span>{empresaEditando ? 'Administrador Master & Credenciais' : 'Administrador Inicial & Primeiro Acesso'}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            ADMIN Master
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {empresaEditando
                            ? 'Edite os dados de login ou gere uma nova senha caso o cliente tenha esquecido.'
                            : 'Usuário inicial com acesso irrestrito para gerenciar produtos, entregadores e PDV.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={gerarSenhaAleatoria}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shrink-0"
                      title="Gerar nova senha e PIN aleatórios"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>{empresaEditando ? 'Gerar Nova Senha/PIN' : 'Gerar Senha/PIN'}</span>
                    </button>
                  </div>

                  {carregandoAdminEdicao ? (
                    <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Carregando dados de acesso do administrador...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-300 mb-1">
                          Nome do Administrador / Responsável
                        </label>
                        <input
                          type="text"
                          value={formAdminNome}
                          onChange={(e) => setFormAdminNome(e.target.value)}
                          placeholder="ex: João Silva (Diretor)"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                          <span>E-mail de Acesso (Login Supabase) *</span>
                          <span className="text-[10px] text-amber-400 font-normal">Identificador único de entrada</span>
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            value={formAdminEmail || formAdminLogin}
                            onChange={(e) => {
                              const val = e.target.value.toLowerCase().trim();
                              setFormAdminEmail(val);
                              setFormAdminLogin(val);
                            }}
                            placeholder="ex: admin@empresa.com.br ou seu-email@dominio.com"
                            className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                          />
                          <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                          <span>{empresaEditando ? 'Nova Senha (deixe em branco p/ manter)' : 'Senha de Acesso'}</span>
                          <button
                            type="button"
                            onClick={() => setMostrarSenhaAdmin(!mostrarSenhaAdmin)}
                            className="text-[10px] text-amber-400 font-normal hover:underline flex items-center gap-0.5"
                          >
                            {mostrarSenhaAdmin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{mostrarSenhaAdmin ? 'Ocultar' : 'Mostrar'}</span>
                          </button>
                        </label>
                        <input
                          type={mostrarSenhaAdmin ? 'text' : 'password'}
                          value={formAdminSenha}
                          onChange={(e) => setFormAdminSenha(e.target.value)}
                          placeholder={empresaEditando ? 'Deixe em branco para manter a senha atual' : 'Senha de acesso'}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-300 mb-1">
                          PIN Numérico Rápido (4 dígitos)
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={formAdminPin}
                          onChange={(e) => setFormAdminPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="1234"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold text-center tracking-widest"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-slate-300 mb-1">
                          WhatsApp do Responsável (Para envio automático das credenciais)
                        </label>
                        <input
                          type="text"
                          value={formAdminTelefone}
                          onChange={(e) => setFormAdminTelefone(formatarTelefone(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2">
                  {/* Botão Anterior se não for a primeira aba */}
                  {abaAtivaModal !== 'empresa' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (abaAtivaModal === 'endereco') setAbaAtivaModal('empresa');
                        else if (abaAtivaModal === 'plano') setAbaAtivaModal('endereco');
                        else if (abaAtivaModal === 'admin') setAbaAtivaModal('plano');
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Voltar</span>
                    </button>
                  )}

                  {/* Botão Próximo se não for a última aba */}
                  {abaAtivaModal !== 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (abaAtivaModal === 'empresa') setAbaAtivaModal('endereco');
                        else if (abaAtivaModal === 'endereco') setAbaAtivaModal('plano');
                        else if (abaAtivaModal === 'plano') setAbaAtivaModal('admin');
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                    >
                      <span>Avançar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Botão Salvar Primário */}
                  <button
                    type="submit"
                    disabled={salvando}
                    className="px-4 sm:px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {salvando ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{empresaEditando ? 'Salvar Alterações' : 'Cadastrar Empresa'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO: ENTREGA DE CREDENCIAIS & BOAS-VINDAS */}
      {credenciaisModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-xs">
            {/* Header com Sucesso */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl text-slate-950 font-black shadow-lg shadow-amber-500/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  <span>Credenciais de Acesso Liberadas!</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </h3>
                <p className="text-xs text-slate-400">
                  O acesso do Administrador Master foi configurado. Você pode copiar ou enviar diretamente pelo WhatsApp.
                </p>
              </div>
            </div>

            {/* Cartão de Credenciais */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Empresa Vinculada</div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{credenciaisModal.credenciais.empresaNome}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ADMIN MASTER
                </span>
              </div>

              <div className="space-y-2 font-mono">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">Responsável:</span>
                  <span className="text-white font-bold text-[11px] font-sans">
                    {credenciaisModal.credenciais.nome}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">E-mail de Acesso (Login):</span>
                  <span className="text-amber-300 font-bold text-[11px]">
                    {credenciaisModal.credenciais.email || credenciaisModal.credenciais.login}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">Senha Inicial:</span>
                  <span className="text-emerald-400 font-bold text-[11px]">
                    {credenciaisModal.credenciais.senha}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">PIN Rápido (PDV):</span>
                  <span className="text-purple-300 font-bold text-[11px] tracking-wider">
                    {credenciaisModal.credenciais.pinAcesso}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">Link do Sistema:</span>
                  <span className="text-slate-300 text-[10px] truncate max-w-[200px]">
                    {window.location.origin}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações de Envio e Compartilhamento */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Copiar Texto Formatado */}
                <button
                  type="button"
                  onClick={() => handleCopiarCredenciais(credenciaisModal.credenciais)}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {copiadoFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Copiar Dados de Acesso</span>
                    </>
                  )}
                </button>

                {/* Enviar pelo WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleEnviarWhatsApp(credenciaisModal.credenciais)}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>

              {/* Botão Primário: Entrar no Sistema desta Empresa */}
              <button
                type="button"
                onClick={() => {
                  const emp = credenciaisModal.empresa;
                  setCredenciaisModal(null);
                  onSelecionarEmpresa(emp);
                }}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Crown className="w-4 h-4" />
                <span>Acessar Painel desta Empresa Agora</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                type="button"
                onClick={() => setCredenciaisModal(null)}
                className="w-full py-2 text-slate-400 hover:text-slate-200 font-semibold text-center transition-colors"
              >
                Fechar e voltar ao Painel Super Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
