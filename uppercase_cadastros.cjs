const fs = require('fs');

let content = fs.readFileSync('src/components/CadastrosHub.tsx', 'utf8');

// For Entregador
content = content.replace(/setEntregadorModal\({ \.\.\.entregadorModal, nome: e\.target\.value }\)/g, 'setEntregadorModal({ ...entregadorModal, nome: e.target.value.toUpperCase() })');
content = content.replace(/setEntregadorModal\({ \.\.\.entregadorModal, veiculo: e\.target\.value }\)/g, 'setEntregadorModal({ ...entregadorModal, veiculo: e.target.value.toUpperCase() })');
// (placa is already upper)

// For Produto
content = content.replace(/setProdutoModal\({ \.\.\.produtoModal, nome: e\.target\.value }\)/g, 'setProdutoModal({ ...produtoModal, nome: e.target.value.toUpperCase() })');
content = content.replace(/setProdutoModal\({ \.\.\.produtoModal, categoria: e\.target\.value }\)/g, 'setProdutoModal({ ...produtoModal, categoria: e.target.value.toUpperCase() })');

// For Bairro
content = content.replace(/setBairroModal\({ \.\.\.bairroModal, nome: e\.target\.value }\)/g, 'setBairroModal({ ...bairroModal, nome: e.target.value.toUpperCase() })');

fs.writeFileSync('src/components/CadastrosHub.tsx', content, 'utf8');
