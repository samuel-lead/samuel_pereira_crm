-- Segundo passo pra copiar o Kanban do 100Bug pro imobiliário: cadastro de
-- imóvel ainda não tinha foto nenhuma — sem isso não dá pra mostrar foto do
-- imóvel no card do Kanban (próximo passo). Bucket público (mesma lógica
-- do avatar de usuário: sem dado sensível, e o card precisa carregar a
-- imagem sem exigir login). Qualquer autenticado da própria org sobe/troca
-- foto (mesma permissão que já existe pra criar/editar o imóvel em si —
-- não é admin-only).
alter table public.imoveis
  add column foto_url text;

insert into storage.buckets (id, name, public)
values ('fotos-imoveis', 'fotos-imoveis', true)
on conflict (id) do nothing;

create policy "fotos_imoveis_leitura_publica" on storage.objects
  for select
  using (bucket_id = 'fotos-imoveis');

create policy "fotos_imoveis_upload_autenticado" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'fotos-imoveis');

create policy "fotos_imoveis_atualiza_autenticado" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'fotos-imoveis')
  with check (bucket_id = 'fotos-imoveis');

create policy "fotos_imoveis_apaga_autenticado" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'fotos-imoveis');
