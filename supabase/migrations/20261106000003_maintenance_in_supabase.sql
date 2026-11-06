-- The daily maintenance job moves from GitHub Actions into Supabase, so no secret is ever on GitHub
-- (the repo is public). pg_cron calls the `maintenance` Edge Function through pg_net once a day;
-- the function runs with the service key Supabase gives it. A random token, made here and kept in
-- the database's vault, proves the call came from this database.

create extension if not exists pg_net with schema extensions;

-- The token never appears in the repo, a log or a chat: the database makes it.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'maintenance_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
      'maintenance_token', 'Shared by pg_cron and the maintenance Edge Function');
  end if;
  -- Where the function lives. Public, not a secret. On the local stack nothing schedules a call
  -- that matters: a call there would reach production without its token and be refused.
  if not exists (select 1 from vault.secrets where name = 'functions_url') then
    perform vault.create_secret('https://gbpylpgsnodbbsowjgpz.supabase.co/functions/v1',
      'functions_url', 'Base URL of this project''s Edge Functions');
  end if;
end;
$$;

-- For the Edge Function only (it calls with the service key).
create function public.maintenance_token() returns text
language sql stable security definer set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'maintenance_token';
$$;
revoke execute on function public.maintenance_token() from public, anon, authenticated;
grant execute on function public.maintenance_token() to service_role;

-- What pg_cron runs. Returns pg_net's request id; the answer lands in net._http_response.
create function public.call_maintenance() returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_url');
begin
  return net.http_post(
    url := v_url || '/maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-maintenance-token', public.maintenance_token()),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000);
end;
$$;
revoke execute on function public.call_maintenance() from public, anon, authenticated, service_role;

-- 02:30 UTC (08:00 in India), the time the GitHub workflow used.
select cron.schedule('daily-maintenance', '30 2 * * *', 'select public.call_maintenance()');
