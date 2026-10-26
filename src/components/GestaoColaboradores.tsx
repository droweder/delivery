import React, { useState, useRef } from 'react';
import { Colaborador, Usuario } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  ShieldCheck,
  Phone,
  Mail,
  Calendar,
  FileText,
  MapPin,
  CheckCircle2,
  XCircle,
  X,
  CreditCard,
  UserCheck,
  Info,
  Sparkles,
  Upload,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { TopBarActions } from './TopBarPortal';

interface Props {
  colaboradores: Colaborador[];
  usuarios: Usuario[];
  buscaExterno?: string;
  onSaveColaborador: (colab: Partial<Colaborador>) => Promise<void>;
  onDeleteColaborador: (id: string) => Promise<void>;
}

export const GestaoColaboradores: React.FC<Props> = ({
  colaboradores,
  usuarios,
  buscaExterno,
  onSaveColaborador,
  onDeleteColaborador,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [filtroCargo, setFiltroCargo] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [colabEditando, setColabEditando] = useState<Colaborador | null>(null);
  const [loading, setLoading] = useState(false);

  // OCR State
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState('');
  const [ocrErrorMsg, setOcrErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [cnh, setCnh] = useState('');
  const [categoriaCnh, setCategoriaCnh] = useState('AB');
  const [validadeCnh, setValidadeCnh] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [cargo, setCargo] = useState('Entregador de Rota');
  const [usuarioIdVinculado, setUsuarioIdVinculado] = useState('');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO' | 'AFASTADO'>('ATIVO');
  const [observacoes, setObservacoes] = useState('');

  const abrirModalNovo = () => {
    setColabEditando(null);
    setNome('');
    setCpf('');
    setRg('');
    setCnh('');
    setCategoriaCnh('AB');
    setValidadeCnh('');
    setTelefone('');
    setEmail('');
    setEndereco('');
    setBairro('');
    setCidade('');
    setDataNascimento('');
    setDataAdmissao(new Date().toISOString().split('T')[0]);
    setCargo('Entregador de Rota');
    setUsuarioIdVinculado('');
    setStatus('ATIVO');
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

        const res = await fetch('/api/ocr/colaborador', {
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

        if (d.nome) setNome(d.nome);
        if (d.cpf) setCpf(d.cpf);
        if (d.rg) setRg(d.rg);
        if (d.cnh) setCnh(d.cnh);
        if (d.categoriaCnh) setCategoriaCnh(d.categoriaCnh);
        if (d.validadeCnh) setValidadeCnh(d.validadeCnh);
        if (d.dataNascimento) setDataNascimento(d.dataNascimento);
        if (d.telefone) setTelefone(d.telefone);
        if (d.cargoSugerido) setCargo(d.cargoSugerido);

        setOcrSuccessMsg('Documento pessoal (CNH/RG) lido com sucesso pela IA! Verifique os dados abaixo.');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Erro no OCR do colaborador:', err);
      setOcrErrorMsg('Não foi possível extrair os dados do documento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const abrirModalEdicao = (c: Colaborador) => {
    setColabEditando(c);
    setNome(c.nome);
    setCpf(c.cpf || '');
    setRg(c.rg || '');
    setCnh(c.cnh || '');
    setCategoriaCnh(c.categoriaCnh || 'AB');
    setValidadeCnh(c.validadeCnh || '');
    setTelefone(c.telefone || '');
    setEmail(c.email || '');
    setEndereco(c.endereco || '');
    setBairro(c.bairro || '');
    setCidade(c.cidade || '');
    setDataNascimento(c.dataNascimento || '');
    setDataAdmissao(c.dataAdmissao || '');
    setCargo(c.cargo || 'Entregador de Rota');
    setUsuarioIdVinculado(c.usuarioIdVinculado || '');
    setStatus(c.status);
    setObservacoes(c.observacoes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !telefone.trim()) {
      alert('Nome e Telefone são obrigatórios!');
      return;
    }

    setLoading(true);
    try {
      await onSaveColaborador({
        id: colabEditando ? colabEditando.id : undefined,
        nome: nome.trim(),
        cpf: cpf.trim(),
        rg: rg.trim(),
        cnh: cnh.trim(),
        categoriaCnh,
        validadeCnh,
        telefone: telefone.trim(),
        email: email.trim(),
        endereco: endereco.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        dataNascimento,
        dataAdmissao,
        cargo,
        usuarioIdVinculado,
        status,
        observacoes: observacoes.trim(),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao salvar colaborador: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (c: Colaborador) => {
    if (confirm(`Tem certeza que deseja excluir o cadastro do colaborador ${c.nome}?`)) {
      try {
        await onDeleteColaborador(c.id);
      } catch (err: any) {
        alert('Erro ao excluir colaborador: ' + err.message);
      }
    }
  };

  const colaboradoresFiltrados = colaboradores.filter((c) => {
    const termo = (buscaExterno !== undefined ? buscaExterno : busca).toLowerCase();
    const matchBusca =
      c.nome.toLowerCase().includes(termo) ||
      (c.cpf && c.cpf.toLowerCase().includes(termo)) ||
      (c.cnh && c.cnh.toLowerCase().includes(termo)) ||
      (c.telefone && c.telefone.toLowerCase().includes(termo));
    const matchStatus = filtroStatus === 'TODOS' || c.status === filtroStatus;
    const matchCargo = filtroCargo === 'TODOS' || c.cargo === filtroCargo;
    return matchBusca && matchStatus && matchCargo;
  });

  const cargosUnicos = Array.from(new Set(colaboradores.map((c) => c.cargo).filter(Boolean)));

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
          title="Importação automática de CNH/RG do colaborador via IA"
        >
          {ocrLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{ocrLoading ? 'Lendo...' : 'Importar CNH/RG'}</span>
        </button>

        <button
          onClick={abrirModalNovo}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 shrink-0 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Novo Colaborador</span>
        </button>
      </TopBarActions>

      {/* Filtros Secundários Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <select
            value={filtroCargo}
            onChange={(e) => setFiltroCargo(e.target.value)}
            className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos os Cargos ({colaboradores.length})</option>
            {cargosUnicos.map((cg) => (
              <option key={cg} value={cg}>
                {cg}
              </option>
            ))}
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="ATIVO">Ativos</option>
            <option value="INATIVO">Inativos</option>
            <option value="AFASTADO">Afastados</option>
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

      {/* Collaborators List Grid */}
      {colaboradoresFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-[#eaecf0] dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-slate-800 p-8 shadow-xs">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">Nenhum colaborador encontrado</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastre entregadores e equipe para rastreabilidade nos fechamentos diários.
          </p>
        </div>
      ) : (
        <div className="bg-[#eaecf0] dark:bg-slate-900/90 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                  <th className="py-2 px-3">Colaborador / Cargo</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3">Telefone</th>
                  <th className="py-2 px-3">Documentos (CPF / CNH)</th>
                  <th className="py-2 px-3">Usuário App Vinculado</th>
                  <th className="py-2 px-3 text-center">Admissão</th>
                  <th className="py-2 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {colaboradoresFiltrados.map((c) => {
                  const usuarioVinculado = usuarios.find((u) => u.id === c.usuarioIdVinculado);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-1.5 px-3">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs block">
                            {c.nome}
                          </span>
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            {c.cargo}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.status === 'ATIVO'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : c.status === 'INATIVO'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}
                        >
                          {c.status === 'ATIVO' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {c.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          {c.telefone || 'Sem telefone'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          {c.cpf && (
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              CPF: {c.cpf}
                            </span>
                          )}
                          {c.cnh && (
                            <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px]">
                              CNH: {c.cnh} ({c.categoriaCnh || 'N/I'})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3">
                        {usuarioVinculado ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            <UserCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>{usuarioVinculado.nome}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {c.dataAdmissao || '—'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirModalEdicao(c)}
                            title="Editar colaborador"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExcluir(c)}
                            title="Excluir colaborador"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="py-2 px-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <span>
              Mostrando <strong>{colaboradoresFiltrados.length}</strong> de <strong>{colaboradores.length}</strong> colaboradores cadastrados
            </span>
          </div>
        </div>
      )}

      {/* Modal Cadastro / Edição Colaborador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#eaecf0] dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur z-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {colabEditando ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* OCR Document Import Banner inside Modal */}
              <div className="bg-slate-50 dark:bg-slate-900/80 border border-dashed border-blue-300 dark:border-blue-700 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Importar Documento Pessoal (CNH/RG/CPF)</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Envie foto ou PDF da CNH/RG para preencher Nome, CPF, CNH, Categoria e Validade automaticamente com IA.
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

              {/* Seção 1: Dados Pessoais */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Dados Pessoais & Contato
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Marcos Vinicius da Silva"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="(11) 99999-9999"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      placeholder="colaborador@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      CPF
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      RG
                    </label>
                    <input
                      type="text"
                      placeholder="00.000.000-0"
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Documentos CNH e Admissão */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Habilitação (CNH) e Cargo
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cargo / Função
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Entregador de Rota"
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Número da CNH
                    </label>
                    <input
                      type="text"
                      placeholder="00000000000"
                      value={cnh}
                      onChange={(e) => setCnh(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Categoria CNH
                    </label>
                    <select
                      value={categoriaCnh}
                      onChange={(e) => setCategoriaCnh(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="A">A (Moto)</option>
                      <option value="B">B (Carro)</option>
                      <option value="AB">AB (Moto e Carro)</option>
                      <option value="C">C (Caminhão)</option>
                      <option value="D">D (Passageiros)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Validade da CNH
                    </label>
                    <input
                      type="date"
                      value={validadeCnh}
                      onChange={(e) => setValidadeCnh(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Data de Admissão
                    </label>
                    <input
                      type="date"
                      value={dataAdmissao}
                      onChange={(e) => setDataAdmissao(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Usuário do Sistema
                    </label>
                    <select
                      value={usuarioIdVinculado}
                      onChange={(e) => setUsuarioIdVinculado(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Nenhum (Sem acesso)</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome} ({u.login})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção 3: Status e Observações */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                    <option value="AFASTADO">Afastado</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observações
                  </label>
                  <input
                    type="text"
                    placeholder="Anotações gerais..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  {loading ? 'Salvando...' : colabEditando ? 'Atualizar Colaborador' : 'Salvar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
