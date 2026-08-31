const fs = require('fs');

let content = fs.readFileSync('src/components/SuperAdminHub.tsx', 'utf8');

const fieldsToUppercase = [
    'FormNomeFantasia',
    'FormRazaoSocial',
    'FormEmail',
    'FormCidade',
    'FormEndereco',
    'FormNumero',
    'FormBairro',
    'FormComplemento',
    'FormObservacoes'
];

fieldsToUppercase.forEach(field => {
    const regex = new RegExp(`set${field}\\(e\\.target\\.value\\)`, 'g');
    content = content.replace(regex, `set${field}(e.target.value.toUpperCase())`);
});

fs.writeFileSync('src/components/SuperAdminHub.tsx', content, 'utf8');
