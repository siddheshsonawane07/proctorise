-- Local demo data, loaded by `supabase db reset` (never by `db push` to a hosted project unless
-- asked with --include-seed). PHASE_8 § 8.3 step 13. Everyone signs in with: demo-password-123
--
--   admin@demo.test      Ada Admin       (admin)
--   teacher@demo.test    Tess Teacher    (approved teacher, owns "Demo class")
--   student1@demo.test … student3@demo.test
--
-- Class join code: TRYME234. Built through the app's own functions, acting as each person, so the
-- seed obeys the same rules as the app.

create function pg_temp.person(p_id uuid, p_email text, p_name text) returns void
language plpgsql as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    extensions.crypt('demo-password-123', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_name, 'adult_confirmed', 'true'), now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'email',
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), now(), now(), now());
end;
$$;

create function pg_temp.act_as(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
end;
$$;

select pg_temp.person('d0000000-0000-0000-0000-000000000001', 'admin@demo.test', 'Ada Admin');
select pg_temp.person('d0000000-0000-0000-0000-000000000002', 'teacher@demo.test', 'Tess Teacher');
select pg_temp.person('d0000000-0000-0000-0000-000000000011', 'student1@demo.test', 'Sam Student');
select pg_temp.person('d0000000-0000-0000-0000-000000000012', 'student2@demo.test', 'Priya Patel');
select pg_temp.person('d0000000-0000-0000-0000-000000000013', 'student3@demo.test', 'Leo Martin');

update public.profiles set role = 'admin' where id = 'd0000000-0000-0000-0000-000000000001';
update public.profiles set role = 'teacher', teacher_status = 'approved', institution = 'Demo School'
where id = 'd0000000-0000-0000-0000-000000000002';

-- The teacher's class, bank and tests.
select pg_temp.act_as('d0000000-0000-0000-0000-000000000002');
select set_config('seed.class', public.create_class('Demo class')::text, true);
update public.classes set join_code = 'TRYME234' where id = current_setting('seed.class')::uuid;

select set_config('seed.q0', public.save_question(null, 'single',
  'A ray of light passes from air into glass. What happens to its speed?',
  '[{"id":"a","text":"It increases"},{"id":"b","text":"It decreases"},{"id":"c","text":"It stays the same"},{"id":"d","text":"It becomes zero"}]',
  1, '{science,light}', '"b"')::text, true);
select set_config('seed.q1', public.save_question(null, 'multiple', 'Which of these are **prime numbers**?',
  '[{"id":"a","text":"21"},{"id":"b","text":"23"},{"id":"c","text":"29"},{"id":"d","text":"39"}]',
  2, '{maths,numbers}', '["b","c"]')::text, true);
select set_config('seed.q2', public.save_question(null, 'true_false',
  'The angles of any triangle add up to 180 degrees.', '[]', 1, '{maths,geometry}', 'true')::text, true);
select set_config('seed.q3', public.save_question(null, 'short_text',
  'Which gas do green plants take in from the air to make their food?',
  '[]', 1, '{science,plants}', '["Carbon dioxide","CO2"]')::text, true);
select set_config('seed.q4', public.save_question(null, 'numeric',
  'What is the square root of 2, to two decimal places?', '[]', 1, '{maths,numbers}', '1.41', 0.005)::text, true);
select set_config('seed.q5', public.save_question(null, 'short_text',
  'In two or three sentences, explain why we see lightning before we hear thunder.',
  '[]', 3, '{science,sound}', '[]')::text, true);

insert into public.tests (class_id, title, instructions, duration_min, opens_at, closes_at, results_release, reveal_answers)
values (current_setting('seed.class')::uuid, 'Demo quiz', 'Six questions. You may take it once.',
        20, now() - interval '1 hour', now() + interval '30 days', 'immediate', true);
insert into public.tests (class_id, title, instructions, duration_min, opens_at, closes_at, proctoring)
values (current_setting('seed.class')::uuid, 'Demo quiz with a phone camera', 'Have your phone ready.',
        15, now() - interval '1 hour', now() + interval '30 days',
        '{"preset": "standard", "identity_check": false, "phone_required": true, "screen_share_required": false,
          "snapshot_interval_s": 60, "auto_submit_screen_share_s": null, "auto_submit_phone_gone_min": null}');

insert into public.test_questions (test_id, question_id, position)
select t.id, current_setting('seed.q' || n)::uuid, n
from public.tests t, generate_series(0, 5) n
where t.class_id = current_setting('seed.class')::uuid and t.title = 'Demo quiz';
insert into public.test_questions (test_id, question_id, position)
select t.id, current_setting('seed.q' || n)::uuid, n
from public.tests t, generate_series(0, 2) n
where t.class_id = current_setting('seed.class')::uuid and t.title = 'Demo quiz with a phone camera';

select public.publish_test(id) from public.tests where class_id = current_setting('seed.class')::uuid;

-- The students join with the code.
select pg_temp.act_as('d0000000-0000-0000-0000-000000000011');
select public.join_class('TRYME234');
select pg_temp.act_as('d0000000-0000-0000-0000-000000000012');
select public.join_class('TRYME234');
select pg_temp.act_as('d0000000-0000-0000-0000-000000000013');
select public.join_class('TRYME234');
select set_config('request.jwt.claims', '', true);
