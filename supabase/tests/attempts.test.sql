-- Phase 4 gate and Phase-4-Critic: the clock is the server's, late saves are refused, a closed
-- browser is still submitted, grading follows the stated rules, and no score or key leaks early.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
-- Item ids by position, kept in settings so a student session (which cannot read test_items)
-- can name them.
create function pg_temp.item(p_position integer) returns uuid language sql as $$
  select current_setting('t.i' || p_position)::uuid;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'teacher@example.test', '{"full_name": "Tia Teacher"}'),
  ('b0000000-0000-0000-0000-000000000001', 'sara@example.test', '{"full_name": "Sara Student"}'),
  ('b0000000-0000-0000-0000-000000000002', 'nik@example.test', '{"full_name": "Nik Student"}'),
  ('b0000000-0000-0000-0000-000000000003', 'out@example.test', '{"full_name": "Out Sider"}');
update public.profiles set role = 'teacher', teacher_status = 'approved'
where id = 'a0000000-0000-0000-0000-000000000001';

-- A class with two students (one with 1.5× time) and a published six-question test.
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select set_config('t.class', public.create_class('Geography')::text, true);
insert into public.tests (class_id, title, duration_min, opens_at, closes_at, max_attempts)
values (current_setting('t.class')::uuid, 'Capitals', 30, now() - interval '1 hour', now() + interval '1 day', 1);
select set_config('t.test', (select id::text from public.tests where title = 'Capitals'), true);
select set_config('t.q0', public.save_question(null, 'single', 'Pick B', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 2, '{}', '"b"')::text, true);
select set_config('t.q1', public.save_question(null, 'multiple', 'Pick A and C', '[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}]', 2, '{}', '["a","c"]')::text, true);
select set_config('t.q2', public.save_question(null, 'numeric', 'Pi', '[]', 1, '{}', '3.14', 0.005)::text, true);
select set_config('t.q3', public.save_question(null, 'short_text', 'Capital of France', '[]', 1, '{}', '["Paris"]')::text, true);
select set_config('t.q4', public.save_question(null, 'short_text', 'Explain', '[]', 3, '{}', '[]')::text, true);
select set_config('t.q5', public.save_question(null, 'true_false', 'True?', '[]', 1, '{}', 'true')::text, true);
insert into public.test_questions (test_id, question_id, position)
select current_setting('t.test')::uuid, current_setting('t.q' || n)::uuid, n from generate_series(0, 5) n;
select public.publish_test(current_setting('t.test')::uuid);

reset role;
select set_config('t.i' || position, id::text, true)
from public.test_items where test_id = current_setting('t.test')::uuid;
insert into public.class_members (class_id, student_id, time_multiplier) values
  (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000001', 1.50),
  (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000002', 1.00);

-- Outsiders and early starts.
select pg_temp.login('b0000000-0000-0000-0000-000000000003');
select throws_ok($$ select public.start_attempt(current_setting('t.test')::uuid, 'tab-x') $$,
  '42501', null, 'a student outside the class cannot start the test');

-- Sara starts.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select set_config('t.payload', public.start_attempt(current_setting('t.test')::uuid, 'tab-1')::text, true);
select set_config('t.attempt', current_setting('t.payload')::jsonb ->> 'attempt_id', true);
select is(jsonb_array_length(current_setting('t.payload')::jsonb -> 'items'), 6, 'the attempt has six items');
select ok(current_setting('t.payload') !~ '"correct"', 'the payload carries no key');
select ok(current_setting('t.payload') !~ '"points_awarded"', 'or any grading');
select is(
  (select deadline_at - started_at from public.attempts where id = current_setting('t.attempt')::uuid),
  interval '45 minutes', 'the deadline is set by the server, with 1.5x time');
select is(public.start_attempt(current_setting('t.test')::uuid, 'tab-1') ->> 'attempt_id',
  current_setting('t.attempt'), 'starting again resumes the same attempt');
select is((select count(*)::int from public.audit_log), 0, 'setup: a student reads no audit log');

select lives_ok($$ select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(0), '"b"') $$,
  'a student saves an answer');
select lives_ok($$ select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(0), '"a"') $$,
  'and changes it');
select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(0), '"b"');
select throws_ok($$ select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(0), '"z"') $$,
  '22023', null, 'an option that does not exist is refused');
select throws_ok($$ select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(2), '"three"') $$,
  '22023', null, 'text for a number is refused');
