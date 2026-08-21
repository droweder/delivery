export const SQL_SCHEMA_POSTGRESQL = `-- ============================================================================
-- SCHEMA DO BANCO DE DADOS RELACIONAL (POSTGRESQL / MYSQL / SQLITE)
-- SISTEMA DE DISK ENTREGA & CONVENIÊNCIA (ÁGUA, GÁS E BEBIDAS)
-- Arquitetura com Controle de Vasilhames (Cheios x Vazios) e Suporte Offline-First
-- ============================================================================

-- 1. TABELA DE TAXAS DE ENTREGA POR BAIRRO
CREATE TABLE IF NOT EXISTS bairros_taxas (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    taxa_entrega DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tempo_medio_min INT NOT NULL DEFAULT 30,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE CLIENTES (Com coordenadas GPS e histórico)
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    endereco VARCHAR(200) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro_id VARCHAR(36) NOT NULL REFERENCES bairros_taxas(id),
    referencia TEXT,
    lat DECIMAL(10,8) NOT NULL, -- Coordenadas GPS para Waze/Google Maps
    lng DECIMAL(11,8) NOT NULL,
    saldo_devedor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    vasilhames_p13_pendentes INT NOT NULL DEFAULT 0, -- Vasilhames emprestados/fiado
    vasilhames_p20l_pendentes INT NOT NULL DEFAULT 0,
    total_pedidos INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clientes_telefone ON clientes(telefone);

-- 3. TABELA DE PRODUTOS E CONTROLE DE ESTOQUE DE VASILHAMES
CREATE TABLE IF NOT EXISTS produtos (
    id VARCHAR(36) PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(30) NOT NULL, -- 'GAS', 'AGUA', 'BEBIDAS', 'CONVENIENCIA'
    tipo_vasilhame VARCHAR(20) NOT NULL DEFAULT 'NENHUM', -- 'P13', 'P45', 'P20L', 'NENHUM'
    preco_recarga DECIMAL(10,2) NOT NULL,   -- Preço apenas do líquido/gás (troca de casco)
    preco_completo DECIMAL(10,2) NOT NULL,  -- Preço do líquido + compra do casco novo
    estoque_cheio INT NOT NULL DEFAULT 0,   -- Estoque disponível para venda
    estoque_vazio INT NOT NULL DEFAULT 0,   -- Cascos vazios na base para retorno à distribuidora
    estoque_minimo INT NOT NULL DEFAULT 5,
    permite_venda_casco BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE ENTREGADORES
CREATE TABLE IF NOT EXISTS entregadores (
    id VARCHAR(36) PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    veiculo VARCHAR(50) NOT NULL, -- 'Moto 01 (Honda Fan 160)', 'Carro 02 (Fiorino)'
    placa VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL', -- 'DISPONIVEL', 'EM_ROTA', 'FOLGA'
    bateria_nivel INT DEFAULT 100,
    device_uuid VARCHAR(100),
    ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 5. TABELA PRINCIPAL DE PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(36) PRIMARY KEY,
    codigo_pedido VARCHAR(20) NOT NULL UNIQUE, -- Ex: '#1042'
    cliente_id VARCHAR(36) NOT NULL REFERENCES clientes(id),
    entregador_id VARCHAR(36) REFERENCES entregadores(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'EM_ROTA', 'ENTREGUE', 'CONCLUIDO', 'CANCELADO'
    subtotal DECIMAL(10,2) NOT NULL,
    taxa_entrega DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    forma_pagamento_prevista VARCHAR(30) NOT NULL, -- 'DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO', 'A_PRAZO_FIADO'
    troco_para DECIMAL(10,2),
    forma_pagamento_realizada VARCHAR(30),
    valor_recebido DECIMAL(10,2),
    observacoes TEXT,
    origem_offline BOOLEAN NOT NULL DEFAULT FALSE,
    sincronizado BOOLEAN NOT NULL DEFAULT TRUE,
    versao INT NOT NULL DEFAULT 1, -- Controle de concorrência otimista
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    despachado_em TIMESTAMP WITH TIME ZONE,
    entregue_em TIMESTAMP WITH TIME ZONE,
    concluido_em TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_entregador ON pedidos(entregador_id, status);

-- 6. TABELA DE ITENS DO PEDIDO (Separação Líquido vs Casco)
CREATE TABLE IF NOT EXISTS itens_pedido (
    id VARCHAR(36) PRIMARY KEY,
    pedido_id VARCHAR(36) NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id VARCHAR(36) NOT NULL REFERENCES produtos(id),
    quantidade INT NOT NULL,
    tipo_venda VARCHAR(20) NOT NULL, -- 'RECARGA' (exige casco) ou 'COMPLETO' (sem troca)
    preco_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    vasilhames_recolhidos_esperados INT NOT NULL DEFAULT 0,
    vasilhames_recolhidos_reais INT DEFAULT 0,
    vasilhames_pendentes INT DEFAULT 0
);

-- 7. AUDITORIA E HISTÓRICO DE MOVIMENTAÇÃO DE VASILHAMES
CREATE TABLE IF NOT EXISTS movimentacoes_vasilhames (
    id VARCHAR(36) PRIMARY KEY,
    pedido_id VARCHAR(36) REFERENCES pedidos(id),
    entregador_id VARCHAR(36) REFERENCES entregadores(id),
    cliente_id VARCHAR(36) REFERENCES clientes(id),
    tipo_vasilhame VARCHAR(20) NOT NULL, -- 'P13', 'P20L', 'P45'
    qtd_entregue_cheio INT NOT NULL,
    qtd_recolhido_vazio INT NOT NULL,
    qtd_pendente_cliente INT NOT NULL DEFAULT 0,
    data_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. FECHAMENTO DE CAIXA E ACERTO DO ENTREGADOR (Fim de Turno)
CREATE TABLE IF NOT EXISTS fechamentos_caixa_entregador (
    id VARCHAR(36) PRIMARY KEY,
    entregador_id VARCHAR(36) NOT NULL REFERENCES entregadores(id),
    data_fechamento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_pedidos_entregues INT NOT NULL,
    total_dinheiro_esperado DECIMAL(10,2) NOT NULL,
    total_dinheiro_recebido DECIMAL(10,2) NOT NULL,
    total_pix DECIMAL(10,2) NOT NULL,
    total_cartao DECIMAL(10,2) NOT NULL,
    diferenca DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cascos_p13_recolhidos INT NOT NULL DEFAULT 0,
    cascos_p20l_recolhidos INT NOT NULL DEFAULT 0,
    cascos_p13_pendentes INT NOT NULL DEFAULT 0,
    cascos_p20l_pendentes INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'CONCLUIDO',
    observacoes TEXT
);

-- 9. FILA DE AUDITORIA E SINCRONIZAÇÃO OFFLINE (Idempotência e Conflitos)
CREATE TABLE IF NOT EXISTS sync_queue_audit (
    id VARCHAR(36) PRIMARY KEY,
    idempotency_key VARCHAR(100) NOT NULL UNIQUE,
    entregador_id VARCHAR(36) NOT NULL REFERENCES entregadores(id),
    pedido_id VARCHAR(36) NOT NULL REFERENCES pedidos(id),
    tipo_acao VARCHAR(50) NOT NULL,
    payload_json JSONB NOT NULL,
    timestamp_offline TIMESTAMP WITH TIME ZONE NOT NULL,
    timestamp_servidor TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status_sync VARCHAR(20) NOT NULL DEFAULT 'PROCESSADO'
);
`;

