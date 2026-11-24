-- 005: death reports, broker verification, claims (PRD M5, §5; issue #13)
--
-- The unlock. An accepted nominee reports a death with the certificate. The
-- family's broker (or an admin) verifies it with verify_death_report(), which
-- in ONE transaction marks it verified and creates a claim for every policy
-- that can pay out. From then on, and only then, nominees can read the vault.
-- After verification the deceased's vault is frozen.

-- ---------------------------------------------------------------------------
-- Brokers and their clients
-- ---------------------------------------------------------------------------
create table public.broker_clients (
  broker_id  uuid not null references public.profiles (id) on delete cascade,
  client_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (broker_id, client_id),
  check (broker_id <> client_id)
);
comment on table public.broker_clients is 'Which broker looks after which member (linked by an admin).';
create index broker_clients_client_id_idx on public.broker_clients (client_id);

alter table public.broker_clients enable row level security;
create policy "broker_clients: broker reads own" on public.broker_clients for select to authenticated
  using (broker_id = (select auth.uid()));
create policy "broker_clients: client sees their broker" on public.broker_clients for select to authenticated
  using (client_id = (select auth.uid()));
create policy "broker_clients: admin manages" on public.broker_clients for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.broker_clients from anon;

-- ---------------------------------------------------------------------------
-- Death reports
-- ---------------------------------------------------------------------------
create type public.death_report_status as enum ('pending', 'verified', 'rejected');

create table public.death_reports (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles (id) on delete cascade, -- the person who died
  reported_by      uuid not null default auth.uid() references public.profiles (id),
  date_of_death    date not null check (date_of_death <= current_date and date_of_death >= date '1900-01-01'),
  certificate_path text not null,
  dha_reference    text not null default '' check (char_length(dha_reference) <= 60),
  notes            text not null default '' check (char_length(notes) <= 1000),
  status           public.death_report_status not null default 'pending',
  reviewed_by      uuid references public.profiles (id),
  reviewed_at      timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_at       timestamptz not null default now(),
  constraint death_reports_certificate_in_owner_folder check (certificate_path like owner_id::text || '/%')
);
comment on table public.death_reports is 'A nominee reports a death; a broker/admin verifies or rejects it.';
-- One open (pending or verified) report per person; a rejected one can be resubmitted.
create unique index death_reports_one_open_per_owner on public.death_reports (owner_id) where status <> 'rejected';
create index death_reports_status_idx on public.death_reports (status);

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER: used inside RLS without recursion)
-- ---------------------------------------------------------------------------

-- The caller is a broker linked to this client.
create function public.is_broker_of(client uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.broker_clients bc
    join public.profiles p on p.id = bc.broker_id
    where bc.broker_id = (select auth.uid()) and bc.client_id = client and p.role = 'broker'
  );
$$;

-- A verified death report exists for this person.
create function public.is_deceased(person uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.death_reports d where d.owner_id = person and d.status = 'verified');
$$;

