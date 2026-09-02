import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NotificacaoPush, PrioridadeNotificacao, TipoNotificacaoPush } from '../types';

// ============================================================================
// SUPABASE CLIENT & PUSH NOTIFICATION SYSTEM
// Integração de Notificações Push com Supabase Realtime, Web Push & Audio Chime
// ============================================================================

// Configuração Supabase (Fallback gracioso para ambiente local/demo)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key';

let supabaseClientInstance: any = null;

export function getSupabaseClient(): any {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      db: { schema: 'delivery' },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseClientInstance;
}

// ----------------------------------------------------------------------------
// SINTETIZADOR DE ÁUDIO (Web Audio API) - Alerta Sonoro de Novo Pedido
// Toca um chime cristalino sem necessidade de carregar arquivos .mp3 externos
// ----------------------------------------------------------------------------
export function playPushChime(prioridade: PrioridadeNotificacao = 'NORMAL') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const frequencies =
      prioridade === 'URGENTE'
        ? [659.25, 880.0, 1174.66, 1760.0] // E5 -> A5 -> D6 -> A6 (Fanfarra urgente)
        : [587.33, 880.0, 1174.66]; // D5 -> A5 -> D6 (Chime agradável de pedido)

    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.12);

      gain.gain.setValueAtTime(0, now + index * 0.12);
      gain.gain.linearRampToValueAtTime(0.35, now + index * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 0.4);
    });
  } catch (err) {
    console.warn('Não foi possível tocar som de notificação:', err);
  }
}

// ----------------------------------------------------------------------------
// VIBRAÇÃO DO DISPOSITIVO (Motor háptico de celular)
// ----------------------------------------------------------------------------
export function triggerPushVibration(pattern: number[] = [200, 100, 250, 100, 400]) {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Vibração não suportada pelo navegador:', e);
    }
  }
}

// ----------------------------------------------------------------------------
// SOLICITAR PERMISSÃO DE NOTIFICAÇÕES NATIVAS DO NAVEGADOR
// ----------------------------------------------------------------------------
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Navegador não suporta a API de Notificações');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Erro ao solicitar permissão de push:', err);
    return 'denied';
  }
}

// ----------------------------------------------------------------------------
// EXIBIR NOTIFICAÇÃO NATIVA (Service Worker ou Notification API)
// ----------------------------------------------------------------------------
export async function showNativePushNotification(notificacao: NotificacaoPush) {
  playPushChime(notificacao.prioridade);
  triggerPushVibration(notificacao.prioridade === 'URGENTE' ? [300, 100, 300, 100, 500] : [200, 100, 200]);

  // Se tiver Service Worker registrado, usa a notificação com ações do SW
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await (reg.showNotification as any)(notificacao.titulo, {
          body: notificacao.corpo,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `pedido-${notificacao.pedidoId || Date.now()}`,
          renotify: true,
          requireInteraction: notificacao.prioridade === 'URGENTE',
          data: {
            pedidoId: notificacao.pedidoId,
            url: `/entregador?pedido=${notificacao.pedidoId}`,
          },
          actions: [
            { action: 'abrir', title: '👀 Ver Rota' },
            { action: 'fechar', title: '✕ Dispensar' },
          ],
        });
        return;
      }
    } catch (err) {
      console.warn('Fallback para Notification simples:', err);
    }
  }

  // Fallback para Notification API padrão
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notificacao.titulo, {
      body: notificacao.corpo,
      icon: '/favicon.ico',
      tag: `pedido-${notificacao.pedidoId || Date.now()}`,
    });
  }
}

// ----------------------------------------------------------------------------
// CONVERSÃO DE CHAVE VAPID PARA ARRAY DE BYTES (Padrão W3C Web Push)
// ----------------------------------------------------------------------------
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ----------------------------------------------------------------------------
// INSCREVER DISPOSITIVO NO SERVIÇO DE PUSH DO BACKEND (Supabase + VAPID)
// ----------------------------------------------------------------------------
export async function registerPushDeviceOnServer(entregadorId: string) {
  try {
    let endpoint = `https://supabase.push.gateway/${entregadorId}-${Date.now()}`;
    let p256dh = '';
    let authKey = '';

    // 1. Tenta obter a chave pública VAPID do servidor
    let vapidPublicKey = '';
    try {
      const keyRes = await fetch('/api/push/vapid-public-key');
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        vapidPublicKey = keyData.publicKey;
      }
    } catch (e) {
      console.warn('[Push] Não foi possível obter chave pública VAPID:', e);
    }

    // 2. Registra a PushSubscription nativa no navegador se houver suporte
    if ('serviceWorker' in navigator && 'PushManager' in window && vapidPublicKey) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.pushManager) {
          let sub = await reg.pushManager.getSubscription();
          if (!sub) {
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey as any,
            });
          }

          if (sub) {
            endpoint = sub.endpoint;
            const rawKey = sub.getKey ? sub.getKey('p256dh') : null;
            const rawAuth = sub.getKey ? sub.getKey('auth') : null;
            if (rawKey) {
              p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey))));
            }
            if (rawAuth) {
              authKey = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth))));
            }
            console.log('[Push] Subscription nativa Web Push criada com sucesso:', endpoint);
          }
        }
      } catch (swErr) {
        console.warn('[Push] PushManager nativo não disponível neste contexto:', swErr);
      }
    }

    // 3. Envia os dados da subscrição para o backend e persiste no Supabase
    const res = await fetch('/api/push/inscrever', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entregadorId,
        endpoint,
        p256dh,
        authKey,
        plataforma: 'WEB',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Erro ao registrar token de push no servidor:', err);
  }
  return null;
}

// ----------------------------------------------------------------------------
// OBTER HISTÓRICO DE NOTIFICAÇÕES DO ENTREGADOR
// ----------------------------------------------------------------------------
export async function getHistoricoNotificacoes(entregadorId: string): Promise<NotificacaoPush[]> {
  try {
    const res = await fetch(`/api/push/historico/${entregadorId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Erro ao buscar histórico de notificações:', err);
  }
  return [];
}

// ----------------------------------------------------------------------------
// MARCAR NOTIFICAÇÃO COMO LIDA
// ----------------------------------------------------------------------------
export async function markPushNotificationAsRead(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/push/marcar-lida/${id}`, {
      method: 'POST',
    });
    return res.ok;
  } catch (err) {
    console.error('Erro ao marcar notificação como lida:', err);
    return false;
  }
}
