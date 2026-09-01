-- ============================================================================
-- SUPABASE POSTGRESQL PRODUCTION DDL SCHEMA
-- Schema Dedicado: "delivery"
-- Sistema de Gestão de Disk Entrega & Conveniência
-- ============================================================================

-- 0. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CRIAÇÃO DO SCHEMA
CREATE SCHEMA IF NOT EXISTS delivery;
SET search_path TO delivery, public;

-- ============================================================================
-- 1.1 PERMISSÕES DE ACESSO DO POSTGREST (OBRIGATÓRIO NO SUPABASE PARA SCHEMAS PERSONALIZADOS)
-- ============================================================================
GRANT USAGE ON SCHEMA delivery TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA delivery TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA delivery TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA delivery TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA delivery GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA delivery GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA delivery GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ============================================================================
-- 2. TABELAS PRINCIPAIS
-- ============================================================================

-- 2.1 EMPRESAS
CREATE TABLE IF NOT EXISTS delivery.empresas (
    id VARCHAR(36) PRIMARY KEY,
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(150) NOT NULL,
    cnpj VARCHAR(20),
    telefone VARCHAR(20),
    email VARCHAR(150),
    cep VARCHAR(10),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    endereco TEXT,
    numero VARCHAR(20),
    bairro VARCHAR(100),
    complemento VARCHAR(100),
    plano VARCHAR(20) NOT NULL DEFAULT 'BASICO',
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    limite_usuarios INT NOT NULL DEFAULT 5,
    limite_pedidos_mes INT NOT NULL DEFAULT 1000,
    valor_mensalidade NUMERIC(10,2) NOT NULL DEFAULT 99.00,
    observacoes TEXT,
    configuracoes JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMPTZ
);

ALTER TABLE delivery.empresas ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE delivery.empresas ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE delivery.empresas ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE delivery.empresas ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE delivery.empresas ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE delivery.empresas ADD COLUMN IF NOT EXISTS configuracoes JSONB DEFAULT '{}'::jsonb;

-- 2.2 USUÁRIOS E CONTROLE DE ACESSO RBAC
CREATE TABLE IF NOT EXISTS delivery.usuarios (
    id VARCHAR(36) PRIMARY KEY,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    login VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150),
    senha VARCHAR(255),
    telefone VARCHAR(20),
    perfil VARCHAR(30) NOT NULL DEFAULT 'ATENDENTE_PDV',
    cargo VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    pin_acesso VARCHAR(10),
    entregador_id_vinculado VARCHAR(36),
    permissoes JSONB NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMPTZ
);

ALTER TABLE delivery.usuarios ADD COLUMN IF NOT EXISTS entregador_id_vinculado VARCHAR(36);

-- 2.3 BAIRROS E TAXAS DE ENTREGA
CREATE TABLE IF NOT EXISTS delivery.bairros_taxas (
    id VARCHAR(36) PRIMARY KEY,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    taxa NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    taxa_entrega NUMERIC(10,2),
    prazo_estimado INT NOT NULL DEFAULT 25,
    tempo_medio_min INT,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    ativo BOOLEAN DEFAULT TRUE
);

-- 2.4 PRODUTOS E VASILHAMES
CREATE TABLE IF NOT EXISTS delivery.produtos (
    id VARCHAR(36) PRIMARY KEY,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    marca VARCHAR(100),
    unidade_medida VARCHAR(20) NOT NULL DEFAULT 'UN',
    categoria VARCHAR(50) NOT NULL DEFAULT 'GAS',
    tipo_vasilhame VARCHAR(30) NOT NULL DEFAULT 'P13',
    preco_recarga NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    preco_completo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    preco_custo NUMERIC(10,2),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    estoque_atual INT NOT NULL DEFAULT 0,
    estoque_cheio INT DEFAULT 0,
    estoque_vazio INT DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    imagem_url TEXT
);

-- 2.5 CLIENTES
CREATE TABLE IF NOT EXISTS delivery.clientes (
    id VARCHAR(36) PRIMARY KEY,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    cpf_cnpj VARCHAR(20),
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    cep VARCHAR(10),
    endereco VARCHAR(255) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro_id VARCHAR(36),
    bairro_nome VARCHAR(100),
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    referencia TEXT,
    lat NUMERIC(10,7),
    lng NUMERIC(10,7),
    vasilhames_com_cliente JSONB DEFAULT '{"P13": 0, "P20L": 0, "P45": 0}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO'
);

