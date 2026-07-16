-- Core normalized case model and operational constraints.
begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_profiles_email_normalized check (email = lower(trim(email)))
);

create table public.question_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  module_type text not null,
  title text not null,
  description text not null default '',
  schema_json jsonb not null default '{"questions": []}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_modules_type_check check (module_type in ('common', 'industry', 'issue')),
  constraint question_modules_schema_object check (jsonb_typeof(schema_json) = 'object')
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  business_name text not null,
  industry_key text not null,
  customer_name text,
  customer_phone text,
  customer_contact_channel text,
  customer_intro text not null default '',
  expected_completion_minutes integer not null default 20,
  token_hash text unique,
  token_status text not null default 'pending',
  status text not null default 'link_ready',
  intake_status text not null default 'link_ready',
  assigned_admin_id uuid references public.admin_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  retention_review_at timestamptz,
  constraint cases_code_format check (case_code ~ '^WTH-[A-Z0-9]{8,}$'),
  constraint cases_completion_time check (expected_completion_minutes between 5 and 180),
  constraint cases_token_hash_format check (token_hash is null or token_hash ~ '^[a-f0-9]{64}$'),
  constraint cases_token_status_check check (token_status in ('pending', 'active', 'revoked')),
  constraint cases_status_check check (
    status in (
      'link_ready', 'customer_writing', 'new_submission', 'initial_review',
      'additional_info_requested', 'awaiting_customer', 'hypothesis_review',
      'route_decided', 'in_progress', 'completed', 'on_hold', 'stopped'
    )
  ),
  constraint cases_intake_status_check check (intake_status in ('link_ready', 'draft', 'submitted', 'reopened')),
  constraint cases_submitted_timestamp check (intake_status <> 'submitted' or submitted_at is not null)
);

create table public.case_modules (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  module_id uuid not null references public.question_modules(id) on delete restrict,
  sort_order integer not null default 0,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint case_modules_unique unique (case_id, module_id),
  constraint case_modules_sort_nonnegative check (sort_order >= 0),
  constraint case_modules_configuration_object check (jsonb_typeof(configuration) = 'object')
);

create table public.case_prefilled_fields (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  field_key text not null,
  field_value jsonb not null,
  source_type text not null default 'admin_prefill',
  source_note text,
  customer_can_edit boolean not null default true,
  created_at timestamptz not null default now(),
  constraint case_prefilled_fields_unique unique (case_id, field_key),
  constraint case_prefilled_source_type_check check (
    source_type in ('admin_prefill', 'customer_statement', 'document', 'public_source', 'unknown')
  )
);

create table public.case_custom_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  section_key text not null,
  question_key text not null,
  label text not null,
  help_text text,
  question_type text not null,
  choices jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  conditional_logic jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint case_custom_questions_unique unique (case_id, question_key),
  constraint case_custom_questions_type_check check (
    question_type in ('text', 'textarea', 'single_select', 'multi_select', 'boolean', 'date_period', 'number', 'confirmation')
  ),
  constraint case_custom_questions_choices_array check (jsonb_typeof(choices) = 'array'),
  constraint case_custom_questions_logic_object check (jsonb_typeof(conditional_logic) = 'object'),
  constraint case_custom_questions_sort_nonnegative check (sort_order >= 0)
);

create table public.case_current_business (
  case_id uuid primary key references public.cases(id) on delete cascade,
  customer_preferred_title text,
  preferred_contact_method text,
  relationship_to_business text,
  authority_status text,
  sign_name text,
  entrance_sign_name text,
  registration_name text,
  permit_name text,
  official_address text,
  building_name text,
  floor_structure text,
  independent_business_count integer,
  entrance_structure text,
  floor_independence_signals jsonb not null default '{}'::jsonb,
  official_phone text,
  official_website text,
  primary_activity text,
  opening_hours text,
  desired_standard_name text,
  keyword_name_history text,
  raw_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint current_business_count_check check (independent_business_count is null or independent_business_count between 0 and 100),
  constraint current_business_floor_signals_object check (jsonb_typeof(floor_independence_signals) = 'object'),
  constraint current_business_authority_check check (
    authority_status is null or authority_status in ('confirmed', 'needs_confirmation', 'not_authorized', 'unknown')
  )
);

