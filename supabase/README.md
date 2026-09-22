# Supabase local

This directory contains the database migrations and Edge Functions consumed by the web contracts in `docs/supabase.md`.

## Local commands

```bash
supabase start
supabase db reset
supabase functions serve --env-file supabase/functions/.env.local
```

Copy `supabase/functions/.env.example` to `supabase/functions/.env.local` and provide only local/test credentials. Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` when functions run locally or hosted.

## Explicit interim rules

The repository still records DEC-01 through DEC-04 as open. This implementation therefore keeps the undecided behavior narrow and visible:

- recurring rule times and public `date` are interpreted in UTC, and the API returns `timezone: "UTC"`;
- each availability interval is returned as a bookable window; no unapproved fixed slot duration is invented;
- a blocking override takes precedence over recurring and extra availability;
- active weekly groups cannot contain overlapping intervals;
- the existing globally unique client email is preserved, with a provider-specific `ProviderClient` snapshot so one provider can never enumerate personal data supplied to another;
- cancellation preserves the appointment with status `CANCELLED`;
- booking confirmation and provider cancellation create deduplicated outbox events; client cancellation email remains disabled until DEC-04 is accepted.

When the decisions are accepted, replace these rules in a new forward-only migration and update this document, `docs/schema.prisma`, and `docs/supabase.md` together.

## Security boundary

- Browser roles receive no direct anonymous table access.
- Provider reads and writes are protected by RLS and `auth.uid()`.
- Public flows use narrowly scoped Edge Functions and server-only RPCs.
- Transaction RPC execution is revoked from `public`, `anon`, and `authenticated`; only `service_role` can call it.
- The service role, JWTs, cancellation tokens, email addresses, and phone numbers are never logged.
- The email worker requires `x-worker-secret`; schedule it from a trusted runner or Supabase Cron/Vault.