-- 2.6 ENTREGADORES
CREATE TABLE IF NOT EXISTS delivery.entregadores (
    id VARCHAR(36) PRIMARY KEY,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    veiculo VARCHAR(50) NOT NULL,
    placa VARCHAR(20) NOT NULL,
    capacidade_p13 INT NOT NULL DEFAULT 10,
    capacidade_p20l INT NOT NULL DEFAULT 10,
    disponivel BOOLEAN NOT NULL DEFAULT TRUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    lat NUMERIC(10,7),
    lng NUMERIC(10,7),
    ultima_localizacao TIMESTAMPTZ,
    bateria INT,
    status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL',
    chave_pix VARCHAR(100),
    tipo_chave_pix VARCHAR(20),
    comissao_fixa_entrega NUMERIC(10,2) DEFAULT 0.00
);

-- 2.7 PEDIDOS
CREATE TABLE IF NOT EXISTS delivery.pedidos (
    id VARCHAR(36) PRIMARY KEY,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    numero_pedido VARCHAR(50) NOT NULL,
    cliente_id VARCHAR(36) REFERENCES delivery.clientes(id) ON DELETE SET NULL,
    cliente JSONB,
    entregador_id VARCHAR(36) REFERENCES delivery.entregadores(id) ON DELETE SET NULL,
    entregador JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'RECEBIDO',
    origem VARCHAR(30) NOT NULL DEFAULT 'WHATSAPP',
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    forma_pagamento VARCHAR(50) NOT NULL DEFAULT 'DINHEIRO',
    forma_pagamento_prevista VARCHAR(50),
    pagamentos_previstos JSONB DEFAULT '[]'::jsonb,
    forma_pagamento_realizada VARCHAR(50),
    pagamentos_realizados JSONB DEFAULT '[]'::jsonb,
    tipo_entrega VARCHAR(20) NOT NULL DEFAULT 'IMEDIATA',
    data_hora_entrega_agendada TIMESTAMPTZ,
    troco_para NUMERIC(10,2),
    valor_recebido NUMERIC(10,2),
    precisa_troco BOOLEAN NOT NULL DEFAULT FALSE,
    observacoes TEXT,
    tempo_estimado_min INT NOT NULL DEFAULT 30,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    despachado_em TIMESTAMPTZ,
    entregue_em TIMESTAMPTZ,
    cancelado_em TIMESTAMPTZ,
    motivo_cancelamento TEXT
);

ALTER TABLE delivery.pedidos ADD COLUMN IF NOT EXISTS pagamentos_previstos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE delivery.pedidos ADD COLUMN IF NOT EXISTS pagamentos_realizados JSONB DEFAULT '[]'::jsonb;
ALTER TABLE delivery.pedidos ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(20) DEFAULT 'IMEDIATA';
ALTER TABLE delivery.pedidos ADD COLUMN IF NOT EXISTS data_hora_entrega_agendada TIMESTAMPTZ;

-- 2.8 ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS delivery.itens_pedido (
    id VARCHAR(36) PRIMARY KEY,
    pedido_id VARCHAR(36) REFERENCES delivery.pedidos(id) ON DELETE CASCADE,
    produto_id VARCHAR(36) REFERENCES delivery.produtos(id) ON DELETE RESTRICT,
    nome_produto VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    tipo_vasilhame VARCHAR(30) NOT NULL,
    tipo_venda VARCHAR(30) NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    vasilhames_recolhidos_esperados INT NOT NULL DEFAULT 0,
    vasilhames_recolhidos_reais INT
);

-- 2.9 MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS delivery.movimentacoes_estoque (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    produto_id VARCHAR(36) REFERENCES delivery.produtos(id) ON DELETE CASCADE,
    tipo_movimentacao VARCHAR(50) NOT NULL,
    quantidade INT NOT NULL,
    estoque_anterior INT NOT NULL DEFAULT 0,
    estoque_atual INT NOT NULL DEFAULT 0,
    pedido_id VARCHAR(36),
    usuario_responsavel VARCHAR(150),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.10 FECHAMENTOS DE CAIXA
CREATE TABLE IF NOT EXISTS delivery.fechamentos_caixa (
    id VARCHAR(36) PRIMARY KEY,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    entregador_id VARCHAR(36) REFERENCES delivery.entregadores(id) ON DELETE CASCADE,
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ NOT NULL,
    total_entregas INT NOT NULL DEFAULT 0,
    total_dinheiro NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_cartao_credito NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_cartao_debito NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_pix NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_fiado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_geral NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    vasilhames_recolhidos JSONB DEFAULT '{"P13": 0, "P20L": 0, "P45": 0}'::jsonb,
    vasilhames_pendentes JSONB DEFAULT '{"P13": 0, "P20L": 0, "P45": 0}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'FECHADO',
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. REAPLICAÇÃO DE GRANTS APÓS CRIAÇÃO DAS TABELAS
GRANT ALL ON ALL TABLES IN SCHEMA delivery TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA delivery TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA delivery TO anon, authenticated, service_role;
