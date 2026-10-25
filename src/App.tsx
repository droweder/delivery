import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react';
import {
  BairroTaxa,
  Cliente,
  Colaborador,
  Empresa,
  Entregador,
  Pedido,
  Produto,
  TurnoEntregador,
  Usuario,
  Veiculo,
} from './types';
import { INITIAL_EMPRESAS, INITIAL_USUARIOS } from './data/initialData';
import { MainTab } from './components/Navbar';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { isDeviceOffline, setSimulatedOffline } from './lib/offlineDb';
import { PdvModulo } from './components/PdvModulo';
import { DespachoKanban } from './components/DespachoKanban';
import { AppEntregador } from './components/AppEntregador';
import { AcertoCaixa } from './components/AcertoCaixa';
import { EstoqueVasilhames } from './components/EstoqueVasilhames';
import { DashboardGerente } from './components/DashboardGerente';
import { CadastrosHub } from './components/CadastrosHub';
import { GestaoUsuarios } from './components/GestaoUsuarios';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { LoginScreen } from './components/LoginScreen';
import { SuperAdminHub } from './components/SuperAdminHub';
import { registerServiceWorker } from './lib/registerSw';
import { imprimirComanda } from './lib/thermalPrinter';

// Helpers de Validação de Permissão de Abas
const isAbaPermitida = (tab: MainTab, usuario: Usuario | null, isSuperAdmin: boolean): boolean => {
  if (!usuario) return false;
  if (isSuperAdmin || usuario.perfil === 'SUPER_ADMIN' || usuario.perfil === 'ADMIN') return true;
  switch (tab) {
    case 'pdv':
      return Boolean(usuario.permissoes?.emitirPedidos);
    case 'despacho':
      return Boolean(usuario.permissoes?.despacharPedidos);
    case 'acerto':
      return Boolean(usuario.permissoes?.realizarAcertoCaixa);
    case 'vasilhames':
      return Boolean(usuario.permissoes?.ajustarEstoque);
    case 'gerencia':
      return Boolean(usuario.permissoes?.verDashboardGerencial);
    case 'cadastros':
      return Boolean(usuario.permissoes?.acessarCadastros);
    case 'usuarios':
      return Boolean(usuario.permissoes?.gerenciarUsuarios);
    case 'entregador':
      return usuario.perfil === 'ENTREGADOR' || Boolean(usuario.entregadorIdVinculado);
    default:
      return false;
  }
};

