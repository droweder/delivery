import React, { useState } from 'react';
import { SQL_SCHEMA_POSTGRESQL, SQL_TRIGGER_ESTOQUE, SQL_SCHEMA_SUPABASE_PUSH, SUPABASE_EDGE_FUNCTION_CODE } from '../data/schemaSql';
import {
  Database,
  Code,
  Download,
  Copy,
  Check,
  Smartphone,
  Server,
  Layers,
  Zap,
  ArrowRight,
  ShieldCheck,
  Terminal,
  BellRing,
  Radio,
  Send,
} from 'lucide-react';

export const ArquiteturaSqlDoc: React.FC = () => {
  const [copiadoSql, setCopiadoSql] = useState(false);
  const [copiadoPushSql, setCopiadoPushSql] = useState(false);
  const [copiadoEdgeFunc, setCopiadoEdgeFunc] = useState(false);

  const fullSqlText = SQL_SCHEMA_POSTGRESQL + '\n\n' + SQL_TRIGGER_ESTOQUE + '\n\n' + SQL_SCHEMA_SUPABASE_PUSH;

  const handleCopySql = () => {
    navigator.clipboard.writeText(fullSqlText);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([fullSqlText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schema_disk_entrega_conveniencia_supabase.sql';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">ARQUITETURA</span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Documentação Técnica, Schema SQL & Cache Offline
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Especificação de engenharia para o sistema de entregas de água, gás e bebidas (PWA Offline-First).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySql}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
            >
              {copiadoSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiadoSql ? 'Copiado!' : 'Copiar SQL'}</span>
            </button>

            <button
              onClick={handleDownloadSql}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar .sql</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. DIAGRAMA DE ARQUITETURA OFFLINE-FIRST */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs sm:text-sm font-black text-slate-900">
            1. Fluxo de Arquitetura Offline-First (Service Worker + IndexedDB)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Passo 1 */}
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/80 space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold text-blue-900">
              <span className="px-1.5 py-0.2 rounded bg-blue-200 text-blue-800 text-[9px] font-black">FASE 1</span>
              <span className="text-[11px]">Na Base (Wi-Fi)</span>
            </div>
            <h4 className="font-black text-slate-900 text-xs">Download da Carga de Rotas</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              O celular conecta ao Wi-Fi da loja e consome <code>GET /api/entregador/:id/carga</code>. O
              Service Worker armazena os dados brutos no <strong>IndexedDB local</strong> (pedidos, clientes, GPS Lat/Long,
              itens e trocos).
            </p>
          </div>

          {/* Passo 2 */}
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/80 space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-800 text-[9px] font-black">FASE 2</span>
              <span className="text-[11px]">Na Rua (Sem Sinal)</span>
            </div>
            <h4 className="font-black text-slate-900 text-xs">Operação 100% Offline</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Sem sinal 4G, o app abre Waze/Maps via coordenadas em cache, calcula troco e permite dar baixa na entrega. A
              baixa é gravada instantaneamente no IndexedDB e adicionada a uma <strong>Fila de Sincronização Local</strong>.
            </p>
          </div>

          {/* Passo 3 */}
          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80 space-y-1 text-xs">
            <div className="flex items-center justify-between font-bold text-emerald-900">
              <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800 text-[9px] font-black">FASE 3</span>
              <span className="text-[11px]">Reconexão Automática</span>
            </div>
            <h4 className="font-black text-slate-900 text-xs">Sincronização com o Backend</h4>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Ao detectar sinal de internet ou retornar à base, o listener dispara{' '}
              <code>POST /api/entregador/sincronizar-baixas</code>. O servidor processa os lotes com idempotência, muda o status
              para <em>ENTREGUE</em> e atualiza os vasilhames.
            </p>
          </div>
        </div>
      </div>

      {/* 2. CÓDIGO DA API BACKEND (NODE.JS / EXPRESS OU PYTHON) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              2. Código da API Backend: Carga de Pedidos & Sincronização
            </h3>
          </div>
        </div>

        <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
          <pre>{`// ============================================================================
// ROTAS DO BACKEND (EXPRESS / NODE.JS) - CARGA E SINCRONIZAÇÃO OFFLINE
// ============================================================================

// 1. ROTA DE CARGA OFFLINE: Entregador baixa os pedidos do turno no Wi-Fi
app.get('/api/entregador/:id/carga', async (req, res) => {
  const { id } = req.params;
  
  // Busca pedidos atribuídos e em trânsito com coordenadas GPS
  const pedidosCarga = await db.query(\`
    SELECT p.*, 
           json_build_object('nome', c.nome, 'telefone', c.telefone, 'endereco', c.endereco, 
                             'numero', c.numero, 'bairro', b.nome, 'lat', c.lat, 'lng', c.lng) as cliente,
           json_agg(it.*) as itens
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    JOIN bairros_taxas b ON b.id = c.bairro_id
    LEFT JOIN itens_pedido it ON it.pedido_id = p.id
    WHERE p.entregador_id = $1 AND p.status IN ('EM_ROTA', 'ENTREGUE')
    GROUP BY p.id, c.id, b.nome
  \`, [id]);

  res.json({
    entregadorId: id,
    timestampGeracao: new Date().toISOString(),
    pedidos: pedidosCarga.rows
  });
});

// 2. ROTA DE SINCRONIZAÇÃO EM LOTE: Recebe as ações realizadas offline
app.post('/api/entregador/sincronizar-baixas', async (req, res) => {
  const { entregadorId, itensSincronizacao } = req.body;
  const processados = [];

  for (const item of itensSincronizacao) {
    // A) Checagem de Idempotência
    const jaProcessado = await db.query('SELECT id FROM sync_queue_audit WHERE idempotency_key = $1', [item.idempotencyKey]);
    if (jaProcessado.rowCount > 0) {
      processados.push({ id: item.id, pedidoId: item.pedidoId, status: 'OK' });
      continue;
    }

    // B) Atualização do Pedido para ENTREGUE com os valores reais
    await db.query(\`
      UPDATE pedidos 
      SET status = 'ENTREGUE', 
          forma_pagamento_realizada = $1,
          valor_recebido = $2,
          entregue_em = $3,
          origem_offline = TRUE,
          versao = versao + 1
      WHERE id = $4
    \`, [item.payload.formaPagamentoRealizada, item.payload.valorRecebido, item.timestampOffline, item.pedidoId]);

    // C) Registro de Auditoria da Sincronização
    await db.query(\`
      INSERT INTO sync_queue_audit (id, idempotency_key, entregador_id, pedido_id, tipo_acao, payload_json, timestamp_offline)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    \`, [item.id, item.idempotencyKey, entregadorId, item.pedidoId, item.tipoAcao, JSON.stringify(item.payload), item.timestampOffline]);

    processados.push({ id: item.id, pedidoId: item.pedidoId, status: 'OK' });
  }

  res.json({ sucesso: true, processados });
});`}</pre>
        </div>
      </div>

      {/* 3. SCHEMA SQL COMPLETO DDL COM SEPARAÇÃO DE VASILHAMES */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              3. Schema Completo do Banco de Dados Relacional (SQL DDL)
            </h3>
          </div>
        </div>

        <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 max-h-[380px]">
          <pre>{fullSqlText}</pre>
        </div>
      </div>

      {/* 4. ARQUITETURA SUPABASE PUSH NOTIFICATIONS */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              4. Arquitetura de Notificações Push com Supabase (Realtime, Edge Functions & Web Push)
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
            SUPABASE INTEGRATION
          </span>
        </div>

        {/* Diagrama de Funcionamento Push */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Atribuição no Kanban</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Atendente na base clica em "Despachar". Status do pedido atualiza para <code>EM_ROTA</code> e vincula <code>entregador_id</code>.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
              <span>Trigger SQL & Edge Function</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Postgres Trigger dispara <code>fn_disparar_push_atribuicao_supabase()</code> e invoca a Edge Function via <code>pg_net</code>.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px]">3</span>
              <span>Supabase Realtime & Web Push</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Dispara broadcast no canal <code>entregador-notificacoes:id</code> e envia pacote criptografado Web Push (VAPID) para o Service Worker.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
              <span>Celular do Entregador</span>
            </div>
            <p className="text-[11px] text-slate-600">
              O Service Worker recebe o evento <code>push</code>, toca o chime de áudio, vibra o celular e exibe a notificação com ações rápidas.
            </p>
          </div>
        </div>

        {/* Code Blocks for Edge Function & SQL Trigger */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800">Código Deno da Supabase Edge Function:</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(SUPABASE_EDGE_FUNCTION_CODE);
                setCopiadoEdgeFunc(true);
                setTimeout(() => setCopiadoEdgeFunc(false), 2000);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
            >
              {copiadoEdgeFunc ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiadoEdgeFunc ? 'Copiado!' : 'Copiar Edge Function'}</span>
            </button>
          </div>

          <div className="bg-slate-900 text-blue-300 p-3 rounded-lg font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 max-h-[300px]">
            <pre>{SUPABASE_EDGE_FUNCTION_CODE}</pre>
          </div>
        </div>
      </div>

      {/* 4. MÓDULO GERENCIAL E AUDITORIA DE VENDAS */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs sm:text-sm font-black text-slate-900">
            4. Módulo Gerencial • Auditoria, Correção de Pedidos & Business Intelligence
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              APIs de Correção de Pedidos
            </h4>
            <p className="text-slate-600 text-[11px]">
              Endpoints <code>PUT /api/pedidos/:id</code>, <code>POST /api/pedidos/:id/cancelar</code> e <code>POST /api/pedidos/:id/reabrir</code> com recálculo automático de subtotais, vasilhames esperados, estorno de estoque e trilha de auditoria (versão incremental).
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Conciliação & DRE em Tempo Real
            </h4>
            <p className="text-slate-600 text-[11px]">
              Agregação instantânea de faturamento líquido (mercadorias + fretes - descontos) com conciliação multicanal (PIX, Dinheiro físico, Cartões Débito/Crédito e Contas a Receber Fiado).
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              Analytics & Produtividade
            </h4>
            <p className="text-slate-600 text-[11px]">
              Gráficos de evolução horária, mix por categoria de produto (Gás, Água, Bebidas, Carvão/Gelo), desempenho por bairro de entrega e ranking de produtividade de entregadores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
