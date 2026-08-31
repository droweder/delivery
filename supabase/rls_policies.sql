-- ============================================================================
-- SUPABASE POSTGRESQL ROW LEVEL SECURITY (RLS) RULES
-- Schema: delivery
-- ============================================================================

-- Ativar RLS em todas as tabelas
ALTER TABLE delivery.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.bairros_taxas ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Nota: Como o sistema utiliza a Service Role Key no Backend (Express),
-- o backend já possui acesso irrestrito. Estas regras protegem o acesso
-- caso chaves Anon sejam usadas no Frontend (ex: para Realtime ou Auth direto).

-- ============================================================================
-- 1. POLÍTICAS DE ACESSO - EMPRESAS E USUÁRIOS
-- ============================================================================

-- Usuários podem ler dados de empresas
CREATE POLICY "Permitir leitura de empresas para autenticados" 
ON delivery.empresas FOR SELECT 
TO authenticated 
USING (true);

-- Usuários podem ler apenas usuários da sua própria empresa
CREATE POLICY "Permitir leitura de usuários da mesma empresa" 
ON delivery.usuarios FOR SELECT 
TO authenticated 
USING (
    empresa_id = (SELECT empresa_id FROM delivery.usuarios WHERE id = auth.uid()::text) 
    OR auth.uid()::text IN (SELECT id FROM delivery.usuarios WHERE perfil = 'SUPER_ADMIN')
);

-- ============================================================================
-- 2. POLÍTICAS DE ACESSO - DADOS OPERACIONAIS (Produtos, Bairros, Clientes)
-- ============================================================================

-- Todos autenticados podem ler
CREATE POLICY "Permitir leitura de produtos" ON delivery.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura de bairros" ON delivery.bairros_taxas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura de clientes" ON delivery.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir leitura de entregadores" ON delivery.entregadores FOR SELECT TO authenticated USING (true);

-- Apenas admins/gerentes podem modificar produtos, bairros e entregadores
-- (Isso normalmente será feito via backend, mas caso venha do frontend, a política impede)
CREATE POLICY "Impedir modificacao de cadastros por não-admins" 
ON delivery.produtos FOR ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM delivery.usuarios WHERE id = auth.uid()::text AND perfil IN ('SUPER_ADMIN', 'ADMIN', 'GERENTE'))
);

-- ============================================================================
-- 3. POLÍTICAS DE ACESSO - PEDIDOS E ITENS
-- ============================================================================

-- Usuários e entregadores podem ler pedidos
CREATE POLICY "Permitir leitura de pedidos" 
ON delivery.pedidos FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir leitura de itens do pedido" 
ON delivery.itens_pedido FOR SELECT 
TO authenticated 
USING (true);

-- Entregadores podem atualizar o status dos próprios pedidos atribuídos
CREATE POLICY "Entregador atualiza apenas seus próprios pedidos"
ON delivery.pedidos FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM delivery.usuarios 
        WHERE id = auth.uid()::text 
        AND (
            perfil IN ('SUPER_ADMIN', 'ADMIN', 'GERENTE', 'ATENDENTE_PDV') OR 
            (perfil = 'ENTREGADOR' AND entregador_id_vinculado = delivery.pedidos.entregador_id)
        )
    )
);

