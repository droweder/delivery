import { FormaPagamento, Pedido, SyncQueueItem, PagamentoItem } from '../types';

const DB_NAME = 'DiskEntregaOfflineDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

// Simulated Network Status for demo/testing purposes
let isSimulatedOffline = false;

export function setSimulatedOffline(offline: boolean) {
  isSimulatedOffline = offline;
  window.dispatchEvent(new CustomEvent('network-status-changed', { detail: { isOffline: offline } }));
}

export function isDeviceOffline(): boolean {
  if (isSimulatedOffline) return true;
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }

    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado neste navegador'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store para Pedidos do Entregador
      if (!db.objectStoreNames.contains('pedidos_entregador')) {
        const pedidosStore = db.createObjectStore('pedidos_entregador', { keyPath: 'id' });
        pedidosStore.createIndex('by_entregador', 'entregadorId', { unique: false });
        pedidosStore.createIndex('by_status', 'status', { unique: false });
      }

      // Store para Fila de Sincronização (Ações Offline)
      if (!db.objectStoreNames.contains('fila_sincronizacao')) {
        const syncStore = db.createObjectStore('fila_sincronizacao', { keyPath: 'id' });
        syncStore.createIndex('by_entregador', 'entregadorId', { unique: false });
      }

      // Store para Catálogo e Metadados
      if (!db.objectStoreNames.contains('meta_cache')) {
        db.createObjectStore('meta_cache', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('Erro ao abrir IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Salva toda a carga de pedidos despachados para o entregador na base local (Wi-Fi da Base)
export async function salvarCargaOffline(entregadorId: string, pedidos: Pedido[]): Promise<void> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['pedidos_entregador', 'meta_cache'], 'readwrite');
    const pedidosStore = tx.objectStore('pedidos_entregador');
    const metaStore = tx.objectStore('meta_cache');

    pedidos.forEach((pedido) => {
      pedidosStore.put(pedido);
    });

    metaStore.put({
      key: `ultima_carga_${entregadorId}`,
      timestamp: new Date().toISOString(),
      qtdPedidos: pedidos.length,
    });

    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('offline-db-updated'));
      resolve();
    };

    tx.onerror = () => reject(tx.error);
  });
}

// Obtém os pedidos locais do entregador armazenados no IndexedDB
export async function obterPedidosEntregadorOffline(entregadorId: string): Promise<Pedido[]> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pedidos_entregador', 'readonly');
    const store = tx.objectStore('pedidos_entregador');
    const index = store.index('by_entregador');
    const request = index.getAll(IDBKeyRange.only(entregadorId));

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => reject(request.error);
  });
}

// Registra baixa de entrega localmente no IndexedDB e adiciona à Fila de Sincronização
export async function darBaixaOffline(
  pedidoId: string,
  entregadorId: string,
  dados: {
    formaPagamentoRealizada: FormaPagamento;
    pagamentosRealizados?: PagamentoItem[];
    valorRecebido: number;
    trocoDevolvido: number;
    vasilhamesRecolhidos: { P13: number; P20L: number };
    vasilhamesPendentes: { P13: number; P20L: number };
    observacaoEntrega?: string;
    latConfirmacao?: number;
    lngConfirmacao?: number;
  }
): Promise<{ sincronizadoImediato: boolean; syncItem: SyncQueueItem }> {
  const db = await initIndexedDB();
  const timestampOffline = new Date().toISOString();
  const idempotencyKey = `sync_${entregadorId}_${pedidoId}_${Date.now()}`;

  const syncItem: SyncQueueItem = {
    id: idempotencyKey,
    idempotencyKey,
    tipoAcao: 'BAIXA_ENTREGA',
    pedidoId,
    entregadorId,
    timestampOffline,
    payload: dados,
    tentativas: 0,
  };

  // 1. Atualizar o pedido no IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['pedidos_entregador', 'fila_sincronizacao'], 'readwrite');
    const pedidosStore = tx.objectStore('pedidos_entregador');
    const syncStore = tx.objectStore('fila_sincronizacao');

    const getReq = pedidosStore.get(pedidoId);
    getReq.onsuccess = () => {
      const pedidoExistente = getReq.result as Pedido | undefined;
      if (pedidoExistente) {
        pedidoExistente.status = 'ENTREGUE';
        pedidoExistente.formaPagamentoRealizada = dados.formaPagamentoRealizada;
        if (dados.pagamentosRealizados && dados.pagamentosRealizados.length > 0) {
          pedidoExistente.pagamentosRealizados = dados.pagamentosRealizados;
        }
        pedidoExistente.valorRecebido = dados.valorRecebido;
        pedidoExistente.entregueEm = timestampOffline;
        pedidoExistente.origemOffline = true;
        pedidoExistente.sincronizado = false;

        // Atualizar vasilhames recolhidos nos itens
        pedidoExistente.itens.forEach((item) => {
          if (item.tipoVasilhame === 'P13') {
            item.vasilhamesRecolhidosReais = dados.vasilhamesRecolhidos.P13;
            item.vasilhamesPendentes = dados.vasilhamesPendentes.P13;
          } else if (item.tipoVasilhame === 'P20L') {
            item.vasilhamesRecolhidosReais = dados.vasilhamesRecolhidos.P20L;
            item.vasilhamesPendentes = dados.vasilhamesPendentes.P20L;
          }
        });

        pedidosStore.put(pedidoExistente);
      }

      // Adicionar à fila de sincronização
      syncStore.put(syncItem);
    };

    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('offline-db-updated'));
      resolve();
    };

    tx.onerror = () => reject(tx.error);
  });

  // 2. Se houver conexão agora, tenta sincronizar imediatamente no backend
  if (!isDeviceOffline()) {
    try {
      const syncResult = await sincronizarFilaComServidor(entregadorId);
      return { sincronizadoImediato: syncResult.sincronizados > 0, syncItem };
    } catch (e) {
      console.warn('Tentativa de sincronização imediata falhou (permanecerá na fila offline):', e);
    }
  }

  return { sincronizadoImediato: false, syncItem };
}

