-- 002: policies, the heart of the vault (PRD M2, §5; issue #9)
--
-- One row per insurance policy a member records. Access (RLS):
--   * the owner can read, add, edit and delete their own policies
--   * admins can read all (support)
-- Added later, with the tables they depend on:
--   * unlocked nominee and broker-of read access (#12, #13)
--   * "no changes once the owner is deceased" (#13)

create type public.policy_type as enum ('funeral', 'life', 'credit_life', 'other');
create type public.policy_status as enum ('active', 'lapsed', 'paid_up');

create table public.policies (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  insurer         text not null check (char_length(trim(insurer)) between 1 and 100),
  policy_number   text not null check (char_length(trim(policy_number)) between 1 and 60),
  type            public.policy_type not null default 'funeral',
  cover_amount    numeric(12, 2) not null default 0 check (cover_amount >= 0),
  monthly_premium numeric(10, 2) not null default 0 check (monthly_premium >= 0),
  debit_day       smallint check (debit_day between 1 and 31),
  status          public.policy_status not null default 'active',
  beneficiaries   text not null default '' check (char_length(beneficiaries) <= 500),
  notes           text not null default '' check (char_length(notes) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- The same policy can't be recorded twice in one vault.
  constraint policies_owner_insurer_number_key unique (owner_id, insurer, policy_number)
);

comment on table public.policies is 'Insurance policies recorded by a member (their vault).';

create index policies_owner_id_idx on public.policies (owner_id);

-- updated_at is always set by the database, so it can't be faked.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger policies_set_updated_at
  before update on public.policies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.policies enable row level security;

create policy "policies: owner reads"
  on public.policies for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "policies: admin reads all"
  on public.policies for select to authenticated
  using ((select public.is_admin()));

create policy "policies: owner adds"
  on public.policies for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "policies: owner edits"
  on public.policies for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "policies: owner deletes"
  on public.policies for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke all on public.policies from anon;
