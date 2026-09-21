create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create type public.appointment_status as enum ('CONFIRMED', 'CANCELLED');
create type public.email_outbox_status as enum ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
create type public.email_event_type as enum ('BOOKING_CONFIRMED', 'PROVIDER_CANCELLED');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  public_slug text not null unique
    check (public_slug = lower(public_slug))
    check (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    check (char_length(public_slug) between 3 and 80),
  phone text check (phone is null or char_length(btrim(phone)) between 7 and 30),
  updated_at timestamptz not null default now()
);

create table public."AvailabilityRuleGroup" (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  is_active boolean not null default false
);

create table public."AvailabilityRule" (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public."AvailabilityRuleGroup" (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  constraint availability_rule_valid_interval check (start_time < end_time),
  constraint availability_rule_unique_start unique (group_id, day_of_week, start_time)
);

create table public."Client" (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null unique
    check (email = lower(btrim(email)))
    check (char_length(email) between 3 and 254),
  phone text not null check (char_length(btrim(phone)) between 7 and 30)
);

create table public."ProviderClient" (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public."Client" (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null
    check (email = lower(btrim(email)))
    check (char_length(email) between 3 and 254),
  phone text not null check (char_length(btrim(phone)) between 7 and 30),
  constraint provider_client_unique_email unique (provider_id, email),
  constraint provider_client_unique_identity unique (provider_id, client_id)
);

create table public."AvailabilityOverride" (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  is_available boolean not null,
  constraint availability_override_valid_interval check (start_datetime < end_datetime)
);

create table public."Appointment" (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete restrict,
  client_id uuid not null references public."Client" (id) on delete restrict,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  status public.appointment_status not null default 'CONFIRMED',
  cancellation_token uuid not null unique default gen_random_uuid(),
  constraint appointment_valid_interval check (start_datetime < end_datetime),
  constraint appointment_provider_client_fk
    foreign key (provider_id, client_id)
    references public."ProviderClient" (provider_id, client_id)
    on delete restrict
);

alter table public."Appointment"
  add constraint appointment_no_confirmed_overlap
  exclude using gist (
    provider_id with =,
    tstzrange(start_datetime, end_datetime, '[)') with &&
  ) where (status = 'CONFIRMED');

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type public.email_event_type not null,
  appointment_id uuid not null references public."Appointment" (id) on delete cascade,
  status public.email_outbox_status not null default 'PENDING',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint email_outbox_one_event unique (event_type, appointment_id)
);

create table public.idempotency_record (
  operation text not null,
  idempotency_key uuid not null,
  request_hash text not null check (char_length(request_hash) = 64),
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (operation, idempotency_key)
);

create index availability_group_provider_idx
  on public."AvailabilityRuleGroup" (provider_id, is_active);
create index availability_rule_group_day_idx
  on public."AvailabilityRule" (group_id, day_of_week, start_time);
create index availability_override_provider_range_idx
  on public."AvailabilityOverride" using gist (
    provider_id,
    tstzrange(start_datetime, end_datetime, '[)')
  );
create index appointment_provider_start_idx
  on public."Appointment" (provider_id, start_datetime);
create index appointment_client_idx on public."Appointment" (client_id);
create index provider_client_client_idx on public."ProviderClient" (client_id);
create index email_outbox_pending_idx
  on public.email_outbox (available_at, created_at)
  where status in ('PENDING', 'FAILED');
create index idempotency_record_created_idx
  on public.idempotency_record (created_at);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

comment on table public.idempotency_record is
  'Server-only replay protection. Rows may be pruned after the product retention window is approved.';
comment on table public.email_outbox is
  'Server-only notification queue. Payload is resolved from appointment_id to avoid duplicating PII or tokens.';
comment on column public.profiles.public_slug is
  'Canonical lowercase public identifier.';

revoke all on table public.email_outbox from anon, authenticated;
revoke all on table public.idempotency_record from anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
