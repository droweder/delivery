// ============================================================================
// SUPABASE POSTGRESQL PRODUCTION DDL SCHEMA (SCHEMA: delivery)
// ============================================================================

export const SQL_SCHEMA_POSTGRESQL = `-- ============================================================================
-- SUPABASE POSTGRESQL PRODUCTION DDL SCHEMA
-- Schema Dedicado: "delivery"
-- Sistema de Gestão de Disk Entrega & Conveniência (Água, Gás e Bebidas)
-- ============================================================================

-- 0. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 1. CRIAÇÃO DO SCHEMA
CREATE SCHEMA IF NOT EXISTS delivery;
SET search_path TO delivery, public;

-- 2. TABELAS PRINCIPAIS (DDL SEM DADOS FICTÍCIOS)

-- 2.1 EMPRESAS / UNIDADES MULTI-TENANT
CREATE TABLE IF NOT EXISTS delivery.empresas (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nome_fantasia VARCHAR(150) NOT NULL,
    razao_social VARCHAR(200),
    cnpj VARCHAR(20),
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    endereco VARCHAR(200),
    numero VARCHAR(20),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    logo_url TEXT,
    cor_tema VARCHAR(20) DEFAULT '#2563eb',
    taxa_entrega_padrao NUMERIC(10,2) NOT NULL DEFAULT 5.00,
    tempo_medio_entrega_min INT NOT NULL DEFAULT 30,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 USUÁRIOS E CONTROLE DE ACESSO RBAC
CREATE TABLE IF NOT EXISTS delivery.usuarios (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE SET NULL,
    nome VARCHAR(150) NOT NULL,
    login VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    senha_hash VARCHAR(255),
    pin_acesso VARCHAR(10),
    perfil VARCHAR(30) NOT NULL DEFAULT 'OPERADOR',
    cargo VARCHAR(100),
    permissoes JSONB NOT NULL DEFAULT '{
        "emitirPedidos": true,
        "despacharPedidos": false,
        "realizarAcertoCaixa": false,
        "ajustarEstoque": false,
        "verDashboardGerencial": false,
        "acessarCadastros": false,
        "gerenciarUsuarios": false
    }'::jsonb,
    entregador_id_vinculado VARCHAR(36),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acesso TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON delivery.usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_login ON delivery.usuarios(login);

-- 2.3 TAXAS DE ENTREGA POR BAIRRO
CREATE TABLE IF NOT EXISTS delivery.bairros_taxas (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tempo_medio_min INT NOT NULL DEFAULT 30,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_bairro_empresa UNIQUE (empresa_id, nome)
);

-- 2.4 CLIENTES (Com Geoposicionamento e Controle de Saldos/Vasilhames)
CREATE TABLE IF NOT EXISTS delivery.clientes (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    cpf_cnpj VARCHAR(20),
    endereco VARCHAR(200) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro_id VARCHAR(36) REFERENCES delivery.bairros_taxas(id) ON DELETE SET NULL,
    bairro_nome VARCHAR(100),
    referencia TEXT,
    lat NUMERIC(10,8) NOT NULL DEFAULT 0.00000000,
    lng NUMERIC(11,8) NOT NULL DEFAULT 0.00000000,
    saldo_devedor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    vasilhames_p13_pendentes INT NOT NULL DEFAULT 0,
    vasilhames_p20l_pendentes INT NOT NULL DEFAULT 0,
    total_pedidos INT NOT NULL DEFAULT 0,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa_tel ON delivery.clientes(empresa_id, telefone);

-- 2.5 PRODUTOS & CONTROLE DE ESTOQUE (CHEIO X VAZIO)
CREATE TABLE IF NOT EXISTS delivery.produtos (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(30) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(30) NOT NULL DEFAULT 'GAS',
    tipo_vasilhame VARCHAR(20) NOT NULL DEFAULT 'NENHUM',
    marca VARCHAR(100),
    unidade_medida VARCHAR(20) NOT NULL DEFAULT 'UN',
    preco_recarga NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    preco_completo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    permite_venda_casco BOOLEAN NOT NULL DEFAULT FALSE,
    estoque_cheio INT NOT NULL DEFAULT 0,
    estoque_vazio INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 5,
    mais_utilizado BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_produto_codigo_empresa UNIQUE (empresa_id, codigo)
);

-- 2.6 ENTREGADORES E FROTA
CREATE TABLE IF NOT EXISTS delivery.entregadores (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    veiculo VARCHAR(80) NOT NULL,
    placa VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL',
    pedidos_ativos_count INT NOT NULL DEFAULT 0,
    bateria_nivel INT DEFAULT 100,
    device_uuid VARCHAR(100),
    ultima_sincronizacao TIMESTAMPTZ,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.7 TABELA CENTRAL DE PEDIDOS
CREATE TABLE IF NOT EXISTS delivery.pedidos (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    codigo_pedido VARCHAR(20) NOT NULL,
    cliente_id VARCHAR(36) REFERENCES delivery.clientes(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(150) NOT NULL,
    cliente_telefone VARCHAR(20) NOT NULL,
    endereco_entrega VARCHAR(250) NOT NULL,
    bairro_id VARCHAR(36) REFERENCES delivery.bairros_taxas(id) ON DELETE SET NULL,
    bairro_nome VARCHAR(100),
    entregador_id VARCHAR(36) REFERENCES delivery.entregadores(id) ON DELETE SET NULL,
    entregador_nome VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    forma_pagamento_prevista VARCHAR(30) NOT NULL DEFAULT 'DINHEIRO',
    troco_para NUMERIC(10,2),
    forma_pagamento_realizada VARCHAR(30),
    valor_recebido NUMERIC(10,2),
    observacoes TEXT,
    motivo_cancelamento TEXT,
    motivo_devolucao TEXT,
    origem_offline BOOLEAN NOT NULL DEFAULT FALSE,
    sincronizado BOOLEAN NOT NULL DEFAULT TRUE,
    versao INT NOT NULL DEFAULT 1,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    despachado_em TIMESTAMPTZ,
    entregue_em TIMESTAMPTZ,
    concluido_em TIMESTAMPTZ,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_pedido_codigo_empresa UNIQUE (empresa_id, codigo_pedido)
);

-- 2.8 ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS delivery.itens_pedido (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pedido_id VARCHAR(36) NOT NULL REFERENCES delivery.pedidos(id) ON DELETE CASCADE,
    produto_id VARCHAR(36) NOT NULL REFERENCES delivery.produtos(id) ON DELETE RESTRICT,
    produto_nome VARCHAR(150) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    tipo_venda VARCHAR(20) NOT NULL DEFAULT 'RECARGA',
    preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    vasilhames_recolhidos_esperados INT NOT NULL DEFAULT 0,
    vasilhames_recolhidos_reais INT DEFAULT 0,
    vasilhames_pendentes INT DEFAULT 0
);

-- 2.9 LIVRO-RAZÃO DE MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS delivery.movimentacoes_estoque (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    produto_id VARCHAR(36) NOT NULL REFERENCES delivery.produtos(id) ON DELETE RESTRICT,
    produto_nome VARCHAR(150) NOT NULL,
    tipo_vasilhame VARCHAR(20) NOT NULL DEFAULT 'NENHUM',
    tipo_movimentacao VARCHAR(40) NOT NULL,
    quantidade_cheio INT NOT NULL DEFAULT 0,
    quantidade_vazio INT NOT NULL DEFAULT 0,
    estoque_cheio_anterior INT NOT NULL DEFAULT 0,
    estoque_cheio_atual INT NOT NULL DEFAULT 0,
    estoque_vazio_anterior INT NOT NULL DEFAULT 0,
    estoque_vazio_atual INT NOT NULL DEFAULT 0,
    pedido_id VARCHAR(36) REFERENCES delivery.pedidos(id) ON DELETE SET NULL,
    pedido_codigo VARCHAR(20),
    entregador_id VARCHAR(36) REFERENCES delivery.entregadores(id) ON DELETE SET NULL,
    entregador_nome VARCHAR(120),
    usuario_responsavel VARCHAR(150) NOT NULL DEFAULT 'Sistema',
    motivo TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.10 FECHAMENTO DE CAIXA DO ENTREGADOR
CREATE TABLE IF NOT EXISTS delivery.fechamentos_caixa_entregador (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    entregador_id VARCHAR(36) NOT NULL REFERENCES delivery.entregadores(id) ON DELETE RESTRICT,
    entregador_nome VARCHAR(120) NOT NULL,
    data_fechamento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pedidos_concluidos_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_pedidos_entregues INT NOT NULL DEFAULT 0,
    total_dinheiro_esperado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_dinheiro_informado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_pix NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_cartao NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_a_prazo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    diferenca_dinheiro NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cascos_p13_recolhidos INT NOT NULL DEFAULT 0,
    cascos_p20l_recolhidos INT NOT NULL DEFAULT 0,
    cascos_p13_pendentes INT NOT NULL DEFAULT 0,
    cascos_p20l_pendentes INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'CONCLUIDO',
    observacoes TEXT,
    usuario_responsavel VARCHAR(150)
);

-- 2.11 WEB PUSH SUBSCRIPTIONS & NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS delivery.entregador_push_subscriptions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entregador_id VARCHAR(36) NOT NULL REFERENCES delivery.entregadores(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT,
    auth_key TEXT,
    plataforma VARCHAR(20) NOT NULL DEFAULT 'WEB',
    user_agent TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery.historico_notificacoes_push (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    entregador_id VARCHAR(36) NOT NULL REFERENCES delivery.entregadores(id) ON DELETE CASCADE,
    pedido_id VARCHAR(36) REFERENCES delivery.pedidos(id) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    corpo TEXT NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'NOVO_PEDIDO',
    prioridade VARCHAR(20) NOT NULL DEFAULT 'ALTA',
    canal VARCHAR(30) NOT NULL DEFAULT 'SUPABASE_REALTIME',
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    payload_json JSONB,
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lida_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS delivery.sync_queue_audit (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    entregador_id VARCHAR(36) REFERENCES delivery.entregadores(id) ON DELETE SET NULL,
    pedido_id VARCHAR(36) REFERENCES delivery.pedidos(id) ON DELETE SET NULL,
    tipo_acao VARCHAR(50) NOT NULL,
    payload_json JSONB NOT NULL,
    timestamp_offline TIMESTAMPTZ NOT NULL,
    timestamp_servidor TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_sync VARCHAR(20) NOT NULL DEFAULT 'PROCESSADO'
);
`;

