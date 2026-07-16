begin;

create or replace function public.create_case_with_configuration(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_case_id uuid;
  actor_id uuid;
begin
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'case payload must be an object';
  end if;

  actor_id := (p_payload->>'actorId')::uuid;
  if not exists (select 1 from public.admin_profiles where user_id = actor_id) then
    raise exception using errcode = '42501', message = 'administrator is not provisioned';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(p_payload->'moduleIds', '[]'::jsonb)) selected(module_id)
    left join public.question_modules module on module.id = selected.module_id::uuid
    where module.id is null or not module.is_active
  ) then
    raise exception using errcode = '23503', message = 'unknown or inactive question module';
  end if;

  insert into public.cases (
    case_code,
    business_name,
    industry_key,
    customer_name,
    customer_phone,
    customer_contact_channel,
    customer_intro,
    expected_completion_minutes,
    token_hash,
    token_status,
    status,
    intake_status,
    assigned_admin_id
  )
  values (
    p_payload->>'caseCode',
    p_payload->>'businessName',
    p_payload->>'industryKey',
    nullif(p_payload->>'customerName', ''),
    nullif(p_payload->>'customerPhone', ''),
    nullif(p_payload->>'customerContactChannel', ''),
    p_payload->>'customerIntro',
    (p_payload->>'expectedCompletionMinutes')::integer,
    p_payload->>'tokenHash',
    'active',
    'link_ready',
    'link_ready',
    coalesce((p_payload->>'assignedAdminId')::uuid, actor_id)
  )
  returning id into new_case_id;

  insert into public.case_modules (case_id, module_id, sort_order, configuration)
  select
    new_case_id,
    selected.value::uuid,
    selected.ordinality::integer - 1,
    '{}'::jsonb
  from jsonb_array_elements_text(p_payload->'moduleIds') with ordinality selected(value, ordinality);

  insert into public.case_prefilled_fields (
    case_id,
    field_key,
    field_value,
    source_type,
    source_note,
    customer_can_edit
  )
  select
    new_case_id,
    fact."fieldKey",
    to_jsonb(fact.value),
    fact."sourceType",
    nullif(fact."sourceNote", ''),
    fact."customerCanEdit"
  from jsonb_to_recordset(coalesce(p_payload->'knownFacts', '[]'::jsonb)) as fact(
    "fieldKey" text,
    value text,
    "sourceType" text,
    "sourceNote" text,
    "customerCanEdit" boolean
  );

  insert into public.current_profile_candidates (
    case_id,
    sort_order,
    maps_url,
    displayed_name,
    displayed_address,
    displayed_floor,
    displayed_phone,
    displayed_website,
    displayed_category,
    relation_notes,
    customer_raw_response
  )
  select
    new_case_id,
    profile.ordinality::integer - 1,
    nullif(profile.item->>'mapsUrl', ''),
    profile.item->>'displayedName',
    nullif(profile.item->>'displayedAddress', ''),
    nullif(profile.item->>'displayedFloor', ''),
    nullif(profile.item->>'displayedPhone', ''),
    nullif(profile.item->>'displayedWebsite', ''),
    nullif(profile.item->>'displayedCategory', ''),
    nullif(profile.item->>'relationNotes', ''),
    profile.item
  from jsonb_array_elements(coalesce(p_payload->'profileCandidates', '[]'::jsonb))
    with ordinality profile(item, ordinality);

  insert into public.case_custom_questions (
    case_id,
    section_key,
    question_key,
    label,
    help_text,
    question_type,
    choices,
    required,
    conditional_logic,
    sort_order
  )
  select
    new_case_id,
    question.item->>'sectionKey',
    question.item->>'questionKey',
    question.item->>'label',
    nullif(question.item->>'helpText', ''),
    question.item->>'questionType',
    coalesce(question.item->'choices', '[]'::jsonb),
    coalesce((question.item->>'required')::boolean, false),
    coalesce(question.item->'conditionalLogic', '{}'::jsonb),
    question.ordinality::integer - 1
  from jsonb_array_elements(coalesce(p_payload->'customQuestions', '[]'::jsonb))
    with ordinality question(item, ordinality);

  insert into public.case_requested_evidence (
    case_id,
    evidence_category,
    label,
    help_text,
    required,
    sort_order
  )
  select
    new_case_id,
    evidence.item->>'evidenceCategory',
    evidence.item->>'label',
    nullif(evidence.item->>'helpText', ''),
    coalesce((evidence.item->>'required')::boolean, false),
    evidence.ordinality::integer - 1
  from jsonb_array_elements(coalesce(p_payload->'requestedEvidence', '[]'::jsonb))
    with ordinality evidence(item, ordinality);

  insert into public.case_activity_log (case_id, actor_type, actor_id, action, metadata)
  values (
    new_case_id,
    'admin',
    actor_id,
    'case_created',
    jsonb_build_object(
      'module_count', jsonb_array_length(p_payload->'moduleIds'),
      'prefilled_fact_count', jsonb_array_length(coalesce(p_payload->'knownFacts', '[]'::jsonb)),
      'profile_candidate_count', jsonb_array_length(coalesce(p_payload->'profileCandidates', '[]'::jsonb))
    )
  );

  return new_case_id;
end;
$$;

revoke all on function public.create_case_with_configuration(jsonb) from public, anon, authenticated;
grant execute on function public.create_case_with_configuration(jsonb) to service_role;

comment on function public.create_case_with_configuration(jsonb)
is 'Creates a case and all administrator-selected configuration atomically. Called only after server-side Zod and administrator checks.';

commit;
