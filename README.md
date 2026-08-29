# FinControl

Aplicación web de control financiero personal.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase Auth · PostgreSQL (RLS) · Zod · Vitest

## Requisitos

- Node.js 20+
- Docker (para Supabase local)

## Configuración

```bash
npm install
npm run db:start
```

Copia las claves de `npx supabase status` a `.env.local` (ver `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Aplica migraciones (incluido en `db:start` / `db:reset`):

```bash
npm run db:reset
```

## Desarrollo

```bash
npm run dev
```

App: http://localhost:3000  
Studio: http://127.0.0.1:55323  
Mailpit (emails): http://127.0.0.1:55324

## Calidad

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Módulos

Auth · Perfil · Cuentas · Movimientos · Categorías · Dashboard · Presupuestos · Metas · Deudas · Recurrentes · Settings

Decisiones de producto/seguridad desviadas respecto a borradores: ver `DECISIONS.md`.
