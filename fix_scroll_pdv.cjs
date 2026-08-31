const fs = require('fs');

let content = fs.readFileSync('src/components/PdvModulo.tsx', 'utf8');

// 1. Make the modal container flexible and limited in height
content = content.replace(
  /className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden"/g,
  'className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"'
);

// 2. Make the form scrollable
content = content.replace(
  /<form onSubmit=\{handleCadastrarNovoCliente\} className="p-4 space-y-3 text-xs">/g,
  '<form onSubmit={handleCadastrarNovoCliente} className="p-4 space-y-3 text-xs flex-1 overflow-y-auto min-h-0">'
);

fs.writeFileSync('src/components/PdvModulo.tsx', content, 'utf8');
