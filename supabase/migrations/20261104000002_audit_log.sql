-- Phase 2: a record of every action that changes someone's access or result.
-- Written only by `security definer` functions; read by the admin. Later phases let a class's
-- teachers read their class's rows.

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index audit_log_target on public.audit_log (target_type, target_id);

alter table public.audit_log enable row level security;

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy "Admin reads the audit log"
on public.audit_log for select
to authenticated
using (public.is_admin());

create function public.write_audit(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_details jsonb default '{}'::jsonb
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, p_details);
$$;

-- Internal: only other definer functions call it.
revoke execute on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;
