-- 006: what a broker needs to verify a death (PRD M5, S12; issue #15)
--
-- To check a death report properly the family's broker must see who reported
-- it and how they're related to the deceased. Two narrow read rules:
--   * a broker can see their own clients' nominees (email, relationship, status)
--   * a broker can see the profile (name, phone) of whoever reported a death
--     for one of their clients
-- Nothing else changes; other brokers and members see no more than before.

create policy "nominees: broker reads clients' nominees" on public.nominees for select to authenticated
  using ((select public.is_broker_of(owner_id)));

-- The caller is the broker of someone this person reported a death for.
create function public.is_reporter_for_my_client(person uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.death_reports d
    where d.reported_by = person and public.is_broker_of(d.owner_id)
  );
$$;
revoke execute on function public.is_reporter_for_my_client(uuid) from public, anon;
grant execute on function public.is_reporter_for_my_client(uuid) to authenticated;

create policy "profiles: broker reads reporters" on public.profiles for select to authenticated
  using ((select public.is_reporter_for_my_client(id)));
