create function public.book_appointment(
  p_provider_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_idempotency_key uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_record public.idempotency_record%rowtype;
  existing_response jsonb;
  normalized_email text := lower(btrim(p_client_email));
  client_id uuid;
  appointment_id uuid;
  result jsonb;
  has_rule boolean;
  has_extra boolean;
  has_block boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('book:' || p_idempotency_key::text, 0));

  select * into existing_record
  from public.idempotency_record
  where operation = 'book_appointment'
    and idempotency_key = p_idempotency_key;

  if found then
    if existing_record.request_hash <> p_request_hash then
      return jsonb_build_object('kind', 'key_conflict');
    end if;
    existing_response := existing_record.response;
    return existing_response || jsonb_build_object('kind', 'idempotent');
  end if;

  if p_start >= p_end
    or (p_start at time zone 'UTC')::date <> ((p_end - interval '1 microsecond') at time zone 'UTC')::date
  then
    return jsonb_build_object('kind', 'validation');
  end if;

  if not exists (select 1 from public.profiles where id = p_provider_id) then
    return jsonb_build_object('kind', 'not_found');
  end if;

  select exists (
    select 1
    from public."AvailabilityRule" as rule
    join public."AvailabilityRuleGroup" as rule_group on rule_group.id = rule.group_id
    where rule_group.provider_id = p_provider_id
      and rule_group.is_active
      and rule.day_of_week = extract(isodow from p_start at time zone 'UTC')::integer
      and rule.start_time <= (p_start at time zone 'UTC')::time
      and rule.end_time >= (p_end at time zone 'UTC')::time
  ) into has_rule;

  select exists (
    select 1 from public."AvailabilityOverride"
    where provider_id = p_provider_id
      and is_available
      and start_datetime <= p_start
      and end_datetime >= p_end
  ) into has_extra;

  select exists (
    select 1 from public."AvailabilityOverride"
    where provider_id = p_provider_id
      and not is_available
      and tstzrange(start_datetime, end_datetime, '[)') && tstzrange(p_start, p_end, '[)')
  ) into has_block;

  if has_block or not (has_rule or has_extra) then
    return jsonb_build_object('kind', 'conflict');
  end if;

  select id into client_id
  from public."Client"
  where email = normalized_email;

  if client_id is null then
    insert into public."Client" (name, email, phone)
    values (btrim(p_client_name), normalized_email, btrim(p_client_phone))
    on conflict (email) do nothing
    returning id into client_id;

    if client_id is null then
      select id into client_id
      from public."Client"
      where email = normalized_email;
    end if;
  end if;

  insert into public."ProviderClient" (
    provider_id,
    client_id,
    name,
    email,
    phone
  ) values (
    p_provider_id,
    client_id,
    btrim(p_client_name),
    normalized_email,
    btrim(p_client_phone)
  )
  on conflict (provider_id, email) do nothing;

  begin
    insert into public."Appointment" (
      provider_id,
      client_id,
      start_datetime,
      end_datetime,
      status
    ) values (
      p_provider_id,
      client_id,
      p_start,
      p_end,
      'CONFIRMED'
    ) returning id into appointment_id;
  exception
    when exclusion_violation then
      return jsonb_build_object('kind', 'conflict');
  end;

  insert into public.email_outbox (event_type, appointment_id)
  values ('BOOKING_CONFIRMED', appointment_id)
  on conflict (event_type, appointment_id) do nothing;

  result := jsonb_build_object(
    'kind', 'created',
    'appointmentId', appointment_id,
    'start', p_start,
    'end', p_end,
    'status', 'CONFIRMED'
  );

  insert into public.idempotency_record (
    operation,
    idempotency_key,
    request_hash,
    response
  ) values (
    'book_appointment',
    p_idempotency_key,
    p_request_hash,
    result
  );

  return result;
end;
$$;

