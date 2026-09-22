# Integração web ↔ Edge Functions

Como o Next.js se comunica com o banco: **não se comunica**. Auth vai para o Supabase Auth; todo o restante vai para Edge Functions, que orquestram Postgres, cache e email.

Contrato das rotas: [supabase.md](./supabase.md). Modelo: [schema.prisma](./schema.prisma). Tarefas: [tasks/](./tasks/).

## Camadas

```text
UI (Client Component ou Server Component)
  → hook da feature (só cliente) ou api da feature (servidor/cliente)
    → invokeFunction
      → supabase.functions.invoke
        → Edge Function
          → Postgres / Redis / Resend
```

```text
app/          rotas Next.js
src/features  um módulo por caso de uso; só index.ts é público
src/lib/api   invoke, erros, fixtures
src/lib/supabase  clientes browser/server e refresh no proxy
src/hooks     useAsyncResource / useAsyncAction (sem domínio)
src/types     envelope, nomes das funções, espelho do Prisma
```

Dependências: `app` → `features` → `lib` / `types`. Features não importam internals umas das outras.

## Clientes

| Onde | Função |
| --- | --- |
| Browser | `createBrowserSupabaseClient()` — singleton, chave anon |
| Server Component / Server Action | `await createServerSupabaseClient()` — cookies (Next.js 16: `cookies()` é async) |
| Borda da request | `proxy.ts` chama `updateSession` para renovar a sessão |

Sem `NEXT_PUBLIC_SUPABASE_*` o proxy não quebra o restante da app.

## Server Component vs hook

Leitura inicial (ex.: agenda pública no SSR):

```ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAvailability } from '@/features/availability';

const supabase = await createServerSupabaseClient();
const result = await getAvailability(supabase, { slug, date });

if (!result.ok) {
  // result.error.code / result.error.requestId
}
```

Interação contínua (troca de data, formulário):

```tsx
'use client';
import { useAvailability } from '@/features/availability';
import { useBookAppointment } from '@/features/booking';

const availability = useAvailability(slug, date);
const booking = useBookAppointment();

if (availability.status === 'empty') { /* nenhum horário */ }
if (booking.isConflict) { availability.refetch(); booking.beginNewAttempt(); }
```

Mutação autenticada de perfil:

```tsx
const { update, isConflict } = useUpdateProfile();
await update({ publicSlug: 'luciane-nails' });
```

Cancelamento autenticado do prestador:

```tsx
import { useProviderCancelAppointment } from '@/features/provider-cancellation';

const { cancel, isIdempotent } = useProviderCancelAppointment();
await cancel(appointmentId);
```

O email de cancelamento (RF-P09) é disparado na Edge Function, não no PWA. Retry da mesma tentativa reenvia a `Idempotency-Key` guardada em `useRef`. O body é só `{ appointmentId }` — não reutilize o token do cliente.

## Mapa método → função → banco

O web nunca executa SQL. A coluna “banco” é o efeito **dentro** da função.

| Uso no web | Função | Auth | Efeito |
| --- | --- | --- | --- |
| `getAvailability` / `useAvailability` | `get-availability` | anon | SELECT regras, exceções, reservas; GET/SET Redis |
| `bookAppointment` / `useBookAppointment` | `book-appointment` | anon + idempotência | transação `Client` + `Appointment`; DEL cache; outbox email |
| `getCancellation` / `useCancellationPreview` | `get-cancellation` | token | SELECT `Appointment` (sem `UPDATE`) |
| `cancelAppointment` / `useCancelAppointment` | `cancel-appointment` | token | `status = CANCELLED`; DEL cache |
| `useSession` / `useSignIn` / `useSignOut` | — | Auth SDK | `auth.users` / sessão |
| `getProfile` / `useProfile` | `get-profile` | JWT | SELECT `profiles` |
| `updateProfile` / `useUpdateProfile` | `update-profile` | JWT | UPDATE `profiles` |
| `useGroups` / `useGroupMutation` | `list/create/update/delete-group`, `set-group-active` | JWT | `AvailabilityRuleGroup` |
| `useRules` / `useRuleMutation` | `*-rules` | JWT | `AvailabilityRule` |
| `useOverrides` / `useOverrideMutation` | `*-overrides` | JWT | `AvailabilityOverride` |
| `useDailyAgenda` | `get-daily-agenda` | JWT | leitura combinada |
| `useClients` | `list-clients` | JWT | `Client` filtrado pelas reservas do prestador |
| `useProviderCancelAppointment` | `cancel-appointment-as-provider` | JWT | `Appointment`; email; cache |

## Estados de UI

`useAsyncResource` (leituras): `idle | pending | success | empty | error`.

`useAsyncAction` (mutações): `idle | pending | success | error`.

Códigos que a UI deve tratar de forma específica:

- `CONFLICT` — recarregar disponibilidade; `useBookAppointment.isConflict`
- `IDEMPOTENT` — mostrar sucesso já aplicado, não novo erro genérico
- `UNAUTHENTICATED` — pedir login de novo
- `NOT_FOUND` no cancelamento por token — mensagem uniforme, sem “token inválido vs inexistente”
- `NOT_FOUND` / `UNAUTHORIZED` no cancelamento autenticado do prestador — mensagem uniforme, sem enumerar se a reserva é de outro prestador

`requestId` pode ir para suporte; corpo de erro nunca deve mostrar token.

## Idempotência

`useBookAppointment`, `useCancelAppointment` e `useProviderCancelAppointment` guardam um UUID em `useRef`. Retry da mesma tentativa reenvia a chave. Depois de um conflito de horário, chame `beginNewAttempt()` (reserva) para não colidir com a tentativa antiga.

## O que nunca fazer

- `PrismaClient` ou `prisma generate` neste app
- `supabase.from('Appointment')` / PostgREST
- `service_role` no bundle
- Confirmar reserva offline ou com cache local
- Cancelar no `GET` de preview
- Reutilizar o token de cancelamento do cliente em `cancel-appointment-as-provider`
- Apagar `Appointment` no browser (`supabase.from` / PostgREST)
- Guardar JWT, token de cancelamento ou PII no service worker
- Importar `features/x/api/...` de outra feature — use o `index.ts`

## Verificação desta camada

- `npm test` — mapper, invoke e features (auth até cancelamento do prestador)
- `npm run test:coverage` — limiar mínimo nas tasks 01 a 10
- `npm run typecheck`, `npm run lint` e `npm run format:check`
- Caminho real no browser só depois que as Edge Functions existirem (US-04 a US-07)
