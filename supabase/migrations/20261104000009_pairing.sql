-- Phase 6: one phone per attempt, as a side camera, in its own browser with no account.
-- The phone signs in anonymously and claims a one-time token; its only power is the pairing.
-- Pairing happens in the lobby, before the attempt exists (starting it starts the clock), so a
-- pairing belongs to a student and a test, and start_attempt links it to the attempt.

create table public.device_pairings (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  attempt_id uuid references public.attempts (id) on delete cascade,
  token_hash text not null unique,
  code_hash text not null,
  expires_at timestamptz not null,
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  device_label text check (char_length(device_label) <= 120),
  ready_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
-- Exactly one live phone for a student's test (Phase-6-Critic #1): the guard is this index, not
-- the function's own check.
create unique index one_live_phone on public.device_pairings (test_id, student_id)
  where claimed_at is not null and revoked_at is null;
create index device_pairings_by_attempt on public.device_pairings (attempt_id);

alter table public.device_pairings enable row level security;
revoke all on public.device_pairings from anon, authenticated;
grant select (id, test_id, student_id, attempt_id, expires_at, claimed_at, device_label, ready_at,
              revoked_at, created_at)
  on public.device_pairings to authenticated;

create policy "The student, the paired phone and the class's teachers read a pairing"
on public.device_pairings for select to authenticated
using (
  student_id = (select auth.uid())
  or claimed_by = (select auth.uid())
  or public.is_class_teacher(public.test_class(test_id))
);

-- Policies written for real users must not open to the phone's anonymous user
-- (Phase-6-Critic #2). This is the check they use.
create function public.has_profile() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = (select auth.uid())); $$;

-- The phone's live pairing, if the caller is a paired phone.
create function public.my_pairing() returns public.device_pairings
language sql stable security definer set search_path = ''
as $$
  select * from public.device_pairings
  where claimed_by = (select auth.uid()) and revoked_at is null and claimed_at is not null
  order by claimed_at desc limit 1;
$$;

-- 128 random bits for the QR, and a 6-character code to type if the camera can't scan.
-- Only their hashes are stored (Phase-6-Critic #3). Making a new one revokes any earlier pairing.
create function public.create_pairing(p_test_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_token text := encode(extensions.gen_random_bytes(16), 'hex');
  v_code text := '';
  v_bytes bytea := extensions.gen_random_bytes(6);
  v_revoked integer;
  v_id uuid;
  v_test public.tests;
begin
  select * into v_test from public.tests where id = p_test_id;
  if v_test.id is null or v_test.status = 'draft' or not public.is_class_member(v_test.class_id) then
    raise exception 'This test is not open to you' using errcode = '42501';
  end if;
  -- The code is typed on its own at /pair, so it must not clash with another live pairing's.
  loop
    v_code := '';
    v_bytes := extensions.gen_random_bytes(6);
    for i in 0..5 loop
      v_code := v_code || substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + (get_byte(v_bytes, i) % 31), 1);
    end loop;
    exit when not exists (
      select 1 from public.device_pairings
      where code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
        and revoked_at is null and claimed_at is null and expires_at > now()
    );
  end loop;

  update public.device_pairings set revoked_at = now()
  where test_id = p_test_id and student_id = v_uid and revoked_at is null;
  get diagnostics v_revoked = row_count;

  insert into public.device_pairings (test_id, student_id, attempt_id, token_hash, code_hash, expires_at)
  values (
    p_test_id, v_uid,
    (select id from public.attempts where test_id = p_test_id and student_id = v_uid and status = 'in_progress'),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    now() + interval '5 minutes'
  )
  returning id into v_id;

  return jsonb_build_object('pairing_id', v_id, 'token', v_token, 'code', v_code,
                            'expires_at', now() + interval '5 minutes', 'replaced', v_revoked > 0);
end;
$$;

-- From the phone's anonymous session: the QR token, or the 6-character code typed at /pair.
create function public.claim_pairing(p_token text, p_code text default null,
                                     p_device_label text default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_pairing public.device_pairings;
  v_title text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Open this page from the code on the test screen' using errcode = '42501';
  end if;
  -- Only the phone's anonymous session claims: a signed-in laptop cannot pose as its own phone.
  if not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'Open this on your phone' using errcode = '42501';
  end if;
  if p_token is not null then
    select * into v_pairing from public.device_pairings
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  else
    select * into v_pairing from public.device_pairings
    where code_hash = encode(extensions.digest(upper(replace(trim(p_code), ' ', '')), 'sha256'), 'hex')
      and revoked_at is null and claimed_at is null and expires_at > now()
    order by created_at desc limit 1 for update;
  end if;

  if v_pairing.id is null or v_pairing.revoked_at is not null then
    raise exception 'This code is no longer valid. Make a new one on the test screen' using errcode = 'P0001';
  end if;
  if v_pairing.claimed_at is not null then
    raise exception 'This test already has a phone connected' using errcode = 'P0001';
  end if;
  if v_pairing.expires_at < now() then
    raise exception 'This code has expired. Make a new one on the test screen' using errcode = 'P0001';
  end if;

  -- The unique index refuses a second live phone even if two claims race here.
  update public.device_pairings
  set claimed_by = v_uid, claimed_at = now(), device_label = left(p_device_label, 120)
  where id = v_pairing.id;

  select t.title, split_part(p.full_name, ' ', 1) into v_title, v_name
  from public.tests t join public.profiles p on p.id = v_pairing.student_id
  where t.id = v_pairing.test_id;

  return jsonb_build_object('pairing_id', v_pairing.id, 'test_title', v_title, 'student', v_name);
end;
$$;

-- The phone says its view is set up (a person and the laptop in frame).
create function public.mark_phone_ready() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_pairing public.device_pairings := public.my_pairing();
begin
  if v_pairing.id is null then
    raise exception 'This phone is not paired' using errcode = '42501';
  end if;
  update public.device_pairings set ready_at = coalesce(ready_at, now()) where id = v_pairing.id;
end;
$$;

-- Where the phone's pairing stands: whether the attempt has started yet, and its id.
create function public.phone_status() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when p.id is null then jsonb_build_object('paired', false) else jsonb_build_object(
    'paired', true, 'pairing_id', p.id, 'ready', p.ready_at is not null,
    'attempt_id', a.id, 'attempt_status', a.status,
    'snapshot_interval_s', (t.proctoring ->> 'snapshot_interval_s')::integer,
    'server_now', now()
  ) end
  from (select (public.my_pairing()).*) p
  left join public.attempts a on a.id = p.attempt_id
  left join public.tests t on t.id = p.test_id;
$$;

-- ── The phone's evidence ─────────────────────────────────────────────────────────────────

create function public.phone_owns_attempt(p_attempt_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.device_pairings dp
    join public.attempts a on a.id = dp.attempt_id
    where dp.claimed_by = (select auth.uid()) and dp.revoked_at is null
      and dp.attempt_id = p_attempt_id and a.status = 'in_progress'
  );
$$;

create policy "The paired phone records events on its attempt"
on public.proctor_events for insert to authenticated
with check (device = 'phone' and public.phone_owns_attempt(attempt_id));

-- The sink inserts with ON CONFLICT (client_id) DO NOTHING so a replayed batch is stored once, and
-- Postgres checks a new row against SELECT policies for that: the phone must be able to read the
-- events of its own attempt, which it wrote.
create policy "The paired phone reads its attempt's events"
on public.proctor_events for select to authenticated
using (public.phone_owns_attempt(attempt_id));

-- The laptop's own events are for people with an account (not the phone).
drop policy "The student records events on their open attempt, from the laptop" on public.proctor_events;
create policy "The student records events on their open attempt, from the laptop"
on public.proctor_events for insert to authenticated
with check (device = 'laptop' and public.has_profile() and public.owns_open_attempt(attempt_id));

create or replace function public.reserve_evidence(
  p_attempt_id uuid, p_source text, p_reason text
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_path text;
  v_device public.proctor_device;
begin
  if public.has_profile() and public.owns_open_attempt(p_attempt_id) then
    v_device := 'laptop';
  elsif public.phone_owns_attempt(p_attempt_id) then
    v_device := 'phone';
  else
    raise exception 'This is not your open attempt' using errcode = '42501';
  end if;
  if (select count(*) from public.evidence where attempt_id = p_attempt_id) >= 200 then
    return null;
  end if;
  v_path := p_attempt_id::text || '/' || v_device::text || '-' || gen_random_uuid()::text || '.jpg';
  insert into public.evidence (path, attempt_id, device, source, reason)
  values (v_path, p_attempt_id, v_device, p_source, p_reason);
  return v_path;
end;
$$;

create or replace function public.evidence_slot_open(p_path text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.evidence e
    where e.path = p_path
      and ((e.device = 'laptop' and public.has_profile() and public.owns_open_attempt(e.attempt_id))
        or (e.device = 'phone' and public.phone_owns_attempt(e.attempt_id)))
  );
$$;

-- start_attempt links the student's live pairing to the new attempt.
create function public.link_pairing_to_attempt() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.device_pairings set attempt_id = new.id
  where test_id = new.test_id and student_id = new.student_id
    and revoked_at is null and attempt_id is null;
  return null;
end;
$$;

create trigger attempts_link_pairing
after insert on public.attempts
for each row execute function public.link_pairing_to_attempt();

-- The enrolment photo is for people with an account: the phone's anonymous user must not be able
-- to upload one into its own folder (Phase-6-Critic #2).
drop policy "A student uploads their own reference photo" on storage.objects;
drop policy "A student replaces their own reference photo" on storage.objects;
create policy "A student uploads their own reference photo"
on storage.objects for insert to authenticated
with check (bucket_id = 'enrolment' and public.has_profile()
            and name = (select auth.uid())::text || '/reference.jpg');
create policy "A student replaces their own reference photo"
on storage.objects for update to authenticated
using (bucket_id = 'enrolment' and public.has_profile()
       and name = (select auth.uid())::text || '/reference.jpg')
with check (bucket_id = 'enrolment' and public.has_profile()
            and name = (select auth.uid())::text || '/reference.jpg');

-- ── Realtime: the laptop and the phone talk on one private channel per pairing ────────────

create function public.can_use_pairing_channel(p_topic text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_topic like 'pairing:%' and exists (
    select 1 from public.device_pairings dp
    where dp.id::text = substr(p_topic, 9) and dp.revoked_at is null
      and (dp.student_id = (select auth.uid()) or dp.claimed_by = (select auth.uid()))
  );
$$;

create policy "Laptop and phone read their pairing channel"
on realtime.messages for select to authenticated
using (public.can_use_pairing_channel(realtime.topic()));

create policy "Laptop and phone write their pairing channel"
on realtime.messages for insert to authenticated
with check (public.can_use_pairing_channel(realtime.topic()));

revoke execute on function
  public.create_pairing(uuid), public.claim_pairing(text, text, text),
  public.mark_phone_ready(), public.phone_status(), public.phone_owns_attempt(uuid),
  public.has_profile(), public.my_pairing(), public.can_use_pairing_channel(text)
  from public, anon;
grant execute on function
  public.create_pairing(uuid), public.claim_pairing(text, text, text),
  public.mark_phone_ready(), public.phone_status(), public.phone_owns_attempt(uuid),
  public.has_profile(), public.my_pairing(), public.can_use_pairing_channel(text)
  to authenticated;
revoke execute on function public.link_pairing_to_attempt() from public, anon, authenticated;
