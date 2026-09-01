-- ============================================================================
-- MIGRAÇÃO DE BLINDAGEM MULTI-TENANT POR EMPRESA
-- Schema: delivery
-- ============================================================================

SET search_path TO delivery, public;

-- 1. GARANTE QUE A EMPRESA PADRÃO (emp1) EXISTE
INSERT INTO delivery.empresas (id, razao_social, nome_fantasia, cnpj, telefone, email, cidade, estado, endereco, plano, status)
VALUES ('emp1', 'Disk Gás & Água Express LTDA', 'Disk Entrega & Conveniência Matriz', '12.345.678/0001-90', '(11) 98888-7777', 'contato@diskentrega.com.br', 'São Paulo', 'SP', 'Av. das Nações Unidas, 1000', 'PRO', 'ATIVO')
ON CONFLICT (id) DO NOTHING;

-- 2. ADICIONA COLUNA empresa_id COM FOREIGN KEY E ON DELETE CASCADE EM TODAS AS TABELAS
ALTER TABLE delivery.usuarios 
  ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE;

ALTER TABLE delivery.bairros_taxas 
  ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE;

ALTER TABLE delivery.produtos 
  ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE;

ALTER TABLE delivery.clientes 
  ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE;

ALTER TABLE delivery.entregadores 
  ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE;

ALTER TABLE delivery.pedidos 
  ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE;

ALTER TABLE delivery.movimentacoes_estoque 
  ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE;

-- 3. CRIAÇÃO DA TABELA DE FECHAMENTOS DE CAIXA CASO NÃO EXISTA
CREATE TABLE IF NOT EXISTS delivery.fechamentos_caixa (
    id VARCHAR(36) PRIMARY KEY,
    empresa_id VARCHAR(36) REFERENCES delivery.empresas(id) ON DELETE CASCADE,
    entregador_id VARCHAR(36) REFERENCES delivery.entregadores(id) ON DELETE CASCADE,
    data_inicio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- 4. ATRIBUI empresa_id = 'emp1' PARA TODOS OS REGISTROS EXISTENTES QUE ESTEJAM NULOS
UPDATE delivery.usuarios SET empresa_id = 'emp1' WHERE empresa_id IS NULL AND perfil != 'SUPER_ADMIN';
UPDATE delivery.bairros_taxas SET empresa_id = 'emp1' WHERE empresa_id IS NULL;
UPDATE delivery.produtos SET empresa_id = 'emp1' WHERE empresa_id IS NULL;
UPDATE delivery.clientes SET empresa_id = 'emp1' WHERE empresa_id IS NULL;
UPDATE delivery.entregadores SET empresa_id = 'emp1' WHERE empresa_id IS NULL;
UPDATE delivery.pedidos SET empresa_id = 'emp1' WHERE empresa_id IS NULL;
UPDATE delivery.movimentacoes_estoque SET empresa_id = 'emp1' WHERE empresa_id IS NULL;
UPDATE delivery.fechamentos_caixa SET empresa_id = 'emp1' WHERE empresa_id IS NULL;

-- 5. CRIAÇÃO DE ÍNDICES DE PERFORMANCE E ISOLAMENTO POR EMPRESA
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON delivery.usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_bairros_empresa ON delivery.bairros_taxas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_empresa ON delivery.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON delivery.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_entregadores_empresa ON delivery.entregadores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON delivery.pedidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_empresa ON delivery.movimentacoes_estoque(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fechamentos_empresa ON delivery.fechamentos_caixa(empresa_id);

-- 6. REATUALIZAÇÃO DE GRANTS E NOTIFICAÇÃO DO POSTGREST
GRANT ALL ON ALL TABLES IN SCHEMA delivery TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA delivery TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA delivery TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA delivery GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA delivery GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA delivery GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
