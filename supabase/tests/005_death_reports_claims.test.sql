-- pgTAP tests for migration 005: death report -> broker verification ->
-- vault unlocks for nominees + claims created. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set search_path = public, extensions;

select plan(35);

-- Cast ---------------------------------------------------------------------
-- 0f1 Thandi (owner)   0f2 Lerato (accepted nominee)   0f3 Sipho (stranger)
-- 0fb Naledi (Thandi's broker)   0fc Bheki (broker, NOT Thandi's)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000f1', 'thandi.x@test.local', '{"full_name":"Thandi Mokoena","phone":"+27820000001"}'),
  ('00000000-0000-4000-8000-0000000000f2', 'lerato.x@test.local', '{"full_name":"Lerato Mokoena"}'),
  ('00000000-0000-4000-8000-0000000000f3', 'sipho.x@test.local',  '{"full_name":"Sipho Ndlovu"}'),
  ('00000000-0000-4000-8000-0000000000fb', 'naledi.x@test.local', '{"full_name":"Naledi Dube"}'),
  ('00000000-0000-4000-8000-0000000000fc', 'bheki.x@test.local',  '{"full_name":"Bheki Zulu"}');
update profiles set role = 'broker' where id in ('00000000-0000-4000-8000-0000000000fb', '00000000-0000-4000-8000-0000000000fc');

insert into policies (id, owner_id, insurer, policy_number, cover_amount, status) values
  ('00000000-0000-4000-8000-0000000a0001', '00000000-0000-4000-8000-0000000000f1', 'Old Mutual', 'OM-1', 30000, 'active'),
  ('00000000-0000-4000-8000-0000000a0002', '00000000-0000-4000-8000-0000000000f1', 'Clientele', 'CL-1', 10000, 'lapsed');
insert into documents (owner_id, doc_type, file_name, storage_path, mime_type, size_bytes)
values ('00000000-0000-4000-8000-0000000000f1', 'certified_id', 'id.pdf', '00000000-0000-4000-8000-0000000000f1/id.pdf', 'application/pdf', 100);
insert into nominees (owner_id, nominee_email, nominee_id, relationship, status)
values ('00000000-0000-4000-8000-0000000000f1', 'lerato.x@test.local', '00000000-0000-4000-8000-0000000000f2', 'child', 'accepted');
insert into broker_clients (broker_id, client_id)
values ('00000000-0000-4000-8000-0000000000fb', '00000000-0000-4000-8000-0000000000f1');

select ok(
  (select bool_and(relrowsecurity) from pg_class where oid in (
    'public.death_reports'::regclass, 'public.claims'::regclass, 'public.claim_events'::regclass, 'public.broker_clients'::regclass)),
  'RLS is enabled on death_reports, claims, claim_events and broker_clients'
);
select is((select public from storage.buckets where id = 'death-certificates'), false, 'the death-certificates bucket is private');

-- Reporting ---------------------------------------------------------------
set local role authenticated;

-- Sipho (stranger) can't report
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f3","role":"authenticated","email":"sipho.x@test.local"}', true);
select throws_ok(
  $$ insert into death_reports (owner_id, date_of_death, certificate_path)
     values ('00000000-0000-4000-8000-0000000000f1', current_date - 2, '00000000-0000-4000-8000-0000000000f1/cert.pdf') $$,
  '42501', NULL, 'a stranger cannot report a death'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('death-certificates', '00000000-0000-4000-8000-0000000000f1/fake.pdf', '00000000-0000-4000-8000-0000000000f3') $$,
  '42501', NULL, 'a stranger cannot upload a death certificate'
);

-- Lerato (accepted nominee) can
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f2","role":"authenticated","email":"lerato.x@test.local"}', true);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('death-certificates', '00000000-0000-4000-8000-0000000000f1/cert.pdf', '00000000-0000-4000-8000-0000000000f2') $$,
  'the accepted nominee can upload the death certificate'
);
select throws_ok(
  $$ insert into death_reports (owner_id, date_of_death, certificate_path, status)
     values ('00000000-0000-4000-8000-0000000000f1', current_date - 2, '00000000-0000-4000-8000-0000000000f1/cert.pdf', 'verified') $$,
  '42501', NULL, 'a nominee cannot file a report as already verified'
);
select throws_ok(
  $$ insert into death_reports (owner_id, date_of_death, certificate_path)
     values ('00000000-0000-4000-8000-0000000000f1', current_date + 1, '00000000-0000-4000-8000-0000000000f1/cert.pdf') $$,
  '23514', NULL, 'the date of death cannot be in the future'
);
select lives_ok(
  $$ insert into death_reports (id, owner_id, date_of_death, certificate_path, dha_reference)
     values ('00000000-0000-4000-8000-0000000d0001', '00000000-0000-4000-8000-0000000000f1', current_date - 2, '00000000-0000-4000-8000-0000000000f1/cert.pdf', 'BI-1663 123') $$,
  'the accepted nominee can report a death (pending)'
);
select throws_ok(
  $$ insert into death_reports (owner_id, date_of_death, certificate_path)
     values ('00000000-0000-4000-8000-0000000000f1', current_date - 2, '00000000-0000-4000-8000-0000000000f1/cert.pdf') $$,
  '23505', NULL, 'only one open report per person'
);
select is((select count(*)::int from policies), 0, 'while pending, the nominee still sees 0 policies');
select throws_ok(
  $$ select verify_death_report('00000000-0000-4000-8000-0000000d0001') $$,
  '42501', NULL, 'a nominee cannot verify their own report'
);
update death_reports set status = 'verified';
select is((select status::text from death_reports), 'pending', 'a nominee cannot change the report status directly');

