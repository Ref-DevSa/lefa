-- 001: profiles, roles and the sign-up trigger (PRD §2, §5; issue #6)
--
-- Every auth user gets one profile row. New accounts are always 'member';
-- only an admin can change a role (PRD §2: "never from the client").

create type public.user_role as enum ('member', 'broker', 'admin');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '' check (char_length(full_name) <= 120),
  phone      text check (phone is null or char_length(phone) <= 20),
  role       public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. Role changes are admin-only (see protect_profile_fields).';

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so policies can call them without recursing
-- through profiles' own RLS).
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up trigger: create the profile from auth metadata. The role is never
-- read from metadata, so a crafted sign-up can't make itself an admin.
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 20), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guard: signed-in users can't change their role, id or email. Admins can
-- change roles. Server-side roles (postgres, service_role) are not limited,
-- so migrations and the seed script can set up demo accounts.
-- ---------------------------------------------------------------------------

create function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.id is distinct from old.id or new.email is distinct from old.email then
      raise exception 'id and email cannot be changed here' using errcode = '42501';
    end if;
    if new.role is distinct from old.role and not public.is_admin() then
      raise exception 'Only an admin can change roles' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- RLS (PRD §5). Broker-of and unlocked-nominee read access are added with
-- their tables in later migrations. No insert/delete policies: rows are
-- created by the trigger and removed by the auth.users cascade.
-- ---------------------------------------------------------------------------

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: admin reads all"
  on public.profiles for select to authenticated
  using ((select public.is_admin()));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles: admin updates any"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.profiles from anon;
revoke insert, delete, truncate on public.profiles from authenticated;
