-- Phase 4: taking a test. The database holds the clock (deadline_at, set by now()), the answers,
-- the grading and the release of results. The browser only shows them (ARCHITECTURE § 2).

create type public.attempt_status as enum
  ('in_progress', 'submitted', 'auto_submitted', 'terminated', 'voided');
create type public.integrity_status as enum
  ('clean', 'flagged', 'reviewed_ok', 'reviewed_violation');

alter table public.tests
  add column reveal_answers boolean not null default false,
  add column results_released_at timestamptz;
grant update (reveal_answers) on public.tests to authenticated;

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  attempt_no integer not null check (attempt_no >= 1),
  status public.attempt_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  item_order uuid[] not null,
  option_orders jsonb not null default '{}'::jsonb,
  score numeric(8, 2),
  max_score numeric(8, 2),
  integrity public.integrity_status not null default 'clean',
  primary_session text not null,
  unique (test_id, student_id, attempt_no)
);
-- Two tabs cannot both start an attempt (Phase-4-Critic #6).
create unique index one_open_attempt on public.attempts (test_id, student_id)
  where status = 'in_progress';
create index attempts_by_test on public.attempts (test_id);
create index attempts_open_by_deadline on public.attempts (deadline_at)
  where status = 'in_progress';

create table public.answers (
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  item_id uuid not null references public.test_items (id) on delete cascade,
  response jsonb not null,
  saved_at timestamptz not null default now(),
  -- null: not graded yet, or a short answer waiting to be marked by hand.
  points_awarded numeric(6, 2),
  graded_by uuid references public.profiles (id) on delete set null,
  primary key (attempt_id, item_id)
);

alter table public.attempts enable row level security;
alter table public.answers enable row level security;
revoke all on public.attempts, public.answers from anon, authenticated;

-- Scores and points are not in these grants: a student must not see a score before it is
-- released (Phase-4-Critic #7). Teachers read them through test_results and attempt_detail.
grant select (id, test_id, student_id, attempt_no, status, started_at, deadline_at, submitted_at,
              integrity)
  on public.attempts to authenticated;
grant select (attempt_id, item_id, response, saved_at) on public.answers to authenticated;

create policy "A student reads their attempts; teachers read their classes'"
on public.attempts for select to authenticated
using (student_id = (select auth.uid()) or public.is_class_teacher(public.test_class(test_id)));

create policy "A student reads their answers; teachers read their classes'"
on public.answers for select to authenticated
using (exists (
  select 1 from public.attempts a
  where a.id = attempt_id
    and (a.student_id = (select auth.uid()) or public.is_class_teacher(public.test_class(a.test_id)))
));

-- ── Grading ──────────────────────────────────────────────────────────────────────────────

-- Lower case unless asked, Unicode-normalised (so a full-width "Ｈｅｌｌｏ" is "hello"), trimmed,
-- with runs of spaces made one.
create function public.normalise_answer(p_text text, p_case_sensitive boolean) returns text
language sql immutable set search_path = ''
as $$
  select case when p_case_sensitive then v else lower(v) end
  from (select regexp_replace(trim(normalize(p_text, nfkc)), '\s+', ' ', 'g') as v) s;
$$;

-- Points for one answer, or null when a person must mark it (a short answer with no accepted
-- list). Multiple choice is all or nothing: the chosen set must equal the key's.
create function public.score_item(
  p_type public.question_type, p_response jsonb, p_correct jsonb, p_tolerance numeric,
  p_case_sensitive boolean, p_points numeric
) returns numeric
language plpgsql immutable set search_path = ''
as $$
begin
  -- Unanswered is 0, even for a question marked by hand: there is nothing to mark.
  if p_response is null or p_response = 'null'::jsonb then
    return 0;
  end if;
  case p_type
    when 'single', 'true_false' then
      return case when p_response = p_correct then p_points else 0 end;
    when 'multiple' then
      return case when (select array_agg(x order by x) from jsonb_array_elements_text(p_response) x)
                     = (select array_agg(x order by x) from jsonb_array_elements_text(p_correct) x)
                  then p_points else 0 end;
    when 'numeric' then
      return case when jsonb_typeof(p_response) = 'number'
                   and abs((p_response #>> '{}')::numeric - (p_correct #>> '{}')::numeric)
                       <= p_tolerance + 1e-9
                  then p_points else 0 end;
    when 'short_text' then
      if jsonb_array_length(p_correct) = 0 then
        return null;
      end if;
      return case when exists (
        select 1 from jsonb_array_elements_text(p_correct) accepted
        where public.normalise_answer(accepted, p_case_sensitive)
            = public.normalise_answer(p_response #>> '{}', p_case_sensitive)
      ) then p_points else 0 end;
  end case;
end;
$$;

-- (Re)grades every item of one attempt that a machine can grade, keeps marks a teacher gave by
-- hand, and writes the total. Unanswered items count 0 (or wait for marking, if marked by hand).
create function public.grade_attempt(p_attempt_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.answers (attempt_id, item_id, response)
  select p_attempt_id, i.id, 'null'::jsonb
  from public.attempts a
  join public.test_items i on i.test_id = a.test_id
  where a.id = p_attempt_id
  on conflict (attempt_id, item_id) do nothing;

  update public.answers ans
  set points_awarded = public.score_item(i.type, ans.response, k.correct, k.tolerance,
                                         k.case_sensitive, i.points)
  from public.test_items i
  join public.test_item_keys k on k.item_id = i.id
  where ans.attempt_id = p_attempt_id and i.id = ans.item_id and ans.graded_by is null;

  update public.attempts a
  set score = coalesce((select sum(points_awarded) from public.answers where attempt_id = a.id), 0),
      max_score = (select sum(points) from public.test_items where test_id = a.test_id)
  where a.id = p_attempt_id;
end;
$$;

create function public.finish_attempt(p_attempt_id uuid, p_status public.attempt_status)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.attempts set status = p_status, submitted_at = now()
  where id = p_attempt_id and status = 'in_progress';
  perform public.grade_attempt(p_attempt_id);
end;
$$;

-- ── Taking a test ────────────────────────────────────────────────────────────────────────

create function public.check_response(p_type public.question_type, p_options jsonb, p_response jsonb)
returns boolean
language sql immutable set search_path = ''
as $$
  select p_response = 'null'::jsonb or case p_type
    when 'single' then jsonb_typeof(p_response) = 'string'
      and exists (select 1 from jsonb_array_elements(p_options) o where o ->> 'id' = p_response #>> '{}')
    when 'multiple' then jsonb_typeof(p_response) = 'array'
      and jsonb_array_length(p_response) <= jsonb_array_length(p_options)
      and not exists (
        select 1 from jsonb_array_elements(p_response) r
        where jsonb_typeof(r) <> 'string'
           or not exists (select 1 from jsonb_array_elements(p_options) o where o ->> 'id' = r #>> '{}'))
    when 'true_false' then jsonb_typeof(p_response) = 'boolean'
    when 'short_text' then jsonb_typeof(p_response) = 'string' and char_length(p_response #>> '{}') <= 500
    when 'numeric' then jsonb_typeof(p_response) = 'number'
  end;
$$;

-- What the test screen needs for an attempt: the items in this attempt's order, without keys,
-- the saved answers, and the server's clock.
create function public.attempt_payload(p_attempt_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'attempt_id', a.id,
    'test_id', a.test_id,
    'status', a.status,
    'attempt_no', a.attempt_no,
    'started_at', a.started_at,
    'deadline_at', a.deadline_at,
    'server_now', now(),
    'title', t.title,
    'instructions', t.instructions,
    'proctoring', t.proctoring,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'type', i.type, 'prompt', i.prompt, 'points', i.points,
        'options', case when a.option_orders ? i.id::text then (
          select jsonb_agg(o order by array_position(
            array(select jsonb_array_elements_text(a.option_orders -> i.id::text)), o ->> 'id'))
          from jsonb_array_elements(i.options) o
        ) else i.options end
      ) order by array_position(a.item_order, i.id))
      from public.test_items i where i.id = any (a.item_order)
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_object_agg(ans.item_id, ans.response)
      from public.answers ans where ans.attempt_id = a.id and ans.response <> 'null'::jsonb
    ), '{}'::jsonb)
  )
  from public.attempts a
  join public.tests t on t.id = a.test_id
  where a.id = p_attempt_id;
$$;

create function public.start_attempt(p_test_id uuid, p_session text) returns jsonb
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

create function public.save_answer(p_attempt_id uuid, p_item_id uuid, p_response jsonb)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_attempt public.attempts;
  v_item public.test_items;
begin
  -- The same row lock submit_attempt takes, so a save and a submit cannot interleave
  -- (Phase-4-Critic #4).
  select * into v_attempt from public.attempts where id = p_attempt_id for update;
  if not found or v_attempt.student_id <> (select auth.uid()) then
    raise exception 'This is not your attempt' using errcode = '42501';
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'This attempt has already been submitted' using errcode = 'P0001';
  end if;
  if now() > v_attempt.deadline_at + interval '30 seconds' then
    raise exception 'Time is up for this attempt' using errcode = 'P0001';
  end if;
  select * into v_item from public.test_items where id = p_item_id and test_id = v_attempt.test_id;
  if not found then
    raise exception 'That question is not in this test' using errcode = '22023';
  end if;
  if not public.check_response(v_item.type, v_item.options, coalesce(p_response, 'null'::jsonb)) then
    raise exception 'That answer does not fit the question' using errcode = '22023';
  end if;

  insert into public.answers (attempt_id, item_id, response, saved_at)
  values (p_attempt_id, p_item_id, coalesce(p_response, 'null'::jsonb), now())
  on conflict (attempt_id, item_id) do update
  set response = excluded.response, saved_at = excluded.saved_at;
  return now();
end;
$$;

create function public.submit_attempt(p_attempt_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_attempt public.attempts;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id for update;
  if not found or v_attempt.student_id <> (select auth.uid()) then
    raise exception 'This is not your attempt' using errcode = '42501';
  end if;
  if v_attempt.status <> 'in_progress' then
    return; -- Already submitted (by the deadline job, or another tab): nothing to do.
  end if;
  perform public.finish_attempt(p_attempt_id,
    case when now() > v_attempt.deadline_at + interval '30 seconds'
         then 'auto_submitted'::public.attempt_status else 'submitted' end);
end;
$$;

-- Run every minute by pg_cron: what submits a test whose browser was closed.
create function public.finalize_expired_attempts() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.attempts
    where status = 'in_progress' and now() > deadline_at + interval '30 seconds'
    for update skip locked
  loop
    perform public.finish_attempt(v_id, 'auto_submitted');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── Results ──────────────────────────────────────────────────────────────────────────────

create function public.results_visible(p_test public.tests, p_attempt public.attempts)
returns boolean
language sql stable set search_path = ''
as $$
  select p_attempt.status in ('submitted', 'auto_submitted', 'terminated') and case p_test.results_release
    when 'immediate' then true
    when 'manual' then p_test.results_released_at is not null
    when 'after_close' then now() >= p_test.closes_at
  end;
$$;

-- A student's own result: the score once released; each item's points and the right answer
-- only if the teacher chose to reveal them.
create function public.my_result(p_attempt_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_attempt public.attempts;
  v_test public.tests;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id;
  if not found or v_attempt.student_id <> (select auth.uid()) then
    raise exception 'This is not your attempt' using errcode = '42501';
  end if;
  select * into v_test from public.tests where id = v_attempt.test_id;
  if not public.results_visible(v_test, v_attempt) then
    return jsonb_build_object('released', false, 'status', v_attempt.status);
  end if;
  return jsonb_build_object(
    'released', true,
    'status', v_attempt.status,
    'score', v_attempt.score,
    'max_score', v_attempt.max_score,
    'waiting_for_marking', exists (
      select 1 from public.answers where attempt_id = p_attempt_id and points_awarded is null),
    'items', case when v_test.reveal_answers then (
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'prompt', i.prompt, 'type', i.type, 'options', i.options, 'points', i.points,
        'response', ans.response, 'points_awarded', ans.points_awarded, 'correct', k.correct
      ) order by array_position(v_attempt.item_order, i.id))
      from public.test_items i
      join public.test_item_keys k on k.item_id = i.id
      left join public.answers ans on ans.attempt_id = p_attempt_id and ans.item_id = i.id
      where i.test_id = v_attempt.test_id
    ) end
  );
end;
$$;

create function public.test_results(p_test_id uuid)
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
    select a.id, a.student_id, p.full_name, u.email::text, a.attempt_no, a.status, a.started_at,
           a.submitted_at, a.score, a.max_score,
           (select count(*)::integer from public.answers ans
            where ans.attempt_id = a.id and ans.points_awarded is null
              and a.status <> 'in_progress'),
           a.integrity
    from public.attempts a
    join public.profiles p on p.id = a.student_id
    join auth.users u on u.id = a.student_id
    where a.test_id = p_test_id
    order by p.full_name, a.attempt_no;
end;
$$;

create function public.attempt_detail(p_attempt_id uuid) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_attempt public.attempts;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id;
  if not found or not public.is_class_teacher(public.test_class(v_attempt.test_id)) then
    raise exception 'Only a teacher of this class can see this attempt' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'attempt_id', v_attempt.id, 'status', v_attempt.status,
    'score', v_attempt.score, 'max_score', v_attempt.max_score,
    'items', (
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'prompt', i.prompt, 'type', i.type, 'options', i.options, 'points', i.points,
        'response', ans.response, 'points_awarded', ans.points_awarded,
        'marked_by_hand', ans.graded_by is not null, 'correct', k.correct
      ) order by i.position)
      from public.test_items i
      join public.test_item_keys k on k.item_id = i.id
      left join public.answers ans on ans.attempt_id = v_attempt.id and ans.item_id = i.id
      where i.test_id = v_attempt.test_id
    )
  );
end;
$$;

create function public.mark_answer(p_attempt_id uuid, p_item_id uuid, p_points numeric)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_attempt public.attempts;
  v_item public.test_items;
begin
  select * into v_attempt from public.attempts where id = p_attempt_id for update;
  if not found or not public.is_class_teacher(public.test_class(v_attempt.test_id)) then
    raise exception 'Only a teacher of this class can mark this attempt' using errcode = '42501';
  end if;
  if v_attempt.status = 'in_progress' then
    raise exception 'The student is still taking this test' using errcode = 'P0001';
  end if;
  select * into v_item from public.test_items where id = p_item_id and test_id = v_attempt.test_id;
  if not found then
    raise exception 'That question is not in this test' using errcode = '22023';
  end if;
  if p_points < 0 or p_points > v_item.points then
    raise exception 'Give between 0 and % points', v_item.points using errcode = '22023';
  end if;
  insert into public.answers (attempt_id, item_id, response, points_awarded, graded_by)
  values (p_attempt_id, p_item_id, 'null'::jsonb, p_points, (select auth.uid()))
  on conflict (attempt_id, item_id) do update
  set points_awarded = excluded.points_awarded, graded_by = excluded.graded_by;
  perform public.grade_attempt(p_attempt_id);
  perform public.write_audit('attempt.marked', 'attempt', p_attempt_id::text,
    jsonb_build_object('item_id', p_item_id, 'points', p_points));
end;
$$;

-- A wrong key, fixed after the test: every finished attempt is graded again. Marks given by
-- hand are kept.
create function public.fix_item_key(
  p_item_id uuid, p_correct jsonb, p_tolerance numeric default 0, p_case_sensitive boolean default false
) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_item public.test_items;
  v_id uuid;
  v_count integer := 0;
begin
  select * into v_item from public.test_items where id = p_item_id;
  if not found or not public.is_class_teacher(public.test_class(v_item.test_id)) then
    raise exception 'Only a teacher of this class can change this key' using errcode = '42501';
  end if;
  perform public.check_question(v_item.type, v_item.options, p_correct, coalesce(p_tolerance, 0));
  update public.test_item_keys
  set correct = p_correct, tolerance = coalesce(p_tolerance, 0),
      case_sensitive = coalesce(p_case_sensitive, false)
  where item_id = p_item_id;
  for v_id in
    select id from public.attempts where test_id = v_item.test_id and status <> 'in_progress'
  loop
    perform public.grade_attempt(v_id);
    v_count := v_count + 1;
  end loop;
  perform public.write_audit('test.key_fixed', 'test', v_item.test_id::text,
    jsonb_build_object('item_id', p_item_id, 'regraded', v_count));
  return v_count;
end;
$$;

create function public.release_results(p_test_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.test_class(p_test_id)) then
    raise exception 'Only a teacher of this class can release results' using errcode = '42501';
  end if;
  update public.tests set results_released_at = coalesce(results_released_at, now())
  where id = p_test_id and status = 'published';
  perform public.write_audit('test.results_released', 'test', p_test_id::text);
end;
$$;

-- Back to draft only while no one has started the test (completing phase 3's function).
create or replace function public.unpublish_test(p_test_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_test public.tests;
begin
  select * into v_test from public.tests where id = p_test_id for update;
  if not found or not public.is_class_teacher(v_test.class_id) then
    raise exception 'Only a teacher of this class can change this test' using errcode = '42501';
  end if;
  if v_test.status <> 'published' then
    raise exception 'This test is not published' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.attempts where test_id = p_test_id) then
    raise exception 'A student has already started this test, so it can''t go back to a draft'
      using errcode = 'P0001';
  end if;
  delete from public.test_items where test_id = p_test_id;
  update public.tests set status = 'draft', published_at = null where id = p_test_id;
  perform public.write_audit('test.unpublished', 'test', p_test_id::text);
end;
$$;

-- ── Rights ───────────────────────────────────────────────────────────────────────────────

revoke execute on function
  public.start_attempt(uuid, text), public.save_answer(uuid, uuid, jsonb),
  public.submit_attempt(uuid), public.my_result(uuid), public.test_results(uuid),
  public.attempt_detail(uuid), public.mark_answer(uuid, uuid, numeric),
  public.fix_item_key(uuid, jsonb, numeric, boolean), public.release_results(uuid)
  from public, anon;
grant execute on function
  public.start_attempt(uuid, text), public.save_answer(uuid, uuid, jsonb),
  public.submit_attempt(uuid), public.my_result(uuid), public.test_results(uuid),
  public.attempt_detail(uuid), public.mark_answer(uuid, uuid, numeric),
  public.fix_item_key(uuid, jsonb, numeric, boolean), public.release_results(uuid)
  to authenticated;
revoke execute on function
  public.grade_attempt(uuid), public.finish_attempt(uuid, public.attempt_status),
  public.finalize_expired_attempts(), public.attempt_payload(uuid),
  public.results_visible(public.tests, public.attempts),
  public.score_item(public.question_type, jsonb, jsonb, numeric, boolean, numeric),
  public.check_response(public.question_type, jsonb, jsonb),
  public.normalise_answer(text, boolean)
  from public, anon, authenticated;

-- ── The deadline job ─────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
select cron.schedule('finalize-expired-attempts', '* * * * *',
  'select public.finalize_expired_attempts()');
