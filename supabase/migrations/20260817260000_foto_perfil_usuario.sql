-- Foto de perfil do usuário, guardada no Storage. Bucket público (é só
-- avatar, sem dado sensível) — cada usuário só sobe/troca/apaga a própria
-- foto (nome do arquivo = o próprio id do usuário, sem extensão).

alter table public.usuarios
  add column foto_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_leitura_publica" on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "avatars_upload_proprio" on storage.objects
  for insert
  with check (bucket_id = 'avatars' and name = auth.uid()::text);

create policy "avatars_atualiza_proprio" on storage.objects
  for update
  using (bucket_id = 'avatars' and name = auth.uid()::text)
  with check (bucket_id = 'avatars' and name = auth.uid()::text);

create policy "avatars_apaga_proprio" on storage.objects
  for delete
  using (bucket_id = 'avatars' and name = auth.uid()::text);
