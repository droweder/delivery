const fs = require('fs');
let content = fs.readFileSync('src/components/CadastrosHub.tsx', 'utf8');

// 1. Change max-w-xl to max-w-4xl
content = content.replace(
  /w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-\[92vh\]/g,
  'w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col'
);
content = content.replace(
  /w-full max-w-xl overflow-hidden shadow-2xl flex flex-col/g,
  'w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col'
);

// 2. Replace the form inner
const formStart = '<form onSubmit={handleSalvarCliente} className="p-4 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1 text-xs">';
const formEnd = '            </form>';

const startIndex = content.indexOf(formStart);
const endIndex = content.indexOf(formEnd, startIndex) + formEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newForm = `<form onSubmit={handleSalvarCliente} className="p-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col md:flex-row gap-5">
                
                {/* ESQUERDA: DADOS E ENDEREÇO (2/3) */}
                <div className="w-full md:w-[60%] space-y-4">
                  
                  {/* Bloco 1: Identificação */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50 shadow-xs">
                    <label className="font-black text-blue-950 dark:text-blue-200 flex items-center gap-1.5 text-xs mb-2.5">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Identificação do Cliente</span>
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="relative">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CPF / CNPJ</label>
                        <input
                          type="text"
                          value={clienteModal.cpfCnpj || ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const formatted = formatarCpfCnpj(raw);
                            setClienteModal({ ...clienteModal, cpfCnpj: formatted });
                            const clean = apenasDigitos(raw);
                            if (erroCnpjInfo) setErroCnpjInfo(null);
                            if (clean.length === 14 && !consultandoCnpj) {
                              handleConsultarCnpjCliente(clean);
                            }
                          }}
                          placeholder="CPF ou CNPJ"
                          className="w-full p-2.5 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-2 focus:ring-blue-500"
                        />
                        {consultandoCnpj && (
                          <div className="absolute right-2 top-7 flex items-center gap-1 text-blue-600">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      <div className="sm:col-span-1 lg:col-span-2">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo / Razão Social *</label>
                        <input
                          type="text"
                          required
                          value={clienteModal.nome || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, nome: e.target.value.toUpperCase() })}
                          placeholder="Ex: Maria Aparecida"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone *</label>
                        <input
                          type="text"
                          required
                          value={clienteModal.telefone || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, telefone: formatarTelefone(e.target.value) })}
                          placeholder="(11) 98765-4321"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                      
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail (Opcional)</label>
                        <input
                          type="email"
                          value={clienteModal.email || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, email: e.target.value.toUpperCase() })}
                          placeholder="cliente@empresa.com.br"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                        <select
                          value={clienteModal.status || 'ATIVO'}
                          onChange={(e) => setClienteModal({ ...clienteModal, status: e.target.value as 'ATIVO' | 'INATIVO' })}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black"
                        >
                          <option value="ATIVO">✅ ATIVO</option>
                          <option value="INATIVO">❌ INATIVO</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Endereço */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                          <span>CEP</span>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">Auto</span>
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={clienteModal.cep || ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const formatted = formatarCep(raw);
                              setClienteModal({ ...clienteModal, cep: formatted });
                              const clean = apenasDigitos(raw);
                              if (clean.length === 8 && !consultandoCep) {
                                handleConsultarCepCliente(clean);
                              }
                            }}
                            placeholder="01001-000"
                            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleConsultarCepCliente(apenasDigitos(clienteModal.cep || ''))}
                            disabled={consultandoCep}
                            className="px-2.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                          >
                            {consultandoCep ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Search className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                          </button>
                        </div>
                      </div>
                      <div className="col-span-12 sm:col-span-8">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço (Rua / Av) *</label>
                        <input
                          type="text"
                          required
                          value={clienteModal.endereco || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, endereco: e.target.value.toUpperCase() })}
                          placeholder="Rua das Palmeiras"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-4 sm:col-span-3">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número *</label>
                        <input
                          type="text"
                          required
                          value={clienteModal.numero || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, numero: e.target.value.toUpperCase() })}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                        />
                      </div>
                      <div className="col-span-8 sm:col-span-5">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bairro de Entrega *</label>
                        <select
                          value={clienteModal.bairroId || bairros[0]?.id}
                          onChange={(e) => {
                            const b = bairros.find((bx) => bx.id === e.target.value);
                            setClienteModal({ ...clienteModal, bairroId: e.target.value, bairroNome: b?.nome || '' });
                          }}
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          {bairros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
                        </select>
                      </div>
                      <div className="col-span-8 sm:col-span-4">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cidade / UF</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={clienteModal.cidade || 'São Paulo'}
                            onChange={(e) => setClienteModal({ ...clienteModal, cidade: e.target.value.toUpperCase() })}
                            className="w-full px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium min-w-0"
                          />
                          <input
                            type="text"
                            maxLength={2}
                            value={clienteModal.estado || 'SP'}
                            onChange={(e) => setClienteModal({ ...clienteModal, estado: e.target.value.toUpperCase() })}
                            className="w-10 px-1 py-2.5 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase font-bold shrink-0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Complemento</label>
                        <input
                          type="text"
                          value={clienteModal.complemento || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, complemento: e.target.value.toUpperCase() })}
                          placeholder="APTO 42"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-7">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ponto de Referência</label>
                        <input
                          type="text"
                          value={clienteModal.referencia || ''}
                          onChange={(e) => setClienteModal({ ...clienteModal, referencia: e.target.value.toUpperCase() })}
                          placeholder="Ex: Em frente ao mercado..."
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                </div>
                
                {/* DIREITA: MAPA E AVISOS (1/3) */}
                <div className="w-full md:w-[40%] flex flex-col gap-3">
                  
                  {/* Alertas CNPJ */}
                  {clienteModal.cpfCnpj && isCnpj(clienteModal.cpfCnpj) && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex gap-2 items-start">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 mt-0.5 shrink-0" />
                      <span><strong>CNPJ:</strong> Preenchimento da Receita.</span>
                    </div>
                  )}
                  {clienteModal.cpfCnpj && isCpf(clienteModal.cpfCnpj) && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex gap-2 items-start">
                      <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-500 mt-0.5 shrink-0" />
                      <span><strong>CPF:</strong> Nome/Tel manuais. Preencha o CEP para o endereço.</span>
                    </div>
                  )}
                  {erroCnpjInfo && (
                    <div className="text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex gap-2 items-start">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>CNPJ não localizado. Preencha manualmente.</span>
                    </div>
                  )}

                  {/* Mapa */}
                  <div className="flex-1 min-h-[220px] flex flex-col">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Localização Exata</label>
                    <div className="flex-1 w-full relative">
                      <LocationPickerMap
                        lat={clienteModal.lat || -23.55052}
                        lng={clienteModal.lng || -46.633308}
                        enderecoCompleto={\`\${clienteModal.endereco || ''}, \${clienteModal.numero || ''}, \${bairros.find(b => b.id === clienteModal.bairroId)?.nome || ''}, \${clienteModal.cidade || ''} - \${clienteModal.estado || ''}\`}
                        onChangeLocation={(lat, lng) => {
                          setClienteModal({ ...clienteModal, lat, lng });
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setClienteModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : 'Salvar Cliente'}</span>
                </button>
              </div>
            </form>`;

  content = content.substring(0, startIndex) + newForm + content.substring(endIndex);
  fs.writeFileSync('src/components/CadastrosHub.tsx', content, 'utf8');
  console.log("Success Cadastros");
} else {
  console.log("Form not found", startIndex, endIndex);
}
