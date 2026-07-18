begin;

update public.question_modules
set schema_json = jsonb_set(
  schema_json,
  '{questions}',
  (
    select coalesce(jsonb_agg(question order by ordinality), '[]'::jsonb)
    from jsonb_array_elements(schema_json->'questions')
      with ordinality as configured(question, ordinality)
    where question->>'key' <> 'preferred_contact_method'
  ),
  true
)
where module_key = 'common_business_identity'
  and exists (
    select 1
    from jsonb_array_elements(schema_json->'questions') as configured(question)
    where question->>'key' = 'preferred_contact_method'
  );

commit;
