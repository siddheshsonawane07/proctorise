-- Managing what already exists: a teacher cancels, edits, copies and deletes tests, edits, hands
-- over and deletes a class; a student leaves one; the admin only administers (ADR 012). Every
-- rule is here, not in the browser (rule 5).

-- ── The admin only administers ───────────────────────────────────────────────────────────

-- Until now the admin counted as an approved teacher. No longer: the admin approves teachers,
-- sees every class and can hand one over or delete it, and teaches nothing.
create or replace function public.is_approved_teacher() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'teacher' and teacher_status = 'approved'
  );
$$;

create or replace function public.add_co_teacher(p_class_id uuid, p_email text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_teacher uuid;
begin
  if not public.is_class_owner(p_class_id) then
    raise exception 'Only the class owner can add teachers' using errcode = '42501';
  end if;
  select p.id into v_teacher
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
    and p.role = 'teacher' and p.teacher_status = 'approved';
  if v_teacher is null then
    raise exception 'No approved teacher has that email' using errcode = 'P0002';
  end if;
  insert into public.class_teachers (class_id, teacher_id, kind)
  values (p_class_id, v_teacher, 'co_teacher')
  on conflict (class_id, teacher_id) do nothing;
  perform public.write_audit('class.co_teacher_added', 'class', p_class_id::text,
    jsonb_build_object('teacher_id', v_teacher));
end;
$$;

create function public.admin_list_classes()
returns table (
  id uuid, name text, archived_at timestamptz, created_at timestamptz,
  owner_name text, owner_email text, students integer, tests integer
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the admin can list every class' using errcode = '42501';
  end if;
  return query
    select c.id, c.name, c.archived_at, c.created_at, p.full_name, u.email::text,
      (select count(*)::integer from public.class_members m
       where m.class_id = c.id and m.status = 'active'),
      (select count(*)::integer from public.tests t where t.class_id = c.id)
    from public.classes c
    left join public.class_teachers ct on ct.class_id = c.id and ct.kind = 'owner'
    left join public.profiles p on p.id = ct.teacher_id
    left join auth.users u on u.id = ct.teacher_id
    order by c.created_at desc;
end;
$$;

-- ── Snapshots of deleted tests ───────────────────────────────────────────────────────────

-- Deleting a test or a class deletes its evidence rows with it, and the files in Storage would
-- stay behind with nothing pointing at them. Every deleted row's path waits here for the daily
-- job, which removes the file through the Storage API (Phase-8-Critic #2).
create table public.evidence_purge (
  path text primary key,
  queued_at timestamptz not null default now()
);
alter table public.evidence_purge enable row level security;
revoke all on public.evidence_purge from anon, authenticated;

create function public.queue_evidence_purge() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.evidence_purge (path) values (old.path) on conflict do nothing;
  return old;
end;
$$;

create trigger evidence_queue_purge
after delete on public.evidence
for each row execute function public.queue_evidence_purge();

-- The job already asks for these and forgets them, so the queue rides along: no change to the
-- Edge Function.
create or replace function public.expired_evidence(p_limit integer default 500)
returns table (path text)
language sql stable security definer set search_path = ''
as $$
  (select q.path from public.evidence_purge q order by q.queued_at limit p_limit)
  union
  (select e.path
   from public.evidence e
   join public.attempts a on a.id = e.attempt_id
   join public.tests t on t.id = a.test_id
   where a.status <> 'in_progress'
     and coalesce(a.submitted_at, a.deadline_at) + make_interval(days => t.retention_days) < now()
   order by e.created_at
   limit p_limit)
  limit p_limit;
$$;

create or replace function public.forget_evidence(p_paths text[]) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.proctor_events set snapshot_path = null where snapshot_path = any (p_paths);
  -- The trigger queues each deleted row; the files are already gone, so the queue is cleared too.
  delete from public.evidence where path = any (p_paths);
  delete from public.evidence_purge where path = any (p_paths);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── Classes ──────────────────────────────────────────────────────────────────────────────

alter table public.classes
  add column description text not null default '' check (char_length(description) <= 500);
grant update (description) on public.classes to authenticated;

-- A student may come back after leaving; a teacher of the class does not join it as a student,
-- and the admin joins nothing.
create or replace function public.join_class(p_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_class public.classes;
  v_member public.class_members;
begin
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Sign in to join a class' using errcode = '42501';
  end if;
  if public.is_admin() then
    raise exception 'The admin account does not join classes' using errcode = '42501';
  end if;
  if (select count(*) from public.join_failures
      where user_id = v_uid and at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('joined', false, 'reason', 'too_many');
  end if;

  select * into v_class from public.classes
  where join_code = upper(replace(trim(p_code), ' ', ''));
  if not found or not v_class.join_open or v_class.archived_at is not null then
    insert into public.join_failures (user_id) values (v_uid);
    return jsonb_build_object('joined', false, 'reason', 'no_match');
  end if;

  if exists (select 1 from public.class_teachers
             where class_id = v_class.id and teacher_id = v_uid) then
    return jsonb_build_object('joined', false, 'reason', 'teacher');
  end if;

  select * into v_member from public.class_members
  where class_id = v_class.id and student_id = v_uid;
  if found and v_member.status = 'removed' then
    return jsonb_build_object('joined', false, 'reason', 'removed');
  end if;

  insert into public.class_members (class_id, student_id)
  values (v_class.id, v_uid)
  on conflict (class_id, student_id) do update set status = 'active';
  return jsonb_build_object('joined', true, 'class_id', v_class.id, 'name', v_class.name);
end;
$$;

-- Their attempts and results stay with the teacher; they stop seeing the class and its tests.
create function public.leave_class(p_class_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if exists (select 1 from public.attempts a join public.tests t on t.id = a.test_id
             where t.class_id = p_class_id and a.student_id = v_uid
               and a.status = 'in_progress') then
    raise exception 'Hand in the test you are taking first' using errcode = 'P0001';
  end if;
  update public.class_members set status = 'left'
  where class_id = p_class_id and student_id = v_uid and status = 'active';
  if not found then
    raise exception 'You are not in this class' using errcode = 'P0002';
  end if;
  perform public.write_audit('class.member_left', 'class', p_class_id::text);
end;
$$;

-- The owner removes a co-teacher, or a co-teacher removes themselves.
create or replace function public.remove_co_teacher(p_class_id uuid, p_teacher_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.is_class_owner(p_class_id) or p_teacher_id = (select auth.uid())) then
    raise exception 'Only the class owner can remove teachers' using errcode = '42501';
  end if;
  delete from public.class_teachers
  where class_id = p_class_id and teacher_id = p_teacher_id and kind = 'co_teacher';
  if not found then
    raise exception 'That person is not a co-teacher of this class' using errcode = 'P0002';
  end if;
  perform public.write_audit('class.co_teacher_removed', 'class', p_class_id::text,
    jsonb_build_object('teacher_id', p_teacher_id));
end;
$$;

-- Hands the class to another approved teacher: by its owner, who stays on as a co-teacher, or by
-- the admin (a teacher who has left the school).
create function public.transfer_class(p_class_id uuid, p_email text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_new uuid;
  v_old uuid;
begin
  if not (public.is_class_owner(p_class_id) or public.is_admin()) then
    raise exception 'Only the class owner can hand over this class' using errcode = '42501';
  end if;
  if not exists (select 1 from public.classes where id = p_class_id) then
    raise exception 'No such class' using errcode = 'P0002';
  end if;
  select p.id into v_new
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
    and p.role = 'teacher' and p.teacher_status = 'approved';
  if v_new is null then
    raise exception 'No approved teacher has that email' using errcode = 'P0002';
  end if;
  select teacher_id into v_old from public.class_teachers
  where class_id = p_class_id and kind = 'owner' for update;
  if v_old = v_new then
    raise exception 'They already own this class' using errcode = 'P0001';
  end if;

  -- One owner per class: the old one steps down before the new one steps up. An owner who is
  -- now the admin (classes made before ADR 012) leaves altogether.
  delete from public.class_teachers t
  where t.class_id = p_class_id and t.teacher_id = v_old
    and exists (select 1 from public.profiles p where p.id = v_old and p.role = 'admin');
  update public.class_teachers set kind = 'co_teacher'
  where class_id = p_class_id and teacher_id = v_old;
  insert into public.class_teachers (class_id, teacher_id, kind)
  values (p_class_id, v_new, 'owner')
  on conflict (class_id, teacher_id) do update set kind = 'owner';
  perform public.write_audit('class.transferred', 'class', p_class_id::text,
    jsonb_build_object('from', v_old, 'to', v_new));
end;
$$;

-- Deletes the class with its tests, attempts, results and flags. Not while a student is mid-test.
create function public.delete_class(p_class_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_class public.classes;
begin
  select * into v_class from public.classes where id = p_class_id for update;
  if not found or not (public.is_class_owner(p_class_id) or public.is_admin()) then
    raise exception 'Only the class owner can delete this class' using errcode = '42501';
  end if;
  if exists (select 1 from public.attempts a join public.tests t on t.id = a.test_id
             where t.class_id = p_class_id and a.status = 'in_progress') then
    raise exception 'A student is taking a test in this class right now. Cancel that test first'
      using errcode = 'P0001';
  end if;
  perform public.write_audit('class.deleted', 'class', p_class_id::text, jsonb_build_object(
    'name', v_class.name,
    'tests', (select count(*) from public.tests where class_id = p_class_id),
    'students', (select count(*) from public.class_members where class_id = p_class_id)));
  delete from public.classes where id = p_class_id;
end;
$$;

-- ── Tests ────────────────────────────────────────────────────────────────────────────────

-- A published test's details (title, instructions, window, time, attempts, results) stay
-- editable. Its questions were frozen at publish, and its proctoring settings are frozen here:
-- students agreed to them when they started.
drop policy "Teachers edit drafts" on public.tests;
create policy "Teachers edit their classes' tests"
on public.tests for update to authenticated
using (public.is_class_teacher(class_id))
with check (public.is_class_teacher(class_id));

create function public.guard_published_test() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_changes jsonb;
begin
  -- Drafts are free, and publishing or unpublishing has its own function and audit row.
  if old.status = 'draft' or new.status = 'draft' then
    return new;
  end if;
  if new.proctoring is distinct from old.proctoring then
    raise exception 'Proctoring settings can''t change once a test is published'
      using errcode = 'P0001';
  end if;
  select jsonb_object_agg(n.key, jsonb_build_array(o.value, n.value)) into v_changes
  from jsonb_each(to_jsonb(new)) n
  join jsonb_each(to_jsonb(old)) o on o.key = n.key
  where n.value is distinct from o.value
    and n.key not in ('status', 'published_at', 'results_released_at', 'updated_at');
  if v_changes is not null then
    perform public.write_audit('test.edited', 'test', new.id::text, v_changes);
  end if;
  return new;
end;
$$;

create trigger tests_guard_published
before update on public.tests
for each row execute function public.guard_published_test();

-- Calls the test off: no one can start it, and anyone taking it is handed in as they stand.
-- Attempts and results are kept; reopen_test undoes it.
create function public.cancel_test(p_test_id uuid) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_test public.tests;
  v_id uuid;
  v_count integer := 0;
begin
  select * into v_test from public.tests where id = p_test_id for update;
  if not found or not public.is_class_teacher(v_test.class_id) then
    raise exception 'Only a teacher of this class can cancel this test' using errcode = '42501';
  end if;
  if v_test.status <> 'published' then
    raise exception 'Only a published test can be cancelled' using errcode = 'P0001';
  end if;
  update public.tests set status = 'closed' where id = p_test_id;
  for v_id in
    select id from public.attempts where test_id = p_test_id and status = 'in_progress' for update
  loop
    perform public.finish_attempt(v_id, 'terminated');
    perform realtime.send(jsonb_build_object('reason', 'Your teacher cancelled this test'),
      'ended', 'attempt:' || v_id::text, true);
    v_count := v_count + 1;
  end loop;
  perform public.write_audit('test.cancelled', 'test', p_test_id::text,
    jsonb_build_object('ended', v_count));
  return v_count;
end;
$$;

create function public.reopen_test(p_test_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_test public.tests;
begin
  select * into v_test from public.tests where id = p_test_id for update;
  if not found or not public.is_class_teacher(v_test.class_id) then
    raise exception 'Only a teacher of this class can reopen this test' using errcode = '42501';
  end if;
  if v_test.status <> 'closed' then
    raise exception 'This test is not cancelled' using errcode = 'P0001';
  end if;
  update public.tests set status = 'published' where id = p_test_id;
  perform public.write_audit('test.reopened', 'test', p_test_id::text);
end;
$$;

-- Deletes the test with its attempts, results and flags (the bank's questions stay). Not while a
-- student is taking it: cancel it first.
create function public.delete_test(p_test_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_test public.tests;
begin
  select * into v_test from public.tests where id = p_test_id for update;
  if not found or not public.is_class_teacher(v_test.class_id) then
    raise exception 'Only a teacher of this class can delete this test' using errcode = '42501';
  end if;
  if exists (select 1 from public.attempts
             where test_id = p_test_id and status = 'in_progress') then
    raise exception 'A student is taking this test right now. Cancel it first'
      using errcode = 'P0001';
  end if;
  perform public.write_audit('test.deleted', 'test', p_test_id::text, jsonb_build_object(
    'title', v_test.title, 'class_id', v_test.class_id, 'status', v_test.status,
    'attempts', (select count(*) from public.attempts where test_id = p_test_id)));
  delete from public.tests where id = p_test_id;
end;
$$;

-- A new draft in the same class with the same settings and questions, and a fresh window.
create function public.duplicate_test(p_test_id uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_test public.tests;
  v_id uuid;
begin
  select * into v_test from public.tests where id = p_test_id;
  if not found or not public.is_class_teacher(v_test.class_id) then
    raise exception 'Only a teacher of this class can copy this test' using errcode = '42501';
  end if;
  insert into public.tests (class_id, title, instructions, duration_min, max_attempts,
    shuffle_items, shuffle_options, results_release, reveal_answers, proctoring, retention_days)
  values (v_test.class_id, left('Copy of ' || v_test.title, 200), v_test.instructions,
    v_test.duration_min, v_test.max_attempts, v_test.shuffle_items, v_test.shuffle_options,
    v_test.results_release, v_test.reveal_answers, v_test.proctoring, v_test.retention_days)
  returning id into v_id;
  insert into public.test_questions (test_id, question_id, position, points)
  select v_id, question_id, position, points
  from public.test_questions where test_id = p_test_id;
  perform public.write_audit('test.duplicated', 'test', v_id::text,
    jsonb_build_object('from', p_test_id));
  return v_id;
end;
$$;

-- A cancelled test's results can still be released.
create or replace function public.release_results(p_test_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.test_class(p_test_id)) then
    raise exception 'Only a teacher of this class can release results' using errcode = '42501';
  end if;
  update public.tests set results_released_at = coalesce(results_released_at, now())
  where id = p_test_id and status <> 'draft';
  perform public.write_audit('test.results_released', 'test', p_test_id::text);
end;
$$;

-- As before (20261104000007), and a cancelled test starts no attempt.
create or replace function public.start_attempt(p_test_id uuid, p_session text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_test public.tests;
  v_multiplier numeric;
  v_open public.attempts;
  v_used integer;
  v_id uuid;
begin
  select * into v_test from public.tests where id = p_test_id;
  select time_multiplier into v_multiplier from public.class_members
  where class_id = v_test.class_id and student_id = v_uid and status = 'active';
  if v_test.id is null or v_multiplier is null or v_test.status = 'draft' then
    raise exception 'This test is not open to you' using errcode = '42501';
  end if;
  if v_test.status = 'closed' then
    raise exception 'Your teacher cancelled this test' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_session), '') = '' then
    raise exception 'Missing browser session' using errcode = '22023';
  end if;

  -- One start at a time per student and test (Phase-4-Critic #6).
  perform pg_advisory_xact_lock(hashtextextended(p_test_id::text || v_uid::text, 0));

  select * into v_open from public.attempts
  where test_id = p_test_id and student_id = v_uid and status = 'in_progress';
  if found and now() > v_open.deadline_at + interval '30 seconds' then
    perform public.finish_attempt(v_open.id, 'auto_submitted');
    v_open := null;
  end if;

  if v_open.id is not null then
    if v_open.primary_session <> p_session then
      perform public.write_audit('attempt.opened_elsewhere', 'attempt', v_open.id::text);
    end if;
    return public.attempt_payload(v_open.id);
  end if;

  if now() < v_test.opens_at or now() >= v_test.closes_at then
    raise exception 'This test is not open right now' using errcode = 'P0001';
  end if;
  select count(*) into v_used from public.attempts where test_id = p_test_id and student_id = v_uid;
  if v_used >= v_test.max_attempts then
    raise exception 'You have used all your attempts at this test' using errcode = 'P0001';
  end if;

  insert into public.attempts (test_id, student_id, attempt_no, deadline_at, item_order,
                               option_orders, primary_session)
  select p_test_id, v_uid, v_used + 1,
    least(now() + make_interval(secs => v_test.duration_min * 60 * v_multiplier), v_test.closes_at),
    array(select id from public.test_items where test_id = p_test_id
          order by case when v_test.shuffle_items then random() end, position),
    case when v_test.shuffle_options then coalesce((
      select jsonb_object_agg(i.id, (
        select jsonb_agg(o ->> 'id' order by random()) from jsonb_array_elements(i.options) o))
      from public.test_items i
      where i.test_id = p_test_id and i.type in ('single', 'multiple')
    ), '{}'::jsonb) else '{}'::jsonb end,
    p_session
  returning id into v_id;

  return public.attempt_payload(v_id);
end;
$$;

-- ── Rights ───────────────────────────────────────────────────────────────────────────────

revoke execute on function
  public.admin_list_classes(), public.leave_class(uuid), public.transfer_class(uuid, text),
  public.delete_class(uuid), public.cancel_test(uuid), public.reopen_test(uuid),
  public.delete_test(uuid), public.duplicate_test(uuid)
  from public, anon;
grant execute on function
  public.admin_list_classes(), public.leave_class(uuid), public.transfer_class(uuid, text),
  public.delete_class(uuid), public.cancel_test(uuid), public.reopen_test(uuid),
  public.delete_test(uuid), public.duplicate_test(uuid)
  to authenticated;
revoke execute on function public.queue_evidence_purge(), public.guard_published_test()
  from public, anon, authenticated;
