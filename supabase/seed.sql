-- Seed data gerado a partir do initialData.ts

INSERT INTO delivery.empresas (id, razao_social, nome_fantasia, cnpj, telefone, email, cidade, estado, endereco, plano, status, limite_usuarios, limite_pedidos_mes, valor_mensalidade, criado_em, ultimo_acesso) VALUES
('emp1', 'Disk Entrega Comércio de Gás e Água Ltda', 'Disk Entrega & Conveniência', '12.345.678/0001-90', '(11) 98888-0001', 'contato@diskentrega.com.br', 'São Paulo', 'SP', 'Av. Paulista, 1000 - Bela Vista', 'PRO', 'ATIVO', 10, 5000, 199, '2026-01-01T00:00:00Z', '2026-08-31T10:00:00Z'),
('emp2', 'Mega Gás & Bebidas Distribuidora Eireli', 'Mega Gás Express', '98.765.432/0001-10', '(21) 97777-1234', 'comercial@megagas.com.br', 'Rio de Janeiro', 'RJ', 'Rua das Palmeiras, 450 - Copacabana', 'ENTERPRISE', 'ATIVO', 25, 15000, 399, '2026-03-10T00:00:00Z', '2026-08-30T17:30:00Z'),
('emp3', 'Chama Viva Comércio de Águas e Combustíveis ME', 'Chama Viva Distribuidora', '45.123.789/0001-55', '(31) 96666-8899', 'sac@chamaviva.com.br', 'Belo Horizonte', 'MG', 'Av. do Contorno, 2100 - Savassi', 'BASICO', 'ATIVO', 5, 2000, 99, '2026-05-15T00:00:00Z', '2026-08-29T14:10:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.usuarios (id, empresa_id, nome, login, email, senha, telefone, perfil, cargo, ativo, pin_acesso, permissoes, criado_em, ultimo_acesso) VALUES
('u0', NULL, 'Super Admin Droweder', 'admin@droweder.com.br', 'admin@droweder.com.br', 'FZ?t-b#4', '(11) 99999-0000', 'SUPER_ADMIN', 'Criador da Plataforma & Administrador Global', TRUE, 'FZ?t-b#4', '{"emitirPedidos":true,"despacharPedidos":true,"cancelarPedidos":true,"editarPedidos":true,"devolverPedidos":true,"realizarAcertoCaixa":true,"ajustarEstoque":true,"verDashboardGerencial":true,"acessarCadastros":true,"gerenciarUsuarios":true,"importarErp":true}', '2026-01-01T00:00:00Z', '2026-08-31T10:00:00Z'),
('u1', 'emp1', 'Carlos Eduardo', 'carlos.admin', 'carlos@diskentrega.com.br', NULL, '(11) 98888-0001', 'ADMIN', 'Administrador Geral / Proprietário', TRUE, '1234', '{"emitirPedidos":true,"despacharPedidos":true,"cancelarPedidos":true,"editarPedidos":true,"devolverPedidos":true,"realizarAcertoCaixa":true,"ajustarEstoque":true,"verDashboardGerencial":true,"acessarCadastros":true,"gerenciarUsuarios":true,"importarErp":true}', '2026-01-01T08:00:00Z', '2026-08-21T10:40:00Z'),
('u2', 'emp1', 'Renata Vasconcelos', 'renata.gerente', 'renata@diskentrega.com.br', NULL, '(11) 98888-0002', 'GERENTE', 'Gerente de Operações e Logística', TRUE, '2026', '{"emitirPedidos":true,"despacharPedidos":true,"cancelarPedidos":true,"editarPedidos":true,"devolverPedidos":true,"realizarAcertoCaixa":true,"ajustarEstoque":true,"verDashboardGerencial":true,"acessarCadastros":true,"gerenciarUsuarios":false,"importarErp":true}', '2026-01-10T08:00:00Z', '2026-08-21T10:30:00Z'),
('u3', NULL, 'Ana Paula Martins', 'ana.pdv', 'ana@diskentrega.com.br', NULL, '(11) 98888-0003', 'ATENDENTE_PDV', 'Operadora de Caixa & Atendente PDV (Manhã)', TRUE, '1111', '{"emitirPedidos":true,"despacharPedidos":false,"cancelarPedidos":false,"editarPedidos":true,"devolverPedidos":false,"realizarAcertoCaixa":false,"ajustarEstoque":false,"verDashboardGerencial":false,"acessarCadastros":true,"gerenciarUsuarios":false,"importarErp":false}', '2026-02-01T08:00:00Z', '2026-08-21T10:45:00Z'),
('u4', NULL, 'Bruno Ferreira', 'bruno.pdv', 'bruno@diskentrega.com.br', NULL, '(11) 98888-0004', 'ATENDENTE_PDV', 'Operador de Caixa & Atendente PDV (Tarde)', TRUE, '2222', '{"emitirPedidos":true,"despacharPedidos":false,"cancelarPedidos":false,"editarPedidos":true,"devolverPedidos":false,"realizarAcertoCaixa":false,"ajustarEstoque":false,"verDashboardGerencial":false,"acessarCadastros":true,"gerenciarUsuarios":false,"importarErp":false}', '2026-02-15T08:00:00Z', '2026-08-20T18:00:00Z'),
('u5', NULL, 'Marcos Vinicius', 'marcos.moto1', NULL, NULL, '(11) 99100-1111', 'ENTREGADOR', 'Entregador de Rota (Moto 01)', TRUE, '0001', '{"emitirPedidos":false,"despacharPedidos":false,"cancelarPedidos":false,"editarPedidos":false,"devolverPedidos":true,"realizarAcertoCaixa":false,"ajustarEstoque":false,"verDashboardGerencial":false,"acessarCadastros":false,"gerenciarUsuarios":false,"importarErp":false}', '2026-01-15T08:00:00Z', '2026-08-21T10:05:00Z'),
('u6', NULL, 'Lucas Gabriel', 'lucas.moto2', NULL, NULL, '(11) 99200-2222', 'ENTREGADOR', 'Entregador de Rota (Moto 02)', TRUE, '0002', '{"emitirPedidos":false,"despacharPedidos":false,"cancelarPedidos":false,"editarPedidos":false,"devolverPedidos":true,"realizarAcertoCaixa":false,"ajustarEstoque":false,"verDashboardGerencial":false,"acessarCadastros":false,"gerenciarUsuarios":false,"importarErp":false}', '2026-01-20T08:00:00Z', '2026-08-21T10:10:00Z'),
('u7', NULL, 'Rodrigo Alves', 'rodrigo.carro1', NULL, NULL, '(11) 99300-3333', 'ENTREGADOR', 'Motorista de Entrega (Fiorino 01)', TRUE, '0003', '{"emitirPedidos":false,"despacharPedidos":false,"cancelarPedidos":false,"editarPedidos":false,"devolverPedidos":true,"realizarAcertoCaixa":false,"ajustarEstoque":false,"verDashboardGerencial":false,"acessarCadastros":false,"gerenciarUsuarios":false,"importarErp":false}', '2026-01-25T08:00:00Z', '2026-08-21T09:55:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.bairros_taxas (id, nome, taxa, prazo_estimado, status) VALUES
('b1', 'Centro', NULL, NULL, 'ATIVO'),
('b2', 'Jardim América', NULL, NULL, 'ATIVO'),
('b3', 'Vila Nova', NULL, NULL, 'ATIVO'),
('b4', 'Parque das Flores', NULL, NULL, 'ATIVO'),
('b5', 'Bela Vista', NULL, NULL, 'ATIVO'),
('b6', 'Distrito Industrial', NULL, NULL, 'ATIVO')
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.produtos (id, codigo, nome, marca, unidade_medida, categoria, tipo_vasilhame, preco_recarga, preco_completo, ativo, estoque_atual, estoque_minimo) VALUES
('p1', 'GAS-P13', 'Gás de Cozinha P13 (13kg)', 'Ultragaz / Nacional', 'UN (13kg)', 'GAS', 'P13', 110, 280, TRUE, 50, 10),
('p2', 'AGUA-20L', 'Água Mineral Galão 20L (Fonte Pura)', 'Fonte Ibirá / Crystal', 'Galão 20L', 'AGUA', 'P20L', 14, 42, TRUE, 50, 20),
('p3', 'GAS-P45', 'Gás Cilindro P45 (Industrial/Condomínio)', 'Ultragaz', 'Cilindro 45kg', 'GAS', 'P45', 460, 950, TRUE, 50, 3),
('p4', 'BEB-HEIN-6', 'Cerveja Heineken Long Neck 330ml (Pack 6 un)', 'Heineken', 'Pack c/ 6', 'BEBIDAS', 'NENHUM', 45, 45, TRUE, 50, 15),
('p5', 'BEB-COCA-2L', 'Refrigerante Coca-Cola 2L Pet Gelada', 'Coca-Cola', 'Garrafa 2L', 'BEBIDAS', 'NENHUM', 11.5, 11.5, TRUE, 50, 12),
('p6', 'CONV-GELO-5K', 'Gelo em Cubos Filtrado (Saco 5kg)', 'Gelo Polar', 'Saco 5kg', 'CONVENIENCIA', 'NENHUM', 16, 16, TRUE, 50, 8),
('p7', 'CONV-CARVAO-3K', 'Carvão Vegetal Especial Churrasco (Saco 3kg)', 'Carvão Ipê', 'Saco 3kg', 'CONVENIENCIA', 'NENHUM', 22, 22, TRUE, 50, 5),
('p8', 'BEB-AMSTEL-LATA', 'Cerveja Amstel Puro Malte 350ml (Pack 12 un)', 'Amstel', 'Pack c/ 12', 'BEBIDAS', 'NENHUM', 42, 42, TRUE, 50, 10),
('p9', 'AGUA-500-SEM', 'Água Mineral sem Gás 510ml (Fardo 12 un)', 'Crystal / Lindoya', 'Fardo c/ 12', 'AGUA', 'NENHUM', 24, 24, TRUE, 50, 10),
('p10', 'BEB-REDBULL-250', 'Energético Red Bull Energy Drink 250ml', 'Red Bull', 'Lata 250ml', 'BEBIDAS', 'NENHUM', 10, 10, TRUE, 50, 8),
('p11', 'CONV-PASTA-DENTE', 'Pasta de Dente Colgate 90g', 'Colgate', 'Tubo 90g', 'CONVENIENCIA', 'NENHUM', 5.5, 5.5, TRUE, 50, 5),
('p12', 'CONV-SABONETE', 'Sabonete Lux 90g', 'Lux', 'Unidade', 'CONVENIENCIA', 'NENHUM', 3.2, 3.2, TRUE, 50, 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.clientes (id, cpf_cnpj, nome, telefone, email, cep, endereco, numero, complemento, bairro_id, bairro_nome, cidade, estado, referencia, lat, lng, status) VALUES
('c1', NULL, 'Maria da Silva Oliveira', '(11) 98765-4321', NULL, NULL, 'Rua das Palmeiras', '142', 'Apto 204', 'b2', 'Jardim América', NULL, NULL, 'Próximo ao Supermercado Extra', -23.561684, -46.655981, NULL),
('c2', NULL, 'Carlos Eduardo Santos (Padaria do Carlinhos)', '(11) 97123-8899', NULL, NULL, 'Av. Brasil', '1580', 'Comércio', 'b1', 'Centro', NULL, NULL, 'Esquina com a Rua 7 de Setembro', -23.55052, -46.633308, NULL),
('c3', NULL, 'Fernanda Rocha Lima', '(11) 99456-1122', NULL, NULL, 'Rua Bela Cintra', '890', 'Casa 2', 'b3', 'Vila Nova', NULL, NULL, 'Portão preto com campainha sem fio', -23.55831, -46.66212, NULL),
('c4', NULL, 'Restaurante Sabor & Arte (Gerente Roberto)', '(11) 98111-2233', NULL, NULL, 'Rua Augusta', '2200', 'Fundos Cozinha', 'b5', 'Bela Vista', NULL, NULL, 'Entrada de serviço lateral', -23.5654, -46.6642, NULL),
('c5', NULL, 'Juliana Mendes Costa', '(11) 97654-9988', NULL, NULL, 'Alameda dos Ipês', '45', '', 'b4', 'Parque das Flores', NULL, NULL, 'Sobrado amarelo com cerca viva', -23.5701, -46.6712, NULL),
('c6', NULL, 'Ricardo Oliveira', '(11) 99999-8888', NULL, NULL, 'Rua das Flores', '10', '', 'b4', 'Parque das Flores', NULL, NULL, 'Casa verde', -23.571, -46.672, NULL),
('c7', NULL, 'Tatiane Souza', '(11) 98888-7777', NULL, NULL, 'Rua do Comércio', '500', 'Apto 10', 'b1', 'Centro', NULL, NULL, 'Em frente ao banco', -23.551, -46.634, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.entregadores (id, nome, telefone, veiculo, placa, ativo) VALUES
('e1', 'Marcos Vinicius (Moto 01)', '(11) 99100-1111', 'Moto 01 (Honda Fan 160 c/ Suporte Gás/Água)', 'ABC-4E12', TRUE),
('e2', 'Lucas Gabriel (Moto 02)', '(11) 99200-2222', 'Moto 02 (Yamaha Fazer 150)', 'DEF-8K90', TRUE),
('e3', 'Rodrigo Alves (Carro 01)', '(11) 99300-3333', 'Carro 01 (Fiat Fiorino Furgão)', 'GHI-3A45', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.pedidos (id, codigo, cliente_id, entregador_id, status, subtotal, taxa_entrega, desconto, total, forma_pagamento_prevista, troco_para, observacoes, emitido_por_id, emitido_por_nome, emitido_por_perfil, despachado_por, devolvido_para_correcao, motivo_devolucao, criado_em, despachado_em, entregue_em, concluido_em, devolvido_em, sincronizado, versao) VALUES
('ped-101', '#1041', 'c1', 'e1', 'EM_ROTA', 138, 5, 0, 143, 'PIX', NULL, 'Tocar o interfone 204. Cliente vai pagar via chave Pix na entrega.', NULL, NULL, NULL, NULL, FALSE, NULL, '2026-08-21T09:40:00Z', '2026-08-21T09:50:00Z', NULL, NULL, NULL, TRUE, 1),
('ped-102', '#1042', 'c3', 'e1', 'EM_ROTA', 121.5, 6, 0, 127.5, 'DINHEIRO', 150, 'Levar R$ 22,50 de troco para 150.', NULL, NULL, NULL, NULL, FALSE, NULL, '2026-08-21T09:45:00Z', '2026-08-21T09:50:00Z', NULL, NULL, NULL, TRUE, 1),
('ped-103', '#1043', 'c2', NULL, 'PENDENTE', 70, 3, 0, 73, 'CARTAO_DEBITO', NULL, 'Padaria no Centro. Entregar nos fundos com nota.', NULL, NULL, NULL, NULL, FALSE, NULL, '2026-08-21T10:00:00Z', NULL, NULL, NULL, NULL, TRUE, 1),
('ped-104', '#1044', 'c5', NULL, 'PENDENTE', 280, 8, 0, 288, 'CARTAO_CREDITO', NULL, 'Cliente nova, comprou o botijão completo com vasilhame.', NULL, NULL, NULL, NULL, FALSE, NULL, '2026-08-21T10:05:00Z', NULL, NULL, NULL, NULL, TRUE, 1),
('ped-105', '#1040', 'c4', 'e3', 'ENTREGUE', 204, 7, 0, 211, 'PIX', NULL, 'Restaurante. Recebido pela chef Juliana.', NULL, NULL, NULL, NULL, FALSE, NULL, '2026-08-21T09:10:00Z', '2026-08-21T09:20:00Z', '2026-08-21T09:48:00Z', NULL, NULL, TRUE, 2),
('ped-106', '#1039', 'c1', 'e2', 'CONCLUIDO', 106, 5, 5, 106, 'CARTAO_CREDITO', NULL, 'Entregue no portão.', NULL, NULL, NULL, NULL, FALSE, NULL, '2026-08-21T08:30:00Z', '2026-08-21T08:40:00Z', '2026-08-21T08:58:00Z', '2026-08-21T09:15:00Z', NULL, TRUE, 3),
('ped-107', '#1038', 'c2', 'e3', 'CONCLUIDO', 460, 3, 10, 453, 'PIX', NULL, 'Padaria. Troca de cilindro P45 da cozinha concluída.', NULL, NULL, NULL, NULL, FALSE, NULL, '2026-08-21T07:45:00Z', '2026-08-21T08:00:00Z', '2026-08-21T08:35:00Z', '2026-08-21T09:00:00Z', NULL, TRUE, 3),
('ped-108', '#1037', 'c3', 'e1', 'CONCLUIDO', 132, 6, 0, 138, 'DINHEIRO', NULL, 'Troco de R$ 2,00 entregue.', NULL, NULL, NULL, NULL, FALSE, NULL, '2026-08-21T07:15:00Z', '2026-08-21T07:25:00Z', '2026-08-21T07:50:00Z', '2026-08-21T08:10:00Z', NULL, TRUE, 3),
('ped-109', '#1036', 'c5', NULL, 'CANCELADO', 28, 8, 0, 36, 'PIX', NULL, 'Cliente ligou cancelando pois precisou sair de casa antes da entrega.', 'u3', 'Ana Paula Martins', 'ATENDENTE_PDV', NULL, FALSE, NULL, '2026-08-21T06:50:00Z', NULL, NULL, NULL, NULL, TRUE, 2),
('ped-110', '#1045', 'c2', 'e2', 'DEVOLVIDO_CORRECAO', 121.5, 3, 0, 124.5, 'DINHEIRO', 150, 'Entregar na portaria B.', 'u3', 'Ana Paula Martins', 'ATENDENTE_PDV', 'Carlos Eduardo (Gerente)', TRUE, 'Endereço divergente: número 210 no pedido, mas cliente informa número 540 no Bairro Vila Nova.', '2026-08-21T09:50:00Z', '2026-08-21T10:00:00Z', NULL, NULL, '2026-08-21T10:15:00Z', TRUE, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO delivery.itens_pedido (id, pedido_id, produto_id, nome_produto, categoria, tipo_vasilhame, tipo_venda, quantidade, preco_unitario, subtotal, vasilhames_recolhidos_esperados, vasilhames_recolhidos_reais) VALUES
('it-1', 'ped-101', 'p1', 'Gás de Cozinha P13 (13kg)', 'GAS', 'P13', 'RECARGA', 1, 110, 110, 1, 0),
('it-2', 'ped-101', 'p2', 'Água Mineral Galão 20L (Fonte Pura)', 'AGUA', 'P20L', 'RECARGA', 2, 14, 28, 2, 0),
('it-3', 'ped-102', 'p1', 'Gás de Cozinha P13 (13kg)', 'GAS', 'P13', 'RECARGA', 1, 110, 110, 1, 0),
('it-4', 'ped-102', 'p5', 'Refrigerante Coca-Cola 2L Gelada', 'BEBIDAS', 'NENHUM', 'COMPLETO', 1, 11.5, 11.5, 0, NULL),
('it-5', 'ped-103', 'p2', 'Água Mineral Galão 20L (Fonte Pura)', 'AGUA', 'P20L', 'RECARGA', 5, 14, 70, 5, NULL),
('it-6', 'ped-104', 'p1', 'Gás de Cozinha P13 (13kg)', 'GAS', 'P13', 'COMPLETO', 1, 280, 280, 0, NULL),
('it-7', 'ped-105', 'p2', 'Água Mineral Galão 20L (Fonte Pura)', 'AGUA', 'P20L', 'RECARGA', 10, 14, 140, 10, 10),
('it-8', 'ped-105', 'p6', 'Gelo em Cubos Filtrado (Saco 5kg)', 'CONVENIENCIA', 'NENHUM', 'COMPLETO', 4, 16, 64, 0, NULL),
('it-9', 'ped-106', 'p4', 'Cerveja Heineken Long Neck (Pack 6 un)', 'BEBIDAS', 'NENHUM', 'COMPLETO', 2, 45, 90, 0, NULL),
('it-10', 'ped-106', 'p6', 'Gelo em Cubos Filtrado (Saco 5kg)', 'CONVENIENCIA', 'NENHUM', 'COMPLETO', 1, 16, 16, 0, NULL),
('it-11', 'ped-107', 'p3', 'Gás Cilindro P45 (Industrial/Condomínio)', 'GAS', 'P45', 'RECARGA', 1, 460, 460, 1, 1),
('it-12', 'ped-108', 'p1', 'Gás de Cozinha P13 (13kg)', 'GAS', 'P13', 'RECARGA', 1, 110, 110, 1, 1),
('it-13', 'ped-108', 'p7', 'Carvão Vegetal Especial (Saco 3kg)', 'CONVENIENCIA', 'NENHUM', 'COMPLETO', 1, 22, 22, 0, NULL),
('it-14', 'ped-109', 'p2', 'Água Mineral Galão 20L (Fonte Pura)', 'AGUA', 'P20L', 'RECARGA', 2, 14, 28, 2, NULL),
('it-15', 'ped-110', 'p1', 'Gás de Cozinha P13 (13kg)', 'GAS', 'P13', 'RECARGA', 1, 110, 110, 1, 0),
('it-16', 'ped-110', 'p5', 'Refrigerante Coca-Cola 2L Pet Gelada', 'BEBIDAS', 'NENHUM', 'RECARGA', 1, 11.5, 11.5, 0, NULL)
ON CONFLICT (id) DO NOTHING;