// Obtém a fila pendente de sincronização
export async function obterFilaSyncOffline(entregadorId?: string): Promise<SyncQueueItem[]> {
  const db = await initIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fila_sincronizacao', 'readonly');
    const store = tx.objectStore('fila_sincronizacao');
    const request = store.getAll();

    request.onsuccess = () => {
      const todos = (request.result || []) as SyncQueueItem[];
      if (entregadorId) {
        resolve(todos.filter((item) => item.entregadorId === entregadorId));
      } else {
        resolve(todos);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// Executa a sincronização da fila offline com o servidor backend
export async function sincronizarFilaComServidor(entregadorId: string): Promise<{
  sincronizados: number;
  erros: number;
  detalhes: string[];
}> {
  if (isDeviceOffline()) {
    return { sincronizados: 0, erros: 0, detalhes: ['Dispositivo offline no momento.'] };
  }

  const fila = await obterFilaSyncOffline(entregadorId);
  if (fila.length === 0) {
    return { sincronizados: 0, erros: 0, detalhes: ['Nenhuma pendência na fila de sincronização.'] };
  }

  const db = await initIndexedDB();
  const detalhes: string[] = [];
  let sincronizados = 0;
  let erros = 0;

  try {
    const response = await fetch('/api/entregador/sincronizar-baixas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entregadorId,
        itensSincronizacao: fila,
      }),
    });

    if (!response.ok) {
      throw new Error(`Servidor respondeu com status ${response.status}`);
    }

    const resultado = await response.json();

    // Remover itens sincronizados com sucesso da fila do IndexedDB
    if (resultado.processados && Array.isArray(resultado.processados)) {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['fila_sincronizacao', 'pedidos_entregador'], 'readwrite');
        const syncStore = tx.objectStore('fila_sincronizacao');
        const pedidosStore = tx.objectStore('pedidos_entregador');

        resultado.processados.forEach((itemProcessado: { id: string; pedidoId: string; status: string }) => {
          if (itemProcessado.status === 'OK') {
            syncStore.delete(itemProcessado.id);
            sincronizados++;
            detalhes.push(`Pedido #${itemProcessado.pedidoId} sincronizado com sucesso no servidor.`);

            // Atualiza status no pedido local como sincronizado
            const req = pedidosStore.get(itemProcessado.pedidoId);
            req.onsuccess = () => {
              const p = req.result as Pedido | undefined;
              if (p) {
                p.sincronizado = true;
                pedidosStore.put(p);
              }
            };
          } else {
            erros++;
            detalhes.push(`Erro ao sincronizar pedido #${itemProcessado.pedidoId}`);
          }
        });

        tx.oncomplete = () => {
          window.dispatchEvent(new CustomEvent('offline-db-updated'));
          window.dispatchEvent(new CustomEvent('sync-completed', { detail: { sincronizados, erros } }));
          resolve();
        };

        tx.onerror = () => reject(tx.error);
      });
    }
  } catch (error: any) {
    console.error('Falha na sincronização:', error);
    detalhes.push(`Falha de conexão: ${error.message}`);
    erros = fila.length;
  }

  return { sincronizados, erros, detalhes };
}
