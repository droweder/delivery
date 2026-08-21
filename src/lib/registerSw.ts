export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registrado com sucesso no escopo:', registration.scope);
        })
        .catch((err) => {
          console.log('Falha ao registrar ServiceWorker:', err);
        });
    });
  }
}
