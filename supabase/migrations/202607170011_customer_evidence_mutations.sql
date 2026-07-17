begin;

create or replace function public.register_customer_case_evidence(
  p_token_hash text,
  p_evidence jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_case public.cases%rowtype;
  inserted_evidence public.case_evidence%rowtype;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_evidence) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_evidence_payload';
  end if;

  select * into target_case
  from public.cases
  where token_hash = p_token_hash and token_status = 'active'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_token';
  end if;
  if target_case.intake_status = 'submitted' then
    raise exception using errcode = 'P0001', message = 'case_not_writable';
  end if;
  if (p_evidence->>'storagePath') not like ('cases/' || target_case.id::text || '/%') then
    raise exception using errcode = '22023', message = 'invalid_storage_path';
  end if;

  insert into public.case_evidence (
    case_id,
    evidence_category,
    storage_path,
    original_filename,
    mime_type,
    size_bytes,
    customer_description,
    uploaded_by_type,
    customer_link_type,
    customer_link_client_id
  ) values (
    target_case.id,
    p_evidence->>'evidenceCategory',
    p_evidence->>'storagePath',
    p_evidence->>'originalFilename',
    p_evidence->>'mimeType',
    (p_evidence->>'sizeBytes')::bigint,
    nullif(p_evidence->>'customerDescription', ''),
    'customer',
    nullif(p_evidence->>'customerLinkType', ''),
    nullif(p_evidence->>'customerLinkClientId', '')::uuid
  )
  returning * into inserted_evidence;

  return jsonb_build_object(
    'id', inserted_evidence.id,
    'case_id', inserted_evidence.case_id,
    'evidence_category', inserted_evidence.evidence_category,
    'original_filename', inserted_evidence.original_filename,
    'size_bytes', inserted_evidence.size_bytes,
    'customer_description', inserted_evidence.customer_description,
    'customer_link_type', inserted_evidence.customer_link_type,
    'customer_link_client_id', inserted_evidence.customer_link_client_id
  );
end;
$$;

create or replace function public.delete_customer_case_evidence(
  p_token_hash text,
  p_evidence_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_case public.cases%rowtype;
  deleted_evidence public.case_evidence%rowtype;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_token';
  end if;

  select * into target_case
  from public.cases
  where token_hash = p_token_hash and token_status = 'active'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'invalid_token';
  end if;
  if target_case.intake_status = 'submitted' then
    raise exception using errcode = 'P0001', message = 'case_not_writable';
  end if;

  delete from public.case_evidence
  where id = p_evidence_id
    and case_id = target_case.id
    and uploaded_by_type = 'customer'
  returning * into deleted_evidence;

  if not found then
    raise exception using errcode = 'P0001', message = 'evidence_not_found';
  end if;

  return jsonb_build_object(
    'id', deleted_evidence.id,
    'case_id', deleted_evidence.case_id,
    'storage_path', deleted_evidence.storage_path
  );
end;
$$;

revoke all on function public.register_customer_case_evidence(text, jsonb)
from public, anon, authenticated;
revoke all on function public.delete_customer_case_evidence(text, uuid)
from public, anon, authenticated;
grant execute on function public.register_customer_case_evidence(text, jsonb)
to service_role;
grant execute on function public.delete_customer_case_evidence(text, uuid)
to service_role;

comment on function public.register_customer_case_evidence(text, jsonb)
is 'Serializes customer evidence registration with final submission. Service role only.';
comment on function public.delete_customer_case_evidence(text, uuid)
is 'Serializes customer evidence deletion with final submission. Service role only.';

commit;
