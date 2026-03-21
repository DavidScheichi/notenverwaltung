create or replace function public.ensure_matching_owner_teacher_ids()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is null and new.teacher_id is null then
    new.owner_id := auth.uid();
    new.teacher_id := new.owner_id;
  elsif new.owner_id is null then
    new.owner_id := new.teacher_id;
  elsif new.teacher_id is null then
    new.teacher_id := new.owner_id;
  else
    new.teacher_id := new.owner_id;
  end if;

  return new;
end;
$$;

alter table public.classes add column if not exists owner_id uuid;
alter table public.students add column if not exists owner_id uuid;
alter table public.enrollments add column if not exists owner_id uuid;
alter table public.subjects add column if not exists owner_id uuid;
alter table public.assessments add column if not exists owner_id uuid;
alter table public.class_fund_entries add column if not exists owner_id uuid;

update public.classes set owner_id = teacher_id where owner_id is null;
update public.students set owner_id = teacher_id where owner_id is null;
update public.enrollments set owner_id = teacher_id where owner_id is null;
update public.subjects set owner_id = teacher_id where owner_id is null;
update public.assessments set owner_id = teacher_id where owner_id is null;
update public.class_fund_entries set owner_id = teacher_id where owner_id is null;

alter table public.classes alter column teacher_id set default auth.uid();
alter table public.students alter column teacher_id set default auth.uid();
alter table public.enrollments alter column teacher_id set default auth.uid();
alter table public.subjects alter column teacher_id set default auth.uid();
alter table public.assessments alter column teacher_id set default auth.uid();
alter table public.class_fund_entries alter column teacher_id set default auth.uid();

alter table public.classes alter column owner_id set default auth.uid();
alter table public.students alter column owner_id set default auth.uid();
alter table public.enrollments alter column owner_id set default auth.uid();
alter table public.subjects alter column owner_id set default auth.uid();
alter table public.assessments alter column owner_id set default auth.uid();
alter table public.class_fund_entries alter column owner_id set default auth.uid();

alter table public.classes alter column owner_id set not null;
alter table public.students alter column owner_id set not null;
alter table public.enrollments alter column owner_id set not null;
alter table public.subjects alter column owner_id set not null;
alter table public.assessments alter column owner_id set not null;
alter table public.class_fund_entries alter column owner_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'classes_owner_id_fkey'
  ) then
    alter table public.classes
      add constraint classes_owner_id_fkey
      foreign key (owner_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'students_owner_id_fkey'
  ) then
    alter table public.students
      add constraint students_owner_id_fkey
      foreign key (owner_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'enrollments_owner_id_fkey'
  ) then
    alter table public.enrollments
      add constraint enrollments_owner_id_fkey
      foreign key (owner_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subjects_owner_id_fkey'
  ) then
    alter table public.subjects
      add constraint subjects_owner_id_fkey
      foreign key (owner_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'assessments_owner_id_fkey'
  ) then
    alter table public.assessments
      add constraint assessments_owner_id_fkey
      foreign key (owner_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'class_fund_entries_owner_id_fkey'
  ) then
    alter table public.class_fund_entries
      add constraint class_fund_entries_owner_id_fkey
      foreign key (owner_id) references auth.users (id) on delete cascade;
  end if;
end $$;

create index if not exists idx_classes_owner_id on public.classes (owner_id);
create index if not exists idx_students_owner_id on public.students (owner_id);
create index if not exists idx_enrollments_owner_id on public.enrollments (owner_id);
create index if not exists idx_subjects_owner_id on public.subjects (owner_id);
create index if not exists idx_assessments_owner_id on public.assessments (owner_id);
create index if not exists idx_class_fund_entries_owner_id on public.class_fund_entries (owner_id);

drop trigger if exists set_classes_owner_ids on public.classes;
create trigger set_classes_owner_ids
before insert or update on public.classes
for each row
execute function public.ensure_matching_owner_teacher_ids();

drop trigger if exists set_students_owner_ids on public.students;
create trigger set_students_owner_ids
before insert or update on public.students
for each row
execute function public.ensure_matching_owner_teacher_ids();

drop trigger if exists set_enrollments_owner_ids on public.enrollments;
create trigger set_enrollments_owner_ids
before insert or update on public.enrollments
for each row
execute function public.ensure_matching_owner_teacher_ids();

drop trigger if exists set_subjects_owner_ids on public.subjects;
create trigger set_subjects_owner_ids
before insert or update on public.subjects
for each row
execute function public.ensure_matching_owner_teacher_ids();

drop trigger if exists set_assessments_owner_ids on public.assessments;
create trigger set_assessments_owner_ids
before insert or update on public.assessments
for each row
execute function public.ensure_matching_owner_teacher_ids();

