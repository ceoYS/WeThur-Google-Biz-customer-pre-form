begin;

alter table public.history_events
  add column customer_client_id uuid;
alter table public.current_profile_candidates
  add column customer_client_id uuid;
alter table public.case_evidence
  add column customer_link_type text,
  add column customer_link_client_id uuid;

create unique index history_events_case_client_unique
  on public.history_events (case_id, customer_client_id)
  where customer_client_id is not null;
create unique index profile_candidates_case_client_unique
  on public.current_profile_candidates (case_id, customer_client_id)
  where customer_client_id is not null;
create index case_evidence_client_link_idx
  on public.case_evidence (case_id, customer_link_type, customer_link_client_id)
  where customer_link_client_id is not null;

alter table public.case_evidence
  add constraint case_evidence_customer_link_check check (
    (customer_link_type is null and customer_link_client_id is null)
    or (customer_link_type in ('history_event', 'profile_candidate') and customer_link_client_id is not null)
  );

create or replace function public.save_case_intake_draft(
  p_token_hash text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_case public.cases%rowtype;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_intake_payload';
  end if;

  select * into target_case
  from public.cases
  where token_hash = p_token_hash and token_status = 'active'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_token';
  end if;
  if target_case.intake_status = 'submitted' then
    raise exception using errcode = 'P0001', message = 'already_submitted';
  end if;

  insert into public.case_intake_responses (
    case_id,
    schema_version,
    draft_payload,
    draft_saved_at
  )
  values (
    target_case.id,
    coalesce((p_payload->>'schemaVersion')::integer, 1),
    p_payload,
    now()
  )
  on conflict (case_id) do update
  set schema_version = excluded.schema_version,
      draft_payload = excluded.draft_payload,
      draft_saved_at = excluded.draft_saved_at;

  update public.cases
  set intake_status = case when intake_status = 'reopened' then 'reopened' else 'draft' end,
      status = 'customer_writing'
  where id = target_case.id;

  insert into public.case_activity_log (case_id, actor_type, action, metadata)
  values (target_case.id, 'customer', 'customer_draft_saved', '{}'::jsonb);

  return jsonb_build_object('case_code', target_case.case_code, 'saved_at', now());
end;
$$;

create or replace function public.submit_case_intake(
  p_token_hash text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_case public.cases%rowtype;
  answer_item record;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_intake_payload';
  end if;

  select * into target_case
  from public.cases
  where token_hash = p_token_hash and token_status = 'active'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_token';
  end if;
  if target_case.intake_status = 'submitted' then
    raise exception using errcode = 'P0001', message = 'already_submitted';
  end if;

  insert into public.case_intake_responses (
    case_id,
    schema_version,
    draft_payload,
    final_payload,
    draft_saved_at,
    finalized_at
  )
  values (
    target_case.id,
    coalesce((p_payload->>'schemaVersion')::integer, 1),
    p_payload,
    p_payload,
    now(),
    now()
  )
  on conflict (case_id) do update
  set schema_version = excluded.schema_version,
      draft_payload = excluded.draft_payload,
      final_payload = excluded.final_payload,
      draft_saved_at = excluded.draft_saved_at,
      finalized_at = excluded.finalized_at;

  insert into public.case_current_business (
    case_id,
    customer_preferred_title,
    preferred_contact_method,
    relationship_to_business,
    authority_status,
    sign_name,
    entrance_sign_name,
    registration_name,
    permit_name,
    official_address,
    floor_structure,
    official_phone,
    official_website,
    primary_activity,
    opening_hours,
    desired_standard_name,
    keyword_name_history,
    raw_notes
  )
  values (
    target_case.id,
    nullif(p_payload #>> '{answers,customer_preferred_title}', ''),
    nullif(p_payload #>> '{answers,preferred_contact_method}', ''),
    nullif(p_payload #>> '{answers,relationship_to_business}', ''),
    case p_payload #>> '{answers,authority_status}'
      when '맞아요' then 'confirmed'
      when '공식 담당자예요' then 'confirmed'
      when '확인이 필요해요' then 'needs_confirmation'
      else 'unknown'
    end,
    nullif(p_payload #>> '{answers,sign_name}', ''),
    nullif(p_payload #>> '{answers,entrance_sign_name}', ''),
    nullif(p_payload #>> '{answers,registration_name}', ''),
    nullif(p_payload #>> '{answers,permit_name}', ''),
    nullif(p_payload #>> '{answers,official_address}', ''),
    coalesce(
      nullif(p_payload #>> '{answers,floor_structure}', ''),
      nullif(p_payload #>> '{answers,floor_separation}', '')
    ),
    nullif(p_payload #>> '{answers,official_phone}', ''),
    nullif(p_payload #>> '{answers,official_website}', ''),
    nullif(p_payload #>> '{answers,primary_activity}', ''),
    nullif(p_payload #>> '{answers,opening_hours}', ''),
    nullif(p_payload #>> '{answers,desired_standard_name}', ''),
    nullif(p_payload #>> '{answers,keyword_name_history}', ''),
    nullif(p_payload #>> '{answers,overall_history}', '')
  )
  on conflict (case_id) do update
  set customer_preferred_title = excluded.customer_preferred_title,
      preferred_contact_method = excluded.preferred_contact_method,
      relationship_to_business = excluded.relationship_to_business,
      authority_status = excluded.authority_status,
      sign_name = excluded.sign_name,
      entrance_sign_name = excluded.entrance_sign_name,
      registration_name = excluded.registration_name,
      permit_name = excluded.permit_name,
      official_address = excluded.official_address,
      floor_structure = excluded.floor_structure,
      official_phone = excluded.official_phone,
      official_website = excluded.official_website,
      primary_activity = excluded.primary_activity,
      opening_hours = excluded.opening_hours,
      desired_standard_name = excluded.desired_standard_name,
      keyword_name_history = excluded.keyword_name_history,
      raw_notes = excluded.raw_notes;

  insert into public.case_history_summary (
    case_id,
    first_registration_period,
    creation_attempt_count,
    suspension_count,
    account_count,
    third_party_count,
    old_account_access_status,
    appeal_status,
    recreated_during_appeal,
    overall_history
  )
  values (
    target_case.id,
    nullif(p_payload #>> '{answers,first_registration_period}', ''),
    nullif(p_payload #>> '{answers,creation_attempt_count}', '')::integer,
    nullif(p_payload #>> '{answers,suspension_count}', '')::integer,
    nullif(p_payload #>> '{answers,account_count}', '')::integer,
    nullif(p_payload #>> '{answers,third_party_count}', '')::integer,
    case p_payload #>> '{answers,old_account_access_status}'
      when '로그인할 수 있어요' then 'accessible'
      when '로그인할 수 없어요' then 'inaccessible'
      when '어떤 계정인지 몰라요' then 'unknown_account'
      else 'unknown'
    end,
    case p_payload #>> '{answers,appeal_status}'
      when '진행 중이에요' then 'in_progress'
      when '승인됐어요' then 'approved'
      when '거절됐어요' then 'rejected'
      when '신청하지 않았어요' then 'never_submitted'
      else 'unknown'
    end,
    case p_payload #>> '{answers,recreated_during_appeal}'
      when '있어요' then 'yes'
      when '없어요' then 'no'
      when '해당 없음' then 'not_applicable'
      else 'unknown'
    end,
    nullif(p_payload #>> '{answers,overall_history}', '')
  )
  on conflict (case_id) do update
  set first_registration_period = excluded.first_registration_period,
      creation_attempt_count = excluded.creation_attempt_count,
      suspension_count = excluded.suspension_count,
      account_count = excluded.account_count,
      third_party_count = excluded.third_party_count,
      old_account_access_status = excluded.old_account_access_status,
      appeal_status = excluded.appeal_status,
      recreated_during_appeal = excluded.recreated_during_appeal,
      overall_history = excluded.overall_history;

  delete from public.history_events where case_id = target_case.id;
  insert into public.history_events (
    case_id,
    customer_client_id,
    sort_order,
    approximate_period,
    handled_by,
    handler_type,
    account_label,
    account_email,
    profile_name,
    address,
    floor,
    map_pin_notes,
    phone,
    website,
    primary_category,
    additional_categories,
    verification_method,
    approval_status,
    final_result,
    google_message,
    changes_before_result,
    appeal_pending_when_recreated,
    same_account_other_suspensions,
    ownership_change_notes,
    evidence_notes,
    customer_raw_response
  )
  select
    target_case.id,
    (event.item->>'clientId')::uuid,
    event.ordinality::integer - 1,
    case when coalesce((event.item->>'periodUnknown')::boolean, false) then '정확한 시기 모름' else nullif(event.item->>'approximatePeriod', '') end,
    case when coalesce((event.item->>'handlerUnknown')::boolean, false) then '누가 진행했는지 모름' else nullif(event.item->>'handledBy', '') end,
    nullif(event.item->>'handlerType', ''),
    nullif(event.item->>'accountLabel', ''),
    nullif(event.item->>'accountEmail', ''),
    nullif(event.item->>'profileName', ''),
    nullif(event.item->>'address', ''),
    nullif(event.item->>'floor', ''),
    nullif(event.item->>'mapPinNotes', ''),
    nullif(event.item->>'phone', ''),
    nullif(event.item->>'website', ''),
    nullif(event.item->>'primaryCategory', ''),
    coalesce(event.item->'additionalCategories', '[]'::jsonb),
    nullif(event.item->>'verificationMethod', ''),
    nullif(event.item->>'approvalStatus', ''),
    coalesce(nullif(event.item->>'finalResult', ''), nullif(event.item->>'result', '')),
    nullif(event.item->>'googleMessage', ''),
    nullif(event.item->>'changesBeforeResult', ''),
    nullif(event.item->>'appealPendingWhenRecreated', ''),
    nullif(event.item->>'sameAccountOtherSuspensions', ''),
    nullif(event.item->>'ownershipChangeNotes', ''),
    nullif(event.item->>'evidenceNotes', ''),
    event.item
  from jsonb_array_elements(coalesce(p_payload->'historyEvents', '[]'::jsonb))
    with ordinality event(item, ordinality);

  delete from public.current_profile_candidates where case_id = target_case.id;
  insert into public.current_profile_candidates (
    case_id,
    customer_client_id,
    sort_order,
    maps_url,
    displayed_name,
    displayed_address,
    displayed_floor,
    map_pin_notes,
    displayed_phone,
    displayed_website,
    displayed_category,
    rating,
    review_count,
    possible_creator,
    customer_controls_profile,
    ownership_request_status,
    relation_notes,
    independent_business_signals,
    customer_raw_response
  )
  select
    target_case.id,
    (profile.item->>'clientId')::uuid,
    profile.ordinality::integer - 1,
    nullif(profile.item->>'mapsUrl', ''),
    nullif(profile.item->>'displayedName', ''),
    nullif(profile.item->>'displayedAddress', ''),
    nullif(profile.item->>'displayedFloor', ''),
    nullif(profile.item->>'mapPinNotes', ''),
    nullif(profile.item->>'displayedPhone', ''),
    nullif(profile.item->>'displayedWebsite', ''),
    nullif(profile.item->>'displayedCategory', ''),
    nullif(profile.item->>'rating', '')::numeric,
    nullif(profile.item->>'reviewCount', '')::integer,
    nullif(profile.item->>'possibleCreator', ''),
    nullif(profile.item->>'customerControlsProfile', ''),
    nullif(profile.item->>'ownershipRequestStatus', ''),
    nullif(profile.item->>'relationNotes', ''),
    coalesce(profile.item->'independentBusinessSignals', '{}'::jsonb),
    profile.item
  from jsonb_array_elements(coalesce(p_payload->'profileCandidates', '[]'::jsonb))
    with ordinality profile(item, ordinality);

  delete from public.third_party_history where case_id = target_case.id;
  insert into public.third_party_history (
    case_id,
    party_name,
    party_type,
    approximate_period,
    work_requested,
    account_access_level,
    changes_made,
    notes
  )
  select
    target_case.id,
    nullif(party.item->>'partyName', ''),
    nullif(party.item->>'partyType', ''),
    nullif(party.item->>'approximatePeriod', ''),
    nullif(party.item->>'workRequested', ''),
    nullif(party.item->>'accountAccessLevel', ''),
    coalesce(party.item->'changesMade', '[]'::jsonb),
    nullif(party.item->>'notes', '')
  from jsonb_array_elements(coalesce(p_payload->'thirdParties', '[]'::jsonb)) party(item);

  insert into public.customer_goals (
    case_id,
    priority_goals,
    success_definition,
    process_expectation,
    additional_context
  )
  values (
    target_case.id,
    coalesce(p_payload #> '{answers,priority_goals}', '[]'::jsonb),
    nullif(p_payload #>> '{answers,success_definition}', ''),
    nullif(p_payload #>> '{answers,process_expectation}', ''),
    nullif(p_payload #>> '{answers,additional_context}', '')
  )
  on conflict (case_id) do update
  set priority_goals = excluded.priority_goals,
      success_definition = excluded.success_definition,
      process_expectation = excluded.process_expectation,
      additional_context = excluded.additional_context;

  delete from public.case_fact_items
  where case_id = target_case.id and source_type = 'intake_answer';
  for answer_item in select key, value from jsonb_each(coalesce(p_payload->'answers', '{}'::jsonb))
  loop
    insert into public.case_fact_items (
      case_id,
      source_type,
      source_id,
      fact_key,
      fact_value,
      verification_status
    ) values (
      target_case.id,
      'intake_answer',
      target_case.id,
      answer_item.key,
      answer_item.value,
      'customer_statement'
    );
  end loop;

  update public.case_evidence evidence
  set history_event_id = event.id,
      current_profile_candidate_id = null
  from public.history_events event
  where evidence.case_id = target_case.id
    and evidence.customer_link_type = 'history_event'
    and evidence.customer_link_client_id = event.customer_client_id
    and event.case_id = target_case.id;

  update public.case_evidence evidence
  set current_profile_candidate_id = profile.id,
      history_event_id = null
  from public.current_profile_candidates profile
  where evidence.case_id = target_case.id
    and evidence.customer_link_type = 'profile_candidate'
    and evidence.customer_link_client_id = profile.customer_client_id
    and profile.case_id = target_case.id;

  update public.cases
  set intake_status = 'submitted',
      status = 'new_submission',
      submitted_at = now()
  where id = target_case.id;

  insert into public.case_activity_log (case_id, actor_type, action, metadata)
  values (
    target_case.id,
    'customer',
    'customer_submission_received',
    jsonb_build_object(
      'history_event_count', jsonb_array_length(coalesce(p_payload->'historyEvents', '[]'::jsonb)),
      'profile_candidate_count', jsonb_array_length(coalesce(p_payload->'profileCandidates', '[]'::jsonb)),
      'third_party_count', jsonb_array_length(coalesce(p_payload->'thirdParties', '[]'::jsonb))
    )
  );

  return jsonb_build_object(
    'case_id', target_case.id,
    'case_code', target_case.case_code,
    'business_name', target_case.business_name,
    'submitted_at', now()
  );
end;
$$;

revoke all on function public.save_case_intake_draft(text, jsonb) from public, anon, authenticated;
revoke all on function public.submit_case_intake(text, jsonb) from public, anon, authenticated;
grant execute on function public.save_case_intake_draft(text, jsonb) to service_role;
grant execute on function public.submit_case_intake(text, jsonb) to service_role;

comment on function public.submit_case_intake(text, jsonb)
is 'Atomically checks active token and submission state, preserves the raw payload, materializes normalized case records, links evidence, and transitions the case once.';

commit;
