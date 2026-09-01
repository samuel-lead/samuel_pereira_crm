-- Deixa subir o material da isca como arquivo (PDF) em vez de precisar já
-- ter um link pronto — o arquivo fica no Storage, público pra leitura
-- (senão quem clica no link da isca não consegue baixar sem estar
-- logado), mas só admin autenticado da própria org consegue enviar.
insert into storage.buckets (id, name, public)
values ('materiais-iscas', 'materiais-iscas', true)
on conflict (id) do nothing;

create policy "materiais_iscas_upload_admin"
on storage.objects for insert
to authenticated
with check (bucket_id = 'materiais-iscas' and private.eh_admin());

create policy "materiais_iscas_leitura_publica"
on storage.objects for select
to public
using (bucket_id = 'materiais-iscas');

create policy "materiais_iscas_update_admin"
on storage.objects for update
to authenticated
using (bucket_id = 'materiais-iscas' and private.eh_admin());

create policy "materiais_iscas_delete_admin"
on storage.objects for delete
to authenticated
using (bucket_id = 'materiais-iscas' and private.eh_admin());
