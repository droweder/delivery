# Regras do Projeto (Delivery & Conveniência)

## Stack Tecnológico
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Framer Motion (motion), Recharts.
- **Backend**: Express (Node.js) via `server.ts` rodando na mesma porta (3000) usando TSX no dev e ESBuild no build.
- **Banco de Dados**: Supabase (PostgreSQL) usando `@supabase/supabase-js`. 
- **APIs de Terceiros**: Google Maps Platform (`@vis.gl/react-google-maps`) para o mapa de localização. Notificações Web Push via `web-push`.

## Arquitetura
- **Monolito / Full-Stack**: Frontend e Backend habitam o mesmo repositório e são servidos pelo Express em produção (`dist/server.cjs`). Em dev, o Express utiliza o middleware do Vite para HMR.
- **Supabase Multi-Tenant**: O sistema possui empresas, entregadores, usuários e clientes. O Supabase é acessado via backend com a `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS) e no frontend para realtime/push.

## Padrões de Código
- **Estilo Visual**: Estilo moderno, responsivo, sem scrollbars desnecessárias, interface focada em dashboards e PDV otimizado (desktop-first para o hub, mobile-first para app do entregador).
- **Sem Dados Mockados no Código**: Dados sempre fluem do banco de dados e devem usar o in-memory falback temporário apenas se o banco não estiver acessível, mas a estrutura padrão exige persistência no Supabase.
- **Componentização**: Tudo na pasta `src/components`, dividindo lógicas complexas em componentes menores.

## Banco de Dados
- Todos os arquivos e scripts DDL estão armazenados na pasta `supabase/` (`schema.sql`, `seed.sql`, `rls_policies.sql`).
