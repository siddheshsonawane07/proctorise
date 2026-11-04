-- Phase 2: becoming a teacher (ADR 004). A student requests; the admin approves, rejects,
-- suspends or reinstates. These functions are the only writers of `role` and `teacher_status`.

create function public.request_teacher(p_institution text, p_note text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'Only a signed-in person with an account can ask to be a teacher'
      using errcode = '42501';
  end if;
  if v_profile.role <> 'student' or v_profile.teacher_status not in ('none', 'rejected') then
    raise exception 'A request is already open, or you are already a teacher'
      using errcode = 'P0001';
  end if;
  if coalesce(trim(p_institution), '') = '' then
    raise exception 'Say which school or institution you teach at' using errcode = '22023';
  end if;

  update public.profiles
  set teacher_status = 'requested',
      institution = left(trim(p_institution), 200),
      teacher_note = left(nullif(trim(p_note), ''), 1000),
      teacher_requested_at = now()
  where id = v_uid;

  perform public.write_audit('teacher.requested', 'profile', v_uid::text,
    jsonb_build_object('institution', left(trim(p_institution), 200)));
end;
$$;

-- Allowed moves, and nothing else:
--   requested → approved | rejected      approved → suspended      suspended → approved
create function public.admin_set_teacher_status(
  p_user_id uuid,
  p_status public.teacher_status
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_role public.user_role;
begin
  if not public.is_admin() then
    raise exception 'Only the admin can change who is a teacher' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'No such person' using errcode = 'P0002';
  end if;
  if v_profile.role = 'admin' then
    raise exception 'The admin''s own role is not changed here' using errcode = 'P0001';
  end if;

  if not (
    (v_profile.teacher_status = 'requested' and p_status in ('approved', 'rejected'))
    or (v_profile.teacher_status = 'approved' and p_status = 'suspended')
    or (v_profile.teacher_status = 'suspended' and p_status = 'approved')
  ) then
    raise exception 'Cannot go from % to %', v_profile.teacher_status, p_status
      using errcode = 'P0001';
  end if;

  v_role := case when p_status = 'approved' then 'teacher' else 'student' end;

  update public.profiles
  set teacher_status = p_status, role = v_role
  where id = p_user_id;

  perform public.write_audit('teacher.' || p_status::text, 'profile', p_user_id::text,
    jsonb_build_object('from', v_profile.teacher_status, 'to', p_status));
end;
$$;

-- A Google sign-up never saw the 18+ box (ADR 005), so the app asks once, here.
create function public.confirm_adult() returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set adult_confirmed_at = coalesce(adult_confirmed_at, now())
  where id = (select auth.uid());
$$;

-- The admin's list of people, with their email from auth.users (not copied into profiles).
create function public.admin_list_people(p_status public.teacher_status default null)
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  teacher_status public.teacher_status,
  institution text,
  teacher_note text,
  teacher_requested_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the admin can list people' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.role, p.teacher_status, p.institution,
           p.teacher_note, p.teacher_requested_at, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p_status is null or p.teacher_status = p_status
    order by p.teacher_requested_at desc nulls last, p.created_at desc;
end;
$$;

revoke execute on function public.request_teacher(text, text) from public, anon;
revoke execute on function public.admin_set_teacher_status(uuid, public.teacher_status) from public, anon;
revoke execute on function public.confirm_adult() from public, anon;
revoke execute on function public.admin_list_people(public.teacher_status) from public, anon;
grant execute on function public.request_teacher(text, text) to authenticated;
grant execute on function public.admin_set_teacher_status(uuid, public.teacher_status) to authenticated;
grant execute on function public.confirm_adult() to authenticated;
grant execute on function public.admin_list_people(public.teacher_status) to authenticated;
