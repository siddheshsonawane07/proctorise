-- Phase 5: what the proctoring engine records. Events and snapshots are evidence for a teacher to
-- judge (D7); none of them changes a grade. Kinds for the phone (phase 6) are listed now so the
-- check does not need widening later.

create type public.proctor_device as enum ('laptop', 'phone');
create type public.proctor_severity as enum ('info', 'warn', 'high');

create table public.proctor_events (
  id bigint generated always as identity primary key,
  -- Made in the browser, so a batch replayed after a lost connection is not stored twice.
  client_id uuid not null unique,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  device public.proctor_device not null,
  kind text not null check (kind in (
    'face_missing', 'multiple_faces', 'looking_away', 'object_phone', 'object_book', 'speech',
    'identity_mismatch', 'identity_passed', 'tab_hidden', 'window_blur', 'fullscreen_exit',
    'screen_share_stopped', 'second_display', 'camera_lost', 'copy_paste', 'context_menu',
    'shortcut', 'phone_gone', 'phone_hidden', 'phone_moved', 'phone_person', 'phone_object',
    'phone_camera_lost', 'phone_replaced', 'phone_setup_unconfirmed'
  )),
  severity public.proctor_severity not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  confidence real check (confidence between 0 and 1),
  details jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 2000),
  snapshot_path text,
  created_at timestamptz not null default now()
);
create index proctor_events_by_attempt on public.proctor_events (attempt_id, started_at);

alter table public.proctor_events enable row level security;
revoke all on public.proctor_events from anon, authenticated;
grant select on public.proctor_events to authenticated;
grant insert (client_id, attempt_id, device, kind, severity, started_at, ended_at, confidence,
              details, snapshot_path)
  on public.proctor_events to authenticated;

create function public.owns_open_attempt(p_attempt_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.attempts
    where id = p_attempt_id and student_id = (select auth.uid()) and status = 'in_progress'
  );
$$;

create function public.attempt_class(p_attempt_id uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select t.class_id from public.attempts a join public.tests t on t.id = a.test_id
  where a.id = p_attempt_id;
$$;

create policy "The student records events on their open attempt, from the laptop"
on public.proctor_events for insert to authenticated
with check (device = 'laptop' and public.owns_open_attempt(attempt_id));

-- A student sees what was recorded about them; teachers see their classes'.
create policy "The student and the class's teachers read events"
on public.proctor_events for select to authenticated
using (
  exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = (select auth.uid()))
  or public.is_class_teacher(public.attempt_class(attempt_id))
);

