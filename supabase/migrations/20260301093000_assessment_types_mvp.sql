create table if not exists public.assessment_types (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  default_input_mode text not null default 'points' check (default_input_mode in ('points', 'grade', 'either')),
  default_max_points numeric(8,2),
  default_weight_multiplier numeric(6,2) not null default 1.00 check (default_weight_multiplier > 0),
  aggregation_mode text not null default 'mean' check (aggregation_mode in ('mean', 'sum', 'last_n', 'best_n')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.assessment_definitions
  add column if not exists type_id uuid references public.assessment_types (id) on delete set null;

alter table public.assessment_definitions
  add column if not exists include_in_total boolean not null default true;

create index if not exists idx_assessment_types_owner on public.assessment_types (owner_id);
create index if not exists idx_assessment_definitions_type on public.assessment_definitions (type_id);

create unique index if not exists assessment_types_owner_name_unique
on public.assessment_types (owner_id, lower(name));

alter table public.assessment_types enable row level security;

drop policy if exists "assessment_types_select_own" on public.assessment_types;
create policy "assessment_types_select_own"
on public.assessment_types for select
using (owner_id = auth.uid());

drop policy if exists "assessment_types_insert_own" on public.assessment_types;
create policy "assessment_types_insert_own"
on public.assessment_types for insert
with check (owner_id = auth.uid());

drop policy if exists "assessment_types_update_own" on public.assessment_types;
create policy "assessment_types_update_own"
on public.assessment_types for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "assessment_types_delete_own" on public.assessment_types;
create policy "assessment_types_delete_own"
on public.assessment_types for delete
using (owner_id = auth.uid());

insert into public.assessment_types (
  owner_id,
  name,
  default_input_mode,
  default_max_points,
  default_weight_multiplier,
  aggregation_mode
)
select
  users.id,
  seed.name,
  seed.default_input_mode,
  seed.default_max_points,
  seed.default_weight_multiplier,
  seed.aggregation_mode
from auth.users as users
cross join (
  values
    ('Hausübung', 'points', null::numeric, 1.00::numeric, 'mean'),
    ('Mitarbeit', 'grade', null::numeric, 1.00::numeric, 'mean'),
    ('Lernzielkontrolle', 'points', 20.00::numeric, 1.50::numeric, 'mean'),
    ('Zusatzaufgabe', 'points', null::numeric, 0.50::numeric, 'best_n')
) as seed(name, default_input_mode, default_max_points, default_weight_multiplier, aggregation_mode)
on conflict ((owner_id), lower(name)) do nothing;
