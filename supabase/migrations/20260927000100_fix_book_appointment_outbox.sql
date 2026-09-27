create or replace function public.book_appointment(
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
  v_appointment_id uuid;
  result jsonb;
  has_rule boolean;
  has_extra boolean;
  has_block boolean;
  provider_timezone text;
  local_start timestamp;
  local_end timestamp;
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

  select timezone into provider_timezone
  from public.profiles
  where id = p_provider_id;

  if provider_timezone is null then
    return jsonb_build_object('kind', 'not_found');
  end if;

  local_start := p_start at time zone provider_timezone;
  local_end := p_end at time zone provider_timezone;

  if p_start <= now()
    or p_end <> p_start + interval '1 hour'
    or local_start::date <> (local_end - interval '1 microsecond')::date
  then
    return jsonb_build_object('kind', 'validation');
  end if;

  select exists (
    select 1
    from public."AvailabilityRule" as rule
    join public."AvailabilityRuleGroup" as rule_group on rule_group.id = rule.group_id
    where rule_group.provider_id = p_provider_id
      and rule_group.is_active
      and rule.day_of_week = extract(isodow from local_start)::integer
      and rule.start_time <= local_start::time
      and rule.end_time >= local_end::time
      and mod(
        extract(epoch from (local_start::time - rule.start_time))::bigint,
        3600
      ) = 0
  ) into has_rule;

  select exists (
    select 1 from public."AvailabilityOverride"
    where provider_id = p_provider_id
      and is_available
      and start_datetime <= p_start
      and end_datetime >= p_end
      and mod(extract(epoch from (p_start - start_datetime))::bigint, 3600) = 0
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

  insert into public."ProviderClient" (provider_id, client_id, name, email, phone)
  values (
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
    ) returning id into v_appointment_id;
  exception
    when exclusion_violation then
      return jsonb_build_object('kind', 'conflict');
  end;

  insert into public.email_outbox (event_type, appointment_id)
  values ('BOOKING_CONFIRMED', v_appointment_id)
  on conflict (event_type, appointment_id) do nothing;

  result := jsonb_build_object(
    'kind', 'created',
    'appointmentId', v_appointment_id,
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
