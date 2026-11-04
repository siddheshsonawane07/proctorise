-- Phase 8: privacy (a student's own data, deleting an account, retention) and operating on free
-- tiers (usage against the limits). The daily maintenance job (scripts/maintenance.mjs) calls the
-- service-only functions here with the secret key; no browser can.

-- ── Rate limit on making phone codes ─────────────────────────────────────────────────────

create or replace function public.limit_pairings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.device_pairings
      where student_id = new.student_id and test_id = new.test_id
        and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many new codes. Wait a few minutes, then try again' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger device_pairings_limit
before insert on public.device_pairings
for each row execute function public.limit_pairings();

-- ── A student's own data ─────────────────────────────────────────────────────────────────

create function public.my_data() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) - 'teacher_note' from public.profiles p where p.id = (select auth.uid())),
    'email', (select email from auth.users where id = (select auth.uid())),
    'photo_on_file', exists (select 1 from public.identity_enrolments where student_id = (select auth.uid())),
    'classes', coalesce((
      select jsonb_agg(jsonb_build_object('class', c.name, 'joined_at', m.joined_at, 'status', m.status))
      from public.class_members m join public.classes c on c.id = m.class_id
      where m.student_id = (select auth.uid())), '[]'::jsonb),
    'attempts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'test', t.title, 'attempt_no', a.attempt_no, 'status', a.status,
        'started_at', a.started_at, 'submitted_at', a.submitted_at,
        'answers', (select coalesce(jsonb_object_agg(ans.item_id, ans.response), '{}'::jsonb)
                    from public.answers ans where ans.attempt_id = a.id),
        'events', (select coalesce(jsonb_agg(jsonb_build_object(
                      'kind', e.kind, 'severity', e.severity, 'device', e.device,
                      'started_at', e.started_at, 'ended_at', e.ended_at,
                      'snapshot_kept', e.snapshot_path is not null) order by e.started_at), '[]'::jsonb)
                   from public.proctor_events e where e.attempt_id = a.id)
      ) order by a.started_at)
      from public.attempts a join public.tests t on t.id = a.test_id
      where a.student_id = (select auth.uid())), '[]'::jsonb)
  )
  where exists (select 1 from public.profiles where id = (select auth.uid()));
$$;

-- ── Deleting an account ──────────────────────────────────────────────────────────────────

alter table public.profiles add column deletion_requested_at timestamptz;

-- The daily job deletes the account, its photo and its snapshots within a day. Deleting the
-- account removes its attempts too (they cascade), so a teacher's results lose that student.
create function public.request_account_deletion(p_confirm text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_confirm is distinct from 'DELETE' then
    raise exception 'Type DELETE to confirm' using errcode = '22023';
  end if;
  update public.profiles set deletion_requested_at = coalesce(deletion_requested_at, now())
  where id = (select auth.uid());
  perform public.write_audit('profile.deletion_requested', 'profile', (select auth.uid())::text);
end;
$$;

create function public.cancel_account_deletion() returns void
language sql security definer set search_path = ''
as $$ update public.profiles set deletion_requested_at = null where id = (select auth.uid()); $$;

-- ── For the maintenance job only (secret key) ────────────────────────────────────────────

-- Snapshots of finished attempts past their test's retention.
create function public.expired_evidence(p_limit integer default 500)
returns table (path text)
language sql stable security definer set search_path = ''
as $$
  select e.path
  from public.evidence e
  join public.attempts a on a.id = e.attempt_id
  join public.tests t on t.id = a.test_id
  where a.status <> 'in_progress'
    and coalesce(a.submitted_at, a.deadline_at) + make_interval(days => t.retention_days) < now()
  order by e.created_at
  limit p_limit;
$$;

-- After the files are deleted through the Storage API: forget them (Phase-8-Critic #2).
create function public.forget_evidence(p_paths text[]) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.proctor_events set snapshot_path = null where snapshot_path = any (p_paths);
  delete from public.evidence where path = any (p_paths);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Accounts asked to be deleted, with the files to remove first.
create function public.accounts_to_delete()
returns table (user_id uuid, files jsonb)
language sql stable security definer set search_path = ''
as $$
  select p.id, jsonb_build_object(
    'enrolment', (select coalesce(jsonb_agg(o.name), '[]'::jsonb) from storage.objects o
                  where o.bucket_id = 'enrolment' and o.name like p.id::text || '/%'),
    'evidence', (select coalesce(jsonb_agg(e.path), '[]'::jsonb) from public.evidence e
                 join public.attempts a on a.id = e.attempt_id where a.student_id = p.id)
  )
  from public.profiles p
  where p.deletion_requested_at is not null;
$$;

-- ── Usage against the free plan, for the admin ───────────────────────────────────────────

create function public.admin_usage() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the admin can see usage' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects),
    'evidence_files', (select count(*) from public.evidence),
    'people', (select count(*) from public.profiles),
    'teachers', (select count(*) from public.profiles where role = 'teacher' and teacher_status = 'approved'),
    'attempts_this_month', (select count(*) from public.attempts where started_at >= date_trunc('month', now())),
    'attempts_now', (select count(*) from public.attempts where status = 'in_progress'),
    'last_activity', greatest(
      (select max(started_at) from public.attempts),
      (select max(created_at) from public.proctor_events),
      (select max(created_at) from public.profiles))
  );
end;
$$;

revoke execute on function public.my_data(), public.request_account_deletion(text),
  public.cancel_account_deletion(), public.admin_usage() from public, anon;
grant execute on function public.my_data(), public.request_account_deletion(text),
  public.cancel_account_deletion(), public.admin_usage() to authenticated;
-- The maintenance functions: the secret key (service_role) only.
revoke execute on function public.expired_evidence(integer), public.forget_evidence(text[]),
  public.accounts_to_delete() from public, anon, authenticated;
grant execute on function public.expired_evidence(integer), public.forget_evidence(text[]),
  public.accounts_to_delete() to service_role;
revoke execute on function public.limit_pairings() from public, anon, authenticated;
