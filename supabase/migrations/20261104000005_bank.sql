-- Phase 3: each teacher's question bank. The answer key is a separate table so a policy can never
-- expose it by accident alongside the question. Both are written only by save_question, which
-- checks that the options and the key fit the type.

create type public.question_type as enum ('single', 'multiple', 'true_false', 'short_text', 'numeric');

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type public.question_type not null,
  prompt text not null check (char_length(trim(prompt)) between 1 and 5000),
  -- single and multiple: [{"id": "a", "text": "..."}]; other types: []
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  points numeric(6, 2) not null default 1 check (points > 0 and points <= 100),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_by_owner on public.questions (owner_id, updated_at desc);

create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  -- single: "a" · multiple: ["a","c"] · true_false: true · short_text: ["accepted", ...]
  -- (an empty list means marked by hand) · numeric: 3.14
  correct jsonb not null,
  tolerance numeric not null default 0 check (tolerance >= 0),
  case_sensitive boolean not null default false
);

create trigger questions_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
revoke all on public.questions, public.question_keys from anon, authenticated;
grant select, delete on public.questions to authenticated;
grant select on public.question_keys to authenticated;

create policy "A teacher reads their own bank"
on public.questions for select to authenticated
using (owner_id = (select auth.uid()) and public.is_approved_teacher());

create policy "A teacher deletes from their own bank"
on public.questions for delete to authenticated
using (owner_id = (select auth.uid()) and public.is_approved_teacher());

create policy "A teacher reads their own keys"
on public.question_keys for select to authenticated
using (exists (
  select 1 from public.questions q
  where q.id = question_id and q.owner_id = (select auth.uid())
) and public.is_approved_teacher());

-- Raises with a plain message when the options or key don't fit the type.
create function public.check_question(
  p_type public.question_type, p_options jsonb, p_correct jsonb, p_tolerance numeric
) returns void
language plpgsql immutable set search_path = ''
as $$
declare
  v_ids text[];
begin
  if p_type in ('single', 'multiple') then
    if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 10 then
      raise exception 'Give between 2 and 10 options' using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_options) o
      where jsonb_typeof(o) <> 'object'
         or coalesce(trim(o ->> 'id'), '') = ''
         or coalesce(trim(o ->> 'text'), '') = ''
    ) then
      raise exception 'Every option needs some text' using errcode = '22023';
    end if;
    select array_agg(o ->> 'id') into v_ids from jsonb_array_elements(p_options) o;
    if (select count(distinct x) from unnest(v_ids) x) <> array_length(v_ids, 1) then
      raise exception 'Two options have the same id' using errcode = '22023';
    end if;
  elsif jsonb_array_length(p_options) <> 0 then
    raise exception 'This type of question has no options' using errcode = '22023';
  end if;

  case p_type
    when 'single' then
      if jsonb_typeof(p_correct) <> 'string' or not (p_correct #>> '{}') = any (v_ids) then
        raise exception 'Mark the correct option' using errcode = '22023';
      end if;
    when 'multiple' then
      if jsonb_typeof(p_correct) <> 'array' or jsonb_array_length(p_correct) = 0
         or exists (select 1 from jsonb_array_elements_text(p_correct) c where not c = any (v_ids)) then
        raise exception 'Mark at least one correct option' using errcode = '22023';
      end if;
    when 'true_false' then
      if jsonb_typeof(p_correct) <> 'boolean' then
        raise exception 'Say whether the statement is true or false' using errcode = '22023';
      end if;
    when 'short_text' then
      if jsonb_typeof(p_correct) <> 'array' or jsonb_array_length(p_correct) > 20
         or exists (select 1 from jsonb_array_elements(p_correct) c where jsonb_typeof(c) <> 'string') then
        raise exception 'List the accepted answers, or none to mark by hand' using errcode = '22023';
      end if;
    when 'numeric' then
      if jsonb_typeof(p_correct) <> 'number' then
        raise exception 'Give the correct number' using errcode = '22023';
      end if;
      if p_tolerance < 0 then
        raise exception 'The tolerance cannot be negative' using errcode = '22023';
      end if;
  end case;
end;
$$;

create function public.save_question(
  p_id uuid,
  p_type public.question_type,
  p_prompt text,
  p_options jsonb,
  p_points numeric,
  p_tags text[],
  p_correct jsonb,
  p_tolerance numeric default 0,
  p_case_sensitive boolean default false
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid := p_id;
begin
  if not public.is_approved_teacher() then
    raise exception 'Only an approved teacher has a question bank' using errcode = '42501';
  end if;
  perform public.check_question(p_type, coalesce(p_options, '[]'::jsonb), p_correct, coalesce(p_tolerance, 0));

  if v_id is null then
    insert into public.questions (owner_id, type, prompt, options, points, tags)
    values (v_uid, p_type, trim(p_prompt), coalesce(p_options, '[]'::jsonb), p_points,
            coalesce(p_tags, '{}'))
    returning id into v_id;
  else
    update public.questions
    set type = p_type, prompt = trim(p_prompt), options = coalesce(p_options, '[]'::jsonb),
        points = p_points, tags = coalesce(p_tags, '{}')
    where id = v_id and owner_id = v_uid;
    if not found then
      raise exception 'That question is not in your bank' using errcode = 'P0002';
    end if;
  end if;

  insert into public.question_keys (question_id, correct, tolerance, case_sensitive)
  values (v_id, p_correct, coalesce(p_tolerance, 0), coalesce(p_case_sensitive, false))
  on conflict (question_id) do update
  set correct = excluded.correct, tolerance = excluded.tolerance,
      case_sensitive = excluded.case_sensitive;
  return v_id;
end;
$$;

revoke execute on function public.save_question(uuid, public.question_type, text, jsonb, numeric, text[], jsonb, numeric, boolean) from public, anon;
grant execute on function public.save_question(uuid, public.question_type, text, jsonb, numeric, text[], jsonb, numeric, boolean) to authenticated;
revoke execute on function public.check_question(public.question_type, jsonb, jsonb, numeric) from public, anon, authenticated;