-- Visibility of the report
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f3","role":"authenticated","email":"sipho.x@test.local"}', true);
select is((select count(*)::int from death_reports), 0, 'a stranger cannot see the report');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000fc","role":"authenticated","email":"bheki.x@test.local"}', true);
select is((select count(*)::int from death_reports), 0, 'a broker who is not the family''s broker cannot see the report');
select throws_ok(
  $$ select verify_death_report('00000000-0000-4000-8000-0000000d0001') $$,
  '42501', NULL, 'a broker who is not the family''s broker cannot verify'
);
select is((select count(*)::int from policies), 0, 'an unlinked broker sees 0 of the family''s policies');

-- Verification (Naledi, the family's broker) --------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000fb","role":"authenticated","email":"naledi.x@test.local"}', true);
select is((select count(*)::int from death_reports), 1, 'the family''s broker can see the pending report');
select is((select count(*)::int from storage.objects where bucket_id = 'death-certificates'), 1, 'the family''s broker can open the certificate');
select is((select count(*)::int from policies), 2, 'the family''s broker can see their client''s policies');
select throws_ok(
  $$ select reject_death_report('00000000-0000-4000-8000-0000000d0001', '  ') $$,
  '22023', NULL, 'rejecting needs a reason'
);
select is(
  verify_death_report('00000000-0000-4000-8000-0000000d0001'),
  1,
  'verifying creates 1 claim (the lapsed policy is skipped)'
);
select is(
  (select status::text || '|' || (reviewed_by = '00000000-0000-4000-8000-0000000000fb')::text from death_reports),
  'verified|true',
  'the report is verified and records who verified it'
);
select throws_ok(
  $$ select verify_death_report('00000000-0000-4000-8000-0000000d0001') $$,
  '22023', NULL, 'a report cannot be verified twice'
);

-- The unlock (Lerato) ------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f2","role":"authenticated","email":"lerato.x@test.local"}', true);
select is((select count(*)::int from policies), 2, 'after verification the nominee sees all the policies');
select is((select count(*)::int from documents), 1, 'after verification the nominee sees the documents');
select is((select count(*)::int from storage.objects where bucket_id = 'vault'), 0, 'no vault files exist in this test, and the query is allowed');
select is(
  (select full_name from profiles where id = '00000000-0000-4000-8000-0000000000f1'),
  'Thandi Mokoena',
  'after verification the nominee can read the owner''s profile'
);
select is(
  (select p.insurer || '|' || c.status::text from claims c join policies p on p.id = c.policy_id),
  'Old Mutual|not_started',
  'the nominee sees the claim for the active policy'
);
select lives_ok(
  $$ select update_claim_status((select id from claims), 'submitted', 'Submitted at the Old Mutual branch') $$,
  'the nominee can move the claim forward with a note'
);
select is(
  (select string_agg(coalesce(from_status::text, '-') || '>' || to_status::text, ',' order by created_at, to_status) from claim_events),
  '->not_started,not_started>submitted',
  'every status change is logged'
);

-- Lock on the deceased's vault ------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated","email":"thandi.x@test.local"}', true);
select throws_ok(
  $$ insert into policies (insurer, policy_number) values ('Sanlam', 'SL-9') $$,
  '42501', NULL, 'once a death is verified, the vault cannot be changed'
);
select throws_ok(
  $$ update nominees set status = 'revoked' $$,
  '42501', NULL, 'once a death is verified, nominees cannot be revoked'
);

-- Still nothing for strangers ------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f3","role":"authenticated","email":"sipho.x@test.local"}', true);
select is((select count(*)::int from policies) + (select count(*)::int from claims), 0, 'a stranger still sees 0 policies and 0 claims');
select throws_ok(
  $$ select update_claim_status('00000000-0000-4000-8000-000000000000', 'paid', null) $$,
  '42501', NULL, 'a stranger cannot update a claim'
);

set local role postgres;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select count(*) from death_reports $$, '42501', NULL, 'anonymous visitors cannot read death reports');

set local role postgres;
select * from finish();
rollback;
