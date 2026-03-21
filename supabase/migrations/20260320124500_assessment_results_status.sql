alter table public.assessment_results
  add column if not exists status text not null default 'filled';

update public.assessment_results
set status = 'filled'
where status is null;

alter table public.assessment_results
  drop constraint if exists assessment_results_value_check;

alter table public.assessment_results
  drop constraint if exists assessment_results_status_check;

alter table public.assessment_results
  add constraint assessment_results_status_check
  check (status in ('filled', 'missing', 'excused', 'absent_unexcused', 'makeup_pending', 'exempt'));

alter table public.assessment_results
  drop constraint if exists assessment_results_status_value_check;

alter table public.assessment_results
  add constraint assessment_results_status_value_check
  check (
    (status = 'filled' and (
      (points is not null and grade is null) or
      (points is null and grade is not null)
    )) or
    (status in ('missing', 'excused', 'makeup_pending', 'exempt') and points is null and grade is null) or
    (status = 'absent_unexcused' and grade is null)
  );
