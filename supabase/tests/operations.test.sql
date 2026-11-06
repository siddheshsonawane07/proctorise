-- The daily maintenance job runs inside Supabase (migration 20261106000003): scheduled, with a token
-- made in the database, and nothing a signed-in or signed-out person can call to read or fire it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select is((select schedule from cron.job where jobname = 'daily-maintenance'), '30 2 * * *',
  'the job is scheduled once a day');
select ok((select length(decrypted_secret) = 64 from vault.decrypted_secrets
           where name = 'maintenance_token'),
  'the token is 32 random bytes, made in the database');
select ok((select decrypted_secret like 'https://%/functions/v1' from vault.decrypted_secrets
           where name = 'functions_url'),
  'the job knows where the function is');
select is(has_function_privilege('anon', 'public.maintenance_token()', 'execute'), false,
  'signed-out callers cannot read the token');
select is(has_function_privilege('authenticated', 'public.maintenance_token()', 'execute'), false,
  'signed-in people cannot read the token');
select is(has_function_privilege('service_role', 'public.maintenance_token()', 'execute'), true,
  'the Edge Function (service key) can');
select is(has_function_privilege('authenticated', 'public.call_maintenance()', 'execute'), false,
  'signed-in people cannot fire the job');
select is(has_function_privilege('service_role', 'public.call_maintenance()', 'execute'), false,
  'only the database itself fires it');

select * from finish();
rollback;
