-- Phase 8 and Phase-8-Critic #4: every table in public has row-level security, and every one is in
-- this list, so a new table fails here until someone has thought about who may read and write it.
-- Plus the privacy and operations functions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

select is(
  (select array_agg(tablename::text order by tablename) from pg_tables where schemaname = 'public'),
  array['answers', 'attempts', 'audit_log', 'class_members', 'class_teachers', 'classes',
        'device_pairings', 'evidence', 'flag_reviews', 'identity_enrolments', 'join_failures',
        'proctor_events', 'profiles', 'question_keys', 'questions', 'test_item_keys', 'test_items',
        'test_questions', 'tests'],
  'every table in public is known: add a new one here only with its policies and tests');
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0,
  'every table in public has row-level security on');
select is(
  (select count(*)::int from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'), 0,
  'the anonymous (signed-out) role has no table rights at all');

create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
insert into auth.users (id, email, raw_user_meta_data) values
  ('b0000000-0000-0000-0000-000000000001', 'sara@example.test', '{"full_name": "Sara"}'),
  ('a0000000-0000-0000-0000-000000000009', 'admin@example.test', '{"full_name": "Ada"}');
update public.profiles set role = 'admin' where id = 'a0000000-0000-0000-0000-000000000009';

select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is(public.my_data() ->> 'email', 'sara@example.test', 'a student downloads their own data');
select ok((public.my_data() -> 'profile') ? 'full_name', 'with their profile');
select throws_ok($$ select public.request_account_deletion('yes') $$, '22023', null, 'deletion must be typed out');
select lives_ok($$ select public.request_account_deletion('DELETE') $$, 'a student asks to delete their account');
select throws_ok($$ select * from public.accounts_to_delete() $$, '42501', null,
  'a student cannot run the maintenance functions');
select throws_ok($$ select * from public.expired_evidence() $$, '42501', null, 'or list expired evidence');
select throws_ok($$ select public.forget_evidence(array['x']) $$, '42501', null, 'or forget evidence');
select throws_ok($$ select public.admin_usage() $$, '42501', null, 'or see usage');

reset role;
select is((select count(*)::int from public.accounts_to_delete()), 1, 'the job sees the request');
select pg_temp.login('a0000000-0000-0000-0000-000000000009');
select ok((public.admin_usage() ->> 'database_bytes')::bigint > 0, 'the admin sees usage');

-- Deleting an account keeps the teacher's results, without the person (step 4).
reset role;
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'teacher@example.test', '{"full_name": "Tia"}'),
  ('b0000000-0000-0000-0000-000000000002', 'gone@example.test', '{"full_name": "Gina Gone"}');
update public.profiles set role = 'teacher', teacher_status = 'approved' where id = 'a0000000-0000-0000-0000-000000000001';
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select set_config('t.class', public.create_class('Kept')::text, true);
select set_config('t.q', public.save_question(null, 'true_false', 'Kept?', '[]', 1, '{}', 'true')::text, true);
insert into public.tests (class_id, title, opens_at, closes_at)
values (current_setting('t.class')::uuid, 'Kept', now() - interval '1 hour', now() + interval '1 day');
select set_config('t.test', (select id::text from public.tests where title = 'Kept'), true);
insert into public.test_questions (test_id, question_id, position) values (current_setting('t.test')::uuid, current_setting('t.q')::uuid, 0);
select public.publish_test(current_setting('t.test')::uuid);
reset role;
insert into public.class_members (class_id, student_id) values (current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000002');
select pg_temp.login('b0000000-0000-0000-0000-000000000002');
select set_config('t.attempt', public.start_attempt(current_setting('t.test')::uuid, 'tab') ->> 'attempt_id', true);
select public.submit_attempt(current_setting('t.attempt')::uuid);
reset role;
delete from auth.users where id = 'b0000000-0000-0000-0000-000000000002';
select is((select count(*)::int from public.attempts where id = current_setting('t.attempt')::uuid), 1,
  'the attempt outlives the deleted account');
select is((select student_id from public.attempts where id = current_setting('t.attempt')::uuid), null,
  'without its student');
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select is((select full_name from public.test_results(current_setting('t.test')::uuid)), 'Deleted student',
  'the teacher''s results say so');
select is((select full_name from public.live_overview(current_setting('t.test')::uuid)), 'Deleted student',
  'and so does the grid');

select * from finish();
rollback;
