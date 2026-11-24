-- pgTAP tests for migration 003 (documents + private storage). Run: npm run db:test
-- Everything runs in a transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
-- `supabase test db --remote` logs in as a limited CLI role that can't use the
-- extensions schema, so act as the database owner (as migrations do).
set local role postgres;
set search_path = public, extensions;

select plan(17);

-- Test users and a policy each ----------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-0000000000c1', 'thandi.d@test.local', '{"full_name":"Thandi"}'),
  ('00000000-0000-4000-8000-0000000000c2', 'lerato.d@test.local', '{"full_name":"Lerato"}'),
  ('00000000-0000-4000-8000-0000000000cd', 'admin.d@test.local',  '{"full_name":"Admin"}');
update profiles set role = 'admin' where id = '00000000-0000-4000-8000-0000000000cd';

insert into policies (id, owner_id, insurer, policy_number) values
  ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000c1', 'Old Mutual', 'OM-1'),
  ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-0000000000c2', 'Sanlam', 'SL-1');

select is(
  (select public from storage.buckets where id = 'vault'),
  false,
  'the vault bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'vault'),
  5242880::bigint,
  'the vault bucket limits files to 5 MB'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.documents'::regclass),
  'RLS is enabled on documents'
);

-- As Thandi -----------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);

select lives_ok(
  $$ insert into documents (policy_id, doc_type, file_name, storage_path, mime_type, size_bytes) values
       ('00000000-0000-4000-8000-00000000d001', 'policy_schedule', 'schedule.pdf', '00000000-0000-4000-8000-0000000000c1/a-schedule.pdf', 'application/pdf', 1200),
       (null, 'certified_id', 'id.jpg', '00000000-0000-4000-8000-0000000000c1/b-id.jpg', 'image/jpeg', 90000) $$,
  'a member can register documents in their own folder'
);

select throws_ok(
  $$ insert into documents (doc_type, file_name, storage_path, mime_type, size_bytes)
     values ('other', 'x.pdf', '00000000-0000-4000-8000-0000000000c2/x.pdf', 'application/pdf', 10) $$,
  '23514',
  NULL,
  'a document path must be inside the owner''s own folder'
);

select throws_ok(
  $$ insert into documents (policy_id, doc_type, file_name, storage_path, mime_type, size_bytes)
     values ('00000000-0000-4000-8000-00000000d002', 'other', 'x.pdf', '00000000-0000-4000-8000-0000000000c1/x.pdf', 'application/pdf', 10) $$,
  '42501',
  NULL,
  'a document cannot be linked to someone else''s policy'
);

select throws_ok(
  $$ insert into documents (doc_type, file_name, storage_path, mime_type, size_bytes)
     values ('other', 'x.exe', '00000000-0000-4000-8000-0000000000c1/x.exe', 'application/x-msdownload', 10) $$,
  '23514',
  NULL,
  'only PDF, JPG and PNG are allowed'
);

select throws_ok(
  $$ insert into documents (doc_type, file_name, storage_path, mime_type, size_bytes)
     values ('other', 'big.pdf', '00000000-0000-4000-8000-0000000000c1/big.pdf', 'application/pdf', 6000000) $$,
  '23514',
  NULL,
  'files over 5 MB are rejected'
);

-- Storage: own folder only
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('vault', '00000000-0000-4000-8000-0000000000c1/a-schedule.pdf', '00000000-0000-4000-8000-0000000000c1') $$,
  'a member can store a file in their own folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('vault', '00000000-0000-4000-8000-0000000000c2/sneaky.pdf', '00000000-0000-4000-8000-0000000000c1') $$,
  '42501',
  NULL,
  'a member cannot put a file in someone else''s folder'
);

-- As Lerato -----------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c2","role":"authenticated"}', true);

select is(
  (select count(*)::int from documents where owner_id = '00000000-0000-4000-8000-0000000000c1'),
  0,
  'another member sees 0 of Thandi''s documents'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'vault' and name like '00000000-0000-4000-8000-0000000000c1/%'),
  0,
  'another member cannot see Thandi''s files'
);

delete from documents where owner_id = '00000000-0000-4000-8000-0000000000c1';

-- As admin ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000cd","role":"authenticated"}', true);

select is(
  (select count(*)::int from documents where owner_id = '00000000-0000-4000-8000-0000000000c1'),
  2,
  'an admin can see Thandi''s documents (and Lerato''s delete removed nothing)'
);

-- Back as Thandi ------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);

select throws_ok(
  $$ update documents set file_name = 'renamed.pdf' where file_name = 'schedule.pdf' $$,
  '42501',
  NULL,
  'documents cannot be edited (delete and re-upload instead)'
);

delete from documents where file_name = 'id.jpg';
select is((select count(*)::int from documents), 1, 'a member can delete their own document');

-- Removing a policy keeps its documents but unlinks them --------------------
delete from policies where id = '00000000-0000-4000-8000-00000000d001';
select is(
  (select policy_id from documents where file_name = 'schedule.pdf'),
  NULL,
  'deleting a policy keeps the document but unlinks it'
);

-- As anon -------------------------------------------------------------------
set local role postgres;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select count(*) from documents $$, '42501', NULL, 'anonymous visitors cannot read documents');

set local role postgres;
select * from finish();
rollback;
