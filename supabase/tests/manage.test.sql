-- Managing tests and classes (20261116000002): who may cancel, edit, copy and delete a test; leave,
-- hand over and delete a class; that the admin teaches nothing; and that a deleted test's
-- snapshots are queued for the job that removes the files.
begin;
create extension if not exists pgtap with schema extensions;
select plan(60);

create function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('a2000000-0000-0000-0000-000000000001', 'owner12@example.test', '{"full_name": "Olga Owner"}'),
  ('a2000000-0000-0000-0000-000000000002', 'co12@example.test', '{"full_name": "Cory Co"}'),
  ('a2000000-0000-0000-0000-000000000003', 'other12@example.test', '{"full_name": "Otto Other"}'),
  ('a2000000-0000-0000-0000-000000000009', 'admin12@example.test', '{"full_name": "Ada Admin"}'),
  ('b2000000-0000-0000-0000-000000000001', 'mia12@example.test', '{"full_name": "Mia Member"}'),
  ('b2000000-0000-0000-0000-000000000002', 'rex12@example.test', '{"full_name": "Rex Removed"}');
update public.profiles set role = 'teacher', teacher_status = 'approved'
where id in ('a2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000002',
             'a2000000-0000-0000-0000-000000000003');
update public.profiles set role = 'admin' where id = 'a2000000-0000-0000-0000-000000000009';

select pg_temp.login('a2000000-0000-0000-0000-000000000001');
select set_config('t.class', public.create_class('Chemistry')::text, true);
reset role;
update public.classes set join_code = 'MANAGE23' where id = current_setting('t.class')::uuid;
insert into public.class_members (class_id, student_id, status) values
  (current_setting('t.class')::uuid, 'b2000000-0000-0000-0000-000000000002', 'removed');

-- ── The admin only administers ───────────────────────────────────────────────────────────
select pg_temp.login('a2000000-0000-0000-0000-000000000009');
select throws_ok($$ select public.create_class('Mine') $$, '42501', null,
  'the admin cannot create a class');
select throws_ok($$ select public.join_class('MANAGE23') $$, '42501', null,
  'or join one');
select throws_ok($$ select public.save_question(null, 'true_false', 'Q?', '[]', 1, '{}', 'true') $$,
  '42501', null, 'or keep a question bank');
reset role;

-- ── Joining, leaving, coming back ────────────────────────────────────────────────────────
select pg_temp.login('a2000000-0000-0000-0000-000000000001');
select is(public.join_class('MANAGE23') ->> 'reason', 'teacher',
  'a teacher of the class does not join it as a student');
reset role;
select pg_temp.login('b2000000-0000-0000-0000-000000000001');
select is(public.join_class('MANAGE23') ->> 'joined', 'true', 'a student joins');
select lives_ok($$ select public.leave_class(current_setting('t.class')::uuid) $$,
  'and leaves');
select is((select count(*)::int from public.classes), 0, 'after leaving they no longer see the class');
select throws_ok($$ select public.leave_class(current_setting('t.class')::uuid) $$, 'P0002', null,
  'leaving twice is refused');
reset role;
select is((select status::text from public.class_members
           where student_id = 'b2000000-0000-0000-0000-000000000001'), 'left',
  'the teacher''s list keeps them, marked as left');
select pg_temp.login('b2000000-0000-0000-0000-000000000001');
select is(public.join_class('MANAGE23') ->> 'joined', 'true', 'they can join again with the code');
reset role;
select is((select status::text from public.class_members
           where student_id = 'b2000000-0000-0000-0000-000000000001'), 'active',
  'and are back in the class');
select pg_temp.login('b2000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.leave_class(current_setting('t.class')::uuid) $$, 'P0002', null,
  'a removed student cannot leave to wipe the removal');
select is(public.join_class('MANAGE23') ->> 'reason', 'removed', 'and still cannot rejoin');
reset role;

-- ── A published test: edit, cancel, reopen, copy, delete ─────────────────────────────────
select pg_temp.login('a2000000-0000-0000-0000-000000000001');
select set_config('t.q', public.save_question(null, 'true_false', 'Water is H2O.', '[]', 1, '{}', 'true')::text, true);
insert into public.tests (class_id, title, opens_at, closes_at)
values (current_setting('t.class')::uuid, 'Unit 1', now() - interval '1 hour', now() + interval '1 day');
select set_config('t.test', (select id::text from public.tests where title = 'Unit 1'), true);
insert into public.test_questions (test_id, question_id, position)
values (current_setting('t.test')::uuid, current_setting('t.q')::uuid, 0);
select public.publish_test(current_setting('t.test')::uuid);

