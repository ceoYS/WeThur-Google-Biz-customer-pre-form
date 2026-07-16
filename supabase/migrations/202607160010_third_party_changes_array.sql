begin;

alter table public.third_party_history
drop constraint if exists third_party_changes_object;

update public.third_party_history
set changes_made = (
  select coalesce(jsonb_agg(entry.key order by entry.key), '[]'::jsonb)
  from jsonb_each(changes_made) entry
  where entry.value not in ('false'::jsonb, 'null'::jsonb)
)
where jsonb_typeof(changes_made) = 'object';

alter table public.third_party_history
alter column changes_made set default '[]'::jsonb;

alter table public.third_party_history
add constraint third_party_changes_array
check (jsonb_typeof(changes_made) = 'array');

commit;
