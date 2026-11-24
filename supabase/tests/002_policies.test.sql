-- pgTAP tests for migration 002 (policies + RLS). Run: npm run db:test
-- Everything runs in a transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
-- `supabase test db --remote` logs in as a limited CLI role that can't use the
-- extensions schema, so act as the database owner (as migrations do).
set local role postgres;
set search_path = public, extensions;

select plan(18);

-- Test users ---------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000b1', 'thandi.p@test.local', '{"full_name":"Thandi Mokoena"}'),
  ('00000000-0000-4000-8000-0000000000b2', 'lerato.p@test.local', '{"full_name":"Lerato Mokoena"}'),
  ('00000000-0000-4000-8000-0000000000bd', 'admin.p@test.local',  '{"full_name":"Ops Admin"}');
update profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000bd';

select ok(
  (select relrowsecurity from pg_class where oid = 'public.policies'::regclass),
  'RLS is enabled on policies'
);

-- As Thandi -----------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);

select lives_ok(
  $$ insert into policies (insurer, policy_number, type, cover_amount, monthly_premium, debit_day, status)
     values ('Old Mutual', 'OM-4821', 'funeral', 30000, 199, 25, 'active'),
            ('Sanlam', 'SL-1002', 'life', 55000, 288, 1, 'active') $$,
  'a member can add policies (owner_id defaults to them)'
);

select is(
  (select count(*)::int from policies where owner_id = '00000000-0000-4000-8000-0000000000b1'),
  2,
  'the new policies belong to Thandi'
);

select throws_ok(
  $$ insert into policies (owner_id, insurer, policy_number) values ('00000000-0000-4000-8000-0000000000b2', 'Hollard', 'X-1') $$,
  '42501',
  NULL,
  'a member cannot add a policy into someone else''s vault'
);

select throws_ok(
  $$ insert into policies (insurer, policy_number, cover_amount) values ('Hollard', 'H-1', -5) $$,
  '23514',
  NULL,
  'negative amounts are rejected'
);

select throws_ok(
  $$ insert into policies (insurer, policy_number, debit_day) values ('Hollard', 'H-2', 32) $$,
  '23514',
  NULL,
  'debit day must be 1–31'
);

select throws_ok(
  $$ insert into policies (insurer, policy_number) values ('   ', 'H-3') $$,
  '23514',
  NULL,
  'insurer cannot be blank'
);

select throws_ok(
  $$ insert into policies (insurer, policy_number) values ('Old Mutual', 'OM-4821') $$,
  '23505',
  NULL,
  'the same policy cannot be added twice'
);

-- Try to fake an old timestamp: the trigger must overwrite it with now().
update policies set monthly_premium = 210, updated_at = '2000-01-01' where policy_number = 'OM-4821';
select is(
  (select updated_at from policies where policy_number = 'OM-4821'),
  now(),
  'editing a policy sets updated_at (and it cannot be faked)'
);

select throws_ok(
  $$ update policies set owner_id = '00000000-0000-4000-8000-0000000000b2' where policy_number = 'OM-4821' $$,
  '42501',
  NULL,
  'a member cannot hand a policy to someone else'
);

-- As Lerato (another member) ------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

select is((select count(*)::int from policies), 0, 'another member sees 0 of Thandi''s policies');

update policies set cover_amount = 1 where policy_number = 'OM-4821';
delete from policies where policy_number = 'SL-1002';

-- As admin ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000bd","role":"authenticated"}', true);

select is(
  (select count(*)::int from policies where owner_id = '00000000-0000-4000-8000-0000000000b1'),
  2,
  'an admin sees other members'' policies'
);
select is(
  (select cover_amount from policies where policy_number = 'OM-4821' and owner_id = '00000000-0000-4000-8000-0000000000b1'),
  30000.00::numeric,
  'another member''s update changed nothing'
);
select is(
  (select count(*)::int from policies where policy_number = 'SL-1002' and owner_id = '00000000-0000-4000-8000-0000000000b1'),
  1,
  'another member''s delete removed nothing'
);

-- Back as Thandi: delete own ------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
delete from policies where policy_number = 'SL-1002';
select is((select count(*)::int from policies), 1, 'a member can delete their own policy');

-- As anon -------------------------------------------------------------------
set local role postgres;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ select count(*) from policies $$,
  '42501',
  NULL,
  'anonymous visitors cannot read policies'
);

-- Account deletion cascades -------------------------------------------------
set local role postgres;
delete from auth.users where id = '00000000-0000-4000-8000-0000000000b1';
select is(
  (select count(*)::int from policies where owner_id = '00000000-0000-4000-8000-0000000000b1'),
  0,
  'deleting an account deletes its policies (POPIA: no orphaned personal data)'
);

select has_index('public', 'policies', 'policies_owner_id_idx', 'policies are indexed by owner');

select * from finish();
rollback;