select lives_ok($$ update public.tests set title = 'Unit 1 (moved)', closes_at = now() + interval '3 days'
                   where id = current_setting('t.test')::uuid $$,
  'a teacher edits a published test''s details');
select is((select title from public.tests where id = current_setting('t.test')::uuid), 'Unit 1 (moved)',
  'and the change is kept');
select throws_ok($$ update public.tests set proctoring = jsonb_set(proctoring, '{phone_required}', 'true')
                    where id = current_setting('t.test')::uuid $$,
  'P0001', null, 'but not its proctoring settings');
reset role;
select is((select count(*)::int from public.audit_log
           where action = 'test.edited' and target_id = current_setting('t.test')), 1,
  'the edit is in the audit log');
select ok((select details ? 'title' and details ? 'closes_at' and not details ? 'updated_at'
           from public.audit_log
           where action = 'test.edited' and target_id = current_setting('t.test')),
  'with what changed');

select pg_temp.login('b2000000-0000-0000-0000-000000000001');
update public.tests set title = 'Hacked' where id = current_setting('t.test')::uuid;
select is((select title from public.tests where id = current_setting('t.test')::uuid), 'Unit 1 (moved)',
  'a student''s edit changes nothing');
select throws_ok($$ select public.cancel_test(current_setting('t.test')::uuid) $$, '42501', null,
  'a student cannot cancel a test');
select throws_ok($$ select public.delete_test(current_setting('t.test')::uuid) $$, '42501', null,
  'or delete it');
reset role;
select pg_temp.login('a2000000-0000-0000-0000-000000000003');
select throws_ok($$ select public.cancel_test(current_setting('t.test')::uuid) $$, '42501', null,
  'a teacher of another class cannot cancel it');
select throws_ok($$ select public.delete_test(current_setting('t.test')::uuid) $$, '42501', null,
  'or delete it');
select throws_ok($$ select public.duplicate_test(current_setting('t.test')::uuid) $$, '42501', null,
  'or copy it');
reset role;

select pg_temp.login('b2000000-0000-0000-0000-000000000001');
select set_config('t.attempt',
  public.start_attempt(current_setting('t.test')::uuid, 'tab') ->> 'attempt_id', true);
reset role;
insert into public.evidence (path, attempt_id, device, source, reason)
values (current_setting('t.attempt') || '/one.jpg', current_setting('t.attempt')::uuid,
        'laptop', 'camera', 'event');

select pg_temp.login('a2000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.delete_test(current_setting('t.test')::uuid) $$, 'P0001', null,
  'a test someone is taking cannot be deleted');
select throws_ok($$ select public.delete_class(current_setting('t.class')::uuid) $$, 'P0001', null,
  'nor its class');
select is(public.cancel_test(current_setting('t.test')::uuid), 1,
  'cancelling ends the one attempt in progress');
select is((select status::text from public.tests where id = current_setting('t.test')::uuid), 'closed',
  'the test is closed');
select is((select status::text from public.attempts where id = current_setting('t.attempt')::uuid),
  'terminated', 'and the attempt is handed in as it stood');
select throws_ok($$ select public.cancel_test(current_setting('t.test')::uuid) $$, 'P0001', null,
  'a cancelled test cannot be cancelled again');
reset role;
update public.class_members set status = 'active', time_multiplier = 1
where student_id = 'b2000000-0000-0000-0000-000000000001';
update public.tests set max_attempts = 2 where id = current_setting('t.test')::uuid;
select pg_temp.login('b2000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.start_attempt(current_setting('t.test')::uuid, 'tab') $$,
  'P0001', 'Your teacher cancelled this test', 'no one can start a cancelled test');
reset role;
select pg_temp.login('a2000000-0000-0000-0000-000000000001');
select lives_ok($$ select public.release_results(current_setting('t.test')::uuid) $$,
  'a cancelled test''s results can be released');
select ok((select results_released_at is not null from public.tests
           where id = current_setting('t.test')::uuid), 'and are');
select lives_ok($$ select public.reopen_test(current_setting('t.test')::uuid) $$,
  'the teacher reopens it');
select is((select status::text from public.tests where id = current_setting('t.test')::uuid),
  'published', 'and it is published again');

select set_config('t.copy', public.duplicate_test(current_setting('t.test')::uuid)::text, true);
select is((select status::text || ': ' || title from public.tests
           where id = current_setting('t.copy')::uuid), 'draft: Copy of Unit 1 (moved)',
  'a copy is a new draft');
select is((select count(*)::int from public.test_questions
           where test_id = current_setting('t.copy')::uuid), 1, 'with the same questions');

