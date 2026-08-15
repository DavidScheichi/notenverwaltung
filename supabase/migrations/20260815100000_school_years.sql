-- School years: enable rollover of classes across school years while
-- preserving history (Notenverwaltung: Schuljahr-Wechsel).

create table if not exists public.school_years (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  teacher_id uuid not null default auth.uid(),
  label text not null check (char_length(label) between 4 and 20),
  is_current boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_school_years_one_current_per_owner
  on public.school_years (owner_id)
  where is_current;

create index if not exists idx_school_years_owner on public.school_years (owner_id);

drop trigger if exists set_school_years_owner_ids on public.school_years;
create trigger set_school_years_owner_ids
before insert or update on public.school_years
for each row
execute function public.ensure_matching_owner_teacher_ids();

alter table public.school_years enable row level security;
alter table public.school_years force row level security;

drop policy if exists "school_years_select_own" on public.school_years;
create policy "school_years_select_own"
on public.school_years for select
using (owner_id = auth.uid());

drop policy if exists "school_years_insert_own" on public.school_years;
create policy "school_years_insert_own"
on public.school_years for insert
with check (owner_id = auth.uid());

drop policy if exists "school_years_update_own" on public.school_years;
create policy "school_years_update_own"
on public.school_years for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "school_years_delete_own" on public.school_years;
create policy "school_years_delete_own"
on public.school_years for delete
using (owner_id = auth.uid());

-- classes: link to a school year, and to the class it was continued from
alter table public.classes add column if not exists school_year_id uuid references public.school_years (id);
alter table public.classes
  add column if not exists predecessor_class_id uuid references public.classes (id) on delete set null;

-- enrollments: denormalized school_year_id so a student can be enrolled
-- in one class per year, but in different classes across years
alter table public.enrollments add column if not exists school_year_id uuid references public.school_years (id);

-- Drop the old single-column unique constraint on student_id dynamically
-- (name not guaranteed to be enrollments_student_id_key across environments).
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.enrollments'::regclass
    and contype = 'u'
    and conkey = array[
      (select attnum from pg_attribute
        where attrelid = 'public.enrollments'::regclass and attname = 'student_id')
    ];

  if cname is not null then
    execute format('alter table public.enrollments drop constraint %I', cname);
  end if;
end $$;

-- Backfill: give every teacher with existing data a single "current"
-- school year and attach it to their existing classes/enrollments.
do $$
declare
  rec record;
  new_year_id uuid;
  current_year_num int := extract(year from now())::int;
  computed_label text;
begin
  computed_label := case
    when extract(month from now()) >= 8
      then current_year_num::text || '/' || (current_year_num + 1)::text
    else (current_year_num - 1)::text || '/' || current_year_num::text
  end;

  for rec in
    select distinct teacher_id from public.classes where school_year_id is null
  loop
    insert into public.school_years (owner_id, teacher_id, label, is_current)
    values (rec.teacher_id, rec.teacher_id, computed_label, true)
    returning id into new_year_id;

    update public.classes
      set school_year_id = new_year_id
      where teacher_id = rec.teacher_id and school_year_id is null;

    update public.enrollments
      set school_year_id = new_year_id
      where teacher_id = rec.teacher_id and school_year_id is null;
  end loop;
end $$;

alter table public.classes alter column school_year_id set not null;
alter table public.enrollments alter column school_year_id set not null;

create index if not exists idx_classes_school_year on public.classes (school_year_id);
create index if not exists idx_classes_predecessor on public.classes (predecessor_class_id);
create index if not exists idx_enrollments_school_year on public.enrollments (school_year_id);

alter table public.enrollments
  add constraint enrollments_student_school_year_key unique (student_id, school_year_id);
