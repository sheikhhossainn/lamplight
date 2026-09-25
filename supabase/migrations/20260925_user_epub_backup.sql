-- Migration: 20260925_user_epub_backup.sql
-- SYNC-02: Private Supabase Storage bucket and policies for user imported EPUB backups.

-- 1. Create private storage bucket with 25MB individual file limit
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user_epubs',
  'user_epubs',
  false,
  26214400, -- 25MB in bytes
  array['application/epub+zip', 'application/zip', 'application/octet-stream']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = array['application/epub+zip', 'application/zip', 'application/octet-stream'];

-- 2. Storage RLS Policies: strict owner-only access partitioned by user ID folder

-- Policy: Select (Users can only download/read their own uploaded EPUBs)
create policy "Users can read own uploaded EPUBs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'user_epubs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Insert (Users can only upload to their own user ID folder)
create policy "Users can upload own EPUBs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user_epubs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Update (Users can only update/overwrite their own EPUBs)
create policy "Users can update own EPUBs"
on storage.objects for update
to authenticated
using (
  bucket_id = 'user_epubs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'user_epubs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Delete (Users can only delete their own uploaded EPUBs)
create policy "Users can delete own EPUBs"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'user_epubs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
