const fs = require('fs');

let content = fs.readFileSync('src/components/SuperAdminHub.tsx', 'utf8');
content = content.replace(/<span>CEP \(Busca Automática\)<\/span>/g, '<span className="truncate mr-1">CEP</span>');
content = content.replace(/<span className="text-\[10px\] text-amber-400 font-normal">ViaCEP \/ Correios<\/span>/g, '<span className="text-[9px] text-amber-400 font-normal whitespace-nowrap">Automático</span>');
content = content.replace(/className="flex-1 p-2\.5 rounded-xl border border-white\/10 bg-white\/5 text-white/g, 'className="flex-1 min-w-0 p-2.5 rounded-xl border border-white/10 bg-white/5 text-white');
fs.writeFileSync('src/components/SuperAdminHub.tsx', content, 'utf8');
