alter table public.profiles
  add column timezone text not null default 'America/Sao_Paulo'
  check (timezone in (
    'America/Noronha',
    'America/Sao_Paulo',
    'America/Manaus',
    'America/Rio_Branco'
  ));

create or replace function public.save_schedule_group(
  p_group_id uuid,
  p_name text,
  p_rules jsonb,
  p_is_active boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_provider_id uuid := auth.uid();
  v_group_id uuid := p_group_id;
  has_invalid_rule boolean;
  has_internal_conflict boolean;
  has_active_conflict boolean;
  result jsonb;
begin
  if v_provider_id is null then
    return jsonb_build_object('kind', 'unauthenticated');
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 120
    or p_rules is null or jsonb_typeof(p_rules) <> 'array'
    or jsonb_array_length(p_rules) = 0
  then
    return jsonb_build_object('kind', 'validation');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('schedule:' || v_provider_id::text, 0));

  if v_group_id is not null and not exists (
    select 1
    from public."AvailabilityRuleGroup"
    where id = v_group_id and provider_id = v_provider_id
  ) then
    return jsonb_build_object('kind', 'not_found');
  end if;

  with incoming as (
    select
      (item->>'dayOfWeek')::smallint as day_of_week,
      (item->>'startTime')::time as start_time,
      (item->>'endTime')::time as end_time
    from jsonb_array_elements(p_rules) as item
  )
  select exists (
    select 1
    from incoming
    where day_of_week is null
      or start_time is null
      or end_time is null
      or day_of_week not between 1 and 7
      or start_time >= end_time
      or extract(second from start_time) <> 0
      or extract(second from end_time) <> 0
      or extract(minute from start_time)::integer % 30 <> 0
      or extract(minute from end_time)::integer % 30 <> 0
      or extract(epoch from (end_time - start_time))::bigint % 3600 <> 0
  ) into has_invalid_rule;

  if has_invalid_rule then
    return jsonb_build_object('kind', 'validation');
  end if;

  with incoming as (
    select
      row_number() over () as position,
      (item->>'dayOfWeek')::smallint as day_of_week,
      (item->>'startTime')::time as start_time,
      (item->>'endTime')::time as end_time
    from jsonb_array_elements(p_rules) as item
  )
  select exists (
    select 1
    from incoming left_rule
    join incoming right_rule
      on left_rule.position < right_rule.position
      and left_rule.day_of_week = right_rule.day_of_week
      and left_rule.start_time < right_rule.end_time
      and right_rule.start_time < left_rule.end_time
  ) into has_internal_conflict;

  if has_internal_conflict then
    return jsonb_build_object('kind', 'conflict');
  end if;

  if p_is_active then
    with incoming as (
      select
        (item->>'dayOfWeek')::smallint as day_of_week,
        (item->>'startTime')::time as start_time,
        (item->>'endTime')::time as end_time
      from jsonb_array_elements(p_rules) as item
    )
    select exists (
      select 1
      from incoming
      join public."AvailabilityRule" existing_rule
        on existing_rule.day_of_week = incoming.day_of_week
        and incoming.start_time < existing_rule.end_time
        and existing_rule.start_time < incoming.end_time
      join public."AvailabilityRuleGroup" existing_group
        on existing_group.id = existing_rule.group_id
      where existing_group.provider_id = v_provider_id
        and existing_group.is_active
        and (v_group_id is null or existing_group.id <> v_group_id)
    ) into has_active_conflict;

    if has_active_conflict then
      return jsonb_build_object('kind', 'conflict');
    end if;
  end if;

  if v_group_id is null then
    insert into public."AvailabilityRuleGroup" (provider_id, name, is_active)
    values (v_provider_id, btrim(p_name), false)
    returning id into v_group_id;
  end if;

  update public."AvailabilityRuleGroup"
  set name = btrim(p_name), is_active = p_is_active
  where id = v_group_id and provider_id = v_provider_id;

  delete from public."AvailabilityRule" where group_id = v_group_id;

  insert into public."AvailabilityRule" (group_id, day_of_week, start_time, end_time)
  select
    v_group_id,
    (item->>'dayOfWeek')::smallint,
    (item->>'startTime')::time,
    (item->>'endTime')::time
  from jsonb_array_elements(p_rules) as item;

  select jsonb_build_object(
    'kind', 'saved',
    'group', jsonb_build_object(
      'id', saved_group.id,
      'name', saved_group.name,
      'isActive', saved_group.is_active
    ),
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', rule.id,
        'groupId', rule.group_id,
        'dayOfWeek', rule.day_of_week,
        'startTime', rule.start_time,
        'endTime', rule.end_time
      ) order by rule.day_of_week, rule.start_time)
      from public."AvailabilityRule" rule
      where rule.group_id = saved_group.id
    ), '[]'::jsonb)
  ) into result
  from public."AvailabilityRuleGroup" saved_group
  where saved_group.id = v_group_id;

  return result;
exception
  when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow then
    return jsonb_build_object('kind', 'validation');
  when unique_violation or exclusion_violation then
    return jsonb_build_object('kind', 'conflict');
end;
$$;

revoke all on function public.save_schedule_group(uuid, text, jsonb, boolean) from public, anon;
grant execute on function public.save_schedule_group(uuid, text, jsonb, boolean) to authenticated, service_role;

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
  appointment_id uuid;
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
