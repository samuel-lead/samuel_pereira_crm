-- Instagram (@ ou link, opcional) e foto do lead. A foto é subida
-- manualmente por quem edita o lead — não existe hoje um jeito confiável e
-- dentro dos termos de uso de puxar foto do Instagram só com o @ da pessoa.
alter table public.leads
  add column instagram text,
  add column foto_url text;

insert into storage.buckets (id, name, public)
values ('leads-fotos', 'leads-fotos', true)
on conflict (id) do nothing;

create policy "leads_fotos_leitura_publica" on storage.objects
  for select
  using (bucket_id = 'leads-fotos');

create policy "leads_fotos_upload_da_org" on storage.objects
  for insert
  with check (
    bucket_id = 'leads-fotos'
    and exists (
      select 1 from public.leads l
      where l.id::text = name and l.org_id = private.current_org_id()
    )
  );

create policy "leads_fotos_atualiza_da_org" on storage.objects
  for update
  using (
    bucket_id = 'leads-fotos'
    and exists (
      select 1 from public.leads l
      where l.id::text = name and l.org_id = private.current_org_id()
    )
  )
  with check (
    bucket_id = 'leads-fotos'
    and exists (
      select 1 from public.leads l
      where l.id::text = name and l.org_id = private.current_org_id()
    )
  );

create policy "leads_fotos_apaga_da_org" on storage.objects
  for delete
  using (
    bucket_id = 'leads-fotos'
    and exists (
      select 1 from public.leads l
      where l.id::text = name and l.org_id = private.current_org_id()
    )
  );
