# Contratos das Edge Functions

Este documento é o contrato da camada web com as [Supabase Edge Functions](https://supabase.com/docs/guides/functions). O PWA **nunca** consulta Postgres, Redis ou Resend. Auth do prestador permanece no [Supabase Auth](https://supabase.com/docs/guides/auth); o restante dos casos de uso passa por `supabase.functions.invoke`.

Nomes em camelCase são o caso de uso. O slug kebab-case é o nome da função no invoke. O transporte do SDK é HTTP para `/functions/v1/<slug>`. Leituras sem efeito colateral usam `method: "GET"` quando o contrato pede GET; mutações usam `POST` ou `PATCH`/`DELETE`.

Fontes: [Diagramas de Sequência](https://app.notion.com/p/2a671eae6a628074a348f35013b7c7dc), [Modelagem de Dados](https://app.notion.com/p/2a671eae6a62803298cee4e54e0ea581), [Requisitos](https://app.notion.com/p/2a671eae6a6280d8b2dac452d06883f2), [STACK.md](../STACK.md).

## Envelope

Toda função devolve JSON neste formato. O cliente web normaliza qualquer desvio para o mesmo `ApiResult`.

```ts
type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: { code: ApiErrorCode; message: string; fieldErrors?: Record<string, string[]>; requestId: string } };

type ApiErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'IDEMPOTENT'
  | 'UNAVAILABLE'
  | 'INTERNAL';
```

Headers enviados pelo web:

- `x-request-id` — UUID gerado no cliente; ecoado na resposta
- `Authorization: Bearer <jwt>` — somente rotas do prestador (o SDK também anexa a sessão)
- `Idempotency-Key` — reserva e cancelamentos

Códigos HTTP esperados: `200`/`201` sucesso, `400` validação, `401` sem sessão, `403` sem autorização, `404` não encontrado (sem enumerar), `409` conflito de horário, `409` com `IDEMPOTENT` quando a operação já havia sido aplicada, `503` dependência indisponível, `500` interno.

Mensagens de erro **não** incluem JWT, `service_role`, token de cancelamento, email ou telefone.

## Funções públicas (anon)

Não exigem sessão. Usam a chave `anon`. Rate limit e CORS ficam no servidor.

### `getAvailability` — `get-availability`

| | |
| --- | --- |
| Auth | pública |
| Método | `GET` |
| Hook | `useAvailability` |
| API | `getAvailability` |
| Invalida cache | não |

**Input**

```ts
{ slug: string; date: string } // date = YYYY-MM-DD no fuso do prestador
```

**Output**

```ts
{
  slug: string;
  date: string;
  timezone: string; // IANA, quando DEC-01 fechar; até lá a função envia o valor usado no cálculo
  slots: Array<{ start: string; end: string }>; // ISO 8601
}
```

Lista vazia é sucesso com `slots: []` (estado de UI `empty`, não `error`).

**Erros:** `VALIDATION`, `NOT_FOUND` (slug inexistente, sem confirmar enumeração extra), `UNAVAILABLE`, `INTERNAL`.

Cache Upstash é detalhe da função, não do hook.

### `bookAppointment` — `book-appointment`

| | |
| --- | --- |
| Auth | pública |
| Método | `POST` |
| Hook | `useBookAppointment` |
| API | `bookAppointment` |
| Invalida cache | sim (servidor, data afetada) |

**Input**

```ts
{
  slug: string;
  start: string;
  end: string;
  client: { name: string; email: string; phone: string };
}
```

Header `Idempotency-Key` obrigatório. Retry da mesma tentativa reenvia a mesma chave.

**Output (201)**

```ts
{
  appointmentId: string;
  start: string;
  end: string;
  status: 'CONFIRMED';
}
```

O `cancellation_token` **não** volta no JSON; vai só no email.

**Erros:** `VALIDATION`, `NOT_FOUND`, `CONFLICT` (horário pego — a UI recarrega disponibilidade), `IDEMPOTENT` (mesma chave já confirmou), `UNAVAILABLE`, `INTERNAL`.

### `getCancellation` — `get-cancellation`

| | |
| --- | --- |
| Auth | portador do token |
| Método | `GET` |
| Hook | `useCancellationPreview` |
| API | `getCancellation` |
| Efeito | nenhum — só confirmação visual |

**Input**

```ts
{ token: string }
```

**Output**

```ts
{
  appointmentId: string;
  start: string;
  end: string;
  status: 'CONFIRMED' | 'CANCELLED';
  providerName: string;
}
```

Não ecoa o token. `NOT_FOUND` é uniforme para token inválido, expirado ou inexistente.

### `cancelAppointment` — `cancel-appointment`

| | |
| --- | --- |
| Auth | portador do token |
| Método | `POST` |
| Hook | `useCancelAppointment` |
| API | `cancelAppointment` |
| Invalida cache | sim |

**Input**

```ts
{ token: string }
```

Header `Idempotency-Key` recomendado. Já cancelado → `ok: true` com `status: 'CANCELLED'` ou `IDEMPOTENT`.

**Output**

```ts
{ appointmentId: string; status: 'CANCELLED' }
```

## Funções do prestador (JWT)

Exigem sessão válida e `auth.uid()` correspondente ao `provider_id` do recurso (`UNAUTHORIZED` se cruzar prestadores).

### Perfil — `get-profile` / `update-profile`

| Caso | Slug | Método | Hook |
| --- | --- | --- | --- |
| Ler | `get-profile` | `GET` | `useProfile` |
| Atualizar | `update-profile` | `PATCH` | `useUpdateProfile` |

**Output / input de atualização**

```ts
{ id: string; name: string; publicSlug: string; phone: string | null; updatedAt: string }
```

Update envia um subconjunto: `name`, `publicSlug`, `phone`. Slug duplicado → `CONFLICT`. Invalida cache se o slug público mudar.

### Grupos — `list-groups` / `create-group` / `update-group` / `delete-group` / `set-group-active`

Hooks: `useGroups`, `useGroupMutation`.

```ts
type RuleGroupDto = { id: string; name: string; isActive: boolean };
```

- `create-group` `POST` `{ name: string }`
- `update-group` `PATCH` `{ id: string; name?: string }`
- `delete-group` `POST` `{ id: string }`
- `set-group-active` `POST` `{ id: string; isActive: boolean }` — ativação conflitante → `CONFLICT`

Escrita em grupo ativo invalida disponibilidade no servidor.

### Regras — `list-rules` / `create-rule` / `update-rule` / `delete-rule`

Hooks: `useRules`, `useRuleMutation`. `list-rules` recebe `{ groupId: string }`.

```ts
type AvailabilityRuleDto = {
  id: string;
  groupId: string;
  dayOfWeek: number; // 1 = segunda … 7 = domingo
  startTime: string; // HH:mm:ss
  endTime: string;
};
```

Intervalo inválido ou duplicata `(groupId, dayOfWeek, startTime)` → `VALIDATION` / `CONFLICT`.

### Exceções — `list-overrides` / `create-override` / `update-override` / `delete-override`

Hooks: `useOverrides`, `useOverrideMutation`.

```ts
type OverrideDto = {
  id: string;
  start: string;
  end: string;
  isAvailable: boolean; // false = bloqueio, true = horário extra
};
```

### Agenda diária — `get-daily-agenda`

Hook: `useDailyAgenda`. Input `{ date: string }`.

```ts
type DailyAgendaDto = {
  date: string;
  slots: Array<{
    start: string;
    end: string;
    state: 'available' | 'booked' | 'blocked';
    appointmentId?: string;
  }>;
};
```

Não inclui token de cancelamento nem PII além do necessário para o cartão do horário ocupado. Dados de cliente da agenda vêm de `list-clients` ou de um campo mínimo `clientName` se a função autenticada o incluir depois; o DTO atual não expõe email.

### Clientes — `list-clients`

Hook: `useClients`. Sem input. Somente clientes com agendamento do prestador autenticado.

```ts
type ClientListItemDto = { id: string; name: string; email: string; phone: string };
```

### Cancelamento do prestador — `cancel-appointment-as-provider`

Hook: `useProviderCancelAppointment`. `POST` `{ appointmentId: string }` + `Idempotency-Key`. Reserva de outro prestador → `NOT_FOUND` ou `UNAUTHORIZED` uniforme. Dispara email no servidor (RF-P09). Invalida cache.

```ts
{ appointmentId: string; status: 'CANCELLED' }
```

## Auth (não é Edge Function)

| Ação | SDK | Hook |
| --- | --- | --- |
| Sessão | `auth.getSession` / `onAuthStateChange` | `useSession` |
| Entrar | `auth.signInWithPassword` / `signInWithOAuth` | `useSignIn` |
| Sair | `auth.signOut` | `useSignOut` |

## Mapa rápido hook → função → efeito no banco

Ver também [integracao.md](./integracao.md).

| Hook / API | Função | Tabelas tocadas (servidor) |
| --- | --- | --- |
| `useAvailability` | `get-availability` | leitura: regras, exceções, reservas; cache Redis |
| `useBookAppointment` | `book-appointment` | `Client`, `Appointment`; invalida cache; outbox de email |
| `useCancellationPreview` | `get-cancellation` | leitura `Appointment` |
| `useCancelAppointment` | `cancel-appointment` | `Appointment.status`; cache |
| `useProfile` / `useUpdateProfile` | `get-profile` / `update-profile` | `profiles` |
| `useGroups` / `useGroupMutation` | `*-groups` / `set-group-active` | `AvailabilityRuleGroup` |
| `useRules` / `useRuleMutation` | `*-rules` | `AvailabilityRule` |
| `useOverrides` / `useOverrideMutation` | `*-overrides` | `AvailabilityOverride` |
| `useDailyAgenda` | `get-daily-agenda` | leitura combinada |
| `useClients` | `list-clients` | `Client` via reservas do prestador |
| `useProviderCancelAppointment` | `cancel-appointment-as-provider` | `Appointment`; email; cache |

## O que este contrato proíbe no web

- `supabase.from('...')` / PostgREST / Prisma Client
- chave `service_role`
- tratar cache de disponibilidade como garantia de reserva
- cancelar em `GET`
- logar token, JWT ou PII