drop trigger if exists set_class_fund_entries_owner_ids on public.class_fund_entries;
create trigger set_class_fund_entries_owner_ids
before insert or update on public.class_fund_entries
for each row
execute function public.ensure_matching_owner_teacher_ids();

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.subjects enable row level security;
alter table public.assessments enable row level security;
alter table public.class_fund_entries enable row level security;
alter table public.assessment_definitions enable row level security;
alter table public.assessment_results enable row level security;
alter table public.grade_boundaries enable row level security;
alter table public.assessment_types enable row level security;

alter table public.classes force row level security;
alter table public.students force row level security;
alter table public.enrollments force row level security;
alter table public.subjects force row level security;
alter table public.assessments force row level security;
alter table public.class_fund_entries force row level security;
alter table public.assessment_definitions force row level security;
alter table public.assessment_results force row level security;
alter table public.grade_boundaries force row level security;
alter table public.assessment_types force row level security;

drop policy if exists "classes_select_own" on public.classes;
drop policy if exists "classes_insert_own" on public.classes;
drop policy if exists "classes_update_own" on public.classes;
drop policy if exists "classes_delete_own" on public.classes;
create policy "classes_select_own"
on public.classes for select
using (owner_id = auth.uid());
create policy "classes_insert_own"
on public.classes for insert
with check (owner_id = auth.uid());
create policy "classes_update_own"
on public.classes for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
create policy "classes_delete_own"
on public.classes for delete
using (owner_id = auth.uid());

drop policy if exists "students_select_own" on public.students;
drop policy if exists "students_insert_own" on public.students;
drop policy if exists "students_update_own" on public.students;
drop policy if exists "students_delete_own" on public.students;
create policy "students_select_own"
on public.students for select
using (owner_id = auth.uid());
create policy "students_insert_own"
on public.students for insert
with check (owner_id = auth.uid());
create policy "students_update_own"
on public.students for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
create policy "students_delete_own"
on public.students for delete
using (owner_id = auth.uid());

drop policy if exists "enrollments_select_own" on public.enrollments;
drop policy if exists "enrollments_insert_own" on public.enrollments;
drop policy if exists "enrollments_update_own" on public.enrollments;
drop policy if exists "enrollments_delete_own" on public.enrollments;
create policy "enrollments_select_own"
on public.enrollments for select
using (owner_id = auth.uid());
create policy "enrollments_insert_own"
on public.enrollments for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = enrollments.class_id
      and classes.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.students
    where students.id = enrollments.student_id
      and students.owner_id = auth.uid()
  )
);
create policy "enrollments_update_own"
on public.enrollments for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = enrollments.class_id
      and classes.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.students
    where students.id = enrollments.student_id
      and students.owner_id = auth.uid()
  )
);
create policy "enrollments_delete_own"
on public.enrollments for delete
using (owner_id = auth.uid());

drop policy if exists "subjects_select_own" on public.subjects;
drop policy if exists "subjects_insert_own" on public.subjects;
drop policy if exists "subjects_update_own" on public.subjects;
drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_select_own"
on public.subjects for select
using (owner_id = auth.uid());
create policy "subjects_insert_own"
on public.subjects for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = subjects.class_id
      and classes.owner_id = auth.uid()
  )
);
create policy "subjects_update_own"
on public.subjects for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = subjects.class_id
      and classes.owner_id = auth.uid()
  )
);
create policy "subjects_delete_own"
on public.subjects for delete
using (owner_id = auth.uid());

drop policy if exists "assessments_select_own" on public.assessments;
drop policy if exists "assessments_insert_own" on public.assessments;
drop policy if exists "assessments_update_own" on public.assessments;
drop policy if exists "assessments_delete_own" on public.assessments;
create policy "assessments_select_own"
on public.assessments for select
using (owner_id = auth.uid());
create policy "assessments_insert_own"
on public.assessments for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = assessments.class_id
      and classes.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.students
    where students.id = assessments.student_id
      and students.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.subjects
    where subjects.id = assessments.subject_id
      and subjects.owner_id = auth.uid()
  )
);
create policy "assessments_update_own"
on public.assessments for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = assessments.class_id
      and classes.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.students
    where students.id = assessments.student_id
      and students.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.subjects
    where subjects.id = assessments.subject_id
      and subjects.owner_id = auth.uid()
  )
);
create policy "assessments_delete_own"
on public.assessments for delete
using (owner_id = auth.uid());

