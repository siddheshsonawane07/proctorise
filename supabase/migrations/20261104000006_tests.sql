-- Phase 3: tests. A draft points at bank questions (test_questions); publishing freezes a copy of
-- each into test_items and test_item_keys, so editing the bank later changes nothing already
-- published (Phase-3-Critic #2). Students never read items or keys directly: phase 4 serves
-- items through start_attempt, and keys are read only by grading.

create type public.test_status as enum ('draft', 'published', 'closed');
create type public.results_release as enum ('immediate', 'manual', 'after_close');

-- One list of what a test's proctoring settings may hold, checked in the database (Phase-3-Critic
-- #6). The app's TypeScript type mirrors it: src/features/builder/proctoring.ts.
create function public.valid_proctoring(p jsonb) returns boolean
language sql immutable set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and (select array_agg(k order by k) from jsonb_object_keys(p) k) = array[
      'auto_submit_phone_gone_min', 'auto_submit_screen_share_s', 'identity_check',
      'phone_required', 'preset', 'screen_share_required', 'snapshot_interval_s'
    ]
    and p ->> 'preset' in ('light', 'standard', 'strict')
    and jsonb_typeof(p -> 'identity_check') = 'boolean'
    and jsonb_typeof(p -> 'phone_required') = 'boolean'
    and jsonb_typeof(p -> 'screen_share_required') = 'boolean'
    and jsonb_typeof(p -> 'snapshot_interval_s') = 'number'
    and (p ->> 'snapshot_interval_s')::numeric between 30 and 300
    and (jsonb_typeof(p -> 'auto_submit_screen_share_s') = 'null'
         or (jsonb_typeof(p -> 'auto_submit_screen_share_s') = 'number'
             and (p ->> 'auto_submit_screen_share_s')::numeric between 10 and 600))
    and (jsonb_typeof(p -> 'auto_submit_phone_gone_min') = 'null'
         or (jsonb_typeof(p -> 'auto_submit_phone_gone_min') = 'number'
             and (p ->> 'auto_submit_phone_gone_min')::numeric between 1 and 30));
$$;

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  instructions text not null default '' check (char_length(instructions) <= 5000),
  duration_min integer not null default 30 check (duration_min between 1 and 600),
  opens_at timestamptz not null default (date_trunc('hour', now()) + interval '1 day'),
  closes_at timestamptz not null default (date_trunc('hour', now()) + interval '2 days'),
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  shuffle_items boolean not null default false,
  shuffle_options boolean not null default false,
  results_release public.results_release not null default 'manual',
  proctoring jsonb not null default '{
    "preset": "standard", "identity_check": true, "phone_required": false,
    "screen_share_required": false, "snapshot_interval_s": 60,
    "auto_submit_screen_share_s": null, "auto_submit_phone_gone_min": null
  }'::jsonb check (public.valid_proctoring(proctoring)),
  retention_days integer not null default 30 check (retention_days in (7, 30, 90)),
  status public.test_status not null default 'draft',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);
create index tests_by_class on public.tests (class_id, opens_at);

create trigger tests_updated_at
before update on public.tests
for each row execute function public.set_updated_at();

