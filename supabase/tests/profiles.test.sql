-- Phase 2 gate: a student cannot write their own role by any path, and the teacher-request flow
-- moves only the way ADR 004 says. Run with `npx supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- People: two students, an admin, and a sign-up that tries to name its own role.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'student1@example.test', '{"full_name": "Asha Student", "adult_confirmed": "true"}'),
  ('22222222-2222-2222-2222-222222222222', 'student2@example.test', '{"full_name": "Ben Student"}'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.test', '{"full_name": "Admin"}'),
  ('44444444-4444-4444-4444-444444444444', 'sneaky@example.test', '{"full_name": "Sneaky", "role": "admin"}');
insert into auth.users (id, is_anonymous) values ('55555555-5555-5555-5555-555555555555', true);

update public.profiles set role = 'admin' where id = '33333333-3333-3333-3333-333333333333';

-- Sign-up
select is((select role::text from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'student', 'a role in sign-up metadata is ignored');
select is((select count(*)::int from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  0, 'an anonymous user gets no profile');
select isnt((select adult_confirmed_at from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  null, 'the 18+ box at sign-up is recorded');
select is((select adult_confirmed_at from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null, 'no 18+ box, no record');

-- As student 1
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'a student sees only their own profile');
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'a student cannot update their own role');
select throws_ok(
  $$ update public.profiles set teacher_status = 'approved' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'a student cannot update their own teacher status');
select throws_ok(
  $$ insert into public.profiles (id, role) values ('66666666-6666-6666-6666-666666666666', 'admin') $$,
  '42501', null, 'a student cannot insert a profile');
select throws_ok(
  $$ delete from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'a student cannot delete a profile');
select lives_ok(
  $$ update public.profiles set full_name = 'Asha S' where id = '11111111-1111-1111-1111-111111111111' $$,
  'a student can change their own name');
update public.profiles set full_name = 'Hacked' where id = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$ select public.admin_set_teacher_status('11111111-1111-1111-1111-111111111111', 'approved') $$,
  '42501', null, 'a student cannot approve themselves');
select throws_ok($$ select * from public.admin_list_people() $$, '42501', null,
  'a student cannot list people');
select is((select count(*)::int from public.audit_log), 0, 'a student reads no audit log');
select is(public.is_approved_teacher(), false, 'a student is not a teacher');
select throws_ok($$ select public.request_teacher('', 'x') $$, '22023', null,
  'a request needs an institution');
select lives_ok($$ select public.request_teacher('City School', 'I teach maths') $$,
  'a student can ask to be a teacher');
select throws_ok($$ select public.request_teacher('City School', 'again') $$, 'P0001', null,
  'a second request while one is open is refused');

-- As the admin
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);

select is((select count(*)::int from public.admin_list_people('requested')), 1,
  'the admin sees the open request');
select is((select email from public.admin_list_people('requested')), 'student1@example.test',
  'with the email from auth.users');
select throws_ok(
  $$ select public.admin_set_teacher_status('22222222-2222-2222-2222-222222222222', 'approved') $$,
  'P0001', null, 'a person who never asked cannot be approved');
select lives_ok(
  $$ select public.admin_set_teacher_status('11111111-1111-1111-1111-111111111111', 'approved') $$,
  'the admin approves the request');
select throws_ok(
  $$ select public.admin_set_teacher_status('33333333-3333-3333-3333-333333333333', 'suspended') $$,
  'P0001', null, 'the admin''s own role is not changed here');

reset role;
select is((select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'teacher', 'approval makes a teacher');
select is((select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Ben Student', 'a student cannot rename someone else');

-- Student 1, now a teacher
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
select is(public.is_approved_teacher(), true, 'an approved teacher is a teacher');

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}', true);
select public.admin_set_teacher_status('11111111-1111-1111-1111-111111111111', 'suspended');
select is((select count(*)::int from public.audit_log where target_id = '11111111-1111-1111-1111-111111111111'),
  3, 'request, approval and suspension are each in the audit log');

reset role;
select is((select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'student', 'a suspended teacher is a student again');

select * from finish();
rollback;
