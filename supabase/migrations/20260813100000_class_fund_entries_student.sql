alter table public.class_fund_entries
  add column if not exists student_id uuid references public.students (id) on delete set null;

create index if not exists idx_class_fund_entries_student
  on public.class_fund_entries (student_id);

drop policy if exists "class_fund_entries_insert_own" on public.class_fund_entries;
create policy "class_fund_entries_insert_own"
on public.class_fund_entries for insert
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.classes
    where classes.id = class_fund_entries.class_id
      and classes.owner_id = auth.uid()
  )
  and (
    class_fund_entries.student_id is null
    or exists (
      select 1 from public.students
      where students.id = class_fund_entries.student_id
        and students.owner_id = auth.uid()
    )
  )
);

drop policy if exists "class_fund_entries_update_own" on public.class_fund_entries;
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
  and (
    class_fund_entries.student_id is null
    or exists (
      select 1 from public.students
      where students.id = class_fund_entries.student_id
        and students.owner_id = auth.uid()
    )
  )
);