export const SQL_TRIGGER_ESTOQUE = `-- ============================================================================
-- TRIGGERS DE ATUALIZAÇÃO E INTEGRAÇÃO SUPABASE REALTIME
-- ============================================================================

CREATE OR REPLACE FUNCTION delivery.fn_disparar_push_atribuicao_supabase()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente_nome VARCHAR(150);
    v_cliente_bairro VARCHAR(100);
    v_cliente_endereco VARCHAR(200);
BEGIN
    IF NEW.status = 'EM_ROTA' AND (OLD.status IS NULL OR OLD.status != 'EM_ROTA') AND NEW.entregador_id IS NOT NULL THEN
        SELECT c.nome, c.endereco, COALESCE(b.nome, c.bairro_nome, 'Bairro')
        INTO v_cliente_nome, v_cliente_endereco, v_cliente_bairro
        FROM delivery.clientes c
        LEFT JOIN delivery.bairros_taxas b ON b.id = c.bairro_id
        WHERE c.id = NEW.cliente_id;

        INSERT INTO delivery.historico_notificacoes_push (
            empresa_id,
            entregador_id,
            pedido_id,
            titulo,
            corpo,
            tipo,
            prioridade,
            canal,
            payload_json
        ) VALUES (
            NEW.empresa_id,
            NEW.entregador_id,
            NEW.id,
            '🔔 Novo Pedido ' || NEW.codigo_pedido || ' Atribuído!',
            COALESCE(v_cliente_nome, NEW.cliente_nome) || ' • ' || COALESCE(v_cliente_endereco, NEW.endereco_entrega) || ' • Total: R$ ' || TO_CHAR(NEW.total, 'FM999G990D00'),
            'NOVO_PEDIDO',
            'ALTA',
            'SUPABASE_REALTIME',
            json_build_object(
                'pedido_id', NEW.id,
                'codigo_pedido', NEW.codigo_pedido,
                'total', NEW.total,
                'bairro', v_cliente_bairro
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notificar_atribuicao_pedido ON delivery.pedidos;
CREATE TRIGGER trg_notificar_atribuicao_pedido
AFTER UPDATE OF status, entregador_id ON delivery.pedidos
FOR EACH ROW
EXECUTE FUNCTION delivery.fn_disparar_push_atribuicao_supabase();
`;
