begin;

with retired_question_keys(key) as (
  values
    ('customer_preferred_title'),
    ('desired_standard_name'),
    ('keyword_name_history'),
    ('third_party_involvement'),
    ('evidence_availability'),
    ('sensitive_data_confirmation'),
    ('priority_goals'),
    ('success_definition'),
    ('process_expectation'),
    ('future_location_standard'),
    ('duplicate_relation_basis'),
    ('unknown_owner_access'),
    ('ownership_request_history'),
    ('map_pin_difference'),
    ('manager_role_summary')
)
update public.question_modules as module
set schema_json = jsonb_set(
  module.schema_json,
  '{questions}',
  (
    select coalesce(jsonb_agg(question order by ordinality), '[]'::jsonb)
    from jsonb_array_elements(module.schema_json->'questions')
      with ordinality as configured(question, ordinality)
    where not exists (
      select 1
      from retired_question_keys
      where retired_question_keys.key = question->>'key'
    )
  ),
  true
)
where exists (
  select 1
  from jsonb_array_elements(module.schema_json->'questions') as configured(question)
  join retired_question_keys on retired_question_keys.key = question->>'key'
);

update public.question_modules
set schema_json = jsonb_set(
  schema_json,
  '{questions}',
  (schema_json->'questions') ||
    $json$[{"key":"verification_methods_used","sectionKey":"history_summary","label":"지금까지 시도하거나 Google에서 요청한 인증 방식은 무엇이었나요?","type":"multi_select","options":["영상 인증","실시간 영상 통화","전화 또는 문자","이메일","우편","인증을 요청받지 않았어요","잘 모르겠어요","확인이 필요해요"],"sortOrder":65}]$json$::jsonb,
  true
),
updated_at = now()
where module_key = 'common_history'
  and not exists (
    select 1
    from jsonb_array_elements(schema_json->'questions') as configured(question)
    where question->>'key' = 'verification_methods_used'
  );

update public.question_modules
set schema_json = jsonb_set(
  schema_json,
  '{questions}',
  (schema_json->'questions') ||
    $json$[{"key":"google_notice_type","sectionKey":"history_summary","label":"정지·삭제·인증 과정에서 Google이 안내한 내용은 무엇에 가까웠나요?","type":"single_select","options":["정책 위반 안내","인증 실패 또는 추가 인증 요청","중복 또는 소유권 관련 안내","구체적인 사유가 없었어요","안내를 찾지 못했어요","잘 모르겠어요","확인이 필요해요"],"sortOrder":75}]$json$::jsonb,
  true
),
updated_at = now()
where module_key = 'common_history'
  and not exists (
    select 1
    from jsonb_array_elements(schema_json->'questions') as configured(question)
    where question->>'key' = 'google_notice_type'
  );

update public.question_modules
set is_active = false,
    updated_at = now()
where module_key in (
  'common_evidence',
  'common_goals',
  'issue_duplicate_profiles',
  'issue_unknown_third_party_ownership',
  'issue_ownership_request'
);

comment on table public.question_modules is
'Customer questionnaire modules collect operational facts for GBP diagnosis; service outcomes remain administrator decisions.';

commit;
