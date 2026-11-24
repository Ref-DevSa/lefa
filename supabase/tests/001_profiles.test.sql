-- pgTAP tests for migration 001 (profiles, roles, RLS). Run: npm run db:test
-- Everything runs in a transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
-- `supabase test db --remote` logs in as a limited CLI role that can't use the
-- extensions schema, so act as the database owner (as migrations do).
set local role postgres;
set search_path = public, extensions;

select plan(16);

-- Test users ---------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000a1', 'thandi@test.local', '{"full_name":"Thandi Mokoena","phone":"+27 82 000 0001"}'),
  ('00000000-0000-4000-8000-0000000000a2', 'lerato@test.local', '{"full_name":"Lerato Mokoena","role":"admin"}'),
  ('00000000-0000-4000-8000-0000000000ad', 'admin@test.local',  '{"full_name":"Ops Admin"}');

-- Server-side roles (seed/migrations) may set roles.
update profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000ad';

-- Sign-up trigger -----------------------------------------------------------
select is(
  (select full_name || '|' || phone || '|' || role from profiles where id = '00000000-0000-4000-8000-0000000000a1'),
  'Thandi Mokoena|+27 82 000 0001|member',
  'sign-up creates a member profile from metadata'
);

select is(
  (select role::text from profiles where id = '00000000-0000-4000-8000-0000000000a2'),
  'member',
  'a role in sign-up metadata is ignored (no self-escalation at sign-up)'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on profiles'
);

-- As Thandi (member) --------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

select is((select count(*)::int from profiles), 1, 'a member sees only their own profile');
select is(current_user_role()::text, 'member', 'current_user_role() returns member');
select ok(not is_admin(), 'is_admin() is false for a member');

update profiles set full_name = 'Thandi M.' where id = '00000000-0000-4000-8000-0000000000a1';
select is(
  (select full_name from profiles where id = '00000000-0000-4000-8000-0000000000a1'),
  'Thandi M.',
  'a member can update their own name'
);

select throws_ok(
  $$ update profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000a1' $$,
  '42501',
  'Only an admin can change roles',
  'a member cannot make themselves admin'
);

select throws_ok(
  $$ update profiles set email = 'x@evil.test' where id = '00000000-0000-4000-8000-0000000000a1' $$,
  '42501',
  NULL,
  'a member cannot change their profile email'
);

update profiles set full_name = 'hacked' where id = '00000000-0000-4000-8000-0000000000a2';
select is(
  (select count(*)::int from profiles where id = '00000000-0000-4000-8000-0000000000a2'),
  0,
  'a member cannot see or update another member'
);

select throws_ok(
  $$ insert into profiles (id, email) values ('00000000-0000-4000-8000-0000000000ff', 'x@test.local') $$,
  '42501',
  NULL,
  'a member cannot insert profiles directly'
);

-- As admin ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000ad","role":"authenticated"}', true);

select is(
  (select count(*)::int from profiles where id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-0000000000ad')),
  3,
  'an admin sees every profile (including other members)'
);

select is(
  (select full_name from profiles where id = '00000000-0000-4000-8000-0000000000a2'),
  'Lerato Mokoena',
  'the member''s attempted update of another profile changed nothing'
);

update profiles set role = 'broker' where id = '00000000-0000-4000-8000-0000000000a2';
select is(
  (select role::text from profiles where id = '00000000-0000-4000-8000-0000000000a2'),
  'broker',
  'an admin can change a role'
);

-- As anon -------------------------------------------------------------------
set local role postgres;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ select count(*) from profiles $$,
  '42501',
  NULL,
  'anonymous visitors cannot read profiles'
);

set local role postgres;

select is(
  (select count(*)::int from profiles where role = 'admin' and email like '%@test.local'),
  1,
  'still exactly one admin among the test users'
);

select * from finish();
rollback;
