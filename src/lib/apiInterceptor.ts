// Interceptor transparente para requisições fetch da API (Injeção de JWT e Headers de Contexto)
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Apenas intercepta chamadas para rotas internas /api/
    if (url.startsWith('/api/') || url.includes('/api/')) {
      const token = localStorage.getItem('delivery_auth_token');
      const empresaSalva = localStorage.getItem('delivery_auth_empresa');
      const userSalvo = localStorage.getItem('delivery_auth_user');

      let empresaId: string | null = null;
      let userId: string | null = null;

      if (empresaSalva) {
        try {
          const emp = JSON.parse(empresaSalva);
          empresaId = emp.id;
        } catch (e) {}
      }

      if (userSalvo) {
        try {
          const u = JSON.parse(userSalvo);
          userId = u.id;
        } catch (e) {}
      }

      const headers = new Headers(init?.headers || {});

      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (empresaId && !headers.has('x-empresa-id')) {
        headers.set('x-empresa-id', empresaId);
      }
      if (userId && !headers.has('x-user-id')) {
        headers.set('x-user-id', userId);
      }

      const modifiedInit: RequestInit = {
        ...init,
        headers,
      };

      const response = await originalFetch(input, modifiedInit);

      if (response.status === 401 && !url.includes('/api/auth/login')) {
        console.warn('[AuthInterceptor] Sessão não autorizada ou expirada (401).');
      }

      return response;
    }

    return originalFetch(input, init);
  };
}

export {};