export const SQL_TRIGGER_ESTOQUE = `-- TRIGGER SQL AUTOMÁTICO: ATUALIZAÇÃO DE ESTOQUE (CHEIOS X VAZIOS)
-- Quando um pedido é despachado ou entregue, o estoque de cheios diminui
-- e o estoque de cascos vazios aumenta na base.

CREATE OR REPLACE FUNCTION fn_processar_baixa_vasilhames()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'ENTREGUE'
    IF NEW.status = 'ENTREGUE' AND OLD.status != 'ENTREGUE' THEN
        -- Atualiza estoque de vazios recolhidos
        -- Exemplo para botijão P13:
        UPDATE produtos
        SET estoque_cheio = GREATEST(0, estoque_cheio - 1),
            estoque_vazio = estoque_vazio + 1
        WHERE tipo_vasilhame = 'P13';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_baixa_pedido
AFTER UPDATE OF status ON pedidos
FOR EACH ROW
EXECUTE FUNCTION fn_processar_baixa_vasilhames();
`;

export const SQL_SCHEMA_SUPABASE_PUSH = `-- ============================================================================
-- ARQUITETURA SUPABASE PUSH NOTIFICATIONS: SCHEMA, TRIGGERS & WEBHOOKS
-- Sistema de Notificações Push em Tempo Real para Entregadores em Campo
-- ============================================================================

-- 1. TABELA DE SUBSCRIÇÕES PUSH / TOKENS DE DISPOSITIVOS DOS ENTREGADORES
CREATE TABLE IF NOT EXISTS entregador_push_subscriptions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    entregador_id VARCHAR(36) NOT NULL REFERENCES entregadores(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT,
    auth_key TEXT,
    plataforma VARCHAR(20) NOT NULL DEFAULT 'WEB', -- 'WEB', 'ANDROID', 'IOS'
    user_agent TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_push_entregador ON entregador_push_subscriptions(entregador_id);

-- 2. TABELA DE HISTÓRICO DE NOTIFICAÇÕES DISPARADAS
CREATE TABLE IF NOT EXISTS historico_notificacoes_push (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    entregador_id VARCHAR(36) NOT NULL REFERENCES entregadores(id) ON DELETE CASCADE,
    pedido_id VARCHAR(36) REFERENCES pedidos(id) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    corpo TEXT NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'NOVO_PEDIDO', -- 'NOVO_PEDIDO', 'CANCELAMENTO', 'ATUALIZACAO_ROTA', 'URGENTE'
    prioridade VARCHAR(20) NOT NULL DEFAULT 'ALTA',  -- 'NORMAL', 'ALTA', 'URGENTE'
    canal VARCHAR(30) NOT NULL DEFAULT 'SUPABASE_REALTIME', -- 'SUPABASE_REALTIME', 'WEB_PUSH', 'FCM'
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    payload_json JSONB,
    enviado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lida_em TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notif_entregador ON historico_notificacoes_push(entregador_id, lida);

-- 3. TRIGGER POSTGRESQL: DISPARO AUTOMÁTICO DE PUSH AO ATRIBUIR PEDIDO NO DESPACHO
-- Dispara automaticamente quando um pedido muda para 'EM_ROTA' e ganha um entregador_id.
CREATE OR REPLACE FUNCTION fn_disparar_push_atribuicao_supabase()
RETURNS TRIGGER AS $$
DECLARE
    v_cliente_nome VARCHAR(150);
    v_cliente_bairro VARCHAR(100);
    v_cliente_endereco VARCHAR(200);
    v_total_formatado VARCHAR(30);
    v_resumo_itens TEXT;
BEGIN
    -- Se o pedido foi despachado para o entregador (status 'EM_ROTA')
    IF NEW.status = 'EM_ROTA' AND (OLD.status IS NULL OR OLD.status != 'EM_ROTA') AND NEW.entregador_id IS NOT NULL THEN
        -- Busca dados do cliente e bairro
        SELECT c.nome, c.endereco, b.nome
        INTO v_cliente_nome, v_cliente_endereco, v_cliente_bairro
        FROM clientes c
        JOIN bairros_taxas b ON b.id = c.bairro_id
        WHERE c.id = NEW.cliente_id;

        -- 1. Insere log no histórico
        INSERT INTO historico_notificacoes_push (
            entregador_id,
            pedido_id,
            titulo,
            corpo,
            tipo,
            prioridade,
            canal,
            payload_json
        ) VALUES (
            NEW.entregador_id,
            NEW.id,
            '🔔 Novo Pedido ' || NEW.codigo_pedido || ' Atribuído!',
            v_cliente_nome || ' • ' || v_cliente_endereco || ' (' || v_cliente_bairro || ') • Total: R$ ' || TO_CHAR(NEW.total, 'FM999G990D00'),
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

        -- 2. Chama a Supabase Edge Function 'send-push-notification' via pg_net
        PERFORM net.http_post(
            url := 'https://xyzcompany.supabase.co/functions/v1/send-push-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer SUPABASE_SERVICE_ROLE_KEY'
            ),
            body := jsonb_build_object(
                'entregador_id', NEW.entregador_id,
                'pedido_id', NEW.id,
                'titulo', '🔔 Novo Pedido ' || NEW.codigo_pedido || ' Atribuído!',
                'corpo', v_cliente_nome || ' • ' || v_cliente_bairro || ' • R$ ' || TO_CHAR(NEW.total, 'FM999G990D00'),
                'prioridade', 'ALTA'
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notificar_atribuicao_pedido
AFTER UPDATE OF status, entregador_id ON pedidos
FOR EACH ROW
EXECUTE FUNCTION fn_disparar_push_atribuicao_supabase();
`;

