-- pgTAP tests for migration 006: the broker sees who reported a death and
-- their relationship, for their own clients only. Rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local role postgres;
set search_path = public, extensions;

select plan(8);

-- 1a1 Gogo (deceased client)   1a2 Sipho (reporter, nominee, NOT a client)
-- 1a3 stranger   1ab Naledi (the family's broker)   1ac Bheki (another broker)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000001a1', 'gogo.b@test.local', '{"full_name":"Gogo Ndlovu"}'),
  ('00000000-0000-4000-8000-0000000001a2', 'sipho.b@test.local', '{"full_name":"Sipho Ndlovu","phone":"+27820000003"}'),
  ('00000000-0000-4000-8000-0000000001a3', 'stranger.b@test.local', '{"full_name":"Stranger"}'),
  ('00000000-0000-4000-8000-0000000001ab', 'naledi.b@test.local', '{"full_name":"Naledi Dube"}'),
  ('00000000-0000-4000-8000-0000000001ac', 'bheki.b@test.local', '{"full_name":"Bheki Zulu"}');
update profiles set role = 'broker' where id in ('00000000-0000-4000-8000-0000000001ab', '00000000-0000-4000-8000-0000000001ac');

insert into broker_clients (broker_id, client_id) values ('00000000-0000-4000-8000-0000000001ab', '00000000-0000-4000-8000-0000000001a1');
insert into nominees (owner_id, nominee_email, nominee_id, relationship, status)
values ('00000000-0000-4000-8000-0000000001a1', 'sipho.b@test.local', '00000000-0000-4000-8000-0000000001a2', 'other', 'accepted');
insert into death_reports (owner_id, reported_by, date_of_death, certificate_path)
values ('00000000-0000-4000-8000-0000000001a1', '00000000-0000-4000-8000-0000000001a2', current_date - 3, '00000000-0000-4000-8000-0000000001a1/c.pdf');

set local role authenticated;

-- The family's broker -------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000001ab","role":"authenticated","email":"naledi.b@test.local"}', true);
select is(
  (select relationship || '|' || status::text from nominees where owner_id = '00000000-0000-4000-8000-0000000001a1'),
  'other|accepted',
  'the family''s broker sees their client''s nominees'
);
select is(
  (select full_name from profiles where id = '00000000-0000-4000-8000-0000000001a2'),
  'Sipho Ndlovu',
  'the family''s broker sees who reported the death'
);
select is(
  (select count(*)::int from profiles where id = '00000000-0000-4000-8000-0000000001a3'),
  0,
  'the broker still cannot see unrelated members'
);
update nominees set status = 'revoked';
select is(
  (select status::text from nominees where owner_id = '00000000-0000-4000-8000-0000000001a1'),
  'accepted',
  'the broker cannot change nominees (read only)'
);

-- Another broker -------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000001ac","role":"authenticated","email":"bheki.b@test.local"}', true);
select is((select count(*)::int from nominees), 0, 'another broker sees none of this family''s nominees');
select is(
  (select count(*)::int from profiles where id = '00000000-0000-4000-8000-0000000001a2'),
  0,
  'another broker cannot see the reporter'
);

-- A member (the stranger) ----------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000001a3","role":"authenticated","email":"stranger.b@test.local"}', true);
select is((select count(*)::int from nominees), 0, 'a member sees no one else''s nominees');
select is(
  (select count(*)::int from profiles where id = '00000000-0000-4000-8000-0000000001a2'),
  0,
  'a member cannot see the reporter'
);

set local role postgres;
select * from finish();
rollback;
