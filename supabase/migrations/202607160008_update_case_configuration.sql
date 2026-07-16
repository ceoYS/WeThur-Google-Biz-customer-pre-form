begin;

create or replace function public.update_case_configuration(
  p_case_id uuid,
  p_payload jsonb,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_case public.cases%rowtype;
  candidate jsonb;
  candidate_id uuid;
  retained_candidate_ids uuid[] := '{}'::uuid[];
begin
  if jsonb_typeof(p_payload) <> 'object'
     or not exists (select 1 from public.admin_profiles where user_id = p_actor_id) then
    raise exception using errcode = '42501', message = 'invalid_configuration_update';
  end if;

  select * into target_case from public.cases where id = p_case_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'case_not_found';
  end if;
  if target_case.intake_status not in ('link_ready', 'draft') then
    raise exception using errcode = 'P0001', message = 'configuration_locked';
  end if;
  if exists (
    select 1
    from jsonb_array_elements_text(p_payload->'moduleIds') selected(module_id)
    left join public.question_modules module on module.id = selected.module_id::uuid
    where module.id is null or not module.is_active
  ) then
    raise exception using errcode = '23503', message = 'unknown_or_inactive_module';
  end if;

  update public.cases
  set business_name = p_payload->>'businessName',
      industry_key = p_payload->>'industryKey',
      customer_name = nullif(p_payload->>'customerName', ''),
      customer_phone = nullif(p_payload->>'customerPhone', ''),
      customer_contact_channel = nullif(p_payload->>'customerContactChannel', ''),
      customer_intro = p_payload->>'customerIntro',
      expected_completion_minutes = (p_payload->>'expectedCompletionMinutes')::integer,
      assigned_admin_id = coalesce((p_payload->>'assignedAdminId')::uuid, p_actor_id)
  where id = p_case_id;

  delete from public.case_modules where case_id = p_case_id;
  insert into public.case_modules (case_id, module_id, sort_order, configuration)
  select p_case_id, selected.value::uuid, selected.ordinality::integer - 1, '{}'::jsonb
  from jsonb_array_elements_text(p_payload->'moduleIds') with ordinality selected(value, ordinality);

  delete from public.case_prefilled_fields where case_id = p_case_id;
  insert into public.case_prefilled_fields (case_id, field_key, field_value, source_type, source_note, customer_can_edit)
  select p_case_id, fact."fieldKey", to_jsonb(fact.value), fact."sourceType", nullif(fact."sourceNote", ''), fact."customerCanEdit"
  from jsonb_to_recordset(coalesce(p_payload->'knownFacts', '[]'::jsonb)) as fact(
    "fieldKey" text,
    value text,
    "sourceType" text,
    "sourceNote" text,
    "customerCanEdit" boolean
  );

  delete from public.current_profile_candidates existing
  where existing.case_id = p_case_id
    and existing.customer_client_id is null
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload->'profileCandidates', '[]'::jsonb)) candidate_item
      where nullif(candidate_item->>'existingId', '')::uuid = existing.id
    );

  for candidate in select value from jsonb_array_elements(coalesce(p_payload->'profileCandidates', '[]'::jsonb))
  loop
    candidate_id := nullif(candidate->>'existingId', '')::uuid;
    if candidate_id is not null and exists (
      select 1 from public.current_profile_candidates
      where id = candidate_id and case_id = p_case_id and customer_client_id is null
    ) then
      update public.current_profile_candidates
      set maps_url = nullif(candidate->>'mapsUrl', ''),
          displayed_name = candidate->>'displayedName',
          displayed_address = nullif(candidate->>'displayedAddress', ''),
          displayed_floor = nullif(candidate->>'displayedFloor', ''),
          displayed_phone = nullif(candidate->>'displayedPhone', ''),
          displayed_website = nullif(candidate->>'displayedWebsite', ''),
          displayed_category = nullif(candidate->>'displayedCategory', ''),
          relation_notes = nullif(candidate->>'relationNotes', '')
      where id = candidate_id;
    else
      insert into public.current_profile_candidates (
        case_id, sort_order, maps_url, displayed_name, displayed_address,
        displayed_floor, displayed_phone, displayed_website, displayed_category,
        relation_notes, customer_raw_response
      ) values (
        p_case_id,
        coalesce(array_length(retained_candidate_ids, 1), 0),
        nullif(candidate->>'mapsUrl', ''),
        candidate->>'displayedName',
        nullif(candidate->>'displayedAddress', ''),
        nullif(candidate->>'displayedFloor', ''),
        nullif(candidate->>'displayedPhone', ''),
        nullif(candidate->>'displayedWebsite', ''),
        nullif(candidate->>'displayedCategory', ''),
        nullif(candidate->>'relationNotes', ''),
        candidate
      ) returning id into candidate_id;
    end if;
    retained_candidate_ids := array_append(retained_candidate_ids, candidate_id);
  end loop;

  delete from public.current_profile_candidates
  where case_id = p_case_id
    and customer_client_id is null
    and not (id = any(retained_candidate_ids));

  with ordered as (
    select id, row_number() over (order by array_position(retained_candidate_ids, id)) - 1 as new_order
    from public.current_profile_candidates
    where case_id = p_case_id and id = any(retained_candidate_ids)
  )
  update public.current_profile_candidates profile
  set sort_order = ordered.new_order
  from ordered where profile.id = ordered.id;

  delete from public.case_custom_questions where case_id = p_case_id;
  insert into public.case_custom_questions (
    case_id, section_key, question_key, label, help_text, question_type,
    choices, required, conditional_logic, sort_order
  )
  select p_case_id, item->>'sectionKey', item->>'questionKey', item->>'label',
    nullif(item->>'helpText', ''), item->>'questionType', coalesce(item->'choices', '[]'::jsonb),
    coalesce((item->>'required')::boolean, false), coalesce(item->'conditionalLogic', '{}'::jsonb),
    ordinality::integer - 1
  from jsonb_array_elements(coalesce(p_payload->'customQuestions', '[]'::jsonb)) with ordinality question(item, ordinality);

  delete from public.case_requested_evidence where case_id = p_case_id;
  insert into public.case_requested_evidence (case_id, evidence_category, label, help_text, required, sort_order)
  select p_case_id, item->>'evidenceCategory', item->>'label', nullif(item->>'helpText', ''),
    coalesce((item->>'required')::boolean, false), ordinality::integer - 1
  from jsonb_array_elements(coalesce(p_payload->'requestedEvidence', '[]'::jsonb)) with ordinality evidence(item, ordinality);

  insert into public.case_activity_log (case_id, actor_type, actor_id, action, metadata)
  values (p_case_id, 'admin', p_actor_id, 'case_configuration_updated', jsonb_build_object('module_count', jsonb_array_length(p_payload->'moduleIds')));

  return p_case_id;
end;
$$;

revoke all on function public.update_case_configuration(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.update_case_configuration(uuid, jsonb, uuid) to service_role;

commit;
