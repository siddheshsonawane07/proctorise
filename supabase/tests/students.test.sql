-- Phase 9.3 and Phase-9-Critic #3: bulk changes go through Postgres in one transaction, with an
-- audit row each; only a teacher of the class can change, read or export its students.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a1000000-0000-0000-0000-000000000001', 'owner9@example.test', '{"full_name": "Olga Owner"}'),
  ('a1000000-0000-0000-0000-000000000002', 'other9@example.test', '{"full_name": "Otto Other"}'),
  ('b1000000-0000-0000-0000-000000000001', 'asha9@example.test', '{"full_name": "Asha"}'),
  ('b1000000-0000-0000-0000-000000000002', 'bilal9@example.test', '{"full_name": "Bilal"}'),
  ('b1000000-0000-0000-0000-000000000003', 'out9@example.test', '{"full_name": "Oscar Out"}');
update public.profiles set role = 'teacher', teacher_status = 'approved'
where id in ('a1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002');

select pg_temp.login('a1000000-0000-0000-0000-000000000001');
select set_config('t.class', public.create_class('Science 10')::text, true);
reset role;
insert into public.class_members (class_id, student_id) values
  (current_setting('t.class')::uuid, 'b1000000-0000-0000-0000-000000000001'),
  (current_setting('t.class')::uuid, 'b1000000-0000-0000-0000-000000000002');
insert into public.tests (class_id, title, status, opens_at, closes_at) values
  (current_setting('t.class')::uuid, 'Unit test', 'published', now() - interval '1 day', now() + interval '1 day'),
  (current_setting('t.class')::uuid, 'Draft', 'draft', now(), now() + interval '2 days');

-- Who may not.
select pg_temp.login('a1000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.set_members(current_setting('t.class')::uuid,
  array['b1000000-0000-0000-0000-000000000001'::uuid], null, 1.5) $$,
  '42501', null, 'a teacher of another class cannot change its students');
select throws_ok($$ select * from public.class_student_report(current_setting('t.class')::uuid,
  'b1000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'a teacher of another class cannot read a student''s record');
select throws_ok($$ select * from public.class_marks(current_setting('t.class')::uuid) $$,
  '42501', null, 'a teacher of another class cannot export its marks');
reset role;
select pg_temp.login('b1000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.set_members(current_setting('t.class')::uuid,
  array['b1000000-0000-0000-0000-000000000001'::uuid], null, 2.0) $$,
  '42501', null, 'a student cannot give themselves extra time');
reset role;
select is(has_function_privilege('anon',
  'public.set_members(uuid, uuid[], public.member_status, numeric)', 'execute'), false,
  'signed-out callers cannot run set_members');

-- The owner, in bulk.
select pg_temp.login('a1000000-0000-0000-0000-000000000001');
select is(public.set_members(current_setting('t.class')::uuid,
  array['b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
        'b1000000-0000-0000-0000-000000000002']::uuid[], null, 1.5), 2,
  'two students changed, the repeated id once');
reset role;
select is((select count(*)::int from public.class_members
           where class_id = current_setting('t.class')::uuid and time_multiplier = 1.5
             and status = 'active'), 2,
  'both have extra time, and a null status kept them active');
select is((select count(*)::int from public.audit_log
           where action = 'class.member_changed' and target_id = current_setting('t.class')), 2,
  'one audit row per student');

-- One id outside the class: nothing changes at all.
select pg_temp.login('a1000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.set_members(current_setting('t.class')::uuid,
  array['b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003']::uuid[],
  'removed', null) $$,
  'P0002', null, 'a student from outside the class is refused');
reset role;
select is((select count(*)::int from public.class_members
           where class_id = current_setting('t.class')::uuid and status = 'removed'), 0,
  'and the whole change was rolled back');

-- Removing keeps the extra time when the multiplier is null.
select pg_temp.login('a1000000-0000-0000-0000-000000000001');
select is(public.set_members(current_setting('t.class')::uuid,
  array['b1000000-0000-0000-0000-000000000002']::uuid[], 'removed', null), 1,
  'one student removed');
reset role;
select is((select time_multiplier from public.class_members
           where student_id = 'b1000000-0000-0000-0000-000000000002'), 1.50,
  'a null multiplier kept their extra time');

-- The record and the marks.
select pg_temp.login('a1000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.class_student_report(current_setting('t.class')::uuid,
  'b1000000-0000-0000-0000-000000000001')), 1,
  'the record lists published tests only');
select ok((select attempt_id is null from public.class_student_report(current_setting('t.class')::uuid,
  'b1000000-0000-0000-0000-000000000001')),
  'a test not yet taken shows no attempt');
select throws_ok($$ select * from public.class_student_report(current_setting('t.class')::uuid,
  'b1000000-0000-0000-0000-000000000003') $$,
  'P0002', null, 'a student outside the class has no record here');
select is((select count(*)::int from public.class_marks(current_setting('t.class')::uuid)), 0,
  'no marks before anyone takes a test');
reset role;

-- Spoken warnings (9.6): optional, boolean only; old settings without it stay valid.
select ok(public.valid_proctoring((select proctoring from public.tests where title = 'Unit test')),
  'a new test''s default settings are valid, and include spoken warnings');
select ok(public.valid_proctoring((select proctoring - 'spoken_warnings' from public.tests where title = 'Unit test')),
  'settings saved before spoken warnings existed are still valid');
select ok(not public.valid_proctoring((select jsonb_set(proctoring, '{spoken_warnings}', '"yes"') from public.tests where title = 'Unit test')),
  'spoken warnings must be true or false');

select * from finish();
rollback;