-- A draft's chosen questions, in order. Points may override the bank's.
create table public.test_questions (
  test_id uuid not null references public.tests (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  position integer not null check (position >= 0),
  points numeric(6, 2) check (points > 0 and points <= 100),
  primary key (test_id, question_id)
);

-- The frozen copy made at publish.
create table public.test_items (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests (id) on delete cascade,
  position integer not null,
  type public.question_type not null,
  prompt text not null,
  options jsonb not null,
  points numeric(6, 2) not null,
  unique (test_id, position)
);

create table public.test_item_keys (
  item_id uuid primary key references public.test_items (id) on delete cascade,
  correct jsonb not null,
  tolerance numeric not null,
  case_sensitive boolean not null
);

alter table public.tests enable row level security;
alter table public.test_questions enable row level security;
alter table public.test_items enable row level security;
alter table public.test_item_keys enable row level security;
revoke all on public.tests, public.test_questions, public.test_items, public.test_item_keys
  from anon, authenticated;

grant select on public.tests to authenticated;
grant insert (class_id, title, instructions, duration_min, opens_at, closes_at, max_attempts,
              shuffle_items, shuffle_options, results_release, proctoring, retention_days)
  on public.tests to authenticated;
grant update (title, instructions, duration_min, opens_at, closes_at, max_attempts,
              shuffle_items, shuffle_options, results_release, proctoring, retention_days)
  on public.tests to authenticated;
grant select, insert, update, delete on public.test_questions to authenticated;
grant select on public.test_items, public.test_item_keys to authenticated;

create function public.test_class(p_test_id uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select class_id from public.tests where id = p_test_id; $$;

create function public.can_edit_test(p_test_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.tests t
    where t.id = p_test_id and t.status = 'draft' and public.is_class_teacher(t.class_id)
  );
$$;

create policy "Teachers read their classes' tests; students read published ones"
on public.tests for select to authenticated
using (public.is_class_teacher(class_id)
       or (public.is_class_member(class_id) and status <> 'draft'));

create policy "Teachers create drafts in their classes"
on public.tests for insert to authenticated
with check (public.is_class_teacher(class_id));

create policy "Teachers edit drafts"
on public.tests for update to authenticated
using (public.is_class_teacher(class_id) and status = 'draft')
with check (public.is_class_teacher(class_id) and status = 'draft');

create policy "Teachers read a test's chosen questions"
on public.test_questions for select to authenticated
using (public.is_class_teacher(public.test_class(test_id)));

-- Only questions from the caller's own bank: otherwise a teacher could add another teacher's
-- question by its id and publish it to read its key.
create policy "Teachers add their own questions to drafts"
on public.test_questions for insert to authenticated
with check (
  public.can_edit_test(test_id)
  and exists (select 1 from public.questions q
              where q.id = question_id and q.owner_id = (select auth.uid()))
);

create policy "Teachers reorder and re-point drafts"
on public.test_questions for update to authenticated
using (public.can_edit_test(test_id))
with check (public.can_edit_test(test_id));

create policy "Teachers remove questions from drafts"
on public.test_questions for delete to authenticated
using (public.can_edit_test(test_id));

create policy "Teachers read published items"
on public.test_items for select to authenticated
using (public.is_class_teacher(public.test_class(test_id)));

create policy "Teachers read published keys"
on public.test_item_keys for select to authenticated
using (exists (
  select 1 from public.test_items i
  where i.id = item_id and public.is_class_teacher(public.test_class(i.test_id))
));

-- A draft's questions with their prompts, for the builder. A co-teacher may not read the owner's
-- bank directly, but may see what is in a draft of a class they teach.
create function public.draft_questions(p_test_id uuid)
returns table (
  question_id uuid, sort_order integer, points numeric, bank_points numeric,
  type public.question_type, prompt text, options jsonb, owner_id uuid
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(public.test_class(p_test_id)) then
    raise exception 'Only a teacher of this class can see this test' using errcode = '42501';
  end if;
  return query
    select tq.question_id, tq.position, coalesce(tq.points, q.points), q.points,
           q.type, q.prompt, q.options, q.owner_id
    from public.test_questions tq
    join public.questions q on q.id = tq.question_id
    where tq.test_id = p_test_id
    order by tq.position;
end;
$$;

create function public.publish_test(p_test_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_test public.tests;
begin
  select * into v_test from public.tests where id = p_test_id for update;
  if not found or not public.is_class_teacher(v_test.class_id) then
    raise exception 'Only a teacher of this class can publish this test' using errcode = '42501';
  end if;
  if v_test.status <> 'draft' then
    raise exception 'This test is already published' using errcode = 'P0001';
  end if;
  if v_test.closes_at <= now() then
    raise exception 'The test closes in the past. Change its window first' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.test_questions where test_id = p_test_id) then
    raise exception 'Add at least one question first' using errcode = 'P0001';
  end if;

  with chosen as (
    select tq.question_id, row_number() over (order by tq.position, tq.question_id) - 1 as pos,
           coalesce(tq.points, q.points) as points, q.type, q.prompt, q.options
    from public.test_questions tq
    join public.questions q on q.id = tq.question_id
    where tq.test_id = p_test_id
  ), items as (
    insert into public.test_items (test_id, position, type, prompt, options, points)
    select p_test_id, pos, type, prompt, options, points from chosen
    returning id, position
  )
  insert into public.test_item_keys (item_id, correct, tolerance, case_sensitive)
  select i.id, k.correct, k.tolerance, k.case_sensitive
  from items i
  join chosen c on c.pos = i.position
  join public.question_keys k on k.question_id = c.question_id;

  update public.tests set status = 'published', published_at = now() where id = p_test_id;
  perform public.write_audit('test.published', 'test', p_test_id::text,
    jsonb_build_object('items', (select count(*) from public.test_items where test_id = p_test_id)));
end;
$$;

-- Back to draft, while no one has started it. Phase 4 adds the attempts check.
create function public.unpublish_test(p_test_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_test public.tests;
begin
  select * into v_test from public.tests where id = p_test_id for update;
  if not found or not public.is_class_teacher(v_test.class_id) then
    raise exception 'Only a teacher of this class can change this test' using errcode = '42501';
  end if;
  if v_test.status <> 'published' then
    raise exception 'This test is not published' using errcode = 'P0001';
  end if;
  delete from public.test_items where test_id = p_test_id;
  update public.tests set status = 'draft', published_at = null where id = p_test_id;
  perform public.write_audit('test.unpublished', 'test', p_test_id::text);
end;
$$;

revoke execute on function
  public.test_class(uuid), public.can_edit_test(uuid), public.draft_questions(uuid),
  public.publish_test(uuid), public.unpublish_test(uuid)
  from public, anon;
grant execute on function
  public.test_class(uuid), public.can_edit_test(uuid), public.draft_questions(uuid),
  public.publish_test(uuid), public.unpublish_test(uuid)
  to authenticated;
revoke execute on function public.valid_proctoring(jsonb) from anon;