select lives_ok($$ select public.delete_test(current_setting('t.test')::uuid) $$,
  'the teacher deletes the test');
reset role;
select is((select count(*)::int from public.tests where id = current_setting('t.test')::uuid)
        + (select count(*)::int from public.attempts where id = current_setting('t.attempt')::uuid)
        + (select count(*)::int from public.evidence where attempt_id = current_setting('t.attempt')::uuid),
  0, 'it, its attempts and its evidence rows are gone');
select is((select count(*)::int from public.questions where id = current_setting('t.q')::uuid), 1,
  'the bank''s question stays');
select is((select path from public.expired_evidence()), current_setting('t.attempt') || '/one.jpg',
  'the snapshot''s file is queued for the job that removes it');
select is(public.forget_evidence(array[current_setting('t.attempt') || '/one.jpg']), 1,
  'the job forgets it once the file is gone');
select is((select count(*)::int from public.evidence_purge), 0, 'and the queue is empty');
select pg_temp.login('b2000000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.evidence_purge $$, '42501', null,
  'no one signed in can read the queue');
reset role;

-- ── Co-teachers, handing over, deleting a class ──────────────────────────────────────────
select pg_temp.login('a2000000-0000-0000-0000-000000000001');
select public.add_co_teacher(current_setting('t.class')::uuid, 'co12@example.test');
select throws_ok($$ select public.add_co_teacher(current_setting('t.class')::uuid, 'admin12@example.test') $$,
  'P0002', null, 'the admin cannot be added as a co-teacher');
reset role;
select pg_temp.login('a2000000-0000-0000-0000-000000000003');
select throws_ok($$ select public.remove_co_teacher(current_setting('t.class')::uuid,
  'a2000000-0000-0000-0000-000000000002') $$, '42501', null,
  'an outsider cannot remove a co-teacher');
reset role;
select pg_temp.login('a2000000-0000-0000-0000-000000000002');
select throws_ok($$ select public.transfer_class(current_setting('t.class')::uuid, 'co12@example.test') $$,
  '42501', null, 'a co-teacher cannot take the class over');
select throws_ok($$ select public.delete_class(current_setting('t.class')::uuid) $$, '42501', null,
  'or delete it');
select lives_ok($$ select public.remove_co_teacher(current_setting('t.class')::uuid,
  'a2000000-0000-0000-0000-000000000002') $$, 'a co-teacher leaves a class themselves');
reset role;

select pg_temp.login('a2000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.transfer_class(current_setting('t.class')::uuid, 'mia12@example.test') $$,
  'P0002', null, 'a class is handed only to an approved teacher');
select lives_ok($$ select public.transfer_class(current_setting('t.class')::uuid, 'CO12@example.test') $$,
  'the owner hands the class over');
reset role;
select is((select string_agg(kind::text, ', ' order by teacher_id) from public.class_teachers
           where class_id = current_setting('t.class')::uuid), 'co_teacher, owner',
  'the old owner stays as a co-teacher, the new one owns it');
select pg_temp.login('a2000000-0000-0000-0000-000000000001');
select throws_ok($$ select public.delete_class(current_setting('t.class')::uuid) $$, '42501', null,
  'the old owner can no longer delete it');
reset role;

select pg_temp.login('b2000000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.admin_list_classes() $$, '42501', null,
  'a student cannot list every class');
reset role;
select pg_temp.login('a2000000-0000-0000-0000-000000000009');
select is((select owner_email || ', ' || students || ' student, ' || tests || ' test'
           from public.admin_list_classes() where id = current_setting('t.class')::uuid),
  'co12@example.test, 1 student, 1 test', 'the admin sees every class, its owner and its size');
select lives_ok($$ select public.transfer_class(current_setting('t.class')::uuid, 'other12@example.test') $$,
  'the admin hands a class to another teacher');
select is((select owner_email from public.admin_list_classes()
           where id = current_setting('t.class')::uuid), 'other12@example.test', 'who now owns it');
select lives_ok($$ select public.delete_class(current_setting('t.class')::uuid) $$,
  'the admin deletes a class');
reset role;
select is((select count(*)::int from public.classes where id = current_setting('t.class')::uuid)
        + (select count(*)::int from public.tests where id = current_setting('t.copy')::uuid), 0,
  'and its tests go with it');
select is(has_function_privilege('anon', 'public.delete_class(uuid)', 'execute')
       or has_function_privilege('anon', 'public.delete_test(uuid)', 'execute')
       or has_function_privilege('anon', 'public.leave_class(uuid)', 'execute'), false,
  'signed-out callers can run none of it');

select * from finish();
rollback;
