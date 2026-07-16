alter table public.history_events
add column if not exists admin_normalization_note text;

create or replace function public.reorder_case_history_events(
  p_case_id uuid,
  p_event_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  existing_count integer;
  matched_count integer;
begin
  if coalesce(array_length(p_event_ids, 1), 0) > 10 then
    raise exception using errcode = '22023', message = 'too_many_history_events';
  end if;

  select count(*) into existing_count
  from public.history_events
  where case_id = p_case_id;

  select count(distinct event_id) into matched_count
  from unnest(coalesce(p_event_ids, array[]::uuid[])) event_id
  join public.history_events history
    on history.id = event_id and history.case_id = p_case_id;

  if existing_count <> coalesce(array_length(p_event_ids, 1), 0)
     or matched_count <> existing_count then
    raise exception using errcode = '22023', message = 'history_event_set_mismatch';
  end if;

  update public.history_events history
  set sort_order = ordered.ordinality - 1
  from unnest(p_event_ids) with ordinality ordered(event_id, ordinality)
  where history.id = ordered.event_id and history.case_id = p_case_id;
end;
$$;

revoke all on function public.reorder_case_history_events(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_case_history_events(uuid, uuid[]) to service_role;

comment on function public.reorder_case_history_events(uuid, uuid[])
is 'Atomically reorders the complete history event set for one case. Service role only.';
