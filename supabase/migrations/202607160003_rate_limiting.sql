begin;

create or replace function public.consume_rate_limit(
  p_scope_key text,
  p_window_seconds integer,
  p_request_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  if p_scope_key !~ '^[a-f0-9]{64}$'
     or p_window_seconds < 1
     or p_window_seconds > 86400
     or p_request_limit < 1
     or p_request_limit > 1000 then
    raise exception using errcode = '22023', message = 'invalid rate limit parameters';
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  perform pg_advisory_xact_lock(hashtextextended(p_scope_key || current_window::text, 0));

  insert into public.endpoint_rate_limits (
    scope_key,
    window_started_at,
    request_count,
    expires_at
  )
  values (
    p_scope_key,
    current_window,
    1,
    current_window + make_interval(secs => p_window_seconds * 2)
  )
  on conflict (scope_key, window_started_at)
  do update set request_count = public.endpoint_rate_limits.request_count + 1
  returning request_count into current_count;

  return current_count <= p_request_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

comment on function public.consume_rate_limit(text, integer, integer)
is 'Atomic fixed-window limit. Scope keys are server-generated HMAC digests; raw IPs and intake tokens are never stored.';

commit;