drop policy if exists "class_fund_entries_select_own" on public.class_fund_entries;
drop policy if exists "class_fund_entries_insert_own" on public.class_fund_entries;
drop policy if exists "class_fund_entries_update_own" on public.class_fund_entries;
drop policy if exists "class_fund_entries_delete_own" on public.class_fund_entries;
create policy "class_fund_entries_select_own"
on public.class_fund_entries for select
using (owner_id = auth.uid());
create policy "class_fund_entries_insert_own"
on public.class_fund_entries for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = class_fund_entries.class_id
      and classes.owner_id = auth.uid()
  )
);
create policy "class_fund_entries_update_own"
on public.class_fund_entries for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = class_fund_entries.class_id
      and classes.owner_id = auth.uid()
  )
);
create policy "class_fund_entries_delete_own"
on public.class_fund_entries for delete
using (owner_id = auth.uid());

drop policy if exists "assessment_definitions_select_own" on public.assessment_definitions;
drop policy if exists "assessment_definitions_insert_own" on public.assessment_definitions;
drop policy if exists "assessment_definitions_update_own" on public.assessment_definitions;
drop policy if exists "assessment_definitions_delete_own" on public.assessment_definitions;
create policy "assessment_definitions_select_own"
on public.assessment_definitions for select
using (owner_id = auth.uid());
create policy "assessment_definitions_insert_own"
on public.assessment_definitions for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.subjects
    where subjects.id = assessment_definitions.subject_id
      and subjects.owner_id = auth.uid()
  )
  and (
    assessment_definitions.type_id is null
    or exists (
      select 1 from public.assessment_types
      where assessment_types.id = assessment_definitions.type_id
        and assessment_types.owner_id = auth.uid()
    )
  )
);
create policy "assessment_definitions_update_own"
on public.assessment_definitions for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.subjects
    where subjects.id = assessment_definitions.subject_id
      and subjects.owner_id = auth.uid()
  )
  and (
    assessment_definitions.type_id is null
    or exists (
      select 1 from public.assessment_types
      where assessment_types.id = assessment_definitions.type_id
        and assessment_types.owner_id = auth.uid()
    )
  )
);
create policy "assessment_definitions_delete_own"
on public.assessment_definitions for delete
using (owner_id = auth.uid());

drop policy if exists "assessment_results_select_own" on public.assessment_results;
drop policy if exists "assessment_results_insert_own" on public.assessment_results;
drop policy if exists "assessment_results_update_own" on public.assessment_results;
drop policy if exists "assessment_results_delete_own" on public.assessment_results;
create policy "assessment_results_select_own"
on public.assessment_results for select
using (owner_id = auth.uid());
create policy "assessment_results_insert_own"
on public.assessment_results for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.assessment_definitions
    where assessment_definitions.id = assessment_results.assessment_definition_id
      and assessment_definitions.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.students
    where students.id = assessment_results.student_id
      and students.owner_id = auth.uid()
  )
);
create policy "assessment_results_update_own"
on public.assessment_results for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.assessment_definitions
    where assessment_definitions.id = assessment_results.assessment_definition_id
      and assessment_definitions.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.students
    where students.id = assessment_results.student_id
      and students.owner_id = auth.uid()
  )
);
create policy "assessment_results_delete_own"
on public.assessment_results for delete
using (owner_id = auth.uid());

drop policy if exists "grade_boundaries_select_own" on public.grade_boundaries;
drop policy if exists "grade_boundaries_insert_own" on public.grade_boundaries;
drop policy if exists "grade_boundaries_update_own" on public.grade_boundaries;
drop policy if exists "grade_boundaries_delete_own" on public.grade_boundaries;
create policy "grade_boundaries_select_own"
on public.grade_boundaries for select
using (owner_id = auth.uid());
create policy "grade_boundaries_insert_own"
on public.grade_boundaries for insert
with check (
  owner_id = auth.uid()
  and (
    subject_id is null
    or exists (
      select 1 from public.subjects
      where subjects.id = grade_boundaries.subject_id
        and subjects.owner_id = auth.uid()
    )
  )
);
create policy "grade_boundaries_update_own"
on public.grade_boundaries for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and (
    subject_id is null
    or exists (
      select 1 from public.subjects
      where subjects.id = grade_boundaries.subject_id
        and subjects.owner_id = auth.uid()
    )
  )
);
create policy "grade_boundaries_delete_own"
on public.grade_boundaries for delete
using (owner_id = auth.uid());

drop policy if exists "assessment_types_select_own" on public.assessment_types;
drop policy if exists "assessment_types_insert_own" on public.assessment_types;
drop policy if exists "assessment_types_update_own" on public.assessment_types;
drop policy if exists "assessment_types_delete_own" on public.assessment_types;
create policy "assessment_types_select_own"
on public.assessment_types for select
using (owner_id = auth.uid());
create policy "assessment_types_insert_own"
on public.assessment_types for insert
with check (owner_id = auth.uid());
create policy "assessment_types_update_own"
on public.assessment_types for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
create policy "assessment_types_delete_own"
on public.assessment_types for delete
using (owner_id = auth.uid());
