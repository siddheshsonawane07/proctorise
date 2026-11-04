-- Phase 3 gate and Phase-3-Critic: who sees which class and test, what a co-teacher may do,
-- that publishing freezes a copy, and that no student can read a key.
begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- Switch to a signed-in person. Called as postgres (after `reset role`).
create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000001', 'owner@example.test', '{"full_name": "Olga Owner"}'),
  ('a0000000-0000-0000-0000-000000000002', 'co@example.test', '{"full_name": "Cory Co"}'),
  ('a0000000-0000-0000-0000-000000000003', 'other@example.test', '{"full_name": "Otto Other"}'),
  ('b0000000-0000-0000-0000-000000000001', 'member@example.test', '{"full_name": "Mia Member"}'),
  ('b0000000-0000-0000-0000-000000000002', 'outsider@example.test', '{"full_name": "Oscar Out"}');
update public.profiles set role = 'teacher', teacher_status = 'approved'
where id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
             'a0000000-0000-0000-0000-000000000003');

-- A student cannot create a class.
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.create_class('Nope') $$, '42501', null,
  'a student cannot create a class');

-- The owner builds a class, a bank question and a draft test.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select set_config('t.class', public.create_class('Maths 101')::text, true);
select is((select count(*)::int from public.class_teachers
           where class_id = current_setting('t.class')::uuid and kind = 'owner'), 1,
  'a new class has its creator as owner');
select matches((select join_code from public.classes where id = current_setting('t.class')::uuid),
  '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$', 'a join code is 8 characters without look-alikes');

select throws_ok($$ select public.save_question(null, 'single', 'Pick', '[{"id":"a","text":"A"}]', 1, '{}', '"a"') $$,
  '22023', 'Give between 2 and 10 options', 'a single-choice question needs two options');
select throws_ok($$ select public.save_question(null, 'single', 'Pick', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]', 1, '{}', '"c"') $$,
  '22023', 'Mark the correct option', 'the key must be one of the options');
select throws_ok($$ select public.save_question(null, 'true_false', 'Sky is blue', '[]', 1, '{}', '"yes"') $$,
  '22023', null, 'a true/false key must be true or false');
select throws_ok($$ select public.save_question(null, 'numeric', 'Pi', '[{"id":"a","text":"A"}]', 1, '{}', '3.14') $$,
  '22023', 'This type of question has no options', 'a numeric question has no options');
select set_config('t.q1', public.save_question(null, 'single', 'What is 2 + 2?',
  '[{"id":"a","text":"3"},{"id":"b","text":"4"}]', 2, '{arithmetic}', '"b"')::text, true);
select set_config('t.q2', public.save_question(null, 'numeric', 'Value of pi to 2 places?',
  '[]', 1, '{}', '3.14', 0.005)::text, true);

insert into public.tests (class_id, title, opens_at, closes_at)
values (current_setting('t.class')::uuid, 'Quiz 1', now() - interval '1 hour', now() + interval '1 day');
select set_config('t.test', (select id::text from public.tests where title = 'Quiz 1'), true);
insert into public.test_questions (test_id, question_id, position) values
  (current_setting('t.test')::uuid, current_setting('t.q1')::uuid, 0),
  (current_setting('t.test')::uuid, current_setting('t.q2')::uuid, 1);
select throws_ok(
  $$ update public.tests set proctoring = '{"preset": "standard"}' where id = current_setting('t.test')::uuid $$,
  '23514', null, 'proctoring settings missing a key are refused');
select throws_ok(
  $$ update public.tests set proctoring = jsonb_set(proctoring, '{preset}', '"lax"') where id = current_setting('t.test')::uuid $$,
  '23514', null, 'an unknown proctoring preset is refused');
select is((select count(*)::int from public.draft_questions(current_setting('t.test')::uuid)), 2,
  'the builder lists the draft''s two questions');

-- Another teacher's question cannot be put in this draft.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select set_config('t.q_other', public.save_question(null, 'true_false', 'Secret', '[]', 1, '{}', 'true')::text, true);
select is((select count(*)::int from public.tests), 0, 'a teacher sees no other teacher''s tests');
select is((select count(*)::int from public.questions where id = current_setting('t.q1')::uuid), 0,
  'a teacher cannot read another teacher''s bank');
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select throws_ok(
  $$ insert into public.test_questions (test_id, question_id, position)
     values (current_setting('t.test')::uuid, current_setting('t.q_other')::uuid, 2) $$,
  '42501', null, 'a teacher cannot add another teacher''s question to a draft');

-- A student joins with the code; drafts stay hidden.
reset role;
select set_config('t.code', (select join_code from public.classes where id = current_setting('t.class')::uuid), true);
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((public.join_class(lower(current_setting('t.code'))) ->> 'joined'), 'true',
  'a student joins with the code, in any case');
