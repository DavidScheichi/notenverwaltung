create table if not exists public.assessment_definitions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  assessment_date date,
  max_points numeric(8,2),
  weight_multiplier numeric(6,2) not null default 1.00 check (weight_multiplier > 0),
  input_mode text not null default 'points' check (input_mode in ('points', 'grade', 'either')),
  order_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  assessment_definition_id uuid not null references public.assessment_definitions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  points numeric(8,2),
  grade integer check (grade between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint assessment_results_value_check check (
    (points is not null and grade is null) or
    (points is null and grade is not null)
  )
);

create table if not exists public.grade_boundaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade,
  grade integer not null check (grade between 1 and 5),
  min_percent numeric(5,2) not null check (min_percent >= 0 and min_percent <= 100),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_assessment_definitions_subject on public.assessment_definitions (subject_id);
create index if not exists idx_assessment_definitions_owner on public.assessment_definitions (owner_id);
create index if not exists idx_assessment_results_definition on public.assessment_results (assessment_definition_id);
create index if not exists idx_assessment_results_student on public.assessment_results (student_id);
create index if not exists idx_grade_boundaries_owner on public.grade_boundaries (owner_id);
create index if not exists idx_grade_boundaries_subject on public.grade_boundaries (subject_id);

drop trigger if exists set_assessment_definitions_updated_at on public.assessment_definitions;
create trigger set_assessment_definitions_updated_at
before update on public.assessment_definitions
for each row
execute function public.set_updated_at();

drop trigger if exists set_assessment_results_updated_at on public.assessment_results;
create trigger set_assessment_results_updated_at
before update on public.assessment_results
for each row
execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enrollments_class_student_unique'
  ) then
    alter table public.enrollments
      add constraint enrollments_class_student_unique unique (class_id, student_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessment_results_definition_student_unique'
  ) then
    alter table public.assessment_results
      add constraint assessment_results_definition_student_unique
      unique (assessment_definition_id, student_id);
  end if;
end $$;

create unique index if not exists grade_boundaries_default_unique
on public.grade_boundaries (owner_id, grade)
where subject_id is null;

create unique index if not exists grade_boundaries_subject_unique
on public.grade_boundaries (owner_id, subject_id, grade)
where subject_id is not null;

alter table public.assessment_definitions enable row level security;
alter table public.assessment_results enable row level security;
alter table public.grade_boundaries enable row level security;

drop policy if exists "assessment_definitions_select_own" on public.assessment_definitions;
create policy "assessment_definitions_select_own"
on public.assessment_definitions for select
using (owner_id = auth.uid());

drop policy if exists "assessment_definitions_insert_own" on public.assessment_definitions;
create policy "assessment_definitions_insert_own"
on public.assessment_definitions for insert
with check (owner_id = auth.uid());

drop policy if exists "assessment_definitions_update_own" on public.assessment_definitions;
create policy "assessment_definitions_update_own"
on public.assessment_definitions for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "assessment_definitions_delete_own" on public.assessment_definitions;
create policy "assessment_definitions_delete_own"
on public.assessment_definitions for delete
using (owner_id = auth.uid());

drop policy if exists "assessment_results_select_own" on public.assessment_results;
create policy "assessment_results_select_own"
on public.assessment_results for select
using (owner_id = auth.uid());

drop policy if exists "assessment_results_insert_own" on public.assessment_results;
create policy "assessment_results_insert_own"
on public.assessment_results for insert
with check (owner_id = auth.uid());

drop policy if exists "assessment_results_update_own" on public.assessment_results;
create policy "assessment_results_update_own"
on public.assessment_results for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "assessment_results_delete_own" on public.assessment_results;
create policy "assessment_results_delete_own"
on public.assessment_results for delete
using (owner_id = auth.uid());

drop policy if exists "grade_boundaries_select_own" on public.grade_boundaries;
create policy "grade_boundaries_select_own"
on public.grade_boundaries for select
using (owner_id = auth.uid());

drop policy if exists "grade_boundaries_insert_own" on public.grade_boundaries;
create policy "grade_boundaries_insert_own"
on public.grade_boundaries for insert
with check (owner_id = auth.uid());

drop policy if exists "grade_boundaries_update_own" on public.grade_boundaries;
create policy "grade_boundaries_update_own"
on public.grade_boundaries for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "grade_boundaries_delete_own" on public.grade_boundaries;
create policy "grade_boundaries_delete_own"
on public.grade_boundaries for delete
using (owner_id = auth.uid());
