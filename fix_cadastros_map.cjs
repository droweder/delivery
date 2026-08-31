const fs = require('fs');

let content = fs.readFileSync('src/components/CadastrosHub.tsx', 'utf8');

const searchStr = `                  <input
                    type="text"
                    value={clienteModal.referencia || ''}
                    onChange={(e) => setClienteModal({ ...clienteModal, referencia: e.target.value.toUpperCase() })}
                    placeholder="Ex: Em frente ao mercado, portão branco"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>`;

const replaceStr = searchStr + `

                <div className="col-span-2 mt-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">Localização no Mapa</label>
                  <LocationPickerMap
                    lat={clienteModal.lat || -23.55052}
                    lng={clienteModal.lng || -46.633308}
                    enderecoCompleto={\`\${clienteModal.endereco || ''}, \${clienteModal.numero || ''}, \${bairros.find(b => b.id === clienteModal.bairroId)?.nome || ''}, \${clienteModal.cidade || ''} - \${clienteModal.estado || ''}\`}
                    onChangeLocation={(lat, lng) => {
                      setClienteModal({ ...clienteModal, lat, lng });
                    }}
                  />
                </div>`;

content = content.replace(searchStr, replaceStr);

if (!content.includes('LocationPickerMap')) {
  content = content.replace(
    /import React, \{ useState, useMemo \} from 'react';/,
    "import React, { useState, useMemo } from 'react';\nimport { LocationPickerMap } from './LocationPickerMap';"
  );
}

fs.writeFileSync('src/components/CadastrosHub.tsx', content, 'utf8');
