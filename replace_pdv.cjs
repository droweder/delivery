const fs = require('fs');
let content = fs.readFileSync('src/components/PdvModulo.tsx', 'utf8');

// 1. Change max-w-lg to max-w-4xl
content = content.replace(
  /w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-\[90vh\]/g,
  'w-full max-w-4xl rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col'
);
content = content.replace(
  /w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden/g,
  'w-full max-w-4xl rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col'
);

// 2. Replace the form inner
const formStart = '<form onSubmit={handleCadastrarNovoCliente} className="p-4 space-y-3 text-xs flex-1 overflow-y-auto min-h-0">';
const formEnd = '            </form>';

const startIndex = content.indexOf(formStart);
const endIndex = content.indexOf(formEnd, startIndex) + formEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newForm = `<form onSubmit={handleCadastrarNovoCliente} className="p-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col md:flex-row gap-5">
                
                {/* ESQUERDA: DADOS E ENDEREÇO (2/3) */}
                <div className="w-full md:w-[60%] space-y-4">
                  
                  {/* Bloco 1: Identificação */}
                  <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 shadow-xs">
                    <label className="font-bold text-blue-950 text-xs flex items-center gap-1.5 mb-2.5">
                      <Building2 className="w-4 h-4 text-blue-700" />
                      <span>Identificação do Cliente</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="block font-bold text-blue-900 mb-1">CPF / CNPJ</label>
                        <input
                          type="text"
                          value={novoCpfCnpj}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const formatted = formatarCpfCnpj(raw);
                            setNovoCpfCnpj(formatted);
                            const clean = apenasDigitos(raw);
                            if (erroCnpjInfo) setErroCnpjInfo(null);
                            if (clean.length === 14 && !consultandoCnpj) {
                              handleConsultarCnpjClientePdv(clean);
                            }
                          }}
                          placeholder="CPF ou CNPJ"
                          className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-white text-slate-950 font-mono font-bold text-xs shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                        {consultandoCnpj && (
                          <div className="absolute right-2 top-6 flex items-center gap-1 text-blue-700 font-bold bg-white px-1 py-0.5 rounded">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block font-bold text-blue-900 mb-1">Telefone *</label>
                        <input
                          type="text"
                          required
                          value={novoTelefone}
                          onChange={(e) => setNovoTelefone(formatarTelefone(e.target.value))}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-white text-slate-950 font-bold text-xs shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-blue-900 mb-1">Nome / Razão Social *</label>
                        <input
                          type="text"
                          required
                          value={novoNome}
                          onChange={(e) => setNovoNome(e.target.value.toUpperCase())}
                          placeholder="Nome do cliente ou empresa"
                          className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-white text-slate-950 font-bold text-xs shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Endereço */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block font-bold text-slate-900 mb-1 flex items-center justify-between">
                          <span>CEP</span>
                          <span className="text-[9px] text-blue-700 font-bold">Auto</span>
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={novoCep}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const formatted = formatarCep(raw);
                              setNovoCep(formatted);
                              if (erroCepInfo) setErroCepInfo(null);
                              if (statusCepInfo) setStatusCepInfo(null);
                              const clean = apenasDigitos(raw);
                              if (clean.length === 8 && !consultandoCep) {
                                handleConsultarCepClientePdv(clean);
                              }
                            }}
                            onBlur={() => {
                              if (novoCep && isCepValido(novoCep)) handleConsultarCepClientePdv();
                            }}
                            placeholder="01001-000"
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-950 font-mono font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleConsultarCepClientePdv()}
                            disabled={consultandoCep}
                            className="px-2 py-2 rounded-xl bg-slate-100 border border-slate-300 shrink-0"
                          >
                            {consultandoCep ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Search className="w-4 h-4 text-slate-700" />}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-12 sm:col-span-8">
                        <label className="block font-bold text-slate-900 mb-1">Rua / Avenida *</label>
                        <input
                          type="text"
                          required
                          value={novoEndereco}
                          onChange={(e) => setNovoEndereco(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4 sm:col-span-3">
                        <label className="block font-bold text-slate-900 mb-1">Número *</label>
                        <input
                          type="text"
                          required
                          value={novoNumero}
                          onChange={(e) => setNovoNumero(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div className="col-span-8 sm:col-span-5">
                        <label className="block font-bold text-slate-900 mb-1">Bairro *</label>
                        <select
                          value={novoBairroId}
                          onChange={(e) => setNovoBairroId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        >
                          {bairros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                        </select>
                      </div>
                      <div className="col-span-8 sm:col-span-4">
                        <label className="block font-bold text-slate-900 mb-1">Cidade / UF</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={novoCidade}
                            onChange={(e) => setNovoCidade(e.target.value.toUpperCase())}
                            className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-white font-bold shadow-xs min-w-0"
                          />
                          <input
                            type="text"
                            maxLength={2}
                            value={novoEstado}
                            onChange={(e) => setNovoEstado(e.target.value.toUpperCase())}
                            className="w-10 px-1 py-2 text-center rounded-xl border border-slate-300 bg-white font-bold shadow-xs shrink-0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block font-bold text-slate-900 mb-1">Complemento</label>
                        <input
                          type="text"
                          value={novoComplemento}
                          onChange={(e) => setNovoComplemento(e.target.value.toUpperCase())}
                          placeholder="Apto, Bloco..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-7">
                        <label className="block font-bold text-slate-900 mb-1">Referência</label>
                        <input
                          type="text"
                          value={novaReferencia}
                          onChange={(e) => setNovaReferencia(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold shadow-xs focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                </div>
                
                {/* DIREITA: MAPA E AVISOS (1/3) */}
                <div className="w-full md:w-[40%] flex flex-col gap-3">
                  
                  {/* Alertas */}
                  {novoCpfCnpj && isCnpj(novoCpfCnpj) && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-xs flex gap-2 items-start">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span><strong>CNPJ:</strong> Preenchimento da Receita.</span>
                    </div>
                  )}
                  {novoCpfCnpj && isCpf(novoCpfCnpj) && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 shadow-xs flex gap-2 items-start">
                      <Users className="w-3.5 h-3.5 text-sky-600 mt-0.5 shrink-0" />
                      <span><strong>CPF:</strong> Nome/Tel manuais. Preencha o CEP para o endereço.</span>
                    </div>
                  )}
                  {erroCnpjInfo && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 shadow-xs flex gap-2 items-start">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>CNPJ não localizado. Preencha manualmente.</span>
                    </div>
                  )}
                  {erroCepInfo && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 shadow-xs flex gap-2 items-start">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>CEP não localizado. Preencha manualmente.</span>
                    </div>
                  )}
                  {statusCepInfo && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 shadow-xs flex gap-2 items-start">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <span>{statusCepInfo}</span>
                    </div>
                  )}

                  {/* Mapa */}
                  <div className="flex-1 min-h-[220px] flex flex-col">
                    <label className="block font-bold text-slate-900 mb-1.5">Localização Exata</label>
                    <div className="flex-1 w-full relative">
                      <LocationPickerMap
                        lat={novoLat}
                        lng={novoLng}
                        enderecoCompleto={\`\${novoEndereco}, \${novoNumero}, \${bairros.find(b => b.id === novoBairroId)?.nome || ''}, \${novoCidade} - \${novoEstado}\`}
                        onChangeLocation={(lat, lng) => {
                          setNovoLat(lat);
                          setNovoLng(lng);
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200 mt-1">
                <button
                  type="button"
                  onClick={() => setModalNovoCliente(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-new-client"
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Salvar Cliente
                </button>
              </div>
            </form>`;

  content = content.substring(0, startIndex) + newForm + content.substring(endIndex);
  fs.writeFileSync('src/components/PdvModulo.tsx', content, 'utf8');
  console.log("Success");
} else {
  console.log("Form not found", startIndex, endIndex);
}