export const SUPABASE_EDGE_FUNCTION_CODE = `// ============================================================================
// SUPABASE EDGE FUNCTION: /supabase/functions/send-push-notification/index.ts
// Envio de Notificações Web Push (VAPID) e Supabase Realtime Broadcast
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
  "mailto:contato@lojaconveniencia.com.br",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const { entregador_id, pedido_id, titulo, corpo, prioridade } = await req.json();

  // 1. Enviar Broadcast via Supabase Realtime Channel
  await supabase.channel(\`entregador-notificacoes:\${entregador_id}\`).send({
    type: "broadcast",
    event: "NOVO_PEDIDO",
    payload: {
      pedidoId: pedido_id,
      titulo,
      corpo,
      prioridade: prioridade || "ALTA",
      timestamp: new Date().toISOString()
    }
  });

  // 2. Buscar inscrições Web Push ativas do entregador
  const { data: subscriptions } = await supabase
    .from("entregador_push_subscriptions")
    .select("*")
    .eq("entregador_id", entregador_id)
    .eq("ativo", true);

  // 3. Disparar Web Push para cada dispositivo registrado
  const pushPayload = JSON.stringify({
    title: titulo,
    body: corpo,
    pedidoId: pedido_id,
    prioridade,
    url: "/?tab=entregador"
  });

  if (subscriptions && subscriptions.length > 0) {
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key }
            },
            pushPayload
          );
        } catch (err) {
          console.error("Falha ao enviar push para subscription:", sub.id, err);
        }
      })
    );
  }

  return new Response(JSON.stringify({ sucesso: true, entregador_id }), {
    headers: { "Content-Type": "application/json" }
  });
});
`;
