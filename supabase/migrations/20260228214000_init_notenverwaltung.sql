create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.is_owner(row_teacher_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() = row_teacher_id;
$$;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (student_id),
  unique (class_id, student_id)
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  subject_type text not null default 'normal' check (subject_type in ('normal', 'class_fund')),
  grading_kind text not null default 'grade' check (grading_kind in ('points', 'grade')),
  average_mode text not null default 'mean' check (average_mode in ('mean', 'weighted')),
  default_weight numeric(6,2) not null default 1.00 check (default_weight > 0),
  points_to_grade jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (class_id, name)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  value_number numeric(8,2) not null,
  value_text text,
  weight numeric(6,2) not null default 1.00 check (weight > 0),
  assessed_on date not null default current_date,
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.class_fund_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  entry_type text not null check (entry_type in ('deposit', 'withdrawal')),
  amount numeric(10,2) not null check (amount > 0),
  entry_date date not null default current_date,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_classes_teacher on public.classes (teacher_id);
create index if not exists idx_students_teacher on public.students (teacher_id);
create index if not exists idx_enrollments_class on public.enrollments (class_id);
create index if not exists idx_enrollments_student on public.enrollments (student_id);
create index if not exists idx_subjects_class on public.subjects (class_id);
create index if not exists idx_assessments_class on public.assessments (class_id);
create index if not exists idx_assessments_student on public.assessments (student_id);
create index if not exists idx_assessments_subject on public.assessments (subject_id);
create index if not exists idx_class_fund_entries_class on public.class_fund_entries (class_id);

drop trigger if exists set_classes_updated_at on public.classes;
create trigger set_classes_updated_at
before update on public.classes
for each row
execute function public.set_updated_at();

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at
before update on public.subjects
for each row
execute function public.set_updated_at();

drop trigger if exists set_assessments_updated_at on public.assessments;
create trigger set_assessments_updated_at
before update on public.assessments
for each row
execute function public.set_updated_at();

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.subjects enable row level security;
alter table public.assessments enable row level security;
alter table public.class_fund_entries enable row level security;

drop policy if exists "classes_select_own" on public.classes;
create policy "classes_select_own"
on public.classes for select
using (public.is_owner(teacher_id));

drop policy if exists "classes_insert_own" on public.classes;
create policy "classes_insert_own"
on public.classes for insert
with check (public.is_owner(teacher_id));

drop policy if exists "classes_update_own" on public.classes;
create policy "classes_update_own"
on public.classes for update
using (public.is_owner(teacher_id))
with check (public.is_owner(teacher_id));

drop policy if exists "classes_delete_own" on public.classes;
create policy "classes_delete_own"
on public.classes for delete
using (public.is_owner(teacher_id));

drop policy if exists "students_select_own" on public.students;
create policy "students_select_own"
on public.students for select
using (public.is_owner(teacher_id));

drop policy if exists "students_insert_own" on public.students;
create policy "students_insert_own"
on public.students for insert
with check (public.is_owner(teacher_id));

drop policy if exists "students_update_own" on public.students;
create policy "students_update_own"
on public.students for update
using (public.is_owner(teacher_id))
with check (public.is_owner(teacher_id));

drop policy if exists "students_delete_own" on public.students;
create policy "students_delete_own"
on public.students for delete
using (public.is_owner(teacher_id));

drop policy if exists "enrollments_select_own" on public.enrollments;
create policy "enrollments_select_own"
on public.enrollments for select
using (public.is_owner(teacher_id));

drop policy if exists "enrollments_insert_own" on public.enrollments;
create policy "enrollments_insert_own"
on public.enrollments for insert
with check (public.is_owner(teacher_id));

drop policy if exists "enrollments_update_own" on public.enrollments;
create policy "enrollments_update_own"
on public.enrollments for update
using (public.is_owner(teacher_id))
with check (public.is_owner(teacher_id));

drop policy if exists "enrollments_delete_own" on public.enrollments;
create policy "enrollments_delete_own"
on public.enrollments for delete
using (public.is_owner(teacher_id));

drop policy if exists "subjects_select_own" on public.subjects;
create policy "subjects_select_own"
on public.subjects for select
using (public.is_owner(teacher_id));

drop policy if exists "subjects_insert_own" on public.subjects;
create policy "subjects_insert_own"
on public.subjects for insert
with check (public.is_owner(teacher_id));

drop policy if exists "subjects_update_own" on public.subjects;
create policy "subjects_update_own"
on public.subjects for update
using (public.is_owner(teacher_id))
with check (public.is_owner(teacher_id));

drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_delete_own"
on public.subjects for delete
using (public.is_owner(teacher_id));

drop policy if exists "assessments_select_own" on public.assessments;
create policy "assessments_select_own"
on public.assessments for select
using (public.is_owner(teacher_id));

drop policy if exists "assessments_insert_own" on public.assessments;
create policy "assessments_insert_own"
on public.assessments for insert
with check (public.is_owner(teacher_id));

drop policy if exists "assessments_update_own" on public.assessments;
create policy "assessments_update_own"
on public.assessments for update
using (public.is_owner(teacher_id))
with check (public.is_owner(teacher_id));

drop policy if exists "assessments_delete_own" on public.assessments;
create policy "assessments_delete_own"
on public.assessments for delete
using (public.is_owner(teacher_id));

drop policy if exists "class_fund_entries_select_own" on public.class_fund_entries;
create policy "class_fund_entries_select_own"
on public.class_fund_entries for select
using (public.is_owner(teacher_id));

drop policy if exists "class_fund_entries_insert_own" on public.class_fund_entries;
create policy "class_fund_entries_insert_own"
on public.class_fund_entries for insert
with check (public.is_owner(teacher_id));

drop policy if exists "class_fund_entries_update_own" on public.class_fund_entries;
create policy "class_fund_entries_update_own"
on public.class_fund_entries for update
using (public.is_owner(teacher_id))
with check (public.is_owner(teacher_id));

drop policy if exists "class_fund_entries_delete_own" on public.class_fund_entries;
create policy "class_fund_entries_delete_own"
on public.class_fund_entries for delete
using (public.is_owner(teacher_id));