create function public.cancel_appointment_by_token(
  p_token uuid,
  p_idempotency_key uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_record public.idempotency_record%rowtype;
  appointment_record public."Appointment"%rowtype;
  result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('cancel-token:' || p_idempotency_key::text, 0));

  select * into existing_record
  from public.idempotency_record
  where operation = 'cancel_appointment_by_token'
    and idempotency_key = p_idempotency_key;

  if found then
    if existing_record.request_hash <> p_request_hash then
      return jsonb_build_object('kind', 'key_conflict');
    end if;
    return existing_record.response || jsonb_build_object('kind', 'idempotent');
  end if;

  select * into appointment_record
  from public."Appointment"
  where cancellation_token = p_token
  for update;

  if not found then
    return jsonb_build_object('kind', 'not_found');
  end if;

  if appointment_record.status = 'CANCELLED' then
    return jsonb_build_object(
      'kind', 'idempotent',
      'appointmentId', appointment_record.id,
      'status', 'CANCELLED'
    );
  end if;

  update public."Appointment"
  set status = 'CANCELLED'
  where id = appointment_record.id;

  result := jsonb_build_object(
    'kind', 'cancelled',
    'appointmentId', appointment_record.id,
    'status', 'CANCELLED'
  );

  insert into public.idempotency_record (
    operation,
    idempotency_key,
    request_hash,
    response
  ) values (
    'cancel_appointment_by_token',
    p_idempotency_key,
    p_request_hash,
    result
  );

  return result;
end;
$$;

create function public.cancel_appointment_as_provider(
  p_provider_id uuid,
  p_appointment_id uuid,
  p_idempotency_key uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_record public.idempotency_record%rowtype;
  appointment_record public."Appointment"%rowtype;
  result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('cancel-provider:' || p_idempotency_key::text, 0));

  select * into existing_record
  from public.idempotency_record
  where operation = 'cancel_appointment_as_provider'
    and idempotency_key = p_idempotency_key;

  if found then
    if existing_record.request_hash <> p_request_hash then
      return jsonb_build_object('kind', 'key_conflict');
    end if;
    return existing_record.response || jsonb_build_object('kind', 'idempotent');
  end if;

  select * into appointment_record
  from public."Appointment"
  where id = p_appointment_id
    and provider_id = p_provider_id
  for update;

  if not found then
    return jsonb_build_object('kind', 'not_found');
  end if;

  if appointment_record.status = 'CANCELLED' then
    return jsonb_build_object(
      'kind', 'idempotent',
      'appointmentId', appointment_record.id,
      'status', 'CANCELLED'
    );
  end if;

  update public."Appointment"
  set status = 'CANCELLED'
  where id = appointment_record.id;

  insert into public.email_outbox (event_type, appointment_id)
  values ('PROVIDER_CANCELLED', appointment_record.id)
  on conflict (event_type, appointment_id) do nothing;

  result := jsonb_build_object(
    'kind', 'cancelled',
    'appointmentId', appointment_record.id,
    'status', 'CANCELLED'
  );

  insert into public.idempotency_record (
    operation,
    idempotency_key,
    request_hash,
    response
  ) values (
    'cancel_appointment_as_provider',
    p_idempotency_key,
    p_request_hash,
    result
  );

  return result;
end;
$$;

create function public.claim_email_outbox(p_limit integer default 20)
returns setof public.email_outbox
language sql
security invoker
set search_path = ''
as $$
  with candidates as (
    select id
    from public.email_outbox
    where (
      status in ('PENDING', 'FAILED')
      or (status = 'PROCESSING' and locked_at < now() - interval '10 minutes')
    )
      and available_at <= now()
      and attempt_count < 8
    order by created_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  )
  update public.email_outbox as outbox
  set status = 'PROCESSING',
      locked_at = now(),
      attempt_count = attempt_count + 1,
      last_error = null
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
$$;

create function public.complete_email_outbox(
  p_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.email_outbox
  set status = case when p_success then 'SENT'::public.email_outbox_status else 'FAILED'::public.email_outbox_status end,
      sent_at = case when p_success then now() else null end,
      locked_at = null,
      last_error = case when p_success then null else left(coalesce(p_error, 'Falha no envio.'), 500) end,
      available_at = case
        when p_success then available_at
        else now() + make_interval(secs => least(3600, (power(2, least(attempt_count, 10)) * 30)::integer))
      end
  where id = p_id
    and status = 'PROCESSING';
end;
$$;

revoke execute on function public.book_appointment(uuid, timestamptz, timestamptz, text, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_appointment_by_token(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_appointment_as_provider(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_email_outbox(integer) from public, anon, authenticated;
revoke execute on function public.complete_email_outbox(uuid, boolean, text) from public, anon, authenticated;

grant execute on function public.book_appointment(uuid, timestamptz, timestamptz, text, text, text, uuid, text) to service_role;
grant execute on function public.cancel_appointment_by_token(uuid, uuid, text) to service_role;
grant execute on function public.cancel_appointment_as_provider(uuid, uuid, uuid, text) to service_role;
grant execute on function public.claim_email_outbox(integer) to service_role;
grant execute on function public.complete_email_outbox(uuid, boolean, text) to service_role;