select is((select count(*)::int from public.classes), 1, 'a member sees the class');
select is((select count(*)::int from public.tests), 0, 'a member does not see a draft');

-- Publish.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.publish_test(current_setting('t.test')::uuid) $$, 'the owner publishes');
select is((select count(*)::int from public.test_items where test_id = current_setting('t.test')::uuid), 2,
  'publishing copies both questions');
select is((select points from public.test_items where test_id = current_setting('t.test')::uuid and position = 0),
  2.00::numeric, 'with the bank''s points');
select is((select count(*)::int from public.tests where id = current_setting('t.test')::uuid
           and title = 'Changed'), 0, 'setup check');
update public.tests set title = 'Changed' where id = current_setting('t.test')::uuid;
select is((select title from public.tests where id = current_setting('t.test')::uuid), 'Quiz 1',
  'a published test cannot be edited');
select public.save_question(current_setting('t.q1')::uuid, 'single', 'What is 2 + 3?',
  '[{"id":"a","text":"5"},{"id":"b","text":"4"}]', 2, '{}', '"a"');
select is((select prompt from public.test_items where test_id = current_setting('t.test')::uuid and position = 0),
  'What is 2 + 2?', 'editing the bank after publishing leaves the test unchanged');
select is((select correct from public.test_item_keys k join public.test_items i on i.id = k.item_id
           where i.test_id = current_setting('t.test')::uuid and i.position = 0), '"b"'::jsonb,
  'and leaves its key unchanged');

-- What the member and the outsider can see now.
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.tests), 1, 'a member sees the published test');
select is((select count(*)::int from public.test_items), 0, 'a member reads no items directly');
select is((select count(*)::int from public.test_item_keys), 0, 'a member reads no keys');
select is((select count(*)::int from public.question_keys), 0, 'a member reads no bank keys');
select throws_ok($$ select * from public.class_roster(current_setting('t.class')::uuid) $$, '42501', null,
  'a member cannot read the roster');

reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000002');
select is((select count(*)::int from public.tests), 0, 'a student outside the class sees no test');
select is((select count(*)::int from public.classes), 0, 'or the class');

-- Ten wrong codes, then even the right one is refused for an hour.
select public.join_class('WRONG' || g) from generate_series(1, 10) g;
select is((public.join_class(current_setting('t.code')) ->> 'reason'), 'too_many',
  'after 10 wrong codes the right one is refused too');

-- Co-teachers.
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.add_co_teacher(current_setting('t.class')::uuid, 'CO@example.test') $$,
  'the owner adds a co-teacher by email');
select throws_ok($$ select public.add_co_teacher(current_setting('t.class')::uuid, 'member@example.test') $$,
  'P0002', null, 'a student cannot be added as a co-teacher');
select is((select count(*)::int from public.class_roster(current_setting('t.class')::uuid)), 1,
  'the roster lists the member');
select lives_ok($$ select public.set_member(current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000001', 'active', 1.5) $$,
  'a teacher gives a student extra time');

reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
insert into public.tests (class_id, title, opens_at, closes_at)
values (current_setting('t.class')::uuid, 'Co draft', now(), now() + interval '1 day');
select is((select count(*)::int from public.tests where title = 'Co draft'), 1, 'a co-teacher creates a draft');
select throws_ok($$ select public.add_co_teacher(current_setting('t.class')::uuid, 'other@example.test') $$,
  '42501', null, 'a co-teacher cannot add teachers');

reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select public.remove_co_teacher(current_setting('t.class')::uuid, 'a0000000-0000-0000-0000-000000000002');
reset role;
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
update public.tests set title = 'Taken over' where title = 'Co draft';
select is((select count(*)::int from public.tests), 0, 'a removed co-teacher sees none of the class''s tests');
reset role;
select is((select title from public.tests where class_id = current_setting('t.class')::uuid and title like 'Co%'),
  'Co draft', 'and could not edit the draft');

-- Removing a student, and suspending a teacher, end their access.
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select public.set_member(current_setting('t.class')::uuid, 'b0000000-0000-0000-0000-000000000001', 'removed', 1.0);
reset role;
select pg_temp.login('b0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.tests), 0, 'a removed student sees no tests');
select is((public.join_class(current_setting('t.code')) ->> 'reason'), 'removed',
  'and cannot rejoin with the code');

reset role;
update public.profiles set role = 'student', teacher_status = 'suspended'
where id = 'a0000000-0000-0000-0000-000000000001';
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.classes), 0, 'a suspended teacher sees their classes no more');

select * from finish();
rollback;
