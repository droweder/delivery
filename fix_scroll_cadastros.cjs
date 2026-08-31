const fs = require('fs');

let content = fs.readFileSync('src/components/CadastrosHub.tsx', 'utf8');

// The form currently has:
// className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs"
// We need to add "flex-1 min-h-0" to it to make sure it respects the flex-col constraints.

content = content.replace(
  /<form onSubmit=\{handleSalvarCliente\} className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs">/g,
  '<form onSubmit={handleSalvarCliente} className="p-4 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1 text-xs">'
);

fs.writeFileSync('src/components/CadastrosHub.tsx', content, 'utf8');
