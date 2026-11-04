-- Phase 7 and Phase-7-Critic: only the class's teachers act, review and listen; every action is
-- audited; bulk actions only dismiss; the channels are private.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'teacher@example.test', '{"full_name": "Tia"}'),
  ('a0000000-0000-0000-0000-000000000002', 'other@example.test', '{"full_name": "Ott"}'),
  ('b0000000-0000-0000-0000-000000000001', 'sara@example.test', '{"full_name": "Sara"}'),
  ('b0000000-0000-0000-0000-000000000002', 'nik@example.test', '{"full_name": "Nik"}');
update public.profiles set role = 'teacher', teacher_status = 'approved'
where id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select set_config('t.class', public.create_class('History')::text, true);
select set_config('t.q', public.save_question(null, 'true_false', 'Rome fell', '[]', 1, '{}', 'true')::text, true);
insert into public.tests (class_id, title, opens_at, closes_at)
values (current_setting('t.class')::uuid, 'Rome', now() - interval '1 hour', now() + interval '1 day');
select set_config('t.test', (select id::text from public.tests where title = 'Rome'), true);
insert into public.test_questions (test_id, question_id, position)
values (current_setting('t.test')::uuid, current_setting('t.q')::uuid, 0);
select public.publish_test(current_setting('t.test')::uuid);
reset role;
insert into public.class_members (class_id, student_id) values
  (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000001'),
  (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000002');

select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select set_config('t.attempt', public.start_attempt(current_setting('t.test')::uuid, 'tab') ->> 'attempt_id', true);
insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at) values
  (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'object_phone', 'high', now()),
  (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'speech', 'warn', now() - interval '10 seconds'),
  (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'speech', 'warn', now() - interval '20 seconds');
select set_config('t.event', (select id::text from public.proctor_events where kind = 'object_phone'), true);

-- Channels, as the student.
select ok(not public.can_read_topic('test:' || current_setting('t.test')), 'a student cannot listen to the test''s channel');
select ok(public.can_write_topic('test:' || current_setting('t.test')), 'but may send their summary while taking it');
select ok(public.can_read_topic('attempt:' || current_setting('t.attempt')), 'and uses their attempt''s channel');
select throws_ok($$ select public.review_flag(current_setting('t.event')::bigint, 'dismissed') $$, '42501', null,
  'a student cannot review their own flag');
select throws_ok($$ select public.extend_attempt(current_setting('t.attempt')::uuid, 30, 'me') $$, '42501', null,
  'or give themselves time');
select throws_ok($$ select public.warn_student(current_setting('t.attempt')::uuid, 'hi') $$, '42501', null,
  'or send warnings');

reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000002');
select ok(not public.can_read_topic('attempt:' || current_setting('t.attempt')), 'another student cannot use the attempt''s channel');
select ok(not public.can_write_topic('test:' || current_setting('t.test')), 'or send to the test before starting it');

-- The class's teacher.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select ok(public.can_read_topic('test:' || current_setting('t.test')), 'the teacher listens to the test''s channel');
select is((select high_count from public.live_overview(current_setting('t.test')::uuid)), 1, 'the grid counts the high flag');
select is((select unreviewed from public.live_overview(current_setting('t.test')::uuid)), 3, 'and three unreviewed');
select throws_ok($$ select public.extend_attempt(current_setting('t.attempt')::uuid, 5, '  ') $$, '22023', null,
  'extra time needs a reason');
select lives_ok($$ select public.extend_attempt(current_setting('t.attempt')::uuid, 5, 'Fire alarm') $$, 'the teacher gives 5 minutes');
select is((select deadline_at - started_at from public.attempts where id = current_setting('t.attempt')::uuid),
  interval '35 minutes', 'the deadline moves');
select lives_ok($$ select public.warn_student(current_setting('t.attempt')::uuid, 'Please face the camera.') $$, 'the teacher warns');
select is(public.dismiss_kind(current_setting('t.attempt')::uuid, 'speech', 'reads aloud'), 2, 'dismissing a kind covers its flags');
select throws_ok($$ select public.terminate_attempt(current_setting('t.attempt')::uuid, '') $$, '22023', null,
  'ending needs a reason');
select lives_ok($$ select public.review_flag(current_setting('t.event')::bigint, 'confirmed', 'phone in hand') $$,
  'the teacher confirms the phone flag');
select is((select unreviewed from public.live_overview(current_setting('t.test')::uuid)), 0, 'nothing left to review');
select lives_ok($$ select public.terminate_attempt(current_setting('t.attempt')::uuid, 'Phone in hand') $$, 'the teacher ends it');
select is((select status::text from public.attempts where id = current_setting('t.attempt')::uuid), 'terminated', 'as ended by a teacher');
select throws_ok($$ select public.set_integrity(current_setting('t.attempt')::uuid, 'flagged') $$, '22023', null,
  'a verdict is fine or a violation');
select public.set_integrity(current_setting('t.attempt')::uuid, 'reviewed_violation');
select is((select count(*)::int from public.audit_log where target_id = current_setting('t.attempt')
           and action in ('attempt.extended', 'attempt.warned', 'flag.dismissed_kind', 'flag.confirmed', 'attempt.terminated', 'attempt.integrity')),
  6, 'every action is in the audit log, readable by the teacher');
select ok((select count(*) from realtime.messages where topic = 'test:' || current_setting('t.test') and event = 'event') >= 2,
  'new flags were broadcast to the grid');
select ok((select count(*) from realtime.messages where topic = 'attempt:' || current_setting('t.attempt')) >= 3,
  'the warning, the time and the end were sent to the student');

-- Another teacher.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select throws_ok($$ select * from public.live_overview(current_setting('t.test')::uuid) $$, '42501', null,
  'another teacher cannot watch');
select is((select count(*)::int from public.audit_log), 0, 'or read the record');

select * from finish();
rollback;
