begin;

grant usage on schema public to service_role;

grant select, insert, update
on table public.admin_profiles,
         public.case_diagnosis,
         public.follow_up_requests,
         public.history_events
to service_role;

grant select, insert
on table public.admin_notes
to service_role;

grant select, update
on table public.cases,
         public.case_fact_items
to service_role;

grant select, delete
on table public.case_evidence
to service_role;

grant select
on table public.question_modules,
         public.case_modules,
         public.case_prefilled_fields,
         public.case_custom_questions,
         public.current_profile_candidates,
         public.case_requested_evidence,
         public.case_intake_responses
to service_role;

grant insert
on table public.case_activity_log,
         public.outbound_delivery_log
to service_role;

commit;