create table public.case_history_summary (
  case_id uuid primary key references public.cases(id) on delete cascade,
  first_registration_period text,
  creation_attempt_count integer,
  suspension_count integer,
  account_count integer,
  third_party_count integer,
  old_account_access_status text,
  appeal_status text,
  recreated_during_appeal text,
  overall_history text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint history_summary_counts_check check (
    coalesce(creation_attempt_count, 0) >= 0 and coalesce(suspension_count, 0) >= 0
    and coalesce(account_count, 0) >= 0 and coalesce(third_party_count, 0) >= 0
  ),
  constraint history_summary_appeal_check check (
    appeal_status is null or appeal_status in ('in_progress', 'approved', 'rejected', 'never_submitted', 'unknown')
  ),
  constraint history_summary_recreated_check check (
    recreated_during_appeal is null or recreated_during_appeal in ('yes', 'no', 'unknown', 'not_applicable')
  )
);

create table public.history_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sort_order integer not null default 0,
  approximate_period text,
  handled_by text,
  handler_type text,
  account_label text,
  account_email text,
  profile_name text,
  address text,
  floor text,
  map_pin_notes text,
  phone text,
  website text,
  primary_category text,
  additional_categories jsonb not null default '[]'::jsonb,
  verification_method text,
  approval_status text,
  final_result text,
  google_message text,
  changes_before_result text,
  appeal_pending_when_recreated text,
  same_account_other_suspensions text,
  ownership_change_notes text,
  evidence_notes text,
  customer_raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint history_events_sort_range check (sort_order between 0 and 9),
  constraint history_events_additional_categories_array check (jsonb_typeof(additional_categories) = 'array'),
  constraint history_events_raw_object check (jsonb_typeof(customer_raw_response) = 'object')
);

create table public.current_profile_candidates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sort_order integer not null default 0,
  maps_url text,
  displayed_name text,
  displayed_address text,
  displayed_floor text,
  map_pin_notes text,
  displayed_phone text,
  displayed_website text,
  displayed_category text,
  rating numeric(2,1),
  review_count integer,
  possible_creator text,
  customer_controls_profile text,
  ownership_request_status text,
  relation_notes text,
  independent_business_signals jsonb not null default '{}'::jsonb,
  customer_raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_candidates_sort_range check (sort_order between 0 and 9),
  constraint profile_candidates_rating_range check (rating is null or rating between 0 and 5),
  constraint profile_candidates_review_count check (review_count is null or review_count >= 0),
  constraint profile_candidates_signals_object check (jsonb_typeof(independent_business_signals) = 'object'),
  constraint profile_candidates_raw_object check (jsonb_typeof(customer_raw_response) = 'object')
);

create table public.third_party_history (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  party_name text,
  party_type text,
  approximate_period text,
  work_requested text,
  account_access_level text,
  changes_made jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint third_party_changes_object check (jsonb_typeof(changes_made) = 'object')
);

create table public.case_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  history_event_id uuid references public.history_events(id) on delete set null,
  current_profile_candidate_id uuid references public.current_profile_candidates(id) on delete set null,
  evidence_category text not null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  customer_description text,
  uploaded_by_type text not null,
  created_at timestamptz not null default now(),
  constraint case_evidence_size_check check (size_bytes > 0 and size_bytes <= 15728640),
  constraint case_evidence_mime_check check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  constraint case_evidence_uploader_check check (uploaded_by_type in ('customer', 'admin')),
  constraint case_evidence_storage_path_check check (storage_path ~ '^cases/[0-9a-f-]{36}/[A-Za-z0-9_-]+-[^/]+$')
);

create table public.case_requested_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  evidence_category text not null,
  label text not null,
  help_text text,
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint case_requested_evidence_unique unique (case_id, evidence_category)
);

create table public.customer_goals (
  case_id uuid primary key references public.cases(id) on delete cascade,
  priority_goals jsonb not null default '[]'::jsonb,
  success_definition text,
  process_expectation text,
  additional_context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_goals_priority_array check (jsonb_typeof(priority_goals) = 'array')
);

