-- Phase 6 gate and Phase-6-Critic: one phone per attempt by the index, the phone's anonymous user
-- can do nothing but its pairing, and only the student and their phone share the channel.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

create function pg_temp.login(p_id uuid, p_anonymous boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', p_id, 'role', 'authenticated', 'is_anonymous', p_anonymous)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'teacher@example.test', '{"full_name": "Tia"}'),
  ('b0000000-0000-0000-0000-000000000001', 'sara@example.test', '{"full_name": "Sara Lee"}'),
  ('b0000000-0000-0000-0000-000000000002', 'nik@example.test', '{"full_name": "Nik"}');
insert into auth.users (id, is_anonymous) values
  ('c0000000-0000-0000-0000-000000000001', true),
  ('c0000000-0000-0000-0000-000000000002', true);
update public.profiles set role = 'teacher', teacher_status = 'approved'
where id = 'a0000000-0000-0000-0000-000000000001';

select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select set_config('t.class', public.create_class('Maths')::text, true);
select set_config('t.q', public.save_question(null, 'true_false', 'Two is even', '[]', 1, '{}', 'true')::text, true);
insert into public.tests (class_id, title, opens_at, closes_at)
values (current_setting('t.class')::uuid, 'Even', now() - interval '1 hour', now() + interval '1 day');
select set_config('t.test', (select id::text from public.tests where title = 'Even'), true);
insert into public.test_questions (test_id, question_id, position)
values (current_setting('t.test')::uuid, current_setting('t.q')::uuid, 0);
select public.publish_test(current_setting('t.test')::uuid);
reset role;
insert into public.class_members (class_id, student_id) values
  (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000001'),
  (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000002');

-- Sara makes a pairing in the lobby.
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select set_config('t.pair', public.create_pairing(current_setting('t.test')::uuid)::text, true);
select set_config('t.token', current_setting('t.pair')::jsonb ->> 'token', true);
select set_config('t.code', current_setting('t.pair')::jsonb ->> 'code', true);
select set_config('t.pairing', current_setting('t.pair')::jsonb ->> 'pairing_id', true);
select matches(current_setting('t.token'), '^[0-9a-f]{32}$', 'the QR token is 128 random bits');
select throws_ok($$ select token_hash from public.device_pairings $$, '42501', null,
  'the student cannot read the stored hash');
reset role;
select is((select count(*)::int from public.device_pairings where token_hash = current_setting('t.token')), 0,
  'only the token''s hash is stored, never the token');
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.claim_pairing(current_setting('t.token')) $$, '42501', null,
  'a signed-in laptop cannot claim its own pairing');

-- Phone 1 claims it.
reset role;
select pg_temp.login('c0000000-0000-0000-0000-000000000001', true);
select is(public.claim_pairing(current_setting('t.token'), null, 'iPhone, Safari') ->> 'student', 'Sara',
  'the phone claims with the QR token');
select is((select count(*)::int from public.classes), 0, 'the phone reads no classes');
select is((select count(*)::int from public.tests), 0, 'or tests');
select is((select count(*)::int from public.profiles), 0, 'or profiles');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('enrolment', 'c0000000-0000-0000-0000-000000000001/reference.jpg') $$,
  '42501', null, 'the phone cannot upload an enrolment photo');
select is(public.phone_status() ->> 'attempt_id', null, 'before the test starts the phone has no attempt');

-- Phone 2 tries the same token, then a race past the function.
reset role;
select pg_temp.login('c0000000-0000-0000-0000-000000000002', true);
select throws_ok($$ select public.claim_pairing(current_setting('t.token')) $$, 'P0001',
  'This test already has a phone connected', 'a second phone is refused');
reset role;
insert into public.device_pairings (test_id, student_id, token_hash, code_hash, expires_at)
values (current_setting('t.test')::uuid, 'b0000000-0000-0000-0000-000000000001', 'x', 'y', now() + interval '5 minutes');
select throws_ok($$ update public.device_pairings set claimed_by = 'c0000000-0000-0000-0000-000000000002', claimed_at = now() where token_hash = 'x' $$,
  '23505', null, 'the unique index refuses a second live phone even past the function');
delete from public.device_pairings where token_hash = 'x';

-- Sara starts: the pairing is linked to the attempt.
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select set_config('t.attempt', public.start_attempt(current_setting('t.test')::uuid, 'tab') ->> 'attempt_id', true);
select ok(public.can_use_pairing_channel('pairing:' || current_setting('t.pairing')), 'the student may use the pairing channel');
reset role;
select pg_temp.login('c0000000-0000-0000-0000-000000000001', true);
select is(public.phone_status() ->> 'attempt_id', current_setting('t.attempt'), 'the phone learns its attempt');
select ok(public.can_use_pairing_channel('pairing:' || current_setting('t.pairing')), 'and may use the channel');
select lives_ok($$
  insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
  values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'phone', 'phone_person', 'high', now())
$$, 'the phone records a phone event on its attempt');
select lives_ok($$
  insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
  values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'phone', 'phone_moved', 'warn', now())
  on conflict (client_id) do nothing
$$, 'including the way the sink sends them, with on conflict do nothing');
select throws_ok($$
  insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
  values (gen_random_uuid(), current_setting('t.attempt')::uuid, 'laptop', 'tab_hidden', 'warn', now())
$$, '42501', null, 'the phone cannot record laptop events');
select matches(public.reserve_evidence(current_setting('t.attempt')::uuid, 'camera', 'setup'),
  '/phone-[0-9a-f-]+\.jpg$', 'the phone reserves its own snapshots');

-- Nik: another student, and his attempt.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000002');
select set_config('t.nik', public.start_attempt(current_setting('t.test')::uuid, 'tab2') ->> 'attempt_id', true);
select ok(not public.can_use_pairing_channel('pairing:' || current_setting('t.pairing')), 'another student may not use the channel');
reset role;
select pg_temp.login('c0000000-0000-0000-0000-000000000001', true);
select throws_ok($$
  insert into public.proctor_events (client_id, attempt_id, device, kind, severity, started_at)
  values (gen_random_uuid(), current_setting('t.nik')::uuid, 'phone', 'phone_gone', 'warn', now())
$$, '42501', null, 'the phone cannot record on another attempt');
select throws_ok($$ select public.reserve_evidence(current_setting('t.nik')::uuid, 'camera', 'event') $$,
  '42501', null, 'or reserve its snapshots');

-- Re-pairing from the laptop revokes the first phone.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is(public.create_pairing(current_setting('t.test')::uuid) ->> 'replaced', 'true', 'a new code replaces the old phone');
reset role;
select pg_temp.login('c0000000-0000-0000-0000-000000000001', true);
select is(public.phone_status() ->> 'paired', 'false', 'the old phone is no longer paired');
select ok(not public.can_use_pairing_channel('pairing:' || current_setting('t.pairing')), 'and loses the channel');

-- An expired code.
reset role;
update public.device_pairings set expires_at = now() - interval '1 second' where revoked_at is null and claimed_at is null;
select pg_temp.login('c0000000-0000-0000-0000-000000000002', true);
select throws_ok($$ select public.claim_pairing(null, 'ZZZZZZ') $$,
  'P0001', null, 'a wrong or expired code is refused');

select * from finish();
rollback;