const getPrimeiraAbaPermitida = (usuario: Usuario | null, isSuperAdmin: boolean): MainTab => {
  if (!usuario) return 'pdv';
  if (isSuperAdmin || usuario.perfil === 'SUPER_ADMIN' || usuario.perfil === 'ADMIN') return 'pdv';
  if (usuario.perfil === 'ENTREGADOR' || usuario.entregadorIdVinculado) return 'entregador';
  if (usuario.permissoes?.emitirPedidos) return 'pdv';
  if (usuario.permissoes?.despacharPedidos) return 'despacho';
  if (usuario.permissoes?.verDashboardGerencial) return 'gerencia';
  if (usuario.permissoes?.realizarAcertoCaixa) return 'acerto';
  if (usuario.permissoes?.ajustarEstoque) return 'vasilhames';
  if (usuario.permissoes?.acessarCadastros) return 'cadastros';
  if (usuario.permissoes?.gerenciarUsuarios) return 'usuarios';
  return 'pdv';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('pdv');
  const [empresas, setEmpresas] = useState<Empresa[]>(INITIAL_EMPRESAS);
  const [empresaAtual, setEmpresaAtual] = useState<Empresa | null>(() => {
    const salvo = localStorage.getItem('delivery_auth_empresa');
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch (e) {
        return null;
      }
    }
    return INITIAL_EMPRESAS[0] || null;
  });

  const [empresaNome, setEmpresaNome] = useState<string>(() => {
    return localStorage.getItem('delivery_empresa_nome') || 'Disk Entrega & Conveniência';
  });

  // Autenticação
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(() => {
    const salvo = localStorage.getItem('delivery_auth_user');
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [modoSuperAdminHub, setModoSuperAdminHub] = useState<boolean>(() => {
    const salvo = localStorage.getItem('delivery_auth_user');
    if (salvo) {
      try {
        const u = JSON.parse(salvo);
        return u.perfil === 'SUPER_ADMIN' && !localStorage.getItem('delivery_auth_empresa');
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  const [bairros, setBairros] = useState<BairroTaxa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>(INITIAL_USUARIOS);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [turnos, setTurnos] = useState<TurnoEntregador[]>([]);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoComandaModal, setPedidoComandaModal] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [syncFeedback, setSyncFeedback] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; mensagem: string } | null>(null);
  const [sincronizandoAgora, setSincronizandoAgora] = useState(false);

  // Estados do Menu Lateral (Sidebar) & Conectividade
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return true;
    }
    return false;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [offlineMode, setOfflineMode] = useState(isDeviceOffline());

  const toggleOfflineSimulation = () => {
    const next = !offlineMode;
    setSimulatedOffline(next);
    setOfflineMode(next);
  };

  useEffect(() => {
    const handleNetworkChange = () => {
      setOfflineMode(isDeviceOffline());
    };
    window.addEventListener('network-status-changed', handleNetworkChange);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
    return () => {
      window.removeEventListener('network-status-changed', handleNetworkChange);
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  // Helper para requisições autenticadas com contexto de Tenant
  const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> || {}),
    };
    if (empresaAtual?.id) {
      headers['x-empresa-id'] = empresaAtual.id;
    }
    if (usuarioLogado?.id) {
      headers['x-user-id'] = usuarioLogado.id;
    }
    return fetch(input, { ...init, headers });
  };

  // Carrega todos os dados do backend
  const carregarDadosServidor = async (forceSupabaseSync = false) => {
    try {
      if (forceSupabaseSync) {
        setSincronizandoAgora(true);
        try {
          const syncRes = await authFetch('/api/supabase/sync', { method: 'POST' });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.success) {
              setSyncFeedback({
                tipo: 'sucesso',
                mensagem: syncData.mensagem || 'Sincronizado com sucesso com o Supabase (Schema: delivery)!',
              });
            } else if (syncData.error) {
              setSyncFeedback({
                tipo: 'erro',
                mensagem: `Erro no Supabase: ${syncData.error}`,
              });
            }
          }
        } catch (e: any) {
          console.warn('Erro ao chamar sync do Supabase:', e);
        } finally {
          setSincronizandoAgora(false);
        }
      }

      const headers: Record<string, string> = {};
      if (empresaAtual?.id) {
        headers['x-empresa-id'] = empresaAtual.id;
      }
      if (usuarioLogado?.id) {
        headers['x-user-id'] = usuarioLogado.id;
      }

      const parseSafeJson = async (res: Response) => {
        if (!res.ok) return null;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn(`[API] Resposta para ${res.url} não é JSON (${contentType})`);
          return null;
        }
        try {
          return await res.json();
        } catch (err) {
          console.warn(`[API] Erro ao decodificar JSON de ${res.url}:`, err);
          return null;
        }
      };

      const [resBairros, resProdutos, resClientes, resEntregadores, resPedidos, resUsuarios, resEmpresas, resVeiculos, resColaboradores, resTurnos] =
        await Promise.all([
          fetch('/api/bairros', { headers }),
          fetch('/api/produtos', { headers }),
          fetch('/api/clientes', { headers }),
          fetch('/api/entregadores', { headers }),
          fetch('/api/pedidos', { headers }),
          fetch('/api/usuarios', { headers }),
          fetch('/api/empresas', { headers }),
          fetch('/api/veiculos', { headers }),
          fetch('/api/colaboradores', { headers }),
          fetch('/api/turnos/historico', { headers }),
        ]);

      const dataBairros = await parseSafeJson(resBairros);
      if (dataBairros) setBairros(dataBairros);

      const dataProdutos = await parseSafeJson(resProdutos);
      if (dataProdutos) setProdutos(dataProdutos);

      const dataClientes = await parseSafeJson(resClientes);
      if (dataClientes) setClientes(dataClientes);

      const dataEntregadores = await parseSafeJson(resEntregadores);
      if (dataEntregadores) setEntregadores(dataEntregadores);

      const dataPedidos = await parseSafeJson(resPedidos);
      if (dataPedidos) setPedidos(dataPedidos);

      const dataEmpresas = await parseSafeJson(resEmpresas);
      if (dataEmpresas) setEmpresas(dataEmpresas);

      const dataVeiculos = await parseSafeJson(resVeiculos);
      if (dataVeiculos) setVeiculos(dataVeiculos);

      const dataColaboradores = await parseSafeJson(resColaboradores);
      if (dataColaboradores) setColaboradores(dataColaboradores);

      const dataTurnos = await parseSafeJson(resTurnos);
      if (dataTurnos) setTurnos(dataTurnos);

      const dataUsuarios = await parseSafeJson(resUsuarios);
      if (dataUsuarios) {
        setUsuarios(dataUsuarios);
        if (usuarioLogado) {
          setUsuarioLogado((prev) => (prev ? dataUsuarios.find((u: Usuario) => u.id === prev.id) || prev : null));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do servidor:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    registerServiceWorker();
    carregarDadosServidor();

    const handleSyncComplete = () => {
      carregarDadosServidor();
    };
    window.addEventListener('sync-completed', handleSyncComplete);
    return () => window.removeEventListener('sync-completed', handleSyncComplete);
  }, [empresaAtual?.id]);

  // Handler de Login Sucesso
  const handleLoginSucesso = (usuario: Usuario, empresa?: Empresa | null) => {
    setUsuarioLogado(usuario);
    localStorage.setItem('delivery_auth_user', JSON.stringify(usuario));

    if (usuario.perfil === 'SUPER_ADMIN') {
      if (empresa) {
        setEmpresaAtual(empresa);
        setEmpresaNome(empresa.nomeFantasia);
        setModoSuperAdminHub(false);
        localStorage.setItem('delivery_auth_empresa', JSON.stringify(empresa));
        localStorage.setItem('delivery_empresa_nome', empresa.nomeFantasia);
        setActiveTab('pdv');
      } else {
        setEmpresaAtual(null);
        setModoSuperAdminHub(true);
        localStorage.removeItem('delivery_auth_empresa');
      }
    } else {
      const emp = empresa || empresas.find((e) => e.id === usuario.empresaId) || empresas[0];
      setEmpresaAtual(emp);
      setEmpresaNome(emp?.nomeFantasia || 'Disk Entrega & Conveniência');
      setModoSuperAdminHub(false);
      if (emp) {
        localStorage.setItem('delivery_auth_empresa', JSON.stringify(emp));
        localStorage.setItem('delivery_empresa_nome', emp.nomeFantasia);
      }
      setActiveTab(getPrimeiraAbaPermitida(usuario, false));
    }
  };

  // Garante que o usuário logado só fique em abas autorizadas para seu perfil
  useEffect(() => {
    if (usuarioLogado && !modoSuperAdminHub) {
      const isSuper = usuarioLogado.perfil === 'SUPER_ADMIN';
      if (!isAbaPermitida(activeTab, usuarioLogado, isSuper)) {
        setActiveTab(getPrimeiraAbaPermitida(usuarioLogado, isSuper));
      }
    }
  }, [usuarioLogado, activeTab, modoSuperAdminHub]);

  // Super Admin seleciona uma empresa para acessar com tudo liberado
  const handleSelecionarEmpresaSuperAdmin = (empresa: Empresa) => {
    setEmpresaAtual(empresa);
    setEmpresaNome(empresa.nomeFantasia);
    setModoSuperAdminHub(false);
    localStorage.setItem('delivery_auth_empresa', JSON.stringify(empresa));
    localStorage.setItem('delivery_empresa_nome', empresa.nomeFantasia);
    setActiveTab('pdv');
  };

  // Super Admin volta para o painel de empresas
  const handleVoltarSuperAdmin = () => {
    setModoSuperAdminHub(true);
    setEmpresaAtual(null);
    localStorage.removeItem('delivery_auth_empresa');
  };

  // Logout
  const handleLogout = () => {
    setUsuarioLogado(null);
    setEmpresaAtual(null);
    setModoSuperAdminHub(false);
    localStorage.removeItem('delivery_auth_user');
    localStorage.removeItem('delivery_auth_empresa');
  };

  // Super Admin CRUD Empresa
  const handleSalvarEmpresa = async (dadosEmpresa: any) => {
    const isEdicao = Boolean(dadosEmpresa.id);
    const url = isEdicao ? `/api/empresas/${dadosEmpresa.id}` : '/api/empresas';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosEmpresa),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar empresa');
    }

    const saved = await res.json();
    const empresaSalva: Empresa = saved.empresa || saved;
    const empId = empresaSalva?.id || saved.id;
    if (empresaSalva && empId) {
      setEmpresas((prev) => {
        const existe = prev.some((e) => e.id === empId);
        if (existe) {
          return prev.map((e) => (e.id === empId ? { ...e, ...empresaSalva } : e));
        }
        return [empresaSalva, ...prev];
      });
    }
    if (empresaAtual && empresaAtual.id === empId) {
      setEmpresaAtual(empresaSalva);
      setEmpresaNome(empresaSalva.nomeFantasia);
    }
    await carregarDadosServidor();
    return saved;
  };

  const handleExcluirEmpresa = async (id: string) => {
    const res = await fetch(`/api/empresas/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir empresa');
    }
    setEmpresas((prev) => prev.filter((e) => e.id !== id));
    await carregarDadosServidor();
  };

  // Criação de Pedido no PDV
  const handlePedidoCriado = (novoPedido: Pedido, imprimirImediato = false) => {
    setPedidos((prev) => [novoPedido, ...prev]);
    if (imprimirImediato) {
      imprimirComanda(novoPedido);
    }
  };

  // Cadastro de Novo Cliente
  const handleNovoCliente = (novoCliente: Cliente) => {
    setClientes((prev) => [novoCliente, ...prev]);
  };

  // Despacho de Pedidos
  const handleDespacharPedidos = async (
    pedidosIds: string[],
    entregadorId: string,
    imprimir = false
  ) => {
    const res = await authFetch('/api/despacho/atribuir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidosIds, entregadorId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao despachar pedidos');
    }

    const { pedidos: pedidosAtualizados } = await res.json();
    setPedidos((prev) =>
      prev.map((p) => {
        const at = pedidosAtualizados.find((x: Pedido) => x.id === p.id);
        return at || p;
      })
    );

    if (imprimir) {
      pedidosAtualizados.forEach((p: Pedido) => imprimirComanda(p));
    }
  };

  // Handlers de Cadastros Hub
  const handleSalvarProduto = async (prod: Produto) => {
    const isEdicao = Boolean(prod.id && produtos.some((p) => p.id === prod.id));
    const url = isEdicao ? `/api/produtos/${prod.id}` : '/api/produtos';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...prod, empresaId: prod.empresaId || empresaAtual?.id || 'emp1' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar produto');
    }
    await carregarDadosServidor();
  };

  const handleExcluirProduto = async (id: string) => {
    const res = await authFetch(`/api/produtos/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir produto');
    }
    await carregarDadosServidor();
  };

  const handleSalvarCliente = async (cliente: Cliente) => {
    const isEdicao = Boolean(cliente.id && clientes.some((c) => c.id === cliente.id));
    const url = isEdicao ? `/api/clientes/${cliente.id}` : '/api/clientes';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cliente, empresaId: cliente.empresaId || empresaAtual?.id || 'emp1' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar cliente');
    }
    await carregarDadosServidor();
  };

  const handleExcluirCliente = async (id: string) => {
    const res = await authFetch(`/api/clientes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir cliente');
    }
    await carregarDadosServidor();
  };

  const handleSalvarEntregador = async (entregador: Partial<Entregador> & { id?: string }) => {
    const isEdicao = Boolean(entregador.id && entregadores.some((e) => e.id === entregador.id));
    const url = isEdicao ? `/api/entregadores/${entregador.id}` : '/api/entregadores';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entregador, empresaId: entregador.empresaId || empresaAtual?.id || 'emp1' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar entregador');
    }
    await carregarDadosServidor();
  };

  const handleExcluirEntregador = async (id: string) => {
    const res = await authFetch(`/api/entregadores/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir entregador');
    }
    await carregarDadosServidor();
  };

  const handleSalvarBairro = async (bairro: BairroTaxa) => {
    const isEdicao = Boolean(bairro.id && bairros.some((b) => b.id === bairro.id));
    const url = isEdicao ? `/api/bairros/${bairro.id}` : '/api/bairros';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...bairro, empresaId: bairro.empresaId || empresaAtual?.id || 'emp1' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar bairro');
    }
    await carregarDadosServidor();
  };

  const handleExcluirBairro = async (id: string) => {
    const res = await authFetch(`/api/bairros/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir bairro');
    }
    await carregarDadosServidor();
  };

  const handleSalvarUsuario = async (usuario: Partial<Usuario> & { id?: string }) => {
    const isEdicao = Boolean(usuario.id && usuarios.some((u) => u.id === usuario.id));
    const url = isEdicao ? `/api/usuarios/${usuario.id}` : '/api/usuarios';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...usuario, empresaId: usuario.empresaId || empresaAtual?.id || 'emp1' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar usuário');
    }
    await carregarDadosServidor();
  };

  const handleExcluirUsuario = async (id: string) => {
    const res = await authFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao desativar usuário');
    }
    await carregarDadosServidor();
  };

  const handleSalvarVeiculo = async (veiculo: Partial<Veiculo>) => {
    const isEdicao = Boolean(veiculo.id);
    const url = isEdicao ? `/api/veiculos/${veiculo.id}` : '/api/veiculos';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(veiculo),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar veículo');
    }
    await carregarDadosServidor();
  };

  const handleExcluirVeiculo = async (id: string) => {
    const res = await authFetch(`/api/veiculos/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir veículo');
    }
    await carregarDadosServidor();
  };

  const handleSalvarColaborador = async (colaborador: Partial<Colaborador>) => {
    const isEdicao = Boolean(colaborador.id);
    const url = isEdicao ? `/api/colaboradores/${colaborador.id}` : '/api/colaboradores';
    const method = isEdicao ? 'PUT' : 'POST';

    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(colaborador),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar colaborador');
    }
    await carregarDadosServidor();
  };

  const handleExcluirColaborador = async (id: string) => {
    const res = await authFetch(`/api/colaboradores/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir colaborador');
    }
    await carregarDadosServidor();
  };

  const handleImportarProdutosErp = async (produtosImportados: any[]) => {
    const res = await authFetch('/api/produtos/importar-erp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produtos: produtosImportados }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao importar produtos');
    }
    await carregarDadosServidor();
  };

  // Se o usuário não está autenticado, renderiza a tela de login
  if (!usuarioLogado) {
    return <LoginScreen onLoginSucesso={handleLoginSucesso} />;
  }

  // Se o usuário é Super Admin e está no modo Painel Geral de Empresas
  if (usuarioLogado.perfil === 'SUPER_ADMIN' && modoSuperAdminHub) {
    return (
      <SuperAdminHub
        usuarioSuperAdmin={usuarioLogado}
        empresas={empresas}
        onSelecionarEmpresa={handleSelecionarEmpresaSuperAdmin}
        onSalvarEmpresa={handleSalvarEmpresa}
        onExcluirEmpresa={handleExcluirEmpresa}
        onLogout={handleLogout}
        onRecarregar={carregarDadosServidor}
      />
    );
  }

  // Contadores para o menu superior
  const pendentesCount = pedidos.filter((p) => p.status === 'PENDENTE').length;
  const emRotaCount = pedidos.filter((p) => p.status === 'EM_ROTA').length;
  const entreguesCount = pedidos.filter((p) => p.status === 'ENTREGUE').length;
  const devolvidosCount = pedidos.filter((p) => p.devolvidoParaCorrecao).length;

  const isSuperAdminAtivo = usuarioLogado.perfil === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pedidosPendentesCount={pendentesCount}
        pedidosEmRotaCount={emRotaCount}
        pedidosEntreguesCount={entreguesCount}
        pedidosDevolvidosCount={devolvidosCount}
        usuarioLogado={usuarioLogado}
        empresaNome={empresaNome}
        isSuperAdmin={isSuperAdminAtivo}
        onVoltarSuperAdmin={isSuperAdminAtivo ? handleVoltarSuperAdmin : undefined}
        onLogout={handleLogout}
        onRefreshAll={() => carregarDadosServidor(true)}
        offlineMode={offlineMode}
        toggleOfflineSimulation={toggleOfflineSimulation}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Content Workspace Container */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Fixed Contextual TopBar aligned with Sidebar */}
        <TopBar
          activeTab={activeTab}
          empresaNome={empresaNome}
          setMobileSidebarOpen={setMobileSidebarOpen}
          pedidosPendentesCount={pendentesCount}
          pedidosEmRotaCount={emRotaCount}
          pedidosEntreguesCount={entreguesCount}
        />

        {/* Sync Feedback Toast / Banner */}
        {syncFeedback && (
          <div className="w-full px-3 sm:px-4 lg:px-6 pt-3">
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-medium shadow-sm transition-all ${
                syncFeedback.tipo === 'sucesso'
                  ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-200'
                  : 'bg-amber-950/80 border-amber-600/60 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {syncFeedback.tipo === 'sucesso' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{syncFeedback.mensagem}</span>
              </div>
              <button
                onClick={() => setSyncFeedback(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full p-2.5 sm:p-4 lg:p-5 overflow-x-hidden">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Carregando sistema de distribuição e conveniência...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'pdv' && (
                <PdvModulo
                  clientes={clientes}
                  produtos={produtos}
                  bairros={bairros}
                  usuarioLogado={usuarioLogado}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSuperAdmin={isSuperAdminAtivo}
                  pedidosPendentesCount={pendentesCount}
                  pedidosEmRotaCount={emRotaCount}
                  pedidosEntreguesCount={entreguesCount}
                  onPedidoCriado={handlePedidoCriado}
                  onNovoCliente={handleNovoCliente}
                  onSalvarCliente={handleSalvarCliente}
                  onProdutosAtualizados={carregarDadosServidor}
                />
              )}

              {activeTab === 'despacho' && (
                <DespachoKanban
                  pedidos={pedidos}
                  entregadores={entregadores}
                  usuarioLogado={usuarioLogado}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSuperAdmin={isSuperAdminAtivo}
                  pedidosPendentesCount={pendentesCount}
                  pedidosEmRotaCount={emRotaCount}
                  pedidosEntreguesCount={entreguesCount}
                  onDespacharPedidos={handleDespacharPedidos}
                  onVisualizarComanda={(p) => setPedidoComandaModal(p)}
                  onPedidoAtualizado={carregarDadosServidor}
                />
              )}

              {activeTab === 'acerto' && (
                <AcertoCaixa
                  pedidos={pedidos}
                  entregadores={entregadores}
                  veiculos={veiculos}
                  turnos={turnos}
                  usuarioLogado={usuarioLogado}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSuperAdmin={isSuperAdminAtivo}
                  pedidosPendentesCount={pendentesCount}
                  pedidosEmRotaCount={emRotaCount}
                  pedidosEntreguesCount={entreguesCount}
                  onAcertoConcluido={() => carregarDadosServidor()}
                  onTurnoIniciado={() => carregarDadosServidor()}
                  onTurnoFechado={() => carregarDadosServidor()}
                />
              )}

              {activeTab === 'vasilhames' && (
                <EstoqueVasilhames
                  produtos={produtos}
                  usuarioLogado={usuarioLogado}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSuperAdmin={isSuperAdminAtivo}
                  pedidosPendentesCount={pendentesCount}
                  pedidosEmRotaCount={emRotaCount}
                  pedidosEntreguesCount={entreguesCount}
                  onEstoqueAtualizado={carregarDadosServidor}
                />
              )}

              {activeTab === 'gerencia' && (
                <DashboardGerente
                  pedidos={pedidos}
                  produtos={produtos}
                  bairros={bairros}
                  entregadores={entregadores}
                  clientes={clientes}
                  usuarioLogado={usuarioLogado}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSuperAdmin={isSuperAdminAtivo}
                  pedidosPendentesCount={pendentesCount}
                  pedidosEmRotaCount={emRotaCount}
                  pedidosEntreguesCount={entreguesCount}
                  onPedidoAtualizado={carregarDadosServidor}
                  onVisualizarComanda={(p) => setPedidoComandaModal(p)}
                  onNovoPedidoClick={() => setActiveTab('pdv')}
                />
              )}

              {activeTab === 'cadastros' && (
                <CadastrosHub
                  produtos={produtos}
                  clientes={clientes}
                  entregadores={entregadores}
                  bairros={bairros}
                  veiculos={veiculos}
                  colaboradores={colaboradores}
                  turnos={turnos}
                  usuarios={usuarios}
                  usuarioLogado={usuarioLogado}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSuperAdmin={isSuperAdminAtivo}
                  pedidosPendentesCount={pendentesCount}
                  pedidosEmRotaCount={emRotaCount}
                  pedidosEntreguesCount={entreguesCount}
                  onSalvarProduto={handleSalvarProduto}
                  onExcluirProduto={handleExcluirProduto}
                  onSalvarCliente={handleSalvarCliente}
                  onExcluirCliente={handleExcluirCliente}
                  onSalvarEntregador={handleSalvarEntregador}
                  onExcluirEntregador={handleExcluirEntregador}
                  onSalvarBairro={handleSalvarBairro}
                  onExcluirBairro={handleExcluirBairro}
                  onSalvarVeiculo={handleSalvarVeiculo}
                  onExcluirVeiculo={handleExcluirVeiculo}
                  onSalvarColaborador={handleSalvarColaborador}
                  onExcluirColaborador={handleExcluirColaborador}
                  onImportarProdutosErp={handleImportarProdutosErp}
                />
              )}

              {activeTab === 'usuarios' && (
                <GestaoUsuarios
                  usuarios={usuarios}
                  entregadores={entregadores}
                  usuarioAtual={usuarioLogado}
                  usuarioLogado={usuarioLogado}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSuperAdmin={isSuperAdminAtivo}
                  pedidosPendentesCount={pendentesCount}
                  pedidosEmRotaCount={emRotaCount}
                  pedidosEntreguesCount={entreguesCount}
                  onSalvarUsuario={handleSalvarUsuario}
                  onExcluirUsuario={handleExcluirUsuario}
                />
              )}

              {activeTab === 'entregador' && (
                <AppEntregador
                  entregadores={entregadores}
                  usuarioLogado={usuarioLogado}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  isSuperAdmin={isSuperAdminAtivo}
                  pedidosPendentesCount={pendentesCount}
                  pedidosEmRotaCount={emRotaCount}
                  pedidosEntreguesCount={entreguesCount}
                  onPedidoAtualizadoNoServidor={carregarDadosServidor}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal pedido={pedidoComandaModal} onClose={() => setPedidoComandaModal(null)} />
    </div>
  );
}