-- The caller is an accepted nominee of `owner` AND the death is verified.
create function public.is_unlocked_nominee(owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_nominee_of(owner) and public.is_deceased(owner);
$$;

-- Storage paths start with the owner's id: "{owner_id}/...". Returns null if not.
create function public.folder_owner(object_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

revoke execute on function public.is_broker_of(uuid), public.is_deceased(uuid), public.is_unlocked_nominee(uuid), public.folder_owner(text) from public, anon;
grant execute on function public.is_broker_of(uuid), public.is_deceased(uuid), public.is_unlocked_nominee(uuid), public.folder_owner(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Death report access
-- ---------------------------------------------------------------------------
alter table public.death_reports enable row level security;

create policy "death_reports: reporter reads" on public.death_reports for select to authenticated
  using (reported_by = (select auth.uid()));
create policy "death_reports: nominees read" on public.death_reports for select to authenticated
  using ((select public.is_nominee_of(owner_id)));
create policy "death_reports: broker of reads" on public.death_reports for select to authenticated
  using ((select public.is_broker_of(owner_id)));
create policy "death_reports: admin reads" on public.death_reports for select to authenticated
  using ((select public.is_admin()));

-- Only an accepted nominee may report, only as 'pending', with the
-- certificate in the deceased's folder. Verification happens via functions
-- below; there is no update policy, so nobody edits a report directly.
create policy "death_reports: nominee reports" on public.death_reports for insert to authenticated
  with check (
    reported_by = (select auth.uid())
    and status = 'pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null
    and (select public.is_nominee_of(owner_id))
  );
revoke all on public.death_reports from anon;
revoke delete, truncate on public.death_reports from authenticated;

-- ---------------------------------------------------------------------------
-- Claims and their history
-- ---------------------------------------------------------------------------
create type public.claim_status as enum ('not_started', 'submitted', 'documents_requested', 'approved', 'paid', 'rejected');

create table public.claims (
  id              uuid primary key default gen_random_uuid(),
  policy_id       uuid not null unique references public.policies (id) on delete cascade,
  death_report_id uuid not null references public.death_reports (id) on delete cascade,
  status          public.claim_status not null default 'not_started',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index claims_death_report_id_idx on public.claims (death_report_id);

create table public.claim_events (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid not null references public.claims (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  from_status public.claim_status,
  to_status   public.claim_status not null,
  note        text not null default '' check (char_length(note) <= 500),
  created_at  timestamptz not null default now()
);
create index claim_events_claim_id_idx on public.claim_events (claim_id);

-- Who may see a claim: unlocked nominees, the family's broker, admins.
create function public.can_see_claim(claim uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.claims c join public.policies p on p.id = c.policy_id
    where c.id = claim
      and (public.is_unlocked_nominee(p.owner_id) or public.is_broker_of(p.owner_id) or public.is_admin())
  );
$$;
revoke execute on function public.can_see_claim(uuid) from public, anon;
grant execute on function public.can_see_claim(uuid) to authenticated;

alter table public.claims enable row level security;
create policy "claims: allowed readers" on public.claims for select to authenticated
  using ((select public.can_see_claim(id)));
alter table public.claim_events enable row level security;
create policy "claim_events: allowed readers" on public.claim_events for select to authenticated
  using ((select public.can_see_claim(claim_id)));
-- Claims and events change only through the functions below.
revoke all on public.claims, public.claim_events from anon;
revoke insert, update, delete, truncate on public.claims, public.claim_events from authenticated;

-- ---------------------------------------------------------------------------
-- Verification, rejection and claim updates
-- ---------------------------------------------------------------------------

-- Verify a pending report: mark it verified and create a claim for every
-- policy that can pay out (active or paid-up; lapsed cover won't pay).
-- Returns the number of claims created. All or nothing.
create function public.verify_death_report(report_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  report public.death_reports;
  created integer;
begin
  select * into report from public.death_reports where id = report_id for update;
  if not found or not (public.is_broker_of(report.owner_id) or public.is_admin()) then
    raise exception 'Only the family''s broker or an admin can verify this report' using errcode = '42501';
  end if;
  if report.status <> 'pending' then
    raise exception 'This report is already %', report.status using errcode = '22023';
  end if;

  update public.death_reports
     set status = 'verified', reviewed_by = auth.uid(), reviewed_at = now()
   where id = report_id;

  with new_claims as (
    insert into public.claims (policy_id, death_report_id)
    select p.id, report_id from public.policies p
    where p.owner_id = report.owner_id and p.status in ('active', 'paid_up')
    on conflict (policy_id) do nothing
    returning id
  ), logged as (
    insert into public.claim_events (claim_id, actor_id, from_status, to_status, note)
    select id, auth.uid(), null, 'not_started', 'Claim opened after the death was verified' from new_claims
    returning 1
  )
  select count(*) into created from logged;
  return created;
end;
$$;

create function public.reject_death_report(report_id uuid, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  report public.death_reports;
begin
  select * into report from public.death_reports where id = report_id for update;
  if not found or not (public.is_broker_of(report.owner_id) or public.is_admin()) then
    raise exception 'Only the family''s broker or an admin can reject this report' using errcode = '42501';
  end if;
  if report.status <> 'pending' then
    raise exception 'This report is already %', report.status using errcode = '22023';
  end if;
  if reason is null or char_length(trim(reason)) = 0 then
    raise exception 'Give a reason so the family knows what to fix' using errcode = '22023';
  end if;
  update public.death_reports
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = left(trim(reason), 500)
   where id = report_id;
end;
$$;

-- Move a claim to a new status with an optional note; every change is logged.
create function public.update_claim_status(claim_id uuid, new_status public.claim_status, note text default null)
returns public.claim_status language plpgsql security definer set search_path = '' as $$
declare
  current_status public.claim_status;
begin
  if not public.can_see_claim(claim_id) then
    raise exception 'You can''t update this claim' using errcode = '42501';
  end if;
  select c.status into current_status from public.claims c where c.id = claim_id for update;
  if current_status = new_status then
    raise exception 'The claim is already %', new_status using errcode = '22023';
  end if;
  if current_status in ('paid', 'rejected') and not public.is_admin() then
    raise exception 'This claim is closed' using errcode = '22023';
  end if;
  update public.claims c set status = new_status, updated_at = now() where c.id = claim_id;
  insert into public.claim_events (claim_id, actor_id, from_status, to_status, note)
  values (claim_id, auth.uid(), current_status, new_status, left(coalesce(trim(note), ''), 500));
  return new_status;
end;
$$;

revoke execute on function public.verify_death_report(uuid), public.reject_death_report(uuid, text),
  public.update_claim_status(uuid, public.claim_status, text) from public, anon;
grant execute on function public.verify_death_report(uuid), public.reject_death_report(uuid, text),
  public.update_claim_status(uuid, public.claim_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The unlock: read access for unlocked nominees and the family's broker
-- ---------------------------------------------------------------------------
create policy "policies: unlocked nominee reads" on public.policies for select to authenticated
  using ((select public.is_unlocked_nominee(owner_id)));
create policy "policies: broker reads clients'" on public.policies for select to authenticated
  using ((select public.is_broker_of(owner_id)));

create policy "documents: unlocked nominee reads" on public.documents for select to authenticated
  using ((select public.is_unlocked_nominee(owner_id)));
create policy "documents: broker reads clients'" on public.documents for select to authenticated
  using ((select public.is_broker_of(owner_id)));

create policy "profiles: unlocked nominee reads owner" on public.profiles for select to authenticated
  using ((select public.is_unlocked_nominee(id)));
create policy "profiles: broker reads clients" on public.profiles for select to authenticated
  using ((select public.is_broker_of(id)));

create policy "vault: unlocked nominee reads files" on storage.objects for select to authenticated
  using (bucket_id = 'vault' and (select public.is_unlocked_nominee(public.folder_owner(name))));
create policy "vault: broker reads clients' files" on storage.objects for select to authenticated
  using (bucket_id = 'vault' and (select public.is_broker_of(public.folder_owner(name))));

-- ---------------------------------------------------------------------------
-- Freeze the deceased's vault: no adding, editing or deleting once verified
-- ---------------------------------------------------------------------------
drop policy "policies: owner adds" on public.policies;
drop policy "policies: owner edits" on public.policies;
drop policy "policies: owner deletes" on public.policies;
create policy "policies: owner adds" on public.policies for insert to authenticated
  with check (owner_id = (select auth.uid()) and not (select public.is_deceased(owner_id)));
create policy "policies: owner edits" on public.policies for update to authenticated
  using (owner_id = (select auth.uid()) and not (select public.is_deceased(owner_id)))
  with check (owner_id = (select auth.uid()));
create policy "policies: owner deletes" on public.policies for delete to authenticated
  using (owner_id = (select auth.uid()) and not (select public.is_deceased(owner_id)));

drop policy "documents: owner adds" on public.documents;
drop policy "documents: owner deletes" on public.documents;
create policy "documents: owner adds" on public.documents for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and not (select public.is_deceased(owner_id))
    and (policy_id is null or exists (select 1 from public.policies p where p.id = policy_id and p.owner_id = (select auth.uid())))
  );
create policy "documents: owner deletes" on public.documents for delete to authenticated
  using (owner_id = (select auth.uid()) and not (select public.is_deceased(owner_id)));

-- Nominees can't be revoked (or changed by the owner) after a verified death.
create or replace function public.protect_nominee_fields()
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
    if public.is_deceased(old.owner_id) then
      raise exception 'Nominees cannot be changed after a death is verified' using errcode = '42501';
    end if;
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

-- ---------------------------------------------------------------------------
-- Death certificates: private bucket, files under {deceased_id}/...
-- Upload: accepted nominees of that person. Read: nominees, the family's
-- broker, admins.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('death-certificates', 'death-certificates', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "certificates: nominee uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'death-certificates' and (select public.is_nominee_of(public.folder_owner(name))));
create policy "certificates: allowed readers" on storage.objects for select to authenticated
  using (
    bucket_id = 'death-certificates'
    and (
      (select public.is_nominee_of(public.folder_owner(name)))
      or (select public.is_broker_of(public.folder_owner(name)))
      or (select public.is_admin())
    )
  );