select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(1), '["c","a"]');
select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(2), '3.1449');
select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(3), '"  ｐａｒｉｓ "');
select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(4), '"Because light"');
select is((public.start_attempt(current_setting('t.test')::uuid, 'tab-1') -> 'answers' ->> pg_temp.item(0)::text),
  'b', 'resuming returns the saved answers');

select throws_ok($$ select score from public.attempts $$, '42501', null,
  'a student cannot read a score from the table');
select throws_ok($$ select points_awarded from public.answers $$, '42501', null,
  'or points from answers');
select is((select count(*)::int from public.test_item_keys), 0, 'a student reads no keys');

-- Nik cannot touch Sara's attempt.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(0), '"a"') $$,
  '42501', null, 'another student cannot save into this attempt');
select is((select count(*)::int from public.answers), 0, 'or read its answers');

-- Sara submits; results are held until released.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.submit_attempt(current_setting('t.attempt')::uuid) $$, 'Sara submits');
select throws_ok($$ select public.save_answer(current_setting('t.attempt')::uuid, pg_temp.item(5), 'true') $$,
  'P0001', null, 'no saving after submitting');
select is(public.my_result(current_setting('t.attempt')::uuid) ->> 'released', 'false',
  'the result is held until the teacher releases it');
select throws_ok($$ select public.start_attempt(current_setting('t.test')::uuid, 'tab-1') $$,
  'P0001', 'You have used all your attempts at this test', 'one attempt means one');

-- The teacher sees the grade: 2 + 2 + 1 + 1 + (by hand) + 0 unanswered.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select is((select score from public.test_results(current_setting('t.test')::uuid)
           where attempt_id = current_setting('t.attempt')::uuid), 6.00::numeric,
  'single, multiple in any order, numeric within tolerance and normalised text all score');
select is((select to_mark from public.test_results(current_setting('t.test')::uuid)
           where attempt_id = current_setting('t.attempt')::uuid), 1, 'one answer waits to be marked');
select throws_ok($$ select public.mark_answer(current_setting('t.attempt')::uuid, pg_temp.item(4), 4) $$,
  '22023', null, 'a mark above the question''s points is refused');
select public.mark_answer(current_setting('t.attempt')::uuid, pg_temp.item(4), 2.5);
select is((select score from public.test_results(current_setting('t.test')::uuid)
           where attempt_id = current_setting('t.attempt')::uuid), 8.50::numeric, 'a hand mark adds in');
select is(public.fix_item_key(pg_temp.item(0), '"a"'), 1, 'fixing a key regrades the finished attempt');
select is((select score from public.test_results(current_setting('t.test')::uuid)
           where attempt_id = current_setting('t.attempt')::uuid), 6.50::numeric,
  'and keeps the hand mark');
select throws_ok($$ select public.unpublish_test(current_setting('t.test')::uuid) $$,
  'P0001', null, 'a test that has been started cannot go back to a draft');
select public.release_results(current_setting('t.test')::uuid);

reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((public.my_result(current_setting('t.attempt')::uuid) ->> 'score')::numeric, 6.50::numeric,
  'after release the student sees the score');
select is(public.my_result(current_setting('t.attempt')::uuid) -> 'items', 'null'::jsonb,
  'but not the answers, unless the teacher reveals them');
select throws_ok($$ select public.mark_answer(current_setting('t.attempt')::uuid, pg_temp.item(4), 3) $$,
  '42501', null, 'a student cannot mark');

-- Nik starts, the browser closes, the deadline passes: the job submits it.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000002');
select set_config('t.nik', public.start_attempt(current_setting('t.test')::uuid, 'tab-2') ->> 'attempt_id', true);
select public.save_answer(current_setting('t.nik')::uuid, pg_temp.item(5), 'true');
reset role;
update public.attempts set started_at = now() - interval '31 minutes', deadline_at = now() - interval '31 seconds'
where id = current_setting('t.nik')::uuid;
select pg_temp.login('b0000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.save_answer(current_setting('t.nik')::uuid, pg_temp.item(0), '"b"') $$,
  'P0001', 'Time is up for this attempt', 'a save 31 seconds after the deadline is refused');
reset role;
select is(public.finalize_expired_attempts(), 1, 'the deadline job finishes the open attempt');
select is((select status::text from public.attempts where id = current_setting('t.nik')::uuid),
  'auto_submitted', 'as submitted automatically');
select is((select score from public.attempts where id = current_setting('t.nik')::uuid), 1.00::numeric,
  'and grades what was saved');
select is((select count(*)::int from cron.job where jobname = 'finalize-expired-attempts'), 1,
  'the job is scheduled every minute');

select * from finish();
rollback;
