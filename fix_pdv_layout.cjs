const fs = require('fs');

let content = fs.readFileSync('src/components/PdvModulo.tsx', 'utf8');

// replace gap-2.5 with gap-4 in grid-cols-3
content = content.replace(/className="grid grid-cols-1 sm:grid-cols-3 gap-2\.5"/g, 'className="grid grid-cols-1 sm:grid-cols-3 gap-4"');
content = content.replace(/className="grid grid-cols-3 gap-2\.5"/g, 'className="grid grid-cols-3 gap-4"');

// replace gap-2.5 with gap-4 in grid-cols-2
content = content.replace(/className="grid grid-cols-1 sm:grid-cols-2 gap-2\.5"/g, 'className="grid grid-cols-1 sm:grid-cols-2 gap-4"');

// replace e.target.value to e.target.value.toUpperCase() for novaReferencia
content = content.replace(/setNovaReferencia\(e\.target\.value\)/g, 'setNovaReferencia(e.target.value.toUpperCase())');

fs.writeFileSync('src/components/PdvModulo.tsx', content, 'utf8');
