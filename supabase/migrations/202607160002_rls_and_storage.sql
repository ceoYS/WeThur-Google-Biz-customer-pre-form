-- Anonymous users receive no table or storage access.
begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;

alter table public.admin_profiles enable row level security;
alter table public.question_modules enable row level security;
alter table public.cases enable row level security;
alter table public.case_modules enable row level security;
alter table public.case_prefilled_fields enable row level security;
alter table public.case_custom_questions enable row level security;
alter table public.case_current_business enable row level security;
alter table public.case_history_summary enable row level security;
alter table public.history_events enable row level security;
alter table public.current_profile_candidates enable row level security;
alter table public.third_party_history enable row level security;
alter table public.case_evidence enable row level security;
alter table public.case_requested_evidence enable row level security;
alter table public.customer_goals enable row level security;
alter table public.case_diagnosis enable row level security;
alter table public.case_fact_items enable row level security;
alter table public.follow_up_requests enable row level security;
alter table public.admin_notes enable row level security;
alter table public.case_activity_log enable row level security;
alter table public.case_intake_responses enable row level security;
alter table public.endpoint_rate_limits enable row level security;
alter table public.outbound_delivery_log enable row level security;

create policy admin_profiles_read_self on public.admin_profiles
for select to authenticated using (user_id = auth.uid() and public.is_admin());
create policy admin_profiles_update_self on public.admin_profiles
for update to authenticated using (user_id = auth.uid() and public.is_admin())
with check (user_id = auth.uid() and public.is_admin());

create policy question_modules_admin_access on public.question_modules
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy cases_admin_access on public.cases
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_modules_admin_access on public.case_modules
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_prefilled_fields_admin_access on public.case_prefilled_fields
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_custom_questions_admin_access on public.case_custom_questions
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_current_business_admin_access on public.case_current_business
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_history_summary_admin_access on public.case_history_summary
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy history_events_admin_access on public.history_events
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy current_profile_candidates_admin_access on public.current_profile_candidates
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy third_party_history_admin_access on public.third_party_history
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_evidence_admin_access on public.case_evidence
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_requested_evidence_admin_access on public.case_requested_evidence
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy customer_goals_admin_access on public.customer_goals
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_diagnosis_admin_access on public.case_diagnosis
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_fact_items_admin_access on public.case_fact_items
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy follow_up_requests_admin_access on public.follow_up_requests
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_notes_admin_access on public.admin_notes
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy case_activity_log_admin_read on public.case_activity_log
for select to authenticated using (public.is_admin());
create policy case_activity_log_admin_insert on public.case_activity_log
for insert to authenticated with check (public.is_admin());
create policy case_intake_responses_admin_access on public.case_intake_responses
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy outbound_delivery_log_admin_access on public.outbound_delivery_log
for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.admin_profiles to authenticated;
grant select, insert, update, delete on public.question_modules to authenticated;
grant select, insert, update, delete on public.cases to authenticated;
grant select, insert, update, delete on public.case_modules to authenticated;
grant select, insert, update, delete on public.case_prefilled_fields to authenticated;
grant select, insert, update, delete on public.case_custom_questions to authenticated;
grant select, insert, update, delete on public.case_current_business to authenticated;
grant select, insert, update, delete on public.case_history_summary to authenticated;
grant select, insert, update, delete on public.history_events to authenticated;
grant select, insert, update, delete on public.current_profile_candidates to authenticated;
grant select, insert, update, delete on public.third_party_history to authenticated;
grant select, insert, update, delete on public.case_evidence to authenticated;
grant select, insert, update, delete on public.case_requested_evidence to authenticated;
grant select, insert, update, delete on public.customer_goals to authenticated;
grant select, insert, update, delete on public.case_diagnosis to authenticated;
grant select, insert, update, delete on public.case_fact_items to authenticated;
grant select, insert, update, delete on public.follow_up_requests to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
grant select, insert on public.case_activity_log to authenticated;
grant select, insert, update, delete on public.case_intake_responses to authenticated;
grant select, insert, update, delete on public.outbound_delivery_log to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-evidence',
  'case-evidence',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy case_evidence_storage_admin_select on storage.objects
for select to authenticated
using (bucket_id = 'case-evidence' and public.is_admin());
create policy case_evidence_storage_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'case-evidence' and public.is_admin());
create policy case_evidence_storage_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'case-evidence' and public.is_admin())
with check (bucket_id = 'case-evidence' and public.is_admin());
create policy case_evidence_storage_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'case-evidence' and public.is_admin());

comment on function public.is_admin() is 'RLS gate backed by admin_profiles. Rows are provisioned server-side only after ADMIN_EMAILS validation.';

commit;
