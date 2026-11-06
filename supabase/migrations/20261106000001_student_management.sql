-- Phase 9.3: student management for a class's teachers. Bulk changes, one student's record, and the
-- class's marks for export. Every function checks the caller teaches the class (rule 5).

-- Several students at once, in one transaction: one bad id and nothing changes. A null status or
-- time multiplier keeps each student's own. set_member writes the audit row for each.
create function public.set_members(
  p_class_id uuid, p_student_ids uuid[], p_status public.member_status, p_time_multiplier numeric
) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_member public.class_members;
  v_ids uuid[] := (select array_agg(distinct x) from unnest(p_student_ids) x);
  v_count integer := 0;
begin
  if not public.is_class_teacher(p_class_id) then
    raise exception 'Only a teacher of this class can change its students' using errcode = '42501';
  end if;
  if coalesce(cardinality(v_ids), 0) = 0 then
    return 0;
  end if;
  if cardinality(v_ids) > 500 then
    raise exception 'Change at most 500 students at a time' using errcode = '22023';
  end if;
  if (select count(*) from public.class_members
      where class_id = p_class_id and student_id = any (v_ids)) <> cardinality(v_ids) then
    raise exception 'One of those students is not in this class' using errcode = 'P0002';
  end if;
  for v_member in
    select * from public.class_members
    where class_id = p_class_id and student_id = any (v_ids)
    order by student_id
  loop
    perform public.set_member(p_class_id, v_member.student_id,
      coalesce(p_status, v_member.status),
      coalesce(p_time_multiplier, v_member.time_multiplier));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- One student's record in a class: every test, their latest attempt at it, and its flags.
create function public.class_student_report(p_class_id uuid, p_student_id uuid)
returns table (
  test_id uuid, title text, test_status public.test_status, closes_at timestamptz,
  attempt_id uuid, attempt_status public.attempt_status, submitted_at timestamptz,
  score numeric, max_score numeric, integrity public.integrity_status,
  high_flags bigint, warn_flags bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(p_class_id) then
    raise exception 'Only a teacher of this class can see its students' using errcode = '42501';
  end if;
  if not exists (select 1 from public.class_members
                 where class_id = p_class_id and student_id = p_student_id) then
    raise exception 'That student is not in this class' using errcode = 'P0002';
  end if;
  return query
    select t.id, t.title, t.status, t.closes_at,
      a.id, a.status, a.submitted_at, a.score, a.max_score, a.integrity,
      (select count(*) from public.proctor_events e where e.attempt_id = a.id and e.severity = 'high'),
      (select count(*) from public.proctor_events e where e.attempt_id = a.id and e.severity = 'warn')
    from public.tests t
    left join lateral (
      select * from public.attempts x
      where x.test_id = t.id and x.student_id = p_student_id
      order by x.attempt_no desc limit 1
    ) a on true
    where t.class_id = p_class_id and t.status <> 'draft'
    order by t.closes_at desc;
end;
$$;

-- The class's marks, one row per student and published test (latest attempt), for the export.
create function public.class_marks(p_class_id uuid)
returns table (student_id uuid, test_id uuid, score numeric, max_score numeric,
               attempt_status public.attempt_status)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(p_class_id) then
    raise exception 'Only a teacher of this class can see its marks' using errcode = '42501';
  end if;
  return query
    select distinct on (a.student_id, a.test_id)
      a.student_id, a.test_id, a.score, a.max_score, a.status
    from public.attempts a
    join public.tests t on t.id = a.test_id
    join public.class_members m on m.class_id = t.class_id and m.student_id = a.student_id
    where t.class_id = p_class_id
    order by a.student_id, a.test_id, a.attempt_no desc;
end;
$$;

revoke execute on function
  public.set_members(uuid, uuid[], public.member_status, numeric),
  public.class_student_report(uuid, uuid),
  public.class_marks(uuid)
  from public, anon;
grant execute on function
  public.set_members(uuid, uuid[], public.member_status, numeric),
  public.class_student_report(uuid, uuid),
  public.class_marks(uuid)
  to authenticated;
