-- Phase 5 database and Phase-5-Critic #7: only the student's own open attempt takes events and
-- snapshots, a stuck rule cannot fill the database or Storage, a high event flags the attempt,
-- and only the class's teachers read the evidence.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
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
select set_config('t.class', public.create_class('Biology')::text, true);
select set_config('t.q', public.save_question(null, 'true_false', 'Cells?', '[]', 1, '{}', 'true')::text, true);
insert into public.tests (class_id, title, opens_at, closes_at)
values (current_setting('t.class')::uuid, 'Cells', now() - interval '1 hour', now() + interval '1 day');
select set_config('t.test', (select id::text from public.tests where title = 'Cells'), true);
insert into public.test_questions (test_id, question_id, position)
values (current_setting('t.test')::uuid, current_setting('t.q')::uuid, 0);
select public.publish_test(current_setting('t.test')::uuid);
reset role;
insert into public.class_members (class_id, student_id) values
  (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000001'),
  (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000002');

select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select set_config('t.attempt', public.start_attempt(current_setting('t.test')::uuid, 'tab') ->> 'attempt_id', true);

-- Events.
select lives_ok($$
  insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
  values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'face_missing', 'warn', now())
$$, 'the student records an event on their open attempt');
insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'face_missing', 'warn', now() + interval '1 second');
select is((select count(*)::int from public.proctor_events), 1,
  'the same kind again within 2 s is dropped, without an error');
select throws_ok($$
  insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
  values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'phone', 'phone_gone', 'warn', now())
$$, '42501', null, 'the laptop cannot record phone events');
insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'tab_hidden', 'warn', now() - interval '2 hours');
select is((select count(*)::int from public.proctor_events), 1, 'an event dated before the attempt is dropped');
select throws_ok($$
  insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
  values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'invented', 'warn', now())
$$, '23514', null, 'an unknown kind is refused');
select is((select integrity::text from public.attempts where id = current_setting('t.attempt')::uuid),
  'clean', 'a warning does not flag the attempt');

select set_config('t.event', gen_random_uuid()::text, true);
insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
values (current_setting('t.event')::uuid, current_setting('t.attempt')::uuid, 'laptop', 'tab_hidden', 'warn', now());
select lives_ok($$ select public.update_proctor_events(jsonb_build_array(jsonb_build_object(
  'client_id', current_setting('t.event'), 'ended_at', now() + interval '5 seconds', 'severity', 'high'))) $$,
  'the student closes and raises an event');
select is((select severity::text from public.proctor_events where client_id = current_setting('t.event')::uuid),
  'high', 'severity goes up');
select is((select integrity::text from public.attempts where id = current_setting('t.attempt')::uuid),
  'flagged', 'a high event flags the attempt');
select public.update_proctor_events(jsonb_build_array(jsonb_build_object(
  'client_id', current_setting('t.event'), 'severity', 'info')));
select is((select severity::text from public.proctor_events where client_id = current_setting('t.event')::uuid),
  'high', 'and never back down');

-- Snapshots.
select set_config('t.path', public.reserve_evidence(current_setting('t.attempt')::uuid, 'camera', 'event'), true);
select matches(current_setting('t.path'), '^' || current_setting('t.attempt') || '/laptop-[0-9a-f-]+\.jpg$',
  'a reserved snapshot path sits under the attempt');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('evidence', current_setting('t.path')) $$,
  'the student uploads into the reserved slot');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('evidence', current_setting('t.attempt') || '/not-reserved.jpg') $$,
  '42501', null, 'an unreserved path is refused');

-- Nik: not his attempt.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000002');
select throws_ok($$
  insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
  values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'speech', 'warn', now())
$$, '42501', null, 'another student cannot record events on this attempt');
select throws_ok($$ select public.reserve_evidence(current_setting('t.attempt')::uuid, 'camera', 'event') $$,
  '42501', null, 'or reserve its snapshots');
select is((select count(*)::int from public.proctor_events), 0, 'or read its events');
select is((select count(*)::int from storage.objects where bucket_id = 'evidence'), 0, 'or its snapshots');

-- Teachers.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.proctor_events), 2, 'the class''s teacher reads the events');
select is((select count(*)::int from storage.objects where bucket_id = 'evidence'), 1, 'and the snapshot');
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.proctor_events), 0, 'another teacher reads none');
select is((select count(*)::int from public.evidence), 0, 'and no evidence index');

-- The caps.
reset role;
insert into public.evidence (path, attempt_id, device, source, reason)
select current_setting('t.attempt') || '/fill-' || g || '.jpg', current_setting('t.attempt')::uuid, 'laptop', 'camera', 'thumbnail'
from generate_series(1, 199) g;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is(public.reserve_evidence(current_setting('t.attempt')::uuid, 'camera', 'thumbnail'), null,
  'after 200 snapshots no more slots are given');
reset role;
update public.attempts set started_at = now() - interval '3 hours' where id = current_setting('t.attempt')::uuid;
insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
select gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'copy_paste', 'info', now() - (g * interval '3 seconds')
from generate_series(1, 700) g;
select is((select count(*)::int from public.proctor_events where attempt_id = current_setting('t.attempt')::uuid), 600,
  'an attempt keeps at most 600 events');

-- Enrolment.
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.save_enrolment('2026-11-04', true) $$, 'P0001', null,
  'enrolment needs the photo first');

select * from finish();
rollback;
