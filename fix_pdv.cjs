const fs = require('fs');

let content = fs.readFileSync('src/components/PdvModulo.tsx', 'utf8');

// Remove state declaration
content = content.replace(/  const \[dadosReceitaCarregados, setDadosReceitaCarregados\] = useState<DadosCnpjResponse \| null>\(null\);\n/, '');

// Remove setting it to null
content = content.replace(/setDadosReceitaCarregados\(null\);\n/g, '');

// Remove line 1206 setting it to null
content = content.replace(/if \(clean.length < 14 && dadosReceitaCarregados\) setDadosReceitaCarregados\(null\);\n/, '');

// Remove setDadosReceitaCarregados(res)
content = content.replace(/setDadosReceitaCarregados\(res\);\n/, '');

// Remove the summary block
const blockStart = content.indexOf('{/* Card de Dados Obtidos com Sucesso da Receita Federal */}');
const blockEnd = content.indexOf('{/* Alerta de CNPJ Não Localizado */}');
if (blockStart !== -1 && blockEnd !== -1) {
    content = content.substring(0, blockStart) + content.substring(blockEnd);
}

// Remove CSS ternary for dadosReceitaCarregados
content = content.replace(/dadosReceitaCarregados \? 'border-emerald-400 bg-emerald-50\/20' : 'border-slate-300 bg-white'/g, "'border-slate-300 bg-white'");

// Special case for line 1339:
// : dadosReceitaCarregados
// ? 'border-emerald-400 bg-emerald-50/20'
content = content.replace(/: dadosReceitaCarregados\s*\?\s*'border-emerald-400 bg-emerald-50\/20'/g, "");

// Add toUpperCase() to inputs
content = content.replace(/setNovoNome\(e\.target\.value\)/g, 'setNovoNome(e.target.value.toUpperCase())');
content = content.replace(/setNovoEndereco\(e\.target\.value\)/g, 'setNovoEndereco(e.target.value.toUpperCase())');
content = content.replace(/setNovoNumero\(e\.target\.value\)/g, 'setNovoNumero(e.target.value.toUpperCase())');
content = content.replace(/setNovoComplemento\(e\.target\.value\)/g, 'setNovoComplemento(e.target.value.toUpperCase())');
content = content.replace(/setObservacoes\(e\.target\.value\)/g, 'setObservacoes(e.target.value.toUpperCase())');


fs.writeFileSync('src/components/PdvModulo.tsx', content, 'utf8');
