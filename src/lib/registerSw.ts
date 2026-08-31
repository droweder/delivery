export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker registrado com sucesso no escopo:', registration.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Aviso ao registrar ServiceWorker:', err);
        });
    });
  }
}
