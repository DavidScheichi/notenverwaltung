alter table public.assessment_definitions
  add column if not exists short_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessment_definitions_short_label_len'
  ) then
    alter table public.assessment_definitions
      add constraint assessment_definitions_short_label_len
      check (short_label is null or char_length(short_label) <= 20);
  end if;
end $$;
