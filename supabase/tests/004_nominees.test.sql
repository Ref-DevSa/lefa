-- pgTAP tests for migration 004 (nominees). Run: npm run db:test
-- The key promise: a nominee sees NOTHING of the vault until a death is
-- verified (unlocking arrives in #13). Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set search_path = public, extensions;

select plan(21);

-- Thandi (owner) with a policy and a document; Lerato (invited); Sipho (stranger)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000e1', 'thandi.n@test.local', '{"full_name":"Thandi Mokoena","phone":"+27820000001"}'),
  ('00000000-0000-4000-8000-0000000000e2', 'lerato.n@test.local', '{"full_name":"Lerato Mokoena"}'),
  ('00000000-0000-4000-8000-0000000000e3', 'sipho.n@test.local',  '{"full_name":"Sipho Ndlovu"}');

insert into policies (id, owner_id, insurer, policy_number, cover_amount)
values ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-0000000000e1', 'Old Mutual', 'OM-1', 30000);
insert into documents (owner_id, doc_type, file_name, storage_path, mime_type, size_bytes)
values ('00000000-0000-4000-8000-0000000000e1', 'certified_id', 'id.pdf', '00000000-0000-4000-8000-0000000000e1/id.pdf', 'application/pdf', 100);

select ok((select relrowsecurity from pg_class where oid = 'public.nominees'::regclass), 'RLS is enabled on nominees');

-- As Thandi -----------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated","email":"thandi.n@test.local"}', true);

select lives_ok(
  $$ insert into nominees (nominee_email, relationship) values ('lerato.n@test.local', 'child') $$,
  'a member can invite a nominee by email'
);
select throws_ok(
  $$ insert into nominees (nominee_email, relationship) values ('lerato.n@test.local', 'child') $$,
  '23505', NULL, 'the same person cannot be invited twice'
);
select throws_ok(
  $$ insert into nominees (nominee_email, relationship) values ('thandi.n@test.local', 'other') $$,
  '42501', NULL, 'a member cannot nominate themselves'
);
select throws_ok(
  $$ insert into nominees (owner_id, nominee_email, relationship) values ('00000000-0000-4000-8000-0000000000e3', 'x@test.local', 'other') $$,
  '42501', NULL, 'a member cannot add nominees to someone else''s list'
);
select throws_ok(
  $$ update nominees set status = 'accepted' where nominee_email = 'lerato.n@test.local' $$,
  '42501', NULL, 'the owner cannot accept on the nominee''s behalf'
);

-- As Lerato (invited, matched by her login email) ---------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated","email":"lerato.n@test.local"}', true);

select is((select count(*)::int from nominees), 1, 'the invited person can see their invitation');
select is(
  (select owner_name || '|' || status::text from my_nominations()),
  'Thandi Mokoena|invited',
  'my_nominations() gives the nominee only the owner''s name and the status'
);
select throws_ok(
  $$ update nominees set relationship = 'spouse' $$,
  '42501', NULL, 'a nominee cannot change the relationship'
);
select throws_ok(
  $$ update nominees set nominee_id = '00000000-0000-4000-8000-0000000000e3', status = 'accepted' $$,
  '42501', NULL, 'a nominee cannot accept on behalf of someone else'
);

update nominees set status = 'accepted', nominee_id = '00000000-0000-4000-8000-0000000000e2';
select is((select status::text from nominees), 'accepted', 'the nominee can accept');
select ok(is_nominee_of('00000000-0000-4000-8000-0000000000e1'), 'is_nominee_of() is true once accepted');

-- THE PROMISE: accepted, but no death verified -> sees nothing
select is((select count(*)::int from policies), 0, 'an accepted nominee sees 0 of the owner''s policies (vault locked)');
select is((select count(*)::int from documents), 0, 'an accepted nominee sees 0 of the owner''s documents');
select is(
  (select count(*)::int from profiles where id = '00000000-0000-4000-8000-0000000000e1'),
  0,
  'an accepted nominee cannot read the owner''s profile (phone, email)'
);
select is(
  (select count(*)::int from storage.objects where name like '00000000-0000-4000-8000-0000000000e1/%'),
  0,
  'an accepted nominee cannot see the owner''s files'
);

-- As Sipho (a stranger) ------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated","email":"sipho.n@test.local"}', true);
select is((select count(*)::int from nominees), 0, 'a stranger sees no nominations');
select is((select count(*)::int from my_nominations()), 0, 'a stranger has no nominations');

-- Thandi revokes -------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated","email":"thandi.n@test.local"}', true);
update nominees set status = 'revoked';
select is((select status::text from nominees), 'revoked', 'the owner can revoke a nominee');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated","email":"lerato.n@test.local"}', true);
select throws_ok(
  $$ update nominees set status = 'accepted' $$,
  '42501', NULL, 'a revoked nominee cannot accept again'
);

-- As anon -------------------------------------------------------------------
set local role postgres;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select count(*) from nominees $$, '42501', NULL, 'anonymous visitors cannot read nominees');

set local role postgres;
select * from finish();
rollback;
