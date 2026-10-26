import React, { useState, useRef } from 'react';
import { Veiculo, TipoVeiculo, StatusVeiculo } from '../types';
import {
  Car,
  Bike,
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Gauge,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Filter,
  X,
  Calendar,
  Tag,
  FileText,
  Sparkles,
  Upload,
  Loader2,
} from 'lucide-react';

import { TopBarActions } from './TopBarPortal';

interface Props {
  veiculos: Veiculo[];
  buscaExterno?: string;
  onSaveVeiculo: (veiculo: Partial<Veiculo>) => Promise<void>;
  onDeleteVeiculo: (id: string) => Promise<void>;
}

export const GestaoVeiculos: React.FC<Props> = ({
  veiculos,
  buscaExterno,
  onSaveVeiculo,
  onDeleteVeiculo,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [veiculoEditando, setVeiculoEditando] = useState<Veiculo | null>(null);
  const [loading, setLoading] = useState(false);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState('');
  const [ocrErrorMsg, setOcrErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [tipo, setTipo] = useState<TipoVeiculo>('MOTO');
  const [ano, setAno] = useState<string>('');
  const [cor, setCor] = useState('');
  const [kmAtual, setKmAtual] = useState<string>('0');
  const [kmUltimaRevisao, setKmUltimaRevisao] = useState<string>('');
  const [status, setStatus] = useState<StatusVeiculo>('DISPONIVEL');
  const [observacoes, setObservacoes] = useState('');

  const abrirModalNovo = () => {
    setVeiculoEditando(null);
    setPlaca('');
    setModelo('');
    setTipo('MOTO');
    setAno(new Date().getFullYear().toString());
    setCor('');
    setKmAtual('0');
    setKmUltimaRevisao('');
    setStatus('DISPONIVEL');
    setObservacoes('');
    setOcrSuccessMsg('');
    setOcrErrorMsg('');
    setIsModalOpen(true);
  };

  const handleProcessarDocumento = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrErrorMsg('');
    setOcrSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Data = evt.target?.result as string;
        if (!base64Data) {
          throw new Error('Falha ao ler arquivo do documento');
        }

        const res = await fetch('/api/ocr/veiculo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Data, mimeType: file.type }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || data.message || 'Erro ao processar documento');
        }

        const d = data.dados || {};
        if (!isModalOpen) {
          abrirModalNovo();
        }

        if (d.placa) setPlaca(d.placa.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        if (d.modelo) setModelo(d.modelo);
        if (d.tipo && ['MOTO', 'CARRO', 'TRICICLO', 'CAMINHAO', 'OUTRO'].includes(d.tipo)) {
          setTipo(d.tipo as TipoVeiculo);
        }
        if (d.ano) setAno(String(d.ano));
        if (d.cor) setCor(d.cor);

        let obsComp = [];
        if (d.renavam) obsComp.push(`RENAVAM: ${d.renavam}`);
        if (d.chassi) obsComp.push(`Chassi: ${d.chassi}`);
        if (d.observacoes) obsComp.push(d.observacoes);

        if (obsComp.length > 0) {
          setObservacoes((prev) => (prev ? `${prev} | ${obsComp.join(' - ')}` : obsComp.join(' - ')));
        }

        setOcrSuccessMsg('Documento lido com sucesso pela IA! Verifique os dados abaixo.');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Erro no OCR:', err);
      setOcrErrorMsg('Não foi possível extrair os dados do documento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const abrirModalEdicao = (v: Veiculo) => {
    setVeiculoEditando(v);
    setPlaca(v.placa);
    setModelo(v.modelo);
    setTipo(v.tipo);
    setAno(v.ano ? v.ano.toString() : '');
    setCor(v.cor || '');
    setKmAtual(v.kmAtual.toString());
    setKmUltimaRevisao(v.kmUltimaRevisao ? v.kmUltimaRevisao.toString() : '');
    setStatus(v.status);
    setObservacoes(v.observacoes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa.trim() || !modelo.trim()) {
      alert('Placa e Modelo são campos obrigatórios!');
      return;
    }

    setLoading(true);
    try {
      await onSaveVeiculo({
        id: veiculoEditando ? veiculoEditando.id : undefined,
        placa: placa.toUpperCase().trim(),
        modelo: modelo.trim(),
        tipo,
        ano: ano ? Number(ano) : undefined,
        cor: cor.trim(),
        kmAtual: Number(kmAtual) || 0,
        kmUltimaRevisao: kmUltimaRevisao ? Number(kmUltimaRevisao) : undefined,
        status,
        observacoes: observacoes.trim(),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar veículo: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (v: Veiculo) => {
    if (confirm(`Tem certeza que deseja excluir o veículo ${v.modelo} (${v.placa})?`)) {
      try {
        await onDeleteVeiculo(v.id);
      } catch (err: any) {
        alert('Erro ao excluir veículo: ' + err.message);
      }
    }
  };

  const veiculosFiltrados = veiculos.filter((v) => {
    const termo = (buscaExterno !== undefined ? buscaExterno : busca).toLowerCase();
    const matchBusca =
      v.placa.toLowerCase().includes(termo) ||
      v.modelo.toLowerCase().includes(termo) ||
      (v.cor && v.cor.toLowerCase().includes(termo));
    const matchTipo = filtroTipo === 'TODOS' || v.tipo === filtroTipo;
    const matchStatus = filtroStatus === 'TODOS' || v.status === filtroStatus;
    return matchBusca && matchTipo && matchStatus;
  });

  const getTipoIcon = (t: TipoVeiculo) => {
    switch (t) {
      case 'MOTO':
        return <Bike className="w-5 h-5 text-blue-600" />;
      case 'CARRO':
        return <Car className="w-5 h-5 text-emerald-600" />;
      case 'CAMINHAO':
      case 'TRICICLO':
        return <Truck className="w-5 h-5 text-purple-600" />;
      default:
        return <Car className="w-5 h-5 text-slate-600" />;
    }
  };

  const getStatusBadge = (s: StatusVeiculo) => {
    switch (s) {
      case 'DISPONIVEL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Disponível
          </span>
        );
      case 'EM_USO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <Bike className="w-3.5 h-3.5" />
            Em Uso
          </span>
        );
      case 'MANUTENCAO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
            <Wrench className="w-3.5 h-3.5" />
            Manutenção
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Hidden File Input for OCR */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleProcessarDocumento}
        accept="image/*,application/pdf"
        className="hidden"
      />

      {/* Ações Contextuais no TopBar */}
      <TopBarActions>
        <button
          type="button"
          disabled={ocrLoading}
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
          title="Importação automática de CRLV via inteligência visual"
        >
          {ocrLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{ocrLoading ? 'Lendo...' : 'Importar CRLV'}</span>
        </button>

        <button
          onClick={abrirModalNovo}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Veículo</span>
        </button>
      </TopBarActions>

      {/* Filtros Secundários Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos os Tipos ({veiculos.length})</option>
            <option value="MOTO">Motos</option>
            <option value="CARRO">Carros / Furgões</option>
            <option value="TRICICLO">Triciclos</option>
            <option value="CAMINHAO">Caminhões</option>
            <option value="OUTRO">Outros</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="DISPONIVEL">Disponíveis</option>
            <option value="EM_USO">Em Uso</option>
            <option value="MANUTENCAO">Em Manutenção</option>
          </select>
        </div>

        {ocrSuccessMsg && (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {ocrSuccessMsg}
          </span>
        )}
        {ocrErrorMsg && (
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> {ocrErrorMsg}
          </span>
        )}
      </div>

      {/* Grid of Vehicles */}
      {veiculosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-[#eaecf0] dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-slate-800 p-8 shadow-xs">
          <Car className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">Nenhum veículo encontrado</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ajuste os filtros de pesquisa ou cadastre um novo veículo para a frota.
          </p>
        </div>
      ) : (
        <div className="bg-[#eaecf0] dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                  <th className="py-2 px-3">Veículo / Modelo</th>
                  <th className="py-2 px-3">Placa</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Odômetro Atual</th>
                  <th className="py-2 px-3 text-right">Última Revisão</th>
                  <th className="py-2 px-3">Ano / Cor</th>
                  <th className="py-2 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {veiculosFiltrados.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 shrink-0">
                          {getTipoIcon(v.tipo)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs block">
                            {v.modelo}
                          </span>
                          {v.observacoes && (
                            <span className="text-[10px] text-slate-400 italic block truncate max-w-xs">
                              {v.observacoes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                        {v.placa}
                      </span>
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">{v.tipo}</span>
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      {getStatusBadge(v.status)}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <span className="font-black text-slate-900 dark:text-white text-xs">
                        {v.kmAtual.toLocaleString('pt-BR')} km
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      {v.kmUltimaRevisao !== undefined ? (
                        <span className="text-slate-600 dark:text-slate-300 text-xs">
                          {v.kmUltimaRevisao.toLocaleString('pt-BR')} km
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-3">
                      <span className="text-slate-600 dark:text-slate-300 text-xs">
                        {v.ano || 'N/I'} • {v.cor || 'N/I'}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirModalEdicao(v)}
                          title="Editar veículo"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExcluir(v)}
                          title="Excluir veículo"
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="py-2 px-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <span>
              Mostrando <strong>{veiculosFiltrados.length}</strong> de <strong>{veiculos.length}</strong> veículos cadastrados
            </span>
          </div>
        </div>
      )}

      {/* Modal Cadastrar / Editar Veículo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#eaecf0] dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                {veiculoEditando ? 'Editar Veículo' : 'Novo Veículo'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* OCR Document Import Banner inside Modal */}
              <div className="bg-slate-50 dark:bg-slate-900/80 border border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Importar Documento (CRLV)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Envie foto ou PDF do documento para preencher a placa, modelo e tipo via IA.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={ocrLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shrink-0 flex items-center gap-1.5"
                >
                  {ocrLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Lendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Enviar Foto/PDF
                    </>
                  )}
                </button>
              </div>

              {ocrSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{ocrSuccessMsg}</span>
                </div>
              )}

              {ocrErrorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{ocrErrorMsg}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Placa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ABC-4E12"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 uppercase bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo do Veículo *
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoVeiculo)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MOTO">Moto</option>
                    <option value="CARRO">Carro / Furgão</option>
                    <option value="TRICICLO">Triciclo</option>
                    <option value="CAMINHAO">Caminhão</option>
                    <option value="OUTRO">Outro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Modelo / Marca *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Honda Fan 160, Fiat Fiorino 1.4"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    placeholder="2023"
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Vermelha"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusVeiculo)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DISPONIVEL">Disponível</option>
                    <option value="EM_USO">Em Uso</option>
                    <option value="MANUTENCAO">Manutenção</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Km Atual (Odômetro) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={kmAtual}
                    onChange={(e) => setKmAtual(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Km Última Revisão
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 10000"
                    value={kmUltimaRevisao}
                    onChange={(e) => setKmUltimaRevisao(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes sobre suportes, baús, documentos, etc."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  {loading ? 'Salvando...' : veiculoEditando ? 'Atualizar' : 'Salvar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
