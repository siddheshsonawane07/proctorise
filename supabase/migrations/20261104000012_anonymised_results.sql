-- Phase 8 § 8.1 step 4: deleting an account keeps the teacher's results, without the person.
-- Attempts no longer cascade with the profile; they lose their student (null) instead. Their
-- snapshots are still deleted first by the maintenance job (accounts_to_delete), and every policy
-- compares student_id with auth.uid(), which a null never equals.

alter table public.attempts alter column student_id drop not null;
alter table public.attempts drop constraint attempts_student_id_fkey;
alter table public.attempts add constraint attempts_student_id_fkey
  foreign key (student_id) references public.profiles (id) on delete set null;

create or replace function public.test_results(p_test_id uuid)
returns table (
  attempt_id uuid, student_id uuid, full_name text, email text, attempt_no integer,
  status public.attempt_status, started_at timestamptz, submitted_at timestamptz,
  score numeric, max_score numeric, to_mark integer, integrity public.integrity_status
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.test_class(p_test_id)) then
    raise exception 'Only a teacher of this class can see its results' using errcode = '42501';
  end if;
  return query
    select a.id, a.student_id, coalesce(p.full_name, 'Deleted student'), coalesce(u.email::text, ''),
           a.attempt_no, a.status, a.started_at, a.submitted_at, a.score, a.max_score,
           (select count(*)::integer from public.answers ans
            where ans.attempt_id = a.id and ans.points_awarded is null
              and a.status <> 'in_progress'),
           a.integrity
    from public.attempts a
    left join public.profiles p on p.id = a.student_id
    left join auth.users u on u.id = a.student_id
    where a.test_id = p_test_id
    order by p.full_name nulls last, a.attempt_no;
end;
$$;

create or replace function public.live_overview(p_test_id uuid)
returns table (
  attempt_id uuid, student_id uuid, full_name text, status public.attempt_status,
  started_at timestamptz, deadline_at timestamptz, integrity public.integrity_status,
  warn_count integer, high_count integer, unreviewed integer,
  last_kind text, last_at timestamptz, phone_paired boolean
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.test_class(p_test_id)) then
    raise exception 'Only a teacher of this class can watch this test' using errcode = '42501';
  end if;
  return query
    select a.id, a.student_id, coalesce(p.full_name, 'Deleted student'), a.status, a.started_at,
      a.deadline_at, a.integrity,
      (select count(*)::integer from public.proctor_events e where e.attempt_id = a.id and e.severity = 'warn'),
      (select count(*)::integer from public.proctor_events e where e.attempt_id = a.id and e.severity = 'high'),
      (select count(*)::integer from public.proctor_events e
       where e.attempt_id = a.id and e.severity <> 'info'
         and not exists (select 1 from public.flag_reviews r where r.event_id = e.id)),
      last.kind, last.started_at,
      exists (select 1 from public.device_pairings dp
              where dp.attempt_id = a.id and dp.claimed_at is not null and dp.revoked_at is null)
    from public.attempts a
    left join public.profiles p on p.id = a.student_id
    left join lateral (
      select e.kind, e.started_at from public.proctor_events e
      where e.attempt_id = a.id and e.severity <> 'info'
      order by e.started_at desc limit 1
    ) last on true
    where a.test_id = p_test_id
    order by p.full_name nulls last, a.attempt_no;
end;
$$;
