begin;

create policy admin_profiles_read_admin_directory on public.admin_profiles
for select to authenticated
using (public.is_admin());

commit;
