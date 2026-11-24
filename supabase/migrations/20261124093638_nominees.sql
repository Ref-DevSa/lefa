-- 004: nominees (PRD M3, §5; issue #12)
--
-- A member invites someone they trust by email. The invited person sees the
-- invitation once they log in with that email, and can accept or decline.
-- Until a death is verified (#13) a nominee sees NOTHING of the vault: no
-- policies, documents or profile details. There is deliberately no nominee
-- read policy on those tables; #13 adds one that only applies after a
-- verified death report.

create type public.nominee_status as enum ('invited', 'accepted', 'declined', 'revoked');

create table public.nominees (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  nominee_email text not null check (nominee_email = lower(trim(nominee_email)) and nominee_email like '%_@_%._%' and char_length(nominee_email) <= 254),
  nominee_id    uuid references public.profiles (id) on delete set null, -- set when they accept
  relationship  text not null check (relationship in ('spouse', 'child', 'parent', 'sibling', 'other')),
  status        public.nominee_status not null default 'invited',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint nominees_owner_email_key unique (owner_id, nominee_email)
);

comment on table public.nominees is 'People a member trusts to claim for their family. Nominees see nothing until a death is verified.';

create index nominees_owner_id_idx on public.nominees (owner_id);
create index nominees_nominee_email_idx on public.nominees (nominee_email);
create index nominees_nominee_id_idx on public.nominees (nominee_id);

-- The caller's login email, lower-cased (from their Supabase token).
create function public.current_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(coalesce((select auth.jwt()) ->> 'email', ''));
$$;

-- ---------------------------------------------------------------------------
-- Guard: who may change what.
--   owner:   relationship; status -> revoked, or back to invited (re-invite)
--   nominee: status invited -> accepted / declined, accepted -> declined
--            (step down); nominee_id only to themselves
--   nobody (signed in): owner, email, created_at
-- Server-side roles (seed, migrations) are not limited.
-- ---------------------------------------------------------------------------
create function public.protect_nominee_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  new.updated_at := now();
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
     or new.nominee_email is distinct from old.nominee_email
     or new.created_at is distinct from old.created_at then
    raise exception 'owner, email and created date cannot be changed' using errcode = '42501';
  end if;

  if old.owner_id = me then
    if new.nominee_id is distinct from old.nominee_id then
      raise exception 'Only the nominee can accept' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and new.status not in ('revoked', 'invited') then
      raise exception 'Only the nominee can accept or decline' using errcode = '42501';
    end if;
  else
    if new.relationship is distinct from old.relationship then
      raise exception 'Only the owner can change the relationship' using errcode = '42501';
    end if;
    if new.nominee_id is distinct from old.nominee_id and new.nominee_id is distinct from me then
      raise exception 'You can only accept for yourself' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and not (
      (old.status = 'invited' and new.status in ('accepted', 'declined'))
      or (old.status = 'accepted' and new.status = 'declined')
    ) then
      raise exception 'This invitation is no longer open' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_nominee_fields
  before update on public.nominees
  for each row execute function public.protect_nominee_fields();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.nominees enable row level security;

create policy "nominees: owner reads"
  on public.nominees for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "nominees: nominee reads own invitation"
  on public.nominees for select to authenticated
  using (nominee_id = (select auth.uid()) or nominee_email = (select public.current_email()));

create policy "nominees: admin reads all"
  on public.nominees for select to authenticated
  using ((select public.is_admin()));

-- You can't nominate yourself.
create policy "nominees: owner invites"
  on public.nominees for insert to authenticated
  with check (owner_id = (select auth.uid()) and nominee_email <> (select public.current_email()));

create policy "nominees: owner updates"
  on public.nominees for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "nominees: nominee responds"
  on public.nominees for update to authenticated
  using (nominee_id = (select auth.uid()) or nominee_email = (select public.current_email()))
  with check (nominee_id = (select auth.uid()) or (nominee_id is null and nominee_email = (select public.current_email())));

create policy "nominees: owner deletes"
  on public.nominees for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.nominees from anon;
revoke truncate on public.nominees from authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True if the caller is an ACCEPTED nominee of `owner`. (Being a nominee
-- unlocks nothing by itself; #13 combines this with a verified death report.)
create function public.is_nominee_of(owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.nominees n
    where n.owner_id = owner and n.nominee_id = (select auth.uid()) and n.status = 'accepted'
  );
$$;

-- What a nominee may know before any unlock: who nominated them (name only),
-- the relationship and the status. SECURITY DEFINER so it can read the
-- owner's name without opening up the owner's whole profile.
create function public.my_nominations()
returns table (
  id uuid,
  owner_id uuid,
  owner_name text,
  relationship text,
  status public.nominee_status,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select n.id, n.owner_id, p.full_name, n.relationship, n.status, n.created_at
  from public.nominees n
  join public.profiles p on p.id = n.owner_id
  where (n.nominee_id = (select auth.uid()) or n.nominee_email = (select public.current_email()))
    and n.status in ('invited', 'accepted')
  order by n.created_at desc;
$$;

revoke execute on function public.is_nominee_of(uuid) from public, anon;
revoke execute on function public.my_nominations() from public, anon;
revoke execute on function public.current_email() from public, anon;
grant execute on function public.is_nominee_of(uuid) to authenticated;
grant execute on function public.my_nominations() to authenticated;
grant execute on function public.current_email() to authenticated;
