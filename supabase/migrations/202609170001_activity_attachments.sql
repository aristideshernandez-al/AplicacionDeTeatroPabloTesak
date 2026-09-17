insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-attachments',
  'activity-attachments',
  false,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Los usuarios autenticados cargan sus adjuntos" on storage.objects;
create policy "Los usuarios autenticados cargan sus adjuntos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'activity-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);


drop policy if exists "Los usuarios autenticados consultan adjuntos" on storage.objects;
create policy "Los usuarios autenticados consultan adjuntos"
on storage.objects for select to authenticated
using (bucket_id = 'activity-attachments');
drop policy if exists "Los usuarios actualizan sus adjuntos" on storage.objects;
create policy "Los usuarios actualizan sus adjuntos"
on storage.objects for update to authenticated
using (
  bucket_id = 'activity-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'activity-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Los usuarios eliminan sus adjuntos" on storage.objects;
create policy "Los usuarios eliminan sus adjuntos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'activity-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);
