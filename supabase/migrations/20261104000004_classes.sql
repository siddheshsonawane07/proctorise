-- Phase 3: classes, the teachers who run them, and the students in them.
-- The owner is a row in class_teachers (kind = 'owner'), not a column on classes: one source.

create type public.class_teacher_kind as enum ('owner', 'co_teacher');
create type public.member_status as enum ('active', 'removed');

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  join_code text not null unique,
  join_open boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.class_teachers (
  class_id uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  kind public.class_teacher_kind not null,
  added_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);
create unique index one_owner_per_class on public.class_teachers (class_id) where kind = 'owner';
create index class_teachers_by_teacher on public.class_teachers (teacher_id);

create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.member_status not null default 'active',
  -- An accommodation: extra time on every test in the class (phase 4 applies it).
  time_multiplier numeric(3, 2) not null default 1.00
    check (time_multiplier in (1.00, 1.25, 1.50, 2.00)),
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index class_members_by_student on public.class_members (student_id);

-- Failed join codes, for the rate limit in join_class. Never read by users.
create table public.join_failures (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index join_failures_recent on public.join_failures (user_id, at);

alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.class_members enable row level security;
alter table public.join_failures enable row level security;

revoke all on public.classes, public.class_teachers, public.class_members, public.join_failures
  from anon, authenticated;
grant select on public.classes, public.class_teachers, public.class_members to authenticated;
grant update (name, join_open, archived_at) on public.classes to authenticated;

-- Helpers for policies. A suspended teacher stops being a class teacher at once
-- (Phase-2-Critic #6), because is_approved_teacher() is part of the check.
create function public.is_class_teacher(p_class_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_approved_teacher() and exists (
    select 1 from public.class_teachers
    where class_id = p_class_id and teacher_id = (select auth.uid())
  );
$$;

create function public.is_class_owner(p_class_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_approved_teacher() and exists (
    select 1 from public.class_teachers
    where class_id = p_class_id and teacher_id = (select auth.uid()) and kind = 'owner'
  );
$$;

create function public.is_class_member(p_class_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id and student_id = (select auth.uid()) and status = 'active'
  );
$$;

create policy "Teachers and members read their classes"
on public.classes for select to authenticated
using (public.is_class_teacher(id) or public.is_class_member(id));

create policy "Teachers edit their classes"
on public.classes for update to authenticated
using (public.is_class_teacher(id))
with check (public.is_class_teacher(id));

create policy "Teachers see who teaches their classes"
on public.class_teachers for select to authenticated
using (public.is_class_teacher(class_id));

create policy "Teachers see their students; students see their own membership"
on public.class_members for select to authenticated
using (public.is_class_teacher(class_id) or student_id = (select auth.uid()));

-- 8 characters from 31, without look-alikes (no 0 O 1 I L): about 8.5 × 10^11 codes.
create function public.new_join_code() returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, 1 + (get_byte(bytes, i) % 31), 1);
    end loop;
    exit when not exists (select 1 from public.classes where join_code = code);
  end loop;
  return code;
end;
$$;

create function public.create_class(p_name text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_approved_teacher() then
    raise exception 'Only an approved teacher can create a class' using errcode = '42501';
  end if;
  insert into public.classes (name, join_code)
  values (trim(p_name), public.new_join_code())
  returning id into v_id;
  insert into public.class_teachers (class_id, teacher_id, kind)
  values (v_id, (select auth.uid()), 'owner');
  perform public.write_audit('class.created', 'class', v_id::text, jsonb_build_object('name', trim(p_name)));
  return v_id;
end;
$$;

create function public.rotate_join_code(p_class_id uuid) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text := public.new_join_code();
begin
  if not public.is_class_teacher(p_class_id) then
    raise exception 'Only a teacher of this class can change its code' using errcode = '42501';
  end if;
  update public.classes set join_code = v_code where id = p_class_id;
  perform public.write_audit('class.code_rotated', 'class', p_class_id::text);
  return v_code;
end;
$$;

-- Returns a result rather than raising on a wrong code, so the failure it records is kept
-- (an exception would roll the record back with it). 10 failures an hour, then refused.
create function public.join_class(p_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_class public.classes;
  v_member public.class_members;
begin
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Sign in to join a class' using errcode = '42501';
  end if;
  if (select count(*) from public.join_failures
      where user_id = v_uid and at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('joined', false, 'reason', 'too_many');
  end if;

  select * into v_class from public.classes
  where join_code = upper(replace(trim(p_code), ' ', ''));
  if not found or not v_class.join_open or v_class.archived_at is not null then
    insert into public.join_failures (user_id) values (v_uid);
    return jsonb_build_object('joined', false, 'reason', 'no_match');
  end if;

  select * into v_member from public.class_members
  where class_id = v_class.id and student_id = v_uid;
  if found and v_member.status = 'removed' then
    return jsonb_build_object('joined', false, 'reason', 'removed');
  end if;

  insert into public.class_members (class_id, student_id)
  values (v_class.id, v_uid)
  on conflict (class_id, student_id) do nothing;
  return jsonb_build_object('joined', true, 'class_id', v_class.id, 'name', v_class.name);
end;
$$;

-- Teachers need names and emails of their students and co-teachers, which profiles' own
-- policy does not show them. These return exactly that, for one class, to its teachers.
create function public.class_roster(p_class_id uuid)
returns table (
  student_id uuid, full_name text, email text, status public.member_status,
  time_multiplier numeric, joined_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(p_class_id) then
    raise exception 'Only a teacher of this class can see its students' using errcode = '42501';
  end if;
  return query
    select m.student_id, p.full_name, u.email::text, m.status, m.time_multiplier, m.joined_at
    from public.class_members m
    join public.profiles p on p.id = m.student_id
    join auth.users u on u.id = m.student_id
    where m.class_id = p_class_id
    order by m.status, p.full_name;
end;
$$;

create function public.class_teacher_list(p_class_id uuid)
returns table (teacher_id uuid, full_name text, email text, kind public.class_teacher_kind)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_class_teacher(p_class_id) then
    raise exception 'Only a teacher of this class can see its teachers' using errcode = '42501';
  end if;
  return query
    select t.teacher_id, p.full_name, u.email::text, t.kind
    from public.class_teachers t
    join public.profiles p on p.id = t.teacher_id
    join auth.users u on u.id = t.teacher_id
    where t.class_id = p_class_id
    order by t.kind, p.full_name;
end;
$$;

create function public.set_member(
  p_class_id uuid, p_student_id uuid, p_status public.member_status, p_time_multiplier numeric
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_before public.class_members;
begin
  if not public.is_class_teacher(p_class_id) then
    raise exception 'Only a teacher of this class can change its students' using errcode = '42501';
  end if;
  select * into v_before from public.class_members
  where class_id = p_class_id and student_id = p_student_id for update;
  if not found then
    raise exception 'That student is not in this class' using errcode = 'P0002';
  end if;
  update public.class_members
  set status = p_status, time_multiplier = p_time_multiplier
  where class_id = p_class_id and student_id = p_student_id;
  perform public.write_audit('class.member_changed', 'class', p_class_id::text,
    jsonb_build_object('student_id', p_student_id,
      'status', jsonb_build_array(v_before.status, p_status),
      'time_multiplier', jsonb_build_array(v_before.time_multiplier, p_time_multiplier)));
end;
$$;

create function public.add_co_teacher(p_class_id uuid, p_email text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_teacher uuid;
begin
  if not public.is_class_owner(p_class_id) then
    raise exception 'Only the class owner can add teachers' using errcode = '42501';
  end if;
  select p.id into v_teacher
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email))
    and (p.role = 'admin' or (p.role = 'teacher' and p.teacher_status = 'approved'));
  if v_teacher is null then
    raise exception 'No approved teacher has that email' using errcode = 'P0002';
  end if;
  insert into public.class_teachers (class_id, teacher_id, kind)
  values (p_class_id, v_teacher, 'co_teacher')
  on conflict (class_id, teacher_id) do nothing;
  perform public.write_audit('class.co_teacher_added', 'class', p_class_id::text,
    jsonb_build_object('teacher_id', v_teacher));
end;
$$;

create function public.remove_co_teacher(p_class_id uuid, p_teacher_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_class_owner(p_class_id) then
    raise exception 'Only the class owner can remove teachers' using errcode = '42501';
  end if;
  delete from public.class_teachers
  where class_id = p_class_id and teacher_id = p_teacher_id and kind = 'co_teacher';
  if not found then
    raise exception 'That person is not a co-teacher of this class' using errcode = 'P0002';
  end if;
  perform public.write_audit('class.co_teacher_removed', 'class', p_class_id::text,
    jsonb_build_object('teacher_id', p_teacher_id));
end;
$$;

-- Execute rights: helpers and actions to signed-in users only; internals to no one.
revoke execute on function
  public.is_class_teacher(uuid), public.is_class_owner(uuid), public.is_class_member(uuid),
  public.create_class(text), public.rotate_join_code(uuid), public.join_class(text),
  public.class_roster(uuid), public.class_teacher_list(uuid),
  public.set_member(uuid, uuid, public.member_status, numeric),
  public.add_co_teacher(uuid, text), public.remove_co_teacher(uuid, uuid)
  from public, anon;
grant execute on function
  public.is_class_teacher(uuid), public.is_class_owner(uuid), public.is_class_member(uuid),
  public.create_class(text), public.rotate_join_code(uuid), public.join_class(text),
  public.class_roster(uuid), public.class_teacher_list(uuid),
  public.set_member(uuid, uuid, public.member_status, numeric),
  public.add_co_teacher(uuid, text), public.remove_co_teacher(uuid, uuid)
  to authenticated;
revoke execute on function public.new_join_code() from public, anon, authenticated;
