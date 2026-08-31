const fs = require('fs');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add min-w-0 to CEP inputs
    content = content.replace(/className="flex-1 px-3 py-2 rounded-xl/g, 'className="flex-1 min-w-0 px-3 py-2 rounded-xl');
    content = content.replace(/className="flex-1 p-2\.5 rounded-xl/g, 'className="flex-1 min-w-0 p-2.5 rounded-xl');

    // 2. Prevent label wrapping by making it whitespace-nowrap and truncating if needed
    content = content.replace(/<span>CEP \(Busca Auto\)<\/span>/g, '<span className="truncate mr-1">CEP</span>');
    content = content.replace(/<span className="text-\[9\.5px\] text-blue-700 font-bold">ViaCEP \/ BrasilAPI<\/span>/g, '<span className="text-[9px] text-blue-700 font-bold whitespace-nowrap">Automático</span>');

    content = content.replace(/<span>CEP \(Busca Automática\)<\/span>/g, '<span className="truncate mr-1">CEP</span>');
    content = content.replace(/<span className="text-\[10px\] text-blue-600 font-semibold">Correios \/ ViaCEP<\/span>/g, '<span className="text-[9px] text-blue-700 font-bold whitespace-nowrap">Automático</span>');


    fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('src/components/PdvModulo.tsx');
fixFile('src/components/CadastrosHub.tsx');
