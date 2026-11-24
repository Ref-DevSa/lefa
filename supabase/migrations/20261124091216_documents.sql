-- 003: claim documents + private file storage (PRD M4, §5; issue #11)
--
-- Members upload the documents a claim will need (certified ID, bank letter,
-- policy schedule, …). Files live in a PRIVATE bucket `vault` under
-- {owner_id}/…; the `documents` table holds the metadata.
-- Access (RLS):
--   * the owner can read, add and delete their own documents and files
--   * admins can read all (support)
-- Unlocked-nominee and broker-of read access arrive with #12/#13.

create type public.document_type as enum (
  'certified_id',
  'marriage_certificate',
  'birth_certificate',
  'bank_letter',
  'policy_schedule',
  'other'
);

create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Optional link to one of the owner's policies; unlinking (not deleting)
  -- the document if that policy is removed.
  policy_id    uuid references public.policies (id) on delete set null,
  doc_type     public.document_type not null,
  file_name    text not null check (char_length(file_name) between 1 and 200),
  storage_path text not null unique,
  mime_type    text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes   integer not null check (size_bytes between 1 and 5242880), -- 5 MB
  created_at   timestamptz not null default now(),
  -- Files must sit in the owner's own folder: "{owner_id}/…".
  constraint documents_path_in_owner_folder check (storage_path like owner_id::text || '/%')
);

comment on table public.documents is 'Claim documents a member uploaded; the file is in storage bucket "vault" at storage_path.';

create index documents_owner_id_idx on public.documents (owner_id);
create index documents_policy_id_idx on public.documents (policy_id);

alter table public.documents enable row level security;

create policy "documents: owner reads"
  on public.documents for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "documents: admin reads all"
  on public.documents for select to authenticated
  using ((select public.is_admin()));

-- A document can only be linked to one of the uploader's OWN policies.
create policy "documents: owner adds"
  on public.documents for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (
      policy_id is null
      or exists (select 1 from public.policies p where p.id = policy_id and p.owner_id = (select auth.uid()))
    )
  );

create policy "documents: owner deletes"
  on public.documents for delete to authenticated
  using (owner_id = (select auth.uid()));

-- No update policy: to change a document, delete it and upload again.
revoke all on public.documents from anon;
revoke update, truncate on public.documents from authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket, 5 MB, PDF/JPG/PNG only (also checked by the API).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vault', 'vault', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Each member may only touch files inside their own folder: vault/{their id}/…
create policy "vault: owner reads own files"
  on storage.objects for select to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "vault: admin reads all files"
  on storage.objects for select to authenticated
  using (bucket_id = 'vault' and (select public.is_admin()));

create policy "vault: owner uploads to own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "vault: owner deletes own files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'vault' and (storage.foldername(name))[1] = (select auth.uid())::text);
