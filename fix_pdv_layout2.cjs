const fs = require('fs');

let content = fs.readFileSync('src/components/PdvModulo.tsx', 'utf8');

// Replace the end of the Bairro/Ponto de Referencia block
const searchStr = `                  />
                </div>
              </div>`;

const replaceStr = `                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={novoCidade}
                    onChange={(e) => setNovoCidade(e.target.value.toUpperCase())}
                    placeholder="Cidade"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-950 font-bold text-xs shadow-xs focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={novoEstado}
                    onChange={(e) => setNovoEstado(e.target.value.toUpperCase())}
                    placeholder="SP"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-950 font-bold text-xs text-center shadow-xs focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                 <label className="block font-bold text-slate-900 mb-2">Localização no Mapa</label>
                 <LocationPickerMap
                   lat={novoLat}
                   lng={novoLng}
                   enderecoCompleto={\`\${novoEndereco}, \${novoNumero}, \${bairros.find(b => b.id === novoBairroId)?.nome || ''}, \${novoCidade} - \${novoEstado}\`}
                   onChangeLocation={(lat, lng) => {
                     setNovoLat(lat);
                     setNovoLng(lng);
                   }}
                 />
              </div>`;

const lastIndex = content.lastIndexOf(searchStr);
if (lastIndex !== -1) {
  content = content.substring(0, lastIndex) + replaceStr + content.substring(lastIndex + searchStr.length);
}

if (!content.includes('LocationPickerMap')) {
  content = content.replace(
    /import \{ AlertTriangle, CheckCircle2,/g,
    "import { LocationPickerMap } from './LocationPickerMap';\nimport { AlertTriangle, CheckCircle2,"
  );
}

fs.writeFileSync('src/components/PdvModulo.tsx', content, 'utf8');
