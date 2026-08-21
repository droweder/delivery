import React, { useEffect, useState } from 'react';
import { BairroTaxa, Cliente, Entregador, Pedido, Produto, Usuario } from './types';
import { INITIAL_USUARIOS } from './data/initialData';
import { MainTab, Navbar } from './components/Navbar';
import { PdvModulo } from './components/PdvModulo';
import { DespachoKanban } from './components/DespachoKanban';
import { AppEntregador } from './components/AppEntregador';
import { AcertoCaixa } from './components/AcertoCaixa';
import { EstoqueVasilhames } from './components/EstoqueVasilhames';
import { DashboardGerente } from './components/DashboardGerente';
import { CadastrosHub } from './components/CadastrosHub';
import { GestaoUsuarios } from './components/GestaoUsuarios';
import { ArquiteturaSqlDoc } from './components/ArquiteturaSqlDoc';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { salvarCargaOffline } from './lib/offlineDb';
import { registerServiceWorker } from './lib/registerSw';
import { imprimirComanda } from './lib/thermalPrinter';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('pdv');
  const [bairros, setBairros] = useState<BairroTaxa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>(INITIAL_USUARIOS);
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario>(INITIAL_USUARIOS[0]);
  const [modalTrocaUsuarioAberto, setModalTrocaUsuarioAberto] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoComandaModal, setPedidoComandaModal] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Carrega todos os dados do backend
  const carregarDadosServidor = async () => {
    try {
      const [resBairros, resProdutos, resClientes, resEntregadores, resPedidos, resUsuarios] =
        await Promise.all([
          fetch('/api/bairros'),
          fetch('/api/produtos'),
          fetch('/api/clientes'),
          fetch('/api/entregadores'),
          fetch('/api/pedidos'),
          fetch('/api/usuarios'),
        ]);

      if (resBairros.ok) setBairros(await resBairros.json());
      if (resProdutos.ok) setProdutos(await resProdutos.json());
      if (resClientes.ok) setClientes(await resClientes.json());
      if (resEntregadores.ok) setEntregadores(await resEntregadores.json());
      if (resPedidos.ok) setPedidos(await resPedidos.json());
      if (resUsuarios.ok) {
        const users = await resUsuarios.json();
        setUsuarios(users);
        // Atualiza referência do usuário logado se ele existir na lista
        setUsuarioLogado((prev) => users.find((u: Usuario) => u.id === prev.id) || users[0] || prev);
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
  }, []);

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
    const res = await fetch('/api/despacho/atribuir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pedidosIds,
        entregadorId,
        despachadoPor: `${usuarioLogado.nome} (${usuarioLogado.perfil})`,
      }),
    });

    if (!res.ok) throw new Error('Falha ao despachar pedidos');
    const data = await res.json();

    // Atualiza pedidos no estado do React
    setPedidos((prev) =>
      prev.map((p) => {
        const atualizado = data.pedidos.find((ap: Pedido) => ap.id === p.id);
        return atualizado || p;
      })
    );

    // Salva a carga no IndexedDB local para que o entregador já tenha offline
    const pedidosDesseEntregador = pedidos
      .map((p) => {
        const atualizado = data.pedidos.find((ap: Pedido) => ap.id === p.id);
        return atualizado || p;
      })
      .filter((p) => p.entregadorId === entregadorId && (p.status === 'EM_ROTA' || p.status === 'ENTREGUE'));

    await salvarCargaOffline(entregadorId, pedidosDesseEntregador);

    // Recarrega contadores de entregadores e estoque
    await carregarDadosServidor();

    // Se solicitado, imprime comanda térmica do primeiro pedido ou abre modal
    if (imprimir && data.pedidos && data.pedidos.length > 0) {
      setPedidoComandaModal(data.pedidos[0]);
    }
  };

  // --------------------------------------------------------------------------
  // CRUD HANDLERS PARA CADASTROS & USUÁRIOS
  // --------------------------------------------------------------------------
  const handleSalvarProduto = async (produto: Partial<Produto> & { id?: string }) => {
    const isEdit = Boolean(produto.id);
    const url = isEdit ? `/api/produtos/${produto.id}` : '/api/produtos';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar produto');
    }
    await carregarDadosServidor();
  };

  const handleExcluirProduto = async (id: string) => {
    const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir produto');
    }
    await carregarDadosServidor();
  };

  const handleSalvarCliente = async (cliente: Partial<Cliente> & { id?: string }) => {
    const isEdit = Boolean(cliente.id);
    const url = isEdit ? `/api/clientes/${cliente.id}` : '/api/clientes';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cliente),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar cliente');
    }
    await carregarDadosServidor();
  };

  const handleExcluirCliente = async (id: string) => {
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir cliente');
    }
    await carregarDadosServidor();
  };

  const handleSalvarEntregador = async (entregador: Partial<Entregador> & { id?: string }) => {
    const isEdit = Boolean(entregador.id);
    const url = isEdit ? `/api/entregadores/${entregador.id}` : '/api/entregadores';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entregador),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar entregador');
    }
    await carregarDadosServidor();
  };

  const handleExcluirEntregador = async (id: string) => {
    const res = await fetch(`/api/entregadores/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir entregador');
    }
    await carregarDadosServidor();
  };

  const handleSalvarBairro = async (bairro: Partial<BairroTaxa> & { id?: string }) => {
    const isEdit = Boolean(bairro.id);
    const url = isEdit ? `/api/bairros/${bairro.id}` : '/api/bairros';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bairro),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar bairro');
    }
    await carregarDadosServidor();
  };

  const handleExcluirBairro = async (id: string) => {
    const res = await fetch(`/api/bairros/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao excluir bairro');
    }
    await carregarDadosServidor();
  };

  const handleSalvarUsuario = async (usuario: Partial<Usuario> & { id?: string }) => {
    const isEdit = Boolean(usuario.id);
    const url = isEdit ? `/api/usuarios/${usuario.id}` : '/api/usuarios';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuario),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao salvar usuário');
    }
    await carregarDadosServidor();
  };

  const handleExcluirUsuario = async (id: string) => {
    const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao desativar usuário');
    }
    await carregarDadosServidor();
  };

  const handleImportarProdutosErp = async (produtosImportados: any[]) => {
    const res = await fetch('/api/produtos/importar-erp', {
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

  // Contadores para o menu superior
  const pendentesCount = pedidos.filter((p) => p.status === 'PENDENTE').length;
  const emRotaCount = pedidos.filter((p) => p.status === 'EM_ROTA').length;
  const entreguesCount = pedidos.filter((p) => p.status === 'ENTREGUE').length;
  const devolvidosCount = pedidos.filter((p) => p.devolvidoParaCorrecao).length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pedidosPendentesCount={pendentesCount}
        pedidosEmRotaCount={emRotaCount}
        pedidosEntreguesCount={entreguesCount}
        pedidosDevolvidosCount={devolvidosCount}
        usuarioLogado={usuarioLogado}
        onAbrirTrocaUsuario={() => setModalTrocaUsuarioAberto(true)}
        onRefreshAll={carregarDadosServidor}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-4 lg:p-5">
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
                onPedidoCriado={handlePedidoCriado}
                onNovoCliente={handleNovoCliente}
                onProdutosAtualizados={carregarDadosServidor}
              />
            )}

            {activeTab === 'despacho' && (
              <DespachoKanban
                pedidos={pedidos}
                entregadores={entregadores}
                onDespacharPedidos={handleDespacharPedidos}
                onVisualizarComanda={(p) => setPedidoComandaModal(p)}
              />
            )}

            {activeTab === 'acerto' && (
              <AcertoCaixa
                pedidos={pedidos}
                entregadores={entregadores}
                onAcertoConcluido={carregarDadosServidor}
              />
            )}

            {activeTab === 'vasilhames' && (
              <EstoqueVasilhames produtos={produtos} onEstoqueAtualizado={carregarDadosServidor} />
            )}

            {activeTab === 'gerencia' && (
              <DashboardGerente
                pedidos={pedidos}
                produtos={produtos}
                bairros={bairros}
                entregadores={entregadores}
                clientes={clientes}
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
                onSalvarProduto={handleSalvarProduto}
                onExcluirProduto={handleExcluirProduto}
                onSalvarCliente={handleSalvarCliente}
                onExcluirCliente={handleExcluirCliente}
                onSalvarEntregador={handleSalvarEntregador}
                onExcluirEntregador={handleExcluirEntregador}
                onSalvarBairro={handleSalvarBairro}
                onExcluirBairro={handleExcluirBairro}
                onImportarProdutosErp={handleImportarProdutosErp}
              />
            )}

            {activeTab === 'usuarios' && (
              <GestaoUsuarios
                usuarios={usuarios}
                usuarioAtual={usuarioLogado}
                onSalvarUsuario={handleSalvarUsuario}
                onExcluirUsuario={handleExcluirUsuario}
              />
            )}

            {activeTab === 'entregador' && (
              <AppEntregador
                entregadores={entregadores}
                onPedidoAtualizadoNoServidor={carregarDadosServidor}
              />
            )}

            {activeTab === 'arquitetura' && <ArquiteturaSqlDoc />}
          </>
        )}
      </main>

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal pedido={pedidoComandaModal} onClose={() => setPedidoComandaModal(null)} />

      {/* Quick User Switcher Modal */}
      <UserSwitcherModal
        usuarios={usuarios}
        usuarioAtual={usuarioLogado}
        isOpen={modalTrocaUsuarioAberto}
        onClose={() => setModalTrocaUsuarioAberto(false)}
        onSelecionarUsuario={(u) => setUsuarioLogado(u)}
      />
    </div>
  );
}
