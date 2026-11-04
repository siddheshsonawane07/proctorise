-- Phase 7: watching a test live, acting on it, and judging every flag afterwards.
-- Every action that changes a student's result is a function that writes audit_log in the same
-- transaction (Phase-7-Critic #3) and tells the student at once over Realtime.

-- ── Reviews ──────────────────────────────────────────────────────────────────────────────

create type public.flag_verdict as enum ('dismissed', 'confirmed');

create table public.flag_reviews (
  event_id bigint primary key references public.proctor_events (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  verdict public.flag_verdict not null,
  note text check (char_length(note) <= 500),
  reviewed_at timestamptz not null default now()
);

alter table public.flag_reviews enable row level security;
revoke all on public.flag_reviews from anon, authenticated;
grant select on public.flag_reviews to authenticated;

create function public.event_class(p_event_id bigint) returns uuid
language sql stable security definer set search_path = ''
as $$ select public.attempt_class(attempt_id) from public.proctor_events where id = p_event_id; $$;

create policy "The class's teachers read reviews"
on public.flag_reviews for select to authenticated
using (public.is_class_teacher(public.event_class(event_id)));

-- Confirming is one flag at a time, with its evidence on screen (Phase-7-Critic #4); this takes one.
create function public.review_flag(p_event_id bigint, p_verdict public.flag_verdict, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_attempt uuid;
begin
  if not public.is_class_teacher(public.event_class(p_event_id)) then
    raise exception 'Only a teacher of this class can review this flag' using errcode = '42501';
  end if;
  select attempt_id into v_attempt from public.proctor_events where id = p_event_id;
  insert into public.flag_reviews (event_id, reviewer_id, verdict, note)
  values (p_event_id, (select auth.uid()), p_verdict, nullif(trim(p_note), ''))
  on conflict (event_id) do update
  set verdict = excluded.verdict, note = excluded.note, reviewer_id = excluded.reviewer_id,
      reviewed_at = now();
  perform public.write_audit('flag.' || p_verdict::text, 'attempt', v_attempt::text,
    jsonb_build_object('event_id', p_event_id, 'note', nullif(trim(p_note), '')));
end;
$$;

-- Bulk actions only dismiss (Phase-7-Critic #4): every flag of one kind on one attempt, e.g. a
-- student who reads questions aloud.
create function public.dismiss_kind(p_attempt_id uuid, p_kind text, p_note text default null)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_class_teacher(public.attempt_class(p_attempt_id)) then
    raise exception 'Only a teacher of this class can review this attempt' using errcode = '42501';
  end if;
  insert into public.flag_reviews (event_id, reviewer_id, verdict, note)
  select e.id, (select auth.uid()), 'dismissed', nullif(trim(p_note), '')
  from public.proctor_events e
  where e.attempt_id = p_attempt_id and e.kind = p_kind and e.severity <> 'info'
  on conflict (event_id) do update set verdict = 'dismissed', note = excluded.note,
    reviewer_id = excluded.reviewer_id, reviewed_at = now();
  get diagnostics v_count = row_count;
  perform public.write_audit('flag.dismissed_kind', 'attempt', p_attempt_id::text,
    jsonb_build_object('kind', p_kind, 'count', v_count));
  return v_count;
end;
$$;

-- The attempt's verdict is only ever the teacher's choice.
create function public.set_integrity(p_attempt_id uuid, p_verdict public.integrity_status, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.attempt_class(p_attempt_id)) then
    raise exception 'Only a teacher of this class can judge this attempt' using errcode = '42501';
  end if;
  if p_verdict not in ('reviewed_ok', 'reviewed_violation') then
    raise exception 'A verdict is either fine or a violation' using errcode = '22023';
  end if;
  update public.attempts set integrity = p_verdict where id = p_attempt_id;
  perform public.write_audit('attempt.integrity', 'attempt', p_attempt_id::text,
    jsonb_build_object('verdict', p_verdict, 'note', nullif(trim(p_note), '')));
end;
$$;

-- ── Actions during the test ──────────────────────────────────────────────────────────────

create function public.warn_student(p_attempt_id uuid, p_message text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.attempt_class(p_attempt_id)) then
    raise exception 'Only a teacher of this class can warn this student' using errcode = '42501';
  end if;
  if coalesce(trim(p_message), '') = '' or char_length(p_message) > 300 then
    raise exception 'Write a short message' using errcode = '22023';
  end if;
  perform public.write_audit('attempt.warned', 'attempt', p_attempt_id::text,
    jsonb_build_object('message', trim(p_message)));
  perform realtime.send(jsonb_build_object('message', trim(p_message)), 'warning',
    'attempt:' || p_attempt_id::text, true);
end;
$$;

create function public.extend_attempt(p_attempt_id uuid, p_minutes integer, p_reason text)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  v_deadline timestamptz;
begin
  if not public.is_class_teacher(public.attempt_class(p_attempt_id)) then
    raise exception 'Only a teacher of this class can give extra time' using errcode = '42501';
  end if;
  if p_minutes not between 1 and 120 then
    raise exception 'Give between 1 and 120 minutes' using errcode = '22023';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Say why, for the record' using errcode = '22023';
  end if;
  update public.attempts set deadline_at = deadline_at + make_interval(mins => p_minutes)
  where id = p_attempt_id and status = 'in_progress'
  returning deadline_at into v_deadline;
  if v_deadline is null then
    raise exception 'This attempt is no longer in progress' using errcode = 'P0001';
  end if;
  perform public.write_audit('attempt.extended', 'attempt', p_attempt_id::text,
    jsonb_build_object('minutes', p_minutes, 'reason', trim(p_reason), 'deadline_at', v_deadline));
  perform realtime.send(jsonb_build_object('deadline_at', v_deadline, 'minutes', p_minutes), 'deadline',
    'attempt:' || p_attempt_id::text, true);
  return v_deadline;
end;
$$;

-- Ending an attempt needs a reason; it is graded as it stands.
create function public.terminate_attempt(p_attempt_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.attempt_class(p_attempt_id)) then
    raise exception 'Only a teacher of this class can end this attempt' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Say why you are ending it' using errcode = '22023';
  end if;
  if not exists (select 1 from public.attempts where id = p_attempt_id and status = 'in_progress') then
    raise exception 'This attempt is no longer in progress' using errcode = 'P0001';
  end if;
  perform public.finish_attempt(p_attempt_id, 'terminated');
  perform public.write_audit('attempt.terminated', 'attempt', p_attempt_id::text,
    jsonb_build_object('reason', trim(p_reason)));
  perform realtime.send(jsonb_build_object('reason', trim(p_reason)), 'ended',
    'attempt:' || p_attempt_id::text, true);
end;
$$;

-- After the test: removes an attempt from the results, with a reason.
create function public.void_attempt(p_attempt_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.attempt_class(p_attempt_id)) then
    raise exception 'Only a teacher of this class can void this attempt' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Say why you are voiding it' using errcode = '22023';
  end if;
  update public.attempts set status = 'voided'
  where id = p_attempt_id and status in ('submitted', 'auto_submitted', 'terminated');
  if not found then
    raise exception 'Only a finished attempt can be voided' using errcode = 'P0001';
  end if;
  perform public.write_audit('attempt.voided', 'attempt', p_attempt_id::text,
    jsonb_build_object('reason', trim(p_reason)));
end;
$$;

-- The class's teachers read the record of actions on their attempts.
create policy "The class's teachers read actions on their attempts"
on public.audit_log for select to authenticated
using (target_type = 'attempt' and public.is_class_teacher(public.attempt_class(target_id::uuid)));

-- ── The live grid ────────────────────────────────────────────────────────────────────────

create function public.live_overview(p_test_id uuid)
returns table (
  attempt_id uuid, student_id uuid, full_name text, status public.attempt_status,
  started_at timestamptz, deadline_at timestamptz, integrity public.integrity_status,
  warn_count integer, high_count integer, unreviewed integer,
  last_kind text, last_at timestamptz, phone_paired boolean
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.test_class(p_test_id)) then
    raise exception 'Only a teacher of this class can watch this test' using errcode = '42501';
  end if;
  return query
    select a.id, a.student_id, p.full_name, a.status, a.started_at, a.deadline_at, a.integrity,
      (select count(*)::integer from public.proctor_events e where e.attempt_id = a.id and e.severity = 'warn'),
      (select count(*)::integer from public.proctor_events e where e.attempt_id = a.id and e.severity = 'high'),
      (select count(*)::integer from public.proctor_events e
       where e.attempt_id = a.id and e.severity <> 'info'
         and not exists (select 1 from public.flag_reviews r where r.event_id = e.id)),
      last.kind, last.started_at,
      exists (select 1 from public.device_pairings dp
              where dp.attempt_id = a.id and dp.claimed_at is not null and dp.revoked_at is null)
    from public.attempts a
    join public.profiles p on p.id = a.student_id
    left join lateral (
      select e.kind, e.started_at from public.proctor_events e
      where e.attempt_id = a.id and e.severity <> 'info'
      order by e.started_at desc limit 1
    ) last on true
    where a.test_id = p_test_id
    order by p.full_name, a.attempt_no;
end;
$$;

-- New events go to the teacher's grid by broadcast from the database (Phase-7-Critic #2), not by
-- postgres_changes. Only what the grid shows: no details, no snapshot path.
create function public.broadcast_event() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_test uuid;
begin
  if new.severity = 'info' then
    return null;
  end if;
  select test_id into v_test from public.attempts where id = new.attempt_id;
  perform realtime.send(
    jsonb_build_object('attempt_id', new.attempt_id, 'kind', new.kind, 'severity', new.severity,
                       'started_at', new.started_at, 'device', new.device),
    'event', 'test:' || v_test::text, true);
  return null;
end;
$$;

create trigger proctor_events_broadcast
after insert on public.proctor_events
for each row execute function public.broadcast_event();

-- ── Realtime authorisation ───────────────────────────────────────────────────────────────

-- test:<id>: the class's teachers listen; students in the test may only send their own summary.
-- attempt:<id>: the student, the class's teachers and the paired phone.
create function public.can_read_topic(p_topic text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_topic ~ '^test:[0-9a-f-]{36}$' then
    v_id := substr(p_topic, 6)::uuid;
    return public.is_class_teacher(public.test_class(v_id));
  elsif p_topic ~ '^attempt:[0-9a-f-]{36}$' then
    v_id := substr(p_topic, 9)::uuid;
    return public.is_class_teacher(public.attempt_class(v_id))
      or exists (select 1 from public.attempts where id = v_id and student_id = (select auth.uid()))
      or public.phone_owns_attempt(v_id);
  end if;
  return false;
end;
$$;

create function public.can_write_topic(p_topic text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_topic ~ '^test:[0-9a-f-]{36}$' then
    v_id := substr(p_topic, 6)::uuid;
    return exists (select 1 from public.attempts
                   where test_id = v_id and student_id = (select auth.uid()) and status = 'in_progress');
  end if;
  return public.can_read_topic(p_topic);
end;
$$;

create policy "Read test and attempt channels"
on realtime.messages for select to authenticated
using (public.can_read_topic(realtime.topic()));

create policy "Write test and attempt channels"
on realtime.messages for insert to authenticated
with check (public.can_write_topic(realtime.topic()));

-- ── Rights ───────────────────────────────────────────────────────────────────────────────

revoke execute on function
  public.review_flag(bigint, public.flag_verdict, text), public.dismiss_kind(uuid, text, text),
  public.set_integrity(uuid, public.integrity_status, text), public.warn_student(uuid, text),
  public.extend_attempt(uuid, integer, text), public.terminate_attempt(uuid, text),
  public.void_attempt(uuid, text), public.live_overview(uuid), public.event_class(bigint),
  public.can_read_topic(text), public.can_write_topic(text)
  from public, anon;
grant execute on function
  public.review_flag(bigint, public.flag_verdict, text), public.dismiss_kind(uuid, text, text),
  public.set_integrity(uuid, public.integrity_status, text), public.warn_student(uuid, text),
  public.extend_attempt(uuid, integer, text), public.terminate_attempt(uuid, text),
  public.void_attempt(uuid, text), public.live_overview(uuid), public.event_class(bigint),
  public.can_read_topic(text), public.can_write_topic(text)
  to authenticated;
revoke execute on function public.broadcast_event() from public, anon, authenticated;
