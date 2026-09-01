import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  DollarSign,
  Truck,
  User,
  MapPin,
  Clock,
  Printer,
  RotateCcw,
  CheckCircle2,
  Ban,
  Package,
} from 'lucide-react';
import {
  BairroTaxa,
  Cliente,
  Entregador,
  FormaPagamento,
  ItemPedido,
  Pedido,
  Produto,
  StatusPedido,
  TipoVendaItem,
} from '../types';

interface Props {
  pedido: Pedido | null;
  produtos: Produto[];
  bairros: BairroTaxa[];
  entregadores: Entregador[];
  clientes: Cliente[];
  isOpen: boolean;
  onClose: () => void;
  onSalvar: (pedidoAtualizado: Partial<Pedido> & { id: string; motivoAjuste?: string }) => Promise<void>;
  onCancelarPedido: (pedidoId: string, motivo: string) => Promise<void>;
  onReabrirPedido: (pedidoId: string) => Promise<void>;
  onImprimirComanda?: (pedido: Pedido) => void;
}

export const ModalEditarPedido: React.FC<Props> = ({
  pedido,
  produtos,
  bairros,
  entregadores,
  clientes,
  isOpen,
  onClose,
  onSalvar,
  onCancelarPedido,
  onReabrirPedido,
  onImprimirComanda,
}) => {
  if (!isOpen || !pedido) return null;

  // Form State
  const [status, setStatus] = useState<StatusPedido>(pedido.status);
  const [entregadorId, setEntregadorId] = useState<string>(pedido.entregadorId || '');
  
  // Cliente & Endereço
  const [nomeCliente, setNomeCliente] = useState(pedido.cliente?.nome || '');
  const [telefoneCliente, setTelefoneCliente] = useState(pedido.cliente?.telefone || '');
  const [endereco, setEndereco] = useState(pedido.cliente?.endereco || '');
  const [numero, setNumero] = useState(pedido.cliente?.numero || '');
  const [complemento, setComplemento] = useState(pedido.cliente?.complemento || '');
  const [bairroId, setBairroId] = useState(pedido.cliente?.bairroId || bairros[0]?.id || '');
  const [referencia, setReferencia] = useState(pedido.cliente?.referencia || '');

  // Valores & Pagamento
  const [taxaEntrega, setTaxaEntrega] = useState<number>(pedido.taxaEntrega || 0);
  const [desconto, setDesconto] = useState<number>(pedido.desconto || 0);
  const [formaPagamentoPrevista, setFormaPagamentoPrevista] = useState<FormaPagamento>(pedido.formaPagamentoPrevista);
  const [formaPagamentoRealizada, setFormaPagamentoRealizada] = useState<FormaPagamento | undefined>(pedido.formaPagamentoRealizada);
  const [trocoPara, setTrocoPara] = useState<string>(pedido.trocoPara ? String(pedido.trocoPara) : '');
  const [valorRecebido, setValorRecebido] = useState<string>(pedido.valorRecebido ? String(pedido.valorRecebido) : '');
  const [observacoes, setObservacoes] = useState<string>(pedido.observacoes || '');
  const [motivoAjuste, setMotivoAjuste] = useState<string>('');

  // Itens
  const [itens, setItens] = useState<ItemPedido[]>(JSON.parse(JSON.stringify(pedido.itens || [])));

  // Adição rápida de item
  const [novoProdutoId, setNovoProdutoId] = useState<string>(produtos[0]?.id || '');
  const [novoTipoVenda, setNovoTipoVenda] = useState<TipoVendaItem>('RECARGA');
  const [novaQuantidade, setNovaQuantidade] = useState<number>(1);

  // Estados de confirmação
  const [salvando, setSalvando] = useState(false);
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  // Atualiza estados quando muda o pedido aberto
  useEffect(() => {
    if (pedido) {
      setStatus(pedido.status);
      setEntregadorId(pedido.entregadorId || '');
      setNomeCliente(pedido.cliente?.nome || '');
      setTelefoneCliente(pedido.cliente?.telefone || '');
      setEndereco(pedido.cliente?.endereco || '');
      setNumero(pedido.cliente?.numero || '');
      setComplemento(pedido.cliente?.complemento || '');
      setBairroId(pedido.cliente?.bairroId || bairros[0]?.id || '');
      setReferencia(pedido.cliente?.referencia || '');
      setTaxaEntrega(pedido.taxaEntrega || 0);
      setDesconto(pedido.desconto || 0);
      setFormaPagamentoPrevista(pedido.formaPagamentoPrevista);
      setFormaPagamentoRealizada(pedido.formaPagamentoRealizada);
      setTrocoPara(pedido.trocoPara ? String(pedido.trocoPara) : '');
      setValorRecebido(pedido.valorRecebido ? String(pedido.valorRecebido) : '');
      setObservacoes(pedido.observacoes || '');
      setMotivoAjuste('');
      setItens(JSON.parse(JSON.stringify(pedido.itens || [])));
      setModalCancelarAberto(false);
      setMotivoCancelamento('');
    }
  }, [pedido, bairros]);

  // Recalcula subtotal e total
  const subtotalCalculado = itens.reduce((acc, item) => acc + item.precoUnitario * item.quantidade, 0);
  const totalCalculado = Math.max(0, subtotalCalculado + (Number(taxaEntrega) || 0) - (Number(desconto) || 0));

  // Ações de itens
  const handleAlterarQtdItem = (index: number, novaQtd: number) => {
    if (novaQtd <= 0) return;
    setItens((prev) => {
      const clone = [...prev];
      clone[index].quantidade = novaQtd;
      clone[index].subtotal = clone[index].precoUnitario * novaQtd;
      if (clone[index].tipoVenda === 'RECARGA' && clone[index].tipoVasilhame !== 'NENHUM') {
        clone[index].vasilhamesRecolhidosEsperados = novaQtd;
      }
      return clone;
    });
  };

  const handleAlterarPrecoItem = (index: number, novoPreco: number) => {
    setItens((prev) => {
      const clone = [...prev];
      clone[index].precoUnitario = Math.max(0, novoPreco);
      clone[index].subtotal = clone[index].precoUnitario * clone[index].quantidade;
      return clone;
    });
  };

  const handleAlterarTipoVenda = (index: number, novoTipo: TipoVendaItem) => {
    setItens((prev) => {
      const clone = [...prev];
      const prod = produtos.find((p) => p.id === clone[index].produtoId);
      clone[index].tipoVenda = novoTipo;
      if (novoTipo === 'COMPLETO' && prod?.permiteVendaCasco) {
        clone[index].precoUnitario = prod.precoCompleto;
        clone[index].vasilhamesRecolhidosEsperados = 0;
      } else if (prod) {
        clone[index].precoUnitario = prod.precoRecarga;
        clone[index].vasilhamesRecolhidosEsperados = prod.tipoVasilhame !== 'NENHUM' ? clone[index].quantidade : 0;
      }
      clone[index].subtotal = clone[index].precoUnitario * clone[index].quantidade;
      return clone;
    });
  };

  const handleRemoverItem = (index: number) => {
    if (itens.length === 1) {
      alert('O pedido deve conter pelo menos 1 produto. Se deseja encerrar a venda, use a opção de Cancelamento.');
      return;
    }
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdicionarItem = () => {
    const prod = produtos.find((p) => p.id === novoProdutoId);
    if (!prod) return;

    const preco = novoTipoVenda === 'COMPLETO' && prod.permiteVendaCasco ? prod.precoCompleto : prod.precoRecarga;
    const precisaCasco = novoTipoVenda === 'RECARGA' && prod.tipoVasilhame !== 'NENHUM';

    const novoItem: ItemPedido = {
      id: `it_edit_${Date.now()}`,
      produtoId: prod.id,
      nomeProduto: prod.nome,
      categoria: prod.categoria,
      tipoVasilhame: prod.tipoVasilhame,
      tipoVenda: novoTipoVenda,
      quantidade: novaQuantidade,
      precoUnitario: preco,
      subtotal: preco * novaQuantidade,
      vasilhamesRecolhidosEsperados: precisaCasco ? novaQuantidade : 0,
      vasilhamesRecolhidosReais: 0,
      vasilhamesPendentes: 0,
    };

    setItens((prev) => [...prev, novoItem]);
    setNovaQuantidade(1);
  };

  // Salvar alterações
  const handleSalvarTudo = async () => {
    if (itens.length === 0) {
      alert('Adicione pelo menos um item ao pedido.');
      return;
    }

    try {
      setSalvando(true);
      const bairroSelecionado = bairros.find((b) => b.id === bairroId) || bairros[0];

      const dadosAtualizados: Partial<Pedido> & { id: string; motivoAjuste?: string } = {
        id: pedido.id,
        status,
        entregadorId: entregadorId || undefined,
        cliente: {
          ...pedido.cliente,
          nome: nomeCliente,
          telefone: telefoneCliente,
          endereco,
          numero,
          complemento,
          bairroId: bairroSelecionado?.id || pedido.cliente?.bairroId || 'bairro_padrao',
          bairroNome: bairroSelecionado?.nome || pedido.cliente?.bairroNome || 'Bairro Genérico',
          referencia,
        },
        itens,
        taxaEntrega: Number(taxaEntrega) || 0,
        desconto: Number(desconto) || 0,
        formaPagamentoPrevista,
        formaPagamentoRealizada: formaPagamentoRealizada || undefined,
        trocoPara: trocoPara ? Number(trocoPara) : undefined,
        valorRecebido: valorRecebido ? Number(valorRecebido) : undefined,
        observacoes,
        motivoAjuste: motivoAjuste.trim() || undefined,
      };

      await onSalvar(dadosAtualizados);
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarCancelamento = async () => {
    if (!motivoCancelamento.trim()) {
      alert('Informe o motivo do cancelamento para registro de auditoria.');
      return;
    }
    try {
      setSalvando(true);
      await onCancelarPedido(pedido.id, motivoCancelamento.trim());
      setModalCancelarAberto(false);
      onClose();
    } catch (err: any) {
      alert(`Erro ao cancelar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleReabrir = async () => {
    if (confirm(`Deseja reabrir o pedido ${pedido.codigo} e retorná-lo para status PENDENTE?`)) {
      try {
        setSalvando(true);
        await onReabrirPedido(pedido.id);
        onClose();
      } catch (err: any) {
        alert(`Erro ao reabrir: ${err.message}`);
      } finally {
        setSalvando(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#eaecf0] rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Corrigir / Editar Pedido <span className="text-blue-400 font-black">{pedido.codigo}</span>
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    status === 'CONCLUIDO'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : status === 'EM_ROTA'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : status === 'ENTREGUE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : status === 'CANCELADO'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Criado em: {new Date(pedido.criadoEm).toLocaleString('pt-BR')} • Versão atual #{pedido.versao}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onImprimirComanda && (
              <button
                type="button"
                onClick={() => onImprimirComanda(pedido)}
                title="Reimprimir Comanda Térmica 80mm"
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Reimprimir</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {/* Top Controls: Status & Entregador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Status Operacional
              </label>
              <select
                id="edit-pedido-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusPedido)}
                className="w-full bg-[#eaecf0] border border-slate-300 rounded-md px-2.5 py-1.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="PENDENTE">🟡 PENDENTE (Na Base / Aguardando)</option>
                <option value="EM_ROTA">🔵 EM ROTA (Com Entregador)</option>
                <option value="ENTREGUE">🟢 ENTREGUE (Aguardando Acerto no Caixa)</option>
                <option value="CONCLUIDO">🏁 CONCLUÍDO (Acerto Finalizado)</option>
                <option value="CANCELADO">🔴 CANCELADO (Estornado)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" /> Entregador Atribuído
              </label>
              <select
                id="edit-pedido-entregador"
                value={entregadorId}
                onChange={(e) => setEntregadorId(e.target.value)}
                className="w-full bg-[#eaecf0] border border-slate-300 rounded-md px-2.5 py-1.5 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="">-- Nenhum Entregador (Desatribuído) --</option>
                {entregadores.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.nome} ({ent.veiculo})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Motivo da Correção (Auditoria)
              </label>
              <input
                type="text"
                id="edit-pedido-motivo-ajuste"
                placeholder="Ex: Corrigido endereço, trocou para PIX..."
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                className="w-full bg-[#eaecf0] border border-amber-300 rounded-md px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Section: Dados do Cliente & Entrega */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-[#eaecf0]">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-blue-700">
              <User className="w-4 h-4" /> 1. Dados do Cliente e Local de Entrega
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Nome do Cliente</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Endereço (Rua / Av)</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Número</label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Complemento / Apto</label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Bairro de Entrega</label>
                <select
                  value={bairroId}
                  onChange={(e) => {
                    setBairroId(e.target.value);
                    const b = bairros.find((bx) => bx.id === e.target.value);
                    if (b) setTaxaEntrega(b.taxaEntrega);
                  }}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold focus:ring-1 focus:ring-blue-500"
                >
                  {bairros.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome} (Taxa R$ {b.taxaEntrega.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ponto de Referência</label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Itens do Pedido */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-[#eaecf0] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-700">
                <Package className="w-4 h-4" /> 2. Produtos e Vasilhames ({itens.length} {itens.length === 1 ? 'item' : 'itens'})
              </h4>
              <span className="text-[11px] font-bold text-slate-600">
                Subtotal dos Itens: <strong className="text-slate-900">R$ {subtotalCalculado.toFixed(2)}</strong>
              </span>
            </div>

            {/* Tabela de Itens Editáveis */}
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Produto</th>
                    <th className="p-2 w-32">Modalidade</th>
                    <th className="p-2 w-24 text-center">Qtd</th>
                    <th className="p-2 w-28 text-right">Preço Unit (R$)</th>
                    <th className="p-2 w-28 text-right">Subtotal (R$)</th>
                    <th className="p-2 w-12 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {itens.map((item, idx) => {
                    const prod = produtos.find((p) => p.id === item.produtoId);
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="p-2">
                          <div className="font-bold text-slate-900">{item.nomeProduto}</div>
                          {item.tipoVasilhame !== 'NENHUM' && (
                            <span className="text-[10px] text-amber-700 font-semibold">
                              Exige casco {item.tipoVasilhame} ({item.vasilhamesRecolhidosEsperados} esperado)
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {prod?.permiteVendaCasco ? (
                            <select
                              value={item.tipoVenda}
                              onChange={(e) => handleAlterarTipoVenda(idx, e.target.value as TipoVendaItem)}
                              className="w-full text-[11px] border border-slate-300 rounded px-1.5 py-1 font-semibold text-slate-800"
                            >
                              <option value="RECARGA">Recarga (Gás/Água)</option>
                              <option value="COMPLETO">Completo (Com Casco)</option>
                            </select>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-600">Unitário / Venda</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAlterarQtdItem(idx, item.quantidade - 1)}
                              disabled={item.quantidade <= 1}
                              className="w-6 h-6 rounded bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 disabled:opacity-40"
                            >
                              -
                            </button>
                            <span className="w-6 font-bold text-slate-900">{item.quantidade}</span>
                            <button
                              type="button"
                              onClick={() => handleAlterarQtdItem(idx, item.quantidade + 1)}
                              className="w-6 h-6 rounded bg-slate-200 text-slate-800 font-bold hover:bg-slate-300"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.precoUnitario}
                            onChange={(e) => handleAlterarPrecoItem(idx, Number(e.target.value))}
                            className="w-20 text-right border border-slate-300 rounded px-1.5 py-0.5 text-slate-900 font-semibold"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(idx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Remover Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Formulário para Adicionar Mais Itens */}
            <div className="flex flex-wrap items-end gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Adicionar Produto</label>
                <select
                  value={novoProdutoId}
                  onChange={(e) => setNovoProdutoId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold text-xs"
                >
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (R$ {p.precoRecarga.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-36">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tipo de Venda</label>
                <select
                  value={novoTipoVenda}
                  onChange={(e) => setNovoTipoVenda(e.target.value as TipoVendaItem)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs"
                >
                  <option value="RECARGA">Recarga (só líquido/gás)</option>
                  <option value="COMPLETO">Completo (novo c/ casco)</option>
                </select>
              </div>

              <div className="w-20">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Qtd</label>
                <input
                  type="number"
                  min="1"
                  value={novaQuantidade}
                  onChange={(e) => setNovaQuantidade(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 text-center font-bold text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleAdicionarItem}
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
          </div>

          {/* Section: Pagamento, Taxa, Desconto e Total */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-[#eaecf0]">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-blue-700">
              <DollarSign className="w-4 h-4" /> 3. Fechamento Financeiro e Meio de Pagamento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Forma de Pagamento (Prevista)</label>
                <select
                  value={formaPagamentoPrevista}
                  onChange={(e) => setFormaPagamentoPrevista(e.target.value as FormaPagamento)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 font-bold"
                >
                  <option value="PIX">⚡ PIX (Chave ou QR Code)</option>
                  <option value="DINHEIRO">💵 Dinheiro em Espécie</option>
                  <option value="CARTAO_DEBITO">💳 Cartão de Débito (Maquininha)</option>
                  <option value="CARTAO_CREDITO">💳 Cartão de Crédito (Maquininha)</option>
                  <option value="A_PRAZO_FIADO">📝 A Prazo / Fiado (Conta Cliente)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Forma Realizada (Na Entrega)</label>
                <select
                  value={formaPagamentoRealizada || ''}
                  onChange={(e) => setFormaPagamentoRealizada((e.target.value as FormaPagamento) || undefined)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold"
                >
                  <option value="">-- Igual à Prevista --</option>
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_DEBITO">Cartão de Débito</option>
                  <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                  <option value="A_PRAZO_FIADO">A Prazo / Fiado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Taxa de Entrega (R$)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={taxaEntrega}
                  onChange={(e) => setTaxaEntrega(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Desconto Especial (R$)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={desconto}
                  onChange={(e) => setDesconto(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-rose-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Troco para (se Dinheiro)</label>
                <input
                  type="number"
                  step="5"
                  placeholder="Ex: 150.00"
                  value={trocoPara}
                  onChange={(e) => setTrocoPara(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Valor Recebido Real (R$)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 140.00"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 font-bold"
                />
              </div>

              <div className="sm:col-span-2 bg-blue-50 border border-blue-200 p-2.5 rounded-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Total do Pedido</span>
                  <p className="text-[11px] text-blue-700">Subtotal R$ {subtotalCalculado.toFixed(2)} + Taxa R$ {Number(taxaEntrega || 0).toFixed(2)} - Desconto R$ {Number(desconto || 0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-blue-950">R$ {totalCalculado.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Observações Gerais e Histórico de Alterações</label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1 text-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
                placeholder="Instruções de entrega, notas para o entregador ou motivo de correções..."
              />
            </div>
          </div>

          {/* Modal de Confirmação de Cancelamento */}
          {modalCancelarAberto && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> Confirmar Cancelamento do Pedido {pedido.codigo}
              </div>
              <p className="text-rose-700 text-[11px]">
                Ao cancelar, os produtos em rota retornarão ao estoque cheio da loja e o entregador será notificado via push.
              </p>
              <div>
                <label className="block text-[10px] font-bold text-rose-900 mb-1">Motivo do Cancelamento (Obrigatório):</label>
                <input
                  type="text"
                  placeholder="Ex: Cliente desistiu da compra, endereço inexistente, sem troco..."
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  className="w-full border border-rose-300 rounded px-2.5 py-1.5 text-xs text-rose-950 bg-[#eaecf0] font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalCancelarAberto(false)}
                  className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarCancelamento}
                  disabled={salvando}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                >
                  {salvando ? 'Processando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {pedido.status === 'CANCELADO' ? (
              <button
                type="button"
                onClick={handleReabrir}
                disabled={salvando}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reabrir Pedido
              </button>
            ) : (
              !modalCancelarAberto && (
                <button
                  type="button"
                  onClick={() => setModalCancelarAberto(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center gap-1.5 border border-rose-300 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-600" /> Cancelar Pedido
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-[#eaecf0] text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              Fechar sem Salvar
            </button>
            <button
              type="button"
              onClick={handleSalvarTudo}
              disabled={salvando}
              id="btn-salvar-edicao-pedido"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{salvando ? 'Salvando...' : 'Salvar Alterações e Recalcular'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