-- Drops, without failing the batch, an event that would fill the database: the same kind on the
-- same attempt within 2 s, anything past 600 an attempt, or a time far from the server's
-- (Phase-5-Critic #7).
create function public.limit_proctor_events() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_started timestamptz;
begin
  select started_at into v_started from public.attempts where id = new.attempt_id;
  if new.started_at < v_started - interval '1 minute' or new.started_at > now() + interval '1 minute' then
    return null;
  end if;
  if exists (
    select 1 from public.proctor_events
    where attempt_id = new.attempt_id and kind = new.kind and device = new.device
      and started_at > new.started_at - interval '2 seconds'
      and started_at < new.started_at + interval '2 seconds'
  ) then
    return null;
  end if;
  if (select count(*) from public.proctor_events where attempt_id = new.attempt_id) >= 600 then
    return null;
  end if;
  return new;
end;
$$;

create trigger proctor_events_limits
before insert on public.proctor_events
for each row execute function public.limit_proctor_events();

-- The first high event flags the attempt for the teacher's review.
create function public.flag_attempt_on_high() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.attempts set integrity = 'flagged'
  where id = new.attempt_id and integrity = 'clean';
  return null;
end;
$$;

create trigger proctor_events_flag
after insert on public.proctor_events
for each row when (new.severity = 'high')
execute function public.flag_attempt_on_high();

-- Closing an event, raising its severity, or attaching its snapshot, after it opened. Severity only
-- goes up; a snapshot is attached once, and only one reserved for the same attempt.
create function public.update_proctor_events(p_updates jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_update jsonb;
begin
  if jsonb_typeof(p_updates) <> 'array' or jsonb_array_length(p_updates) > 100 then
    raise exception 'Send up to 100 updates at a time' using errcode = '22023';
  end if;
  for v_update in select * from jsonb_array_elements(p_updates) loop
    update public.proctor_events e
    set ended_at = coalesce((v_update ->> 'ended_at')::timestamptz, e.ended_at),
        severity = greatest(e.severity, coalesce((v_update ->> 'severity')::public.proctor_severity, e.severity)),
        snapshot_path = coalesce(e.snapshot_path, (
          select ev.path from public.evidence ev
          where ev.path = v_update ->> 'snapshot_path' and ev.attempt_id = e.attempt_id
        ))
    where e.client_id = (v_update ->> 'client_id')::uuid
      and exists (
        select 1 from public.attempts a
        where a.id = e.attempt_id and a.student_id = (select auth.uid())
          and (a.status = 'in_progress' or a.submitted_at > now() - interval '2 minutes')
      );
    if (v_update ->> 'severity') = 'high' then
      update public.attempts a set integrity = 'flagged'
      from public.proctor_events e
      where e.client_id = (v_update ->> 'client_id')::uuid and a.id = e.attempt_id
        and a.integrity = 'clean';
    end if;
  end loop;
end;
$$;

-- ── Snapshots ────────────────────────────────────────────────────────────────────────────

-- Every snapshot has a reserved slot first. The slot is the cap (200 an attempt) and the index a
-- teacher's timeline reads. Storage's insert policy accepts only a reserved, unused path.
create table public.evidence (
  path text primary key,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  device public.proctor_device not null,
  source text not null check (source in ('camera', 'screen')),
  reason text not null check (reason in ('thumbnail', 'event', 'setup')),
  created_at timestamptz not null default now()
);
create index evidence_by_attempt on public.evidence (attempt_id, created_at);

alter table public.evidence enable row level security;
revoke all on public.evidence from anon, authenticated;
grant select on public.evidence to authenticated;

create policy "The class's teachers read the evidence index"
on public.evidence for select to authenticated
using (public.is_class_teacher(public.attempt_class(attempt_id)));

create function public.reserve_evidence(
  p_attempt_id uuid, p_source text, p_reason text
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_path text;
begin
  if not public.owns_open_attempt(p_attempt_id) then
    raise exception 'This is not your open attempt' using errcode = '42501';
  end if;
  if (select count(*) from public.evidence where attempt_id = p_attempt_id) >= 200 then
    return null; -- The cap: the engine stops taking snapshots, and keeps recording events.
  end if;
  v_path := p_attempt_id::text || '/' || gen_random_uuid()::text || '.jpg';
  insert into public.evidence (path, attempt_id, device, source, reason)
  values (v_path, p_attempt_id, 'laptop', p_source, p_reason);
  return v_path;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('evidence', 'evidence', false, 204800, array['image/jpeg']),
  ('enrolment', 'enrolment', false, 512000, array['image/jpeg'])
on conflict (id) do nothing;

-- The student cannot read the evidence index (teachers only), so the upload check looks the slot
-- up as definer.
create function public.evidence_slot_open(p_path text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.evidence e
    where e.path = p_path and public.owns_open_attempt(e.attempt_id)
  );
$$;

create policy "Upload a snapshot into a reserved slot"
on storage.objects for insert to authenticated
with check (bucket_id = 'evidence' and public.evidence_slot_open(name));

create policy "The class's teachers read snapshots"
on storage.objects for select to authenticated
using (
  bucket_id = 'evidence'
  and exists (
    select 1 from public.evidence e
    where e.path = name and public.is_class_teacher(public.attempt_class(e.attempt_id))
  )
);

-- ── Face enrolment ───────────────────────────────────────────────────────────────────────

create table public.identity_enrolments (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  photo_path text not null,
  consent_version text not null,
  consented_at timestamptz not null default now(),
  liveness_passed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.identity_enrolments enable row level security;
revoke all on public.identity_enrolments from anon, authenticated;
grant select on public.identity_enrolments to authenticated;

create function public.teaches_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.class_members m
    where m.student_id = p_student_id and m.status = 'active' and public.is_class_teacher(m.class_id)
  );
$$;

create policy "The student and their teachers read the enrolment"
on public.identity_enrolments for select to authenticated
using (student_id = (select auth.uid()) or public.teaches_student(student_id));

create function public.save_enrolment(p_consent_version text, p_liveness_passed boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_path text := v_uid::text || '/reference.jpg';
begin
  if not exists (select 1 from storage.objects where bucket_id = 'enrolment' and name = v_path) then
    raise exception 'Upload the photo first' using errcode = 'P0001';
  end if;
  insert into public.identity_enrolments (student_id, photo_path, consent_version, liveness_passed_at)
  values (v_uid, v_path, p_consent_version, case when p_liveness_passed then now() end)
  on conflict (student_id) do update
  set photo_path = excluded.photo_path, consent_version = excluded.consent_version,
      consented_at = now(), liveness_passed_at = excluded.liveness_passed_at, updated_at = now();
  perform public.write_audit('identity.enrolled', 'profile', v_uid::text,
    jsonb_build_object('liveness', p_liveness_passed));
end;
$$;

-- The photo lives at enrolment/<student id>/reference.jpg; only its owner writes it.
create policy "A student uploads their own reference photo"
on storage.objects for insert to authenticated
with check (bucket_id = 'enrolment' and name = (select auth.uid())::text || '/reference.jpg');

create policy "A student replaces their own reference photo"
on storage.objects for update to authenticated
using (bucket_id = 'enrolment' and name = (select auth.uid())::text || '/reference.jpg')
with check (bucket_id = 'enrolment' and name = (select auth.uid())::text || '/reference.jpg');

create policy "The student and their teachers read the reference photo"
on storage.objects for select to authenticated
using (
  bucket_id = 'enrolment'
  and (
    name = (select auth.uid())::text || '/reference.jpg'
    or public.teaches_student(((storage.foldername(name))[1])::uuid)
  )
);

-- ── Consent for an attempt ───────────────────────────────────────────────────────────────

alter table public.attempts add column consent_version text, add column consented_at timestamptz;
grant select (consent_version, consented_at) on public.attempts to authenticated;

create function public.record_attempt_consent(p_attempt_id uuid, p_version text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.owns_open_attempt(p_attempt_id) then
    raise exception 'This is not your open attempt' using errcode = '42501';
  end if;
  update public.attempts set consent_version = p_version, consented_at = now()
  where id = p_attempt_id;
end;
$$;

-- The roster now says who has a photo on file (phase 3 left this for here).
drop function public.class_roster(uuid);
create function public.class_roster(p_class_id uuid)
returns table (
  student_id uuid, full_name text, email text, status public.member_status,
  time_multiplier numeric, joined_at timestamptz, enrolled_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(p_class_id) then
    raise exception 'Only a teacher of this class can see its students' using errcode = '42501';
  end if;
  return query
    select m.student_id, p.full_name, u.email::text, m.status, m.time_multiplier, m.joined_at,
           e.updated_at
    from public.class_members m
    join public.profiles p on p.id = m.student_id
    join auth.users u on u.id = m.student_id
    left join public.identity_enrolments e on e.student_id = m.student_id
    where m.class_id = p_class_id
    order by m.status, p.full_name;
end;
$$;

revoke execute on function
  public.update_proctor_events(jsonb), public.reserve_evidence(uuid, text, text),
  public.save_enrolment(text, boolean), public.record_attempt_consent(uuid, text),
  public.class_roster(uuid), public.owns_open_attempt(uuid), public.attempt_class(uuid),
  public.teaches_student(uuid), public.evidence_slot_open(text)
  from public, anon;
grant execute on function
  public.update_proctor_events(jsonb), public.reserve_evidence(uuid, text, text),
  public.save_enrolment(text, boolean), public.record_attempt_consent(uuid, text),
  public.class_roster(uuid), public.owns_open_attempt(uuid), public.attempt_class(uuid),
  public.teaches_student(uuid), public.evidence_slot_open(text)
  to authenticated;
revoke execute on function public.limit_proctor_events(), public.flag_attempt_on_high()
  from public, anon, authenticated;
