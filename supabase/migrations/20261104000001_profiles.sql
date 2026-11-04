-- Phase 2: one profile per person, and the role that decides what they may do.
-- The role is written only by admin functions (20261104000003). See ARCHITECTURE § 3.

create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.teacher_status as enum ('none', 'requested', 'approved', 'rejected', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  role public.user_role not null default 'student',
  teacher_status public.teacher_status not null default 'none',
  institution text check (char_length(institution) <= 200),
  teacher_note text check (char_length(teacher_note) <= 1000),
  teacher_requested_at timestamptz,
  adult_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read their own row and change their own name. Nothing else, by privilege as well as
-- by policy, so a policy mistake cannot hand over `role` or `teacher_status`.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- A new account becomes a student. The role in sign-up metadata is never read; the name and the
-- 18+ declaration are (both are the user's own statements). Anonymous users (the paired phone,
-- phase 6) get no profile at all.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_anonymous then
    return new;
  end if;

  insert into public.profiles (id, full_name, adult_confirmed_at)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      ''
    ), 120),
    case when (new.raw_user_meta_data ->> 'adult_confirmed') = 'true' then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Role checks for policies. `security definer` so a policy on another table can read profiles
-- without the caller needing a policy of its own; `stable` so Postgres may cache within a query.
create function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- An admin may run classes too, so counts as an approved teacher.
create function public.is_approved_teacher() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (role = 'admin' or (role = 'teacher' and teacher_status = 'approved'))
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_approved_teacher() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_approved_teacher() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create policy "Read own profile, or any as admin"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or public.is_admin());

create policy "Change own name"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
