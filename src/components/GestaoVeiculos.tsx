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

interface Props {
  veiculos: Veiculo[];
  onSaveVeiculo: (veiculo: Partial<Veiculo>) => Promise<void>;
  onDeleteVeiculo: (id: string) => Promise<void>;
}

export const GestaoVeiculos: React.FC<Props> = ({
  veiculos,
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
    const termo = busca.toLowerCase();
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
    <div className="space-y-6">
      {/* Hidden File Input for OCR */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleProcessarDocumento}
        accept="image/*,application/pdf"
        className="hidden"
      />

      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Cadastro e Frota de Veículos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as motos, furgões e veículos da empresa para controle de quilometragem e atribuição aos entregadores.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            disabled={ocrLoading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            {ocrLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {ocrLoading ? 'Lendo Documento...' : 'Importar Doc (CRLV)'}
          </button>

          <button
            onClick={abrirModalNovo}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow transition-all duration-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Veículo
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por placa, modelo ou cor..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="MOTO">Motos</option>
            <option value="CARRO">Carros / Furgões</option>
            <option value="TRICICLO">Triciclos</option>
            <option value="CAMINHAO">Caminhões</option>
            <option value="OUTRO">Outros</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="DISPONIVEL">Disponíveis</option>
            <option value="EM_USO">Em Uso</option>
            <option value="MANUTENCAO">Em Manutenção</option>
          </select>
        </div>
      </div>

      {/* Grid of Vehicles */}
      {veiculosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Car className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">Nenhum veículo encontrado</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {busca || filtroTipo !== 'TODOS' || filtroStatus !== 'TODOS'
              ? 'Tente ajustar seus filtros de pesquisa.'
              : 'Clique em "Cadastrar Veículo" para adicionar seu primeiro veículo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {veiculosFiltrados.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow duration-200 relative flex flex-col justify-between"
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
                      {getTipoIcon(v.tipo)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                        {v.modelo}
                      </h3>
                      <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600">
                        {v.placa}
                      </span>
                    </div>
                  </div>
                  <div>{getStatusBadge(v.status)}</div>
                </div>

                {/* Details list */}
                <div className="space-y-2 my-4 text-sm text-slate-600 dark:text-slate-300 border-t border-b border-slate-100 dark:border-slate-700/60 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                      <Gauge className="w-3.5 h-3.5 text-blue-500" />
                      Odômetro Atual:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {v.kmAtual.toLocaleString('pt-BR')} km
                    </span>
                  </div>

                  {v.kmUltimaRevisao !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                        <Wrench className="w-3.5 h-3.5 text-amber-500" />
                        Última Revisão:
                      </span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {v.kmUltimaRevisao.toLocaleString('pt-BR')} km
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-xs">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      Ano / Cor:
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {v.ano || 'N/I'} • {v.cor || 'Não informada'}
                    </span>
                  </div>

                  {v.observacoes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mt-2">
                      "{v.observacoes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => abrirModalEdicao(v)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => handleExcluir(v)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastrar / Editar Veículo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
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