create table public.case_diagnosis (
  case_id uuid primary key references public.cases(id) on delete cascade,
  engine_version text not null,
  duplicate_entity_score integer not null default 0,
  name_consistency_score integer not null default 0,
  address_floor_pin_score integer not null default 0,
  phone_website_score integer not null default 0,
  category_consistency_score integer not null default 0,
  ownership_control_score integer not null default 0,
  account_appeal_score integer not null default 0,
  physical_evidence_score integer not null default 0,
  repeated_recreation_score integer not null default 0,
  independent_business_ambiguity_score integer not null default 0,
  hypotheses jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  suggested_questions jsonb not null default '[]'::jsonb,
  suggested_paths jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_reviewed_by uuid references public.admin_profiles(user_id) on delete set null,
  admin_conclusion text,
  admin_decision_path text,
  constraint case_diagnosis_scores_check check (
    duplicate_entity_score between 0 and 100
    and name_consistency_score between 0 and 100
    and address_floor_pin_score between 0 and 100
    and phone_website_score between 0 and 100
    and category_consistency_score between 0 and 100
    and ownership_control_score between 0 and 100
    and account_appeal_score between 0 and 100
    and physical_evidence_score between 0 and 100
    and repeated_recreation_score between 0 and 100
    and independent_business_ambiguity_score between 0 and 100
  ),
  constraint case_diagnosis_json_arrays check (
    jsonb_typeof(hypotheses) = 'array'
    and jsonb_typeof(missing_information) = 'array'
    and jsonb_typeof(suggested_questions) = 'array'
    and jsonb_typeof(suggested_paths) = 'array'
  ),
  constraint case_diagnosis_path_check check (
    admin_decision_path is null or admin_decision_path in ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H')
  )
);

create table public.case_fact_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  fact_key text not null,
  fact_value jsonb not null,
  verification_status text not null default 'customer_statement',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_fact_items_unique unique (case_id, source_type, source_id, fact_key),
  constraint case_fact_status_check check (
    verification_status in ('confirmed', 'customer_statement', 'inference', 'unknown', 'conflicting')
  )
);

create table public.follow_up_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  requested_by uuid references public.admin_profiles(user_id) on delete set null,
  title text not null,
  message text not null,
  requested_items jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  customer_response text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint follow_up_items_array check (jsonb_typeof(requested_items) = 'array'),
  constraint follow_up_status_check check (status in ('draft', 'sent', 'responded', 'resolved', 'cancelled'))
);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  author_id uuid references public.admin_profiles(user_id) on delete set null,
  note_type text not null default 'general',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_notes_content_check check (char_length(trim(content)) > 0)
);

create table public.case_activity_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  actor_type text not null,
  actor_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activity_actor_type_check check (actor_type in ('admin', 'customer', 'system')),
  constraint activity_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.case_intake_responses (
  case_id uuid primary key references public.cases(id) on delete cascade,
  schema_version integer not null default 1,
  draft_payload jsonb not null default '{}'::jsonb,
  final_payload jsonb,
  draft_saved_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intake_response_schema_version check (schema_version > 0),
  constraint intake_response_draft_object check (jsonb_typeof(draft_payload) = 'object'),
  constraint intake_response_final_object check (final_payload is null or jsonb_typeof(final_payload) = 'object')
);

create table public.endpoint_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint endpoint_rate_limits_unique unique (scope_key, window_started_at),
  constraint endpoint_rate_limits_count check (request_count > 0)
);

create table public.outbound_delivery_log (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  delivery_type text not null,
  status text not null,
  attempt_count integer not null default 0,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outbound_delivery_type_check check (delivery_type in ('email_notification', 'google_sheets_summary')),
  constraint outbound_delivery_status_check check (status in ('pending', 'sent', 'failed', 'disabled')),
  constraint outbound_delivery_attempts_check check (attempt_count >= 0)
);

