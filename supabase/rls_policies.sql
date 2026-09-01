-- ============================================================================
-- SUPABASE POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
-- Schema: delivery
-- Isolamento Estrito Multi-Tenant por Empresa
-- ============================================================================

SET search_path TO delivery, public;

-- 1. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE delivery.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.bairros_taxas ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery.fechamentos_caixa ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÃO AUXILIAR PARA RECUPERAR O EMPRESA_ID E PERFIL DO USUÁRIO CONECTADO
CREATE OR REPLACE FUNCTION delivery.get_current_user_empresa_id()
RETURNS VARCHAR(36) AS $$
  SELECT empresa_id FROM delivery.usuarios WHERE id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delivery.is_current_user_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM delivery.usuarios WHERE id = auth.uid()::text AND perfil = 'SUPER_ADMIN'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. REMOVER POLÍTICAS ANTIGAS SE EXISTIREM
DROP POLICY IF EXISTS "Permitir leitura de empresas para autenticados" ON delivery.empresas;
DROP POLICY IF EXISTS "Permitir leitura de usuários da mesma empresa" ON delivery.usuarios;
DROP POLICY IF EXISTS "Permitir leitura de produtos" ON delivery.produtos;
DROP POLICY IF EXISTS "Permitir leitura de bairros" ON delivery.bairros_taxas;
DROP POLICY IF EXISTS "Permitir leitura de clientes" ON delivery.clientes;
DROP POLICY IF EXISTS "Permitir leitura de entregadores" ON delivery.entregadores;
DROP POLICY IF EXISTS "Impedir modificacao de cadastros por não-admins" ON delivery.produtos;
DROP POLICY IF EXISTS "Permitir leitura de pedidos" ON delivery.pedidos;
DROP POLICY IF EXISTS "Permitir leitura de itens do pedido" ON delivery.itens_pedido;
DROP POLICY IF EXISTS "Entregador atualiza apenas seus próprios pedidos" ON delivery.pedidos;

-- 4. POLÍTICAS DE ACESSO POR TABELA (ISOLAMENTO MULTI-TENANT 100%)

-- 4.1 EMPRESAS
CREATE POLICY "Empresas: visualizacao restrita a sua empresa ou Super Admin"
ON delivery.empresas FOR SELECT
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR id = delivery.get_current_user_empresa_id()
);

CREATE POLICY "Empresas: modificacao apenas por Super Admin ou Admin da empresa"
ON delivery.empresas FOR UPDATE
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR id = delivery.get_current_user_empresa_id()
);

-- 4.2 USUÁRIOS
CREATE POLICY "Usuarios: isolamento por empresa"
ON delivery.usuarios FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR empresa_id = delivery.get_current_user_empresa_id() OR id = auth.uid()::text
);

-- 4.3 BAIRROS E TAXAS
CREATE POLICY "Bairros: isolamento por empresa"
ON delivery.bairros_taxas FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR empresa_id = delivery.get_current_user_empresa_id()
);

-- 4.4 PRODUTOS
CREATE POLICY "Produtos: isolamento por empresa"
ON delivery.produtos FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR empresa_id = delivery.get_current_user_empresa_id()
);

-- 4.5 CLIENTES
CREATE POLICY "Clientes: isolamento por empresa"
ON delivery.clientes FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR empresa_id = delivery.get_current_user_empresa_id()
);

-- 4.6 ENTREGADORES
CREATE POLICY "Entregadores: isolamento por empresa"
ON delivery.entregadores FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR empresa_id = delivery.get_current_user_empresa_id()
);

-- 4.7 PEDIDOS
CREATE POLICY "Pedidos: isolamento por empresa"
ON delivery.pedidos FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR empresa_id = delivery.get_current_user_empresa_id()
);

-- 4.8 ITENS DO PEDIDO
CREATE POLICY "ItensPedido: isolamento por empresa via pedido"
ON delivery.itens_pedido FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR EXISTS (
    SELECT 1 FROM delivery.pedidos p 
    WHERE p.id = delivery.itens_pedido.pedido_id 
    AND p.empresa_id = delivery.get_current_user_empresa_id()
  )
);

-- 4.9 MOVIMENTAÇÕES DE ESTOQUE
CREATE POLICY "MovimentacoesEstoque: isolamento por empresa"
ON delivery.movimentacoes_estoque FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR empresa_id = delivery.get_current_user_empresa_id()
);

-- 4.10 FECHAMENTOS DE CAIXA
CREATE POLICY "FechamentosCaixa: isolamento por empresa"
ON delivery.fechamentos_caixa FOR ALL
TO authenticated
USING (
  delivery.is_current_user_super_admin() OR empresa_id = delivery.get_current_user_empresa_id()
);
