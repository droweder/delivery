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
    cidade VARCHAR(100),
    estado VARCHAR(2),
    endereco TEXT,
    plano VARCHAR(20) NOT NULL DEFAULT 'BASICO',
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    limite_usuarios INT NOT NULL DEFAULT 5,
    limite_pedidos_mes INT NOT NULL DEFAULT 1000,
    valor_mensalidade NUMERIC(10,2) NOT NULL DEFAULT 99.00,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMPTZ
);

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

-- Força a adição da coluna caso a tabela já existisse antes de rodar este script
ALTER TABLE delivery.usuarios ADD COLUMN IF NOT EXISTS entregador_id_vinculado VARCHAR(36);

-- 2.3 BAIRROS DE ATENDIMENTO
CREATE TABLE IF NOT EXISTS delivery.bairros_taxas (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    taxa NUMERIC(10,2),
    prazo_estimado INT,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO'
);

-- 2.4 PRODUTOS E PRECIFICAÇÃO
CREATE TABLE IF NOT EXISTS delivery.produtos (
    id VARCHAR(36) PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    marca VARCHAR(100),
    unidade_medida VARCHAR(20),
    categoria VARCHAR(50) NOT NULL,
    tipo_vasilhame VARCHAR(30) NOT NULL,
    preco_recarga NUMERIC(10,2) NOT NULL DEFAULT 0,
    preco_completo NUMERIC(10,2) NOT NULL DEFAULT 0,
    preco NUMERIC(10,2),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    estoque_atual INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 10
);

-- 2.5 CLIENTES
CREATE TABLE IF NOT EXISTS delivery.clientes (
    id VARCHAR(36) PRIMARY KEY,
    cpf_cnpj VARCHAR(20),
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    cep VARCHAR(10),
    endereco TEXT NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro_id VARCHAR(36) REFERENCES delivery.bairros_taxas(id) ON DELETE SET NULL,
    bairro_nome VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    referencia TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'ATIVO'
);

-- 2.6 ENTREGADORES E FROTAS
CREATE TABLE IF NOT EXISTS delivery.entregadores (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    veiculo VARCHAR(100) NOT NULL,
    placa VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2.7 PEDIDOS (A BASE DO SISTEMA)
CREATE TABLE IF NOT EXISTS delivery.pedidos (
    id VARCHAR(36) PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    cliente_id VARCHAR(36) REFERENCES delivery.clientes(id) ON DELETE RESTRICT,
    entregador_id VARCHAR(36) REFERENCES delivery.entregadores(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    subtotal NUMERIC(10,2) NOT NULL,
    taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
    desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,
    forma_pagamento_prevista VARCHAR(50) NOT NULL,
    troco_para NUMERIC(10,2),
    observacoes TEXT,
    emitido_por_id VARCHAR(36),
    emitido_por_nome VARCHAR(150),
    emitido_por_perfil VARCHAR(50),
    despachado_por VARCHAR(150),
    devolvido_para_correcao BOOLEAN DEFAULT FALSE,
    motivo_devolucao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    despachado_em TIMESTAMPTZ,
    entregue_em TIMESTAMPTZ,
    concluido_em TIMESTAMPTZ,
    devolvido_em TIMESTAMPTZ,
    sincronizado BOOLEAN DEFAULT TRUE,
    versao INT DEFAULT 1
);

-- 2.8 ITENS DO PEDIDO (JSON ou RELACIONAL)
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
    estoque_anterior INT NOT NULL,
    estoque_atual INT NOT NULL,
    pedido_id VARCHAR(36),
    usuario_responsavel VARCHAR(150),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