create index cases_status_updated_idx on public.cases (status, updated_at desc);
create index cases_intake_status_idx on public.cases (intake_status, submitted_at desc);
create index cases_assigned_admin_idx on public.cases (assigned_admin_id, updated_at desc);
create index case_modules_case_sort_idx on public.case_modules (case_id, sort_order);
create index case_custom_questions_case_sort_idx on public.case_custom_questions (case_id, section_key, sort_order);
create index history_events_case_sort_idx on public.history_events (case_id, sort_order);
create index profile_candidates_case_sort_idx on public.current_profile_candidates (case_id, sort_order);
create index third_party_history_case_idx on public.third_party_history (case_id, created_at);
create index case_evidence_case_idx on public.case_evidence (case_id, created_at);
create index case_evidence_history_idx on public.case_evidence (history_event_id) where history_event_id is not null;
create index case_evidence_candidate_idx on public.case_evidence (current_profile_candidate_id) where current_profile_candidate_id is not null;
create index fact_items_case_status_idx on public.case_fact_items (case_id, verification_status);
create index follow_up_case_status_idx on public.follow_up_requests (case_id, status, created_at desc);
create index admin_notes_case_idx on public.admin_notes (case_id, created_at desc);
create index activity_log_case_idx on public.case_activity_log (case_id, created_at desc);
create index endpoint_rate_limits_expiry_idx on public.endpoint_rate_limits (expires_at);
create index outbound_delivery_case_idx on public.outbound_delivery_log (case_id, delivery_type, created_at desc);

create trigger admin_profiles_set_updated_at before update on public.admin_profiles
for each row execute function public.set_updated_at();
create trigger question_modules_set_updated_at before update on public.question_modules
for each row execute function public.set_updated_at();
create trigger cases_set_updated_at before update on public.cases
for each row execute function public.set_updated_at();
create trigger case_current_business_set_updated_at before update on public.case_current_business
for each row execute function public.set_updated_at();
create trigger case_history_summary_set_updated_at before update on public.case_history_summary
for each row execute function public.set_updated_at();
create trigger history_events_set_updated_at before update on public.history_events
for each row execute function public.set_updated_at();
create trigger current_profile_candidates_set_updated_at before update on public.current_profile_candidates
for each row execute function public.set_updated_at();
create trigger third_party_history_set_updated_at before update on public.third_party_history
for each row execute function public.set_updated_at();
create trigger customer_goals_set_updated_at before update on public.customer_goals
for each row execute function public.set_updated_at();
create trigger case_diagnosis_set_updated_at before update on public.case_diagnosis
for each row execute function public.set_updated_at();
create trigger case_fact_items_set_updated_at before update on public.case_fact_items
for each row execute function public.set_updated_at();
create trigger admin_notes_set_updated_at before update on public.admin_notes
for each row execute function public.set_updated_at();
create trigger case_intake_responses_set_updated_at before update on public.case_intake_responses
for each row execute function public.set_updated_at();
create trigger endpoint_rate_limits_set_updated_at before update on public.endpoint_rate_limits
for each row execute function public.set_updated_at();
create trigger outbound_delivery_log_set_updated_at before update on public.outbound_delivery_log
for each row execute function public.set_updated_at();

create or replace function public.enforce_case_item_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  existing_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.case_id::text || tg_table_name, 0));

  execute format('select count(*) from public.%I where case_id = $1 and id <> $2', tg_table_name)
    into existing_count
    using new.case_id, new.id;

  if existing_count >= 10 then
    raise exception using errcode = '23514', message = tg_table_name || ' allows at most 10 items per case';
  end if;

  return new;
end;
$$;

create trigger history_events_enforce_limit before insert or update of case_id on public.history_events
for each row execute function public.enforce_case_item_limit();
create trigger current_profile_candidates_enforce_limit before insert or update of case_id on public.current_profile_candidates
for each row execute function public.enforce_case_item_limit();

create or replace function public.enforce_case_evidence_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  existing_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.case_id::text || 'case_evidence', 0));
  select count(*) into existing_count
  from public.case_evidence
  where case_id = new.case_id and id <> new.id;

  if existing_count >= 15 then
    raise exception using errcode = '23514', message = 'case_evidence allows at most 15 files per case';
  end if;

  return new;
end;
$$;

create trigger case_evidence_enforce_limit before insert or update of case_id on public.case_evidence
for each row execute function public.enforce_case_evidence_limit();

comment on table public.case_intake_responses is 'Versioned raw customer payload. Normalized tables remain separately queryable for case work.';
comment on column public.cases.token_hash is 'Lowercase hex HMAC-SHA256 of the public intake token. The raw token is never stored.';
comment on table public.case_diagnosis is 'Deterministic hypotheses based on submitted facts; never a representation of Google private enforcement logic.';
comment on column public.history_events.customer_raw_response is 'Immutable source-shaped response retained when administrators normalize fields.';
comment on column public.current_profile_candidates.customer_raw_response is 'Immutable source-shaped response retained when administrators normalize fields.';

commit;
